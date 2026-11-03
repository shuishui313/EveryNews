#!/usr/bin/env node
/**
 * 维护「选题台账.md」：只记选题，供后续选题去重。
 * 用法: node ledger.mjs 2026-10-28 eth simulmt ...
 * 规则: 以 slug 为唯一键，已存在则更新该行，不存在则追加；按日期排序。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(TOOL, "..");
const LEDGER = path.join(WS, "选题台账.md");
const [date, ...slugs] = process.argv.slice(2);
if (!date || !slugs.length) {
  console.error("用法: node ledger.mjs <YYYY-MM-DD> <slug...>");
  process.exit(1);
}

const HEAD = `# 选题台账（去重用）

> 只保留选题本身：日期 / slug / 标题 / 一句话 / 来源 / 首图。图、文案、代码都不进这张表。
> 新选题动笔前先在这里比对，标题或核心事实撞车的，换角度、换落点或直接换题。

| 日期 | slug | 选题 | 一句话 | 来源 | 首图 |
|---|---|---|---|---|---|`;

const cell = (s) => (s == null ? "" : String(s)).replace(/\|/g, "｜").replace(/\n/g, " ");

// 读旧表
const rows = new Map();
if (fs.existsSync(LEDGER)) {
  for (const line of fs.readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cols = line.split("|").map((c) => c.trim());
    // cols[0] 为空（行首 |），后续依次是 日期 slug 选题 一句话 来源 首图
    const [, d, slug] = cols;
    if (!d || d === "日期" || !slug) continue;
    rows.set(slug, [d, slug, cols[3] || "", cols[4] || "", cols[5] || "", cols[6] || ""]);
  }
}

// 写入本次条目
for (const slug of slugs) {
  const file = path.join(TOOL, "sets", `${slug}.json`);
  if (!fs.existsSync(file)) {
    console.error(`  ! 跳过台账：找不到 ${file}`);
    continue;
  }
  let j;
  try {
    j = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`  ! 跳过台账：${slug}.json 解析失败（${e.message}）`);
    continue;
  }
  const first = (Array.isArray(j.slides) ? j.slides[0] : null) || {};
  rows.set(slug, [
    j.date || date,
    slug,
    (first.headline || []).join("："),
    first.sub || "",
    j.source || "",
    first.type || "",
  ]);
}

const body = [...rows.values()]
  .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
  .map((r) => `| ${r.map(cell).join(" | ")} |`)
  .join("\n");

fs.writeFileSync(LEDGER, `${HEAD}\n${body}\n`);
console.log(`✅ 选题台账：${rows.size} 条（本次写入 ${slugs.length} 条）`);
