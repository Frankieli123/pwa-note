"use client"

import * as React from "react"
import { Edit3 } from "lucide-react"
import { htmlToText } from "@/components/note-editor/NoteEditorState"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export interface NoteFullContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  time?: string
  onEdit?: () => void
}

export function NoteFullContentDialog({
  open,
  onOpenChange,
  content,
  time,
  onEdit,
}: NoteFullContentDialogProps) {
  const displayText = React.useMemo(() => {
    if (!open) return ""
    if (!content) return ""
    return content.includes("<") && content.includes(">") ? htmlToText(content) : content
  }, [open, content])

  const handleEdit = () => {
    onOpenChange(false)
    onEdit?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="font-apply-target font-medium">便签详情</DialogTitle>
            {onEdit && (
              <button
                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleEdit}
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
          </div>
          {time && (
            <DialogDescription>{time}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4 p-4 border rounded-md bg-muted/30">
          <div className="whitespace-pre-wrap break-words font-apply-target text-sm leading-relaxed">
            {displayText || <span className="text-muted-foreground">（空）</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
