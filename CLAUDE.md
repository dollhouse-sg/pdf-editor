# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, client-side PDF page editor (React + Vite + TypeScript). Drop in PDFs, their
pages append to one unified thumbnail grid, drag to reorder, select and delete, undo/redo,
export a subset via page ranges. No backend, no upload — everything happens in the browser.

**Read `PLAN.md` before making non-trivial changes.** It is the design doc and is kept
current: core data model, dependency choices and why, UI/UX principles, undo/redo
semantics, export semantics, known gotchas, and what's deliberately out of scope for v1
(rotate, split, text editing, annotations, OCR, compression). Don't re-litigate decisions
documented there without reading the reasoning first.

## Commands

```bash
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run test      # vitest run (all tests)
npm run lint      # eslint .
```

Single test file: `npx vitest run src/lib/pdf/ranges.test.ts`
Watch mode: `npx vitest`

## Architecture

State is one `useReducer` (`src/store.ts`) — no external state library. Two pieces of
state: `docs: Map<string, SourceDoc>` (raw PDF bytes + live pdf.js proxy per source file)
and `pages: GridPage[]` (the flat, ordered, unified page pool — `{ uid, docId, pageIndex }`).
Reorder mutates the array, delete splices it, export is a pure read. `uid` is a random id,
not derived from `docId:pageIndex`, so future page duplication won't collide as dnd-kit keys.

Undo/redo is a snapshot stack (`past`/`future` of `{ pages, label }`), not command/inverse
pairs — cheap because `pages[]` is small plain objects. It snapshots `pages[]` only, never
`docs` (which holds bytes and worker-backed proxies). Drag reorders are coalesced into a
single history entry at `onDragEnd`, not per `onDragOver` tick. When the history cap (50)
evicts an entry, `reclaimDocs` in `store.ts` destroys any `SourceDoc` no longer referenced
by the present or any surviving snapshot.

`src/lib/pdf/`:
- `loader.ts` — `File -> SourceDoc`. Note pdf.js detaches the `ArrayBuffer` it's given, so
  the pristine bytes kept for `@cantoo/pdf-lib` export must be a separate copy.
- `thumbnails.ts` — lazy rasterization via `IntersectionObserver` behind a
  concurrency-limited queue, blob-URL cache keyed by `${docId}:${pageIndex}`. Every grid
  cell stays mounted (no virtualization — see PLAN.md's "Deviation" section for why).
- `export.ts` — `GridPage[] -> PDF bytes` via `@cantoo/pdf-lib` (the maintained fork of
  `pdf-lib`, not `Hopding/pdf-lib`). Groups indices per source doc for one `copyPages` call
  each, then walks grid order via a per-doc cursor — handles duplicate/interleaved pages
  correctly in one pass per source.
- `ranges.ts` — pure parser for export range syntax (`1-3, 7, 12-15`): order-as-typed,
  duplicates allowed, open-ended `5-`, out-of-range is a validation error not a clamp.

UI is shadcn/ui only (`src/components/ui/`) for every visible chrome element — no
hand-built buttons/dialogs/inputs. `@dnd-kit`, `pdfjs-dist`, and `@cantoo/pdf-lib` are the
only non-UI installed logic; reach for them before writing new logic. Copy is minimal:
icons over text, one-or-two-word labels, error strings under 7 words with no punctuation.

## Code style

- Comments: only when strictly necessary, no punctuation, as short as possible.
- Google-style docstrings where warranted; no em dashes; keep them concise.
- Non-trivial logic (`ranges.ts`, `export.ts`, `store.ts` undo/redo) has real vitest
  coverage — these are the places where an off-by-one silently corrupts someone's PDF.
