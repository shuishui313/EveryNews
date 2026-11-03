# EveryNews

每天六条 AI 新闻，每条三张竖版卡，文案按规则写，出稿前过一道自动闸门。

一个人加上一套脚本，就能把当天的事做成能直接发的图文。这个仓库装的不是内容，是那条流水线。

[看示例站](https://shuishui313.github.io/EveryNews_V1/)

---

## 一条稿是怎么出来的

```
抓源        写稿          自检          出卡           出站
SOURCES → WRITING.md → review.py → render.mjs → site.mjs
          human-writing   check-post     13 类版式      静态站
```

四道关口，每一道都有脚本挡着，不通过就不往下走：

| 关口 | 脚本 | 挡什么 |
|---|---|---|
| 文案体检 | `工具/check-post.mjs` | 首句超 15 字、主帖出字数区间、开头与收尾六条撞型、三项同构排比、洞察路标、借喻包装抽象、缺材料边界 |
| 版式检查 | `工具/check-layouts.mjs` | 同批首图版式重复、暗底超过一张、正文图抓了 logo 与头像 |
| 复审闸门 | `工具/review.py` | 上面两项加上四遍人工复审回执，任何一项空着就 `exit 1` |
| 出稿 | `出稿.sh` | 串起全流程，闸门不过不出稿 |

`check-post.mjs` 是这套东西里最有用的一个。它把「AI 味」拆成了可以机器判的几条：同一段落里三个分句共用同一个三字串，判三项同构排比；出现「真正值得记住的是」「这里要分清」「边界也说清楚」，判洞察路标。写的时候绕开这些，稿子会干净一大截。

---

## 目录

```
工具/
  render.mjs          卡片渲染，13 类版式，输出 1080×1350 PNG
  site.mjs            把每天的产出编成静态站
  check-post.mjs      文案自查，结构 + 句式
  check-layouts.mjs   版式与图源自查
  review.py           复审闸门，出稿前最后一道
  grab.sh             从一手源抓正文候选图，排掉 logo / 头像 / 分享卡
  make-preview.py     把一天的卡拼成一张预览图
  sets/               每条的卡片数据，JSON
  PROMPT.md           版式与渲染的全部规则

2026-11-03/           一期完整示例：文案、复审回执、18 张卡、X 侧记录
  ├── 文案.md
  ├── 复审.md
  ├── X热议.md
  └── 配图/

WRITING.md            写什么、怎么写、交出什么。唯一的规则表
SOURCES.md            去哪找、哪一级能引用
SHORTNEWS-V1.md       短文六个阶段的先后顺序
.codebuddy/skills/    三个 agent skill：写稿、单条深挖、每日流水线
```

---

## 跑起来

需要 Node 18+ 和 Python 3.9+。没有 npm 依赖。

```bash
# 出一天的卡
./工具/grab.sh <slug> <一手源 URL>          # 先看有什么正文图
./工具/make.sh <slug>                        # 渲染三张卡
node 工具/site.mjs --only 2026-11-03         # 编成静态站
python3 -m http.server 4321 --directory site # 本地看
```

单条卡片的渲染，`sets/<slug>.json` 里写什么，全部写在 `工具/PROMPT.md`。十三个版式各有自己的字段，`cover` 要 `hero`，`versus` 要 `bars`，`bigfact` 的 `rows` 必须是 `{k, v}` 对象，写成字符串会渲染成三条空行。

完整的每日流程看 `出稿.sh`，它就是一条命令：

```bash
./出稿.sh 2026-11-03 anthropic-s1 openai-token grok-watermark apple-qwen meta-max robots-optout
```

---

## 写作规则

`WRITING.md` 是唯一的规则表，其余文件都指向它。三条最要紧的：

1. 一条只做一件事。第一句直接碰对象，意思落下就停。
2. 判断从正面下，依据放旁边。不写「不是 A，而是 B」，不先立一个读者没有的误解再推翻。
3. 一句超过两个数字就拆。全篇只留一个核心数字，其余进事实表和配图。

文风本体在 `.codebuddy/skills/human-writing/`，那是给别人用的通用中文写作 skill，本项目只引用不改写。

---

## 授权

代码 MIT，见 `LICENSE`。

`2026-11-03/` 下的文案与卡片是 CC BY-NC 4.0。文案里引用的第三方数据与引语，版权归原发布方，这里只作引用与评论。

仓库不含任何抓取自新闻媒体的配图。所有卡片都是程序渲染出来的，字是排的，色块是画的。
