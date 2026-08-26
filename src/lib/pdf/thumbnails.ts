import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SourceDoc } from './loader'

const THUMBNAIL_WIDTH = 200
const CONCURRENCY = 4

const cache = new Map<string, string>()
const inFlight = new Map<string, Promise<string>>()
let running = 0
const queue: (() => void)[] = []

function acquire(): Promise<void> {
  if (running < CONCURRENCY) {
    running++
    return Promise.resolve()
  }
  return new Promise((resolve) => queue.push(resolve))
}

function release() {
  running--
  const next = queue.shift()
  if (next) {
    running++
    next()
  }
}

async function render(proxy: PDFDocumentProxy, pageIndex: number): Promise<string> {
  const page = await proxy.getPage(pageIndex + 1) // pdf.js pages are 1-indexed
  const scale = THUMBNAIL_WIDTH / page.getViewport({ scale: 1 }).width
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed')))),
  )
  return URL.createObjectURL(blob)
}

function getThumbnailUrl(docId: string, pageIndex: number, proxy: PDFDocumentProxy): Promise<string> {
  const key = `${docId}:${pageIndex}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = (async () => {
    await acquire()
    try {
      const url = await render(proxy, pageIndex)
      cache.set(key, url)
      return url
    } finally {
      release()
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}

/** Revokes and drops every cached thumbnail for a doc */
export function releaseThumbnails(docId: string) {
  for (const [key, url] of cache) {
    if (key.startsWith(`${docId}:`)) {
      URL.revokeObjectURL(url)
      cache.delete(key)
    }
  }
}

/** Renders lazily once the attached element enters the viewport */
export function useThumbnail(doc: SourceDoc, pageIndex: number) {
  const [url, setUrl] = useState(() => cache.get(`${doc.id}:${pageIndex}`))
  const elRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (url) return
    const el = elRef.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        observer.disconnect()
        getThumbnailUrl(doc.id, pageIndex, doc.proxy).then(setUrl)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, pageIndex, url])

  return { ref: elRef, url }
}
