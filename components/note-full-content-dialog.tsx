"use client"

import * as React from "react"
import { Save, X, Edit2 } from "lucide-react"
import { htmlToText } from "@/components/note-editor/NoteEditorState"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useMobile } from "@/hooks/use-mobile"

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
  const isMobile = useMobile()
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
      <DialogContent className="w-full h-[100dvh] sm:h-auto sm:max-w-2xl sm:max-h-[80vh] flex flex-col rounded-none sm:rounded-lg p-4 sm:p-6 gap-0">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2 pr-8 sm:pr-0">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-apply-target font-medium text-lg">便签详情</DialogTitle>
            {time && <DialogDescription className="text-xs">{time}</DialogDescription>}
          </div>
          {!isEditing && onSave && (
            <Button variant="ghost" size="icon" onClick={handleStartEdit} className="h-9 w-9 sm:h-8 sm:w-8">
              <Edit2 className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2 sm:mt-4 flex flex-col min-h-0">
          {isEditing ? (
            <div className="flex-1 flex flex-col space-y-3">
              <Textarea
                ref={textareaRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none editor-fixed-font text-base sm:text-sm leading-relaxed p-3"
                placeholder="编辑便签内容..."
                disabled={isSaving}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Button
                    size={isMobile ? "default" : "sm"}
                    onClick={handleSave}
                    disabled={isSaving}
                    className={isMobile ? "flex-1" : "h-8 px-3 text-xs"}
                  >
                    {isSaving ? (
                      <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>保存中...</>
                    ) : (
                      <><Save className="h-3 w-3 mr-1" />保存</>
                    )}
                  </Button>
                  <Button
                    size={isMobile ? "default" : "sm"}
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className={isMobile ? "flex-1" : "h-8 px-3 text-xs"}
                  >
                    <X className="h-3 w-3 mr-1" />取消
                  </Button>
                </div>
                {!isMobile && <span className="text-xs text-muted-foreground">Ctrl+Enter 保存，Esc 取消</span>}
              </div>
            </div>
          ) : (
            <div
              className="flex-1 p-4 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onDoubleClick={!isMobile && onSave ? handleStartEdit : undefined}
              onClick={isMobile && onSave ? handleStartEdit : undefined}
            >
              <div className="whitespace-pre-wrap break-words font-apply-target text-base sm:text-sm leading-relaxed">
                {displayText || <span className="text-muted-foreground">（空）</span>}
              </div>
              {onSave && (
                <div className="mt-4 text-xs text-muted-foreground opacity-70">
                  {isMobile ? "点击编辑" : "双击内容区域进行编辑"}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
