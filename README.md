# EveryNews

一个人加一套脚本，把每天的 AI 新闻做成能发的图文：每天六条，每条三张 1080×1350 竖版卡，配 X 主帖和 Threads 文案，另加两篇讲解长文。

## 每天怎么跑

```bash
./出稿.sh <YYYY-MM-DD> <slug...>
```

中间有闸门，`python3 工具/review.py <日期> --check` 不过就出不了稿。开工先读 `HANDOFF.md`，写稿规则只有一份 `WRITING.md`。

## 产出

每个日期目录 `YYYY-MM-DD/` 下：

- `配图/NN-slug-MM.png` —— 六条选题，每条三张竖版卡
- `文案.md` —— 事实表、X 主帖、Threads、两篇讲解、自查
- `复审.md` —— 闸门回执
- `preview.html` —— 本地配图总览
- `预览图.png` —— 整页缩略图
- `X热议.md` —— X 侧在榜/在传/在吵（不是选题源）

## 公开版预览

把当天产出压成**单文件自包含网页**（图片 base64 内联、CSS 内联，拿到网址就能开）：

```bash
node 工具/make-public.mjs <YYYY-MM-DD>   # 不给日期就取最新一期
```

生成 `EveryNews_<YYYYMMDD>.html`，例如 `EveryNews_20261103.html`。

把它放到任意静态托管就能公开访问。开 GitHub Pages 后，链接形如：

```
https://<你的用户名>.github.io/EveryNews/EveryNews_20261103.html
```

## 目录

- `WRITING.md` —— 写什么、怎么写、交出什么，唯一规则表
- `SHORTNEWS-V1.md` —— 短文六阶段的先后顺序
- `SOURCES.md` —— 去哪找、哪一级能引用
- `工具/PROMPT.md` —— 配图版式与渲染
- `工具/render.mjs` —— 卡片渲染
- `工具/site.mjs` —— 静态站生成（多期归档）
- `工具/make-public.mjs` —— 单文件公开页生成
- `human-writing/` —— 文风本体

## 授权

MIT
