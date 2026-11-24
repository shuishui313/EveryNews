---
name: daily-6
description: 每日 AI 网页新闻流水线。每天定时或手动触发（「跑今天的六条」「出今天的新闻」）。抓近 24 小时 AI 一手新闻 → 选 3–6 条快讯 + 2 篇长文讲解 → 按 everynews-editorial 写读报笔记体文稿并配 1–3 张 WebP 卡片 → 过闸门出网页。
---

# 每日新闻流水线（daily-6）

> 写作规范与红线检查统一调用 `.codebuddy/skills/everynews-editorial/SKILL.md`；产物契约看 `WRITING.md` 与 `SHORTNEWS-V1.md`；配图版式看 `工具/PROMPT.md`；信息源分级看 `SOURCES.md`。

## 0 · 开工前

- 先读 `HANDOFF.md` 自动段，翻 `选题台账.md` 去重。
- 动笔前先读 `.codebuddy/skills/everynews-editorial/SKILL.md`。

## 1 · 抓取与选稿（近 24 小时）

按 `SOURCES.md` 四层扫源：

1. **一手官方（L1–L5）**：OpenAI / Anthropic / Google / DeepMind / Meta / Mistral / xAI / HF / GitHub / arXiv，唯一可引用口径。
2. **线索聚合（L8，不当引用源）**：news.smol.ai、Techmeme、Hacker News，必须回溯到一手源。
3. **X 侧线索**：`follow-builders/feed-x.json`、公开趋势与 `site:x.com`，核回官方原文。
4. **中文侧（L9，只查标题）**：量子位、机器之心、36 氪，做本土线索补充与差异检查。

选 **3–6 条快讯**（淡日不硬凑）+ **2 篇长文讲解**（能照做、有边界、三个月不过时）。

## 2 · 配图卡片（1–3 张弹性，外置 WebP）

1. 每条先跑 `./工具/grab.sh <slug> <一手源 URL>` 找正文信息图；无图时写清 `noImageReason`。
2. 按信息量定张数（推荐 1–2 张核心卡，不凑水页）；官方横版宽图可在 `shot` 页型加 `"wide": true` 走 16:9 画框；各套首图不撞款。

## 3 · 写稿与出稿顺序

1. 先写 `工具/立意/<日期>.md`，每条一句读报切入点，各条动作错开。
2. 按 `everynews-editorial` 写 `<日期>/文案.md`：
   - 快讯单一 `**正文**`（90–280 字，1–3 段）：**第一句带主语和动作直接连贯入题**，严禁十来字短残句钩子分段，无需 `A-3-a` 组合标签，末尾单独一行放一手源 URL。
   - 讲解 2 篇（600–950 汉字）：顺着问题链推进，不写「第一個/第二個/三個問題」大纲切格，附 `**最值得看**` 锚点。
3. 跑 `python3 工具/review.py <日期>`，清零红线报错并填妥 `工具/复审/<日期>.md` 四行回执。
4. 跑 `./出稿.sh <日期> [slug...]` 一键完成校验、外置 WebP 转码（`cards/<YYYYMMDD>/`）、`<YYYYMMDD>.html`、`issues.js`、`index.html`、`archive.html`、`选题台账.md` 与 `HANDOFF.md` 刷新。
