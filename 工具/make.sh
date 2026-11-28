#!/usr/bin/env bash
# 用法: ./make.sh <slug>
# 渲染 sets/<slug>.json 并单进程高速截图（无需起 http.server，自动识别 1080×1350 竖卡与 1440×810 横框，同步生成 WebP）
set -euo pipefail
cd "$(dirname "$0")"

export PWTEST_SOCKETS_DIR="/tmp/pw-en"
mkdir -p "$PWTEST_SOCKETS_DIR"

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "用法: ./make.sh <slug>"
  echo "现有: $(ls sets | sed 's/.json//' | tr '\n' ' ')"
  exit 1
fi

FILE="sets/$SLUG.json"
[ -f "$FILE" ] || { echo "✗ 找不到 $FILE"; exit 1; }

rm -rf "out/$SLUG"
node render.mjs "$FILE"

# 单进程直接通过 playwright-core + 本机浏览器对本地 HTML 截图（免端口、免 daemon、秒级完成）
PW_CORE="$(dirname "$(command -v playwright-cli 2>/dev/null || echo /nonexistent)")/../lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs"

if [ -f "$PW_CORE" ]; then
  node --input-type=module - "$PW_CORE" "$PWD/out/$SLUG" <<'MJS'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [pwPath, outDir] = process.argv.slice(2);
const { chromium } = await import(pathToFileURL(pwPath).href);
const chromeApp = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const launchOpts = chromeApp ? { executablePath: chromeApp, headless: true } : { headless: true };

const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ deviceScaleFactor: 1 });
const page = await context.newPage();

const slides = fs.readdirSync(outDir).filter((f) => /^slide-\d+\.html$/.test(f)).sort();
for (const s of slides) {
  const htmlPath = path.join(outDir, s);
  const src = fs.readFileSync(htmlPath, "utf8");
  const isWide = /<html[^>]*data-wide="1"/.test(src);
  await page.setViewportSize(isWide ? { width: 1440, height: 810 } : { width: 1080, height: 1350 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  const pngPath = htmlPath.replace(/\.html$/, ".png");
  await page.screenshot({ path: pngPath });
  console.log(`  · ${path.basename(pngPath)}`);
}
await browser.close();
MJS
else
  PORT="${PORT:-8777}"
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
    if grep -q '<html[^>]*data-wide="1"' "out/$SLUG/slide-$i.html"; then
      playwright-cli resize 1440 810 >/dev/null 2>&1
    else
      playwright-cli resize 1080 1350 >/dev/null 2>&1
    fi
    playwright-cli goto "http://127.0.0.1:$PORT/$SLUG/slide-$i.html" >/dev/null 2>&1
    playwright-cli screenshot --filename="out/$SLUG/slide-$i.png" >/dev/null 2>&1
    echo "  · slide-$i.png"
  done
  playwright-cli close >/dev/null 2>&1 || true
fi

python3 - "out/$SLUG" <<'PY'
import sys
from pathlib import Path
from PIL import Image

d = Path(sys.argv[1])
pngs = sorted(d.glob("slide-*.png"))
if not pngs:
    print(f"✗ 未生成任何截图：{d}", file=sys.stderr)
    sys.exit(1)
for p in pngs:
    if p.stat().st_size == 0:
        print(f"✗ 截图为空：{p}", file=sys.stderr)
        sys.exit(1)
    with Image.open(p) as im:
        im.save(p.with_suffix(".webp"), "WEBP", quality=85, method=6)
PY

N=$(ls out/"$SLUG"/slide-*.png | wc -l | tr -d ' ')
echo "✅ ${SLUG}: $N 张杂志图版已输出（PNG + WebP）到 out/${SLUG}/"
