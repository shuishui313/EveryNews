#!/usr/bin/env bash
# 用法: ./make.sh <slug>
# 渲染 sets/<slug>.json 并截图（自动识别 1080×1350 竖卡与 1440×810 横版画框，并同步生成轻量 .webp）
set -euo pipefail
cd "$(dirname "$0")"

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "用法: ./make.sh <slug>"
  echo "现有: $(ls sets | sed 's/.json//' | tr '\n' ' ')"
  exit 1
fi

FILE="sets/$SLUG.json"
[ -f "$FILE" ] || { echo "✗ 找不到 $FILE"; exit 1; }

PORT="${PORT:-8777}"
rm -rf "out/$SLUG"
node render.mjs "$FILE"
mkdir -p "out/$SLUG"

if ! curl -sf -o /dev/null "http://127.0.0.1:$PORT/$SLUG/slide-01.html"; then
  pkill -f "http.server $PORT" 2>/dev/null || true
  sleep 0.3
  ( nohup python3 -m http.server "$PORT" --directory "$PWD/out" >/tmp/gsspai-cards.log 2>&1 & )
  sleep 0.9
fi

N=$(ls out/"$SLUG"/slide-*.html | wc -l | tr -d ' ')
playwright-cli open "http://127.0.0.1:$PORT/$SLUG/slide-01.html" >/dev/null 2>&1 || true

for k in $(seq 1 "$N"); do
  i=$(printf "%02d" "$k")
  if grep -q 'data-wide="1"' "out/$SLUG/slide-$i.html"; then
    playwright-cli resize 1440 810 >/dev/null 2>&1
  else
    playwright-cli resize 1080 1350 >/dev/null 2>&1
  fi
  playwright-cli goto "http://127.0.0.1:$PORT/$SLUG/slide-$i.html" >/dev/null 2>&1
  playwright-cli screenshot --filename="out/$SLUG/slide-$i.png" >/dev/null 2>&1
  echo "  · slide-$i.png"
done

playwright-cli close >/dev/null 2>&1 || true

python3 - "out/$SLUG" <<'PY'
import sys
from pathlib import Path
from PIL import Image

d = Path(sys.argv[1])
for p in sorted(d.glob("slide-*.png")):
    if not p.exists() or p.stat().st_size == 0:
        print(f"✗ 截图为空：{p}", file=sys.stderr)
        sys.exit(1)
    with Image.open(p) as im:
        im.save(p.with_suffix(".webp"), "WEBP", quality=84, method=6)
PY

echo "✅ ${SLUG}: $N 张已输出（PNG + WebP）到 out/${SLUG}/"
