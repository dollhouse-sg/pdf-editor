import { useRef } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { GridPage } from '@/lib/pdf/export'
import type { SourceDoc } from '@/lib/pdf/loader'
import { PageCard } from './PageCard'

/** Moves the dragged page, or its whole selection if it's part of one, to over's position */
function reorderWithSelection(
  pages: GridPage[],
  activeId: string,
  overId: string,
  selected: Set<string>,
): GridPage[] {
  const groupIds = selected.has(activeId) && selected.size > 1 ? selected : new Set([activeId])
  if (groupIds.has(overId)) return pages

  const group = pages.filter((p) => groupIds.has(p.uid))
  const rest = pages.filter((p) => !groupIds.has(p.uid))
  const insertAt = rest.findIndex((p) => p.uid === overId)
  if (insertAt === -1) return pages

  rest.splice(insertAt, 0, ...group)
  return rest
}

type PageGridProps = {
  pages: GridPage[]
  docs: Map<string, SourceDoc>
  selected: Set<string>
  onToggleSelect: (uid: string, shiftKey: boolean) => void
  onDeleteOne: (uid: string) => void
  onSetPagesTransient: (pages: GridPage[]) => void
  onCommitReorder: (before: GridPage[], label: string) => void
}

export function PageGrid({
  pages,
  docs,
  selected,
  onToggleSelect,
  onDeleteOne,
  onSetPagesTransient,
  onCommitReorder,
}: PageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const beforeRef = useRef<GridPage[] | null>(null)

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const next = reorderWithSelection(pages, active.id as string, over.id as string, selected)
    if (next !== pages) onSetPagesTransient(next)
  }

  function handleDragEnd() {
    if (beforeRef.current) {
      onCommitReorder(beforeRef.current, 'reorder pages')
      beforeRef.current = null
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => (beforeRef.current = pages)}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.uid)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 p-4">
          {pages.map((page, i) => {
            const doc = docs.get(page.docId)
            if (!doc) return null
            return (
              <PageCard
                key={page.uid}
                page={page}
                doc={doc}
                position={i + 1}
                selected={selected.has(page.uid)}
                onToggleSelect={onToggleSelect}
                onDelete={onDeleteOne}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
