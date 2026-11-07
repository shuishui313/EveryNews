#!/usr/bin/env node
/**
 * 写稿顺序与 AI 味自检。
 *
 * 用法：
 *   node 工具/check-voice.mjs <日期>                  # 完整闸门，含立意稿顺序
 *   node 工具/check-voice.mjs <日期> --voice-only     # 只查 AI 味，用于历史批次回看
 *   node 工具/check-voice.mjs <文案.md 路径>          # 同上，直接指定文件
 *
 * 对应 WRITING.md §4.1（生成顺序不许倒过来）与 §7.4（写完先过 AI 味自检）。
 * 立意稿在 `工具/立意/<日期>.md`，先写它，再写 `<日期>/文案.md`；日期目录仍只留四项。
 *
 * 命中项只能改稿，不许改这里的阈值放行。脚本不给阈值开关，就是为了不给自己留后门。
 * 只报警不改稿，退出码 1 表示这一轮不许进入下一步。
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
const grams = (s, n = 2) => {
  const h = hanOnly(s);
  const out = new Set();
  for (let i = 0; i + n <= h.length; i++) out.add(h.slice(i, i + n));
  return out;
};

if (!fs.existsSync(dayFile)) {
  console.log(`\n${label}　没有文案.md，跳过写稿自检（图仍可归档）\n`);
  process.exit(0);
}

const text = fs.readFileSync(dayFile, "utf8");

/* ---------- 1 · 阶段顺序：立意稿必须先于文案存在 ---------- */
if (!skipStage) {
  if (!fs.existsSync(ideaFile)) {
    errors.push(
      `缺立意稿。先在 工具/立意/${target}.md 写六句「这条我到底想说什么」，再动 文案.md。` +
        ` 立意稿不是事后补的说明，补写顺序就反了。`,
    );
  } else {
    const idea = fs.readFileSync(ideaFile, "utf8");
    const rows = [...idea.matchAll(/^[①②③④⑤⑥]\s*(.+)$/gm)].map((m) => m[1].trim());
    if (rows.length !== 6) {
      errors.push(`立意稿有 ${rows.length} 行，要 ① 到 ⑥ 各一句`);
    }
    rows.forEach((r, i) => {
      if (han(r) < 8 || han(r) > 80) errors.push(`立意 ${i + 1} 是 ${han(r)} 个汉字，写成一句能说清的话`);
      if (/[A-E]-\d-[a-e]/.test(r)) errors.push(`立意 ${i + 1} 写了组合标签，动笔前不许挑类型`);
      if (/cover|bigfact|ledger|matrix|mosaic|quote|statement|timeline|kpi|stack|specs|columns|steps|triad|shot|versus|brick|photo-|首句|字數|組合|頁型|開頭|收尾|段數|標籤/i.test(r)) {
        errors.push(`立意 ${i + 1} 混进了排版或自查口径，这一句只写要说什么`);
      }
    });

    const ideaMtime = fs.statSync(ideaFile).mtimeMs;
    const dayMtime = fs.statSync(dayFile).mtimeMs;
    if (ideaMtime >= dayMtime - 100) {
      errors.push("立意稿的修改时间不早于文案.md。顺序反了，按 §4.1 重走一遍，别倒填");
    }

    // 首句要从立意句里顺出来，不是另起一套
    const postsRaw = [...text.matchAll(/\*\*X 主帖\*\*（[A-E]-\d-[a-e]）\r?\n```\r?\n([\s\S]*?)\r?\n```/g)];
    postsRaw.forEach((m, i) => {
      const first = m[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || "";
      const ideaSet = grams(rows[i] || "");
      const shared = [...grams(first)].filter((g) => ideaSet.has(g)).length;
      if (shared < 2) {
        errors.push(`第 ${i + 1} 条首句与立意 ${i + 1} 对不上。首句要从那一句顺出来，别另起炉灶`);
      }
    });
  }
} else {
  warnings.push("只跑 AI 味检查，没验立意稿顺序（--voice-only 用于回看历史批次）");
}

/* ---------- 2 · 取六条主帖、Threads 与两篇讲解 ---------- */
const postRe = /\*\*X 主帖\*\*（([A-E])-(\d)-([a-e])）\r?\n```\r?\n([\s\S]*?)\r?\n```/g;
const posts = [];
let m;
while ((m = postRe.exec(text))) {
  const lines = m[4]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "原文" && !/^https?:\/\//i.test(l) && !l.startsWith("#"));
  const firstSent = (lines[0] || "").split(/(?<=[。！？])/)[0] || "";
  posts.push({
    lines,
    first: lines[0] || "",
    firstSent,
    firstHan: han(firstSent),
    paras: lines.length,
    last: lines[lines.length - 1] || "",
    body: lines.join(""),
  });
}
const threadRe = /\*\*Threads\*\*\n```\r?\n([\s\S]*?)\r?\n```/g;
const threads = [];
let tm;
while ((tm = threadRe.exec(text))) threads.push(tm[1]);

if (posts.length !== 6) {
  errors.push(`解析到 ${posts.length} 条主帖，常规是 6 条；标签格式要写成 **X 主帖**（A-3-a）`);
}

const expPart = text.split(/^## .*(?:講解類|讲解类).*$/m)[1] || "";
const expItems = expPart.split(/\n## /)[0].split(/^### /m).slice(1).map((item) => {
  const body = (item.split("**正文**")[1] || "").split("**最值得看**")[0];
  return {
    title: item.split(/\r?\n/)[0].trim(),
    body,
    paras: body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
  };
});

/* ---------- 3 · AI 味：这次暴露过的六个病灶 ---------- */
if (posts.length >= 4) {
  // 3.1 首句像按字数裁出来的
  const lens = posts.map((p) => p.firstHan);
  const spread = Math.max(...lens) - Math.min(...lens);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const std = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  if (spread <= 4 && std < 1.8 && Math.max(...lens) <= 12) {
    errors.push(
      `六条首句都落在 ${Math.min(...lens)}–${Math.max(...lens)} 字（长度差 ${spread}，标准差 ${std.toFixed(2)}）。` +
        ` 像按 15 字上限裁过，不像从材料里长出来的。让有的长有的短`,
    );
  }

  // 3.2 段落数完全一样，同一个模子
  const shapes = new Set(posts.map((p) => p.paras));
  if (shapes.size === 1) {
    errors.push(`六条主帖都是 ${posts[0].paras} 段。§4.2 说意思落下就停，不需要每条补齐同一个段数`);
  }

  // 3.3 末句都在教读者怎么读数字
  const ADVICE = /先把|先盯|先想|先問|先定|再算|別|應該|記得|問清楚|要拿|要接|得先|把[^，。]{0,8}帶上|可以先/;
  const advice = posts.filter((p) => ADVICE.test(p.last));
  if (advice.length >= 3) {
    errors.push(
      `有 ${advice.length} 条末句在给建议或方法论（${advice.map((p) => p.last.slice(0, 14) + "…").join(" / ")}）。` +
        ` 收尾可以是事实、可以是数字，不必每条都追一句「先…再…」`,
    );
  }

  // 3.4 十字以上同款长串。只在同组内部比：讲解本来就要引用当天条目的数字，
  // 拿条目和讲解互比会把「同一组事实」误判成套话。
  const groups = [
    {
      name: "六条短帖之间",
      units: posts.map((p, i) => ({ name: `第 ${i + 1} 条`, text: p.body + (threads[i] || "") })),
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
      `${grp.name}出现 ${hits.length} 处十字以上同款长串，是套话或复制的骨架。` +
        ` 例：${shown.slice(0, 3).join("；")}`,
    );
  });
}

// 3.5 两篇讲解用同一副骨架换词
if (expItems.length === 2) {
  const heads = expItems.map((e) => e.paras.map((p) => hanOnly(p).slice(0, 4)));
  const same = heads[0].filter((h) => h && heads[1].includes(h));
  if (same.length >= 2) {
    errors.push(
      `两篇讲解有 ${same.length} 段以同款起手（${[...new Set(same)].join("、")}）。` +
        ` 第二篇换个进入方式，别照着第一篇的段序填材料`,
    );
  }
} else if (expItems.length && expItems.length !== 2) {
  warnings.push(`讲解类解析到 ${expItems.length} 篇，常规是 2 篇`);
}

// 3.6 自查表里那句「不是先选组合再填」不能当顺序证据
if (/不是先選組合再填|不是先选组合再填/.test(text)) {
  warnings.push("自查表写了「不是先选组合再填」。这是套话，顺序证据只看 工具/立意/ 与这里的阶段检查");
}

/* ---------- 4 · 报告 ---------- */
console.log(`\n写稿顺序与 AI 味自检　${label}`);
console.log(`立意稿　${ideaFile ? (fs.existsSync(ideaFile) ? path.relative(WS, ideaFile) : "缺") : "指定文件，跳过"}`);
console.log(`主帖 ${posts.length} 条 · Threads ${threads.length} 条 · 讲解 ${expItems.length} 篇`);
if (posts.length) {
  console.log(`首句汉字数 ${posts.map((p) => p.firstHan).join("/")} · 段数 ${posts.map((p) => p.paras).join("/")}`);
}

if (warnings.length) {
  console.log("\n提醒：");
  warnings.forEach((w) => console.log(`  · ${w}`));
}
if (errors.length) {
  console.log(`\n✗ 不通过（${errors.length} 项）。改稿，不要改这里的阈值：`);
  errors.forEach((e) => console.log(`  · ${e}`));
  console.log("");
  process.exit(1);
}
console.log("\n✅ 写稿顺序与 AI 味自检通过，可以进入下一步\n");
