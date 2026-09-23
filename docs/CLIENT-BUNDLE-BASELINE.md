# Client bundle baseline - 2026-09-23

Next.js 16.2.10 / built-in Turbopack experimental analyzer.

## Method

Ran the installed CLI: node node_modules/next/dist/bin/next experimental-analyze --output.
Matching documentation: node_modules/next/dist/docs/01-app/02-guides/package-bundling.md.
Local report: .next/diagnostics/analyze (ignored generated files; contains source details).
The command analyzes production bundles without producing a deployable build.
No database commands, migrations, preference changes or dependency installs were run.

Read each route analyze.data: first four bytes are the big-endian JSON header length.
For each chunk_parts entry, include only output_files filenames beginning with
[client-fs]/ and ending in .js. Sum size, and reconstruct source paths using
sources parent_source_index. Count distinct output filenames.

These are uncompressed module-attributed bytes across ALL route-associated browser
JS chunks, including shared code. They are not initial-network bytes, compressed
HTTP response sizes, exclusive route cost, Web Vitals or device execution timings.
Do not add route totals together; shared chunks overlap.

## Results

| Route | Attributed JS bytes | Associated JS chunks |
| --- | ---: | ---: |
| /sanctuary/[verseId] | 1,304,448 | 26 |
| /game/sessions/[sessionId] | 1,345,857 | 28 |

## Focused findings

- Sanctuary Markdown-family packages: 113,160 bytes. Group includes react-markdown, remark-, rehype-, micromark*, mdast-, hast-, unist-, unified and vfile*. This deliberately excludes other generic transitive dependencies, so it is not a complete removal estimate.
- Gameplay @dnd-kit/* packages: 43,998 bytes.
- Gameplay modes/ components combined: 36,013 bytes. All five mode components are present; GameShell imports them synchronously.
- Next framework and shared shell/UI dependencies account for substantial portions of both route totals.

## Decision and next work

Prioritize evaluating server-rendered Sanctuary study Markdown: content is server-loaded
and does not change when saving a private note or toggling favorite. Preserve the
existing Markdown safety rules, section presentation and isolated preview coverage.
A before/after analyzer comparison must establish actual client savings.

Defer gameplay lazy-loading until loading behavior is designed around server-created
attempt deadlines. Adding a chunk fetch after a timed attempt begins could reduce
usable play time. This baseline alone does not justify that behavior change.

No application refactor was made during this measurement. Browser network/timing
measurements and representative database plans remain separate open checks.

## Sanctuary comparison

The same analyzer and calculation were rerun after moving the static study
article and contents navigation to Server Components. Notes, favorites, mobile
tabs, pending feedback, and toasts remain in the client component.

| Measurement | Before | After | Change |
| --- | ---: | ---: | ---: |
| Route-associated browser JS | 1,304,448 bytes | 1,155,119 bytes | -149,329 bytes (-11.4%) |
| Associated browser JS chunks | 26 | 25 | -1 |
| Markdown-family browser JS | 113,160 bytes | 0 bytes | -113,160 bytes |

These retain the baseline limitations: totals include shared route-associated
chunks and are not initial downloads, compressed transfers, execution timings,
or Web Vitals. The result proves that the Markdown parser family left the
Sanctuary browser graph and quantifies the broader route attribution change.
