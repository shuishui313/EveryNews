#!/usr/bin/env python3
"""出稿闸门。机器能判的自动判，判不了的逼着留下回执。

用法
  python3 工具/review.py 2026-10-30           刷新 工具/复审/<日期>.md（自动段重写，人工段保留）
  python3 工具/review.py 2026-10-30 --check   只校验，未通过返回 1（出稿.sh 用这个）

回执不进当天交付目录；老期次的 <日期>/复审.md 首次运行时自动迁入 工具/复审/。

闸门三道
  1 文字硬禁令：check_prose.py，只喂成稿正文（代码块），不管事实表和说明
  2 撞车清单：六条首句 / 末句 / 配图卡片文案排成一列，同款自己看
  3 三遍复审回执：假深刻假具体比喻换场、主干与高低差、翻案腔按动作查，逐条写证据
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

WS = Path(__file__).resolve().parent.parent
TOOLS = WS / "工具"

MANUAL_START = "<!-- MANUAL:START -->"
MANUAL_END = "<!-- MANUAL:END -->"
AUTO_START = "<!-- AUTO:START -->"
AUTO_END = "<!-- AUTO:END -->"
BODY_LABELS = ("X 主帖", "X 主贴", "Threads")

PASSES = [
    ("一", "假深刻 / 假具体 / 比喻换场"),
    ("二", "主干是否早到 / 段落有没有高低差"),
    ("三", "翻案腔按动作查（先立误解再推翻）"),
    ("四", "六条首句、末句、卡片文案横向撞车"),
]

MANUAL_TEMPLATE = f"""{MANUAL_START}
## 二 · 三遍复审回执

初稿写完、自动段跑过之后再填这张表。填的是证据，不是结论。「没发现」也要写看了哪几条才没发现。
没填满或留占位符，`出稿.sh` 会卡住不出稿。

| 遍数 | 查什么 | 看了什么（条号 / 句子） | 发现 | 怎么处理 |
|---|---|---|---|---|
| 一 | {PASSES[0][1]} |  |  |  |
| 二 | {PASSES[1][1]} |  |  |  |
| 三 | {PASSES[2][1]} |  |  |  |
| 四 | {PASSES[3][1]} |  |  |  |
{MANUAL_END}
"""

BAD_TOKENS = ("待填", "TODO", "todo", "？", "?")

# check_prose.py 的 SEMANTIC_PIVOT_PATTERNS 漏了「不在A，在B」「不是A，是B」这一族，
# 2026-10-30 复审时人工抓到两处。这里补一条项目级提醒，不阻塞闸门，只列出来。
PIVOT_EXTRA = re.compile(r"不(?:在|是)[^。！？\n]{1,24}[，,](?:而|就)?(?:在|是)[^，。！？\n]{1,24}")


def find_prose_tool() -> Path | None:
    for p in (
        WS / ".codebuddy/skills/human-writing/scripts/check_prose.py",
        Path.home() / ".codebuddy/skills/human-writing/scripts/check_prose.py",
    ):
        if p.exists():
            return p
    return None


def run_check_prose(body: str, tag: str) -> tuple[bool, str]:
    script = find_prose_tool()
    if script is None:
        return True, "! 找不到 check_prose.py，硬禁令这一步没跑"
    with tempfile.NamedTemporaryFile("w", suffix=".md", prefix=f"everynews-{tag}-", delete=False, encoding="utf-8") as fh:
        fh.write(body)
        tmp = Path(fh.name)
    try:
        proc = subprocess.run([sys.executable, str(script), str(tmp)], capture_output=True, text=True)
        out = (proc.stdout + proc.stderr).strip()
        out = out.replace(str(tmp), tag)
        return proc.returncode == 0, out
    finally:
        tmp.unlink(missing_ok=True)


def blocks(text: str) -> dict[str, list[tuple[str, str]]]:
    """按 `### 条目标题` 分组，取每组的 ``` 代码块，连同它上面那行 `**标签**`。"""
    out: dict[str, list[tuple[str, str]]] = {}
    current: str | None = None
    prev = ""
    buf: list[str] | None = None
    label = ""
    for raw in text.splitlines():
        line = raw.rstrip()
        if buf is None:
            head = re.match(r"^###\s+(.+?)\s*$", line)
            if head:
                current = head.group(1)
                out.setdefault(current, [])
                prev = line
                continue
        if line.strip() == "```":
            if buf is None:
                lm = re.match(r"^\*\*(.+?)\*\*", prev.strip())
                label = lm.group(1) if lm else ""
                buf = []
            else:
                if current is not None:
                    out.setdefault(current, []).append((label, "\n".join(buf)))
                buf = None
                label = ""
            prev = line
            continue
        if buf is not None:
            buf.append(line)
        prev = line
    return out


def long_bodies(text: str) -> list[tuple[str, str]]:
    """两篇讲解的正文。短文在代码块里，长文是纯段落，两套东西不能混着查。"""
    out: list[tuple[str, str]] = []
    name: str | None = None
    buf: list[str] = []
    in_body = False

    def flush() -> None:
        if name and buf:
            out.append((name, "\n".join(buf).strip()))

    for raw in text.splitlines():
        line = raw.rstrip()
        if re.match(r"^#{1,3}\s", line):
            flush()
            name, buf, in_body = None, [], False
            h = re.match(r"^###\s+(講.+?|讲.+?)\s*$", line)
            if h:
                name = h.group(1)
            continue
        if name is None:
            continue
        s = line.strip()
        if s == "**正文**":
            in_body = True
            continue
        if s.startswith("**最值得看**"):
            flush()
            name, buf, in_body = None, [], False
            continue
        if in_body and s and not s.startswith("- ") and not re.match(r"^-{3,}$", s):
            buf.append(line)
    flush()
    return out


def first_last(body: str) -> tuple[str, str]:
    lines = [ln.strip() for ln in body.strip().splitlines() if ln.strip()]
    lines = [ln for ln in lines if not ln.startswith(("http", "#", "【"))]
    if not lines:
        return "", ""
    return lines[0], lines[-1]


def normalize(s: str) -> str:
    s = re.sub(r"^[①-⑩]\s*", "", s).strip()
    return re.sub(r"[\s，。、！？：；,.!?:;「」]", "", s)


def paragraph_shape(body: str) -> str:
    paras = [p for p in re.split(r"\n\s*\n", body.strip()) if p.strip()]
    return " ".join(str(len(re.findall(r"[。！？!?]", p)) or 1) for p in paras)


def day_slugs(date: str) -> list[str]:
    img_dir = WS / date / "配图"
    if not img_dir.exists():
        return []
    slugs: list[str] = []
    for f in sorted(img_dir.glob("*.png")):
        m = re.match(r"^\d{2}-(.+)-\d{2}\.png$", f.name)
        if m and m.group(1) not in slugs:
            slugs.append(m.group(1))
    return slugs


NEED_IMG_TYPES = ("photo-cover", "photo-annot", "photo-split", "shot", "cover-img-top", "cover-img-side")


def image_audit(date: str) -> tuple[list[str], list[str]]:
    """抓了图没用上、或者没图也没写原因，都要拦。"""
    rows: list[str] = []
    problems: list[str] = []
    img_dir = TOOLS / "img"
    for slug in day_slugs(date):
        p = TOOLS / "sets" / f"{slug}.json"
        if not p.exists():
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        types = [s.get("type") for s in data.get("slides", [])]
        used = [t for t in types if t in NEED_IMG_TYPES]
        files = sorted(x.name for x in img_dir.glob(f"{slug}-*")) if img_dir.exists() else []
        reason = (data.get("noImageReason") or "").strip()
        state = "带图" if used else ("卡片·写了原因" if reason else "卡片·没写原因")
        rows.append(f"| {slug} | {len(used)} 页 | {'、'.join(files) or '—'} | {state} |")
        if files and not used:
            problems.append(f"{slug}：img/ 里有 {len(files)} 张图，set 里一页都没用上")
        if not used and not reason:
            problems.append(f"{slug}：没有带图页，也没写 noImageReason")
    return rows, problems


def card_texts(date: str) -> list[tuple[str, list[str]]]:
    slugs = day_slugs(date)
    out = []
    for slug in slugs:
        p = TOOLS / "sets" / f"{slug}.json"
        if not p.exists():
            out.append((slug, ["! sets 里没有这个 slug"]))
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            out.append((slug, [f"! json 解析失败 {exc}"]))
            continue
        texts = []
        for i, s in enumerate(data.get("slides", []), 1):
            head = s.get("headline") or []
            if isinstance(head, str):
                head = [head]
            line = " / ".join(str(x).strip() for x in head if str(x).strip())
            verdict = str(s.get("verdict") or "").strip()
            num = str(s.get("num") or "").strip()
            if not line:
                line = f"（无 headline，num={num}）" if num else "（无 headline，看渲染图）"
            texts.append(f"{i:02d} {line}" + (f"｜判断 {verdict}" if verdict else ""))
        out.append((slug, texts))
    return out


def run_check_post(date: str) -> tuple[bool, str]:
    script = TOOLS / "check-post.mjs"
    if not script.exists():
        return True, "! 找不到 check-post.mjs，结构与自查表这一步没跑"
    proc = subprocess.run(["node", str(script), date], capture_output=True, text=True, cwd=str(WS))
    return proc.returncode == 0, (proc.stdout + proc.stderr).strip()


def build_auto(date: str, sections: dict[str, list[tuple[str, str]]], raw_text: str) -> tuple[str, bool, str, list[str]]:
    body_text = "\n\n".join(b for items in sections.values() for _, b in items if b.strip())
    short_ok, short_out = run_check_prose(body_text, "短文正文")
    longs = long_bodies(raw_text)
    long_text = "\n\n".join(b for _, b in longs)
    long_ok, long_out = run_check_prose(long_text, "长文正文") if long_text else (True, "（没解析到讲解篇正文，长文这一步空过）")
    post_ok, post_out = run_check_post(date)

    parts = [
        AUTO_START, "## 一 · 自动检查", "",
        "### 0 · 结构与自查表（check-post.mjs，短文六条 + 长文两篇一起看）", "", "```", post_out or "（无输出）", "```", "",
        "### 1a · 文字硬禁令 · 短文（X 主帖 / Threads 代码块）", "", "```", short_out or "（无输出）", "```", "",
        "### 1b · 文字硬禁令 · 长文（两篇讲解正文）", "", "```", long_out or "（无输出）", "```", "",
    ]

    extra = []
    for para in re.split(r"\n\s*\n", body_text):
        for m in PIVOT_EXTRA.finditer(para):
            extra.append(f"- {m.group().strip()}")
    parts += ["### 1.5 · 脚本没覆盖的翻案腔变形（人工判，不阻塞）", ""]
    parts += extra or ["未命中。"]
    parts += [""]

    parts += ["### 2 · 六条横向看（首句 / 末句 / 段落句数）", ""]
    parts.append("| 条 | X 首句 | X 末句 | Threads 首句 | 段落句数 |")
    parts.append("|---|---|---|---|---|")
    openers: dict[str, list[str]] = {}
    closers: dict[str, list[str]] = {}
    rows = 0
    for name, items in sections.items():
        xb = next((b for l, b in items if l.startswith(("X 主帖", "X 主贴")) and b.strip()), "")
        tb = next((b for l, b in items if l.startswith("Threads") and b.strip()), "")
        if not xb and not tb:
            continue
        rows += 1
        xf, xl = first_last(xb) if xb else ("", "")
        tf, _ = first_last(tb) if tb else ("", "")
        parts.append(f"| {name} | {xf} | {xl} | {tf} | {paragraph_shape(xb) if xb else ''} |")
        for key, bag in ((normalize(xf), openers), (normalize(xl), closers)):
            if len(key) >= 4:
                bag.setdefault(key, []).append(name)
    if rows == 0:
        parts.append("| ! 没解析到正文代码块 | | | | |")

    clash = [f"- 首句同款：{'、'.join(v)}" for k, v in openers.items() if len(v) > 1]
    clash += [f"- 末句同款：{'、'.join(v)}" for k, v in closers.items() if len(v) > 1]
    parts += ["", "逐字同款：" + ("无" if not clash else ""), ""]
    parts += clash
    parts += ["", "句式同款脚本判不了，第 4 遍自己拿这张表横读。", ""]

    cards = card_texts(date)
    if cards:
        parts += ["### 3 · 配图卡片文案（同款句式最常出在这里）", ""]
        for slug, texts in cards:
            parts.append(f"**{slug}**")
            parts += [f"- {t}" for t in texts]
            parts.append("")
    img_rows, img_problems = image_audit(date)
    parts += ["", "### 4 · 配图带图审计（抓了图必须用上）", "",
              "| slug | 带图页 | img/ 里的图 | 状态 |", "|---|---|---|---|"]
    parts += img_rows or ["| — | — | — | — |"]
    if img_problems:
        parts += ["", "要处理："] + [f"- {p}" for p in img_problems]
    parts += [AUTO_END, ""]
    return "\n".join(parts), short_ok and long_ok and post_ok and not img_problems, body_text, img_problems


def manual_block(existing: str) -> str:
    s = existing.find(MANUAL_START)
    e = existing.find(MANUAL_END)
    if s != -1 and e != -1:
        return existing[s:e + len(MANUAL_END)] + "\n"
    return MANUAL_TEMPLATE


def check_manual(text: str) -> list[str]:
    problems = []
    rows: dict[str, list[str]] = {}
    for line in text.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 5 and cells[0] in {p[0] for p in PASSES}:
            rows[cells[0]] = cells
    for num, what in PASSES:
        if num not in rows:
            problems.append(f"复审表缺第 {num} 遍（{what}）")
            continue
        cells = rows[num]
        for idx, colname in ((2, "看了什么"), (3, "发现"), (4, "怎么处理")):
            val = cells[idx] if idx < len(cells) else ""
            if len(val) < 2:
                problems.append(f"第 {num} 遍「{colname}」空着")
            elif any(t in val for t in BAD_TOKENS):
                problems.append(f"第 {num} 遍「{colname}」还有占位符：{val}")
    return problems


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    date = sys.argv[1]
    check_only = "--check" in sys.argv[2:]
    day = WS / date
    prose_md = day / "文案.md"
    receipt = TOOLS / "复审" / f"{date}.md"
    legacy = day / "复审.md"

    if not prose_md.exists():
        print(f"✗ 没有 {date}/文案.md，没东西可复审")
        return 1

    receipt.parent.mkdir(parents=True, exist_ok=True)
    if not receipt.exists() and legacy.exists():
        receipt.write_text(legacy.read_text(encoding="utf-8"), encoding="utf-8")
        legacy.unlink()
        print(f"复审回执迁移 → {receipt.relative_to(WS)}")

    raw_text = prose_md.read_text(encoding="utf-8")
    sections = blocks(raw_text)
    auto, ok, body_text, img_problems = build_auto(date, sections, raw_text)
    print(f"正文 {len(body_text)} 字符，解析到 {sum(len(v) for v in sections.values())} 个代码块")

    existing = receipt.read_text(encoding="utf-8") if receipt.exists() else ""
    manual = manual_block(existing)
    receipt.write_text(
        f"# {date} 复审回执\n\n> 由 `工具/review.py` 生成。自动段重跑会重写，人工段别删标记。\n\n{auto}\n{manual}",
        encoding="utf-8",
    )
    print(f"复审回执 → {receipt.relative_to(WS)}")

    if check_only:
        problems = check_manual(manual)
        print("结构与文字检查：" + ("通过" if ok else "有失败项，看自动段第 0、1 节"))
        for p in img_problems:
            print(f"  · 配图：{p}")
        for p in problems:
            print(f"  · {p}")
        if ok and not problems:
            print("✅ 复审闸门通过")
            return 0
        return 1

    if not ok:
        print("! 硬禁令有失败项，先按自动段改")
    print(f"   下一步：填 {receipt.relative_to(WS)} 人工表 → python3 工具/review.py {date} --check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
