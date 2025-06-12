"use client"

import { Button } from "@/components/ui/button"
import { Save, FileUp, Paperclip, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNoteToolbarProps {
  isSaving: boolean
  onSave: () => void
  onUploadImage: () => void
  onUploadFile: () => void
  className?: string
}

/**
 * MobileNoteToolbar - 移动端笔记编辑器工具栏组件
 * 
 * 职责：
 * - 提供移动端优化的工具栏布局
 * - 简化的按钮设计，适合触摸操作
 * - 紧凑的空间利用
 */
export function MobileNoteToolbar({
  isSaving,
  onSave,
  onUploadImage,
  onUploadFile,
  className
}: MobileNoteToolbarProps) {
  return (
    <div className={cn(
      "w-full flex justify-around items-center px-2 py-1 bg-background/95 border-b",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onUploadImage}
        className="flex-1 flex items-center justify-center gap-1 h-9"
      >
        <FileUp className="h-4 w-4" />
        <span className="text-base font-apply-target">图片</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onUploadFile}
        className="flex-1 flex items-center justify-center gap-1 h-9"
      >
        <Paperclip className="h-4 w-4" />
        <span className="text-base font-apply-target">文件</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="flex-1 flex items-center justify-center gap-1 h-9"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span className="text-base font-apply-target">
          {isSaving ? "保存中" : "保存"}
        </span>
      </Button>
    </div>
  )
}
