"use client"

import { useState, useRef, useCallback } from "react"
import { useSync } from "@/hooks/use-sync"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// HTML转纯文本的转换函数
export const htmlToText = (html: string): string => {
  if (!html) return ''

  // 创建临时DOM元素来正确解析HTML
  const tempDiv = document.createElement('div')
  let processedHtml = html

  // 处理各种HTML换行元素，转换为换行符
  processedHtml = processedHtml.replace(/<br\s*\/?>/gi, '\n')
  processedHtml = processedHtml.replace(/<\/div>/gi, '\n')
  processedHtml = processedHtml.replace(/<\/p>/gi, '\n')
  processedHtml = processedHtml.replace(/<\/li>/gi, '\n')

  tempDiv.innerHTML = processedHtml
  let textContent = tempDiv.textContent || tempDiv.innerText || ''

  // 清理多余的换行符
  textContent = textContent.replace(/\n{3,}/g, '\n\n').trim()

  return textContent
}

// 检查内容是否真正为空（纯文本版本）
export const isContentEmpty = (content: string): boolean => {
  if (!content) return true

  // 对于纯文本，直接检查是否只有空白字符
  return !content.trim() || content.trim().replace(/\s/g, '') === ''
}

/**
 * useNoteEditorState - 笔记编辑器状态管理Hook
 * 
 * 职责：
 * - 管理编辑器内容和状态
 * - 处理自动保存逻辑
 * - 管理草稿和本地存储
 * - 提供保存和错误处理功能
 */
export function useNoteEditorState() {
  // 基础状态
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  
  // 上传相关状态
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState<"image" | "file">("image")
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)

  // Refs
  const lastEditRef = useRef<Date>(new Date())
  const lastContentRef = useRef<string>("")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { saveNote } = useSync()
  const { user } = useAuth()
  const { toast } = useToast()


  // 加载草稿内容
  const loadDraft = useCallback(() => {
    if (typeof window === "undefined") return

    const savedDraft = localStorage.getItem("noteDraft")
    if (savedDraft) {
      setContent(savedDraft)
      lastContentRef.current = savedDraft
    }
  }, [])

  // 清空编辑器
  const clearEditor = useCallback(() => {
    setContent("")
    localStorage.removeItem("noteDraft")
    lastContentRef.current = ""
  }, [])

  // 手动保存便签
  const handleSaveNote = useCallback(async () => {
    if (isContentEmpty(content)) {
      toast({
        title: "无法保存空笔记",
        description: "请先添加一些内容",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能保存便签",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const trimmedContent = content.trim()
      const result = await saveNote("new", trimmedContent)

      if (result) {
        clearEditor()
        
        toast({
          title: "保存成功",
          description: "便签已保存",
        })
      } else {
        const errorMsg = "保存便签时发生未知错误"
        setSaveError(errorMsg)
        setIsErrorDialogOpen(true)

        toast({
          title: "保存失败",
          description: "无法保存便签",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "保存便签时发生未知错误"
      setSaveError(errorMsg)
      setIsErrorDialogOpen(true)

      toast({
        title: "保存失败",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [content, user, saveNote, toast, clearEditor])

  // 上传处理函数 - 修改为不插入编辑器，只上传到文件列表
  const handleUploadSuccess = useCallback((url: string, type: "image" | "file") => {
    setIsUploadDialogOpen(false)

    toast({
      title: "上传成功",
      description: `${type === "image" ? "图片" : "文件"}已添加到文件列表`,
    })
  }, [toast])

  const openUploadDialog = useCallback((type: "image" | "file") => {
    setUploadType(type)
    setIsUploadDialogOpen(true)
  }, [])

  return {
    // 状态
    content,
    isSaving,
    saveError,
    lastAutoSaveTime,
    isUploadDialogOpen,
    uploadType,
    isErrorDialogOpen,
    
    // Refs
    lastEditRef,
    lastContentRef,
    autoSaveTimerRef,
    editorRef,
    
    // 状态更新函数
    setContent,
    setIsSaving,
    setSaveError,
    setLastAutoSaveTime,
    setIsUploadDialogOpen,
    setUploadType,
    setIsErrorDialogOpen,
    
    // 操作函数
    loadDraft,
    clearEditor,
    handleSaveNote,
    handleUploadSuccess,
    openUploadDialog,
  }
}
