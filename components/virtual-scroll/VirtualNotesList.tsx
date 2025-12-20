"use client"

import React, { useState, useRef, useCallback, memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, Check, Trash2, Edit3, Save, X, Folder, Maximize2 } from 'lucide-react'
import { useTime } from '@/hooks/use-time'
import { useToast } from '@/hooks/use-toast'
import { htmlToText } from '@/components/note-editor/NoteEditorState'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NoteFullContentDialog } from '@/components/note-full-content-dialog'

interface Note {
  id: string
  content: string
  title?: string
  user_id: string
  created_at: Date
  updated_at: Date
}

interface Group {
  id: string
  name: string
}

interface VirtualNotesListProps {
  notes: Note[]
  onLoadMore?: () => Promise<boolean>
  hasMore?: boolean
  isLoading?: boolean
  onDeleteNote?: (id: string) => Promise<boolean>
  onSaveNote?: (id: string, content: string) => Promise<Note | null>
  groups?: Group[]
  onMoveNoteToGroup?: (noteId: string, groupId: string) => Promise<boolean>
  className?: string
  containerHeight?: number
}

/**
 * VirtualNotesList - 便签虚拟滚动列表组件
 * 
 * 职责：
 * - 使用虚拟滚动渲染大量便签
 * - 支持便签的查看、编辑、删除、复制操作
 * - 自动处理HTML内容转换
 * - 支持无限滚动加载更多
 */
export const VirtualNotesList = memo(function VirtualNotesList({
  notes,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onDeleteNote,
  onSaveNote,
  groups,
  onMoveNoteToGroup
}: VirtualNotesListProps) {
  const { getRelativeTime } = useTime()
  const { toast } = useToast()
  const containerRef = useRef<HTMLDivElement>(null)

  // 编辑状态
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)

  // 处理双击编辑
  const handleDoubleClick = useCallback((note: Note) => {
    if (editingNoteId && editingNoteId !== note.id) {
      setEditingNoteId(null)
      setEditingContent("")
    }

    setEditingNoteId(note.id)
    
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
  }, [editingNoteId])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingNoteId || !onSaveNote) return

    const trimmedContent = editingContent.trim()
    if (!trimmedContent) {
      // 如果内容为空，删除便签
      setEditingNoteId(null)
      setEditingContent("")
      
      if (onDeleteNote) {
        await onDeleteNote(editingNoteId)
        toast({
          title: "已删除空白便签",
          description: "空白内容的便签已被删除",
          duration: 2000,
        })
      }
      return
    }

    setEditingNoteId(null)
    setEditingContent("")

    try {
      const result = await onSaveNote(editingNoteId, trimmedContent)
      if (result) {
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
    }
  }, [editingNoteId, editingContent, onSaveNote, onDeleteNote, toast])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null)
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
  const handleCopyClick = useCallback((note: Note) => {
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
  }, [toast])

  // 处理删除
  const handleDeleteClick = useCallback((id: string) => {
    if (onDeleteNote) {
      onDeleteNote(id)
    }
  }, [onDeleteNote])

  // 处理滚动事件，实现无限滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight

    // 当滚动到距离底部200px时触发加载更多
    const threshold = 200
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold

    if (isNearBottom && hasMore && !isLoading && !isLoadingMore && onLoadMore) {
      setIsLoadingMore(true)
      onLoadMore().finally(() => {
        setIsLoadingMore(false)
      })
    }
  }, [hasMore, isLoading, isLoadingMore, onLoadMore])

  // 渲染单个便签项
  const renderNoteItem = useCallback((note: Note) => {
    const isEditing = editingNoteId === note.id

    return (
      <Card className="mb-3 overflow-hidden rounded-lg">
        <CardContent className="p-3 flex flex-col">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0 font-apply-target">
              {isEditing ? (
                // 编辑模式
                <div className="space-y-3">
                  <Textarea
                    ref={editTextareaRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[100px] resize-none editor-fixed-font"
                    placeholder="编辑便签内容..."
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="h-7 px-2 text-xs rounded-sm">
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 px-2 text-xs rounded-sm">
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Ctrl+Enter 保存，Esc 取消
                    </span>
                  </div>
                </div>
              ) : (
                // 显示模式
                <div className="cursor-pointer" onDoubleClick={() => handleDoubleClick(note)}>
                  <div className="text-sm whitespace-pre-wrap font-apply-target hover:bg-muted/50 rounded transition-colors overflow-hidden mb-2">
                    {(() => {
                      const content = note.content.includes('<') && note.content.includes('>')
                        ? htmlToText(note.content)
                        : note.content

                      // 根据内容长度决定显示行数
                      const isShortContent = content.length <= 20
                      return (
                        <div className={isShortContent ? "line-clamp-1" : "line-clamp-3"}>
                          {content}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{getRelativeTime(note.created_at)}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Edit3
                            className="h-3 w-3 opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDoubleClick(note)
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>点击编辑</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center gap-1">
                {onMoveNoteToGroup && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Folder className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          onMoveNoteToGroup(note.id, 'ungrouped')
                        }}
                      >
                        移到未分组
                      </DropdownMenuItem>
                      {groups && groups.length > 0 && <DropdownMenuSeparator />}
                      {groups?.map((g) => (
                        <DropdownMenuItem
                          key={g.id}
                          onClick={() => {
                            onMoveNoteToGroup(note.id, g.id)
                          }}
                        >
                          {g.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setViewingNote(note)}
                      >
                        <Maximize2 className="h-4 w-4" />
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
                        onClick={() => handleCopyClick(note)}
                      >
                        {copiedNoteId === note.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
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
                        onClick={() => handleDeleteClick(note.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>删除便签</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }, [
    editingNoteId,
    editingContent,
    copiedNoteId,
    getRelativeTime,
    handleDoubleClick,
    handleSaveEdit,
    handleCancelEdit,
    handleKeyDown,
    handleCopyClick,
    handleDeleteClick
    ,
    groups,
    onMoveNoteToGroup
  ])

  if (notes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-apply-target"
      >
        暂无保存的便签
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto" onScroll={handleScroll}>
      <div className="space-y-0">
        {notes.map((note) => (
          <div key={note.id}>
            {renderNoteItem(note)}
          </div>
        ))}

        {/* 加载更多指示器 */}
        {(isLoading || isLoadingMore) && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>加载中...</span>
            </div>
          </div>
        )}

        {/* 没有更多数据指示器 */}
        {!hasMore && notes.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-xs text-muted-foreground">
              已加载全部 {notes.length} 条数据
            </div>
          </div>
        )}
      </div>

      <NoteFullContentDialog
        open={!!viewingNote}
        onOpenChange={(open) => !open && setViewingNote(null)}
        content={viewingNote?.content ?? ""}
        time={viewingNote ? getRelativeTime(viewingNote.created_at) : undefined}
      />
    </div>
  )
})
