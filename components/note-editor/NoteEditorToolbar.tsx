"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Save, FileUp, Paperclip, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface NoteEditorToolbarProps {
  isSaving: boolean
  onSave: () => void
  onUploadImage: () => void
  onUploadFile: () => void
  lastAutoSaveTime: Date | null
  className?: string
}

/**
 * NoteEditorToolbar - 笔记编辑器工具栏组件
 *
 * 职责：
 * - 显示当前时间和日期信息
 * - 显示自动保存状态
 * - 提供保存、上传等操作按钮
 * - 响应式设计适配移动端和桌面端
 */
export function NoteEditorToolbar({
  isSaving,
  onSave,
  onUploadImage,
  onUploadFile,
  lastAutoSaveTime,
  className
}: NoteEditorToolbarProps) {
  const isMobile = useMobile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isClient, setIsClient] = useState(false)

  // 客户端渲染检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 定期更新当前时间
  useEffect(() => {
    if (!isClient) return

    const intervalId = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isClient])

  // 格式化日期函数
  const formatDate = (date: Date) => {
    if (!isClient) return "加载日期中..."

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }) + ' ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={cn(
      "p-4 border-b flex items-center justify-between",
      className
    )}>
      {/* 左侧：时间和状态信息 */}
      <div className="flex flex-col text-base font-medium text-muted-foreground">
        <div className="font-apply-target">
          {isClient ? formatDate(currentDate) : "加载日期中..."}
        </div>
        {lastAutoSaveTime && (
          <div className="opacity-70 font-apply-target text-xs mt-1">
            上次自动保存: {lastAutoSaveTime.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
          </div>
        )}
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUploadImage}
          className="flex items-center gap-1"
        >
          <FileUp className="h-4 w-4" />
          <span className="font-apply-target text-base">上传图片</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUploadFile}
          className="flex items-center gap-1"
        >
          <Paperclip className="h-4 w-4" />
          <span className="font-apply-target text-base">上传文件</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="font-apply-target text-base">{isSaving ? "保存中..." : "保存便签"}</span>
        </Button>
      </div>
    </div>
  )
}
