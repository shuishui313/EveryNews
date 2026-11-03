#!/usr/bin/env bash
# 从一手源页面里挑正文插图，排掉 logo、头像、图标、装饰、合作伙伴墙。
# 用途：出图前先跑一遍，避免抓成 og:image / 品牌图，然后整批退化成纯卡片。
#
# 用法
#   ./grab.sh <slug> <url>              列出候选（带序号、尺寸、比例）
#   ./grab.sh <slug> <url> --save 1 3   把第 1、3 张下到 img/<slug>-01.ext
set -euo pipefail
cd "$(dirname "$0")"

SLUG="${1:-}"
URL="${2:-}"
if [ -z "$SLUG" ] || [ -z "$URL" ]; then
  echo "用法: ./grab.sh <slug> <url> [--save 1 3]"
  echo "现有 img: $(ls img 2>/dev/null | tr '\n' ' ')"
  exit 1
fi
shift 2

SAVE=()
if [ "${1:-}" = "--save" ]; then
  shift
  SAVE=("$@")
fi

playwright-cli open "$URL" >/dev/null 2>&1 || true
# 先滚到底再回顶：正文图多是懒加载，不滚一遍 naturalWidth 全是 0，会被当成没有图
playwright-cli eval "() => { const h = document.body.scrollHeight; window.scrollTo(0, Math.floor(h * 0.5)); window.scrollTo(0, h); return h; }" >/dev/null 2>&1 || true
sleep 1.2
playwright-cli eval "() => { window.scrollTo(0, 0); return 1; }" >/dev/null 2>&1 || true
sleep 0.4
RAW="$(mktemp)"
playwright-cli eval "() => JSON.stringify([...document.images].map(i => ({s: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight, a: i.alt || '', c: typeof i.className === 'string' ? i.className : '', inA: !!i.closest('article'), top: Math.round(i.getBoundingClientRect().top + window.scrollY)})))" >"$RAW" 2>&1 || true
playwright-cli close >/dev/null 2>&1 || true

python3 - "$SLUG" "$URL" "$RAW" "${SAVE[@]:-}" <<'PY'
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

slug, page_url, raw_path, *save_idx = sys.argv[1:]
save_idx = [int(x) for x in save_idx if x.strip().isdigit()]

txt = Path(raw_path).read_text(errors="ignore")
if "### Result" not in txt:
    print("X 没拿到页面图像列表（页面没打开或超时）。先手动打开确认：")
    print(f"  playwright-cli open \"{page_url}\"")
    raise SystemExit(1)

body = txt.split("### Result", 1)[1]
body = body.split("### Ran Playwright", 1)[0].strip()

try:
    inner = json.loads(body)
    items = json.loads(inner) if isinstance(inner, str) else inner
except json.JSONDecodeError:
    print("X 图像列表解析失败，原样返回前 300 字符：")
    print(body[:300])
    raise SystemExit(1)

BAD = (
    "logo", "avatar", "icon", "favicon", "emoji", "brandmark",
    "sprite", "placeholder", "spinner", "badge", "qrcode",
)
BAD_CTX = ("partner", "sponsor", "customer-logo", "logo-wall")

cands = []
seen = set()
for it in items:
    src = (it.get("s") or "").strip()
    w, h = it.get("w") or 0, it.get("h") or 0
    if not src or w < 500 or h < 280:
        continue
    ctx = f"{src} {it.get('c','')} {it.get('a','')}".lower()
    if any(b in ctx for b in BAD) or any(b in ctx for b in BAD_CTX):
        continue
    if re.search(r"\.(svg|gif)(\?|$)", src, re.I):
        continue
    key = urlparse(src).path.rsplit("/", 1)[-1].lower()
    if key in seen:  # srcset 同一张图的多个变体
        continue
    seen.add(key)
    alt = (it.get("a") or "").strip()
    ratio = w / h if h else 0
    # 作者头像：接近正方形、alt 像个人名、尺寸不大
    if 0.85 <= ratio <= 1.18 and w <= 900 and 2 <= len(alt) <= 22:
        continue
    cands.append({
        "src": src, "w": w, "h": h, "alt": alt,
        "inA": bool(it.get("inA")),
        "top": int(it.get("top") or 0),
    })

# 正文内的按页面顺序排在前面，正文外（相关推荐位）单独列在后面
cands.sort(key=lambda x: (0 if x["inA"] else 1, x["top"] if x["inA"] else -(x["w"] * x["h"])))

if not cands:
    print("0 张候选。这一页的图全是 logo / 图标 / 装饰，没有信息图。")
    print("这条走纯卡片，在 set 里写 noImageReason，写清查过哪一页。")
    raise SystemExit(2)

inside = sum(1 for c in cands if c["inA"])
print(f"候选 {len(cands)} 张，正文内 {inside} 张（已排掉 logo / 图标 / 装饰 / 合作伙伴墙）")
print("按页面位置排，01 通常就是文章主图。只列前 10 张。")
for i, c in enumerate(cands[:10], 1):
    r = round(c["w"] / c["h"], 2) if c["h"] else 0
    tail = c["src"].split("/")[-1][:46]
    where = "正文" if c["inA"] else "推荐位?"
    print(f"  {i:02d}  {where}  {c['w']}x{c['h']}  {r}  {c['alt'][:16]:<16}  {tail}")

if inside == 0:
    print()
    print("! 正文里没有图，列出来的都是推荐位缩略图。这条基本只能走卡片。")

if not save_idx:
    print()
    print("挑一张：./grab.sh %s %s --save 1" % (slug, page_url))
    raise SystemExit(0)

Path("img").mkdir(exist_ok=True)
used = 1
for idx in save_idx:
    if not 1 <= idx <= len(cands):
        print(f"  ! 序号 {idx} 超出范围")
        continue
    c = cands[idx - 1]
    ext = Path(urlparse(c["src"]).path).suffix.lower().lstrip(".") or "jpg"
    ext = {"jpeg": "jpg"}.get(ext, ext)
    out = Path("img") / f"{slug}-{used:02d}.{ext}"
    proc = subprocess.run(
        ["curl", "-sL", "--max-time", "40", "-A", "Mozilla/5.0", "-e", page_url, "-o", str(out), c["src"]],
        capture_output=True,
    )
    if proc.returncode != 0 or not out.exists() or out.stat().st_size < 2000:
        print(f"  ! 下载失败：{c['src'][:70]}")
        out.unlink(missing_ok=True)
        continue
    print(f"  ✓ {out}  ({out.stat().st_size // 1024} KB)")
    used += 1

print()
print("接进 set 时用这些东西：")
print('  photo-cover  { "type": "photo-cover", "image": "img/xxx.jpg", ... }')
print('  shot         { "type": "shot", "image": "img/xxx.jpg", "cap": "顶部小标题", "caption": "图下一行说明", "credit": "来源域名" }')
print("看完图再决定用哪张。图上没有信息的（纯 logo、纯插画）不要用。")
PY

rm -f "$RAW"
