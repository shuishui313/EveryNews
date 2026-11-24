# AGENTS.md

Agents editing this repo follow the rules below. User-facing prose lives in both `README.md` and `README.en.md`. The writing rules stay in `WRITING.md` and `.codebuddy/skills/everynews-editorial/SKILL.md`.

## 用户可见的说明，两份 README 一起改

- `README.md` 是简体中文，`README.en.md` 是英文，章节顺序保持一致。
- 切换行不要改写法：中文页是 `**中文** | [English](README.en.md)`，英文页是 `[中文](README.md) | **English**`。
- 语言切换用这两个文件，不用折叠块。折叠块只留给文末文件表。
- 英文页链到没有英文孪生文件的深文档（`WRITING.md`、`SHORTNEWS-V1.md`、`SOURCES.md`、`工具/PROMPT.md`、`HANDOFF.md` 等）时，标 `(in Chinese)`。
- 改了命令、产物名、字数区间或验证范围，两份 README 放在同一次提交里。

## 不要拆 `出稿.sh` 的契约

入口是仓库根目录的 `./出稿.sh <YYYY-MM-DD> [slug...]`。日期必须是 `YYYY-MM-DD`，输入是 `<日期>/文案.md`（根目录或 `稿件/` 里的 `<日期>.md` 会自动挪入）。传 `slug...` 时校验版式并渲染配图卡片；不传 `slug` 时复用已有的 `<日期>/配图/`。不再生成 `preview.png` 整页长截图。

脚本按这个顺序做事，改动时保持产物名不变：

1. `工具/check-voice.mjs <日期>` 验立意稿先于文案、拦截标题党孤立短残句钩子与跨条套话。排在任何生成之前，不过 `exit 1`。
2. `python3 工具/review.py <日期> --check` 一次性跑 `check-post.mjs`、`.codebuddy/skills/everynews-editorial/scripts/lint.mjs`（快讯与长文分开跑）、刷新 `工具/复审/<日期>.md` 并校验回执表四行，失败则 `exit 1`，不覆盖线上页面。
3. 若传入 `slug...`，跑 `工具/check-layouts.mjs` 与 `工具/make.sh` 渲染卡片（支持 4:5 竖版与 16:9 横版画框）并归档到 `<日期>/配图/`。
4. `工具/make-public.mjs <日期>` 将配图自动转码为外置轻量 WebP（`cards/<YYYYMMDD>/*.webp`）并生成根目录 `<YYYYMMDD>.html`（约 25 KB，读报笔记体单一正文 + 事实表 + 两篇长文讲解），接着 `工具/make-index.mjs` 生成 `issues.js`、把最新一期写进 `index.html`、生成 `archive.html`。历史 `<YYYYMMDD>.html` 不再被反复改写。
5. `工具/ledger.mjs <日期>` 直接从 `<日期>/文案.md` 回写 `选题台账.md`。
6. 删掉仓库根目录里其他 `YYYY-MM-DD` 目录。当天目录只留 `文案.md`、`配图/` 与可选的 `X热议.md`。
7. `工具/handoff.py <日期>` 刷新 `HANDOFF.md` 的自动段。人工段不要让脚本覆盖。

站点契约：根路径 `index.html` 就是当日成果的完整内容，顶部下拉通过 `issues.js` 动态切换任意一期；`archive.html` 保留按日期与标题的筛选；往期 `<YYYYMMDD>.html` 与 `cards/<YYYYMMDD>/` 一律保留。日期目录不入库。

跑 `./出稿.sh` 会删除其他日期目录。只在明确要出那一天的稿时跑。

写稿规范统一调用 `.codebuddy/skills/everynews-editorial/SKILL.md` 与 `WRITING.md`。

## 不要提交密钥，也不要编造验证记录

- 不提交令牌、cookie、`.env`、API key、Playwright 登录态。`.playwright-cli/` 已在 `.gitignore`。
- 文档只写仓库里核对过的范围：本地 `node`、`python3`、`playwright-cli`（渲染新卡片时用）。云端 CI 与社交账号自动发布，没有端到端记录就不写成已测过。
- 公开说明里的 Issue 编号只引用已经存在的 Issue。没有就写「请开一个 Issue」，不编造号码。
- 结构取舍写进 `docs/decisions.md`，否决项写进 `docs/declined.md`。
- 红线与模具检查命中时只改稿，不许调阈值放行，也不许事后补立意稿倒填顺序。
