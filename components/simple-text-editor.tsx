"use client"

import { useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

interface SimpleTextEditorProps {
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  placeholder?: string
  className?: string
}

/**
 * SimpleTextEditor - 简单的纯文本编辑器组件
 * 
 * 职责：
 * - 提供纯文本编辑功能
 * - 支持自动高度调整
 * - 应用字体设置
 * - 保持与富文本编辑器相同的接口
 */
export function SimpleTextEditor({
  value,
  onChange,
  onSave,
  placeholder = "点击此处开始输入",
  className
}: SimpleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度 - textarea自适应内容，由父容器处理滚动
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // 重置高度以获取正确的scrollHeight
      textarea.style.height = 'auto'
      // 设置新高度，最小高度为200px，不限制最大高度（由父容器滚动）
      const newHeight = Math.max(200, textarea.scrollHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [])

  // 内容变化时调整高度
  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // 窗口大小变化时重新调整高度
  useEffect(() => {
    const handleResize = () => {
      adjustHeight()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [adjustHeight])

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S 或 Cmd+S 保存（由父组件处理）
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      // 触发保存事件
      onSave?.()
    }
  }

  return (
    <div className={cn("w-full h-full", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          // 基础样式
          "w-full min-h-[200px] p-4 border-0 outline-none resize-none",
          "bg-transparent text-foreground",
          
          // 字体设置应用
          "font-apply-target",
          
          // 禁用textarea自身滚动，由父容器统一处理
          "overflow-hidden",
          
          // 占位符样式
          "placeholder:text-muted-foreground placeholder:font-apply-target",
          
          // 焦点样式
          "focus:outline-none focus:ring-0",
          
          // 移动端优化
          "touch-manipulation",

          // 防止移动端字体放大
          "text-size-adjust-none",
          
          // 禁用拼写检查和自动完成（可选）
          "spellcheck-false"
        )}
        style={{
          // 确保字体设置正确应用
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: '1.6',
          // 禁用浏览器默认的调整大小
          resize: 'none',
          // 确保在移动端正确显示
          WebkitAppearance: 'none',
          // 防止iOS Safari字体放大
          // 防止iOS和Android字体放大
          WebkitTextSizeAdjust: '100%',
          textSizeAdjust: '100%'
        }}
        // 移动端属性
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck={false}
        // 可访问性属性
        aria-label="便签内容编辑器"
        role="textbox"
        aria-multiline="true"
      />
    </div>
  )
}
