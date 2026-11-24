#!/usr/bin/env node
/**
 * 写稿顺序与读报笔记体自检（配合 everynews-editorial 规范）。
 *
 * 用法：
 *   node 工具/check-voice.mjs <日期>                  # 完整闸门，含立意稿顺序
 *   node 工具/check-voice.mjs <日期> --voice-only     # 只查文本模具，用于回看
 *   node 工具/check-voice.mjs <文案.md 路径>          # 直接指定文件
 *
 * 查三件事：
 *   1. 立意稿 工具/立意/<日期>.md 先于 文案.md 落盘，条数一致
 *   2. 快讯不退化成「十来字标题党短残句独立成段」的旧模板
 *   3. 各条快讯之间、两篇讲解之间无 10 字以上复制套话，两篇讲解无同款起手
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(ROOT, "..");

const argv = process.argv.slice(2);
const voiceOnly = argv.includes("--voice-only");
let target = argv.find((a) => !a.startsWith("--"));

if (!target) {
  const dirs = fs.readdirSync(WS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  target = dirs[dirs.length - 1];
  if (!target) {
    console.error("✗ 工作区里没有 YYYY-MM-DD 目录，也没给日期");
    process.exit(1);
  }
}

const byFile = target.endsWith(".md") || target.includes("/");
const dayFile = byFile ? path.resolve(target) : path.join(WS, target, "文案.md");
const ideaFile = byFile ? null : path.join(WS, "工具", "立意", `${target}.md`);
const label = byFile ? path.relative(WS, dayFile) : target;
const skipStage = voiceOnly || byFile;

const errors = [];
const warnings = [];
const han = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const hanOnly = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).join("");

if (!fs.existsSync(dayFile)) {
  console.error(`✗ 找不到 ${path.relative(WS, dayFile)}`);
  process.exit(1);
}

const text = fs.readFileSync(dayFile, "utf8");

/* ---------- 1 · 解析快讯正文与两篇讲解 ---------- */
const secSplit = text.split(/^## /m);
const postSec = secSplit.find((s) => /成稿/.test(s.split(/\r?\n/)[0] || "")) || text;
const postRe = /\*\*(?:正文|X 主[帖贴])\*\*(?:（[^）]*）)?\r?\n```\r?\n([\s\S]*?)\r?\n```/g;
const posts = [];
let m;
while ((m = postRe.exec(postSec))) {
  const paras = m[1]
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p && p !== "原文" && !/^https?:\/\/\S+$/i.test(p) && !p.startsWith("#"))
    .map((p) =>
      p
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !/^https?:\/\/\S+$/i.test(l) && !l.startsWith("#"))
        .join("")
    )
    .filter(Boolean);
  const firstPara = paras[0] || "";
  const firstSent = firstPara.split(/(?<=[。！？])/)[0] || "";
  posts.push({
    paras,
    paraCount: paras.length,
    firstPara,
    firstParaHan: han(firstPara),
    firstSentHan: han(firstSent),
    last: paras[paras.length - 1] || "",
    body: paras.join(""),
  });
}

if (posts.length < 3 || posts.length > 6) {
  errors.push(`解析到 ${posts.length} 条快讯正文，允许 3–6 条（常规 6 条）；格式为 **正文** 加代码块`);
}

const expPart = text.split(/^## .*(?:講解|讲解).*$/m)[1] || "";
const expItems = expPart
  ? expPart
      .split(/\n## /)[0]
      .split(/^### /m)
      .slice(1)
      .map((item) => {
        const body = (item.split("**正文**")[1] || "").split("**最值得看**")[0];
        return {
          title: item.split(/\r?\n/)[0].trim(),
          body,
          paras: body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
        };
      })
  : [];

/* ---------- 2 · 阶段顺序：立意稿先于文案 ---------- */
if (!skipStage) {
  if (!fs.existsSync(ideaFile)) {
    errors.push(
      `缺立意稿。先在 工具/立意/${target}.md 写清每条的读报切入点，再写 文案.md。`,
    );
  } else {
    const idea = fs.readFileSync(ideaFile, "utf8");
    const rows = [...idea.matchAll(/^[①②③④⑤⑥]\s*(.+)$/gm)].map((x) => x[1].trim());
    const wantRows = posts.length >= 3 && posts.length <= 6 ? posts.length : 6;
    if (rows.length !== wantRows) {
      errors.push(`立意稿有 ${rows.length} 行，与当日 ${wantRows} 条快讯数量不一致`);
    }
    rows.forEach((r, i) => {
      if (han(r) < 10 || han(r) > 90) {
        errors.push(`立意 ${i + 1} 是 ${han(r)} 个汉字，请用一句完整的话写清切入角度与落点`);
      }
    });

    const ideaMtime = fs.statSync(ideaFile).mtimeMs;
    const dayMtime = fs.statSync(dayFile).mtimeMs;
    if (ideaMtime >= dayMtime - 100) {
      errors.push("立意稿修改时间不早于 文案.md。请先定立意再动笔，不要事后倒填");
    }
  }
} else {
  warnings.push("只跑文本模具检查，跳过立意稿顺序校验");
}

/* ---------- 3 · 模具与 AI 腔拦截 ---------- */
if (posts.length >= 3) {
  // 3.1 拦截「第一段全是 ≤16 字短残句钩子」的旧社媒病灶
  const clippedHooks = posts.filter((p) => p.paraCount >= 2 && p.firstParaHan <= 16);
  if (clippedHooks.length >= 2) {
    errors.push(
      `有 ${clippedHooks.length} 条快讯第一段仍是 ≤16 字的孤立短残句（如「${clippedHooks[0].firstPara}」）。` +
        ` 网页已有标题，第一段请直接带主语和动作把事情连贯说开，不要砍成短句钩子`,
    );
  }

  // 3.2 末句说教腔拦截
  const ADVICE = /先把|先盯|先想|先問|先定|再算|記得|問清楚|要拿|得先|把[^，。]{0,8}帶上/;
  const advice = posts.filter((p) => ADVICE.test(p.last.slice(-28)));
  if (advice.length >= 3) {
    errors.push(
      `有 ${advice.length} 条末句在教读者做事（${advice.map((p) => "…" + p.last.slice(-14)).join(" / ")}）。` +
        ` 意思落下就停，不必每条追一句行动指南`,
    );
  }

  // 3.3 十字以上跨条复制套话
  const groups = [
    {
      name: "各条快讯之间",
      units: posts.map((p, i) => ({ name: `第 ${i + 1} 条`, text: p.body })),
    },
    {
      name: "两篇讲解之间",
      units: expItems.map((e, i) => ({ name: `讲解 ${i + 1}`, text: e.body })),
    },
  ];
  groups.forEach((grp) => {
    if (grp.units.length < 2) return;
    const seen = new Map();
    grp.units.forEach((u) => {
      const h = hanOnly(u.text);
      const local = new Set();
      for (let i = 0; i + 10 <= h.length; i++) local.add(h.slice(i, i + 10));
      local.forEach((g) => {
        if (!seen.has(g)) seen.set(g, new Set());
        seen.get(g).add(u.name);
      });
    });
    const hits = [...seen.entries()].filter(([, names]) => names.size >= 2);
    if (!hits.length) return;
    const shown = [];
    hits.forEach(([g, names]) => {
      if (shown.some((s) => g.includes(s.slice(0, 8)) || s.includes(g.slice(0, 8)))) return;
      shown.push(`${g}（${[...names].join("、")}）`);
    });
    errors.push(
      `${grp.name}出现 ${hits.length} 处十字以上重复长串，疑似套话骨架：${shown.slice(0, 3).join("；")}`,
    );
  });
}

// 3.4 两篇讲解段首同构拦截
if (expItems.length === 2) {
  const heads = expItems.map((e) => e.paras.map((p) => hanOnly(p).slice(0, 4)));
  const same = heads[0].filter((h) => h && heads[1].includes(h));
  if (same.length >= 2) {
    errors.push(
      `两篇讲解有 ${same.length} 段以相同四字起手（${[...new Set(same)].join("、")}），请拉开进入方式`,
    );
  }
}

/* ---------- 4 · 报告 ---------- */
console.log(`\n读报顺序与文风模具自检　${label}`);
console.log(`立意稿　${ideaFile ? (fs.existsSync(ideaFile) ? path.relative(WS, ideaFile) : "缺") : "指定文件，跳过"}`);
console.log(`快讯 ${posts.length} 条 · 讲解 ${expItems.length} 篇`);
if (posts.length) {
  console.log(`首段汉字数 ${posts.map((p) => p.firstParaHan).join("/")} · 段数 ${posts.map((p) => p.paraCount).join("/")}`);
}

if (warnings.length) {
  console.log("\n提醒：");
  warnings.forEach((w) => console.log(`  · ${w}`));
}
if (errors.length) {
  console.log(`\n✗ 不通过（${errors.length} 项）：`);
  errors.forEach((e) => console.log(`  · ${e}`));
  console.log("");
  process.exit(1);
}
console.log("\n✅ 读报顺序与文风模具自检通过\n");
