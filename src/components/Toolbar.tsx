import type { ComponentProps } from 'react'
import { Plus, Redo2, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type ToolbarProps = {
  onAddClick: () => void
  canUndo: boolean
  canRedo: boolean
  undoLabel?: string
  redoLabel?: string
  onUndo: () => void
  onRedo: () => void
  selectedCount: number
  onDeleteSelected: () => void
  onExportClick: () => void
}

function IconButton({ tooltip, ...props }: ComponentProps<typeof Button> & { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" {...props} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function Toolbar({
  onAddClick,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  selectedCount,
  onDeleteSelected,
  onExportClick,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-4 pt-4">
      <IconButton tooltip="Add PDF" onClick={onAddClick}>
        <Plus />
      </IconButton>
      <IconButton tooltip={canUndo ? `Undo ${undoLabel}` : 'Undo'} onClick={onUndo} disabled={!canUndo}>
        <Undo2 />
      </IconButton>
      <IconButton tooltip={canRedo ? `Redo ${redoLabel}` : 'Redo'} onClick={onRedo} disabled={!canRedo}>
        <Redo2 />
      </IconButton>

      <div className="flex-1" />

      {selectedCount > 0 && (
        <>
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <IconButton tooltip="Delete" onClick={onDeleteSelected}>
            <Trash2 />
          </IconButton>
        </>
      )}

      <Button type="button" onClick={onExportClick}>
        Export
      </Button>
    </div>
  )
}
