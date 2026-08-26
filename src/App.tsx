import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { DropZone } from '@/components/DropZone'
import { Toolbar } from '@/components/Toolbar'
import { PageGrid } from '@/components/PageGrid'
import { ExportDialog } from '@/components/ExportDialog'
import { usePdfStore } from '@/store'
import { loadSourceDoc } from '@/lib/pdf/loader'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

function App() {
  const { state, addDocument, deletePages, setPagesTransient, commitReorder, undo, redo } = usePdfStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<string | null>(null)

  const handleFiles = useCallback(
    async (files: File[]) => {
      const pdfs = files.filter((f) => f.type === 'application/pdf')
      if (pdfs.length === 0) {
        toast.error('Not a PDF')
        return
      }
      for (const file of pdfs) {
        try {
          addDocument(await loadSourceDoc(file))
        } catch {
          toast.error(`Failed to open ${file.name}`)
        }
      }
    },
    [addDocument],
  )

  const toggleSelect = useCallback(
    (uid: string, shiftKey: boolean) => {
      if (shiftKey && anchorRef.current) {
        const uids = state.pages.map((p) => p.uid)
        const a = uids.indexOf(anchorRef.current)
        const b = uids.indexOf(uid)
        if (a !== -1 && b !== -1) {
          const [start, end] = a < b ? [a, b] : [b, a]
          setSelected(new Set(uids.slice(start, end + 1)))
          return
        }
      }
      anchorRef.current = uid
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(uid)) next.delete(uid)
        else next.add(uid)
        return next
      })
    },
    [state.pages],
  )

  const deleteSelected = useCallback(() => {
    deletePages(selected)
    setSelected(new Set())
  }, [deletePages, selected])

  const deleteOne = useCallback(
    (uid: string) => {
      deletePages(new Set([uid]))
      setSelected((prev) => {
        if (!prev.has(uid)) return prev
        const next = new Set(prev)
        next.delete(uid)
        return next
      })
    },
    [deletePages],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      if (isTypingTarget(e.target)) return

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <TooltipProvider>
      <DropZone empty={state.pages.length === 0} onFiles={handleFiles} onBrowse={() => fileInputRef.current?.click()}>
        <Toolbar
          onAddClick={() => fileInputRef.current?.click()}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          undoLabel={state.past.at(-1)?.label}
          redoLabel={state.future.at(-1)?.label}
          onUndo={undo}
          onRedo={redo}
          selectedCount={selected.size}
          onDeleteSelected={deleteSelected}
          onExportClick={() => setExportOpen(true)}
        />
        <PageGrid
          pages={state.pages}
          docs={state.docs}
          selected={selected}
          onToggleSelect={toggleSelect}
          onDeleteOne={deleteOne}
          onSetPagesTransient={setPagesTransient}
          onCommitReorder={commitReorder}
        />
      </DropZone>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        pages={state.pages}
        docs={state.docs}
        selected={selected}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) handleFiles(files)
        }}
      />

      <Toaster />
    </TooltipProvider>
  )
}

export default App
