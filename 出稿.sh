#!/usr/bin/env bash
# 一条命令出当天稿：渲染 → 归档 → 总览页 → 预览图 → 台账 → 清旧
# 用法: ./出稿.sh 2026-10-28 eth simulmt g1-robot muse-sg trending-ai genie4-v2
# 产物: <工作区>/<日期>/{预览图.png, preview.html, 文案.md, 配图/}
# 纪律: 旧日目录与旧配图一律删除，只留「选题台账.md」用于后续去重
set -euo pipefail
cd "$(dirname "$0")"

WS="$PWD"
T="$WS/工具"
DATE="${1:-}"
PORT="${PORT:-8778}"

if [ -z "$DATE" ]; then
  echo "用法: ./出稿.sh <YYYY-MM-DD> <slug...>"
  echo "现有: $(ls "$T/sets" 2>/dev/null | sed 's/.json//' | tr '\n' ' ')"
  exit 1
fi
shift
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || { echo "✗ 日期要写 YYYY-MM-DD，拿到的是 $DATE"; exit 1; }
SLUGS=("$@")
if [ ${#SLUGS[@]} -eq 0 ]; then
  echo "✗ 至少给一个 slug。现有: $(ls "$T/sets" | sed 's/.json//' | tr '\n' ' ')"
  exit 1
fi

DAY="$WS/$DATE"

echo "⓪ 版式与图源检查"
cd "$T"
node check-layouts.mjs "${SLUGS[@]}" ${ALLOW_CARD_ONLY:+--allow-card-only} || {
  echo "✗ 版式或图源没过：先回一手源找图（工具/img/），确实没有就在 set 里写 noImageReason；当天确认全批纯卡片，加 ALLOW_CARD_ONLY=1 重跑"
  exit 1
}
echo "① 渲染"
cd "$T"
for s in "${SLUGS[@]}"; do
  [ -f "sets/$s.json" ] || { echo "✗ 找不到 工具/sets/$s.json"; exit 1; }
  ./make.sh "$s" >/dev/null
  echo "   · $s"
done

echo "② 归档到 $DATE/"
cd "$WS"
# 只清生成物：配图、预览图、总览页。文案.md 原地不动，和配图放在同一层
rm -rf "$DAY/配图" "$DAY/preview.html" "$DAY/预览图.png"
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

# 文稿：根目录或旧稿件目录里的 <日期>.md 一律归到当天目录，和配图同层
if [ -f "$WS/$DATE.md" ]; then
  mv "$WS/$DATE.md" "$DAY/文案.md"
  echo "   · 根目录的 $DATE.md 已归入当天目录"
fi
if [ -f "$WS/稿件/$DATE.md" ]; then
  mv -f "$WS/稿件/$DATE.md" "$DAY/文案.md"
  rmdir "$WS/稿件" 2>/dev/null || true
  echo "   · 稿件目录里的 $DATE.md 已归入当天目录"
fi
if [ -f "$DAY/文案.md" ]; then
  echo "   · 文案.md 在位（与 配图/ 同层）"
else
  echo "   ! 还没有 $DATE 的文稿，放一份到 $DATE/文案.md"
fi

echo "③ 总览页"
node "$T/preview.mjs" "$DATE" "${SLUGS[@]}"

echo "④ 预览图"
pkill -f "http.server $PORT" 2>/dev/null || true
sleep 0.4
( nohup python3 -m http.server "$PORT" --directory "$WS" >/tmp/everynews-preview.log 2>&1 & )
sleep 1.2
playwright-cli open "http://127.0.0.1:$PORT/$DATE/preview.html" >/dev/null 2>&1 || true
playwright-cli resize 1240 800 >/dev/null 2>&1
playwright-cli goto "http://127.0.0.1:$PORT/$DATE/preview.html" >/dev/null 2>&1 || true
# 等所有缩略图解码完再截，否则后面几张会是空框
playwright-cli eval "() => Promise.all(Array.from(document.images).map(i => i.complete ? 0 : i.decode().catch(() => 0)))" >/dev/null 2>&1 || true
playwright-cli screenshot --full-page --filename="$DAY/预览图.png" >/dev/null 2>&1
playwright-cli close >/dev/null 2>&1 || true
pkill -f "http.server $PORT" 2>/dev/null || true

echo "⑤ 选题台账"
node "$T/ledger.mjs" "$DATE" "${SLUGS[@]}"

echo "⑥ 文案自查"
if [ -f "$DAY/文案.md" ]; then
  node "$T/check-post.mjs" "$DATE" || echo "   ! 文案自查没过，改完再发"

  echo "⑦ 复审闸门（硬禁令 + 撞车清单 + 三遍复审回执）"
  python3 "$T/review.py" "$DATE"
  if ! python3 "$T/review.py" "$DATE" --check; then
    echo
    echo "✗ 复审没做完，不出稿。"
    echo "   打开 $DATE/复审.md，按自动段改正文，再把人工表四行填满；"
    echo "   只验复审：python3 工具/review.py $DATE --check"
    exit 1
  fi
else
  echo "   · 没有 $DAY/文案.md，跳过文案自查与复审"
fi

echo "⑧ 清理旧图与中间产物"
shopt -s nullglob
for d in "$WS"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]; do
  [ "$(basename "$d")" = "$DATE" ] || { rm -rf "$d"; echo "   · 删旧日目录 $(basename "$d")"; }
done
for d in "$T/out"/*/; do
  name="$(basename "$d")"
  keep=0
  for s in "${SLUGS[@]}"; do [ "$name" = "$s" ] && keep=1; done
  [ "$keep" = 1 ] || rm -rf "$d"
done
find "$T/out" -name "slide-*.html" -delete 2>/dev/null || true
find "$T/out" -name "slide-*.png" -delete 2>/dev/null || true
find "$WS" -name ".DS_Store" -delete 2>/dev/null || true

echo "⑨ 交接"
python3 "$T/handoff.py" "$DATE" || echo "   ! 交接没写成，手工补 HANDOFF.md 的人工段"

echo
echo "✅ 完成"
echo "   预览图  $DATE/预览图.png"
echo "   总览页  $DATE/preview.html"
echo "   配图    $DATE/配图/（$(ls "$DAY/配图" | wc -l | tr -d ' ') 张）"
echo "   台账    选题台账.md"
