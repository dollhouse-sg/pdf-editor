# PDF Editor

Delete, reorder, and merge PDF pages.

**[Try it here](https://dollhouse-sg.github.io/pdf-editor/)**

## Features

- Drop in one or more PDFs to view its pages
- Drag to reorder pages, including across source files
- Select and delete pages
- Undo/redo
- Export the full grid or a subset via page ranges

## Run it locally

```bash
npm install
npm run dev
```

## Export syntax

Ranges are 1-indexed against the current grid order (after any reordering or deletion).

- Order is respected as typed — `7, 1-3` exports page 7 first
- Duplicates are allowed — `1, 1` exports page 1 twice
- Open-ended ranges are supported — `5-` means page 5 through the end
- Empty input exports everything
- Out-of-range numbers show an error

## Limitations

Merging pages can drop document outlines, bookmarks, and some form fields or
annotations.
