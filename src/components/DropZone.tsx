import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DropZoneProps = {
  empty: boolean
  onFiles: (files: File[]) => void
  onBrowse: () => void
  children?: ReactNode
}

export function DropZone({ empty, onFiles, onBrowse, children }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div
      className="flex min-h-dvh w-full flex-col"
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length) onFiles(files)
      }}
    >
      {empty ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onBrowse}
          className={cn(
            'm-auto flex h-auto flex-col gap-3 border-2 border-dashed px-16 py-12 text-muted-foreground',
            isOver && 'border-primary text-primary',
          )}
        >
          <Plus className="size-8" />
          <span className="text-sm">Drop PDFs</span>
        </Button>
      ) : (
        children
      )}
    </div>
  )
}
