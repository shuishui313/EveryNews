# EveryNews

Turn each day's AI news into a ready-to-post package: six stories, three 1080×1350 portrait cards each, with an X main post, Threads copy, a fact sheet, and two explainer essays, then compress it into a single-file webpage that opens from a URL.

[中文](README.md) | **English**

![Today's output preview](preview.png)

## What it does

Run one production pass and you get:

| Output | Description |
|---|---|
| 18 portrait cards | Six stories × three cards, 14 layouts; the six lead images are deduped automatically so the layouts don't collide |
| X main post + Threads copy | 120–200 characters each, Traditional Chinese, zero colons and zero dashes |
| Fact sheet | One table per story, with time, subject, figures, sources, and unconfirmed boundaries written out line by line |
| Explainer essays | Two pieces of 600–900 characters, clear enough to read and then do |
| Single-file public page | Images fully inlined; drop one HTML file on any static host and it is reachable |

## Why use it

- **Rule-driven, stable voice.** What to write, how to write it, and what to hand off all live in one rule sheet, so whoever runs it gets the same flavor.
- **Gated checks.** Character-count ranges, colons and dashes, reversal phrasing, source tiers, and layout dedup are checked automatically. Fail the gate and no draft goes out.
- **One command for the package, one command for the public page.** Rendering, archiving, the ledger, review receipts, and handoff docs all finish in a single run.
- **Runs entirely locally.** node + python + playwright, no cloud dependency, and the output stays yours.

## Quick start

Prerequisites: node 20+, python3, playwright-cli (used to render card screenshots).

```bash
git clone https://github.com/<your-username>/EveryNews.git
cd EveryNews

# Produce one day's package (render, gate, archive, and handoff in one run)
./出稿.sh <YYYY-MM-DD> <slug...>

# Compress that day's output into a single-file public page
node 工具/make-public.mjs <YYYY-MM-DD>   # omit the date to use the latest issue
```

This writes `<YYYYMMDD>.html`, with images and CSS inlined, about 5 MB. Take the single file and it opens.

## Put it on your own GitHub Pages

After the repo is pushed, open Settings → Pages → Source and choose `Deploy from a branch` (main / root). The link is:

```
https://<your-username>.github.io/<repo-name>/YYYYMMDD.html
```

Live example: <https://shuishui313.github.io/EveryNews/20261103.html>

Each day, once the draft run and make-public are done, one push is a new issue.

## Make it your own

Writing rules are in `WRITING.md`, card layouts in `工具/PROMPT.md`, source tiers in `SOURCES.md`, and the voice itself in `human-writing/`. Change those files and the same pipeline works for any subject. What it produces is your own column.

## Directory

- `WRITING.md` — what to write, how to write it, and what to hand off; the only rule sheet
- `SHORTNEWS-V1.md` — the order of the six short-form stages
- `SOURCES.md` — where to look, and which tier may be cited
- `工具/PROMPT.md` — image layouts and rendering
- `工具/render.mjs` — card rendering (1080×1350)
- `工具/review.py` — production gate and review receipts
- `工具/grab.sh` — grabbing images from primary sources
- `工具/preview.mjs` · `工具/make-preview.py` — local overview page and full-page thumbnail
- `工具/site.mjs` — multi-issue archive static site
- `工具/make-public.mjs` — single-file public page generation
- `human-writing/` — the voice itself
- `选题台账.md` — each issue's stories, with actual figures written back

## License

MIT
