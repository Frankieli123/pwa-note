"use client"

import { useState, useRef, useCallback } from "react"
import { useSync } from "@/hooks/use-sync"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/hooks/use-settings"

// 检查内容是否真正为空（包括只有HTML标签和HTML实体的情况）
export const isContentEmpty = (content: string): boolean => {
  if (!content) return true

  // 创建临时DOM元素来正确解析HTML实体
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = content

  // 获取纯文本内容（这会自动处理HTML实体）
  const textOnly = tempDiv.textContent || tempDiv.innerText || ''

  // 检查是否只有空白字符、换行符等
  return !textOnly.trim() || textOnly.trim().replace(/\s/g, '') === ''
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
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { saveNote } = useSync()
  const { user } = useAuth()
  const { toast } = useToast()
  const { settings } = useSettings()

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
    console.log("开始保存便签...")
    console.log("内容:", content)
    console.log("用户登录状态:", !!user)

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
      console.log("调用 saveNote 函数...")
      const result = await saveNote("new", trimmedContent)
      console.log("保存结果:", result)

      if (result) {
        clearEditor()
        
        toast({
          title: "保存成功",
          description: "便签已保存",
        })
      } else {
        const errorMsg = "保存便签时发生未知错误"
        console.error("保存便签失败:", errorMsg)
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
      console.error("保存便签错误:", error)
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
    // 不再插入到编辑器内容中，只是上传到文件列表
    // 文件已经通过 FileUploader 组件上传到了文件列表
    console.log(`${type === "image" ? "图片" : "文件"}上传成功，已添加到文件列表`)
    setIsUploadDialogOpen(false)

    // 可以显示成功提示
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
