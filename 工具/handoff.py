#!/usr/bin/env python3
"""收工写交接。自动段每次重写，人工段原样保留。"""

from __future__ import annotations

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

1. 具体的动作

## 关键上下文

- 下次会话必须知道的约定、路径、中间状态
{MANUAL_END}
"""


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


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    date = sys.argv[1]
    stamp_day = date.replace("-", "")
    day = WS / date
    prose = day / "文案.md"
    if not day.exists():
        print(f"✗ 没有 {date}/ 这个目录")
        return 1

    html_file = WS / f"{stamp_day}.html"
    html_info = f"有（{max(1, round(html_file.stat().st_size / 1024))} KB）" if html_file.exists() else "缺"
    cards_dir = WS / "cards" / stamp_day
    webps = list(cards_dir.glob("*.webp")) if cards_dir.exists() else []
    webp_kb = round(sum(f.stat().st_size for f in webps) / 1024)

    heads = titles(prose)
    lt = long_titles(prose)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    manual = MANUAL_TEMPLATE
    if OUT.exists():
        old = OUT.read_text(encoding="utf-8")
        s, e = old.find(MANUAL_START), old.find(MANUAL_END)
        if s != -1 and e != -1:
            manual = old[s:e + len(MANUAL_END)] + "\n"

    lines = [AUTO_START, f"最后更新　{now_str}　·　批次 {date}　·　everynews-editorial V3", ""]
    lines.append(
        f"- 产物　公开页 `{html_file.name}` {html_info} · 外置 WebP 配图 `cards/{stamp_day}/` {len(webps)} 张（共 {webp_kb} KB）"
    )
    if heads:
        lines.append("- 快讯　" + "　".join(heads))
    if lt:
        lines.append(f"- 讲解　{len(lt)} 篇（{'　'.join(lt)}）")
    receipt = TOOLS / "复审" / f"{date}.md"
    gate_ok = False
    if receipt.exists():
        rows = [l for l in receipt.read_text(encoding="utf-8").splitlines() if re.match(r"^\|\s*[一二三四]\s*\|", l)]
        gate_ok = len(rows) == 4 and all(all(c.strip() for c in r.split("|")[3:6]) for r in rows)
    lines.append(f"- 闸门　`python3 工具/review.py {date} --check`" + ("　已过" if gate_ok else "　还没跑"))
    lines += [AUTO_END, ""]

    OUT.write_text(
        "# HANDOFF · V3\n\n"
        "> 每次收工写，每次开工先读。自动段由 `工具/handoff.py` 重写，人工段自己填。\n\n"
        "## 当前进度\n\n" + "\n".join(lines) + "\n" + manual,
        encoding="utf-8",
    )
    print(f"交接已更新 → HANDOFF.md（{date}，快讯 {len(heads)} 条，WebP 配图 {len(webps)} 张 / {webp_kb} KB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
