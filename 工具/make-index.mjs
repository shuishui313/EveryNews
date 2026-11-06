#!/usr/bin/env node
/**
 * 生成根目录 index.html，作为全部期次的归档入口。
 * 扫描 <工作区>/<YYYYMMDD>.html，从每期页面的 .jump 导航取六条标题与统计。
 * 出稿.sh ③ 在生成当天公开页之后调用一次，新一期自动出现在最前。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const T = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(T, "..");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const strip = (s) => String(s)
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const WEEK = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

const files = fs.readdirSync(WS)
  .filter((f) => /^\d{8}\.html$/.test(f))
  .sort()
  .reverse();

if (!files.length) {
  console.error("✗ 根目录没有 <YYYYMMDD>.html，先跑一次 make-public.mjs");
  process.exit(1);
}

const days = files.map((f) => {
  const stamp = f.slice(0, 8);
  const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
  const full = path.join(WS, f);
  const html = fs.readFileSync(full, "utf8");
  const nav = html.match(/<nav class="jump">([\s\S]*?)<\/nav>/);
  const titles = nav
    ? [...nav[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) => strip(m[1]))
    : [];
  const stat = html.match(/<p class="stat">([\s\S]*?)<\/p>/);
  return {
    file: f,
    date,
    short: date.slice(5),
    year: date.slice(0, 4),
    weekday: WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()],
    titles,
    stat: stat ? strip(stat[1]) : "",
    size: (fs.statSync(full).size / 1024 / 1024).toFixed(1),
  };
});

const CSS = `
*{box-sizing:border-box}
:root{--accent:#6B4EFF;--ink:#1A1727;--ink2:#4A4560;--mute:#7C7691;--line:#E7E2F3;--soft:#F5F2FF}
body{margin:0;background:#fff;color:var(--ink);font:15px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif;line-break:strict}
a{color:inherit}
.wrap{max-width:940px;margin:0 auto;padding:0 clamp(18px,5vw,40px)}
header{padding:56px 0 30px;border-bottom:1px solid var(--line)}
.brand{font-size:13px;letter-spacing:.16em;color:var(--accent);font-weight:700}
h1{margin:14px 0 8px;font-size:clamp(30px,5vw,42px);letter-spacing:-.02em}
.lede{margin:0;color:var(--ink2);font-size:16px}
.count{margin:12px 0 0;color:var(--mute);font-size:13px}
.count strong{color:var(--accent)}
.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:22px 0;border-bottom:1px solid var(--line)}
.filters label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--mute)}
select,input[type=date],input[type=search]{font:inherit;font-size:14px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px 10px;min-height:38px}
input[type=search]{min-width:200px}
select:focus,input:focus{outline:2px solid var(--accent);outline-offset:1px}
button{font:inherit;font-size:14px;border:1px solid var(--line);background:var(--soft);color:var(--ink2);border-radius:6px;padding:8px 14px;min-height:38px;cursor:pointer}
button:hover{border-color:var(--accent)}
#hint{font-size:13px;color:var(--mute);margin-left:auto;padding-bottom:9px}
main{padding:8px 0 40px}
.day{display:grid;grid-template-columns:92px minmax(0,1fr) 76px;gap:22px;align-items:start;padding:26px 0;border-bottom:1px solid var(--line);text-decoration:none}
.day[hidden]{display:none}
.day:hover .body h2{color:var(--accent)}
.when b{display:block;font-size:24px;letter-spacing:-.02em}
.when span{display:block;color:var(--mute);font-size:12px;margin-top:2px}
.body h2{margin:0 0 10px;font-size:17px;font-weight:650;transition:color .15s}
.body h2 small{font-weight:400;color:var(--mute);font-size:12px;margin-left:8px}
.body ol{margin:0;padding-left:1.3em;color:var(--ink2);font-size:14px}
.body li{margin:2px 0}
.go{color:var(--accent);font-size:13px;white-space:nowrap;padding-top:3px}
.empty{padding:48px 0;color:var(--mute);text-align:center}
.empty[hidden]{display:none}
footer{border-top:1px solid var(--line);padding:26px 0 56px;color:var(--mute);font-size:13px}
footer p{margin:0 0 6px}
@media(max-width:640px){.day{grid-template-columns:1fr;gap:8px}.when{display:flex;align-items:baseline;gap:10px}.when span{margin:0}.go{padding:0}#hint{margin-left:0}}
`;

const options = days.map((d) => `<option value="${d.date}">${d.date} · ${d.titles.length} 条</option>`).join("");
const cards = days.map((d) => {
  const text = [d.date, d.stat, ...d.titles].join(" ").toLowerCase();
  return `<a class="day" href="${d.file}" data-date="${d.date}" data-text="${esc(text)}">
  <div class="when"><b>${d.short}</b><span>${d.year} · ${d.weekday}</span></div>
  <div class="body">
    <h2>${d.date}<small>${esc(d.stat)} · ${d.size} MB</small></h2>
    <ol>${d.titles.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
  </div>
  <div class="go">打开这一期 →</div>
</a>`;
}).join("\n");

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EveryNews · 全部期次</title>
<meta name="description" content="按日期查 EveryNews 的历史期次。每天六条，每条三张卡。">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header>
  <div class="brand">EveryNews</div>
  <h1>全部期次</h1>
  <p class="lede">每天六条，每条三张卡。按日期找，或直接搜标题。</p>
  <p class="count">共 <strong>${days.length}</strong> 期 · 最新 ${days[0].date} · 最早 ${days[days.length - 1].date}</p>
</header>
<section class="filters">
  <label>期次
    <select id="date"><option value="">全部期次</option>${options}</select>
  </label>
  <label>指定日期
    <input type="date" id="pick" min="${days[days.length - 1].date}" max="${days[0].date}">
  </label>
  <label>搜标题
    <input type="search" id="q" placeholder="輸入日期或標題關鍵字">
  </label>
  <button type="button" id="reset">重置</button>
  <span id="hint">显示 ${days.length} 期</span>
</section>
<main id="list">
${cards}
</main>
<p class="empty" id="empty" hidden>这一筛选下没有期次，换一个日期或清空条件。</p>
<footer>
  <p>每期是自包含单文件 HTML，文案、事实表与 18 张卡全部内联，不依赖服务器。</p>
  <p>新一期出稿后本页由 工具/make-index.mjs 自动刷新。</p>
</footer>
</div>
<script>
const cards=[...document.querySelectorAll('.day')];
const dateSel=document.getElementById('date'),pick=document.getElementById('pick'),q=document.getElementById('q');
const hint=document.getElementById('hint'),empty=document.getElementById('empty');
function apply(){
  const d=dateSel.value,p=pick.value,k=q.value.trim().toLowerCase();
  let n=0;
  cards.forEach(c=>{
    const show=(!d||c.dataset.date===d)&&(!p||c.dataset.date===p)&&(!k||c.dataset.text.includes(k));
    c.hidden=!show;
    if(show)n++;
  });
  hint.textContent='显示 '+n+' 期';
  empty.hidden=n>0;
}
dateSel.addEventListener('change',()=>{pick.value='';apply()});
pick.addEventListener('change',()=>{dateSel.value='';apply()});
q.addEventListener('input',apply);
document.getElementById('reset').addEventListener('click',()=>{dateSel.value='';pick.value='';q.value='';apply()});
</script>
</body>
</html>`;

const out = path.join(WS, "index.html");
fs.writeFileSync(out, html, "utf8");
console.log(`✅ index.html　${days.length} 期（${days[days.length - 1].date} → ${days[0].date}）`);
