"use client"

import * as React from "react"
import { htmlToText } from "@/components/note-editor/NoteEditorState"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export interface NoteFullContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  time?: string
}

export function NoteFullContentDialog({
  open,
  onOpenChange,
  content,
  time,
}: NoteFullContentDialogProps) {
  const displayText = React.useMemo(() => {
    if (!open) return ""
    if (!content) return ""
    return content.includes("<") && content.includes(">") ? htmlToText(content) : content
  }, [open, content])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-apply-target">便签详情</DialogTitle>
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
