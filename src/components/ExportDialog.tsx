import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { exportPdf, hasFidelityRisk, type GridPage } from '@/lib/pdf/export'
import { formatRanges, parseRanges, RangeParseError } from '@/lib/pdf/ranges'
import type { SourceDoc } from '@/lib/pdf/loader'

type ExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: GridPage[]
  docs: Map<string, SourceDoc>
  selected: Set<string>
}

export function ExportDialog({ open, onOpenChange, pages, docs, selected }: ExportDialogProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [fidelityRisk, setFidelityRisk] = useState(false)

  useEffect(() => {
    if (!open) return
    const positions: number[] = []
    pages.forEach((p, i) => {
      if (selected.has(p.uid)) positions.push(i + 1)
    })
    setInput(formatRanges(positions))
    setError(undefined)
    hasFidelityRisk(docs.values()).then(setFidelityRisk)
  }, [open, docs, pages, selected])

  async function handleExport() {
    let indices: number[]
    try {
      indices = parseRanges(input, pages.length)
    } catch (e) {
      setError(e instanceof RangeParseError ? e.message : 'Invalid range')
      return
    }

    setBusy(true)
    try {
      const bytes = await exportPdf(
        indices.map((i) => pages[i]),
        docs,
      )
      const url = URL.createObjectURL(new Blob([bytes.slice()], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'document.pdf'
      a.click()
      URL.revokeObjectURL(url)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(undefined)
            }}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {fidelityRisk && <p className="text-xs text-muted-foreground">ⓘ Bookmarks lost</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={busy}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
