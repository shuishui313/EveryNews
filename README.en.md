# EveryNews

One streamlined local pipeline turns each day's primary-source AI news into a fast, readable static webpage: 3–6 editorial briefing notes (external WebP visual cards + single cohesive body copy + collapsible fact sheet + primary link) plus two long-form explainers.
Live example: https://shuishui313.github.io/EveryNews/index.html

[中文](README.md) | **English**

[What it does](#what-it-does) · [Why use it](#why-use-it) · [Quick start](#quick-start) · [Homepage and issue switcher](#homepage-and-issue-switcher) · [Put it on your own GitHub Pages](#put-it-on-your-own-github-pages) · [Make it your own](#make-it-your-own) · [What's verified](#whats-verified) · [Known limitations](#known-limitations) · [Directory](#directory)

## What it does

Run one production pass and you get:

| Output | Description |
|---|---|
| Editorial briefing notes | 3–6 stories (typically 6), Traditional Chinese, natural cohesive prose (90–280 characters, 1–3 paragraphs) without clipped hook fragments or duplicate X/Threads columns |
| External WebP cards | Deep-violet & warm-paper visual system, 1–3 flexible cards per story (supporting 4:5 portrait and 16:9 landscape frames), transcoded to `cards/<YYYYMMDD>/*.webp` (~90% smaller than legacy double-inlined PNGs) |
| Fact sheet | One collapsible table per story with time, subject, figures, sources, and unconfirmed boundaries |
| Explainer essays | Two pieces every day, 600–950 Chinese characters (han count) each, walking through mechanisms, costs, and boundaries |
| Lightweight public page | `<YYYYMMDD>.html` (~25 KB HTML shell) with lazy-loaded WebP cards and click-to-zoom lightbox |
| Homepage & archive | `index.html` shows the latest issue in full; `archive.html` filters by date and keyword; `issues.js` drives the top issue switcher so historical HTML files are never rewritten |

## Why use it

- **First-party editorial voice (`everynews-editorial`).** Drops social-media hook fragments and rigid combo templates in favor of clear, connected peer-to-peer reporting.
- **Automated red-line linter.** Prompt-style colons, dashes, reversal clichés, 3-part parallelisms, numbered outline grids, and corporate buzzwords are blocked automatically by the built-in Node linter.
- **Lightweight and incremental.** Separating the ~25 KB HTML from external WebP cards makes copy re-runs finish in ~3 seconds with clean text-only Git diffs, while `issues.js` leaves past issues untouched.
- **Runs entirely locally.** Uses `node` and `python3` (plus `playwright-cli` when rendering new cards), with no cloud lock-in.

## Quick start

Prerequisites: node 18+, python3 (with Pillow), playwright-cli (only needed when rendering new card sets).

```bash
git clone https://github.com/<your-username>/EveryNews.git
cd EveryNews

# Full production run (including card rendering)
./出稿.sh <YYYY-MM-DD> <slug...>

# Copy-only re-run (reuses existing cards, finishes in ~3s)
./出稿.sh <YYYY-MM-DD>
```

This writes `<YYYYMMDD>.html` (~25 KB) and `cards/<YYYYMMDD>/*.webp` (~350–450 KB for 18 cards), and refreshes `issues.js`, `index.html`, `archive.html`, `选题台账.md`, and `HANDOFF.md`.

## Homepage and issue switcher

The site root `/` is today's work. Open it and you see today's stories, visual cards, collapsible fact sheets, and two explainers directly. Every issue page has an issue nav at the top populated dynamically from root `issues.js`, plus links back to today's homepage and to the full archive.

`archive.html` supports filtering by issue dropdown, exact date picker, and title keyword search. Historical issue HTML files reference `issues.js` statically and are not rewritten on future runs.

Each day's content lives in `<YYYYMMDD>.html`, `cards/<YYYYMMDD>/`, and `选题台账.md`; the dated working directory holds only the current day.

## Put it on your own GitHub Pages

After the repo is pushed, open Settings → Pages → Source and choose `Deploy from a branch` (main / root). The link is:

```
https://<your-username>.github.io/<repo-name>/               # today's work, with the issue switcher on top
https://<your-username>.github.io/<repo-name>/archive.html  # all issues, filter by date
https://<your-username>.github.io/<repo-name>/YYYYMMDD.html  # one issue
```

Live example: <https://shuishui313.github.io/EveryNews/>, the full archive at <https://shuishui313.github.io/EveryNews/archive.html>, or a single issue at <https://shuishui313.github.io/EveryNews/20261124.html>

Run `出稿.sh` once a day and push `<YYYYMMDD>.html`, `cards/<YYYYMMDD>/`, `index.html`, `archive.html`, `issues.js`, and `选题台账.md`. Pages hosts static files directly with no cloud build.

## Make it your own

The editorial voice and prose linter live in [`.codebuddy/skills/everynews-editorial/`](.codebuddy/skills/everynews-editorial/) (in Chinese), output contracts in [`WRITING.md`](WRITING.md) (in Chinese), card layouts in [`工具/PROMPT.md`](工具/PROMPT.md) (in Chinese), and source tiers in [`SOURCES.md`](SOURCES.md) (in Chinese). Change those files and the same pipeline works for any beat.

## What's verified

What this repo stands behind is the local path: `node`, `python3`, and `playwright-cli`. `./出稿.sh` runs the outline-order check, editorial red-line gate, card rendering, WebP transcoding, public page, homepage/archive refresh, ledger update, and handoff end to end. The live example above is static HTML on GitHub Pages. This repo has no end-to-end record of a cloud CI run or automated social-account posting.

## Known limitations

There is no public Issue yet. These are worth opening, then linking from this section: `工具/grab.sh` may miss images on client-rendered pages; early archived issues (20261103–20261123) retain their original inlined PNG format, while issues from 20261124 onward use external WebP cards. Link only an Issue that already exists. Background notes are in [`HANDOFF.md`](HANDOFF.md) (in Chinese).

## License

MIT

## Directory

<details>
<summary>File table</summary>

| Path | What it owns |
|---|---|
| `README.md` | Simplified Chinese guide |
| `README.en.md` | This English guide |
| [`AGENTS.md`](AGENTS.md) (in Chinese) | How agents should edit the repo |
| [`docs/decisions.md`](docs/decisions.md) (in Chinese) | Structure choices already adopted |
| [`docs/declined.md`](docs/declined.md) (in Chinese) | Approaches already declined |
| `index.html` | Today's work: full copy of the latest issue, with an issue switcher on top |
| `archive.html` | All-issues archive, filterable by date and title |
| `issues.js` | Site-wide issue list and switcher script generated by `make-index.mjs` |
| `<YYYYMMDD>.html` | Single-issue static public page; past issues are kept |
| `cards/<YYYYMMDD>/` | External WebP visual cards for each issue |
| [`.codebuddy/skills/everynews-editorial/`](.codebuddy/skills/everynews-editorial/) (in Chinese) | First-party EveryNews editorial skill and prose linter `lint.mjs` |
| [`WRITING.md`](WRITING.md) (in Chinese) | Output contract, fact-checking rules, story scoring, and gates |
| [`SHORTNEWS-V1.md`](SHORTNEWS-V1.md) (in Chinese) | Five-stage workflow order and directory contract |
| [`SOURCES.md`](SOURCES.md) (in Chinese) | Where to look, and which tier may be cited |
| [`CODEBUDDY.md`](CODEBUDDY.md) (in Chinese) | Steps required at the start of each round |
| [`HANDOFF.md`](HANDOFF.md) (in Chinese) | Cross-day handoff. The script rewrites the auto section |
| `出稿.sh` | Production entry |
| [`工具/PROMPT.md`](工具/PROMPT.md) (in Chinese) | Card layouts and visual rendering spec |
| `工具/render.mjs` | Card HTML renderer (1080×1350 portrait & 1440×810 landscape) |
| `工具/make.sh` | Renders and screenshots a card set to PNG + WebP |
| `工具/grab.sh` | Grabs primary-source figures |
| `工具/check-layouts.mjs` | Card layout and image-source checker |
| `工具/check-voice.mjs` | Outline-order, clipped-hook, and cross-story boilerplate gate |
| `工具/check-post.mjs` | Copy structure and length validator |
| `工具/review.py` | Production gate and review receipt generator |
| `工具/make-public.mjs` | External WebP transcoder and lightweight single-page builder |
| `工具/make-index.mjs` | Generates `issues.js`, syncs `index.html`, and builds `archive.html` |
| `工具/ledger.mjs` | Updates `选题台账.md` |
| `工具/handoff.py` | Refreshes the auto section of `HANDOFF.md` |
| [`选题台账.md`](选题台账.md) (in Chinese) | Per-issue story ledger for cross-day deduplication |
| [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) (in Chinese) | The three questions a pull request answers |

</details>
