import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useThumbnail } from '@/lib/pdf/thumbnails'
import type { GridPage } from '@/lib/pdf/export'
import type { SourceDoc } from '@/lib/pdf/loader'
import { cn } from '@/lib/utils'

type PageCardProps = {
  page: GridPage
  doc: SourceDoc
  position: number
  selected: boolean
  onToggleSelect: (uid: string, shiftKey: boolean) => void
  onDelete: (uid: string) => void
}

export function PageCard({ page, doc, position, selected, onToggleSelect, onDelete }: PageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.uid })
  const { ref: thumbRef, url } = useThumbnail(doc, page.pageIndex)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      onClick={(e) => onToggleSelect(page.uid, e.shiftKey)}
      className={cn(
        'group flex cursor-grab flex-col gap-1 rounded-lg border p-1.5 active:cursor-grabbing',
        selected ? 'border-primary ring-2 ring-primary' : 'border-border',
      )}
    >
      <div ref={thumbRef} className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
        {url && <img src={url} alt="" className="h-full w-full object-contain" />}

        <Badge variant="secondary" className="absolute bottom-1 left-1">
          {position}
        </Badge>

        {selected && (
          <Badge className="absolute top-1 left-1 size-4 rounded-full p-0">
            <Check />
          </Badge>
        )}

        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(page.uid)
          }}
        >
          <Trash2 />
        </Button>
      </div>

      <span className="truncate text-center text-xs text-muted-foreground">{doc.name}</span>
    </div>
  )
}
