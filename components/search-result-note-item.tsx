"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, Check, Trash2, Edit3, Save, X, Eye } from 'lucide-react'
import { useTime } from '@/hooks/use-time'
import { useToast } from '@/hooks/use-toast'
import { useMobile } from '@/hooks/use-mobile'
import { htmlToText } from '@/components/note-editor/NoteEditorState'
import { NoteFullContentDialog } from '@/components/note-full-content-dialog'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  content: string
  title?: string
  user_id: string
  created_at: Date | string
  updated_at: Date | string
}

interface SearchResultNoteItemProps {
  note: Note
  searchQuery?: string
  onSaveNote?: (id: string, content: string) => Promise<any>
  onDeleteNote?: (id: string) => Promise<boolean>
  onClose?: () => void
  className?: string
}

/**
 * SearchResultNoteItem - 搜索结果中的便签项组件
 * 
 * 职责：
 * - 显示搜索结果中的便签内容
 * - 支持复制、编辑、删除操作
 * - 支持搜索关键词高亮
 * - 与主便签列表保持一致的交互体验
 */
export function SearchResultNoteItem({
  note,
  searchQuery,
  onSaveNote,
  onDeleteNote,
  onClose,
  className
}: SearchResultNoteItemProps) {
  const { getRelativeTime } = useTime()
  const { toast } = useToast()
  const isMobile = useMobile()

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false)
  const [editingContent, setEditingContent] = useState("")
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isViewingFull, setIsViewingFull] = useState(false)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 处理双击编辑
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    
    // 智能处理内容：如果是HTML格式则转换为纯文本
    const contentForEdit = note.content.includes('<') && note.content.includes('>')
      ? htmlToText(note.content)
      : note.content
    setEditingContent(contentForEdit)

    // 延迟聚焦
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus()
        const length = editTextareaRef.current.value.length
        editTextareaRef.current.setSelectionRange(length, length)
      }
    }, 100)
  }, [note.content])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!onSaveNote) return

    const trimmedContent = editingContent.trim()
    if (!trimmedContent) {
      // 如果内容为空，删除便签
      setIsEditing(false)
      setEditingContent("")
      
      if (onDeleteNote) {
        await onDeleteNote(note.id)
        toast({
          title: "已删除空白便签",
          description: "空白内容的便签已被删除",
          duration: 2000,
        })
        onClose?.()
      }
      return
    }

    setIsSaving(true)
    try {
      const result = await onSaveNote(note.id, trimmedContent)
      if (result) {
        setIsEditing(false)
        setEditingContent("")
        toast({
          title: "保存成功",
          description: "便签已更新",
          duration: 2000,
        })
      }
    } catch (error) {
      console.error("保存编辑失败:", error)
      toast({
        title: "保存失败",
        description: "网络错误，请稍后再试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [note.id, editingContent, onSaveNote, onDeleteNote, toast, onClose])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditingContent("")
  }, [])

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])

  // 处理复制
  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    const textContent = note.content.includes('<') && note.content.includes('>')
      ? htmlToText(note.content)
      : note.content

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textContent).then(() => {
        setCopiedNoteId(note.id)
        toast({
          title: "已复制到剪贴板",
          description: "便签内容已成功复制",
          duration: 2000,
        })
        setTimeout(() => setCopiedNoteId(null), 2000)
      }).catch(() => {
        toast({
          title: "复制失败",
          description: "无法复制内容到剪贴板",
          variant: "destructive",
        })
      })
    }
  }, [note.content, note.id, toast])

  // 处理删除
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (onDeleteNote) {
      onDeleteNote(note.id).then((success) => {
        if (success) {
          toast({
            title: "删除成功",
            description: "便签已删除",
            duration: 2000,
          })
          onClose?.()
        }
      })
    }
  }, [note.id, onDeleteNote, toast, onClose])

  // 处理编辑按钮点击
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    handleDoubleClick()
  }, [handleDoubleClick])

  // 格式化内容并高亮搜索关键词
  const formatContentWithHighlight = useCallback((content: string) => {
    const textContent = content.includes('<') && content.includes('>')
      ? htmlToText(content)
      : content

    if (!searchQuery || !searchQuery.trim()) {
      return { text: textContent, hasHighlight: false }
    }

    // 创建高亮版本的内容
    const regex = new RegExp(`(${searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = textContent.split(regex)

    return {
      text: textContent,
      parts: parts,
      hasHighlight: regex.test(textContent)
    }
  }, [searchQuery])

  // 智能提取包含搜索关键词的内容片段
  const getSmartPreview = useCallback((content: string, maxLength: number = 200) => {
    const textContent = content.includes('<') && content.includes('>')
      ? htmlToText(content)
      : content

    if (!searchQuery || !searchQuery.trim()) {
      return textContent.length > maxLength
        ? textContent.substring(0, maxLength) + "..."
        : textContent
    }

    const query = searchQuery.trim().toLowerCase()
    const lines = textContent.split('\n').filter(line => line.trim())

    // 查找包含搜索关键词的行
    const matchingLines = lines.filter(line =>
      line.toLowerCase().includes(query)
    )

    if (matchingLines.length > 0) {
      // 如果有匹配的行，尝试显示更多上下文
      let preview = ''

      // 如果只有一行匹配，尝试添加前后行作为上下文
      if (matchingLines.length === 1) {
        const matchingLine = matchingLines[0]
        const matchIndex = lines.indexOf(matchingLine)

        // 添加前一行（如果存在）
        if (matchIndex > 0) {
          preview += lines[matchIndex - 1] + '\n'
        }

        // 添加匹配行
        preview += matchingLine

        // 添加后一行（如果存在且总长度不超限）
        if (matchIndex < lines.length - 1 && preview.length < maxLength * 0.7) {
          preview += '\n' + lines[matchIndex + 1]
        }
      } else {
        // 如果有多行匹配，显示前2行
        preview = matchingLines.slice(0, 2).join('\n')
      }

      if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength) + "..."
      }
      return preview
    }

    // 如果没有匹配的行，显示开头内容
    return textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent
  }, [searchQuery])

  // 渲染高亮内容
  const renderHighlightedContent = useCallback((content: string) => {
    const result = formatContentWithHighlight(content)

    if (!result.hasHighlight || !result.parts) {
      return content
    }

    return (
      <span>
        {result.parts.map((part, index) => {
          const isHighlight = searchQuery && part.toLowerCase().includes(searchQuery.toLowerCase())
          return isHighlight ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        })}
      </span>
    )
  }, [formatContentWithHighlight, searchQuery])

  // 获取显示的时间
  const displayTime = useCallback(() => {
    const date = typeof note.created_at === 'string' 
      ? new Date(note.created_at) 
      : note.created_at
    return getRelativeTime(date)
  }, [note.created_at, getRelativeTime])

  const previewContent = getSmartPreview(note.content, 120)

  if (isEditing) {
    return (
      <div className={cn("p-2 border border-primary/20 bg-accent/30 rounded-lg", className)}>
        <div className="space-y-2">
          <Textarea
            ref={editTextareaRef}
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none editor-fixed-font border-0 bg-background/50 focus-visible:ring-1"
            placeholder="编辑便签内容..."
            disabled={isSaving}
          />
          <div className={cn(
            "flex items-center justify-between",
            isMobile ? "gap-2" : "gap-3"
          )}>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="h-8 px-3 text-xs rounded-sm"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    保存
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="h-8 px-3 text-xs rounded-sm"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
            </div>
            {!isMobile && (
              <span className="text-xs text-muted-foreground">
                Ctrl+Enter 保存，Esc 取消
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-2 hover:bg-accent/50 transition-colors w-full rounded-lg",
        className
      )}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-relaxed text-foreground line-clamp-2 mb-2">
            {renderHighlightedContent(previewContent)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <span>{displayTime()}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ width: '10px', height: '10px' }}
                    onClick={handleEditClick}
                  >
                    <Edit3 style={{ width: '10px', height: '10px' }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>点击编辑</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-start gap-1 mt-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsViewingFull(true)
                  }}
                >
                  <Eye style={{ width: '14px', height: '14px' }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>查看完整内容</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={handleCopyClick}
                >
                  {copiedNoteId === note.id ? (
                    <Check style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <Copy style={{ width: '14px', height: '14px' }} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>复制内容</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>删除便签</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <NoteFullContentDialog
        open={isViewingFull}
        onOpenChange={setIsViewingFull}
        content={note.content}
        time={displayTime()}
        onSave={onSaveNote ? async (content: string) => {
          try {
            const result = await onSaveNote(note.id, content)
            if (result) {
              toast({
                title: "保存成功",
                description: "便签已更新",
                duration: 2000,
              })
              return true
            }
            return false
          } catch (error) {
            console.error("保存编辑失败:", error)
            toast({
              title: "保存失败",
              description: "网络错误，请稍后再试",
              variant: "destructive",
            })
            return false
          }
        } : undefined}
      />
    </div>
  )
}
