"use client"

import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from "react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Quote,
  Link,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface EditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  showToolbar?: boolean
}

// 优化简化版Editor组件
export function Editor({ value, onChange, placeholder = "点击此处开始输入", className, showToolbar = true }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isCodeBlock, setIsCodeBlock] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 客户端渲染检测
  useEffect(() => {
    setMounted(true)
  }, [])

  // 初始化编辑器内容，使用 useLayoutEffect 减少闪烁
  useLayoutEffect(() => {
    if (!mounted) return
    
    const editorElement = editorRef.current
    if (editorElement) {
      // Only update when content changes to avoid cursor position reset
      if (editorElement.innerHTML !== value) {
        editorElement.innerHTML = value
      }
    }
  }, [value, mounted])

  // 编辑器现在使用CSS变量系统，不需要手动设置字体
  // 移除复杂的字体更新逻辑，让CSS变量自动处理

  // 处理内容变化，使用 useCallback 优化
  const handleInput = useCallback(() => {
    const editorElement = editorRef.current
    if (editorElement) {
      const newContent = editorElement.innerHTML || ""
      if (newContent !== value) {
        onChange(newContent)
      }
    }
  }, [onChange, value])

  // 处理粘贴以保留格式，使用 useCallback 优化
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (isCodeBlock) {
        e.preventDefault()
        const text = e.clipboardData.getData("text/plain")
        document.execCommand("insertText", false, text)
      }
    },
    [isCodeBlock],
  )

  // 格式化命令
  const execCommand = useCallback(
    (command: string, value = "") => {
      document.execCommand(command, false, value)
      const editorElement = editorRef.current
      if (editorElement) {
        const newContent = editorElement.innerHTML || ""
        onChange(newContent)
        editorElement.focus()
      }
    },
    [onChange],
  )

  // 插入代码块
  const insertCodeBlock = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const selectedText = range.toString()

    // 创建代码块元素
    const codeBlock = document.createElement("pre")
    codeBlock.className = "bg-muted p-3 rounded-md my-2 overflow-x-auto font-mono text-sm"

    const codeElement = document.createElement("code")
    codeElement.textContent = selectedText || "// 在此处输入代码"
    codeBlock.appendChild(codeElement)

    // 替换选中内容
    range.deleteContents()
    range.insertNode(codeBlock)

    // 更新内容
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML || ""
      onChange(newContent)
    }

    // 将光标放在代码块内部
    setIsCodeBlock(true)
    setTimeout(() => {
      const newRange = document.createRange()
      newRange.selectNodeContents(codeElement)
      newRange.collapse(false)
      selection.removeAllRanges()
      selection.addRange(newRange)
      if (editorRef.current) editorRef.current.focus()
    }, 0)
  }, [onChange])

  // 插入链接
  const insertLink = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const url = prompt("请输入链接地址:", "https://")
    if (!url) return

    execCommand("createLink", url)
  }, [execCommand])

  // 插入图片
  const insertImage = useCallback(() => {
    const url = prompt("请输入图片地址:", "https://")
    if (!url) return

    execCommand("insertImage", url)
  }, [execCommand])

  // 使用 useMemo 优化类名计算
  const computedClassName = useMemo(() => {
    return cn(
      "outline-none w-full h-full min-h-[200px] text-foreground editor-content text-base",
      "focus:ring-0 focus:outline-none",
      !value && "before:content-[attr(data-placeholder)] before:text-muted-foreground",
      className,
    )
  }, [value, className])

  return (
    <div className="w-full h-full flex flex-col">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 p-1 mb-2 border rounded-md bg-background/80">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("bold")}>
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>加粗 (Ctrl+B)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("italic")}>
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>斜体 (Ctrl+I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => execCommand("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>无序列表</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => execCommand("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>有序列表</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertCodeBlock}>
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>代码块</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => execCommand("formatBlock", "<h1>")}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>标题 1</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => execCommand("formatBlock", "<h2>")}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>标题 2</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => execCommand("formatBlock", "<blockquote>")}
                >
                  <Quote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>引用</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertLink}>
                  <Link className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>插入链接</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={insertImage}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>插入图片</TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-border mx-1"></div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyLeft")}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>左对齐</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyCenter")}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>居中对齐</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyRight")}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>右对齐</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={computedClassName}
        data-placeholder={placeholder}
        style={{}}
        onKeyDown={(e) => {
          // Support Tab key indentation in code blocks
          if (e.key === "Tab" && isCodeBlock) {
            e.preventDefault()
            document.execCommand("insertText", false, "  ")
          }
        }}
        onFocus={() => {
          if (mounted) {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0)
              const parentElement = range.startContainer.parentElement
              setIsCodeBlock(parentElement?.tagName === "CODE" || parentElement?.parentElement?.tagName === "PRE")
            }
          }
        }}
      />
    </div>
  )
}

// 添加防抖函数
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
