#!/usr/bin/env node
/**
 * 维护「选题台账.md」：只记选题，供后续选题去重。
 *
 * 用法:
 *   node 工具/ledger.mjs <YYYY-MM-DD>      # 从 <日期>/文案.md 提取当日条目写入台账
 *   node 工具/ledger.mjs --backfill        # 扫描根目录 <YYYYMMDD>.html 补齐缺失日期
 *
 * 规则: 以「日期 + 标识」或历史 slug 为键去重，按日期排序。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(TOOL, "..");
const LEDGER = path.join(WS, "选题台账.md");

const arg = process.argv[2];
if (!arg) {
  console.error("用法: node 工具/ledger.mjs <YYYY-MM-DD> | --backfill");
  process.exit(1);
}

const HEAD = `# 选题台账（去重用）

> 只保留选题本身：日期 / 标识 / 选题 / 一句话 / 来源。文案与页面都不进这张表。
> 新选题动笔前先在这里比对，标题或核心事实撞车的，换角度、换落点或直接换题。

| 日期 | 标识 | 选题 | 一句话 | 来源 |
|---|---|---|---|---|`;

const cell = (s) => (s == null ? "" : String(s)).replace(/\|/g, "｜").replace(/\s+/g, " ").trim();
const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const fmtDate = (d) => d.replace(/-/g, ".");

function readLedger() {
  const rows = new Map();
  if (!fs.existsSync(LEDGER)) return rows;
  for (const line of fs.readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cols = line.split("|").map((c) => c.trim());
    const [, d, id, title, summary, source] = cols;
    if (!d || d === "日期" || !id) continue;
    const key = `${d}|${id}`;
    rows.set(key, [d, id, title || "", summary || "", source || ""]);
  }
  return rows;
}

function writeLedger(rows) {
  const body = [...rows.values()]
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    .map((r) => `| ${r.map(cell).join(" | ")} |`)
    .join("\n");
  fs.writeFileSync(LEDGER, `${HEAD}\n${body}\n`, "utf8");
}

function parseFromMarkdown(date) {
  const mdPath = path.join(WS, date, "文案.md");
  if (!fs.existsSync(mdPath)) {
    console.error(`✗ 找不到 ${date}/文案.md`);
    process.exit(1);
  }
  const md = fs.readFileSync(mdPath, "utf8");
  const sec = {};
  for (const chunk of md.split(/^## /m).slice(1)) {
    const head = chunk.split(/\r?\n/)[0].trim();
    sec[head] = chunk.split(/\r?\n/).slice(1).join("\n");
  }
  const keyPost = Object.keys(sec).find((k) => /成稿/.test(k));
  if (!keyPost) return [];
  const dDot = fmtDate(date);
  const out = [];
  sec[keyPost].split(/^### /m).slice(1).forEach((chunk, i) => {
    const lines = chunk.split(/\r?\n/);
    const title = lines[0].trim().replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "");
    const body = lines.slice(1).join("\n");
    const block = (body.match(/```\r?\n([\s\S]*?)```/) || ["", ""])[1].trim();
    const postLines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^https?:\/\//i.test(l) && !l.startsWith("#"));
    const firstLine = postLines[0] || "";
    const urlMatch = block.match(/https?:\/\/\S+/);
    let source = "";
    const srcRow = body.match(/^\|\s*(?:來源|来源|主體|主体)\s*\|\s*([^|\n]+)/m);
    if (srcRow) source = srcRow[1].trim();
    if (!source && urlMatch) {
      try {
        source = new URL(urlMatch[0]).hostname.replace(/^www\./, "");
      } catch {
        source = urlMatch[0];
      }
    }
    const id = `${date.slice(5)}-${String(i + 1).padStart(2, "0")}`;
    out.push([dDot, id, title, firstLine, source]);
  });
  return out;
}

function parseFromHtml(htmlFile) {
  const stamp = htmlFile.slice(0, 8);
  const dDot = `${stamp.slice(0, 4)}.${stamp.slice(4, 6)}.${stamp.slice(6, 8)}`;
  const html = fs.readFileSync(path.join(WS, htmlFile), "utf8");
  const out = [];
  const artRe = /<article class="item" id="([^"]*)">([\s\S]*?)<\/article>/g;
  let m;
  let idx = 0;
  while ((m = artRe.exec(html))) {
    idx++;
    const rawId = m[1] || `${stamp.slice(4, 6)}-${stamp.slice(6, 8)}-${String(idx).padStart(2, "0")}`;
    const inner = m[2];
    const title = stripHtml((inner.match(/<h3>([\s\S]*?)<\/h3>/) || ["", ""])[1]);
    const firstP = stripHtml((inner.match(/<p>([\s\S]*?)<\/p>/) || ["", ""])[1]);
    const href = (inner.match(/class="src" href="([^"]+)"/) || ["", ""])[1];
    let source = "";
    const host = (() => {
      try {
        return href ? new URL(href).hostname.replace(/^www\./, "") : "";
      } catch {
        return "";
      }
    })();
    const subj = inner.match(/<th>(?:主體|主体)<\/th><td>([\s\S]*?)<\/td>/);
    source = [subj ? stripHtml(subj[1]) : "", host].filter(Boolean).join(" · ");
    out.push([dDot, rawId, title, firstP, source]);
  }
  return out;
}

const rows = readLedger();
let added = 0;

if (arg === "--backfill") {
  const existingDates = new Set([...rows.values()].map((r) => r[0]));
  const htmlFiles = fs.readdirSync(WS).filter((f) => /^\d{8}\.html$/.test(f)).sort();
  for (const f of htmlFiles) {
    const dDot = `${f.slice(0, 4)}.${f.slice(4, 6)}.${f.slice(6, 8)}`;
    if (existingDates.has(dDot)) continue;
    for (const r of parseFromHtml(f)) {
      rows.set(`${r[0]}|${r[1]}`, r);
      added++;
    }
  }
  writeLedger(rows);
  console.log(`✅ 选题台账回填完成：共 ${rows.size} 条（新增 ${added} 条）`);
} else {
  const date = arg;
  const dDot = fmtDate(date);
  // 清理同日期旧记录，避免改标题/序号后残留重复行
  for (const [k, v] of [...rows.entries()]) {
    if (v[0] === dDot) rows.delete(k);
  }
  const items = parseFromMarkdown(date);
  for (const r of items) {
    rows.set(`${r[0]}|${r[1]}`, r);
    added++;
  }
  writeLedger(rows);
  console.log(`✅ 选题台账：共 ${rows.size} 条（本次写入 ${date} 共 ${added} 条）`);
}
