import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerSrc

export type SourceDoc = {
  id: string
  name: string
  bytes: Uint8Array
  proxy: PDFDocumentProxy
  pageCount: number
  /** Releases the worker-backed document via the loading task */
  destroy: () => void
}

export async function loadSourceDoc(file: File): Promise<SourceDoc> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  // pdf.js detaches the buffer it is handed so give it a copy and keep
  // bytes pristine for pdf-lib at export time
  const loadingTask = getDocument({ data: bytes.slice() })
  const proxy = await loadingTask.promise
  return {
    id: crypto.randomUUID(),
    name: file.name,
    bytes,
    proxy,
    pageCount: proxy.numPages,
    destroy: () => loadingTask.destroy(),
  }
}
