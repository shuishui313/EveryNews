#!/usr/bin/env bash
# 一条命令出当天稿：写稿自检 → 复审闸门 → （可选卡片渲染）→ 公开页 → 主页/归档/期次脚本 → 台账 → 清旧 → 交接
# 用法:
#   ./出稿.sh <YYYY-MM-DD> <slug...>   # 校验版式 + 渲染配图卡片 + 出网页（常规用法）
#   ./出稿.sh <YYYY-MM-DD>             # 复用已有 <日期>/配图/ 或纯文本出网页（改文案重跑不重复截图）
# 产物: <日期>/{文案.md, 配图/, X热议.md} + <YYYYMMDD>.html + index.html + archive.html + issues.js
# 不再生成 preview.png 整页长截图；历史 <YYYYMMDD>.html 靠 issues.js 切换，不再重复改写
set -euo pipefail
cd "$(dirname "$0")"

WS="$PWD"
T="$WS/工具"
DATE="${1:-}"

if [ -z "$DATE" ]; then
  echo "用法: ./出稿.sh <YYYY-MM-DD> [slug...]"
  exit 1
fi
shift
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "✗ 日期要写 YYYY-MM-DD，拿到的是 $DATE"; exit 1; }
SLUGS=("$@")

DAY="$WS/$DATE"
STAMP="${DATE//-/}"
mkdir -p "$DAY"

# 根目录或旧稿件目录里的 <日期>.md 一律归到当天目录
if [ -f "$WS/$DATE.md" ]; then
  mv "$WS/$DATE.md" "$DAY/文案.md"
  echo "   · 根目录的 $DATE.md 已归入 $DATE/文案.md"
fi
if [ -f "$WS/稿件/$DATE.md" ]; then
  mv -f "$WS/稿件/$DATE.md" "$DAY/文案.md"
  rmdir "$WS/稿件" 2>/dev/null || true
  echo "   · 稿件目录里的 $DATE.md 已归入 $DATE/文案.md"
fi

if [ ! -f "$DAY/文案.md" ]; then
  echo "✗ 找不到 $DATE/文案.md"
  exit 1
fi

echo "① 写稿顺序与 AI 味自检"
node "$T/check-voice.mjs" "$DATE" || {
  echo "✗ 写稿自检没过，不出稿。先按提示改稿，不许调阈值放行。"
  echo "   只回看历史批次：node 工具/check-voice.mjs $DATE --voice-only"
  exit 1
}

echo "② 复审闸门（结构自查 + 硬禁令 + 撞车清单 + 三遍复审回执）"
if ! python3 "$T/review.py" "$DATE" --check; then
  echo
  echo "✗ 复审没做完，不出稿。"
  echo "   打开 工具/复审/$DATE.md，按自动段改正文，再把人工表四行填满；"
  echo "   只验复审：python3 工具/review.py $DATE --check"
  exit 1
fi

if [ ${#SLUGS[@]} -gt 0 ]; then
  echo "③ 版式查重与配图渲染"
  cd "$T"
  node check-layouts.mjs "${SLUGS[@]}" ${ALLOW_CARD_ONLY:+--allow-card-only} || {
    echo "✗ 版式或图源没过：先回一手源找图（工具/img/），确实没有就在 set 里写 noImageReason；当天确认全批纯卡片，加 ALLOW_CARD_ONLY=1 重跑"
    exit 1
  }
  for s in "${SLUGS[@]}"; do
    [ -f "sets/$s.json" ] || { echo "✗ 找不到 工具/sets/$s.json"; exit 1; }
    ./make.sh "$s" >/dev/null
    echo "   · $s"
  done
  cd "$WS"
  rm -rf "$DAY/配图"
  mkdir -p "$DAY/配图"
  i=0
  for s in "${SLUGS[@]}"; do
    i=$((i + 1))
    n=0
    for f in "$T/out/$s"/slide-*.png; do
      [ -f "$f" ] || continue
      n=$((n + 1))
      cp "$f" "$DAY/配图/$(printf '%02d' "$i")-$s-$(printf '%02d' "$n").png"
    done
    echo "   · ${s}：${n} 张"
  done
else
  echo "③ 配图（未传 slug，复用现有 $DATE/配图/）"
fi

echo "④ 公开页与站点入口"
node "$T/make-public.mjs" "$DATE"
node "$T/make-index.mjs"

echo "⑤ 选题台账"
node "$T/ledger.mjs" "$DATE"

echo "⑥ 清理旧日目录与中间产物"
shopt -s nullglob
for d in "$WS"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]; do
  [ "$(basename "$d")" = "$DATE" ] || { rm -rf "$d"; echo "   · 删旧日目录 $(basename "$d")"; }
done
if [ -d "$T/out" ]; then
  find "$T/out" -name "slide-*.html" -delete 2>/dev/null || true
  find "$T/out" -name "slide-*.png" -delete 2>/dev/null || true
fi
find "$WS" -name ".DS_Store" -delete 2>/dev/null || true
rm -f "$DAY/预览图.png" "$DAY/preview.html" "$DAY/复审.md"

echo "⑦ 交接"
python3 "$T/handoff.py" "$DATE" || echo "   ! 交接没写成，手工补 HANDOFF.md 的人工段"

PIC_COUNT=0
[ -d "$DAY/配图" ] && PIC_COUNT=$(ls "$DAY/配图"/*.png 2>/dev/null | wc -l | tr -d ' ')

echo
echo "✅ 完成"
echo "   文案    $DATE/文案.md"
echo "   配图    $DATE/配图/（${PIC_COUNT} 张）"
echo "   公开页  $STAMP.html"
echo "   主页    index.html（当日成果 + 期次切换）· archive.html（全部期次）· issues.js"
echo "   台账    选题台账.md"
