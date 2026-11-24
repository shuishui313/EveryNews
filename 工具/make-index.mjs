#!/usr/bin/env node
/**
 * EveryNews · 全站期次清单与「往期刊物架」生成器（make-index.mjs）
 * 1. 生成 issues.js 供全部新旧页面动态加载顶部期次切换器与底部前后期翻页
 * 2. 仅在页面缺少静态 issues.js 导航引用时注入一次，往期 HTML 永不重复改写
 * 3. 将最新一期同步为 index.html
 * 4. 生成杂志封面墙风格的 archive.html（支持「封面牆 Grid / 編年表 List」双视图切换 + 实时筛选 + 夜读模式）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const T = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(T, "..");

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
const strip = (s) =>
  String(s)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const WEEK = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const NAV_START = "<!-- ISSUE-NAV:START -->";
const NAV_END = "<!-- ISSUE-NAV:END -->";
const NAV_RE = new RegExp(`${NAV_START}[\\s\\S]*?${NAV_END}\\n?`, "g");

const files = fs
  .readdirSync(WS)
  .filter((f) => /^\d{8}\.html$/.test(f))
  .sort()
  .reverse();

if (!files.length) {
  console.error("✗ 根目录没有 <YYYYMMDD>.html，先跑一次 make-public.mjs");
  process.exit(1);
}

const totalCount = files.length;
const days = files.map((f, idx) => {
  const stamp = f.slice(0, 8);
  const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
  const [yyyy, mm, dd] = date.split("-");
  const full = path.join(WS, f);
  const html = fs.readFileSync(full, "utf8");
  const nav = html.match(/<nav class="jump[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
  const titles = nav
    ? [...nav[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) => strip(m[1]))
    : [];
  const stat = html.match(/<p class="stat">([\s\S]*?)<\/p>/);
  const issueNo = String(totalCount - idx).padStart(3, "0");
  return {
    file: f,
    issueNo,
    date,
    dd,
    monEn: MONTHS_EN[Number(mm) - 1],
    year: yyyy,
    weekday: WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()],
    titles,
    stat: stat ? strip(stat[1]) : `${titles.length} 篇快訊`,
  };
});

const NAV_CSS = `
.issue-nav{border-bottom:1px solid var(--line,#D8D0C1);background:color-mix(in srgb,var(--paper,#F5F0E6) 92%,transparent)}
.issue-nav-inner{max-width:1280px;margin:0 auto;padding:9px clamp(18px,4vw,52px);display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:13px}
.issue-nav label{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11px;letter-spacing:.12em;color:var(--mute,#7D778C);text-transform:uppercase}
.issue-nav select{font:inherit;font-size:13px;padding:5px 10px;border:1px solid var(--line,#D8D0C1);border-radius:99px;background:var(--paper-elev,#fff);color:inherit;cursor:pointer;max-width:100%}
.issue-nav a{font-size:12.5px;font-weight:600;color:var(--accent,#3F2BD1)}
.issue-nav a:hover{text-decoration:underline}
.issue-nav-hint{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;color:var(--mute,#7D778C);margin-left:auto}
@media(max-width:640px){.issue-nav-hint{margin-left:0}}
`;

// 保持完全相同的静态结构签名，以便已迁移的 14 个往期大 HTML 文件零修改跳过
const LEGACY_STATIC_CHECK = '<script src="issues.js"></script>';

function navBlock(current) {
  return `${NAV_START}
<style>${NAV_CSS}</style>
<nav class="issue-nav" aria-label="切換期次" data-current="${current.file}">
  <div class="issue-nav-inner">
    <label for="issue-select">ISSUE</label>
    <select id="issue-select"><option value="${current.file}" selected>${current.date}</option><option value="archive.html">往期刊物架 · 按日期篩選</option></select>
    <a href="index.html">最新一刊</a>
    <a href="archive.html">往期刊物架 →</a>
    <span class="issue-nav-hint" id="issue-nav-hint"></span>
  </div>
</nav>
<script src="issues.js"></script>
${NAV_END}`;
}

const issueList = days.map((d) => ({ file: d.file, date: d.date, issueNo: d.issueNo }));
const issuesJs = `/* 由 工具/make-index.mjs 自动生成 */
(function () {
  var issues = ${JSON.stringify(issueList)};
  window.EVERYNEWS_ISSUES = issues;
  var nav = document.querySelector(".issue-nav");
  var sel = document.getElementById("issue-select");
  if (!sel) return;
  var current = (nav && nav.getAttribute("data-current")) || (issues[0] && issues[0].file) || "";
  sel.innerHTML = issues
    .map(function (it, idx) {
      var no = it.issueNo ? "No." + it.issueNo + " · " : "";
      var label = no + it.date + (idx === 0 ? "（最新）" : "");
      return '<option value="' + it.file + '"' + (it.file === current ? " selected" : "") + ">" + label + "</option>";
    })
    .join("") + '<option value="archive.html">往期刊物架 · 搜尋與篩選</option>';
  var hint = document.getElementById("issue-nav-hint");
  if (hint) hint.textContent = "ARCHIVE · 共 " + issues.length + " 期";
  sel.addEventListener("change", function () {
    if (this.value) location.href = this.value;
  });
})();
`;
fs.writeFileSync(path.join(WS, "issues.js"), issuesJs, "utf8");

let touched = 0;
for (const d of days) {
  const full = path.join(WS, d.file);
  const html = fs.readFileSync(full, "utf8");
  // 新版杂志页面已在单层顶栏内置 #issue-select 与 <script src="issues.js">，直接保留，避免出现双层顶栏
  if (html.includes(LEGACY_STATIC_CHECK)) {
    d.body = html;
    continue;
  }
  const clean = html.replace(NAV_RE, "");
  if (!clean.includes("</header>")) {
    d.body = clean;
    continue;
  }
  d.body = clean.replace("</header>", `</header>\n${navBlock(d)}`);
  if (d.body !== html) {
    fs.writeFileSync(full, d.body, "utf8");
    touched++;
  }
}

fs.writeFileSync(path.join(WS, "index.html"), days[0].body, "utf8");

/* ---------- 杂志往期刊物架 archive.html ---------- */
const ARCHIVE_CSS = `
:root{
  --paper:#F6F3EC;--paper-elev:#FCFBF8;--ink:#141318;--ink2:#3F3B4D;--mute:#787287;
  --line:rgba(20,19,24,.12);--line-strong:#141318;--accent:#3B28CC;--stamp:#C84B31;
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI","PingFang TC","PingFang SC","Noto Sans TC","Hiragino Sans GB","Microsoft JhengHei",sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
html[data-theme="dark"]{
  --paper:#0F0F13;--paper-elev:#17171F;--ink:#EFECE4;--ink2:#B8B3C7;--mute:#857F96;
  --line:rgba(255,255,255,.11);--line-strong:#E2DDD2;--accent:#9688FF;--stamp:#E06348;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.75 var(--sans);font-variant-numeric:tabular-nums;line-break:strict;transition:background-color .3s,color .3s}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer}
.wrap{max-width:1260px;margin:0 auto;padding:0 clamp(18px,4vw,52px)}
.topbar{border-bottom:1px solid var(--line);padding:12px 0;display:flex;justify-content:space-between;align-items:center}
.back{font-size:13.5px;font-weight:600;color:var(--accent)}
.back:hover{text-decoration:underline}
.theme-btn{padding:5px 12px;border-radius:99px;border:1px solid var(--line);background:var(--paper-elev);color:var(--ink2);font-size:12px;font-weight:600}
.mast{padding:clamp(30px,5vw,56px) 0 30px;border-bottom:2px solid var(--line-strong);display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:18px}
.mast-kicker{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--stamp);font-weight:700}
h1{font-size:clamp(36px,5.4vw,60px);font-weight:900;letter-spacing:-.04em;line-height:1;margin:10px 0 12px}
.lede{margin:0;color:var(--ink2);font-size:16px}
.count-box{font-family:var(--mono);font-size:12px;color:var(--mute);text-align:right}
.count-box b{display:block;font-family:var(--sans);font-weight:900;font-size:42px;letter-spacing:-.04em;color:var(--ink);line-height:1}

.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:22px 0;border-bottom:1px solid var(--line)}
.toolbar label{display:flex;flex-direction:column;gap:5px;font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--mute)}
select,input[type=date],input[type=search]{
  font:14px var(--sans);color:var(--ink);background:var(--paper-elev);
  border:1px solid var(--line);border-radius:6px;padding:8px 12px;min-height:38px;
}
input[type=search]{min-width:220px}
.reset-btn{border:1px solid var(--line);background:var(--paper-elev);color:var(--ink2);border-radius:6px;padding:8px 14px;min-height:38px}
.reset-btn:hover{border-color:var(--accent)}
.view-switch{margin-left:auto;display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--paper-elev)}
.view-switch button{border:none;background:transparent;color:var(--mute);padding:8px 13px;font-size:12.5px;font-weight:600}
.view-switch button.is-on{background:var(--ink);color:var(--paper)}
#hint{width:100%;font-family:var(--mono);font-size:12px;color:var(--mute);margin-top:2px}

/* 封面墙 Grid 模式（默认） */
.rack{padding:30px 0 56px;display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:22px}
.issue-card{
  position:relative;display:flex;flex-direction:column;justify-content:space-between;
  background:var(--paper-elev);border:1px solid var(--line);border-top:5px solid var(--accent);
  border-radius:4px;padding:22px 22px 18px;transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .25s;
}
.issue-card:first-child{border-top-color:var(--stamp)}
.issue-card[hidden]{display:none}
.issue-card:hover{transform:translateY(-5px);border-color:var(--accent);box-shadow:0 18px 36px rgba(20,19,24,.1)}
.ic-top{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;border-bottom:1px solid var(--line)}
.ic-no{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--stamp);font-weight:700}
.ic-wk{font-family:var(--mono);font-size:11.5px;color:var(--mute)}
.ic-date{margin:16px 0 14px;display:flex;align-items:baseline;gap:10px}
.ic-date b{font-weight:900;font-size:38px;line-height:1;letter-spacing:-.04em}
.ic-date span{font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--mute)}
.ic-list{margin:0 0 18px;padding-left:1.25em;color:var(--ink2);font-size:13.8px;line-height:1.6}
.ic-list li{margin:4px 0}
.ic-foot{padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);font-size:11.5px;color:var(--mute)}
.ic-go{color:var(--accent);font-weight:700;font-family:var(--sans);font-size:13px}

/* 编年列表 List 模式 */
.rack.is-list{grid-template-columns:1fr;gap:0}
.rack.is-list .issue-card{
  border-radius:0;border-left:none;border-right:none;border-top:none;border-bottom:1px solid var(--line);
  background:transparent;padding:22px 4px;display:grid;grid-template-columns:140px 1fr auto;gap:24px;align-items:start;
}
.rack.is-list .issue-card:hover{transform:translateX(4px);box-shadow:none}
.rack.is-list .ic-top{border:none;padding:0;flex-direction:column;gap:2px}
.rack.is-list .ic-date{margin:4px 0 0}
.rack.is-list .ic-date b{font-size:26px}
.rack.is-list .ic-list{margin:0;columns:2;column-gap:28px}
.rack.is-list .ic-foot{border:none;padding:0;flex-direction:column;align-items:flex-end;gap:6px}

.empty{padding:56px 0;color:var(--mute);text-align:center}
.empty[hidden]{display:none}
footer{border-top:4px double var(--line-strong);padding:26px 0 56px;color:var(--mute);font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
@media(max-width:760px){
  .count-box{text-align:left}
  .view-switch{margin-left:0}
  .rack.is-list .issue-card{grid-template-columns:1fr;gap:10px}
  .rack.is-list .ic-list{columns:1}
  .rack.is-list .ic-foot{align-items:flex-start}
}
`;

const options = days.map((d) => `<option value="${d.date}">No.${d.issueNo} · ${d.date}</option>`).join("");
const cards = days
  .map((d, idx) => {
    const text = [d.issueNo, d.date, d.stat, ...d.titles].join(" ").toLowerCase();
    return `<a class="issue-card" href="${d.file}" data-date="${d.date}" data-text="${esc(text)}">
  <div>
    <div class="ic-top">
      <span class="ic-no">ISSUE NO.${d.issueNo}${idx === 0 ? " · LATEST" : ""}</span>
      <span class="ic-wk">${d.weekday}</span>
    </div>
    <div class="ic-date"><b>${d.dd}</b><span>${d.monEn} ${d.year}</span></div>
    <ol class="ic-list">${d.titles.map((t) => `<li>${esc(t.replace(/^[①-⑩]\s*/, ""))}</li>`).join("")}</ol>
  </div>
  <div class="ic-foot">
    <span>${esc(d.stat)}</span>
    <span class="ic-go">翻閱本刊 ↗</span>
  </div>
</a>`;
  })
  .join("\n");

const archive = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EveryNews · 往期刊物架 Back Issues</title>
<meta name="description" content="EveryNews 往期刊物架：按刊號、日期或標題關鍵字翻閱每日 AI 線上雜誌。">
<script>
(function(){try{var t=localStorage.getItem('everynews-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
</script>
<style>${ARCHIVE_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <a class="back" href="index.html">← 回到今日最新一刊（Issue No.${days[0].issueNo}）</a>
    <button type="button" class="theme-btn" id="theme-toggle">切換夜讀 / 紙本</button>
  </div>

  <header class="mast">
    <div>
      <div class="mast-kicker">BACK ISSUES &amp; INDEX · 典藏刊物架</div>
      <h1>EveryNews 往期刊物</h1>
      <p class="lede">每天更新一期。可切換雜誌封面牆與編年索引表，或直接搜尋任意議題。</p>
    </div>
    <div class="count-box">
      <b>${days.length}</b>
      <span>ISSUES PUBLISHED · ${days[days.length - 1].date} — ${days[0].date}</span>
    </div>
  </header>

  <section class="toolbar">
    <label>ISSUE · 期次
      <select id="date"><option value="">全部刊期</option>${options}</select>
    </label>
    <label>DATE · 指定日期
      <input type="date" id="pick" min="${days[days.length - 1].date}" max="${days[0].date}">
    </label>
    <label>SEARCH · 搜尋標題或刊號
      <input type="search" id="q" placeholder="輸入關鍵字，如 GLM、Anthropic、量化…">
    </label>
    <button type="button" class="reset-btn" id="reset">重置</button>
    <div class="view-switch" role="group" aria-label="檢視模式">
      <button type="button" id="v-grid" class="is-on">封面牆</button>
      <button type="button" id="v-list">編年表</button>
    </div>
    <div id="hint">SHOWING ${days.length} OF ${days.length} ISSUES</div>
  </section>

  <main class="rack" id="rack">
    ${cards}
  </main>
  <p class="empty" id="empty" hidden>這一篩選條件下沒有對應刊期，請換個關鍵字或點擊重置。</p>

  <footer>
    <span>EveryNews · Daily AI Journal Archive</span>
    <span>由 工具/make-index.mjs 自動編目生成</span>
  </footer>
</div>
<script>
(function(){
  var root = document.documentElement;
  document.getElementById('theme-toggle').addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('everynews-theme', next); } catch(e){}
  });

  var cards = Array.prototype.slice.call(document.querySelectorAll('.issue-card'));
  var dateSel = document.getElementById('date'), pick = document.getElementById('pick'), q = document.getElementById('q');
  var hint = document.getElementById('hint'), empty = document.getElementById('empty');
  var rack = document.getElementById('rack'), vGrid = document.getElementById('v-grid'), vList = document.getElementById('v-list');

  function apply(){
    var d = dateSel.value, p = pick.value, k = q.value.trim().toLowerCase();
    var n = 0;
    cards.forEach(function(c){
      var show = (!d || c.dataset.date === d) && (!p || c.dataset.date === p) && (!k || c.dataset.text.includes(k));
      c.hidden = !show;
      if (show) n++;
    });
    hint.textContent = 'SHOWING ' + n + ' OF ' + cards.length + ' ISSUES';
    empty.hidden = n > 0;
  }
  dateSel.addEventListener('change', function(){ pick.value = ''; apply(); });
  pick.addEventListener('change', function(){ dateSel.value = ''; apply(); });
  q.addEventListener('input', apply);
  document.getElementById('reset').addEventListener('click', function(){ dateSel.value = ''; pick.value = ''; q.value = ''; apply(); });

  vGrid.addEventListener('click', function(){ rack.classList.remove('is-list'); vGrid.classList.add('is-on'); vList.classList.remove('is-on'); });
  vList.addEventListener('click', function(){ rack.classList.add('is-list'); vList.classList.add('is-on'); vGrid.classList.remove('is-on'); });
})();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(WS, "archive.html"), archive, "utf8");
console.log(`✅ issues.js ${days.length} 期（改写历史页 ${touched} 个）· index.html = Issue No.${days[0].issueNo} (${days[0].date}) · archive.html 刊物架已刷新`);
