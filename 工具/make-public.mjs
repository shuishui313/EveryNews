#!/usr/bin/env node
/**
 * 把当天产出做成单文件自包含公开页：EveryNews_<YYYYMMDD>.html
 * 图片 base64 内联、CSS 内联，拿到网址或单个文件就能打开，不依赖任何相对路径。
 *
 * 用法: node 工具/make-public.mjs [YYYY-MM-DD]
 *   不给日期就取最新一期（按目录里有 文案.md 的最大日期）。
 * 输出: <工作区>/EveryNews_<YYYYMMDD>.html
 */
import fs from "node:fs";
import path from "node:path";
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

const dir = path.join(WS, date);
const md = fs.readFileSync(path.join(dir, "文案.md"), "utf8");
const NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function splitSections(md) {
  const out = {};
  for (const chunk of md.split(/^## /m).slice(1)) {
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

const b64 = (p) =>
  `data:image/png;base64,${fs
    .readFileSync(path.join(dir, "配图", p.file))
    .toString("base64")}`;

/* ---------- 解析 ---------- */

const sec = splitSections(md);
const keyPost = Object.keys(sec).find((k) => /成稿/.test(k));
const keyLect = Object.keys(sec).find((k) => /講解|讲解/.test(k));

const picDir = path.join(dir, "配图");
const groups = new Map();
if (fs.existsSync(picDir)) {
  for (const f of fs.readdirSync(picDir).filter((x) => x.endsWith(".png")).sort()) {
    const m = f.match(/^(\d\d)-(.+)-(\d\d)\.png$/);
    if (!m) continue;
    if (!groups.has(m[1])) groups.set(m[1], []);
    groups.get(m[1]).push({ file: f, slug: m[2], idx: m[3] });
  }
}

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
      const tags = s.match(/#[^\s#]+/g) || [];
      s = s
        .split(/\r?\n/)
        .filter((l) => !/^#[^\s#]+$/.test(l.trim()))
        .join("\n")
        .trim();
      return { text: s, tags, href };
    };
    const X = strip(blocks[0]);
    const T = strip(blocks[1]);
    const num = String(i + 1).padStart(2, "0");
    const pics = (groups.get(num) || []).map((p) => ({ ...p, href: b64(p) }));
    items.push({
      num: NUMS[i] || String(i + 1),
      title,
      facts,
      xpost: X.text,
      threads: T.text,
      tags: T.tags,
      link: T.href || X.href,
      pics,
      slug: pics[0] ? pics[0].slug : "",
    });
  });
}

const lectures = [];
if (keyLect) {
  for (const chunk of sec[keyLect].split(/^### /m).slice(1)) {
    const lines = chunk.split(/\r?\n/);
    const title = lines[0].trim();
    let body = lines.slice(1).join("\n");
    const meta = [];
    body = body.replace(/^- (原文|影片|判據|判据|局面)\s*(.+)$/gm, (_, k, v) => {
      meta.push({ k, v: v.trim() });
      return "";
    });
    const factIdx = body.search(/\*\*事實表\*\*|\*\*事实表\*\*/);
    const factEnd = factIdx >= 0 ? body.indexOf("\n\n", factIdx + 12) : -1;
    const facts = factIdx >= 0 ? parseFacts(body.slice(factIdx, factEnd > 0 ? factEnd : undefined)) : [];
    const prose = (body.split("**正文**")[1] || "").split("**最值得看**")[0].trim();
    const best = (body.split("**最值得看**")[1] || "").trim().split(/\r?\n\r?\n/)[0] || "";
    lectures.push({ title, meta, facts, prose, best: best.replace(/\s+/g, " ") });
  }
}

/* ---------- 渲染 ---------- */

const para = (s) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");

const factTable = (rows) =>
  rows.length
    ? `<details class="facts"><summary>事实表 ${rows.length} 行</summary><table><tbody>${rows
        .map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r.slice(1).join(" "))}</td></tr>`)
        .join("")}</tbody></table></details>`
    : "";

const cardStrip = (pics) =>
  pics.length
    ? `<div class="strip">${pics
        .map(
          (p) =>
            `<a class="shot" data-full="${esc(p.href)}"><img src="${esc(p.href)}" alt=""></a>`,
        )
        .join("")}</div>`
    : "";

const renderItem = (it) => `<article class="item" id="${esc(it.slug || it.num)}">
  <div class="head"><span class="no">${esc(it.num)}</span><h3>${esc(it.title)}</h3></div>
  ${cardStrip(it.pics)}
  <div class="cols">
    <section class="post"><h4>X</h4>${para(it.xpost)}${it.link ? `<a class="src" href="${esc(it.link)}" target="_blank" rel="noopener">原始来源</a>` : ""}</section>
    <section class="post"><h4>Threads</h4>${para(it.threads)}${it.tags.length ? `<p class="tags">${it.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}</section>
  </div>
  ${factTable(it.facts)}
</article>`;

const renderLecture = (l) => `<article class="lect">
  <h3>${esc(l.title)}</h3>
  ${l.meta.length ? `<dl class="meta">${l.meta.map((m) => `<dt>${esc(m.k)}</dt><dd>${esc(m.v)}</dd>`).join("")}</dl>` : ""}
  <div class="prose">${para(l.prose)}</div>
  ${factTable(l.facts)}
  ${l.best ? `<p class="best"><strong>最值得看</strong> ${esc(l.best)}</p>` : ""}
</article>`;

const CSS = `
:root{--ink:#121118;--ink2:#4A4659;--mute:#8E88A0;--paper:#F7F4EE;--paper2:#FFFFFF;
  --line:#E2DCD0;--accent:#5B3FD1;--accent2:#B7AEDB;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  line-height:1.75;font-size:16px;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
code{font:inherit;background:#ECE6DA;padding:.1em .35em;border-radius:3px}
.top{display:flex;align-items:baseline;gap:14px;padding:22px clamp(18px,5vw,64px);
  border-bottom:1px solid var(--line)}
.brand{font-weight:700;letter-spacing:-.02em;font-size:19px}
.tag{color:var(--mute);font-size:13px}
main{padding:0 clamp(18px,5vw,64px) 80px;max-width:1280px;margin:0 auto}
.hero{padding:clamp(44px,7vw,88px) 0 48px;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(30px,5.2vw,54px);line-height:1.14;letter-spacing:-.03em;margin:0 0 18px;font-weight:700}
.lede{color:var(--ink2);font-size:clamp(15px,1.6vw,18px);max-width:56ch;margin:0 0 14px}
.stat{color:var(--accent);font-size:14px;font-weight:600;margin:0}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 8px}
.jump a{font-size:13px;color:var(--ink2);border:1px solid var(--line);border-radius:99px;
  padding:5px 13px;background:var(--paper2)}
.item{padding:44px 0;border-bottom:1px solid var(--line)}
.item .head{display:flex;gap:12px;align-items:baseline;margin-bottom:20px}
.no{color:var(--accent);font-size:20px;font-weight:700}
.item h3{margin:0;font-size:clamp(21px,2.6vw,29px);letter-spacing:-.02em;line-height:1.35;font-weight:700}
.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(10px,1.6vw,18px);margin-bottom:26px}
.shot{display:block;border-radius:5px;overflow:hidden;border:1px solid var(--line);background:#fff;cursor:zoom-in}
.shot img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:clamp(18px,3vw,44px)}
.post h4{margin:0 0 10px;font-size:11px;letter-spacing:.16em;color:var(--mute);font-weight:700;text-transform:uppercase}
.post p{margin:0 0 .9em;font-size:15.5px}
.src{display:inline-block;margin-top:6px;font-size:13px;color:var(--accent);font-weight:600}
.tags{color:var(--accent);font-size:13px;font-weight:600}
.facts{margin-top:22px;border-top:1px solid var(--line);padding-top:14px}
.facts summary{cursor:pointer;font-size:12.5px;color:var(--mute);list-style:none;user-select:none}
.facts summary::-webkit-details-marker{display:none}
.facts summary::before{content:"▸ ";color:var(--accent)}
.facts[open] summary::before{content:"▾ "}
.facts table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13.5px}
.facts th{text-align:left;vertical-align:top;white-space:nowrap;color:var(--mute);font-weight:600;padding:7px 18px 7px 0;width:1%}
.facts td{padding:7px 0;border-bottom:1px solid var(--line);color:var(--ink2)}
.lects{padding-top:20px}
.lects>h2{font-size:15px;letter-spacing:.12em;color:var(--mute);font-weight:600;margin:44px 0 8px}
.lect{padding:36px 0;border-bottom:1px solid var(--line);max-width:70ch}
.lect h3{font-size:clamp(19px,2.2vw,24px);margin:0 0 16px;letter-spacing:-.02em;font-weight:700}
.meta{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0 0 22px;font-size:13px}
.meta dt{color:var(--mute);font-weight:600;white-space:nowrap}
.meta dd{margin:0;color:var(--ink2)}
.prose p{margin:0 0 1em;font-size:16px}
.best{margin-top:18px;padding:14px 16px;background:#EFEAFD;border-left:3px solid var(--accent);font-size:14px;color:var(--ink2)}
.best strong{color:var(--accent)}
.foot{padding:44px clamp(18px,5vw,64px);border-top:1px solid var(--line);color:var(--mute);font-size:13px;max-width:1280px;margin:0 auto}
.foot p{margin:0}
.lightbox{position:fixed;inset:0;background:rgba(12,10,20,.94);display:flex;align-items:center;justify-content:center;z-index:99;cursor:zoom-out;padding:3vh 3vw}
.lightbox[hidden]{display:none}
.lightbox img{max-width:100%;max-height:94vh;border-radius:6px}
@media (max-width:820px){.cols{grid-template-columns:1fr}.strip{grid-template-columns:1fr}}
`;

const body = `<main class="daypage">
  <section class="hero">
    <h1>${esc(date)}</h1>
    <p class="lede">每天六条，每条三张卡。一个人加一套脚本，把当天的 AI 新闻做成能发的图文。</p>
    <p class="stat">${items.length} 条 · ${items.reduce((a, x) => a + x.pics.length, 0)} 张卡 · ${lectures.length} 篇讲解</p>
  </section>
  <nav class="jump">${items.map((it) => `<a href="#${esc(it.slug || it.num)}">${esc(it.num)} ${esc(it.title)}</a>`).join("")}</nav>
  ${items.map(renderItem).join("")}
  ${lectures.length ? `<section class="lects"><h2>讲解</h2>${lectures.map(renderLecture).join("")}</section>` : ""}
</main>`;

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(date)} · EveryNews</title>
<meta name="description" content="每天六条，每条三张卡。当天的 AI 新闻，做成能发的图文。">
<style>${CSS}</style>
</head>
<body>
<header class="top"><span class="brand">EveryNews</span><span class="tag">每天六条 · 每条三张卡 · ${esc(date)}</span></header>
${body}
<footer class="foot"><p>卡片由 工具/render.mjs 生成，文案经 工具/review.py 闸门校验。单文件自包含，图片已内联。</p></footer>
<div class="lightbox" id="lb" hidden><img alt=""></div>
<script>
document.addEventListener('click',(e)=>{const a=e.target.closest('.shot');const lb=document.getElementById('lb');
if(a){e.preventDefault();lb.querySelector('img').src=a.dataset.full;lb.hidden=false;}
else if(!lb.hidden){lb.hidden=true;}});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')document.getElementById('lb').hidden=true;});
</script>
</body>
</html>`;

const stamp = date.replace(/-/g, "");
const out = path.join(WS, `EveryNews_${stamp}.html`);
fs.writeFileSync(out, html, "utf8");
const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`✅ ${path.relative(WS, out)}　${items.length} 条 · ${items.reduce((a, x) => a + x.pics.length, 0)} 张卡 · ${size} MB`);
