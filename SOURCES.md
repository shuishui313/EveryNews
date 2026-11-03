# 信息源清单（v1）

配套 `WRITING.md` §2。**级别 = 可信度 + 一手程度**，引用只能用到第 5 级；第 6 级只当线索；第 9 级只查标题。

原来的四个站按级别归位：`blog.google` 升到 L1；`news.smol.ai` 降为 L6 线索（不再引用）；`every.to`（Dan Shipper）归到 L6 落地视角；`theaivalley` 归到 L6 聚合。

---

## L1 · 官方博客 / 新闻稿

| 源 | 链接 | 抓什么 |
|---|---|---|
| OpenAI | https://openai.com/news | 模型/产品发布、企业版更新 |
| Anthropic | https://www.anthropic.com/news | 模型、Claude 产品、安全与政策 |
| Google | https://blog.google/technology/ai/ | 消费级 AI 功能上线 |
| Google DeepMind | https://deepmind.google/discover/blog/ | 研究模型（Genie/Gemini/AlphaX） |
| Meta AI | https://ai.meta.com/blog/ | Llama、Muse、开源权重 |
| Mistral | https://mistral.ai/news | 欧洲开源模型与商用条款 |
| xAI | https://x.ai/news | Grok、算力 |
| Hugging Face | https://huggingface.co/blog | 库、推理栈、数据集 |
| GitHub Changelog | https://github.blog/changelog/ | Copilot / Actions / 平台级改动 |

判定：官方通稿里**只有一句能用**——那句带数字的。其余都是形容词。

## L2 · 文档 / 更新记录（差异点最密）

| 源 | 位置 | 为什么值得翻 |
|---|---|---|
| OpenAI API Changelog | platform.openai.com 文档内 | 价格、限额、弃用、beta 开关 |
| Claude Release Notes | Claude 开发者文档内 | 上下文长度、工具调用、缓存策略 |
| Gemini API Changelog | ai.google.dev 文档内 | 定价表、区域可用、配额 |

判定：中文号基本不翻这里。**定价变化、限额调整、弃用通知**是最容易做出差异的三个点，因为它们改的是「公司能不能用、成本多少」。

## L3 · 论文

| 源 | 链接 | 抓什么 |
|---|---|---|
| HF Daily Papers | https://huggingface.co/papers | 当天被投票的论文（附讨论） |
| arXiv cs.AI | https://arxiv.org/list/cs.AI/recent | 通用 AI |
| arXiv cs.CL | https://arxiv.org/list/cs.CL/recent | 语言模型 |

判定：只看 abstract + limitations + 表格里的具体数字。**limitations 章节是差异点金矿**，因为转述的人只抄结论。

## L4 · X 账号（引用必须带帖子链接）

- 官方：@OpenAI、@AnthropicAI、@GoogleDeepMind、@AIatMeta、@MistralAI、@Alibaba_Qwen、@deepseek_ai、@Kimi_Moonshot
- 产品/研究：@sama、@OfficialLoganK、@karpathy
- 论文与开源发现：@_akhaliq

判定：官方账号用来拿「原话 + 时间戳」；研究员个人账号用来拿「没写进通稿的限制」。**不能只截二手转述图**。

## L4.5 · 视频原作者源（演示类选题专用）

一段演示视频算几级，**取决于最早发布者是谁，不取决于我在哪看到它**。

| 类型 | 级别 | 能不能引用 |
|---|---|---|
| 原作者本人（IG / TikTok / YouTube / 个人 X / 个人博客） | **L4** | 能。引用只认这一条 |
| 机构官方 demo（大学实验室如 ETH Zurich RSL、机器人公司、OpenAI / Google / Meta 官方号） | **L1** | 能 |
| 模型视频合集站（claudevideo.org、reclip.io 等） | L8 | 不能。只用它找到原帖链接，再去原帖 |
| 搬运大号（X / Threads / 小红书上的搬运转发） | L8 | 不能。只当线索，并核对它有没有加戏 |

硬规则：

- **找不到最早发布者，不进候选池。** 宁可少一条，不写「网传」。
- 不下载、不二次上传别人的视频；X 用引用转发，Threads 发截图 + 原帖链接。
- 截图必须露出来源账号；主帖不写模型名，除非原帖自己写了。
- 搬运号说「某模型做到了」而原帖没说模型的，纠正这一点就是差异点。

## L5 · GitHub

- Trending：https://github.com/trending
- Releases：github.com/openai、github.com/anthropics、github.com/QwenLM、github.com/deepseek-ai、github.com/MoonshotAI

判定：release notes 里的 breaking change、默认参数变更、SDK 行为改动，都是「落地会不会崩」的信号。

## L5.5 · HF 模型卡（新模型常早于新闻）

- Trending 模型：https://huggingface.co/models?sort=trending
- 重点组织：tencent、Qwen、deepseek-ai、moonshotai、MiniMaxAI、black-forest-labs

判定：模型卡上的**延迟指标、参数量、许可证、可商用与否**，通常在新闻稿之前就在页面上写好了。开源模型尤其如此，先看模型卡再等官方通稿。

## L6 · 落地视角（差异点主来源）

| 源 | 链接 | 用来回答 |
|---|---|---|
| Simon Willison | https://simonwillison.net / @simonw | 这东西实际跑起来什么样、有哪些坑与安全事故 |
| Ethan Mollick | https://www.oneusefulthing.org / @emollick | AI 进了组织之后，哪个岗位的流程变了 |
| Latent Space | https://www.latent.space / @swyx | 工程师侧的实现代价、架构选择 |
| Anthropic Economic Index 等使用数据报告 | Anthropic 官网研究页 | 企业到底怎么用，有一手统计 |

判定：这里给的不是新闻，是**判断的原料**。差异点优先从这里长出来——「谁的哪个流程被改、卡在哪一步」。

## L7 · 一线媒体（只补时间、金额、原话）

Reuters、Bloomberg、The Information、TechCrunch、The Verge。

判定：可以用它的金额和人物原话，**不能用它的框架**。转述口径常常比原文强，要回一手核。

## L8 · 线索发现（不当引用源）

- AINews：https://news.smol.ai
- Techmeme：https://www.techmeme.com
- Hacker News：https://news.ycombinator.com

判定：只用来「今天有什么」。进候选池前必须回到 L1–L5 找到原始出处，找不到就丢。

## L9 · 中文侧差异检查（只查标题）

- 机器之心：https://www.jiqizhixin.com
- 量子位：https://www.qbitai.com
- 36氪：https://36kr.com
- X 中文搜索：关键词 + `lang:zh`，切「最新」

判定：只看标题和摘要，判断有没有被写烂。**已知局限**：公众号正文抓不到，粒度只到标题层。这一步的产出是一行判断，不是引用。

## L10 · 原典（读的，可照做）

配 `WRITING.md` §14。判据不是「新」，是**看完能不能照做**。这一档是根，密度高但读起来干。

| 源 | 位置 | 抓什么 |
|---|---|---|
| OpenAI Cookbook | cookbook.openai.com | 可复现的 recipes，有参数和坑 |
| Hugging Face Course / Agents Course | huggingface.co/learn | 带 notebook 的免费课，入门到 agent |
| DeepLearning.AI 短课 | deeplearning.ai/short-courses | 1–2 小时一节，与各家官方合办 |
| Andrej Karpathy | YouTube | LLM 全景、从零实现，讲解密度最高 |
| 3Blue1Brown / 李沐 动手学深度学习 | YouTube / B 站 | 讲原理的中文和外文最佳选项 |
| AI Engineer 大会 | youtube.com/@aiDotEngineer | 工程落地演讲，一集解决一个问题 |
| Stanford CS229 / CS224N、MIT 6.S191 | 公开课页 | 系统性补齐基础 |
| Simon Willison / Lilian Weng / Chip Huyen / Hamel Husain | 各自博客 | 踩坑、评测、设计模式，判断原料最密 |
| Dwarkesh / Latent Space / TWIML / 张小珺 | 播客 | 长访谈，讲决策过程多于讲结论 |
| MCP 官方文档、Vercel AI SDK 文档 | 官网 | 接口规范与工程范式，中文几乎没人翻 |

判定：**官方 cookbook 的代码要自己跑一遍再写，没跑过就标「未实测」。**

## L10.5 · 讲解源（看的听的，学完再讲）

配 `WRITING.md` §14。这档是**别人替我们消化过一遍**的内容，最适合「学完再讲」。判据是：讲者在一线、有具体案例、有可复述的结构。

| 源 | 位置 | 2026-10 实测 | 拿来做什么 |
|---|---|---|---|
| AI Engineer 大会（纽约/旧金山） | ai.engineer + YouTube | 纽约场 10-12 至 10-14 刚结束，官网有逐场 talks 页 | 工程落地演讲，一场解决一个具体问题 |
| Latent Space（视频版） | latent.space + YouTube | 10-21 讲 Tenex 怎么给 Fortune 2000 做 AI-native SDLC（43 分钟）；10-08 讲 Periodic Labs 的自主实验室 | 企业落地、token 经济、架构取舍 |
| 张小珺商业访谈录 | 小宇宙 / 各播客客户端 | 10-15 与 Dyna Robotics 创始人 Lindon Gao 聊 2 小时 51 分；8-26 领读 Kimi K3 技术报告 | 中文里最适合「学完再讲」的长访谈，尤其中文区没人讲的技术报告领读 |
| Dwarkesh Podcast | dwarkesh.com + YouTube | 9-17 Noam Brown；9-11 Schulman/Millidge/O'Neill 辩论递归自我改进；双周更，AI 主题约每月 1–2 集 | 只做「为什么这么设计」，不做「怎么做」 |
| 官方 YouTube | Anthropic / OpenAI / Google DeepMind | 产品演示与开发者日 | 产品实操，配合 L1 公告看 |
| 原理长课 | Karpathy、3Blue1Brown、李沐《动手学深度学习》 | 长期有效 | 季度级重读，做「讲明白」的基本功 |

**转述三条硬规则（违反就成搬运）**

1. **给位置**：写到「从 12:30 开始讲 X」这种粒度，不给时间位置不算讲明白。
2. **加东西**：每篇至少三条自己的补充——一个反例、一个适用边界、一个我没找到答案的问题。没有补充就不发这篇。
3. **标来源**：正文里写清「框架来自谁」，别人观点与自己判断分开，不把别人的结论说成自己的。

**配额**：每周 2 篇干货里，**1 篇讲解源 + 1 篇原典**，比例固定。全讲解会变成翻译搬运，全原典又太干。

**为什么不接 follow-builders 的播客与博客 feed**：实测 2026-10-29，podcast feed 14 天窗口只有 1 集，blog feed 72 小时 0 条，密度撑不起日更。它的 X feed 接（见下 6.5），另两份不接。

---

## 每天怎么跑（顺序固定）

1. **L8 扫 30 秒**：smol.ai / Techmeme / HN，记下 5–8 个「今天可能在动」的点。
2. **L1 逐个核**：只打开昨天到今天发过的条目，没发的直接跳过。
3. **L2 翻 3 个 changelog**：有变更就单独记，这一条经常能顶掉一条普通的发布新闻。
4. **L3 看 papers 首屏**：挑 1–2 篇有具体数字的。
5. **L4 补原话**：官方帖子拿时间戳，研究员帖子拿限制。
6. **L6 找落地角度**：Willison / Mollick / Latent Space 有没有人已经踩过。
6.5 **建造者雷达（follow-builders 的 X feed）**：GET `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json`，取 `generatedAt` 前后 24 小时的条目，按 `replies + likes` 排序取前 5，写进当天 `X热议.md` 的「在传」段。分级：`tweets[].text` + `url` 算 **L4**（可引用，带原帖链接）；feed 整体算 **L8**（只当线索）；它 `prompts/` 里的摘要一律**不许引用**。配额：候选池每天最多 1 条来自这里；官方账号（@claudeai、@GoogleLabs 等）走 L1，不占配额。已实测：feed 每天 06:32 UTC 生成一次快照，18 个账号约 39 条，100% 带原帖 URL 和互动数。
7. **L9 查重**：中文侧发过没有，撞不撞。
8. 汇总成 10 条候选，每条写：**级别 + 一手链接 + 一个数字 + 落地一句话 + 差异点**。

## 记录格式（候选池每条一行）

```
[L1] Google DeepMind · Genie 4 研究预览 · 七条局限 · 10-27 · https://deepmind.google/blog/genie-4...
落地：影视预演和游戏原型的最早一环被改；卡在版权与算力成本
差异：中文侧只写「能生成游戏」，没人提官方自列的七条局限（原文第 6 段）
```

## 已知失效与限制

- X 时间线与搜索需要登录态，抓不到；只能拿单条帖子链接。
- 微信公众号正文不可抓，L9 只能判标题。
- Hugging Face Daily Papers 一天内多次刷新，引用要记抓取时刻。
- 文档类 changelog 常有 A/B 灰度，页面上写的可用范围不一定对所有人开放，写的时候标注。
- follow-builders 的 feed 是公开 raw JSON，任何中文号都能拉同一份，**同质化风险高**：差异只能来自回原帖核实 + 自己的判断，不能靠 feed 本身。
- follow-builders 每天 06:32 UTC 只生成一次快照，傍晚之后的帖子要等第二天；名单由作者维护，含作者本人与官方账号，要过滤自推和营销。
