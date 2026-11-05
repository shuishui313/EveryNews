# EveryNews

One local pipeline turns each day's AI news into a ready-to-post package: six stories, three 1080×1350 portrait cards each, with an X main post, Threads copy, a fact sheet, and two explainer essays, then one single-file webpage that opens from a URL.

[中文](README.md) | **English**

[What it does](#what-it-does) · [Why use it](#why-use-it) · [Quick start](#quick-start) · [Make it your own](#make-it-your-own) · [What's verified](#whats-verified) · [Known limitations](#known-limitations) · [Directory](#directory)

![Today's output preview](preview.png)

## What it does

Run one production pass and you get:

| Output | Description |
|---|---|
| 18 portrait cards | Six stories × three cards, 14 layouts; the six lead images are deduped automatically so the layouts don't collide |
| X main post + Threads copy | Traditional Chinese, zero colons and zero dashes. X main post 120–200 characters; the Threads target in the rule sheet is 150–250, and the gate accepts 120–260 |
| Fact sheet | One table per story, with time, subject, figures, sources, and unconfirmed boundaries written out line by line |
| Explainer essays | Two pieces, 600–900 Chinese characters (han count), clear enough to read and then do |
| Single-file public page | Images fully inlined; drop one HTML file on any static host and it is reachable |

## Why use it

- **Rule-driven, stable voice.** What to write, how to write it, and what to hand off all live in one rule sheet, so whoever runs it gets the same flavor.
- **Gated checks.** Character-count ranges, colons and dashes, source tiers, layout dedup, and most reversal phrasing are checked automatically. Fail the gate and no draft goes out.
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

Each day, once the draft run and make-public are done, one push is a new issue. Pages hosts the static file that was already generated.

## Make it your own

Writing rules are in [`WRITING.md`](WRITING.md) (in Chinese), card layouts in [`工具/PROMPT.md`](工具/PROMPT.md) (in Chinese), source tiers in [`SOURCES.md`](SOURCES.md) (in Chinese), and the voice itself in [`.codebuddy/skills/human-writing/`](.codebuddy/skills/human-writing/) (in Chinese; the rules call this tree human-writing). Change those files and the same pipeline works for any subject. What it produces is your own column.

## What's verified

What this repo stands behind is the local path: `node`, `python3`, and `playwright-cli`. `./出稿.sh` renders the cards, runs the gate, and archives the day. `node 工具/make-public.mjs` writes the single-file page. The live example above is static HTML already on GitHub Pages. This repo has no end-to-end record of a cloud CI run, or of publishing through an X or Threads account.

## Known limitations

There is no public Issue yet. These are worth opening, then linking from this section: the copyright line for press images is still unset; `工具/grab.sh` times out on some sites; the gate only warns on the「不在 A，在 B」and「不是 A，是 B」reversal patterns; Threads length is 150–250 in the rule sheet and 120–260 at the gate. Link only an Issue that already exists. Background notes are in [`HANDOFF.md`](HANDOFF.md) (in Chinese).

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
| [`WRITING.md`](WRITING.md) (in Chinese) | What to write, how to write it, and what to hand off. The only rule sheet |
| [`SHORTNEWS-V1.md`](SHORTNEWS-V1.md) (in Chinese) | Order of the six short-form stages, and the output contract |
| [`SOURCES.md`](SOURCES.md) (in Chinese) | Where to look, and which tier may be cited |
| [`CODEBUDDY.md`](CODEBUDDY.md) (in Chinese) | Steps required at the start of each round |
| [`HANDOFF.md`](HANDOFF.md) (in Chinese) | Cross-day handoff. The script rewrites the auto section |
| `出稿.sh` | Production entry. Date, slug, and directory names are the contract |
| [`工具/PROMPT.md`](工具/PROMPT.md) (in Chinese) | Image layouts and rendering |
| `工具/render.mjs` | Card rendering (1080×1350) |
| `工具/make.sh` | Render and screenshot one set |
| `工具/review.py` | Production gate and review receipts |
| `工具/check-post.mjs` | Copy length and sentence-shape checks |
| `工具/check-layouts.mjs` | Layout and image-source checks |
| `工具/grab.sh` | Grabbing images from primary sources |
| `工具/preview.mjs` | Local overview page |
| `工具/make-preview.py` | Full-page thumbnail |
| `工具/make-public.mjs` | Single-file public page |
| `工具/site.mjs` | Multi-issue static site. Writes to `site/` by default |
| `工具/ledger.mjs` | Writes the story ledger back |
| `工具/handoff.py` | Refreshes the auto section of `HANDOFF.md` |
| [`.codebuddy/skills/human-writing/`](.codebuddy/skills/human-writing/) (in Chinese) | The voice itself. The rules call it human-writing. Cite it; do not rewrite it |
| [`选题台账.md`](选题台账.md) (in Chinese) | Each issue's stories, with actual figures written back |
| [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) (in Chinese) | The three questions a pull request answers |

</details>
