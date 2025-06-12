"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface NoteEditorLayoutProps {
  toolbar: ReactNode
  editor: ReactNode
  className?: string
}

/**
 * NoteEditorLayout - 笔记编辑器布局组件
 * 
 * 职责：
 * - 提供响应式布局容器
 * - 管理移动端和桌面端的不同布局
 * - 处理布局样式和定位
 */
export function NoteEditorLayout({ toolbar, editor, className }: NoteEditorLayoutProps) {
  const isMobile = useMobile()

  // 移动端布局
  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-0 top-12 bottom-0 z-20 bg-background flex flex-col",
          className
        )}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          height: 'calc(100% - 3.5rem)',
          overscrollBehavior: 'none'
        }}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* 移动端工具栏 */}
        {toolbar}

        {/* 编辑器卡片 - 使用fixed定位完全阻止上拉 */}
        <Card className="flex-1 w-full shadow-none bg-background/95 border-0 rounded-none m-0">
          <CardContent className="px-2 h-full overflow-hidden">
            {/* 编辑区域 - 使用多重技术禁止拖动 */}
            <div
              className="h-full"
              style={{ touchAction: 'none', userSelect: 'none', overscrollBehavior: 'none' }}
            >
              {editor}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 桌面端布局
  return (
    <Card className={cn(
      "w-full shadow-lg transition-all duration-300",
      "bg-background/80 backdrop-blur-xl border border-border/50",
      "rounded-2xl overflow-hidden",
      "h-[85vh] max-h-[800px] max-w-3xl mx-auto",
      className
    )}>
      <CardContent className="p-0 h-full flex flex-col">
        {/* 桌面端工具栏 */}
        {toolbar}

        {/* 编辑器区域 */}
        <div className="flex-1 overflow-auto p-4">
          {editor}
        </div>
      </CardContent>
    </Card>
  )
}
