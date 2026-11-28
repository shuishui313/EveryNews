# HANDOFF · V3

> 每次收工写，每次开工先读。自动段由 `工具/handoff.py` 重写，人工段自己填。

## 当前进度

<!-- AUTO:START -->
最后更新　2026-11-28 08:18　·　批次 2026-11-28　·　everynews-editorial V3

- 产物　公开页 `20261128.html` 有（62 KB） · 外置 WebP 配图 `cards/20261128/` 10 张（共 523 KB）
- 快讯　① 写程序比生成视频更会看图　② 线性注意力状态爆炸后，对称擦除把它稳住　③ 四成四每周用 AI，工作量反而变多　④ 开了三套数据，文档解析快了六倍　⑤ 本地推理跑分，原始档也一起开了
- 讲解　2 篇（講① 四個代理怎麼學會互相傳消息　講② Trainium3 上把十秒影片壓到二十二秒）
- 闸门　`python3 工具/review.py 2026-11-28 --check`　已过
<!-- AUTO:END -->

<!-- MANUAL:START -->
## 已完成事项

### 2026-11-24 · V3 轻量化与原生编辑台规范（everynews-editorial）上线

1. **建立原生写作技能 `.codebuddy/skills/everynews-editorial/`**：移除旧外部写作插件依赖，将同行读报笔记体、主干早到、事实表与正文分工、长文问题链推进及原生 Node 红线检查器 `scripts/lint.mjs` 统一收归仓库自研体系。
2. **拆掉社媒短钩子脚镣**：取消「首句 ≤15 字」与 `A-3-a` 开头/收尾组合填空体操，并在 `check-voice.mjs` 反向拦截「十来字孤立短残句成段」，让每条快讯（90–280 字，1–3 段）直接带主语和动作一气呵成。
3. **配图升级为外置 WebP + 弹性张数 + 横版画框**：保留深紫暖白视觉卡片体系，`make-public.mjs` 自动将 `<日期>/配图/` 转码为 `cards/<YYYYMMDD>/*.webp`（18 张卡从旧版 4.8 MB 双份内联 PNG 压到约 350–450 KB，`<YYYYMMDD>.html` 本体降至 ~25 KB）；`render.mjs` 与 `make.sh` 新增 `shot` 页型 `"wide": true` 1440×810 横版画框支持；取消无用的 `preview.png` 超长截图。
4. **期次切换抽离 `issues.js` + 台账补齐**：历史 `<YYYYMMDD>.html` 不再在每次出稿时重复改写；`ledger.mjs` 直接读取 `文案.md` 并补齐 `2026-11-18` 至 `2026-11-24` 共 120 条选题记录。

### 2026-11-28 · Linux 渲染工具链修复

1. 环境里 `playwright-cli` 未上 PATH，装到 `/home/box/.local/bin/`，调用 `grab.sh` 与 `出稿.sh` 前需 `export PATH=/home/box/.local/bin:$PATH`。
2. `工具/make.sh` 原先只认 macOS 的 Chrome 路径，已补上 `/usr/bin/google-chrome` 与 `/usr/bin/chromium` 回退，Linux 下截图正常。

## 遗留问题

1. `工具/grab.sh` 对纯前端动态挂载图片的页面仍可能抓回 0 张候选，遇到此类源页直接人工核验后在 set 写 `noImageReason`。
2. 早期 14 期历史页面（`20261103.html`–`20261123.html`）维持原始归档形态不重做，自 `20261124.html` 起采用外置 `cards/<YYYYMMDD>/*.webp`。

## 下一步计划

1. 后续每日出稿直接调用 `everynews-editorial` 撰写读报笔记体正文与两篇长文讲解，卡片按信息密度做 1–2 张核心卡即可。
2. 推送 GitHub Pages 时将 `<YYYYMMDD>.html`、`cards/<YYYYMMDD>/`、`index.html`、`archive.html`、`issues.js`、`选题台账.md` 一并提交。

## 关键上下文

```
.codebuddy/skills/everynews-editorial/   原生编辑台写作规范 + scripts/lint.mjs 红线检查器
WRITING.md                               产物契约、事实口径、选题与校验闭环
SHORTNEWS-V1.md                          五阶段顺序与目录契约
工具/PROMPT.md                           配图版式（支持 1–3 张弹性张数与 wide 横版画框）
SOURCES.md                               信息源分级
出稿.sh                                  一键出稿入口（传 slug 渲染新卡，不传复用已有配图）
```
<!-- MANUAL:END -->
