"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useSync } from "@/hooks/use-sync"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// 检测内容是否真正是HTML（而不是包含 < 和 > 的普通文本，如shell脚本）
export const isActualHtml = (content: string): boolean => {
  if (!content) return false
  
  // 检测常见的HTML标签模式（必须是有效的HTML标签格式）
  // 匹配 <tagname> 或 <tagname ...> 或 </tagname> 或 <tagname/>
  const htmlTagPattern = /<\/?(?:div|p|br|span|a|img|ul|ol|li|h[1-6]|table|tr|td|th|thead|tbody|strong|em|b|i|u|s|code|pre|blockquote|hr|input|button|form|label|select|option|textarea|header|footer|nav|section|article|aside|main|figure|figcaption|video|audio|source|canvas|svg|path|style|script|link|meta|html|head|body|title)\b[^>]*\/?>/i
  
  return htmlTagPattern.test(content)
}

// HTML转纯文本的转换函数
export const htmlToText = (html: string): string => {
  if (!html) return ''

  // 如果不是真正的HTML，直接返回原内容
  if (!isActualHtml(html)) {
    return html
  }

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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const isSubmittingRef = useRef(false)
  
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
  const { saveNote, notes } = useSync()
  const { user } = useAuth()
  const { toast } = useToast()


  // 加载草稿内容
  const contentRef = useRef("")
  const editingNoteIdRef = useRef<string | null>(null)
  const notesRef = useRef(notes)
  const userRef = useRef(user)

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    editingNoteIdRef.current = editingNoteId
  }, [editingNoteId])

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const toText = (value: string) => (isActualHtml(value) ? htmlToText(value) : value)

    const handleEditNote = (event: Event) => {
      const note = (event as CustomEvent<any>).detail
      if (!note?.id) return
      if (editingNoteIdRef.current === String(note.id)) return

      void (async () => {
        const currentText = contentRef.current.trim()
        if (currentText) {
          const currentId = editingNoteIdRef.current
          const currentBaseText = currentId
            ? toText(notesRef.current.find((n: any) => n.id === currentId)?.content ?? "").trim()
            : ""
          const hasUnsaved = currentId ? currentText !== currentBaseText : true

          if (hasUnsaved) {
            const currentUser = userRef.current
            if (currentUser) {
              const toSave = currentText
              void (async () => {
                const saved = await saveNote("new", toSave)
                if (saved) {
                  toast({ title: "已自动保存为新便签", duration: 1500 })
                  localStorage.removeItem("noteDraft")
                } else {
                  localStorage.setItem("noteDraft", toSave)
                }
              })()
            } else {
              toast({ title: "未登录，已保留草稿", variant: "destructive", duration: 1500 })
              localStorage.setItem("noteDraft", currentText)
            }
          }
        }

        const nextText = toText(String(note.content ?? ""))
        setContent(nextText)
        setEditingNoteId(String(note.id))
        lastContentRef.current = nextText
      })()
    }

    window.addEventListener("pwa-note:edit-note", handleEditNote as EventListener)
    return () => window.removeEventListener("pwa-note:edit-note", handleEditNote as EventListener)
  }, [saveNote, toast])

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
    setEditingNoteId(null)
    localStorage.removeItem("noteDraft")
    lastContentRef.current = ""
  }, [])

  // 手动保存便签
  const handleSaveNote = useCallback(async () => {
    if (isSubmittingRef.current) return

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
      isSubmittingRef.current = true
      localStorage.setItem("noteDraft", trimmedContent)

      const savePromise = saveNote("new", trimmedContent)

      setContent("")
      setEditingNoteId(null)
      lastContentRef.current = ""

      setTimeout(() => setIsSaving(false), 250)

      void (async () => {
        try {
          const result = await savePromise
          if (result) {
            localStorage.removeItem("noteDraft")
            toast({ title: "保存成功", description: "便签已添加到列表" })
            return
          }

          setSaveError("保存便签时发生未知错误")
          setIsErrorDialogOpen(true)
          toast({ title: "保存失败", description: "无法保存便签", variant: "destructive" })

          if (!contentRef.current.trim()) {
            setContent(trimmedContent)
            lastContentRef.current = trimmedContent
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "保存便签时发生未知错误"
          setSaveError(errorMsg)
          setIsErrorDialogOpen(true)
          toast({ title: "保存失败", description: errorMsg, variant: "destructive" })

          if (!contentRef.current.trim()) {
            setContent(trimmedContent)
            lastContentRef.current = trimmedContent
          }
        } finally {
          isSubmittingRef.current = false
        }
      })()

      return
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
      if (!isSubmittingRef.current) setIsSaving(false)
    }
  }, [content, user, saveNote, toast])

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
    editingNoteId,
    
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
