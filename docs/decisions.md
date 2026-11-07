# 决策

已经写进仓库的结构选择。否决项见 [declined.md](declined.md)。

## 双文件双语

- 日期：2026-11-05
- `README.md` 用简体中文，`README.en.md` 用英文，章节顺序一致。
- 切换行固定。中文页：`**中文** | [English](README.en.md)`。英文页：`[中文](README.md) | **English**`。
- 深文档（`WRITING.md`、`SHORTNEWS-V1.md`、`SOURCES.md`、`工具/PROMPT.md` 等）保持中文。英文 README 在链接处标 `(in Chinese)`。

## README 顶部三件套与文末文件表

- 日期：2026-11-05
- 标题下依次是：一句价值主张、语言切换行、页内锚点（它能做什么、快速开始、目录，以及验证范围等）。
- 文件清单放在文末的 `<details>` 表格里，中英文各写一份。

## 本地优先的出稿路径

- 日期：2026-11-07 更新
- 出稿、闸门、单文件页都在本机完成，依赖 `node`、`python3`、`playwright-cli`。
- 出稿契约是 `./出稿.sh <YYYY-MM-DD> <slug...>`。当天目录只留 `文案.md`、`配图/`、`预览图.png`、`X热议.md`；复审回执在 `工具/复审/<日期>.md`。
- `make-public.mjs` 出根目录 `<YYYYMMDD>.html`，`make-index.mjs` 注入期次导航、同步 `index.html` 并生成 `archive.html`，两者都由 `出稿.sh` 自动调用。主页是当日成果的完整内容，往期公开页一律保留。
- 预览图是公开页的整页截图。旧的 `preview.html`、卡片拼图与 `site/` 多期站方案已移除。
- GitHub Pages 只托管已经生成的静态 HTML。

## 公开说法只覆盖核对过的范围

- 日期：2026-11-05
- README 的「验证范围 / What's verified」只写本地 node / python / playwright 路径。
- 在线示例是 GitHub Pages 上的静态页。云端 CI，以及 X 或 Threads 账号发布，仓库里没有端到端记录，文档里就不写成已测过。
- Issue 编号只在该 Issue 已经存在时写进 README。
