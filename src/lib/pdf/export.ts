import { PDFDocument, type PDFPage } from '@cantoo/pdf-lib'
import type { SourceDoc } from './loader'

export type GridPage = {
  uid: string
  docId: string
  pageIndex: number
}

/**
 * Builds one PDF from the grid in order
 * Groups page indices per source doc so each doc is copied once then
 * walks the grid consuming per-doc copies via a cursor
 * Correct for any interleaving or duplicates
 */
export async function exportPdf(pages: GridPage[], docs: Map<string, SourceDoc>): Promise<Uint8Array> {
  const indicesPerDoc = new Map<string, number[]>()
  for (const page of pages) {
    const indices = indicesPerDoc.get(page.docId)
    if (indices) indices.push(page.pageIndex)
    else indicesPerDoc.set(page.docId, [page.pageIndex])
  }

  const out = await PDFDocument.create()
  const copiesPerDoc = new Map<string, PDFPage[]>()
  for (const [docId, indices] of indicesPerDoc) {
    const source = docs.get(docId)
    if (!source) continue
    const srcDoc = await PDFDocument.load(source.bytes)
    copiesPerDoc.set(docId, await out.copyPages(srcDoc, indices))
  }

  const cursors = new Map<string, number>()
  for (const page of pages) {
    const copies = copiesPerDoc.get(page.docId)
    if (!copies) continue
    const cursor = cursors.get(page.docId) ?? 0
    out.addPage(copies[cursor])
    cursors.set(page.docId, cursor + 1)
  }

  return out.save()
}

/** True if any source doc has bookmarks or form fields that copyPages drops or breaks */
export async function hasFidelityRisk(docs: Iterable<SourceDoc>): Promise<boolean> {
  for (const doc of docs) {
    const [outline, fields] = await Promise.all([doc.proxy.getOutline(), doc.proxy.getFieldObjects()])
    if (outline?.length || (fields && Object.keys(fields).length > 0)) return true
  }
  return false
}
