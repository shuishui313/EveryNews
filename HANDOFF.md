# HANDOFF · V2

> 每次收工写，每次开工先读。自动段由 `工具/handoff.py` 重写，人工段自己填。
> 规则与流程版本 V2（`WRITING.md` 内部沿革编号是 v6，同一个东西）。

## 当前进度

<!-- AUTO:START -->
最后更新　2026-11-03 18:47　·　批次 2026-11-03　·　规则与流程 V2

- 目录　`2026-11-03/`　文案 有 · 配图 18 张 · 预览图 有 · 复审 有
- 条目　① Anthropic 修訂版 S-1：虧損比營收還多　② OpenAI 合併額度池：12 月起按 Token 計量　③ xAI 給 Grok 文本加隱形水印　④ 蘋果 × 阿里：國行 Apple 智能定檔　⑤ Meta 與傅利葉合作造出人形機器人原型 Max　⑥ 四家廠商統一 robots.txt 訓練退出標記
- 讲解　2 篇（講① 招股書裡的 AI 公司怎麼算賬　講② 兩行配置管住 AI 訓練）
- 配图　带图 0 套（无）· 纯卡片 6 套（anthropic-s1、openai-token、grok-watermark、apple-qwen、meta-max、robots-optout）
- 闸门　`python3 工具/review.py 2026-11-03 --check`　已过
<!-- AUTO:END -->

<!-- MANUAL:START -->
## 已完成事项

### 2026-11-03 · 当日批次

| 时间 | 版本 | 事 | 落在哪 |
|---|---|---|---|
| 18:45 | V2 | 六条 10-30 至 11-03 新闻成稿，18 页 14 种页型，首图 ledger / cover / cover-min / cover-split / mosaic / bigfact 互不相同 | `2026-11-03/` |
| 18:45 | V2 | 全批纯卡片，六条 noImageReason 各写明查过哪一页（help.openai.com、docs.x.ai 水印页、Google 搜索中心博客、Apple 中国官网新闻稿、The Information 及转述页、SEC EDGAR）；Apple 品牌宣传图抓到后按规则弃用 | `工具/sets/*.json`、`工具/grab.sh` 记录 |
| 18:46 | V2 | 讲解① 扩到 652 汉字补对照口径段，讲解② 扩到 633 汉字补各家执行口径段；Threads ⑤⑥ 删到 260 字内；「第一个/第二个」式列举清零 | `2026-11-03/文案.md` |
| 18:47 | V2 | `review.py --check` 过，人工表四遍填满；`X热议.md` 单独成文（在榜／在传／在吵三段，feed 抓取 11-03 06:27 UTC） | `2026-11-03/复审.md`、`2026-11-03/X热议.md` |

### 2026-10-31 · 当日批次

| 时间 | 版本 | 事 | 落在哪 |
|---|---|---|---|
| 11:20 | V2 | 六条 10-30／10-31 新闻成稿，18 页 18 种页型，首图 bigfact / quote / mosaic / overlap / ledger / cover 互不相同 | `2026-10-31/` |
| 11:20 | V2 | 两篇讲解按原文写，不挂视频回放，`影片` 一行改成 `原文` | `2026-10-31/文案.md` 三节 |
| 11:21 | V2 | 版面返工四轮：bigfact 的 rows 要 `{k,v}` 对象否则渲染成三条空行；`specs` / `steps` 撑不满版面，⑤ P3 换成 `timeline`、③ P3 补 sub 与长描述；`columns` 两栏条数不等会错位，② P2 改成 3 比 3 | `工具/sets/*.json` |
| 11:22 | V2 | `review.py --check` 过。注意组合标签写在 `**X 主帖**（A-3-a）` 里，收尾字母由标签决定，不改文字只改标签会被判「与实测不符」 | `2026-10-31/复审.md` |
| 13:40 | V2 | 用户读后说 AI 味重，六条主帖、六条 Threads、两篇讲解全量重写；三项同构排比、洞察路标、借喻包装、翻案句清零；① P2 与 ④ P2 两张卡的 headline 也换了 | `2026-10-31/文案.md`、`2026-10-31/配图/` |
| 13:45 | V2 | `check-post.mjs` 新增 2.8 句式体检：段落内三句共用同一三字串判为三项同构排比（error）；路标词表扩充（error）；借喻词、段落句数同构、材料边界缺失降为提醒 | `工具/check-post.mjs` |

### 2026-10-30 · 17:30 · 单条深挖 Kodiak 無人卡車

| 时间 | 版本 | 事 | 落在哪 |
|---|---|---|---|
| 17:30 | topic-1 | Kodiak × DTL 75 台最终协议单条，3 张卡 cover / versus / statement | `发布包/单条-kodiak-dtl-20261030.md`、`assets/kodiak-dtl-01~03.png` |
| 17:30 | topic-1 | 新增 `工具/sets/kodiak-dtl.json`；`check-layouts --allow-card-only` 通过，两处来源均无正文图 | `工具/sets/kodiak-dtl.json` |

### 2026-10-30 · 收工批次

| 时间 | 版本 | 事 | 落在哪 |
|---|---|---|---|
| 13:20 | — | `human-writing` 从全局 `~/.codebuddy/skills/` 复制进项目 `.codebuddy/skills/`，`出稿.sh` 改成项目优先、全局回退 | `.codebuddy/skills/human-writing/` |
| 13:30 | — | 新建复审闸门，接在 `出稿.sh` ⑥ 之后，没过 `exit 1` | `工具/review.py`、`出稿.sh` |
| 13:40 | — | 写稿定位改口：human-writing 从「审稿工具」改成「写稿标准」，§13 组合表降级为写完后查重 | `WRITING.md` §4、§5.4 |
| 13:45 | — | ② Alphabet 按短文四条重写，三段变两段半，末句回到事实 | `2026-10-30/文案.md` |
| 13:50 | — | 配图 bug 修复：抓图抓成 og:image 与 logo，导致整批纯卡片。新增抓图工具，改 `noImageReason` 口径 | `工具/grab.sh`、`WRITING.md` §5.5 |
| 13:54 | — | 补正文图三套：① 路透英伟达大楼、⑤ Straits Times 放大镜、⑥ Verge 数据中心现场。三套首图版式各异 | `工具/img/*.jpg`、对应 `sets/*.json` |
| 13:58 | — | `review.py` 加带图审计：`img/` 有图但 set 没接，判不过 | `工具/review.py` 第 4 节 |
| 14:00 | — | 交接机制：`工具/handoff.py`，`出稿.sh` 末尾自动刷新 | `HANDOFF.md` |
| 14:03 | — | 修长短文分线漏查：`review.py` 的 `check_prose` 原先只喂代码块，两篇讲解正文从没被查过。拆成 1a 短文 / 1b 长文 | `工具/review.py` |
| 14:10 | **V2** | 规则合并：删 `everynews-writing/SKILL.md`，两条线写法并入 WRITING §4–§6 | 见下 |
| 14:20 | **V2** | 配图线合并：删 `PROMPT.md` §0.5 过时段落，§7 检查 10 条压到 6 条，§1.2 划清套内/批内查重，页型表补 7 个漏写 | `工具/PROMPT.md` |
| 14:25 | **V2** | `check-layouts.mjs` 新增拦截：set 写了 render.mjs 没有的页型直接报错并列出可用页型 | `工具/check-layouts.mjs` |

### 2026-10-30 · 14:35–14:40 · 按 V2 全量重跑

| 版本 | 事 |
|---|---|
| V2 | 六条全部重写，不先选组合、写完才归类。① 首句从「一個模型下載頁」改成「司法部開始問英偉達一筆買賣」；③ 首句改数字型；⑤ 首句回到原话；六条末句三条收事实、一条收立场、一条收问句 |
| V2 | 讲① 删掉两个无出处的数字（9240 億承诺支出 / 1520 億租约），补云业务 307 億翻倍，重排三处可核指标，626 汉字 |
| V2 | 讲② 删掉与「披露口径」重复的一段，607 汉字 |
| V2 | ④ 卡片两处措辞与正文统一（駐場工程師→前部署工程師、智能家居安防底座→上門安裝網絡） |
| V2 | 18 张图重渲染，六套首图版式 photo-cover / cover / specs / statement / cover-img-top / cover-img-side 全不同 |
| V2 | 复审三遍重做，回执已填，`review.py --check` 通过 |

### V2 的规模变化

| 文件 | 之前 | 现在 |
|---|---|---|
| `WRITING.md` | 600 | 303 |
| `SHORTNEWS-V1.md` | 165 | 99 |
| `CODEBUDDY.md` | 62 | 57 |
| `工具/PROMPT.md` | 305 | 303 |
| `everynews-writing/SKILL.md` | 96 | 已删 |
| 合计 | 1228 | 762 |

### V2 删掉的东西

- `everynews-writing/SKILL.md` 整份（两线对照并入 `WRITING.md` §5 §6）
- 末句库八族（与五种收尾并存，只留一种）
- 拟人化四条里的「末句要有人在场」（与 human-writing「意思落下就停」打架）
- §15 五条、§16（并入 §4 写法底座）
- §8 的三张自查表（合成 §7）
- §9 依据、§11 复盘记录
- `PROMPT.md` §0.5 交付纪律（内容过时，还写着已作废的「X 评论区」）

---

## 遗留问题

1. **媒体图版权口径**。仍未定。若只许官方自有图，本轮的判断是官方页面也没有可用正文图，六条退纯卡片成立；一旦口径放宽，抢图要趁当天。
2. **① 的 Q3 数字未直接核对 SEC 原文**。169.56／232.91／8954 三项经 AGI HUNT、金十、今日头条 AI 日报三处引述交叉核对，EDGAR 原文没打开。发布后若有人贴原文截图，以原文为准。
3. **grab.sh 对部分站点打开超时**。cnstock、huanqiu、docs.x.ai 首次全超时，google 博客重试一次成功。站点侧问题不是工具问题，超时就换转述页再试，别死磕。
4. 规则有两个版本号：对外 **V2**，`WRITING.md` 内部沿革 **v6**。同一个东西，别当成两份文件。

## 下次开工第一件事

读本文件自动段，然后跑 `./工具/grab.sh` 对六条新选题逐条确认有没有正文图。本周内 Kimi K3.1 Pro 完整权重放出（11-04 前）和苹果千问开发者 Beta 开测（11-04）是两个现成的新增量，可以翻台账复用。

## 这次踩的坑

1. **cover 页型的 hero 必须有 `lines` 数组**，只写 `num` 和 `unit` 渲染直接抛 TypeError（render.mjs 471 行），报错信息不指明是哪个 set。
2. **check-post 的时间位置只认「最值得看」行里的固定词**（段落／环节／提问／陈述），正文里写「那一章」不算，写「那一节」在正文里也不算，必须落在最值得看那一行。
3. **全批纯卡片时 check-layouts 硬性要求 `ALLOW_CARD_ONLY=1`**，写齐六条 noImageReason 也拦，这个标志是授权开关不是免责声明，前置条件是每条都真跑过 grab.sh。
4. **Threads 上限是 260 字**（不是 250），⑥ 首稿 286 字，删「专属规则」「用途偏好」这类双字词就能下 30 字，不用砍段。

## 下一步计划

1. 这一批可以直接发。顺序 ④ → ② → ⑤ → ① → ③ → ⑥，间隔至少 40 分钟，理由与风险应对写在 `文案.md` 第四节。
2. 发完把实际数据（浏览、转发）回写 `选题台账.md`，下一轮的选题打分用它。
3. 11-04 两个时间点各回访一次：Kimi K3.1 Pro 权重放出、苹果千问开发者 Beta 开测，任一落地就是下一轮的现成选题。

## 关键上下文

**这套东西现在是 V2，长这样**

```
CODEBUDDY.md        开工必做几步，会话自动注入
WRITING.md          唯一规则表：0 分文件 / 1 产物 / 2 事实 / 3 选题 / 4 写法底座 / 5 短文 / 6 长文 / 7 校验 / 8 范例
SHORTNEWS-V1.md     六阶段顺序与产物，不写文风
工具/PROMPT.md      配图视觉，32 个页型
SOURCES.md          信息源分级
HANDOFF.md          本文件
human-writing/      文风原文，只引用不改写
```

**两条线共用的只有 `WRITING.md` §4**，差异全在 §5（短文）和 §6（长文）。这是「human-writing + 自有规则融合」的唯一位置，融合只发生一次。

**命令**

```bash
./工具/grab.sh <slug> <源 URL> [--save 1]   # 抓正文图
./出稿.sh <日期> <slug...>                  # 出图 + 归档 + 预览 + 台账 + 闸门 + 交接
python3 工具/review.py <日期> --check       # 单独验闸门
python3 工具/handoff.py <日期>              # 刷新本文件的自动段
```

**三个口径别搞混**

- 短文按**去空白字符数**算（`width`），长文按**纯汉字**算（`han`）。同一段 860 字符的稿，汉字只有 600 出头。
- 长文 600–900 汉字，短文 X 120–200 字、Threads 150–250 字。
- 六条首图版式必须各不相同，带图后可用 `photo-cover` / `cover-img-top` / `cover-img-side`。

**已知的检查盲区**

- `check_prose.py` 查不出「不在 A，在 B」这一族翻案腔。`review.py` 自动段 1.5 节补了一条项目级提醒，但不阻塞，仍需人看。
- 脚本查不出句式复用、抽象升华、结构模板。§7.3 那三遍人工复审不能省。

**今天三套图的来源**

| slug | 文件 | 来源 |
|---|---|---|
| `doj-nvidia-hf` | `img/doj-nvidia-hf-01.jpg` | Reuters / Yahoo Finance |
| `reddit-login` | `img/reddit-login-01.jpg` | The Straits Times |
| `xai-buyout` | `img/xai-buyout-01.jpg` | The Verge / Getty Images |

`alphabet-q3`、`mistral-large4`、`thrive-adt` 三套是纯卡片，`noImageReason` 已写实测结论（查过哪个页面、那页上是什么图）。
<!-- MANUAL:END -->
