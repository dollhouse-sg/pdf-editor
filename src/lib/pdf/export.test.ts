import { PDFDocument } from '@cantoo/pdf-lib'
import { describe, expect, it } from 'vitest'
import { exportPdf, type GridPage } from './export'
import type { SourceDoc } from './loader'

async function makeDoc(id: string, heights: number[]): Promise<SourceDoc> {
  const doc = await PDFDocument.create()
  for (const height of heights) doc.addPage([100, height])
  const bytes = await doc.save()
  return { id, name: `${id}.pdf`, bytes, proxy: {} as SourceDoc['proxy'], pageCount: heights.length, destroy: () => {} }
}

describe('exportPdf', () => {
  it('preserves grid order across interleaved sources, including duplicates', async () => {
    const docA = await makeDoc('A', [100, 101, 102])
    const docB = await makeDoc('B', [200, 201])
    const docs = new Map([
      ['A', docA],
      ['B', docB],
    ])

    const pages: GridPage[] = [
      { uid: '1', docId: 'A', pageIndex: 1 },
      { uid: '2', docId: 'B', pageIndex: 0 },
      { uid: '3', docId: 'A', pageIndex: 1 }, // duplicate
      { uid: '4', docId: 'A', pageIndex: 0 },
      { uid: '5', docId: 'B', pageIndex: 1 },
    ]

    const bytes = await exportPdf(pages, docs)
    const out = await PDFDocument.load(bytes)
    expect(out.getPages().map((p) => p.getHeight())).toEqual([101, 200, 101, 100, 201])
  })
})
