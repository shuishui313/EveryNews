# ShortNews 流程契约（V3）

> 本文件只管**阶段顺序与目录契约**。写法见 `.codebuddy/skills/everynews-editorial/SKILL.md` 与 `WRITING.md`，配图见 `工具/PROMPT.md`，源清单见 `SOURCES.md`。

---

## 1 · 产物契约

```
<YYYY-MM-DD>/
├── 文案.md                候选池 + 3–6 条快讯（单一正文 + 事实表）+ 讲解 2 篇
├── 配图/NN-slug-MM.png    当期卡片源文件（出稿时自动转码发布到 cards/<YYYYMMDD>/*.webp）
└── X热议.md               可选，当日 X 侧线索整理

<YYYYMMDD>.html            单期轻量公开页（约 25 KB），往期一律保留
cards/<YYYYMMDD>/*.webp    当期外置 WebP 配图（比旧双份 Base64 PNG 省约 90% 体积）
index.html                 当日成果主页，最新一期的完整副本，顶部可切换期次
archive.html               全部期次归档页，支持日期与标题筛选
issues.js                  全站期次清单脚本，历史 HTML 永不重复改写

工具/立意/<日期>.md         动笔前的读报切入点，先于 文案.md 落盘
工具/复审/<日期>.md         编辑台改稿回执，闸门必验
HANDOFF.md                 跨天交接记录
选题台账.md                 跨天选题去重台账
```

---

## 2 · 五个阶段

| # | 阶段 | 动作 | 门禁 |
|---|---|---|---|
| 1 | 扫源定题 | 扫近 24h 一手源，查 `选题台账.md` 去重，定 3–6 条快讯 + 2 篇长文源 | 每条有一手源 URL |
| 2 | 抓图排卡 | `./工具/grab.sh` 查一手源信息图，按需排 1–3 张卡（横图可设 `wide: true`） | `check-layouts.mjs` |
| 3 | 立意写稿 | 先落 `工具/立意/<日期>.md`，再按 `everynews-editorial` 写读报笔记体快讯与两篇长文 | `check-voice.mjs` |
| 4 | 改稿回执 | 跑 `python3 工具/review.py <日期>`，清零红线并填写四行改稿回执 | `review.py --check` |
| 5 | 一键出稿 | `./出稿.sh <日期> [slug...]`（改文案重跑可省去 `slug` 直接复用已有配图） | 全绿退出 |
