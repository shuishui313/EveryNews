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

1. `工具/check-layouts.mjs` 查版式和图源。全批纯卡片要显式加上 `ALLOW_CARD_ONLY=1`。
2. 对每个 slug 跑 `工具/make.sh`，渲染 1080×1350。
3. 归档到 `<日期>/配图/NN-slug-MM.png`。已有的 `<日期>/文案.md` 留在原地。根目录或 `稿件/` 里的 `<日期>.md` 会挪进 `<日期>/文案.md`。
4. `工具/preview.mjs` 写 `<日期>/preview.html`，再用 playwright-cli 截 `<日期>/预览图.png`。预览服务端口默认 `PORT=8778`。
5. `工具/ledger.mjs` 回写 `选题台账.md`。
6. 当天有 `文案.md` 时跑 `工具/check-post.mjs`，再跑 `工具/review.py`。`python3 工具/review.py <日期> --check` 失败则 `exit 1`，这一轮不算出完。没有文案就跳过闸门，图仍然归档。
7. 删掉仓库根目录里其他 `YYYY-MM-DD` 目录，并清掉本批之外的 `工具/out` 中间图。
8. `工具/handoff.py` 刷新 `HANDOFF.md` 的自动段。人工段不要让脚本覆盖。

公开页是另一条命令：`node 工具/make-public.mjs [YYYY-MM-DD]`，写出 `<YYYYMMDD>.html`。不要把它并进出稿脚本，除非两份 README 和 `SHORTNEWS-V1.md` 一起改。

跑 `./出稿.sh` 会删除其他日期目录。只在明确要出那一天的稿时跑。

`WRITING.md` 是唯一规则表。`.codebuddy/skills/human-writing/` 只引用，不改写成另一套文风。

## 不要提交密钥，也不要编造验证记录

- 不提交令牌、cookie、`.env`、API key、Playwright 登录态。`.playwright-cli/` 已在 `.gitignore`。
- `工具/img/` 是抓来的新闻配图，不入库。
- 文档只写仓库里核对过的范围：本地 `node`、`python3`、`playwright-cli`。云端 CI，以及 X 或 Threads 账号发布，没有端到端记录就不写成已测过。
- 公开说明里的 Issue 编号只引用已经存在的 Issue。没有就写「请开一个 Issue」，不编造号码。
- 结构取舍写进 `docs/decisions.md`，否决项写进 `docs/declined.md`。
- `工具/site.mjs` 默认输出 `site/`，并且会先删掉整个输出目录。不要执行 `node 工具/site.mjs --out docs`，那会删掉 `docs/` 里的决策记录。
