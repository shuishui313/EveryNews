# gsspai 新聞卡 · 生成 Prompt & 風格規範 v6（深紫）

给一条新闻 → 按本文件出图：**风格恒定，版式随内容变**。

---

## 0.0 怎么在新窗口调用

### 方式一：一句话给 AI（推荐）

在**同一个工作区**开的任意新会话里，直接说：

> 用 `cards/PROMPT.md` 的规范，把这条新闻做成图：<链接>

AI 会自己读这份文件 → 拆信息点 → 填规划表 → 写 `sets/<slug>.json` → 渲染截图。
也可以加约束：`只要 3 张` / `页型别重复` / `换成 pink`。

### 方式二：自己跑（不经过 AI）

```bash
cd cards
cp sets/ant-ipo.json sets/我的选题.json   # 照着改文案和数字
./make.sh 我的选题                      # 渲染 + 截图，一条命令
```

输出在 `out/我的选题/slide-01.png …`，1080×1350 可直接发。

### 方式三：搬到别的工具 / 别的机器

这套东西**没有外部依赖数据**，靠三个文件自洽：

| 文件 | 作用 |
|---|---|
| `PROMPT.md` | 风格规范 + 流程 + 页型说明（可直接贴给任何 AI） |
| `render.mjs` | 把 JSON 变成卡片 |
| `sets/*.json` | 每篇新闻的内容 |

拷走 `cards/` 整个目录，装好 `node` + `npm i -g @playwright/cli` 即可。
只想让别的 AI「按风格出图」而不跑模板：把 `PROMPT.md` 整份贴给它当系统提示。

---

## 0 · 一句话风格

> 竖版 4:5 科技新闻卡：顶部一道全出血紫色带，页眉左栏目右大页码，暖白纸底 + 碳黑，紫色只出现在四个地方——色带、页码、关键词色块、数据图形。

**取用原则**：好用的直接用，不为「不一样」绕路。unwire 的通栏色带、单行染色标题、柱状思维保留；自研部分是单位点阵、超大数字页、帳面／實際頁、大字引語、页脚三分、张数浮动。

---

## 0.5 · 本文只管视觉

文案怎么写见 `WRITING.md`，产物契约与出稿命令见 `SHORTNEWS-V1.md` §1、§2、§4。这里不重复。

本文后面写的 `sets/`、`img/`、`make.sh`、`render.mjs` 都在 `工具/` 下。`工具/out` 是渲染中间产物，出稿后清空。

---

## 1 · 出图流程（顺序不能颠倒）

```
读新闻 → 抓一手源图 → 拆信息点 → 填信息规划表 → 查重 → 选页型 → 定张数 → 写 sets/<slug>.json → 渲染截图
```

### 1.0 先抓一手源图（不许跳过）

**每条选题先跑 `grab.sh` 拿正文图，再决定排版。** 跳过这一步，出来的就是六张纯色卡片。

```bash
./工具/grab.sh <slug> <一手源 URL>        # 列候选，已排掉 logo / 头像 / 图标 / 合作夥伴墙
./工具/grab.sh <slug> <URL> --save 1      # 下到 img/<slug>-01.ext
```

抓什么、不抓什么、版权口径在 `WRITING.md` §5.5。这里只管写进 set。

1. 存哪：`工具/img/<slug>-NN.<ext>`，一条最多 3 张，编号从 01 起。
2. 怎么写进 set：`"image": "img/<slug>-01.jpg"`，路径相对 `工具/`；渲染时自动内联成 base64。
3. 用哪种页型：图本身是信息 → `photo-cover` / `photo-annot` / `photo-split`；真实截图（界面 / 图表 / 视频帧）→ `shot`，`caption` 与 `credit` 必填；图只占一角、标题要大 → `cover-img-top` / `cover-img-side`。六套首图不许同款。
4. 找不到图：纯卡片可以，但要写 `"noImageReason": "一句话"`，说清查过哪个页面、那页上是什么图。没写理由的全卡片，按漏做处理。

### 1.1 信息规划表（先填表，再动鼠标）

表头固定五列：`页 | 页型 | 认领的信息点 | 唯一数字/标签 | 不重复于`。

真实样例（Anthropic 遞表上市，5 张）：

| 页 | 页型 | 认领的信息点 | 唯一数字 / 标签 | 不重复于 |
|---|---|---|---|---|
| 01 | cover | 上市本体 | `$2T` 估值传闻 | 04 的募资额 |
| 02 | bigfact | 增速 | `13.6×` / 16.3B / 1.2B / 6.6M | 03 的亏损 |
| 03 | ledger | 亏损结构 | `$80.7B` / `$693M` / `$72.4B` | 02 的营收 |
| 04 | versus | 募资规模 | `$100B` vs `$86B`、11/9、承销商 | 01 的估值 |
| 05 | list | 风险 | `46×` 估值倍数 | 其余全部 |

**规则**

1. 一张卡只认领**一个信息点**、**一个数字**（或一组同维度对比）
2. 封面**不许抢**第二页的数字：放「最快被记住的那一个」（倍数、时间、量级、估值）
3. 标题里出现过的数字，正文别再重复一遍（`募資 1000 億` + 条上 `US$100B` 就是重复）
4. 数字、专有名词、日期，出图后**逐字**核对原文

### 1.2 套内查重（不同套之间的查重在 `WRITING.md` §5.4）

- 把每页的**数字集合**列出来，有交集就砍一个
- 把每页的**标题关键词**列出来，重复的换角度（`得分翻倍` → `還不只一倍` 可以，原句照抄不行）
- **sub 说事实、verdict 说判断**，两者不许同义
- 上一页末句提过的东西，下一页别再当新信息讲一遍

### 1.3 张数

- 只有本体 → **1 张**；本体+数字 → **2 张**；再加拆解 → **3 张**；再加反转 → **4 张**；再加事件链 → **5 张**
- **上限 5 张**，超了拆两组，或把最弱的信息点降级进 verdict
- 信息点只有三条就只做三张（见 `sets/kimi-31.json`），**不要为了凑数加水页**
- 页码按实际张数写 `01 02 03`，**不写 `01/05`**

---

## 2 · 版式怎么选（内容 → 页型）

| 手上有什么 | 页型 | 图形特征 |
|---|---|---|
| 事件本体 | `cover` | 关键词内联色块 + 全出血数字块 + 三条要点 |
| 一个压得住全场的绝对数字 | `bigfact` | 250px 超大数字 + 一句口径 + 参数行 |
| 两个数字看着矛盾、其实差在口径 | `ledger` | 上下两行大字对照，第二行加 6px 色线 |
| 同维度两个量（价格 / 规模 / 占比） | `versus` | 暗底两条等宽轨道，长度即数值 |
| 百分比 / 得分 | `matrix` | 两组 20×5 点阵，每格 1% |
| 三个并列能力或原因 | `triad` | 三张浅紫卡 + 状态标签 |
| 一句可被引用的判断 | `quote` | 大字引语 + 署名 + 下方补充行 |
| 有时间先后的事件链 | `timeline` | 竖线节点 + 时距标签 |
| 三条以上并列要点 | `list` | 编号 + 细线 + 全出血结论条 |
| 想强调结构而非信息量 | `cover-split` | 左 58% 标题 + 右半全出血色块，数字竖排 |
| 只有一句判断，靠留白 | `cover-min` | 大标题 + 细线 + 左下裸数字 + 要点列表 |
| 三个并列指标（非对比） | `kpi` | 三格横排，每格 82px 数字 + 标签 + 口径 |
| 多项口径要逐条对账 | `table` | 三列表格 + 细线，无卡片无底色 |
| 流程 / 三步走 | `steps` | 横向编号列 + 竖分割线 + 底部状态词 |
| 同维度比例，但必须亮底 | `stack` | 亮底横条，长度即数值（`versus` 的日间版） |
| 一句判断独占一页 | `statement` | 74px 大字，无标题区，只留一句 + 出处 |
| 一主两次、有主次之分 | `mosaic` | 左大格跨两行 + 右侧两个小格 |
| 数字要当背景层 | `overlap` | 296px 幽灵数字压在文字后面，靠透明度分层 |
| 两组对照清单 | `columns` | 双栏 + 中缝竖线 + 行分隔线，像表格的双列版 |
| 递进关系、要有节奏 | `brick` | 三行阶梯错位，每行再右移 56px |
| 新闻原文里有配图，图本身就是信息 | `photo-cover` | 上图下文：图满出血 596px，标题压图或图下，三条要点 |
| 要指着一张图讲细节 | `photo-annot` | 图片铺满 + 编号钉 + 黑底标签（x/y 百分比定位） |
| 流程、三段机制、谁找谁 | `diagram` | 方框节点 + 实线/虚线箭头，箭头上写条件 |
| 同一维度分层，面积即数量 | `blocks` | 嵌套方块 + 右侧引出一个大数字 |
| 讲「有什么」而不是「多少」 | `specs` | 三格规格：小标 + 主词 + 一句解释 |
| 原文有横幅图，标题要压得住 | `cover-img-top` | 顶部满出血图 + 下方大标题 + 要点条 |
| 竖裁一张图，配一个短视频型数字 | `cover-img-side` | 左文字右图，中间可放超大数字 |
| 真实截图、界面、图表、视频帧 | `shot` | 顶部小标题 + 画框（12px 页带 + 8px 色块）+ 图下说明，`caption` 与 `credit` 必填 |
| 一张图说两边的事 | `photo-split` | 图左右分栏，各配一行标签 |
| 改前改后 | `before-after` | 上下两屏对照，中间分隔 |
| 跨度很大的数值区间 | `range-bar` | 横向轨道 + 区间块 + 端点标签 |
| 时间轴上节点密集 | `timeline-icons` | 图标节点 + 竖线 + 时距 |
| 图要占一半版面，文字另立一栏 | `photo-split` | 左图出血到边，右侧标题 + 三条要点 |
| 前后对比、两代产品 | `before-after` | 两段流程上下叠，「以前」虚线箭头，「现在」实线 |
| 有三个时间点、要有先后 | `timeline-icons` | 横排三列 + 底部轴线，未发生的点画虚线空心 |
| 时间窗、营业时段、覆盖范围 | `range-bar` | 0–24 轨道 + 彩色区间，长度即覆盖 |
| 真实截图（官方图表 / 界面 / 视频帧） | `shot` | 白框 + 顶部 8px 色块 + 图下一行说明，图不裁边 |

**新页型字段（v9）**

- `photo-cover` → `image`（本地路径，相对 `工具/`）`overlay{left,right}` `sub` `facts[]` `note?` `dark?`
- `cover-img-top` → `image`（必填）`headline[]` `sub` `chips[]` `note?`
- `cover-img-side` → `image`（必填）`headline[]` `sub` `hero{num,unit}`
- `photo-annot` → `image` `points[{n,x,y,label,sub?}]`（x/y 为 0–100 百分比）`dark` 默认 true
- `diagram` → `nodes[{box,lab,tone?}]`（tone: `fill` / `dim`）`arrows[{label,dash?}]` `sub?` `note?` `verdict?`
- `blocks` → `items[{value,label?,size}]`（size 为边长百分比，100 / 40 / 14 这种嵌套）`big` `bigLabel` `sub?` `note?`
- `specs` → `cells[{k,t,d}]`（k 是小标、t 是主词、d 是一句解释）`sub?` `note?` `verdict?`

**图片怎么来（重要）**

1. 新闻原文里的配图，先下载到 `工具/img/`，命名 `<slug>-01.png`（扩展名跟着原图），JSON 里写 `"image": "img/<slug>-01.png"`
2. 渲染时自动内联成 base64，不依赖服务器路径，截图不会 404
3. 找不到图就留空：`photo-cover` 会退成渐变底，版式照排，不报错
4. **不许拿 AI 生成图当新闻配图**；示意图要标「示意」
5. **真实截图一律走 `shot` 页型**，不许把原图裸贴或塞进 `photo-*` 的满出血位：截图会裁掉浏览器边框和页面边缘，看起来就不像同一套。默认 `contain`（不裁），宽图留白用 `bg:"paper"`，视频帧用 `bg:"dark"` 做信箱
6. `shot` 的 `caption`/`credit` 必填：左写这张图是什么，右写来源域名，不许空着

**一条纪律**：一篇新闻里，**页型不重复超过两次**；封面只在第 1 张，且三种封面（`cover` / `cover-split` / `cover-min`）**互斥，一篇只选一种**。

**防同质化**：六篇一起发时，封面轮换三种；数据页至少混用 `bigfact` / `kpi` / `table` / `stack` 中的两种，不要六篇都是「大数字 + 三条要点」。同一批里暗底 `versus` 最多出现两次。

节奏：**暗底只给 vs 页**（`versus`），一篇最多一张；其余走暖白。

---

## 3 · 版面节奏（这一节决定「和不和谐」）

1. `.body` 统一 `gap 26` + `justify-content: center` —— 内容整组垂直居中，上下留白对称
2. 有 `verdict` 的页，结论条 `margin-top: auto` 顶到底部，形成「底部色带」
3. 数据型页型（matrix / versus / timeline / items / bf / led）各有一个 `flex:1` 的伸缩块，吃掉剩余高度
4. **内容不够时别硬撑**：卡片不拉伸（`flex:none`），靠补一条真实信息（注释 / 时距 / 状态标签）来填，而不是放大字号或加空气
5. 三栏卡的内容量下限：每卡 ≥ 45 字 + 1 个状态标签；时间轴：3–4 节点 + 时距标签

---

## 4 · Design tokens

### 4.1 主题（默认 `deepviolet`）

| 主题 | 品牌色 | 小字色 | 底色 | 暗底 | 色块文字 | 对比度 |
|---|---|---|---|---|---|---|
| **`deepviolet`（默认）** | `#5B3FD1` | `#4A2CBE` | `#F6F3EC` | `#0D0D0D` | 白 | 6.1:1 |
| `violet`（旧） | `#7A5CFF` | `#6A45F0` | `#F7F5FF` | `#121118` | 白 | 4.0:1 |
| `blackgold` | `#FF9A3C` | `#A9530F` | `#F0EEE9` | `#0D0D0D` | 黑 | 9:1（黑字） |
| `pink` | `#FF4D8D` | `#E23A7A` | `#FFF6FA` | `#160E12` | 白 | 4.6:1 |

### 4.2 配色三条铁律

1. **品牌色只当「面」不当「字」**：大面积色块用主色，21px 小字必须用深一档的 `accentText`
2. **暗色基底 + 单点高亮**：整套只有一支彩色，其余全交给黑白灰
3. **底色带温度**：暖白 > 冷白，同版式下贵一档（Pantone 2026 Cloud Dancer 方向）

> 事实核对：OpenAI 官方色是**深紫 #412991 + 黑白**（不是黑金/暖橙）；Pantone 2026 年度色是 Cloud Dancer 11-4201。

### 4.3 其余 token

```
浅紫色块    #E6E0F5
正文灰      #6E6A7B
注释灰      #8E88A0
静音柱/格   #3B3549
画布        1080 × 1350（4:5）
字体        PingFang SC 700 / 600 / 400
```

栅格：外边距 64；内容宽 952；色带 12；页眉 top 40；版心 `padding 30 0 26`、`gap 26`；页脚距底 44。
字号：H1 92（`small:true` 时 78）/ 1.06 / -3　副标 28　栏目 21　页码 62　注释 21　结论条 30。
色块贴边原则：实心色块必须有一条边与画布边缘重合，不出现悬在版心的孤立色条。

---

## 5 · 文案规则

1. **标题写结论**，两行、每行 4–9 字，第二行染色当重音
2. 数值必须能溯源，注释写清口径与「传闻 / 未确认」状态
3. **结论条只有一句**，是全出血色块，也是这组图的转发理由
4. 页脚固定三件：`來源：{媒體} · {YYYY.MM.DD}`、细线、`@gsspai`

---

## 6 · 模板渲染

```bash
cd cards
node render.mjs sets/ant-ipo.json     # → out/ant-ipo/slide-01..03.html
THEME=violet node render.mjs sets/ant-ipo.json

python3 -m http.server 8777 --directory "$PWD/out"
playwright-cli open http://127.0.0.1:8777/ipo/slide-01.html
playwright-cli resize 1080 1350
playwright-cli screenshot --filename=out/ipo/slide-01.png
```

**页脚账号**：优先读 `cards/brand.txt`（一行，如 `@gsspai`），其次环境变量 `BRAND`，最后回落到 JSON 的 `brand`。换账号只改这一个文件。

`schema`：顶层 `brand` `source` `date` + `slides[]`（取前 5 张）。每张：`type` `kicker` `headline`
（`accentLine:1` 染色某行 / `stamp:["關鍵詞"]` 内联色块 / `small:true` 缩字号），再按页型补：

- `cover` → `sub` `hero{num,unit,lines}` `chips[]` `note?`
- `bigfact` → `sub` `num` `unit?` `numLabel` `rows[]` `note?`
- `ledger` → `sub` `rows[{k,v,d,on}]` `note?`
- `versus` → `bars[{label,price,width,tone}]` `rows[]` `note`
- `matrix` → `sub` `groups[{label,value,filled,tone}]` `note`
- `triad` → `sub` `cols[{num,t,d,tag}]` `note?` `verdict?`
- `quote` → `quote[]`（用 `[[关键词]]` 标紫）`by` `rows[]`
- `timeline` → `events[{date,t,d,gap?}]` `verdict?`
- `list` → `items[{k,v}]` `verdict?`
- `cover-split` → `sub` `hero{num,unit}` `chips[]`（右侧竖排）
- `cover-min` → `sub` `num` `numLabel` `chips[]?` `note?`
- `kpi` → `sub` `cells[{n,l,d}]` `note?` `verdict?`
- `table` → `sub` `head[左列名,右列名]` `rows[{a,b,c,hot?}]` `note?` `verdict?`
- `steps` → `sub?` `steps[{n,t,d,g}]` `note?` `verdict?`
- `stack` → `sub?` `bars[{label,price,width,muted?}]` `rows?` `note?`
- `statement` → `kickerTop?` `lines[]`（用 `[[关键词]]` 标紫）`by`
- `mosaic` → `sub?` `cells[{n,t,d,main?}]`（`main:true` 那格跨两行、反白）`verdict?`
- `overlap` → `ghost`（背景大数字，只填数字）`num` `numLabel` `sub` `rows?` `verdict?`
- `columns` → `sub?` `cols2[{k,items[]}]`（固定两栏）`note?` `verdict?`
- `brick` → `sub?` `bricks[{i,t,d}]`（三行最佳）`verdict?`
- `photo-split` → `image` `sub` `facts[]` `note?`（左图出血到边，右侧标题 66px）
- `before-after` → `segs[{label,from{box,tone?},arrow,dash?,to{box,tone?}}]` `sub?` `verdict?`（tone 同 diagram：`fill` / `dim`）
- `timeline-icons` → `events[{date,t,d,state?}]`（state：`now` / `todo`，`todo` 的节点画成虚线空心点）`sub?` `verdict?`
- `range-bar` → `bars[{label,value,from,to,muted?,ticks[]}]`（from/to 为 0–100 百分比）
- `shot` → `image`（必填）`cap?`（图上一句，26px）`caption?`（图下左）`creditLabel?`（默认「截图」）`credit?`（图下右，写来源域名）`fit?`（`cover` 会裁边，只给视频帧用；默认 contain）`bg?`（`dark` 暗底信箱 / `paper` 浅灰底）`sub?` `verdict?`

页型共 30 种（v10：新增 `shot`，用于真实截图；v9 新增 `photo-cover` / `photo-annot` / `photo-split` / `diagram` / `blocks` / `specs` / `before-after` / `timeline-icons` / `range-bar`）。当前在用的六套（`工具/sets/`）：`eth`（`cover-min`+`ledger`+`statement`）、`simulmt`（`bigfact`+`table`+`list`）、`g1-robot`（`cover-img-side`+`specs`+`brick`）、`muse-sg`（`cover-img-top`+`specs`+`quote`）、`trending-ai`（`cover-split`+`stack`+`statement`）、`genie4-v2`（`kpi`+`timeline`+`triad`）。

**张数按内容给**：有官方图表/界面/视频帧就 1–3 张（截图优先，卡片只补缺口），没有就纯卡片 1–3 张。不再固定三张。样例见 `sets/_demo-shot.json`。

---

## 7 · 出图后看什么

脚本已经查过的不再手查。页型重复、首图撞款、带图页缺图、断图、shot 缺 caption，`node 工具/check-layouts.mjs <slug...>` 一次就够。

人只看这六条。

- [ ] 有没有哪一页出现一大块空白（底部空 / 卡片中间空）
- [ ] 信息规划表填过？每页只认领一个信息点
- [ ] 数字有没有跨页重复（封面 vs 数据页），标题里的数字正文有没有再抄一遍
- [ ] sub 与 verdict 是否同义重复
- [ ] 暗底是否只有一张，且在 versus 页
- [ ] 所有数字与原文逐字核对（含单位、百分比、货币、传闻标注）
