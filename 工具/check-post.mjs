#!/usr/bin/env node
/**
 * 文案自查：把 `## 四、自查` 里能机器判的那几行，逐条核到正文上。
 *
 * 用法：
 *   node 工具/check-post.mjs                 # 取最新的 YYYY-MM-DD/文案.md
 *   node 工具/check-post.mjs 2026-10-29      # 指定日期
 *   node 工具/check-post.mjs path/文案.md    # 指定文件
 *
 * 判据（对应 WRITING.md §4.1 / §13 / §15）：
 *   首句字数 ≤15（只数汉字）｜主帖 120–200 字符｜正文 2–4 段｜正文无冒号
 *   开头 A–E 相邻不同、全批 ≥3 类｜收尾 a–e 全批 ≥3 类、e（立场）≤2 条、d 必须问句
 *   六个「开头-结构-收尾」组合不重复｜全批「我」≤1 次
 *   自查表里的首句字数 / 主帖字数 / 正文段数 / 开头 / 收尾 / 组合，必须与正文实测一致
 *
 * 只报警，不改稿。语义类判据（有没有立场、有没有翻案句）交给 check_prose.py 与人工。
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
    const dirs = fs
      .readdirSync(WS)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
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
const width = (s) => s.replace(/\s/g, "").length;

/* ---------- 1. 取六条主帖 ---------- */
const re = /\*\*X 主帖\*\*（([A-E])-(\d)-([a-e])）\r?\n```\r?\n([\s\S]*?)\r?\n```/g;
const posts = [];
let m;
while ((m = re.exec(text))) {
  const [, open, struct, close, raw] = m;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "原文" && !/^https?:\/\//i.test(l) && !l.startsWith("#"));
  const firstSent = (lines[0] || "").split(/(?<=[。！？])/)[0] || "";
  posts.push({
    open,
    struct: Number(struct),
    close,
    label: `${open}-${struct}-${close}`,
    lines,
    first: lines[0] || "",
    firstSent,
    firstHan: han(firstSent),
    chars: width(lines.join("")),
    paras: lines.length,
    last: (lines[lines.length - 1] || "").trim(),
    raw,
  });
}

if (!posts.length) {
  console.error(`✗ ${rel} 里没找到「**X 主帖**（A-1-a）」这种标签加代码块`);
  process.exit(1);
}
if (posts.length > 1 && posts.length !== 6) warnings.push(`主帖 ${posts.length} 条（常规 6 条）`);

/* ---------- 2. 逐条判据 ---------- */
const NO_COLON = /[：:]/;
posts.forEach((p, i) => {
  const tag = `第 ${i + 1} 条（${p.label}）`;
  if (p.firstHan > 15) errors.push(`${tag} 首句 ${p.firstHan} 个汉字，超过 15`);
  if (p.firstHan === 0) errors.push(`${tag} 首句没取到汉字`);
  if (p.chars < 120 || p.chars > 200) errors.push(`${tag} 主帖 ${p.chars} 字，出界（120–200）`);
  if (p.paras < 2 || p.paras > 4) errors.push(`${tag} 正文 ${p.paras} 段，出界（2–4 段）`);
  if (p.struct < 1 || p.struct > 5) errors.push(`${tag} 结构编号 ${p.struct}，只有 1–5`);
  const body = p.lines.join("\n").replace(/https?:\/\/\S+/g, "");
  if (NO_COLON.test(body)) errors.push(`${tag} 正文里有冒号`);
  if (p.close === "d" && !/[？?]$/.test(p.last)) errors.push(`${tag} 收尾标 d（具体问题），末句不是问句`);
  if (p.close !== "d" && /[？?]$/.test(p.last)) warnings.push(`${tag} 末句是问句，但收尾标的是 ${p.close}`);
});

const opens = posts.map((p) => p.open);
const closes = posts.map((p) => p.close);
const labels = posts.map((p) => p.label);
const closeCount = (c) => posts.filter((p) => p.close === c).length;
if (posts.length > 1) {
  for (let i = 1; i < opens.length; i++) {
    if (opens[i] === opens[i - 1]) warnings.push(`第 ${i} 与第 ${i + 1} 条开头都归 ${opens[i]} 类。类型是粗分类，看两句节奏真像不像；像就换，不像就留`);
  }
  if (closeCount("e") > 2) errors.push(`立场句（收尾 e）${closeCount("e")} 条，上限 2 条`);
  if (new Set(opens).size < 3) errors.push(`开头只用了 ${new Set(opens).size} 类，至少 3 类`);
  if (new Set(closes).size < 3) errors.push(`收尾只用了 ${new Set(closes).size} 类，至少 3 类`);
  if (new Set(labels).size !== labels.length) errors.push(`组合有重复：${labels.join(" / ")}`);
}

const wo = posts.reduce((n, p) => n + (p.lines.join("").match(/我/g) || []).length, 0);
if (wo > 1) errors.push(`主帖里「我」出现 ${wo} 次，全批上限 1 次`);

/* ---------- 2.5 平台口径（一帖制） ---------- */
if (/\*\*X 评论区\*\*/.test(text)) {
  errors.push("出现「X 评论区」块：2026-10-29 起每个平台只发一条帖子，评论区已废（WRITING §4.2）");
}

/* ---------- 2.6 横向句式复用 ---------- */
const hz = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).join("");
const heads = posts.map((p) => hz(p.firstSent).slice(0, 2));
if (posts.length > 1) posts.forEach((_, i) => {
  const h = heads[i];
  const dup = heads.indexOf(h);
  if (h.length >= 2 && dup !== -1 && dup !== i) {
    errors.push(`第 ${dup + 1} 与第 ${i + 1} 条首句都以「${h}」开头，开头同款要换`);
  }
});
for (let i = 1; i < posts.length; i++) {
  const a = hz(posts[i - 1].last).slice(0, 1);
  const b = hz(posts[i].last).slice(0, 1);
  if (a && a === b) errors.push(`第 ${i} 与第 ${i + 1} 条末句都以「${a}」开头，收尾同款要换`);
}

const NOMINAL = /这件事|這個事|这件事|这个说法|這個說法|这一轮|這一輪|说到底|說到底/g;
const nom = (posts.map((p) => p.lines.join("\n")).join("\n").match(NOMINAL) || []).length;
if (nom > 1) errors.push(`「这件事 / 这个说法 / 这一轮」这类把话题名词化的开头共 ${nom} 处，全批最多 1 处`);

posts.forEach((p, i) => {
  p.lines.forEach((line) => {
    line
      .split(/(?<=[。！？])/)
      .filter((s) => s.trim())
      .forEach((s) => {
        const n = (s.match(/\d[\d.,]*%?/g) || []).length;
        if (n >= 3) warnings.push(`第 ${i + 1} 条有一句塞了 ${n} 个阿拉伯数字，考虑拆句`);
      });
  });
});

/* ---------- 2.7 Threads ---------- */
const threads = [];
const tre = /\*\*Threads\*\*\n```\r?\n([\s\S]*?)\r?\n```/g;
let tm;
while ((tm = tre.exec(text))) threads.push(tm[1]);
if (threads.length !== posts.length) {
  warnings.push(`Threads ${threads.length} 条，主帖 ${posts.length} 条，数量不一致`);
}
threads.forEach((t, i) => {
  const body = t.split(/\r?\n/).filter((l) => l.trim() && !/^https?:\/\//i.test(l.trim()));
  const n = width(body.join(""));
  if (n < 120 || n > 260) errors.push(`Threads 第 ${i + 1} 条 ${n} 字，出界（120–260）`);
  const tags = (t.match(/#[^\s#]+/g) || []).length;
  if (tags !== 1) warnings.push(`Threads 第 ${i + 1} 条有 ${tags} 个话题标签，只用 1 个`);
  const post = posts[i];
  if (post) {
    const pool = new Set(post.lines.map((l) => hz(l)));
    const copied = body.filter((l) => hz(l).length >= 15 && pool.has(hz(l)));
    if (copied.length) errors.push(`Threads 第 ${i + 1} 条有 ${copied.length} 句与主帖一字不差，要换个落点`);
  }
});

/* ---------- 2.8 句式体检（排比 / 路标 / 借喻 / 对仗 / 段落同构） ---------- */
const isCJKChar = (c) => /[\u4e00-\u9fff]/.test(c);
const clausesOf = (para) => para.split(/[，。；、！？：]/).map((s) => s.trim()).filter((s) => han(s) >= 2);
const parasOf = (lines) => lines.join("\n").split(/\n+/).map((s) => s.trim()).filter(Boolean);

function scanParallel(paras, tag) {
  paras.forEach((para, pi) => {
    const cl = clausesOf(para);
    if ((para.match(/的是/g) || []).length >= 2) {
      warnings.push(`${tag} 第 ${pi + 1} 段出现两次「的是」，像「A 是 X，B 是 Y」的对仗，看要不要拆`);
    }
    if (cl.length < 3) return;
    const grams = new Map();
    cl.forEach((c, ci) => {
      const seen = new Set();
      for (let k = 0; k + 3 <= c.length; k++) {
        const g = c.slice(k, k + 3);
        if (!isCJKChar(g[0]) || seen.has(g)) continue;
        seen.add(g);
        if (!grams.has(g)) grams.set(g, new Set());
        grams.get(g).add(ci);
      }
    });
    for (const [g, set] of grams) {
      if (set.size >= 3) {
        errors.push(`${tag} 第 ${pi + 1} 段有 ${set.size} 个分句共用「${g}」，是三项同构排比；两项为限（SKILL 成稿禁令）`);
        return;
      }
    }
    for (let k = 0; k + 3 <= cl.length; k++) {
      const win = cl.slice(k, k + 3).map(han);
      if (win.every((n) => n >= 4 && n <= 10) && Math.max(...win) - Math.min(...win) <= 2) {
        warnings.push(`${tag} 第 ${pi + 1} 段连着三句字数挨在一起（${win.join("/")}），像排比，看要不要拆`);
        break;
      }
    }
  });
}

const ROAD = /真正值得(?:記住|记住|注意|一提)[^，。]{0,10}是?|真正的問題|真正的问题|這裡要分清|这里要分清|邊界也說清楚|边界也说清楚|更值得看的是|更微妙的是|還有第?[一二三]層|还有第?[一二三]层|值得注意|需要指出|從某種意義上|从某种意义上|只說對了一半|只说对了一半|說到底|说到底|答案恰恰相反|更深一層|更深一层/g;
const METAPHOR = /畫了[條条]線|画了[條条]线|留在桌上|留在牌桌|寫成程序|写成程序|抓手|閉環|闭环|飛輪|飞轮|護城河|护城河|底座|鑰匙|钥匙|浪潮|抽屜|抽屉|燈塔|灯塔/g;
const BOUNDARY = /未披露|沒公布|未公布|沒有公布|没有公布|查不到|沒說|未說明|未说明|不清楚|拿不准|沒有給出|没有给出/g;

const postParas = posts.map((p, i) => ({ tag: `第 ${i + 1} 条`, paras: parasOf(p.lines) }));
postParas.forEach((b) => scanParallel(b.paras, b.tag));

const postBody = posts.map((p) => p.lines.join("\n")).join("\n");
[...new Set(postBody.match(ROAD) || [])].forEach((w) =>
  errors.push(`正文出现洞察路标「${w}」，换成事实或直接删（SKILL 成稿禁令）`),
);
[...new Set(postBody.match(METAPHOR) || [])].forEach((w) =>
  warnings.push(`正文出现借喻词「${w}」，确认它不是在包装抽象概念`),
);
if (!BOUNDARY.test(postBody)) {
  warnings.push("六条正文里没有一处材料边界（未披露 / 没公布 / 查不到），确认不是全被抹平了");
}
const shapes = postParas.map((p) => p.paras.map((x) => clausesOf(x).length).join("-"));
if (posts.length >= 4 && new Set(shapes).size === 1) {
  warnings.push(`六条主帖的段落句数完全一样（${shapes[0]}），读起来会像同一个模子刻出来的`);
}

/* ---------- 3. 自查表 ↔ 正文 ---------- */
const simp = (s) => s.replace(/[數開組結構頭點條講類體價後個與區問題]/g, (c) => ({
  數:"数",開:"开",組:"组",結:"结",構:"构",頭:"头",點:"点",條:"条",
  講:"讲",類:"类",體:"体",價:"价",後:"后",個:"个",與:"与",區:"区",問:"问",題:"题",
}[c] || c));
const section = simp(text.split(/^## .*(?:自查|自查).*$/m)[1] || "");
const cell = (line) => line.split("|").slice(2, -1).map((c) => c.trim());
const row = (name) => {
  const hit = section.split(/\r?\n/).find((l) => l.startsWith(`| ${name} `) || l.startsWith(`| ${name} |`));
  return hit ? cell(hit) : null;
};
const expect = [
  ["首句字数", posts.map((p) => String(p.firstHan))],
  ["主帖字数", posts.map((p) => String(p.chars))],
  ["正文段数", posts.map((p) => String(p.paras))],
  ["开头", posts.map((p) => p.open)],
  ["收尾", closes],
  ["组合", labels],
];
for (const [name, want] of expect) {
  const got = row(name);
  if (!got) {
    if (want.length === posts.length && name !== "主帖字数" && name !== "正文段数") {
      warnings.push(`自查表缺「${name}」行`);
    }
    continue;
  }
  if (got.length !== want.length) {
    errors.push(`自查表「${name}」有 ${got.length} 列，正文 ${want.length} 条`);
    continue;
  }
  got.forEach((g, i) => {
    const w = want[i];
    const ok = name === "收尾" ? g.startsWith(w) : g.replace(/\s/g, "") === w;
    if (!ok) errors.push(`自查表「${name}」第 ${i + 1} 列写 ${g}，正文实测 ${w}`);
  });
}

/* ---------- 4. 讲解类两篇 ---------- */
const expInfo = [];
const expPart = posts.length > 1 ? simp(text).split(/^## .*讲解类.*$/m)[1] : "skip";
if (expPart === "skip") {
  globalThis.__exp = [];
} else if (!expPart) {
  errors.push("文案.md 里没有「## 三、讲解类 2 篇」章节");
} else {
  const cut = expPart.split(/\n## /)[0];
  const items = cut.split(/^### /m).slice(1);
  globalThis.__exp = [];
  if (items.length !== 2) errors.push(`讲解类有 ${items.length} 篇，每天固定 2 篇`);
  items.forEach((item, k) => {
    const title = item.split(/\r?\n/)[0].trim();
    const tag = `讲解 ${k + 1}（${title.slice(0, 16)}）`;
    if (!/https?:\/\/\S+/.test(item)) errors.push(`${tag} 没有视频链接`);
    if (!/youtu\.?be|youtube\.com/i.test(item)) warnings.push(`${tag} 链接不是 YouTube，确认能点开`);
    const noMeta = item.split(/\r?\n/).filter((l) => !/^- 影片/.test(l.trim())).join("\n");
    const stamps = (noMeta.match(/\d{2}:\d{2}/g) || []).length;
    const posMark = /(环节|提問|提问|陳述|陈述|段落|第\s*\d+\s*段)/.test((item.split("**最值得看**")[1] || ""));
    if (stamps < 1 && !posMark) errors.push(`${tag} 一个时间位置都没给，读者跳不过去`);
    if (stamps > 3) warnings.push(`${tag} 有 ${stamps} 个时间码，注意别写成视频目录`);
    const body = (item.split("**正文**")[1] || "").split("**最值得看**")[0];
    if (!body.trim()) {
      errors.push(`${tag} 缺「**正文**」块`);
      return;
    }
    const n = han(body);
    scanParallel(body.split(/\r?\n/).filter((l) => l.trim()), tag);
    [...new Set(body.match(ROAD) || [])].forEach((w) =>
      errors.push(`${tag} 正文出现洞察路标「${w}」，换成事实或直接删（SKILL 成稿禁令）`),
    );
    [...new Set(body.match(METAPHOR) || [])].forEach((w) =>
      warnings.push(`${tag} 正文出现借喻词「${w}」，确认它不是在包装抽象概念`),
    );
    [...new Set(body.match(/第[一二三四五][件個个]/g) || [])].forEach((w) =>
      warnings.push(`${tag} 出现「${w}」式列举，分类要来自材料，不能拿分类代替文章`),
    );
    if (n < 600 || n > 900) errors.push(`${tag} 正文 ${n} 个汉字，出界（600–900）`);
    const paras = body.split(/\r?\n/).filter((l) => l.trim()).length;
    if (paras < 5) warnings.push(`${tag} 只有 ${paras} 段，看是不是写得太赶`);
    const sents = body.split(/(?<=[。！？])/).map((s) => s.replace(/\s/g, "")).filter(Boolean);
    if (sents.length > 6) {
      const lens = sents.map((s) => s.length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const cv = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) / mean;
      if (cv < 0.35) warnings.push(`${tag} 句长变异 ${cv.toFixed(2)}，句子长度太整齐，像匀速列车`);
    }
    const grid = body.match(/第[一二三四五][件點條]|其[一二三四五][是、，]|三件事|三個原因|三個階段|兩個成本|幾件事/g);
    if (grid) errors.push(`${tag} 用了编号式结构（${[...new Set(grid)].join("、")}），讲解不切成等长格子`);
    const bodyStamps = (body.match(/\d{2}:\d{2}/g) || []).length;
    if (bodyStamps > 2) errors.push(`${tag} 正文里 ${bodyStamps} 个时间码，最多 2 个，时间只作锚点`);
    if (!/最值得看/.test(item)) errors.push(`${tag} 缺「**最值得看**」块`);
    expInfo.push({ n, paras, stamps });
  });
}

/* ---------- 5. 报告 ---------- */
console.log(`\n${rel}　${posts.length} 条主帖\n`);
posts.forEach((p, i) => {
  console.log(
    `${String(i + 1).padStart(2, "0")}  ${p.label.padEnd(6)}首句 ${String(p.firstHan).padStart(2)} 字 ｜ ` +
      `${String(p.chars).padStart(3)} 字 ｜ ${p.paras} 段 ｜ ${p.first.slice(0, 22)}`,
  );
});
console.log(
  `\n开头 ${opens.join("")}　收尾 ${closes.join("")}　立场 ${closeCount("e")} 条　组合 ${
    new Set(labels).size
  }/${labels.length} 不重复　我 ${wo} 次`,
);
if (expInfo.length) {
  console.log(`讲解 ${expInfo.length} 篇　${expInfo.map((x) => `${x.n} 字/${x.paras} 段/${x.stamps} 个时间码`).join("　")}`);
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
console.log("\n✅ 文案自查通过\n");
