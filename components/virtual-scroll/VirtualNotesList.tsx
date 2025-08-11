"use client"

import React, { useState, useRef, useCallback } from 'react'
import { VirtualList } from './VirtualList'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, Check, Trash2, Edit3, Save, X } from 'lucide-react'
import { useTime } from '@/hooks/use-time'
import { useToast } from '@/hooks/use-toast'
import { htmlToText } from '@/components/note-editor/NoteEditorState'
import { usePreloadStrategy } from '@/hooks/use-preload-strategy'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  content: string
  title?: string
  user_id: string
  created_at: Date
  updated_at: Date
}

interface VirtualNotesListProps {
  notes: Note[]
  onLoadMore?: () => Promise<boolean>
  hasMore?: boolean
  isLoading?: boolean
  onDeleteNote?: (id: string) => Promise<boolean>
  onSaveNote?: (id: string, content: string) => Promise<Note | null>
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
export function VirtualNotesList({
  notes,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onDeleteNote,
  onSaveNote,
  className,
  containerHeight = 600
}: VirtualNotesListProps) {
  const { getRelativeTime } = useTime()
  const { toast } = useToast()

  // 编辑状态
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 预加载策略
  const { resetPreloadState, triggerPreloadCheck } = usePreloadStrategy(
    containerRef,
    {
      threshold: 300, // 距离底部300px时开始预加载
      debounceMs: 150,
      maxPreloadBatches: 2,
      enableIntersectionObserver: true
    },
    {
      onPreload: async () => {
        if (onLoadMore && hasMore && !isLoading) {
          return await onLoadMore()
        }
        return false
      },
      onVisibilityChange: (isVisible) => {
        if (isVisible) {
          console.log('📱 便签列表变为可见，检查预加载')
        }
      }
    }
  )

  // 估算每个便签项的高度（根据内容动态调整）
  const estimateItemHeight = useCallback((note: Note) => {
    const baseHeight = 120 // 基础高度
    const contentLength = note.content.length
    const extraHeight = Math.min(Math.floor(contentLength / 100) * 20, 200) // 根据内容长度增加高度
    return baseHeight + extraHeight
  }, [])

  // 计算平均项目高度
  const averageItemHeight = React.useMemo(() => {
    if (notes.length === 0) return 150
    const totalHeight = notes.reduce((sum, note) => sum + estimateItemHeight(note), 0)
    return Math.max(150, Math.floor(totalHeight / notes.length))
  }, [notes, estimateItemHeight])

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

  // 渲染单个便签项
  const renderNoteItem = useCallback((note: Note, index: number) => {
    const isEditing = editingNoteId === note.id

    return (
      <Card className="mx-3 mb-4 overflow-hidden rounded-xl">
        <CardContent className="p-3">
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
                    className="min-h-[100px] resize-none text-base"
                    placeholder="编辑便签内容..."
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveEdit} className="h-7 px-2 text-xs">
                      <Save className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 px-2 text-xs">
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
                  <div className="text-sm line-clamp-6 whitespace-pre-wrap mb-2 font-apply-target hover:bg-muted/50 rounded transition-colors">
                    {(() => {
                      if (note.content.includes('<') && note.content.includes('>')) {
                        return htmlToText(note.content)
                      } else {
                        return note.content
                      }
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
  ])

  if (notes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-apply-target">
        暂无保存的便签
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <VirtualList
        items={notes}
        itemHeight={averageItemHeight}
        containerHeight={containerHeight}
        renderItem={renderNoteItem}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        className={className}
        overscan={3}
      />
    </div>
  )
}
