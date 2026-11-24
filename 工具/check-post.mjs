#!/usr/bin/env node
/**
 * 文案结构与篇幅校验（配合 everynews-editorial 读报笔记体）：
 *   1. 快讯 3–6 条，单一 **正文**，篇幅 90–280 字（去空白），1–3 段，末尾附一手源 URL
 *   2. 各条起手前两字不撞车，无提示性冒号
 *   3. 讲解类固定 2 篇，每篇 600–950 汉字，带原文/视频链接与「最值得看」位置锚点
 *   4. 若文末附自查表则核对数值一致（不再强制要求 A-3-a 组合分类表）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(ROOT, "..");

const arg = process.argv[2];
let file;
if (arg && (arg.endsWith(".md") || arg.includes("/"))) {
  file = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
} else {
  let date = arg;
  if (!date) {
    const dirs = fs.readdirSync(WS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    date = dirs[dirs.length - 1];
    if (!date) {
      console.error("✗ 工作区里没有 YYYY-MM-DD 目录");
      process.exit(1);
    }
  }
  file = path.join(WS, date, "文案.md");
}

if (!fs.existsSync(file)) {
  console.error(`✗ 找不到文案：${file}`);
  process.exit(1);
}

const text = fs.readFileSync(file, "utf8");
const rel = path.relative(WS, file);

const errors = [];
const warnings = [];
const han = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const hz = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).join("");
const width = (s) => s.replace(/\s/g, "").length;

/* ---------- 1. 提取快讯正文 ---------- */
const secSplit = text.split(/^## /m);
const postSec = secSplit.find((s) => /成稿/.test(s.split(/\r?\n/)[0] || "")) || text;
const re = /\*\*(?:正文|X 主[帖贴])\*\*(?:（([^）]*)）)?\r?\n```\r?\n([\s\S]*?)\r?\n```/g;
const posts = [];
let m;
while ((m = re.exec(postSec))) {
  const [, rawTag, raw] = m;
  const paras = raw
    .split(/\r?\n\s*\r?\n/)
    .map((p) =>
      p
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && l !== "原文" && !/^https?:\/\/\S+$/i.test(l) && !l.startsWith("#"))
        .join("")
    )
    .filter(Boolean);
  const bodyJoined = paras.join("");
  const urlMatch = raw.match(/https?:\/\/\S+/i);
  posts.push({
    tag: rawTag || "",
    paras,
    paraCount: paras.length,
    chars: width(bodyJoined),
    first: paras[0] || "",
    last: paras[paras.length - 1] || "",
    url: urlMatch ? urlMatch[0] : "",
  });
}

if (!posts.length) {
  console.error(`✗ ${rel} 里没找到「**正文**」代码块`);
  process.exit(1);
}
if (posts.length > 1 && (posts.length < 3 || posts.length > 6)) {
  errors.push(`快讯条数为 ${posts.length}，允许范围为 3–6 条`);
}

/* ---------- 2. 逐条检查 ---------- */
posts.forEach((p, i) => {
  const label = `第 ${i + 1} 条`;
  if (p.chars < 90 || p.chars > 280) {
    errors.push(`${label} 正文 ${p.chars} 字，出界（允许 90–280 字）`);
  }
  if (p.paraCount < 1 || p.paraCount > 3) {
    errors.push(`${label} 正文 ${p.paraCount} 段，出界（允许 1–3 段）`);
  }
  const noTime = p.paras.join("\n").replace(/\b\d{1,2}:\d{2}\b/g, "");
  if (/[：:]/.test(noTime)) {
    errors.push(`${label} 正文含冒号`);
  }
  if (!p.url) {
    errors.push(`${label} 代码块末尾缺一手源 URL`);
  }
});

// 起手前两汉字不撞车
const heads = posts.map((p) => hz(p.first).slice(0, 2));
posts.forEach((_, i) => {
  const h = heads[i];
  const dup = heads.indexOf(h);
  if (h.length >= 2 && dup !== -1 && dup !== i) {
    errors.push(`第 ${dup + 1} 与第 ${i + 1} 条都以「${h}」起手，请换一个切入词`);
  }
});

if (/\*\*Threads\*\*\r?\n```/.test(text)) {
  errors.push("出现废弃的「**Threads**」双栏代码块，请合并为单一 **正文**");
}

/* ---------- 3. 讲解类两篇 ---------- */
const simp = (s) =>
  s.replace(/[數開組結構頭點條講類體價後個與區問題]/g, (c) => ({
    數: "数", 開: "开", 組: "组", 結: "结", 構: "构", 頭: "头", 點: "点", 條: "条",
    講: "讲", 類: "类", 體: "体", 價: "价", 後: "后", 個: "个", 與: "与", 區: "区", 問: "问", 題: "题",
  }[c] || c));

const expInfo = [];
const expPart = posts.length > 1 ? simp(text).split(/^## .*讲解.*$/m)[1] : "skip";
if (expPart !== "skip") {
  if (!expPart) {
    errors.push("文案.md 缺少「## 三、講解類 2 篇」章节");
  } else {
    const items = expPart.split(/\n## /)[0].split(/^### /m).slice(1);
    if (items.length !== 2) {
      errors.push(`讲解类当前 ${items.length} 篇，每天固定保留 2 篇`);
    }
    items.forEach((item, k) => {
      const title = item.split(/\r?\n/)[0].trim();
      const tag = `讲解 ${k + 1}（${title.slice(0, 16)}）`;
      if (!/https?:\/\/\S+/.test(item)) errors.push(`${tag} 缺原文或视频链接`);
      const body = (item.split("**正文**")[1] || "").split("**最值得看**")[0] || "";
      if (!body.trim()) {
        errors.push(`${tag} 缺「**正文**」段落`);
        return;
      }
      const n = han(body);
      if (n < 600 || n > 950) {
        errors.push(`${tag} 正文 ${n} 个汉字，出界（允许 600–950 汉字）`);
      }
      const paras = body.split(/\r?\n/).filter((l) => l.trim()).length;
      if (paras < 4) warnings.push(`${tag} 只有 ${paras} 段，确认展开是否充分`);
      if (!/\*\*最值得看\*\*\s*\S+/.test(item)) {
        errors.push(`${tag} 缺「**最值得看**」位置锚点`);
      }
      expInfo.push({ n, paras });
    });
  }
}

/* ---------- 4. 可选自查表对齐 ---------- */
const checkSec = simp(text).split(/^## .*自查.*$/m)[1] || "";
if (checkSec) {
  const cell = (line) => line.split("|").slice(2, -1).map((c) => c.trim());
  const hitRow = (name) => {
    const line = checkSec.split(/\r?\n/).find((l) => l.startsWith(`| ${name} `) || l.startsWith(`| ${name} |`));
    return line ? cell(line) : null;
  };
  const charRow = hitRow("正文字数");
  if (charRow && charRow.length === posts.length) {
    charRow.forEach((g, i) => {
      if (g !== String(posts[i].chars)) {
        errors.push(`自查表「正文字数」第 ${i + 1} 列写 ${g}，实测为 ${posts[i].chars}`);
      }
    });
  }
  const paraRow = hitRow("正文段数");
  if (paraRow && paraRow.length === posts.length) {
    paraRow.forEach((g, i) => {
      if (g !== String(posts[i].paraCount)) {
        errors.push(`自查表「正文段数」第 ${i + 1} 列写 ${g}，实测为 ${posts[i].paraCount}`);
      }
    });
  }
}

/* ---------- 5. 报告 ---------- */
console.log(`\n${rel}　${posts.length} 条快讯\n`);
posts.forEach((p, i) => {
  console.log(
    `${String(i + 1).padStart(2, "0")}  ${String(p.chars).padStart(3)} 字 ｜ ${p.paraCount} 段 ｜ ${p.first.slice(0, 28)}…`,
  );
});
if (expInfo.length) {
  console.log(`\n讲解 ${expInfo.length} 篇　${expInfo.map((x) => `${x.n} 汉字 / ${x.paras} 段`).join("　")}`);
}

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
console.log("\n✅ 文案结构与篇幅自查通过\n");
