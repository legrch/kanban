---
name: kanban-media
description: Rebuild or update this Kanban project's synthetic README GIF, feature panels, and media captions after UI changes. Use for cursor-led product demos, cropped feature illustrations, or reproducible README media; not for private-board capture or application acceptance tests.
---

# Kanban media

1. Read `docs/media-generation.md` from the repository root. Inspect current `app/board.tsx`, `app/activity.tsx`, `app/globals.css`, and `lib/types.ts` before changing a depicted interaction. Compare `scripts/media/source-reference-hashes.json`; differences require review, not automatic rejection or overwriting application source.
2. Use only invented fixtures in `scripts/media/synthetic-ui.cjs`. Keep the visible **Illustrated demo · sample data** / **Illustrated detail · sample data** labels. Do not fetch a live board, use private screenshots, or introduce credentials, real task history, private URLs, or owner data.
3. Change the shared UI/scenes and timing in `synthetic-ui.cjs`; change panel crops and captions in `render-panels.cjs`. Update cursor targets when moving controls. Keep animation actions faithful to implemented behavior. Do not imply agent/provider support that has not been tested.
4. Run the documented offline build command. Review the GIF in motion and both contact sheets: cursor targets, readable typing, scrolling, creation/save, filter counts, stage changes, history and loop transition. Check panels for clipped text and incorrect surrounding states. Inspect `media-verification.json` for dimensions, frame count, duration and hashes.
5. Put the GIF first in README; use the three distinct panels below with specific explanations and meaningful alt text. Describe the animation as an illustration, not a recording or proof that deployment works.
6. Commit only the intended scripts, documentation and approved media outputs. Never add temporary frame directories, dependency binaries, caches or private data. Publication and production changes still require their applicable authority. Report exact tested versions and any unverified platform behavior.

This project skill is not assumed to be auto-discovered by every agent. If needed, explicitly ask the agent to read this file. Keep a short pointer in the repository's existing agent instructions rather than maintaining duplicate workflows.
