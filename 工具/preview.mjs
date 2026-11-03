#!/usr/bin/env node
/**
 * 生成当天选题的「配图总览」页面。
 * 用法: node preview.mjs 2026-10-28 eth simulmt g1-robot
 * 输出: <工作区>/<日期>/preview.html（配图读同目录 配图/ 下的 NN-slug-MM.png）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(TOOL, "..");
const [date, ...slugs] = process.argv.slice(2);
if (!date || !slugs.length) {
  console.error("用法: node preview.mjs <YYYY-MM-DD> <slug...>");
  process.exit(1);
}

const DAY = path.join(WS, date);
const PIC = path.join(DAY, "配图");
const NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const esc = (s) => (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;");

if (!fs.existsSync(PIC)) {
  console.error(`✗ 找不到 ${PIC}`);
  process.exit(1);
}

const sets = slugs.map((slug, k) => {
  const file = path.join(TOOL, "sets", `${slug}.json`);
  if (!fs.existsSync(file)) {
    console.error(`✗ 找不到 set: ${file}`);
    process.exit(1);
  }
  let j;
  try {
    j = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`✗ ${slug} 的 JSON 解析失败：${e.message}`);
    process.exit(1);
  }
  const slides = Array.isArray(j.slides) ? j.slides : [];
  const first = slides[0] || {};
  const re = new RegExp(`^\\d\\d-${slug.replace(/-/g, "\\-")}-\\d\\d\\.png$`);
  const files = fs.readdirSync(PIC).filter((f) => re.test(f)).sort();
  return {
    n: NUMS[k] || String(k + 1),
    title: (first.headline || []).join("："),
    source: j.source || "",
    date: j.date || "",
    types: slides.map((s) => s.type).join(" / "),
    brief: first.sub || "",
    hasImg: slides.some((s) => s && s.image),
    files,
  };
});

const totalPages = sets.reduce((a, s) => a + s.files.length, 0);
const withImg = sets.filter((s) => s.hasImg).length;
const allTypes = sets.flatMap((s) => s.types.split(" / "));
const coverTypes = sets.map((s) => s.types.split(" / ")[0]);

const cards = sets
  .map(
    (s) => `    <div class="set">
      <h2>${s.n} ${esc(s.title)}</h2>
      <div class="meta">${esc(s.source)} · ${esc(s.date)} · ${esc(s.types)}${s.hasImg ? ' · <b class="img">一手源图</b>' : ' · <span class="noimg">纯卡片</span>'}</div>
      <div class="why">${esc(s.brief)}</div>
      <div class="thumbs">
${s.files.map((f) => `        <a href="配图/${encodeURIComponent(f)}"><img src="配图/${encodeURIComponent(f)}" alt=""></a>`).join("\n")}
      </div>
    </div>`
  )
  .join("\n\n");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${date} · 当天选题配图总览</title>
<style>
  :root{--accent:#5B3FD1;--acctx:#4A2CBE;--paper:#F6F3EC;--ink:#121118;--gray:#6E6A7B}
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--paper);color:var(--ink);font-family:"PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif;padding:56px 32px 72px}
  .wrap{max-width:1240px;margin:0 auto}
  .band{height:12px;background:var(--accent);margin-bottom:34px}
  h1{font-size:44px;letter-spacing:-1.5px;line-height:1.15}
  h1 span{color:var(--acctx)}
  .lede{font-size:17px;color:var(--gray);margin-top:14px;line-height:1.7;max-width:880px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:40px}
  .set{background:#fff;border-top:6px solid var(--accent);padding:20px 20px 22px;box-shadow:0 1px 0 rgba(18,17,24,.08)}
  .set h2{font-size:20px;line-height:1.35;letter-spacing:-.4px}
  .set .meta{font-size:12px;color:#8E88A0;letter-spacing:.4px;margin-top:8px;text-transform:uppercase}
  .set .why{font-size:13.5px;color:var(--gray);line-height:1.65;margin-top:12px;min-height:66px}
  .set .meta .img{color:var(--acctx);font-weight:700}
  .set .meta .noimg{color:#B4AEC2}
  .thumbs{display:flex;gap:8px;margin-top:14px}
  .thumbs a{flex:1;display:block;border:1px solid rgba(18,17,24,.1)}
  .thumbs img{width:100%;display:block}
  footer{margin-top:48px;border-top:2px solid rgba(18,17,24,.15);padding-top:18px;font-size:13px;color:#8E88A0;display:flex;justify-content:space-between}
  footer b{color:var(--acctx)}
</style>
</head>
<body>
<div class="wrap">
  <div class="band"></div>
  <h1>当天选题 · 配图总览 <span>${date}</span></h1>
  <p class="lede">${totalPages} 张 1080×1350 竖版卡，${sets.length} 条选题（${withImg} 条用了一手源图），用到 ${new Set(allTypes).size} 种页型；首图 ${new Set(coverTypes).size} 种版式互不重复。规范见 <code>工具/PROMPT.md</code>，页脚统一 <b>@gsspai</b>。</p>

  <div class="grid">
${cards}
  </div>

  <footer>
    <span>1080 × 1350 · 4:5 · deepviolet · 点击缩略图看原图 · 本日目录：${date}/</span>
    <b>@gsspai</b>
  </footer>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(DAY, "preview.html"), html);
console.log(`✅ 总览页：${date}/preview.html（${totalPages} 张）`);
