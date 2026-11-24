#!/usr/bin/env node
/**
 * EveryNews 编辑台文风与红线检查器（everynews-editorial 原生脚本）
 *
 * 用法：
 *   node .codebuddy/skills/everynews-editorial/scripts/lint.mjs <文本或文案.md路径> [--mode=raw|day]
 *
 * --mode=raw（默认）：直接检查传入文件的全部正文（供 review.py 分段喂入快讯/长文）
 * --mode=day        ：解析整份 <日期>/文案.md，分别检查快讯代码块与长文讲解正文
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const modeArg = argv.find((a) => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "raw";

if (!file || !fs.existsSync(file)) {
  console.error("用法: node lint.mjs <文件路径> [--mode=raw|day]");
  process.exit(2);
}

const raw = fs.readFileSync(file, "utf8");
const hanCount = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
const isCJK = (c) => /[\u4e00-\u9fff]/.test(c);

// 1. 翻案抬价动作（含字面与常见变形）
const REVERSAL_PATTERNS = [
  /不是[^。！？\n]{1,28}[，,。]\s*(?:而是|是)[^，。！？\n]{1,28}/g,
  /並非[^。！？\n]{1,28}[，,。]\s*而是[^，。！？\n]{1,28}/g,
  /并非[^。！？\n]{1,28}[，,。]\s*而是[^，。！？\n]{1,28}/g,
  /不在於?[^。！？\n]{1,28}[，,。]\s*(?:而在於?|在於?|在)[^，。！？\n]{1,28}/g,
  /不在于?[^。！？\n]{1,28}[，,。]\s*(?:而在于?|在于?|在)[^，。！？\n]{1,28}/g,
  /與其說[^。！？\n]{1,28}[，,]\s*(?:不如說|倒不如|毋寧)/g,
  /与其说[^。！？\n]{1,28}[，,]\s*(?:不如说|倒不如|毋宁)/g,
  /(?:表面上?|看似)[^。！？\n]{1,26}[，,]\s*(?:實際上?|實則|其實|实际上?|实则|其实)/g,
  /你以為[^。！？\n]{1,24}[，,]\s*其實/g,
  /你以为[^。！？\n]{1,24}[，,]\s*其实/g,
  /真正(?:決定|决定|讓|让|值得|重要|核心)[^。！？\n]{1,22}的[，,]?\s*是/g,
  /說到底|说到底|答案恰恰相反|回頭才發現|回头才发现/g,
];

// 2. 汇报黑话与绝对禁词
const JARGON = [
  "賦能", "赋能", "抓手", "閉環", "闭环", "商業閉環", "商业闭环", "價值閉環", "价值闭环",
  "護城河", "护城河", "飛輪", "飞轮", "底層邏輯", "底层逻辑", "頂層設計", "顶层设计",
  "降本增效", "組合拳", "组合拳", "全鏈路", "全链路", "技術底座", "技术底座", "公共底座",
  "打開想像空間", "打开想象空间", "打開想象空間", "心智", "範式轉移", "范式转移",
  "能力沉澱", "能力沉淀", "價值釋放", "价值释放", "認知躍遷", "认知跃迁", "拉通",
];

// 3. 模型路标与口头禅硬停词
const SIGNPOSTS = [
  "值得注意的是", "需要指出的是", "更微妙的是", "更深一層", "更深一层",
  "還有第一層", "還有第二層", "還有另一層", "还有另一层",
  "只說對了一半", "只说对了一半", "從某種意義上", "从某种意义上",
  "說白了", "说白了", "說穿了", "说穿了", "先說結論", "先说结论",
  "一句話總結", "一句话总结", "核心在於", "核心在于",
];

// 4. 大纲切格词
const GRID_WORDS = /第[一二三四五](?:個|个|件|點|点|條|条)(?:要|是|問題|问题|原因|看)|其[一二三四五][是、，]|三(?:個|个)(?:問題|问题|原因|階段|阶段)|三件事|兩個成本|两个成本/g;

// 5. 动词名词化高频套路
const NOMINALIZED = /(?:進行了|进行了|實現了|实现了|完成了對|完成了对)[^，。！？\n]{1,12}(?:優化|优化|提升|升級|升级|調整|调整|重構|重构)/g;

function lintBlock(text, label) {
  const errors = [];
  const warnings = [];

  const cleanUrls = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^https?:\/\/\S+$/i.test(l.trim()))
    .join("\n")
    .replace(/https?:\/\/\S+/g, "");

  // 冒号（排除 10:30 时间格式）
  const noTime = cleanUrls.replace(/\b\d{1,2}:\d{2}\b/g, "");
  const colonHits = noTime.match(/[：:]/g) || [];
  if (colonHits.length) {
    errors.push(`${label}：出现 ${colonHits.length} 处冒号（正文严禁提示性冒号，改用自然衔接）`);
  }

  // 破折号
  const dashHits = cleanUrls.match(/——|—|–/g) || [];
  if (dashHits.length) {
    errors.push(`${label}：出现 ${dashHits.length} 处破折号`);
  }

  // 翻案抬价
  const revHits = [];
  for (const re of REVERSAL_PATTERNS) {
    for (const m of cleanUrls.matchAll(re)) revHits.push(m[0].trim());
  }
  if (revHits.length) {
    errors.push(`${label}：命中翻案抬价句式 ${revHits.length} 处（${revHits.slice(0, 3).join(" / ")}）`);
  }

  // 商业黑话
  const jargonHits = JARGON.filter((w) => cleanUrls.includes(w));
  if (jargonHits.length) {
    errors.push(`${label}：命中禁用黑话（${[...new Set(jargonHits)].join("、")}）`);
  }

  // 模型路标
  const signHits = SIGNPOSTS.filter((w) => cleanUrls.includes(w));
  if (signHits.length) {
    errors.push(`${label}：命中模型路标/口头禅（${[...new Set(signHits)].join("、")}）`);
  }

  // 大纲切格
  const gridHits = [...new Set(cleanUrls.match(GRID_WORDS) || [])];
  if (gridHits.length) {
    errors.push(`${label}：命中大纲报数切格（${gridHits.join("、")}），改用自然问题链衔接`);
  }

  // 名词化
  const nomHits = [...new Set(cleanUrls.match(NOMINALIZED) || [])];
  if (nomHits.length) {
    errors.push(`${label}：命中动词名词化（${nomHits.join("、")}），改成直接动作`);
  }

  // 三项同构排比与长定语检查
  const paras = cleanUrls.split(/\r?\n\s*\r?\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
  paras.forEach((p, idx) => {
    const clauses = p.split(/[，。；、！？]/).map((c) => c.trim()).filter((c) => hanCount(c) >= 2);
    if (clauses.length >= 3) {
      const grams = new Map();
      clauses.forEach((c, ci) => {
        const seen = new Set();
        for (let k = 0; k + 3 <= c.length; k++) {
          const g = c.slice(k, k + 3);
          if (!isCJK(g[0]) || seen.has(g)) continue;
          seen.add(g);
          if (!grams.has(g)) grams.set(g, new Set());
          grams.get(g).add(ci);
        }
      });
      for (const [g, set] of grams) {
        if (set.size >= 3) {
          errors.push(`${label} 第 ${idx + 1} 段：${set.size} 个分句共用「${g}」，构成三项同构排比`);
          break;
        }
      }
    }

    // 单句四个以上「的」提醒
    const sents = p.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
    sents.forEach((s) => {
      const deCount = (s.match(/的/g) || []).length;
      if (deCount >= 4 && hanCount(s) > 28) {
        warnings.push(`${label} 第 ${idx + 1} 段有长定语句含 ${deCount} 个「的」：「${s.slice(0, 26)}…」`);
      }
    });
  });

  // 句长变异系数提醒（长文）
  const allSents = cleanUrls.split(/(?<=[。！？])/).map((s) => hanCount(s)).filter((n) => n >= 3);
  if (allSents.length >= 12) {
    const mean = allSents.reduce((a, b) => a + b, 0) / allSents.length;
    const cv = Math.sqrt(allSents.reduce((a, b) => a + (b - mean) ** 2, 0) / allSents.length) / mean;
    if (cv < 0.34) {
      warnings.push(`${label} 句长变异系数偏低（${cv.toFixed(2)}），长短句太齐，建议放开几句长句、压短几句落地句`);
    }
  }

  return { han: hanCount(cleanUrls), errors, warnings };
}

if (mode === "raw") {
  const res = lintBlock(raw, path.basename(file));
  console.log(`汉字数 ${res.han}`);
  if (res.errors.length === 0) {
    console.log("硬红线命中 0 项（冒号 0 · 破折号 0 · 翻案腔 0 · 同构排比 0 · 黑话 0 · 路标 0 · 切格 0）");
  } else {
    res.errors.forEach((e) => console.log(`✗ ${e}`));
  }
  if (res.warnings.length) {
    console.log("\n节奏提醒：");
    res.warnings.forEach((w) => console.log(`  - ${w}`));
  }
  process.exit(res.errors.length ? 1 : 0);
}
