#!/usr/bin/env python3
"""把当天的配图按条拼成一张总览图。<日期>/配图/NN-slug-MM.png -> <日期>/预览图.png

用法: python3 工具/make-preview.py 2026-10-30
"""
import sys, os, glob
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print("用法: python3 工具/make-preview.py <YYYY-MM-DD>")
        sys.exit(1)
    date = sys.argv[1]
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), date)
    img_dir = os.path.join(root, "配图")
    if not os.path.isdir(img_dir):
        print(f"没找到 {img_dir}")
        sys.exit(1)

    # 按 NN 分组，组内按 MM 排序
    groups = {}
    for f in glob.glob(os.path.join(img_dir, "*.png")):
        base = os.path.basename(f)
        parts = base.split("-")
        if len(parts) < 3 or not parts[0].isdigit():
            continue
        nn, mm = parts[0], parts[-1].replace(".png", "")
        groups.setdefault(nn, []).append((mm, f))
    if not groups:
        print("配图目录里没有符合 NN-slug-MM.png 的文件")
        sys.exit(1)

    cols = sorted(groups.keys())
    rows = max(len(v) for v in groups.values())
    tw, th = 300, 375          # 单张缩略尺寸，与原图同比例 1080x1350
    gap, pad = 10, 24

    W = pad * 2 + len(cols) * tw + (len(cols) - 1) * gap
    H = pad * 2 + rows * th + (rows - 1) * gap
    canvas = Image.new("RGB", (W, H), (246, 243, 236))

    for ci, nn in enumerate(cols):
        for ri, (mm, path) in enumerate(sorted(groups[nn])):
            im = Image.open(path).convert("RGB").resize((tw, th), Image.LANCZOS)
            x = pad + ci * (tw + gap)
            y = pad + ri * (th + gap)
            canvas.paste(im, (x, y))

    out = os.path.join(root, "预览图.png")
    canvas.save(out, optimize=True)
    print(f"✅ {out}（{W}x{H}，{len(cols)} 列 x {rows} 行，共 {sum(len(v) for v in groups.values())} 张）")

if __name__ == "__main__":
    main()
