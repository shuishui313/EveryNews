# EveryNews

一条本地轻量流水线，把每天的 AI 一手新闻做成好读的静态网页：3–6 条读报笔记体快讯（外置 WebP 配图卡 + 单一连贯正文 + 折叠事实表 + 原始来源）配两篇深度讲解长文，打开网址就能读。
示例：https://shuishui313.github.io/EveryNews/index.html

**中文** | [English](README.en.md)

[它能做什么](#它能做什么) · [为什么用它](#为什么用它) · [快速开始](#快速开始) · [主页与期次切换](#主页与期次切换) · [放到自己的 GitHub Pages](#放到自己的-github-pages) · [改成你自己的](#改成你自己的) · [验证范围](#验证范围) · [已知限制](#已知限制) · [目录](#目录)

## 它能做什么

跑一轮出稿，你会得到：

| 产物 | 说明 |
|---|---|
| 读报笔记体快讯 | 3–6 条（常规 6 条），繁体中文，主干早到、一气呵成（90–280 字，1–3 段），告别标题党短残句与双栏复写 |
| 外置 WebP 配图卡 | 深紫暖白设计体系，每条 1–3 张弹性卡片（支持 4:5 竖版与 16:9 横版画框），自动转码至 `cards/<YYYYMMDD>/*.webp`，总体积比旧内联 PNG 小约 90% |
| 事实表 | 每条一表，时间、主体、数字、来源、未确认边界逐行写清，网页默认折叠 |
| 讲解长文 | 每天固定两篇，每篇 600–950 汉字，顺着问题链把原理、成本与边界讲透 |
| 轻量公开页 | `<YYYYMMDD>.html` 本体仅约 25 KB，配图懒加载，点击可放大预览 |
| 主页与归档页 | `index.html` 展示最新一期完整内容；`archive.html` 支持日期与标题筛选；`issues.js` 驱动全站期次切换，历史 HTML 永不重改 |

## 为什么用它

- **自有编辑台文风（`everynews-editorial`）**。拆掉社媒短钩子分段与组合填空模具，像懂行同行面对面拆解一手材料。
- **硬红线自动拦截**。提示性冒号、破折号、翻案抬价句式、同构排比、大纲报数与商业黑话全部由原生 Node 检查器自动拦截。
- **轻量、增量、易维护**。HTML 与外置 WebP 分离，改文案重跑只需 3 秒且 Git 只产生几行纯文本 diff；`issues.js` 让往期页面零改动。
- **纯本地运行**。依赖 `node`、`python3`（渲染新卡片时加 `playwright-cli`），没有云端绑定。

## 快速开始

前置：node 18+、python3（含 Pillow）、playwright-cli（仅渲染新卡片时使用）。

```bash
git clone https://github.com/<你的用户名>/EveryNews.git
cd EveryNews

# 完整出稿（含卡片渲染）
./出稿.sh <YYYY-MM-DD> <slug...>

# 仅改文案重跑（直接复用已有配图，秒级完成）
./出稿.sh <YYYY-MM-DD>
```

生成 `<YYYYMMDD>.html`（约 25 KB）与 `cards/<YYYYMMDD>/*.webp`（18 张卡合计约 350–450 KB），同时刷新 `issues.js`、`index.html`、`archive.html`、`选题台账.md` 与 `HANDOFF.md`。

## 主页与期次切换

网站根路径 `/` 就是当日成果，打开直接看到当天快讯、配图卡片、事实表与两篇长文讲解。每期页面顶部都有一条期次导航，通过根目录 `issues.js` 动态填充全部期次下拉，旁边两个链接分别回到当日成果和进入全部期次。

`archive.html` 支持期次下拉、指定日期、标题关键词三种筛选方式。历史期次 HTML 注入一次静态脚本引用后不再被重复改写。

每天的内容留在根目录 `<YYYYMMDD>.html`、`cards/<YYYYMMDD>/` 与 `选题台账.md` 中；日期工作目录只保留当天。

## 放到自己的 GitHub Pages

仓库推上去之后，进 Settings → Pages → Source 选 `Deploy from a branch`（main / root），链接就是：

```
https://<你的用户名>.github.io/<仓库名>/                 # 当日成果，顶部可切换期次
https://<你的用户名>.github.io/<仓库名>/archive.html    # 全部期次，按日期筛选
https://<你的用户名>.github.io/<仓库名>/YYYYMMDD.html    # 指定某一期
```

在线示例：<https://shuishui313.github.io/EveryNews/>，全部期次在 <https://shuishui313.github.io/EveryNews/archive.html>，单期如 <https://shuishui313.github.io/EveryNews/20261124.html>

每天跑一次 `出稿.sh`，把新增的 `<YYYYMMDD>.html`、`cards/<YYYYMMDD>/`、`index.html`、`archive.html`、`issues.js`、`选题台账.md` 推上去即可。Pages 托管纯静态文件，没有云端构建。

## 改成你自己的

编辑台文风与红线检查器在 `.codebuddy/skills/everynews-editorial/`，产物与校验契约在 `WRITING.md`，卡片版式在 `工具/PROMPT.md`，来源分级在 `SOURCES.md`。改掉这几份，同一条流水线不挑题材，产出的就是你自己的每日简报。

## 验证范围

本仓库站得住的是本机路径：`node`、`python3` 与 `playwright-cli`。`./出稿.sh` 一次跑完顺序自检、红线复审闸门、卡片渲染、外置 WebP 转码、公开页、主页/归档页、台账和交接。上面的在线示例是已经放在 GitHub Pages 上的静态页面。云端 CI 与社交账号自动发布，仓库里没有端到端记录。

## 已知限制

仓库里还没有公开 Issue。这几件值得各开一条，开好后把链接补回这里：`工具/grab.sh` 对部分动态渲染站点会抓不到正文图；早期 14 期历史页面（20261103–20261123）仍保留当时的内联 PNG 形态，自 20261124 起切换为外置 WebP。链接只指向已经存在的 Issue。

## 授权

MIT

## 目录

<details>
<summary>文件表</summary>

| 路径 | 管什么 |
|---|---|
| `README.md` | 简体中文说明 |
| `README.en.md` | 同一份说明的英文 |
| `AGENTS.md` | 代理改这个仓库时要守的约定 |
| `docs/decisions.md` | 已经采纳的结构决策 |
| `docs/declined.md` | 已经否决的做法 |
| `index.html` | 当日成果主页，最新一期的完整内容，顶部可切换期次 |
| `archive.html` | 全部期次归档页，可按日期与标题筛选 |
| `issues.js` | 全站期次清单与顶部切换脚本，由 `make-index.mjs` 生成 |
| `<YYYYMMDD>.html` | 单期静态公开页，往期一律保留 |
| `cards/<YYYYMMDD>/` | 当期外置 WebP 配图目录 |
| `.codebuddy/skills/everynews-editorial/` | EveryNews 原创编辑台写作规范与原生红线检查器 `lint.mjs` |
| `WRITING.md` | 产物契约、事实核验、选题标准与校验流程 |
| `SHORTNEWS-V1.md` | 五阶段顺序与目录契约 |
| `SOURCES.md` | 去哪找、哪一级能引用 |
| `CODEBUDDY.md` | 每轮开工必做的几步 |
| `HANDOFF.md` | 跨天交接。自动段由脚本刷新 |
| `出稿.sh` | 出稿入口 |
| `工具/PROMPT.md` | 配图卡片版式与渲染规范 |
| `工具/render.mjs` | 卡片 HTML 渲染（支持 1080×1350 竖卡与 1440×810 横框） |
| `工具/make.sh` | 单套卡片截图并生成 WebP |
| `工具/grab.sh` | 一手源正文配图抓取 |
| `工具/check-layouts.mjs` | 卡片版式与图源检查 |
| `工具/check-voice.mjs` | 立意顺序、短残句钩子拦截与跨条套话检查 |
| `工具/check-post.mjs` | 快讯与长文结构篇幅校验 |
| `工具/review.py` | 复审闸门与改稿回执生成 |
| `工具/make-public.mjs` | 外置 WebP 转码与轻量单页生成 |
| `工具/make-index.mjs` | 生成 `issues.js`、同步 `index.html` 与 `archive.html` |
| `工具/ledger.mjs` | 回写 `选题台账.md` |
| `工具/handoff.py` | 刷新 `HANDOFF.md` 自动段 |
| `选题台账.md` | 每期选题去重记录 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 拉取请求要写的三件事 |

</details>
