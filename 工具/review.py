#!/usr/bin/env python3
"""出稿复审闸门（配合 everynews-editorial 原生规范）。

用法
  python3 工具/review.py 2026-11-24           刷新 工具/复审/<日期>.md（自动段重写，人工段保留）
  python3 工具/review.py 2026-11-24 --check   刷新并校验，未通过返回 1（出稿.sh 用这个）

闸门三道
  1 结构与篇幅：check-post.mjs（快讯 3–6 条 + 讲解 2 篇）
  2 编辑台红线：.codebuddy/skills/everynews-editorial/scripts/lint.mjs（快讯与长文分开跑）
  3 改稿回执表：读出声连贯性、删减测试、事实与未公开边界核对
"""

from __future__ import annotations

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
BODY_LABELS = ("正文", "X 主帖", "X 主贴")

PASSES = [
    ("一", "连贯性与主干早到（拆掉短钩子与绕口长定语）"),
    ("二", "删减测试與去空话（删掉单独截图好看却无事实的句子）"),
    ("三", "正面判断与黑话清理（零翻案抬价、零大纲报数、零黑话）"),
    ("四", "事实边界与横向节奏（各条切入角度错开、未公开项交底）"),
]

MANUAL_TEMPLATE = f"""{MANUAL_START}
## 二 · 编辑台改稿回执

初稿写完、自动段跑过之后填写。记录实际检查过的段落、发现的问题与处理动作。
没填满或留占位符，`出稿.sh` 会卡住不出稿。

| 项 | 查什么 | 看了什么（条号 / 段落） | 发现 | 怎么处理 |
|---|---|---|---|---|
| 一 | {PASSES[0][1]} |  |  |  |
| 二 | {PASSES[1][1]} |  |  |  |
| 三 | {PASSES[2][1]} |  |  |  |
| 四 | {PASSES[3][1]} |  |  |  |
{MANUAL_END}
"""

BAD_TOKENS = ("待填", "TODO", "todo", "？", "?")


def find_lint_tool() -> Path | None:
    p = WS / ".codebuddy/skills/everynews-editorial/scripts/lint.mjs"
    return p if p.exists() else None


def run_editorial_lint(body: str, tag: str) -> tuple[bool, str]:
    script = find_lint_tool()
    if script is None:
        return False, "✗ 找不到 .codebuddy/skills/everynews-editorial/scripts/lint.mjs"
    with tempfile.NamedTemporaryFile("w", suffix=".md", prefix=f"everynews-{tag}-", delete=False, encoding="utf-8") as fh:
        fh.write(body)
        tmp = Path(fh.name)
    try:
        proc = subprocess.run(["node", str(script), str(tmp), "--mode=raw"], capture_output=True, text=True)
        out = (proc.stdout + proc.stderr).strip().replace(tmp.name, tag)
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
    """两篇讲解的正文。"""
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
    paras = [
        "".join(ln.strip() for ln in p.splitlines() if ln.strip() and not ln.strip().startswith(("http", "#", "【")))
        for p in re.split(r"\n\s*\n", body.strip())
    ]
    paras = [p for p in paras if p]
    if not paras:
        return "", ""
    first_sent = re.split(r"(?<=[。！？])", paras[0])[0]
    last_sents = [s for s in re.split(r"(?<=[。！？])", paras[-1]) if s.strip()]
    return first_sent, (last_sents[-1] if last_sents else paras[-1])


def paragraph_shape(body: str) -> str:
    paras = [
        p.strip()
        for p in re.split(r"\n\s*\n", body.strip())
        if p.strip() and not re.match(r"^https?:\/\/\S+$", p.strip())
    ]
    return " / ".join(f"{len(re.findall(r'[。！？!?]', p)) or 1}句" for p in paras)


def run_check_post(date: str) -> tuple[bool, str]:
    script = TOOLS / "check-post.mjs"
    if not script.exists():
        return True, "! 找不到 check-post.mjs"
    proc = subprocess.run(["node", str(script), date], capture_output=True, text=True, cwd=str(WS))
    return proc.returncode == 0, (proc.stdout + proc.stderr).strip()


def build_auto(date: str, sections: dict[str, list[tuple[str, str]]], raw_text: str) -> tuple[str, bool, str]:
    body_text = "\n\n".join(
        b for items in sections.values() for l, b in items if l.startswith(BODY_LABELS) and b.strip()
    )
    short_ok, short_out = run_editorial_lint(body_text, "快讯正文")
    longs = long_bodies(raw_text)
    long_text = "\n\n".join(b for _, b in longs)
    long_ok, long_out = (
        run_editorial_lint(long_text, "长文正文")
        if long_text
        else (False, "✗ 未解析到长文讲解正文")
    )
    post_ok, post_out = run_check_post(date)

    parts = [
        AUTO_START, "## 一 · 自动检查（everynews-editorial）", "",
        "### 0 · 结构与篇幅（check-post.mjs）", "", "```", post_out or "（无输出）", "```", "",
        "### 1a · 编辑台红线 · 快讯正文", "", "```", short_out or "（无输出）", "```", "",
        "### 1b · 编辑台红线 · 长文讲解", "", "```", long_out or "（无输出）", "```", "",
        "### 2 · 各条起手与落点速览", "",
        "| 条 | 起手第一句 | 收尾落点 | 段落节奏 |",
        "|---|---|---|---|",
    ]

    for name, items in sections.items():
        xb = next((b for l, b in items if l.startswith(BODY_LABELS) and b.strip()), "")
        if not xb:
            continue
        xf, xl = first_last(xb)
        parts.append(f"| {name} | {xf} | {xl} | {paragraph_shape(xb)} |")

    parts += ["", AUTO_END, ""]
    return "\n".join(parts), short_ok and long_ok and post_ok, body_text


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
            problems.append(f"复审表缺第 {num} 项（{what}）")
            continue
        cells = rows[num]
        for idx, colname in ((2, "看了什么"), (3, "发现"), (4, "怎么处理")):
            val = cells[idx] if idx < len(cells) else ""
            if len(val) < 2:
                problems.append(f"第 {num} 项「{colname}」空着")
            elif any(t in val for t in BAD_TOKENS):
                problems.append(f"第 {num} 项「{colname}」还有占位符：{val}")
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

    if not prose_md.exists():
        print(f"✗ 没有 {date}/文案.md，没东西可复审")
        return 1

    receipt.parent.mkdir(parents=True, exist_ok=True)
    raw_text = prose_md.read_text(encoding="utf-8")
    sections = blocks(raw_text)
    auto, ok, body_text = build_auto(date, sections, raw_text)
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
        print("结构与文字红线：" + ("通过" if ok else "有失败项，看自动段第 0、1 节"))
        for p in problems:
            print(f"  · {p}")
        if ok and not problems:
            print("✅ 复审闸门通过")
            return 0
        return 1

    if not ok:
        print("! 红线检查有失败项，先按自动段改")
    print(f"   下一步：填 {receipt.relative_to(WS)} 回执表 → python3 工具/review.py {date} --check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
