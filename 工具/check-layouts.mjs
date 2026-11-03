#!/usr/bin/env node
/**
 * 版式查重 + 图源查漏：拦住「六条首图撞车」「页型扎堆」和「一条一手源图都没用」。
 *
 * 用法：
 *   node 工具/check-layouts.mjs slug1 slug2 slug3 slug4 slug5 slug6
 *   node 工具/check-layouts.mjs                    # 只查今天改过的 set
 *   node 工具/check-layouts.mjs a b c --strict     # 同一页型全批只许出现 1 次
 *   node 工具/check-layouts.mjs a b c --allow-card-only   # 授权全批纯卡片（当天确实没图）
 *
 * 规则：
 *   1. 6 套的首图页型必须互不相同（硬失败）
 *   2. 同一页型全批最多 2 次，--strict 时最多 1 次
 *   3. 单套内部页型不许重复
 *   4. 首图建议取自首图池（不取自池里只提醒，不失败）
 *   5. 带图页（photo-* / shot / cover-img-*）缺 image、图片文件不存在、shot 缺 caption/credit，都是硬失败
 *   6. 全批一条带图页都没有，且没有 noImageReason，硬失败（--allow-card-only 可放行）
 *   7. 有图的不到一半，只提醒
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SETS = path.join(ROOT, "sets");

// 从 render.mjs 里抽出真实支持的页型，set 里写错名字会渲染成空白且不报错
const RENDER_FILE = path.join(ROOT, "render.mjs");
const KNOWN_TYPES = new Set(
  fs.existsSync(RENDER_FILE)
    ? [...fs.readFileSync(RENDER_FILE, "utf8").matchAll(/^  "?([a-z][a-z0-9-]*)"?:\s*\(s,\s*i\)/gm)].map((m) => m[1])
    : []
);
const argv = process.argv.slice(2);
const strict = argv.includes("--strict");
const allowCardOnly = argv.includes("--allow-card-only");
const names = argv.filter((a) => !a.startsWith("-"));

// 都能当首图，且彼此视觉差异足够大
const COVERS = ["cover", "cover-split", "cover-min", "bigfact", "quote", "overlap", "mosaic", "statement", "matrix", "ledger", "kpi", "cover-img-top", "cover-img-side", "photo-cover", "photo-annot", "photo-split"];

// 这些页型离了图就不成立
const NEED_IMAGE = ["photo-cover", "photo-annot", "photo-split", "shot", "cover-img-top", "cover-img-side"];

const today = new Date().toDateString();
const touchedToday = (f) => {
  try {
    return new Date(fs.statSync(f).mtime).toDateString() === today;
  } catch {
    return false;
  }
};

const toFile = (n) => (n.endsWith(".json") ? n : `${n}.json`);

let files = names.length
  ? names.map(toFile)
  : fs.existsSync(SETS)
    ? fs.readdirSync(SETS).filter((f) => f.endsWith(".json") && !f.startsWith("_") && touchedToday(path.join(SETS, f)))
    : [];

if (!files.length) {
  console.error("✗ 没有要检查的 set。传参：node 工具/check-layouts.mjs ant-ipo kimi-31 ...");
  process.exit(1);
}

const rows = [];
const errors = [];
const warnings = [];

const imgExists = (p) => {
  if (/^(https?:|data:)/i.test(p)) return true; // 远程图交给渲染阶段，这里只查本地
  return fs.existsSync(path.isAbsolute(p) ? p : path.join(ROOT, p));
};

for (const f of files) {
  const p = path.join(SETS, f);
  const slug = f.replace(/\.json$/, "");
  if (!fs.existsSync(p)) {
    errors.push(`找不到 ${f}`);
    continue;
  }

  let d;
  try {
    d = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    errors.push(`${slug} 的 JSON 解析失败：${e.message}`);
    continue;
  }
  if (!d || typeof d !== "object") {
    errors.push(`${slug} 的 JSON 不是一个对象`);
    continue;
  }
  if (!Array.isArray(d.slides)) {
    errors.push(`${slug} 缺 slides 数组`);
    continue;
  }

  const slides = d.slides;
  const types = slides.map((s) => (s && s.type) || "");
  const withImg = slides.filter((s) => s && typeof s.image === "string" && s.image.trim());
  rows.push({ slug, types, hasImg: withImg.length > 0, reason: d.noImageReason || "" });

  if (!types.length) {
    errors.push(`${slug} 没有 slides`);
    continue;
  }
  if (types.length !== 3) warnings.push(`${slug} 有 ${types.length} 页（常规 3 页一套，1–5 页都允许）`);
  if (new Set(types).size !== types.length) errors.push(`${slug} 套内页型重复：${types.join(" / ")}`);

  slides.forEach((s, i) => {
    const t = s && s.type;
    const page = `${slug} P${i + 1}${t ? `(${t})` : ""}`;
    if (!t) {
      errors.push(`${page} 缺 type`);
      return;
    }
    if (KNOWN_TYPES.size && !KNOWN_TYPES.has(t)) {
      errors.push(`${page} 页型 render.mjs 里没有，会渲染成空白。可用：${[...KNOWN_TYPES].join(" ")}`);
      return;
    }
    if (NEED_IMAGE.includes(t)) {
      if (!s.image) errors.push(`${page} 是带图页型，但没有 image，会退成空框`);
      else if (!imgExists(s.image)) errors.push(`${page} 的图片不存在：${s.image}`);
    }
    if (t === "shot") {
      if (!s.caption) errors.push(`${page} shot 缺 caption（图下一行说明）`);
      if (!s.credit) errors.push(`${page} shot 缺 credit（来源域名）`);
    }
  });

  if (!withImg.length && !d.noImageReason) {
    warnings.push(`${slug} 全是纯卡片，也没写 noImageReason`);
  }
}

// 1) 首图查重
const seenCover = new Map();
for (const r of rows) {
  const t = r.types[0];
  if (!t) continue;
  if (seenCover.has(t)) errors.push(`首图撞车：${seenCover.get(t)} 与 ${r.slug} 都是 ${t}`);
  else seenCover.set(t, r.slug);
  if (!COVERS.includes(t)) warnings.push(`${r.slug} 首图用了 ${t}，不在推荐首图池里`);
}

// 2) 页型频次
const freq = new Map();
rows.forEach((r) => r.types.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
const limit = strict ? 1 : 2;
for (const [t, n] of freq) {
  if (n > limit) errors.push(`页型 ${t} 出现 ${n} 次，上限 ${limit}${strict ? "（--strict）" : ""}`);
}

// 3) 图源覆盖率
const withImgRows = rows.filter((r) => r.hasImg);
const noReason = rows.filter((r) => !r.hasImg && !r.reason).length;
if (rows.length && !withImgRows.length && !allowCardOnly) {
  errors.push(
    `${rows.length} 套里一条带图页都没有：先回一手源找图（工具/img/），确实没有就写 noImageReason，或加 --allow-card-only 授权`,
  );
}
if (withImgRows.length && withImgRows.length * 2 < rows.length) {
  warnings.push(`只有 ${withImgRows.length}/${rows.length} 套用到一手源图，图源覆盖率偏低`);
}

// 报告
const w = Math.max(6, ...rows.map((r) => r.slug.length));
const cols = Math.max(3, ...rows.map((r) => r.types.length));
console.log(`\n${rows.length} 套 / ${rows.reduce((a, r) => a + r.types.length, 0)} 页 / 带图 ${withImgRows.length} 套${noReason ? ` / 无图未写理由 ${noReason} 套` : ""}\n`);
console.log("slug".padEnd(w) + "  图  " + Array.from({ length: cols }, (_, i) => `P${i + 1}`.padEnd(15)).join(""));
for (const r of rows) {
  const mark = r.hasImg ? "●" : r.reason ? "○" : "—";
  console.log(r.slug.padEnd(w) + `  ${mark}   ` + r.types.map((t) => t.padEnd(15)).join(""));
}
console.log(`\n页型使用：${[...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}×${n}`).join("  ")}`);
console.log(`不同页型：${new Set(rows.flatMap((r) => r.types)).size} 种 / ${rows.reduce((a, r) => a + r.types.length, 0)} 页`);

if (warnings.length) {
  console.log("\n提醒：");
  warnings.forEach((x) => console.log(`  · ${x}`));
}
if (errors.length) {
  console.log("\n✗ 不通过：");
  errors.forEach((x) => console.log(`  · ${x}`));
  console.log("");
  process.exit(1);
}
console.log("\n✅ 版式与图源检查通过\n");
