#!/usr/bin/env node
/**
 * EveryNews · 现代瑞士编辑风在线杂志生成器（make-public.mjs）
 * 设计准则：
 *   1. 全站与图版卡片 100% 统一使用现代无衬线字体栈（PingFang TC / Noto Sans TC + Tabular Numerals）
 *   2. 合并单层毛玻璃顶栏（内嵌期次下拉切换、往期入口、阅读进度、纸本/夜读切换），消除双顶栏叠床架屋
 *   3. 严格瑞士网格对齐：标题、图版阵列（1/2/3 张自适应满宽网格）、正文与核验档案卡左轴线严丝合缝
 *   4. 专栏废除突兀的西式首字下沉，改用东方现代编辑美学的「首段导语左侧朱砂竖线提亮 + 顶线规格栏」
 *   5. 夜读模式下对亮底图版自动施加柔和护眼微暗滤镜（悬停恢复全亮），并支持 J/K 键上下篇巡航
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(TOOL, "..");

const days = fs
  .readdirSync(WS)
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .filter((d) => fs.existsSync(path.join(WS, d, "文案.md")))
  .sort();

const date = process.argv[2] || days[days.length - 1];
if (!date || !days.includes(date)) {
  console.error(`✗ 找不到 ${date || "任何一期"} 的 文案.md。现有：${days.join(", ")}`);
  process.exit(1);
}

const stamp = date.replace(/-/g, "");
const dir = path.join(WS, date);
const md = fs.readFileSync(path.join(dir, "文案.md"), "utf8");
const NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

const allHtmlStamps = new Set(
  fs
    .readdirSync(WS)
    .filter((f) => /^\d{8}\.html$/.test(f))
    .map((f) => f.slice(0, 8))
);
allHtmlStamps.add(stamp);
const sortedStamps = [...allHtmlStamps].sort();
const issueNo = String(sortedStamps.indexOf(stamp) + 1).padStart(3, "0");

const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEK_ZH = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const WEEK_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dtObj = new Date(`${date}T00:00:00Z`);
const [yyyy, mm, dd] = date.split("-");
const dateEn = `${dd} ${MONTHS_EN[Number(mm) - 1]} ${yyyy}`;
const weekZh = WEEK_ZH[dtObj.getUTCDay()];
const weekEn = WEEK_EN[dtObj.getUTCDay()];

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function splitSections(src) {
  const out = {};
  for (const chunk of src.split(/^## /m).slice(1)) {
    const head = chunk.split(/\r?\n/)[0].trim();
    out[head] = chunk.split(/\r?\n/).slice(1).join("\n");
  }
  return out;
}

function parseFacts(block) {
  const rows = [];
  for (const line of block.split(/\r?\n/)) {
    if (!/^\|/.test(line.trim())) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/:/g, ""))) continue;
    if (cells[0] === "項" || cells[0] === "项") continue;
    rows.push(cells);
  }
  return rows;
}

/* ---------- 配图转码为外置 WebP（cards/<YYYYMMDD>/） ---------- */
const picDir = path.join(dir, "配图");
const cardOutDir = path.join(WS, "cards", stamp);
const groups = new Map();
let webpTotalBytes = 0;

if (fs.existsSync(picDir)) {
  const rawFiles = fs
    .readdirSync(picDir)
    .filter((x) => /\.(png|webp|jpe?g)$/i.test(x))
    .sort();
  if (rawFiles.length) {
    fs.rmSync(cardOutDir, { recursive: true, force: true });
    fs.mkdirSync(cardOutDir, { recursive: true });
    const pyScript = `
import json, sys
from pathlib import Path
from PIL import Image

src_dir = Path(sys.argv[1])
dst_dir = Path(sys.argv[2])
meta = []
for f in sorted(src_dir.iterdir()):
    if f.suffix.lower() not in (".png", ".webp", ".jpg", ".jpeg"):
        continue
    with Image.open(f) as im:
        w, h = im.size
        out_name = f.stem + ".webp"
        out_path = dst_dir / out_name
        im.save(out_path, "WEBP", quality=86, method=6)
        meta.append({"src": f.name, "out": out_name, "w": w, "h": h, "bytes": out_path.stat().st_size})
print(json.dumps(meta))
`;
    const converted = JSON.parse(
      execFileSync("python3", ["-c", pyScript, picDir, cardOutDir], { encoding: "utf8" }).trim()
    );
    for (const c of converted) {
      webpTotalBytes += c.bytes;
      const m = c.src.match(/^(\d\d)-(.+)-(\d\d)\.[a-z0-9]+$/i);
      if (!m) continue;
      if (!groups.has(m[1])) groups.set(m[1], []);
      groups.get(m[1]).push({
        slug: m[2],
        idx: m[3],
        href: `cards/${stamp}/${c.out}`,
        wide: c.w > c.h,
      });
    }
  }
}

/* ---------- 解析文案 ---------- */
const sec = splitSections(md);
const keyPost = Object.keys(sec).find((k) => /成稿/.test(k));
const keyLect = Object.keys(sec).find((k) => /講解|讲解/.test(k));

const items = [];
if (keyPost) {
  const chunks = sec[keyPost].split(/^### /m).slice(1);
  chunks.forEach((chunk, i) => {
    const lines = chunk.split(/\r?\n/);
    const rawTitle = lines[0].trim();
    const body = lines.slice(1).join("\n");
    const title = rawTitle.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "");
    const factsIdx = body.search(/\*\*事實表\*\*|\*\*事实表\*\*/);
    const factsAfter = factsIdx >= 0 ? body.indexOf("\n\n", factsIdx + 12) : -1;
    const facts = factsIdx >= 0 ? parseFacts(body.slice(factsIdx, factsAfter > 0 ? factsAfter : undefined)) : [];
    const blocks = [...body.matchAll(/```\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    const strip = (t) => {
      let s = t || "";
      let href = "";
      const lm = s.match(/\n(https?:\/\/\S+)\s*$/);
      if (lm) {
        href = lm[1];
        s = s.slice(0, s.length - lm[0].length);
      }
      s = s
        .split(/\r?\n/)
        .filter((l) => !/^#[^\s#]+$/.test(l.trim()))
        .join("\n")
        .trim();
      return { text: s, href };
    };
    const main = strip(blocks[0]);
    const factSrc = facts.find((r) => /^(來源|来源)$/.test(r[0]));
    const factSubj = facts.find((r) => /^(主體|主体)$/.test(r[0]));
    const factHref = factSrc ? (factSrc.slice(1).join(" ").match(/https?:\/\/\S+/) || [""])[0] : "";
    const link = main.href || factHref;
    let domain = "";
    try {
      domain = link ? new URL(link).hostname.replace(/^www\./, "") : "";
    } catch {
      domain = "";
    }
    const rubric = factSubj ? factSubj[1].split(/[，,（(]/)[0].trim() : domain || "DISPATCH";
    const numKey = String(i + 1).padStart(2, "0");
    const pics = groups.get(numKey) || [];
    items.push({
      id: (pics[0] && pics[0].slug) || `item-${numKey}`,
      idxStr: numKey,
      num: NUMS[i] || String(i + 1),
      rubric,
      domain,
      title,
      facts,
      text: main.text,
      link,
      pics,
    });
  });
}

const lectures = [];
if (keyLect) {
  for (const chunk of sec[keyLect].split(/^### /m).slice(1)) {
    const lines = chunk.split(/\r?\n/);
    const rawTitle = lines[0].trim();
    const cleanTitle = rawTitle.replace(/^(講|讲)[①②③④1234]\s*/, "");
    let body = lines.slice(1).join("\n");
    const meta = [];
    body = body.replace(/^- (原文|影片|視頻|视频|判據|判据|局面)\s*(.+)$/gm, (_, k, v) => {
      meta.push({ k, v: v.trim() });
      return "";
    });
    const factIdx = body.search(/\*\*事實表\*\*|\*\*事实表\*\*/);
    const factEnd = factIdx >= 0 ? body.indexOf("\n\n", factIdx + 12) : -1;
    const facts = factIdx >= 0 ? parseFacts(body.slice(factIdx, factEnd > 0 ? factEnd : undefined)) : [];
    const prose = (body.split("**正文**")[1] || "").split("**最值得看**")[0].trim();
    const best = (body.split("**最值得看**")[1] || "").trim().split(/\r?\n\r?\n/)[0] || "";
    const hanLen = (prose.match(/[\u4e00-\u9fff]/g) || []).length;
    lectures.push({
      id: `lect-${String(lectures.length + 1).padStart(2, "0")}`,
      rawTitle,
      cleanTitle,
      meta,
      facts,
      prose,
      hanLen,
      best: best.replace(/\s+/g, " "),
    });
  }
}

const totalPics = items.reduce((a, x) => a + x.pics.length, 0);
const totalHan =
  items.reduce((a, x) => a + (x.text.match(/[\u4e00-\u9fff]/g) || []).length, 0) +
  lectures.reduce((a, x) => a + x.hanLen, 0);
const readMins = Math.max(3, Math.round(totalHan / 380));

/* ---------- 渲染辅助 ---------- */
const para = (s, leadHighlight = false) =>
  s
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, idx) => `<p${leadHighlight && idx === 0 ? ' class="essay-lead"' : ""}>${esc(l)}</p>`)
    .join("");

const linkify = (s) =>
  esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a class="inline-url" href="${u}" target="_blank" rel="noopener">${u}</a>`);

const factDrawer = (rows, drawerId) =>
  rows.length
    ? `<div class="dossier" data-open="false">
        <button type="button" class="dossier-btn" aria-expanded="false" aria-controls="${esc(drawerId)}">
          <span class="dossier-label"><i></i>核驗檔案 · FACT DOSSIER</span>
          <span class="dossier-count">${rows.length} 項參數</span>
          <span class="dossier-icon" aria-hidden="true">+</span>
        </button>
        <div class="dossier-panel" id="${esc(drawerId)}">
          <div class="dossier-inner">
            <table><tbody>${rows
              .map((r) => `<tr><th>${esc(r[0])}</th><td>${linkify(r.slice(1).join(" "))}</td></tr>`)
              .join("")}</tbody></table>
          </div>
        </div>
      </div>`
    : "";

const cardShowcase = (it) => {
  if (!it.pics.length) return "";
  const countCls = `strip-${Math.min(it.pics.length, 3)}`;
  return `<div class="plate-wrap">
    <div class="strip ${countCls}">${it.pics
      .map(
        (p, k) =>
          `<figure class="plate${p.wide ? " wide" : ""}">
            <a class="shot" href="${esc(p.href)}" data-group="${esc(it.id)}" data-index="${k}" data-caption="${esc(`${it.num} ${it.title} — 圖版 ${k + 1}/${it.pics.length}`)}">
              <img src="${esc(p.href)}" alt="${esc(it.title)}" loading="lazy" decoding="async">
              <span class="zoom-pill">檢視原圖</span>
            </a>
            <figcaption><span>FIG ${esc(it.idxStr)}.${k + 1}</span><span>0${k + 1} / 0${it.pics.length}</span></figcaption>
          </figure>`
      )
      .join("")}</div>
  </div>`;
};

const renderItem = (it, idx) => `<article class="story reveal${idx === 0 ? " is-lead" : ""}" id="${esc(it.id)}" data-spy="${esc(it.id)}">
  <div class="story-meta">
    <span class="story-folio">${esc(it.idxStr)}</span>
    <span class="story-rubric">${esc(it.rubric)}</span>
    ${idx === 0 ? `<span class="lead-badge">COVER STORY · 本期頭條</span>` : ""}
  </div>
  <h3 class="story-title">${esc(it.title)}</h3>
  ${cardShowcase(it)}
  <div class="story-body">
    <div class="post">${para(it.text)}</div>
    <div class="story-actions">
      ${
        it.link
          ? `<a class="src-btn" href="${esc(it.link)}" target="_blank" rel="noopener">
              <span>閱讀一手原文</span>
              <small>${esc(it.domain || "SOURCE")}</small>
              <i aria-hidden="true">↗</i>
            </a>`
          : ""
      }
      <button type="button" class="share-btn" data-copy="#${esc(it.id)}">複製本節連結</button>
    </div>
    ${factDrawer(it.facts, `facts-${it.id}`)}
  </div>
</article>`;

const renderLecture = (l, idx) => `<article class="essay reveal" id="${esc(l.id)}" data-spy="${esc(l.id)}">
  <div class="essay-kicker">
    <span class="essay-badge">ESSAY 0${idx + 1}</span>
    <span class="essay-stat">${l.hanLen} 漢字 · 深度拆解</span>
  </div>
  <h3 class="essay-title">${esc(l.cleanTitle)}</h3>
  ${
    l.meta.length
      ? `<div class="essay-brief">${l.meta
          .map((m) => `<div class="brief-cell"><span class="bk">${esc(m.k)}</span><span class="bv">${linkify(m.v)}</span></div>`)
          .join("")}</div>`
      : ""
  }
  <div class="essay-prose">${para(l.prose, true)}</div>
  ${
    l.best
      ? `<aside class="editor-note">
          <div class="en-head"><span>EDITOR'S NOTE · 最值得看</span></div>
          <p>${esc(l.best)}</p>
        </aside>`
      : ""
  }
  ${factDrawer(l.facts, `facts-${l.id}`)}
</article>`;

/* ---------- 现代瑞士编辑美学样式表（全站与卡片同源无衬线字体） ---------- */
const CSS = `
:root{
  --paper:#F6F3EC;
  --paper-elev:#FCFBF8;
  --paper-feature:#EFEBE1;
  --ink:#141318;
  --ink2:#3F3B4D;
  --mute:#787287;
  --line:rgba(20,19,24,.12);
  --line-strong:#141318;
  --accent:#3B28CC;
  --accent-soft:rgba(59,40,204,.07);
  --stamp:#C84B31;
  --shadow:0 8px 24px rgba(20,19,24,.05),0 1px 3px rgba(20,19,24,.04);
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI","PingFang TC","PingFang SC","Noto Sans TC","Hiragino Sans GB","Microsoft JhengHei",sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
html[data-theme="dark"]{
  --paper:#0F0F13;
  --paper-elev:#17171F;
  --paper-feature:#1C1B26;
  --ink:#EFECE4;
  --ink2:#B8B3C7;
  --mute:#857F96;
  --line:rgba(255,255,255,.11);
  --line-strong:#E2DDD2;
  --accent:#9688FF;
  --accent-soft:rgba(150,136,255,.12);
  --stamp:#E06348;
  --shadow:0 14px 34px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.28);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{
  margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-variant-numeric:tabular-nums;line-height:1.82;font-size:16px;
  -webkit-font-smoothing:antialiased;line-break:strict;
  transition:background-color .3s var(--ease),color .3s var(--ease);
}
a{color:inherit;text-decoration:none}
button,select{font:inherit}
button{cursor:pointer}

/* 顶部阅读进度条 */
.progress-rail{position:fixed;top:0;left:0;right:0;height:2.5px;z-index:100;background:transparent}
.progress-bar{height:100%;width:0%;background:linear-gradient(90deg,var(--stamp),var(--accent));transition:width .1s linear}

/* 唯一合并的单层毛玻璃杂志顶栏（整合期次切换、归档入口、进度与日夜开关） */
.topbar{
  position:sticky;top:0;z-index:80;
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  background:color-mix(in srgb,var(--paper) 86%,transparent);
  border-bottom:1px solid var(--line);
}
.topbar-inner{
  max-width:1260px;margin:0 auto;padding:9px clamp(18px,4vw,52px);
  display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap;
}
.topbar-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.mini-brand{font-weight:800;font-size:15.5px;letter-spacing:-.02em}
.topbar-sep{color:var(--line);user-select:none}
.issue-switcher{display:inline-flex;align-items:center;gap:8px}
.issue-switcher select{
  font-size:12.5px;font-weight:600;padding:4px 10px;border-radius:99px;
  border:1px solid var(--line);background:var(--paper-elev);color:var(--ink);cursor:pointer;
}
.issue-switcher select:focus{outline:2px solid var(--accent);outline-offset:1px}
.archive-link{font-size:12.5px;font-weight:600;color:var(--accent);padding:3px 6px}
.archive-link:hover{text-decoration:underline}
.topbar-right{display:flex;align-items:center;gap:12px;margin-left:auto}
.issue-nav-hint{font-family:var(--mono);font-size:11px;color:var(--mute);display:none}
@media(min-width:900px){.issue-nav-hint{display:inline}}
.read-pct{font-family:var(--mono);font-size:11.5px;color:var(--mute);min-width:36px;text-align:right}
.theme-btn{
  display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;
  border:1px solid var(--line);background:var(--paper-elev);color:var(--ink2);
  font-size:12px;font-weight:600;transition:border-color .2s,transform .2s var(--ease);
}
.theme-btn:hover{border-color:var(--accent);transform:translateY(-1px)}
.theme-dot{width:7px;height:7px;border-radius:50%;background:var(--stamp)}

/* 瑞士现代杂志报头 Masthead */
.masthead{max-width:1260px;margin:0 auto;padding:clamp(28px,4.2vw,52px) clamp(18px,4vw,52px) 0}
.masthead-meta{
  display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;
  padding-bottom:12px;border-bottom:1px solid var(--line);
  font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--mute);text-transform:uppercase;
}
.stamp-pill{display:inline-flex;align-items:center;gap:8px;color:var(--stamp);font-weight:700}
.stamp-pill::before{content:"";width:7px;height:7px;border-radius:1.5px;background:var(--stamp)}
.masthead-hero{
  display:grid;grid-template-columns:1fr auto;gap:32px;align-items:end;
  padding:clamp(24px,3.6vw,42px) 0 clamp(24px,3.2vw,36px);
  border-bottom:2px solid var(--line-strong);
}
.journal-name{
  font-size:clamp(42px,6.8vw,82px);font-weight:900;
  line-height:.95;letter-spacing:-.045em;margin:0;
}
.journal-name span{color:var(--accent)}
.journal-sub{
  margin:14px 0 0;font-size:clamp(15px,1.4vw,17.5px);color:var(--ink2);max-width:52ch;line-height:1.68;
}
.issue-box{
  text-align:right;border-left:1px solid var(--line);padding-left:28px;
  display:flex;flex-direction:column;justify-content:flex-end;gap:4px;
}
.issue-box .ib-kicker{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--stamp);font-weight:700}
.issue-box .ib-date{font-size:clamp(26px,2.8vw,34px);font-weight:800;line-height:1.08;letter-spacing:-.03em}
.stat{font-family:var(--mono);font-size:11.5px;color:var(--mute);margin:4px 0 0}

.jump-compat{display:none}

/* 双栏瑞士网格：左侧吸附目录 + 右侧主内容区 */
.mag-shell{
  max-width:1260px;margin:0 auto;padding:0 clamp(18px,4vw,52px) 80px;
  display:grid;grid-template-columns:240px minmax(0,1fr);gap:clamp(28px,4.5vw,60px);align-items:start;
}
.toc-rail{
  position:sticky;top:64px;padding:32px 22px 24px 0;
  border-right:1px solid var(--line);
}
.toc-head{
  font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:var(--mute);
  text-transform:uppercase;margin:0 0 14px;display:flex;justify-content:space-between;
}
.toc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.toc-link{
  display:grid;grid-template-columns:24px 1fr;gap:8px;align-items:baseline;
  padding:7px 10px;border-radius:5px;font-size:13px;line-height:1.45;color:var(--ink2);
  border-left:2px solid transparent;transition:all .2s var(--ease);
}
.toc-link:hover{background:var(--accent-soft);color:var(--ink)}
.toc-link.is-active{
  background:var(--accent-soft);color:var(--ink);font-weight:700;
  border-left-color:var(--stamp);transform:translateX(2px);
}
.toc-no{font-family:var(--mono);font-size:11px;color:var(--mute)}
.toc-link.is-active .toc-no{color:var(--stamp);font-weight:700}
.toc-sec-label{
  margin:18px 0 8px;padding-top:14px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:var(--mute);
}
.toc-kbd{
  margin-top:20px;padding-top:14px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:10.5px;color:var(--mute);line-height:1.6;
}
.toc-kbd kbd{
  padding:1px 5px;border:1px solid var(--line);border-radius:3px;background:var(--paper-elev);font-size:10px;
}

/* 新闻条目版面 */
.mag-main{min-width:0}
.story{padding:clamp(34px,4.2vw,52px) 0;border-bottom:1px solid var(--line)}
.story.is-lead{padding-top:clamp(28px,3.4vw,42px)}
.story-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.story-folio{
  font-size:24px;font-weight:900;line-height:1;color:var(--accent);letter-spacing:-.04em;
}
.story-rubric{
  font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  padding:3px 9px;border:1px solid var(--line);border-radius:4px;color:var(--ink2);background:var(--paper-elev);
}
.lead-badge{
  font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;font-weight:700;
  padding:3px 9px;border-radius:4px;background:var(--stamp);color:#FAF8F4;
}
.story-title{
  font-size:clamp(22px,2.8vw,32px);font-weight:800;
  line-height:1.28;letter-spacing:-.025em;margin:0 0 22px;color:var(--ink);
}
.story.is-lead .story-title{font-size:clamp(25px,3.2vw,36px)}

/* 图版阵列：统一左对齐与满宽瑞士网格，与正文、档案卡、分割线右边缘严丝合缝对齐 */
.plate-wrap{margin:0 0 24px;width:100%}
.strip{display:grid;gap:clamp(12px,1.8vw,20px);width:100%}
.strip-1{grid-template-columns:minmax(0,1fr);max-width:480px}
.strip-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.strip-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.plate{margin:0;display:flex;flex-direction:column;gap:7px}
.plate.wide{grid-column:span 2}
.strip-1 .plate.wide{grid-column:span 1;max-width:680px}
.shot{
  position:relative;display:block;border-radius:6px;overflow:hidden;
  border:1px solid var(--line);background:var(--paper-elev);box-shadow:var(--shadow);
  cursor:zoom-in;transition:transform .32s var(--ease),box-shadow .32s var(--ease),border-color .22s;
}
.shot:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 18px 36px rgba(20,19,24,.11)}
.shot img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;transition:transform .45s var(--ease),filter .3s}
html[data-theme="dark"] .shot img{filter:brightness(.93) contrast(1.02)}
html[data-theme="dark"] .shot:hover img{filter:brightness(1)}
.plate.wide .shot img{aspect-ratio:16/9;object-fit:contain}
.shot:hover img{transform:scale(1.015)}
.zoom-pill{
  position:absolute;right:10px;bottom:10px;padding:4px 10px;border-radius:99px;
  background:rgba(20,19,24,.78);color:#FAF8F4;font-size:11px;font-family:var(--mono);
  opacity:0;transform:translateY(4px);transition:all .22s var(--ease);pointer-events:none;
}
.shot:hover .zoom-pill{opacity:1;transform:translateY(0)}
.plate figcaption{
  display:flex;justify-content:space-between;font-family:var(--mono);
  font-size:10.5px;letter-spacing:.08em;color:var(--mute);padding:0 2px;
}

/* 正文与按钮区：100% 撑满主阅读栏，消除右侧参差留白 */
.story-body{width:100%}
.post p{margin:0 0 1em;font-size:16.5px;line-height:1.9;color:var(--ink);text-align:justify}
.story-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0 4px}
.src-btn{
  display:inline-flex;align-items:center;gap:9px;padding:7px 14px;border-radius:6px;
  border:1px solid var(--line);background:var(--paper-elev);font-size:13px;font-weight:600;
  transition:all .22s var(--ease);
}
.src-btn small{font-family:var(--mono);font-size:11px;color:var(--mute);font-weight:400}
.src-btn i{font-style:normal;color:var(--accent);transition:transform .22s var(--ease)}
.src-btn:hover{border-color:var(--accent);transform:translateY(-1px)}
.src-btn:hover i{transform:translate(2px,-2px)}
.share-btn{
  padding:7px 12px;border-radius:6px;border:1px solid transparent;background:transparent;
  color:var(--mute);font-size:12.5px;transition:all .2s;
}
.share-btn:hover{border-color:var(--line);background:var(--paper-elev);color:var(--ink)}

/* 手风琴核验档案卡 */
.dossier{margin-top:14px;border:1px solid var(--line);border-radius:6px;background:var(--paper-elev);overflow:hidden}
.dossier-btn{
  width:100%;display:flex;align-items:center;gap:10px;padding:10px 15px;
  background:transparent;border:none;color:var(--ink2);text-align:left;transition:background .2s;
}
.dossier-btn:hover{background:var(--accent-soft)}
.dossier-label{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em}
.dossier-label i{width:6px;height:6px;border-radius:1px;background:var(--accent);display:inline-block}
.dossier-count{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--mute)}
.dossier-icon{
  width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:15px;color:var(--accent);transition:transform .28s var(--ease);
}
.dossier[data-open="true"] .dossier-icon{transform:rotate(45deg)}
.dossier-panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s var(--ease)}
.dossier[data-open="true"] .dossier-panel{grid-template-rows:1fr}
.dossier-inner{overflow:hidden}
.dossier-inner table{width:100%;border-collapse:collapse;border-top:1px solid var(--line);font-size:13.5px}
.dossier-inner th{
  text-align:left;vertical-align:top;white-space:nowrap;color:var(--mute);
  font-family:var(--mono);font-weight:600;padding:8px 18px 8px 15px;width:1%;
}
.dossier-inner td{padding:8px 15px 8px 0;border-bottom:1px solid var(--line);color:var(--ink2);overflow-wrap:anywhere}
.dossier-inner tr:last-child td{border-bottom:none}
.inline-url{color:var(--accent);word-break:break-all}
.inline-url:hover{text-decoration:underline}

/* 深度专栏 Feature Well（东方现代编辑感：顶线规格栏 + 首段导语竖线提亮） */
.feature-well{
  margin-top:52px;padding:clamp(28px,4vw,48px);border-radius:8px;
  background:var(--paper-feature);border-top:2px solid var(--line-strong);
}
.feature-header{
  display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;
  padding-bottom:20px;border-bottom:1px solid var(--line);margin-bottom:6px;
}
.feature-header h2{font-size:clamp(22px,2.6vw,30px);font-weight:800;margin:0;letter-spacing:-.025em}
.feature-header span{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--stamp);font-weight:700}
.essay{padding:34px 0;border-bottom:1px solid var(--line)}
.essay:last-child{border-bottom:none;padding-bottom:4px}
.essay-kicker{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.essay-badge{
  font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;font-weight:700;
  padding:3px 8px;background:var(--ink);color:var(--paper);border-radius:3px;
}
.essay-stat{font-family:var(--mono);font-size:11.5px;color:var(--mute)}
.essay-title{
  font-size:clamp(21px,2.5vw,28px);font-weight:800;
  margin:0 0 20px;line-height:1.3;letter-spacing:-.02em;
}
.essay-brief{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;
  margin:0 0 26px;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
}
.brief-cell{display:flex;flex-direction:column;gap:5px}
.brief-cell .bk{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--stamp);font-weight:700}
.brief-cell .bv{font-size:13px;line-height:1.58;color:var(--ink2);overflow-wrap:anywhere}
.essay-prose{width:100%}
.essay-prose p{margin:0 0 1.12em;font-size:16.5px;line-height:1.92;color:var(--ink);text-align:justify}
.essay-prose p.essay-lead{
  font-size:17.2px;font-weight:500;padding-left:16px;
  border-left:3px solid var(--accent);color:var(--ink);
}
.editor-note{
  margin:22px 0 16px;padding:14px 18px;border-left:3px solid var(--stamp);
  background:var(--paper-elev);border-radius:0 6px 6px 0;width:100%;
}
.editor-note .en-head{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;color:var(--stamp);font-weight:700;margin-bottom:5px}
.editor-note p{margin:0;font-size:14.5px;line-height:1.68;color:var(--ink2)}

/* 前后期翻页与页脚 */
.issue-pager{
  max-width:1260px;margin:0 auto;padding:0 clamp(18px,4vw,52px) 36px;
  display:grid;grid-template-columns:1fr 1fr;gap:16px;
}
.pager-card{
  padding:18px 22px;border:1px solid var(--line);border-radius:6px;background:var(--paper-elev);
  display:flex;flex-direction:column;gap:4px;transition:all .22s var(--ease);
}
.pager-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.pager-card.next{text-align:right}
.pager-card small{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--mute)}
.pager-card strong{font-size:17px;font-weight:700}

.foot{
  max-width:1260px;margin:0 auto;padding:26px clamp(18px,4vw,52px) 60px;
  border-top:2px solid var(--line-strong);color:var(--mute);font-size:13px;
  display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;
}
.foot p{margin:0}

/* 移动端悬浮目录抽屉 */
.fab-toc{
  display:none;position:fixed;right:18px;bottom:20px;z-index:85;
  padding:10px 16px;border-radius:99px;border:1px solid var(--line);
  background:var(--ink);color:var(--paper);font-size:13px;font-weight:600;
  box-shadow:0 10px 26px rgba(0,0,0,.22);
}
.mobile-drawer{
  position:fixed;inset:0;z-index:95;background:rgba(12,11,16,.58);
  backdrop-filter:blur(4px);display:flex;align-items:flex-end;opacity:0;pointer-events:none;
  transition:opacity .26s var(--ease);
}
.mobile-drawer.is-open{opacity:1;pointer-events:auto}
.mobile-sheet{
  width:100%;max-height:76vh;overflow-y:auto;background:var(--paper-elev);
  border-radius:16px 16px 0 0;padding:20px 20px 30px;
  transform:translateY(100%);transition:transform .3s var(--ease);
}
.mobile-drawer.is-open .mobile-sheet{transform:translateY(0)}
.sheet-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:12px}
.sheet-head strong{font-size:16px;font-weight:800}
.sheet-close{border:none;background:transparent;color:var(--mute);font-size:22px;line-height:1}

/* 灯箱 */
.lightbox{
  position:fixed;inset:0;background:rgba(12,11,18,.92);backdrop-filter:blur(8px);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  z-index:110;padding:24px;opacity:0;pointer-events:none;transition:opacity .24s var(--ease);
}
.lightbox.is-open{opacity:1;pointer-events:auto}
.lb-stage{position:relative;display:flex;align-items:center;justify-content:center;max-width:92vw;max-height:82vh}
.lb-stage img{max-width:92vw;max-height:82vh;border-radius:6px;box-shadow:0 24px 60px rgba(0,0,0,.5);transform:scale(.96);transition:transform .28s var(--ease)}
.lightbox.is-open .lb-stage img{transform:scale(1)}
.lb-nav{
  position:fixed;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;
  border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;
  font-size:20px;display:flex;align-items:center;justify-content:center;transition:background .2s;
}
.lb-nav:hover{background:rgba(255,255,255,.2)}
.lb-prev{left:20px}
.lb-next{right:20px}
.lb-close{
  position:fixed;top:18px;right:22px;width:40px;height:40px;border-radius:50%;
  border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font-size:20px;
}
.lb-bar{margin-top:14px;color:rgba(255,255,255,.82);font-family:var(--mono);font-size:12px;letter-spacing:.04em;text-align:center}

.toast{
  position:fixed;left:50%;bottom:28px;transform:translate(-50%,16px);opacity:0;
  background:var(--ink);color:var(--paper);padding:8px 16px;border-radius:99px;
  font-size:13px;font-weight:600;z-index:120;pointer-events:none;transition:all .26s var(--ease);
}
.toast.is-on{opacity:1;transform:translate(-50%,0)}

.reveal{opacity:0;transform:translateY(16px);transition:opacity .55s var(--ease),transform .55s var(--ease)}
.reveal.is-visible{opacity:1;transform:translateY(0)}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .reveal{opacity:1;transform:none;transition:none}
}
@media (max-width:1024px){
  .mag-shell{grid-template-columns:1fr}
  .toc-rail{display:none}
  .fab-toc{display:inline-flex;align-items:center;gap:6px}
}
@media (max-width:760px){
  .masthead-hero{grid-template-columns:1fr;gap:16px}
  .issue-box{text-align:left;border-left:none;border-top:1px solid var(--line);padding:14px 0 0}
  .strip-2,.strip-3,.essay-brief{grid-template-columns:1fr}
  .plate.wide{grid-column:span 1}
  .issue-pager{grid-template-columns:1fr}
  .pager-card.next{text-align:left}
  .lb-nav{bottom:18px;top:auto;transform:none}
  .lb-prev{left:28%}
  .lb-next{right:28%}
}
`;

const statLine = totalPics
  ? `${items.length} 篇快訊 · ${totalPics} 張圖版 · ${lectures.length} 篇專欄`
  : `${items.length} 篇快訊 · ${lectures.length} 篇專欄`;

const tocItemsHtml = `
  <ul class="toc-list">
    ${items
      .map(
        (it) =>
          `<li><a class="toc-link" href="#${esc(it.id)}" data-toc="${esc(it.id)}"><span class="toc-no">${esc(it.idxStr)}</span><span>${esc(it.title)}</span></a></li>`
      )
      .join("")}
  </ul>
  ${
    lectures.length
      ? `<div class="toc-sec-label">ESSAYS · 深度專欄</div>
         <ul class="toc-list">
           ${lectures
             .map(
               (l, idx) =>
                 `<li><a class="toc-link" href="#${esc(l.id)}" data-toc="${esc(l.id)}"><span class="toc-no">E${idx + 1}</span><span>${esc(l.cleanTitle)}</span></a></li>`
             )
             .join("")}
         </ul>`
      : ""
  }
`;

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EveryNews · Issue No.${issueNo} (${esc(date)})</title>
<meta name="description" content="EveryNews 每日 AI 線上雜誌：讀報筆記體快訊、視覺圖版與兩篇深度專欄。">
<script>
(function(){try{var t=localStorage.getItem('everynews-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
</script>
<style>${CSS}</style>
</head>
<body>
<div class="progress-rail" aria-hidden="true"><div class="progress-bar" id="progress-bar"></div></div>

<header class="topbar issue-nav" data-current="${stamp}.html">
  <div class="topbar-inner">
    <div class="topbar-left">
      <a href="index.html" class="mini-brand">EveryNews.</a>
      <span class="topbar-sep">/</span>
      <div class="issue-switcher">
        <select id="issue-select" aria-label="切換期次"><option value="${stamp}.html" selected>No.${issueNo} · ${esc(date)}</option><option value="archive.html">往期刊物架</option></select>
        <a href="archive.html" class="archive-link">往期刊物架 →</a>
      </div>
    </div>
    <div class="topbar-right">
      <span class="issue-nav-hint" id="issue-nav-hint"></span>
      <span class="read-pct" id="read-pct">0%</span>
      <button type="button" class="theme-btn" id="theme-toggle" aria-label="切換紙本與夜讀模式">
        <span class="theme-dot"></span><span id="theme-label">夜讀</span>
      </button>
    </div>
  </div>
</header>
<script src="issues.js"></script>

<section class="masthead">
  <div class="masthead-meta">
    <span class="stamp-pill">DAILY AI JOURNAL · 每日一刊</span>
    <span>${esc(weekEn)} · ${esc(dateEn)} · 約 ${readMins} 分鐘讀完</span>
  </div>
  <div class="masthead-hero">
    <div>
      <h1 class="journal-name">EveryNews<span>.</span></h1>
      <p class="journal-sub">把每天真正值得讀的一手技術博客、論文與財報對完帳，寫成一份連貫好讀的同行讀報雜誌。</p>
    </div>
    <div class="issue-box">
      <span class="ib-kicker">ISSUE NO. ${issueNo} · ${esc(weekZh)}</span>
      <div class="ib-date">${esc(date)}</div>
      <p class="stat">${statLine}</p>
    </div>
  </div>
</section>

<nav class="jump jump-compat" aria-hidden="true">${items.map((it) => `<a href="#${esc(it.id)}">${esc(it.num)} ${esc(it.title)}</a>`).join("")}</nav>

<div class="mag-shell">
  <aside class="toc-rail" aria-label="本期目錄">
    <div class="toc-head"><span>IN THIS ISSUE</span><span>目錄</span></div>
    ${tocItemsHtml}
    <div class="toc-kbd">快捷鍵 <kbd>J</kbd> <kbd>K</kbd> 上下篇 · <kbd>T</kbd> 夜讀</div>
  </aside>

  <main class="mag-main">
    <section class="dispatches">
      ${items.map(renderItem).join("")}
    </section>

    ${
      lectures.length
        ? `<section class="feature-well reveal">
            <div class="feature-header">
              <h2>深度專欄 · Feature Essays</h2>
              <span>DEEP DIVES · 每日兩篇</span>
            </div>
            ${lectures.map(renderLecture).join("")}
          </section>`
        : ""
    }
  </main>
</div>

<nav class="issue-pager" id="issue-pager" aria-label="前後期翻頁"></nav>

<footer class="foot">
  <p><strong>EveryNews.</strong> · Issue No.${issueNo} · 每日 AI 讀報雜誌</p>
  <p><a href="archive.html" style="text-decoration:underline">瀏覽全部往期刊物架 →</a></p>
</footer>

<button type="button" class="fab-toc" id="fab-toc">☰ 本期目錄</button>
<div class="mobile-drawer" id="mobile-drawer" aria-hidden="true">
  <div class="mobile-sheet">
    <div class="sheet-head"><strong>本期目錄 · Issue No.${issueNo}</strong><button type="button" class="sheet-close" id="sheet-close">×</button></div>
    ${tocItemsHtml}
  </div>
</div>

<div class="lightbox" id="lb" aria-hidden="true">
  <button type="button" class="lb-close" id="lb-close" aria-label="關閉">×</button>
  <button type="button" class="lb-nav lb-prev" id="lb-prev" aria-label="上一張">‹</button>
  <div class="lb-stage"><img id="lb-img" alt=""></div>
  <button type="button" class="lb-nav lb-next" id="lb-next" aria-label="下一張">›</button>
  <div class="lb-bar" id="lb-cap"></div>
</div>

<div class="toast" id="toast">已複製連結</div>

<script>
(function(){
  var root = document.documentElement;
  var tBtn = document.getElementById('theme-toggle');
  var tLab = document.getElementById('theme-label');
  function toggleTheme(){
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('everynews-theme', next); } catch(e){}
    syncThemeLabel();
  }
  function syncThemeLabel(){
    var dark = root.getAttribute('data-theme') === 'dark';
    if (tLab) tLab.textContent = dark ? '紙本' : '夜讀';
  }
  syncThemeLabel();
  if (tBtn) tBtn.addEventListener('click', toggleTheme);

  var pBar = document.getElementById('progress-bar');
  var pTxt = document.getElementById('read-pct');
  function onScroll(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / h) * 100))) : 0;
    if (pBar) pBar.style.width = pct + '%';
    if (pTxt) pTxt.textContent = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var reveals = document.querySelectorAll('.reveal');
  var spyTargets = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
  var activeSpyIdx = 0;

  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          revObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el){ revObs.observe(el); });

    var tocLinks = document.querySelectorAll('[data-toc]');
    var spyObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) {
          var id = en.target.getAttribute('data-spy');
          var found = spyTargets.indexOf(en.target);
          if (found !== -1) activeSpyIdx = found;
          tocLinks.forEach(function(a){
            a.classList.toggle('is-active', a.getAttribute('data-toc') === id);
          });
        }
      });
    }, { rootMargin: '-18% 0px -68% 0px' });
    spyTargets.forEach(function(el){ spyObs.observe(el); });
  } else {
    reveals.forEach(function(el){ el.classList.add('is-visible'); });
  }

  document.querySelectorAll('.dossier-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var box = btn.closest('.dossier');
      var open = box.getAttribute('data-open') === 'true';
      box.setAttribute('data-open', open ? 'false' : 'true');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('is-on'); }, 1800);
  }
  document.querySelectorAll('.share-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var hash = btn.getAttribute('data-copy') || '';
      var url = location.origin + location.pathname + hash;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function(){ showToast('已複製本節連結'); });
      } else {
        location.hash = hash;
        showToast('已定位至本節');
      }
    });
  });

  var drawer = document.getElementById('mobile-drawer');
  var fab = document.getElementById('fab-toc');
  var sClose = document.getElementById('sheet-close');
  function closeDrawer(){ if (drawer) drawer.classList.remove('is-open'); }
  if (fab && drawer) fab.addEventListener('click', function(){ drawer.classList.add('is-open'); });
  if (sClose) sClose.addEventListener('click', closeDrawer);
  if (drawer) {
    drawer.addEventListener('click', function(e){
      if (e.target === drawer || e.target.closest('[data-toc]')) closeDrawer();
    });
  }

  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lb-img');
  var lbCap = document.getElementById('lb-cap');
  var lbPrev = document.getElementById('lb-prev');
  var lbNext = document.getElementById('lb-next');
  var lbClose = document.getElementById('lb-close');
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
  var curIdx = -1;

  function openAt(idx){
    if (!shots.length || idx < 0 || idx >= shots.length) return;
    curIdx = idx;
    var a = shots[curIdx];
    lbImg.src = a.getAttribute('href') || a.querySelector('img').src;
    lbCap.textContent = (a.getAttribute('data-caption') || '') + '  ·  全刊圖版 ' + (curIdx + 1) + ' / ' + shots.length;
    lb.classList.add('is-open');
    lbPrev.style.display = shots.length > 1 ? '' : 'none';
    lbNext.style.display = shots.length > 1 ? '' : 'none';
  }
  function closeLb(){ lb.classList.remove('is-open'); curIdx = -1; }
  shots.forEach(function(a, i){
    a.addEventListener('click', function(e){ e.preventDefault(); openAt(i); });
  });
  if (lbPrev) lbPrev.addEventListener('click', function(e){ e.stopPropagation(); openAt((curIdx - 1 + shots.length) % shots.length); });
  if (lbNext) lbNext.addEventListener('click', function(e){ e.stopPropagation(); openAt((curIdx + 1) % shots.length); });
  if (lbClose) lbClose.addEventListener('click', closeLb);
  if (lb) lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });

  document.addEventListener('keydown', function(e){
    var tag = (e.target && e.target.tagName) || '';
    if (lb && lb.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') openAt((curIdx - 1 + shots.length) % shots.length);
      if (e.key === 'ArrowRight') openAt((curIdx + 1) % shots.length);
      return;
    }
    if (/INPUT|SELECT|TEXTAREA/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 't' || e.key === 'T') { toggleTheme(); showToast(root.getAttribute('data-theme') === 'dark' ? '已切換至夜讀模式' : '已切換至紙本模式'); }
    if ((e.key === 'j' || e.key === 'J') && spyTargets.length) {
      activeSpyIdx = Math.min(spyTargets.length - 1, activeSpyIdx + 1);
      spyTargets[activeSpyIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if ((e.key === 'k' || e.key === 'K') && spyTargets.length) {
      activeSpyIdx = Math.max(0, activeSpyIdx - 1);
      spyTargets[activeSpyIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  window.addEventListener('DOMContentLoaded', function(){
    var list = window.EVERYNEWS_ISSUES || [];
    var pager = document.getElementById('issue-pager');
    if (!pager || !list.length) return;
    var curFile = '${stamp}.html';
    var idx = list.findIndex(function(x){ return x.file === curFile; });
    if (idx === -1) idx = 0;
    var prevIssue = list[idx + 1];
    var nextIssue = idx > 0 ? list[idx - 1] : null;
    var html = '';
    if (prevIssue) {
      html += '<a class="pager-card prev" href="' + prevIssue.file + '"><small>← PREVIOUS ISSUE · 上一刊</small><strong>' + prevIssue.date + ' 期</strong></a>';
    } else {
      html += '<a class="pager-card prev" href="archive.html"><small>BACK ISSUES · 往期刊物架</small><strong>查看全部歷史期次</strong></a>';
    }
    if (nextIssue) {
      html += '<a class="pager-card next" href="' + nextIssue.file + '"><small>NEXT ISSUE · 下一刊 →</small><strong>' + nextIssue.date + ' 期</strong></a>';
    } else {
      html += '<a class="pager-card next" href="archive.html"><small>ALL ISSUES · 共 ' + list.length + ' 期 →</small><strong>進入往期刊物架篩選</strong></a>';
    }
    pager.innerHTML = html;
  });
})();
</script>
</body>
</html>`;

const out = path.join(WS, `${stamp}.html`);
fs.writeFileSync(out, html, "utf8");
const htmlKb = (fs.statSync(out).size / 1024).toFixed(1);
const webpKb = (webpTotalBytes / 1024).toFixed(0);
console.log(
  `✅ ${path.relative(WS, out)}（${htmlKb} KB · Issue No.${issueNo}）　${items.length} 篇快讯 · ${totalPics} 张图版（${webpKb} KB）· ${lectures.length} 篇专栏`
);
