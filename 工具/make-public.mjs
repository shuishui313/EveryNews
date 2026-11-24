#!/usr/bin/env node
/**
 * 把当天产出生成轻量静态页 <YYYYMMDD>.html，并将 <日期>/配图/ 自动转码为外置 WebP（cards/<YYYYMMDD>/*.webp）。
 * - HTML 本体保持在 ~24 KB，外置 WebP 比旧双份 Base64 PNG 小约 90%
 * - 支持每条 1–3 张弹性配图与 16:9 横版画框卡片自适应排版
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
        im.save(out_path, "WEBP", quality=84, method=6)
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
    const factHref = factSrc ? (factSrc.slice(1).join(" ").match(/https?:\/\/\S+/) || [""])[0] : "";
    const numKey = String(i + 1).padStart(2, "0");
    const pics = groups.get(numKey) || [];
    items.push({
      id: (pics[0] && pics[0].slug) || `item-${numKey}`,
      num: NUMS[i] || String(i + 1),
      title,
      facts,
      text: main.text,
      link: main.href || factHref,
      pics,
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
    body = body.replace(/^- (原文|影片|視頻|视频|判據|判据|局面)\s*(.+)$/gm, (_, k, v) => {
      meta.push({ k, v: v.trim() });
      return "";
    });
    const factIdx = body.search(/\*\*事實表\*\*|\*\*事实表\*\*/);
    const factEnd = factIdx >= 0 ? body.indexOf("\n\n", factIdx + 12) : -1;
    const facts = factIdx >= 0 ? parseFacts(body.slice(factIdx, factEnd > 0 ? factEnd : undefined)) : [];
    const prose = (body.split("**正文**")[1] || "").split("**最值得看**")[0].trim();
    const best = (body.split("**最值得看**")[1] || "").trim().split(/\r?\n\r?\n/)[0] || "";
    lectures.push({
      id: `lect-${String(lectures.length + 1).padStart(2, "0")}`,
      title,
      meta,
      facts,
      prose,
      best: best.replace(/\s+/g, " "),
    });
  }
}

/* ---------- 渲染 ---------- */
const para = (s) =>
  s
    .split(/\r?\n\s*\r?\n|\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");

const linkify = (s) =>
  esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a class="inline-url" href="${u}" target="_blank" rel="noopener">${u}</a>`);

const factTable = (rows) =>
  rows.length
    ? `<details class="facts"><summary>事實表 ${rows.length} 行</summary><table><tbody>${rows
        .map((r) => `<tr><th>${esc(r[0])}</th><td>${linkify(r.slice(1).join(" "))}</td></tr>`)
        .join("")}</tbody></table></details>`
    : "";

const cardStrip = (pics) => {
  if (!pics.length) return "";
  const countCls = `strip-${Math.min(pics.length, 3)}`;
  return `<div class="strip ${countCls}">${pics
    .map(
      (p) =>
        `<a class="shot${p.wide ? " wide" : ""}"><img src="${esc(p.href)}" alt="" loading="lazy" decoding="async"></a>`
    )
    .join("")}</div>`;
};

const renderItem = (it) => `<article class="item" id="${esc(it.id)}">
  <div class="head"><span class="no">${esc(it.num)}</span><h3>${esc(it.title)}</h3></div>
  ${cardStrip(it.pics)}
  <div class="post">${para(it.text)}${it.link ? `<a class="src" href="${esc(it.link)}" target="_blank" rel="noopener">原始來源 ↗</a>` : ""}</div>
  ${factTable(it.facts)}
</article>`;

const renderLecture = (l) => `<article class="lect" id="${esc(l.id)}">
  <h3>${esc(l.title)}</h3>
  ${l.meta.length ? `<dl class="meta">${l.meta.map((m) => `<dt>${esc(m.k)}</dt><dd>${linkify(m.v)}</dd>`).join("")}</dl>` : ""}
  <div class="prose">${para(l.prose)}</div>
  ${factTable(l.facts)}
  ${l.best ? `<p class="best"><strong>最值得看</strong> ${esc(l.best)}</p>` : ""}
</article>`;

const totalPics = items.reduce((a, x) => a + x.pics.length, 0);

const CSS = `
:root{--ink:#121118;--ink2:#4A4659;--mute:#8E88A0;--paper:#F7F4EE;--paper2:#FFFFFF;
  --line:#E2DCD0;--accent:#5B3FD1;--soft:#EFEAFD;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  line-height:1.82;font-size:16px;-webkit-font-smoothing:antialiased;line-break:strict}
a{color:inherit;text-decoration:none}
code{font:inherit;background:#ECE6DA;padding:.1em .35em;border-radius:3px}
.top{display:flex;align-items:baseline;gap:14px;padding:20px clamp(18px,5vw,64px);
  border-bottom:1px solid var(--line)}
.brand{font-weight:700;letter-spacing:-.02em;font-size:19px}
.tag{color:var(--mute);font-size:13px}
main{padding:0 clamp(18px,5vw,64px) 80px;max-width:${totalPics ? "1120px" : "860px"};margin:0 auto}
.hero{padding:clamp(36px,6vw,72px) 0 38px;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(30px,5vw,50px);line-height:1.14;letter-spacing:-.03em;margin:0 0 14px;font-weight:700}
.lede{color:var(--ink2);font-size:clamp(15px,1.6vw,17.5px);margin:0 0 12px}
.stat{color:var(--accent);font-size:14px;font-weight:600;margin:0}
.jump{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0 6px}
.jump a{font-size:13px;color:var(--ink2);border:1px solid var(--line);border-radius:99px;
  padding:5px 13px;background:var(--paper2);transition:border-color .15s,color .15s}
.jump a:hover{border-color:var(--accent);color:var(--accent)}
.item{padding:42px 0;border-bottom:1px solid var(--line)}
.item .head{display:flex;gap:12px;align-items:baseline;margin-bottom:18px}
.no{color:var(--accent);font-size:20px;font-weight:700;flex:none}
.item h3{margin:0;font-size:clamp(20px,2.4vw,27px);letter-spacing:-.02em;line-height:1.35;font-weight:700}
.strip{display:grid;gap:clamp(10px,1.6vw,18px);margin-bottom:24px}
.strip-1{grid-template-columns:minmax(0,420px)}
.strip-2{grid-template-columns:repeat(2,minmax(0,380px))}
.strip-3{grid-template-columns:repeat(3,1fr)}
.shot{display:block;border-radius:5px;overflow:hidden;border:1px solid var(--line);background:#fff;cursor:zoom-in}
.shot img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}
.shot.wide{grid-column:span 2}
.shot.wide img{aspect-ratio:16/9;object-fit:contain}
.strip-1 .shot.wide{grid-column:span 1;max-width:680px}
.post{max-width:74ch}
.post p{margin:0 0 .95em;font-size:16.5px;color:var(--ink)}
.src{display:inline-block;margin-top:4px;font-size:13.5px;color:var(--accent);font-weight:600}
.src:hover,.inline-url:hover{text-decoration:underline}
.inline-url{color:var(--accent);word-break:break-all}
.facts{margin-top:18px;border-top:1px solid var(--line);padding-top:12px}
.facts summary{cursor:pointer;font-size:12.5px;color:var(--mute);list-style:none;user-select:none}
.facts summary::-webkit-details-marker{display:none}
.facts summary::before{content:"▸ ";color:var(--accent)}
.facts[open] summary::before{content:"▾ "}
.facts table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13.5px}
.facts th{text-align:left;vertical-align:top;white-space:nowrap;color:var(--mute);font-weight:600;padding:7px 18px 7px 0;width:1%}
.facts td{padding:7px 0;border-bottom:1px solid var(--line);color:var(--ink2);overflow-wrap:anywhere}
.lects{padding-top:16px;max-width:76ch}
.lects>h2{font-size:14px;letter-spacing:.14em;color:var(--mute);font-weight:700;margin:40px 0 4px}
.lect{padding:32px 0;border-bottom:1px solid var(--line)}
.lect h3{font-size:clamp(19px,2.2vw,24px);margin:0 0 14px;letter-spacing:-.02em;font-weight:700}
.meta{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 16px;margin:0 0 20px;font-size:13px}
.meta dt{color:var(--mute);font-weight:600;white-space:nowrap}
.meta dd{margin:0;min-width:0;color:var(--ink2);overflow-wrap:anywhere}
.prose p{margin:0 0 1em;font-size:16px}
.best{margin-top:18px;padding:14px 16px;background:var(--soft);border-left:3px solid var(--accent);font-size:14px;color:var(--ink2)}
.best strong{color:var(--accent)}
.foot{padding:36px clamp(18px,5vw,64px);border-top:1px solid var(--line);color:var(--mute);font-size:13px;max-width:${totalPics ? "1120px" : "860px"};margin:0 auto}
.foot p{margin:0}
.lightbox{position:fixed;inset:0;background:rgba(12,10,20,.94);display:flex;align-items:center;justify-content:center;z-index:99;cursor:zoom-out;padding:3vh 3vw}
.lightbox[hidden]{display:none}
.lightbox img{max-width:100%;max-height:94vh;border-radius:6px}
@media (max-width:820px){.strip-2,.strip-3{grid-template-columns:1fr}.shot.wide{grid-column:span 1}}
`;

const statLine = totalPics
  ? `${items.length} 條快訊 · ${totalPics} 張配圖 · ${lectures.length} 篇講解`
  : `${items.length} 條快訊 · ${lectures.length} 篇講解`;

const body = `<main class="daypage">
  <section class="hero">
    <h1>${esc(date)}</h1>
    <p class="lede">每日精選 AI 一手消息與兩篇長文講解，讀報筆記體行文，逐條附配圖、事實表與原始來源。</p>
    <p class="stat">${statLine}</p>
  </section>
  <nav class="jump">${items.map((it) => `<a href="#${esc(it.id)}">${esc(it.num)} ${esc(it.title)}</a>`).join("")}</nav>
  ${items.map(renderItem).join("")}
  ${lectures.length ? `<section class="lects"><h2>長文講解</h2>${lectures.map(renderLecture).join("")}</section>` : ""}
</main>`;

const lbHtml = totalPics
  ? `<div class="lightbox" id="lb" hidden><img alt=""></div>
<script>
document.addEventListener('click',(e)=>{const a=e.target.closest('.shot');const lb=document.getElementById('lb');
if(a){e.preventDefault();const img=a.querySelector('img');if(img){lb.querySelector('img').src=img.src;lb.hidden=false;}}
else if(!lb.hidden){lb.hidden=true;}});
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')document.getElementById('lb').hidden=true;});
</script>`
  : "";

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(date)} · EveryNews</title>
<meta name="description" content="每日精選 AI 一手消息與兩篇長文講解，逐條附配圖、事實表與原始來源。">
<style>${CSS}</style>
</head>
<body>
<header class="top"><span class="brand">EveryNews</span><span class="tag">每日 AI 讀報筆記 · ${esc(date)}</span></header>
${body}
<footer class="foot"><p>文稿依 everynews-editorial 規範撰寫並經閘門校驗。${totalPics ? `配圖已轉碼為外置 WebP（cards/${stamp}/）。` : "純靜態單頁。"}</p></footer>
${lbHtml}
</body>
</html>`;

const out = path.join(WS, `${stamp}.html`);
fs.writeFileSync(out, html, "utf8");
const htmlKb = (fs.statSync(out).size / 1024).toFixed(1);
const webpKb = (webpTotalBytes / 1024).toFixed(0);
console.log(
  `✅ ${path.relative(WS, out)}（${htmlKb} KB）　${items.length} 条快讯 · ${totalPics} 张 WebP 配图（共 ${webpKb} KB）· ${lectures.length} 篇讲解`
);
