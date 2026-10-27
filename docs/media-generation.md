# Rebuilding the Kanban demo

The README media is an **offline, synthetic UI illustration**, not a recording of a private board. The editable SVG-producing JavaScript models the real Kanban controls with invented Alpha/Beta/Gamma tasks. It reads no board, browser profile, network service or credentials.

## Quick rebuild

Prerequisites: Node.js 22 or newer, FFmpeg and ffprobe on PATH, and an Arial-compatible system font (Liberation Sans on Linux). This pipeline was tested with **Node 24.22.1, Sharp 0.35.5, FFmpeg/ffprobe 7.1.5, Liberation Sans 2.1.5** on Linux. No other OS has been verified. Dependencies retain their own licenses; no binaries or fonts are bundled.

Install the isolated renderer dependency once:

```sh
npm install --prefix scripts/media --ignore-scripts
```

Then rebuild everything with one command from the repository root:

```sh
node scripts/media/build.cjs
```

Sharp's supported platform package must be available; use its official installation guidance if your platform cannot load it. Do not install system packages or change security settings silently. The build itself is offline. Initial npm dependency installation requires network access. The direct Sharp version is pinned in `scripts/media/package.json`; transitive dependency resolution is not locked, so this is not a hermetic build.

For a separate review directory:

```sh
node scripts/media/build.cjs --output ./media-review
```

Default outputs go into `docs/media/`. Only these named generated assets/reports are replaced; unrelated files are preserved. Do not point the build at a directory with precious files bearing the same names. Symlink output paths (including dangling symlinks), non-regular targets and multiply-linked files are rejected before rendering and rechecked before each write. File writes use `O_NOFOLLOW` and verify the open file before truncation; platforms without `O_NOFOLLOW` are not supported. Use an output directory under your sole control; this is not a sandbox against another process replacing ancestor directories concurrently. Frames/palette are rendered into a unique system temporary directory and that directory alone is removed in `finally`, including ordinary build failures. A forced process kill or power failure can leave a `kanban-media-*` temporary directory; inspect ownership and contents before manually removing it. The pipeline renders sequentially and limits Sharp/FFmpeg workers to two; avoid overlapping heavy builds on a shared host.

## Outputs

| File | Purpose |
|---|---|
| `kanban-workflow.gif` | 1200 × 800, 480 frames, 32 seconds, nominal 15 fps, continuous loop |
| `kanban-workflow-poster.png` | Static fallback, not the lead README visual |
| `task-detail.png` | Owner, next step and illustrative evidence |
| `task-history.png` | Expanded historical task version |
| `project-focus.png` | Alpha project filter with matching task counts |
| `contact-sheet.png` | Animation checkpoints for visual review |
| `panels-contact-sheet.png` | All three panels for visual review |
| `media-verification.json` | Exact renderer versions, dimensions, hashes, duration and frame count |
| `interaction-timeline.json`, `synthetic-fixtures.json`, `panel-specs.json` | Generated review aids |

Only the GIF, poster and three feature panels need to be referenced in README. Review sheets/reports may remain local; they are not screenshots or application test receipts. GIF centisecond timing means per-frame delays alternate; nominal 15 fps totals 32 seconds.

## What to edit

- `scripts/media/synthetic-ui.cjs`: synthetic task text, palette, layout, cursor waypoints, click targets, stage transitions, captions and scene timing. Both GIF and feature panels share it.
- `scripts/media/render-animation.cjs`: frame generation, closing crossfade, poster and contact-sheet checkpoints.
- `scripts/media/render-panels.cjs`: three crop regions, headings and invented detail-panel evidence. Keep text substitutions aligned with the shared UI if its labels change.
- `scripts/media/build.cjs`: constrained offline build, encoding and machine checks.
- `scripts/media/safe-output.cjs`: output path/type checks and no-follow writes.
- `scripts/media/test-safe-output.cjs`: lightweight safety regression fixtures; run `node scripts/media/test-safe-output.cjs` without rebuilding the GIF.
- `.agents/skills/kanban-media/SKILL.md`: agent workflow and privacy/quality checks.

Source UI references are `app/board.tsx`, `app/activity.tsx`, `app/globals.css`, and `lib/types.ts`; baseline SHA-256 values are in `scripts/media/source-reference-hashes.json`. Compare these to current source before rebuilding after a product change. They identify the inputs used to design the illustration, not a guarantee that the present UI is unchanged. Keep instructions and code in the project so another agent can reproduce the assets without private conversation history.

## Acceptance checks

1. Build must exit successfully. Machine checks require all primary outputs at 1200 × 800, GIF 480 frames, infinite loop and 32-second duration; record SHA-256 and exact tool versions.
2. Watch the GIF, not just the contact sheet: pointer clicks must hit visible controls, text entry must be readable, scroll must reveal Save, and stage/filter/history states must agree. Confirm the final-to-first transition is smooth.
3. Review all feature panels at full resolution: useful distinct crops, no truncated text, evidence clearly fictional and filter counts consistent. Preserve the visible sample-data labels.
4. Re-check against the actual UI source. Media checks do not replace running the application or testing deployment/authentication.
5. Inspect the public diff for real names/tasks, private links, auth data, logs, environment files, caches and frame dumps. Use the project's approved leak scanner if available. No script can prove that all private information is absent; human review remains required.

Expected byte hashes can vary with system fonts, librsvg/libvips and FFmpeg versions. Compare hashes when versions match, and always inspect visuals after a dependency or font change. Do not claim reproducibility across untested platforms.
