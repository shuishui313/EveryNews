# EveryNews

一条本地流水线，把每天的 AI 新闻做成能发的图文包：六条选题，每条三张 1080×1350 竖版卡，配好 X 主帖、Threads 文案、事实表和两篇讲解长文，再压成一个拿到网址就能开的单文件网页。

**中文** | [English](README.en.md)

[它能做什么](#它能做什么) · [为什么用它](#为什么用它) · [快速开始](#快速开始) · [改成你自己的](#改成你自己的) · [验证范围](#验证范围) · [已知限制](#已知限制) · [目录](#目录)

![当天产出预览](preview.png)

## 它能做什么

跑一轮出稿，你会得到：

| 产物 | 说明 |
|---|---|
| 18 张竖版卡 | 六条选题 × 三张，14 种版式，六套首图自动查重不撞版 |
| X 主帖 + Threads 文案 | 繁体中文，零冒号零破折号。X 主帖 120–200 字；Threads 规则表目标 150–250 字，闸门放行 120–260 字 |
| 事实表 | 每条一表，时间、主体、数字、来源、未确认边界逐行写清 |
| 讲解长文 | 两篇 600–900 汉字，读完能照做 |
| 单文件公开页 | 图片全部内联，一个 HTML 文件扔到任何静态托管就能访问 |

## 为什么用它

- **规则驱动，风格稳定**。写什么、怎么写、交出什么，全部写在一份规则表里，谁跑都是同一个味道。
- **闸门质检**。字数区间、冒号破折号、来源层级、版式查重，以及大部分翻案腔，不过闸门出不了稿。
- **一条命令出稿，一条命令出公开页**。渲染、归档、台账、复审回执、交接文档一次跑完。
- **纯本地运行**。node + python + playwright，没有云端依赖，产出归你自己。

## 快速开始

前置：node 20+、python3、playwright-cli（卡片截图渲染用）。

```bash
git clone https://github.com/<你的用户名>/EveryNews.git
cd EveryNews

# 出一轮当天的稿（渲染、闸门、归档、交接一次跑完）
./出稿.sh <YYYY-MM-DD> <slug...>

# 把当天产出压成单文件公开页
node 工具/make-public.mjs <YYYY-MM-DD>   # 不给日期就取最新一期
```

生成 `<YYYYMMDD>.html`，图片内联、CSS 内联，5 MB 左右，单文件拿走就能开。

## 放到自己的 GitHub Pages

仓库推上去之后，进 Settings → Pages → Source 选 `Deploy from a branch`（main / root），链接就是：

```
https://<你的用户名>.github.io/<仓库名>/YYYYMMDD.html
```

在线示例：<https://shuishui313.github.io/EveryNews/20261103.html>

每天跑完出稿和 make-public，push 一次就是新一期。Pages 托管的是已经生成的静态文件。

## 改成你自己的

写法规则在 `WRITING.md`，卡片版式在 `工具/PROMPT.md`，来源层级在 `SOURCES.md`，文风本体在 `.codebuddy/skills/human-writing/`（规则里称作 human-writing）。改掉这几份，同一条流水线不挑题材，产出的就是你自己的栏目。

## 验证范围

本仓库站得住的，是本机这条路径：`node`、`python3`、`playwright-cli`。`./出稿.sh` 渲染卡片、跑闸门、归档；`node 工具/make-public.mjs` 压出单文件页。上面的在线示例是已经放在 GitHub Pages 上的静态 HTML。云端 CI，以及用 X 或 Threads 账号把稿发出去，仓库里没有端到端记录。

## 已知限制

仓库里还没有公开 Issue。这几件值得各开一条，开好后把链接补回这里：媒体配图的版权口径还没定；`工具/grab.sh` 对部分站点会超时；「不在 A，在 B」「不是 A，是 B」这类翻案腔，闸门只提醒、不拦截；Threads 字数上，规则表目标是 150–250，闸门放行 120–260。链接只指向已经存在的 Issue。

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
| `WRITING.md` | 写什么、怎么写、交出什么，唯一规则表 |
| `SHORTNEWS-V1.md` | 短文六阶段的先后顺序与产物契约 |
| `SOURCES.md` | 去哪找、哪一级能引用 |
| `CODEBUDDY.md` | 每轮开工必做的几步 |
| `HANDOFF.md` | 跨天交接。自动段由脚本刷新 |
| `出稿.sh` | 出稿入口。日期、slug、目录名都是契约 |
| `工具/PROMPT.md` | 配图版式与渲染 |
| `工具/render.mjs` | 卡片渲染（1080×1350） |
| `工具/make.sh` | 单套渲染并截图 |
| `工具/review.py` | 出稿闸门与复审回执 |
| `工具/check-post.mjs` | 文案篇幅与句式自查 |
| `工具/check-layouts.mjs` | 版式与图源检查 |
| `工具/grab.sh` | 一手源配图抓取 |
| `工具/preview.mjs` | 本地总览页 |
| `工具/make-preview.py` | 整页缩略图 |
| `工具/make-public.mjs` | 单文件公开页 |
| `工具/site.mjs` | 多期静态站，默认写到 `site/` |
| `工具/ledger.mjs` | 回写选题台账 |
| `工具/handoff.py` | 刷新 `HANDOFF.md` 自动段 |
| `.codebuddy/skills/human-writing/` | 文风本体。规则里称作 human-writing，只引用不改写 |
| `选题台账.md` | 每期选题与实际数据回写 |
| `.github/PULL_REQUEST_TEMPLATE.md` | 拉取请求要写的三件事 |

</details>
