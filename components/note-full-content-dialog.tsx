"use client"

import * as React from "react"
import { Save, X } from "lucide-react"
import { htmlToText } from "@/components/note-editor/NoteEditorState"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface NoteFullContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  time?: string
  onSave?: (content: string) => Promise<boolean>
}

export function NoteFullContentDialog({
  open,
  onOpenChange,
  content,
  time,
  onSave,
}: NoteFullContentDialogProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingContent, setEditingContent] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const displayText = React.useMemo(() => {
    if (!open) return ""
    if (!content) return ""
    return content.includes("<") && content.includes(">") ? htmlToText(content) : content
  }, [open, content])

  // 重置编辑状态当弹窗关闭时
  React.useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setEditingContent("")
    }
  }, [open])

  const handleStartEdit = () => {
    setEditingContent(displayText)
    setIsEditing(true)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const length = textareaRef.current.value.length
        textareaRef.current.setSelectionRange(length, length)
      }
    }, 100)
  }

  const handleSave = async () => {
    if (!onSave || !editingContent.trim()) return
    setIsSaving(true)
    try {
      const success = await onSave(editingContent.trim())
      if (success) {
        setIsEditing(false)
        setEditingContent("")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingContent("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-apply-target font-medium">便签详情</DialogTitle>
          {time && (
            <DialogDescription>{time}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                ref={textareaRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[200px] resize-none editor-fixed-font"
                placeholder="编辑便签内容..."
                disabled={isSaving}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-3 text-xs">
                    {isSaving ? (
                      <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>保存中...</>
                    ) : (
                      <><Save className="h-3 w-3 mr-1" />保存</>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="h-8 px-3 text-xs">
                    <X className="h-3 w-3 mr-1" />取消
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">Ctrl+Enter 保存，Esc 取消</span>
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors min-h-[200px]"
              onDoubleClick={onSave ? handleStartEdit : undefined}
            >
              <div className="whitespace-pre-wrap break-words font-apply-target text-sm leading-relaxed">
                {displayText || <span className="text-muted-foreground">（空）</span>}
              </div>
              {onSave && (
                <div className="mt-4 text-xs text-muted-foreground">双击内容区域进行编辑</div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
