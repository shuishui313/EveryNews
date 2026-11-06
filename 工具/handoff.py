#!/usr/bin/env python3
"""收工写交接。自动段每次重写，人工段原样保留。

用法
  python3 工具/handoff.py 2026-10-30

输出项目根的 HANDOFF.md，五个区块：
  当前进度（自动段）· 已完成事项 · 遗留问题 · 下一步计划 · 关键上下文（人工段）
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

WS = Path(__file__).resolve().parent.parent
TOOLS = WS / "工具"
OUT = WS / "HANDOFF.md"

AUTO_START, AUTO_END = "<!-- AUTO:START -->", "<!-- AUTO:END -->"
MANUAL_START, MANUAL_END = "<!-- MANUAL:START -->", "<!-- MANUAL:END -->"

MANUAL_TEMPLATE = f"""{MANUAL_START}
## 已完成事项

- （日期 · 版本）做了什么，产出落在哪个文件

## 遗留问题

- 问题是什么 · 谁定 · 定完改哪

## 下一步计划

1. 具体的动作，不写「继续优化」这种

## 关键上下文

- 下次会话必须知道的约定、路径、中间状态
{MANUAL_END}
"""

NEED_IMG = ("photo-cover", "photo-annot", "photo-split", "shot", "cover-img-top", "cover-img-side")


def titles(prose: Path) -> list[str]:
    if not prose.exists():
        return []
    out = []
    for line in prose.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^###\s+([①②③④⑤⑥⑦⑧].+?)\s*$", line)
        if m:
            out.append(m.group(1))
    return out


def long_titles(prose: Path) -> list[str]:
    if not prose.exists():
        return []
    return re.findall(r"^###\s+(講.+?|讲.+?)\s*$", prose.read_text(encoding="utf-8"), re.M)


def post_facts(prose: Path) -> tuple[int, str]:
    """从自查表抓主帖字数和组合，抓不到就留空。"""
    if not prose.exists():
        return 0, ""
    text = prose.read_text(encoding="utf-8")
    m = re.search(r"^\|\s*主帖字數\s*\|(.+)$", text, re.M)
    widths = [x.strip() for x in m.group(1).rstrip("|").split("|")] if m else []
    c = re.search(r"^\|\s*組合\s*\|(.+)$", text, re.M)
    combos = [x.strip() for x in c.group(1).rstrip("|").split("|")] if c else []
    return len(widths), " ".join(combos)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    date = sys.argv[1]
    day = WS / date
    prose = day / "文案.md"
    if not day.exists():
        print(f"X 没有 {date}/ 这个目录")
        return 1

    slugs: list[str] = []
    img_dir = day / "配图"
    if img_dir.exists():
        for f in sorted(img_dir.glob("*.png")):
            m = re.match(r"^\d{2}-(.+)-\d{2}\.png$", f.name)
            if m and m.group(1) not in slugs:
                slugs.append(m.group(1))

    with_img, cards = [], []
    for slug in slugs:
        p = TOOLS / "sets" / f"{slug}.json"
        if not p.exists():
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        used = [s.get("type") for s in d.get("slides", []) if s.get("type") in NEED_IMG]
        (with_img if used else cards).append(slug)

    n_imgs = len(list(img_dir.glob("*.png"))) if img_dir.exists() else 0
    heads = titles(prose)
    lt = long_titles(prose)
    n_posts, combos = post_facts(prose)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    manual = MANUAL_TEMPLATE
    if OUT.exists():
        old = OUT.read_text(encoding="utf-8")
        s, e = old.find(MANUAL_START), old.find(MANUAL_END)
        if s != -1 and e != -1:
            manual = old[s:e + len(MANUAL_END)] + "\n"
        elif "## 已完成事项" in old:
            # 有人工内容却没有标记，宁可不写，也不能把人写的部分冲掉
            print("X HANDOFF.md 里有人工内容但没有 MANUAL 标记，拒绝覆盖。")
            print("  先补上 <!-- MANUAL:START --> 和 <!-- MANUAL:END --> 再跑。")
            return 1

    lines = [AUTO_START, f"最后更新　{stamp}　·　批次 {date}　·　规则与流程 V2", ""]
    lines.append(
        f"- 目录　`{date}/`　文案 {'有' if prose.exists() else '缺'} · 配图 {n_imgs} 张"
        f" · 预览图 {'有' if (day / '预览图.png').exists() else '缺'}"
        f" · 公开页 {'有' if (WS / (date.replace('-', '') + '.html')).exists() else '缺'}"
    )
    if heads:
        lines.append("- 条目　" + "　".join(heads))
    if n_posts:
        lines.append(f"- 主帖　{n_posts} 条，组合 {combos or '未填'}")
    if lt:
        lines.append(f"- 讲解　{len(lt)} 篇（{'　'.join(lt)}）")
    if slugs:
        lines.append(f"- 配图　带图 {len(with_img)} 套（{'、'.join(with_img) or '无'}）· 纯卡片 {len(cards)} 套（{'、'.join(cards) or '无'}）")
    receipt = TOOLS / "复审" / f"{date}.md"
    gate_ok = False
    if receipt.exists():
        rows = [l for l in receipt.read_text(encoding="utf-8").splitlines()
                if re.match(r"^\|\s*[一二三四]\s*\|", l)]
        gate_ok = len(rows) == 4 and all(
            all(c.strip() for c in r.split("|")[3:6]) for r in rows
        )
    lines.append(f"- 闸门　`python3 工具/review.py {date} --check`" + ("　已过" if gate_ok else "　还没跑"))
    lines += [AUTO_END, ""]

    OUT.write_text(
        "# HANDOFF · V2\n\n"
        "> 每次收工写，每次开工先读。自动段由 `工具/handoff.py` 重写，人工段自己填。\n"
        "> 规则与流程版本 V2（`WRITING.md` 内部沿革编号是 v6，同一个东西）。\n\n"
        "## 当前进度\n\n" + "\n".join(lines) + "\n" + manual,
        encoding="utf-8",
    )
    print(f"交接已更新 → HANDOFF.md（{date}，配图 {n_imgs} 张，带图 {len(with_img)} 套）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
