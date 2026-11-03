#!/usr/bin/env bash
# 用法: ./make.sh <slug> [端口]
#   ./make.sh ant-ipo    → 渲染 sets/ant-ipo.json 并截图到 out/ant-ipo/
#   PORT=9000 ./make.sh duet
# 依赖: node、python3、playwright-cli（npm i -g @playwright/cli）
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
# 每次渲染先清空该套的旧产物，避免页数变少时残留旧图
rm -rf "out/$SLUG"
node render.mjs "$FILE"
mkdir -p "out/$SLUG"

# 用本套的 slide 探活：服务器可能在别的目录上跑着（工作区搬过家就会 404）
if ! curl -sf -o /dev/null "http://127.0.0.1:$PORT/$SLUG/slide-01.html"; then
  pkill -f "http.server $PORT" 2>/dev/null || true
  sleep 0.4
  ( nohup python3 -m http.server "$PORT" --directory "$PWD/out" >/tmp/gsspai-cards.log 2>&1 & )
  sleep 1.2
fi

N=$(ls out/"$SLUG"/slide-*.html | wc -l | tr -d ' ')
playwright-cli open "http://127.0.0.1:$PORT/$SLUG/slide-01.html" >/dev/null 2>&1 || true
playwright-cli resize 1080 1350 >/dev/null 2>&1

for k in $(seq 1 "$N"); do
  i=$(printf "%02d" "$k")
  playwright-cli goto "http://127.0.0.1:$PORT/$SLUG/slide-$i.html" >/dev/null 2>&1
  playwright-cli screenshot --filename="out/$SLUG/slide-$i.png" >/dev/null 2>&1
  echo "  · slide-$i.png"
done

playwright-cli close >/dev/null 2>&1 || true

# 截图静默失败会留下一堆空文件，这里逐张验一遍
missing=0
for k in $(seq 1 "$N"); do
  f="out/$SLUG/slide-$(printf "%02d" "$k").png"
  [ -s "$f" ] || { echo "✗ 截图没生成或为空：$f"; missing=1; }
done
[ "$missing" = 0 ] || { echo "   大概率是端口被占或页面没起来，重跑 ./make.sh $SLUG"; exit 1; }

echo "✅ ${SLUG}: $N 张已输出到 out/${SLUG}/"
echo "   预览: http://127.0.0.1:${PORT}/${SLUG}/slide-01.html"
