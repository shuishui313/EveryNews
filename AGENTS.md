# AGENTS.md

Agents editing this repo follow the rules below. User-facing prose lives in both `README.md` and `README.en.md`. The writing rules stay in `WRITING.md`.

## 用户可见的说明，两份 README 一起改

- `README.md` 是简体中文，`README.en.md` 是英文，章节顺序保持一致。
- 切换行不要改写法：中文页是 `**中文** | [English](README.en.md)`，英文页是 `[中文](README.md) | **English**`。
- 语言切换用这两个文件，不用折叠块。折叠块只留给文末文件表。
- 英文页链到没有英文孪生文件的深文档（`WRITING.md`、`SHORTNEWS-V1.md`、`SOURCES.md`、`工具/PROMPT.md`、`HANDOFF.md` 等）时，标 `(in Chinese)`。
- 改了命令、产物名、字数区间或验证范围，两份 README 放在同一次提交里。

## 不要拆 `出稿.sh` 的契约

入口是仓库根目录的 `./出稿.sh <YYYY-MM-DD> <slug...>`。至少给一个 slug。日期必须是 `YYYY-MM-DD`。每个 slug 对应 `工具/sets/<slug>.json`。

脚本按这个顺序做事，改动时保持产物名不变：

0. `工具/check-voice.mjs <日期>` 验立意稿先于文案、六句与首句对得上，再查 AI 味。排在任何渲染之前，不过 `exit 1`。写稿阶段自己也要先跑一次。
1. `工具/check-layouts.mjs` 查版式和图源。全批纯卡片要显式加上 `ALLOW_CARD_ONLY=1`。
2. 对每个 slug 跑 `工具/make.sh`，渲染 1080×1350。
3. 归档到 `<日期>/配图/NN-slug-MM.png`。已有的 `<日期>/文案.md` 留在原地。根目录或 `稿件/` 里的 `<日期>.md` 会挪进 `<日期>/文案.md`。
4. `工具/make-public.mjs` 出根目录 `<YYYYMMDD>.html`，接着 `工具/make-index.mjs` 给每期页面注入带标记的期次导航、把最新一期写进 `index.html`、生成 `archive.html`。
5. 用 playwright-cli 截 `<YYYYMMDD>.html` 整页图到 `<日期>/预览图.png`，同步根目录 `preview.png`。预览服务端口默认 `PORT=8778`。预览图是公开页截图，不是卡片拼图。
6. `工具/ledger.mjs` 回写 `选题台账.md`。
7. 当天有 `文案.md` 时跑 `工具/check-post.mjs`，再跑 `工具/review.py`。`python3 工具/review.py <日期> --check` 失败则 `exit 1`，这一轮不算出完。回执写在 `工具/复审/<日期>.md`，不进当天目录。
8. 删掉仓库根目录里其他 `YYYY-MM-DD` 目录，清掉本批之外的 `工具/out` 中间图。当天目录只留 `文案.md`、`配图/`、`预览图.png`、`X热议.md`。
9. `工具/handoff.py` 刷新 `HANDOFF.md` 的自动段。人工段不要让脚本覆盖。

站点契约：根路径 `index.html` 就是当日成果的完整内容，顶部下拉可切任意一期；`archive.html` 保留按日期与标题的筛选；往期 `<YYYYMMDD>.html` 一律保留，是每天内容的留存载体。日期目录不入库。

跑 `./出稿.sh` 会删除其他日期目录。只在明确要出那一天的稿时跑。

`WRITING.md` 是唯一规则表。`.codebuddy/skills/human-writing/` 只引用，不改写成另一套文风。

## 不要提交密钥，也不要编造验证记录

- 不提交令牌、cookie、`.env`、API key、Playwright 登录态。`.playwright-cli/` 已在 `.gitignore`。
- `工具/img/` 是抓来的新闻配图，不入库。
- 文档只写仓库里核对过的范围：本地 `node`、`python3`、`playwright-cli`。云端 CI，以及 X 或 Threads 账号发布，没有端到端记录就不写成已测过。
- 公开说明里的 Issue 编号只引用已经存在的 Issue。没有就写「请开一个 Issue」，不编造号码。
- 结构取舍写进 `docs/decisions.md`，否决项写进 `docs/declined.md`。
- `check-voice.mjs` 命中时只改稿。不许改阈值、不许加放行开关、不许事后补一份立意稿倒填顺序。那个脚本故意没有阈值参数。
- 复审回执人工表是改稿记录，不是写前计划表。先按 `revision.md` 三遍改，再填「改了哪一句、怎么改」。
