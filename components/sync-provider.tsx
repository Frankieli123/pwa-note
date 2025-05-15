"use client"

import type React from "react"
import { createContext, useEffect, useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/hooks/use-settings"
import { useAuth } from "@/hooks/use-auth"
import {
  getNotes,
  createNote,
  deleteNote as deleteNoteAction,
  getLinks,
  createLink,
  deleteLink as deleteLinkAction,
  getFiles,
  createFile,
  deleteFile as deleteFileAction,
} from "@/app/actions/db-actions"

type SyncStatus = "idle" | "syncing" | "error" | "success"

type Note = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type Link = {
  id: string
  url: string
  title: string
  createdAt: Date
}

type SyncContextType = {
  syncStatus: SyncStatus
  lastSyncTime: Date | null
  isSyncEnabled: boolean
  toggleSync: () => void
  syncNow: (silent?: boolean) => Promise<void>
  uploadFile: (file: File) => Promise<void>
  deleteFile: (id: string) => void
  uploadedFiles: UploadedFile[]
  notes: Note[]
  saveNote: (content: string) => Promise<{ success: boolean; error?: string }>
  deleteNote: (id: string) => void
  links: Link[]
  saveLink: (link: Omit<Link, "id">) => Promise<void>
  deleteLink: (id: string) => void
}

type UploadedFile = {
  id: string
  name: string
  type: string
  url: string
  thumbnail?: string
  uploadedAt: Date
  size: number
}

export const SyncContext = createContext<SyncContextType>({
  syncStatus: "idle",
  lastSyncTime: null,
  isSyncEnabled: true,
  toggleSync: () => {},
  syncNow: async () => {},
  uploadFile: async () => {},
  deleteFile: () => {},
  uploadedFiles: [],
  notes: [],
  saveNote: async () => ({ success: false }),
  deleteNote: () => {},
  links: [],
  saveLink: async () => {},
  deleteLink: () => {},
})

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncEnabled, setIsSyncEnabled] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const { toast } = useToast()
  const { settings } = useSettings()
  const { user } = useAuth()
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingDeletesRef = useRef<string[]>([])
  const pendingDeleteFilesRef = useRef<string[]>([])
  const pendingDeleteLinksRef = useRef<string[]>([])

  // Load data when user changes
  useEffect(() => {
    if (typeof window === "undefined" || !user) return

    const loadData = async () => {
      await syncNow(true)
    }

    loadData()
  }, [user])

  // Auto sync every 5 minutes if enabled
  useEffect(() => {
    if (!isSyncEnabled || !user) return

    const interval = setInterval(
      () => {
        syncNow(true) // Silent sync
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [isSyncEnabled, user])

  const syncNow = async (silent = false) => {
    if (syncStatus === "syncing" || !user) return

    if (!silent) {
      setSyncStatus("syncing")
    }

    try {
      if (typeof window !== "undefined" && user) {
        console.log("开始同步数据...")

        // Fetch data from database
        const [dbNotes, dbLinks, dbFiles] = await Promise.all([getNotes(user.username), getLinks(user.username), getFiles(user.username)])

        console.log("从数据库获取的笔记:", dbNotes)
        console.log("从数据库获取的链接:", dbLinks)
        console.log("从数据库获取的文件:", dbFiles)

        // Update state with fetched data
        setNotes(
          dbNotes.map((note) => {
            // 完全使用服务器返回的原始时间，不做任何调整
            const serverCreatedAt = new Date(note.created_at);
            const serverUpdatedAt = new Date(note.updated_at);
            
            return {
              id: String(note.id),
              content: note.content,
              createdAt: serverCreatedAt,
              updatedAt: serverUpdatedAt,
            };
          }),
        )

        setLinks(
          dbLinks.map((link) => {
            // 完全使用服务器返回的原始时间，不做任何调整
            const serverCreatedAt = new Date(link.created_at);
            
            return {
              id: String(link.id),
              url: link.url,
              title: link.title,
              createdAt: serverCreatedAt,
            };
          }),
        )

        setUploadedFiles(
          dbFiles.map((file) => {
            // 完全使用服务器返回的原始时间，不做任何调整
            const serverUploadedAt = new Date(file.uploaded_at);
            
            return {
              id: String(file.id),
              name: file.name,
              type: file.type,
              url: file.url,
              thumbnail: file.thumbnail || undefined,
              uploadedAt: serverUploadedAt,
              size: file.size,
            };
          }),
        )
      }

      const now = new Date()
      setLastSyncTime(now)

      if (!silent) {
        setSyncStatus("success")

        // Shorter success status display time
        setTimeout(() => {
          setSyncStatus("idle")
        }, 800)
      }
    } catch (error) {
      console.error("Sync failed:", error)

      if (!silent) {
        setSyncStatus("error")

        // Error status display time
        setTimeout(() => {
          setSyncStatus("idle")
        }, 1500)
      }
    }
  }

  const debouncedSync = (silent = false) => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
    }
    
    syncTimerRef.current = setTimeout(async () => {
      await syncNow(silent)
      syncTimerRef.current = null
    }, 3000)
  }

  const toggleSync = () => {
    setIsSyncEnabled((prev) => !prev)
    toast({
      title: isSyncEnabled ? "自动同步已禁用" : "自动同步已启用",
      description: isSyncEnabled ? "您的更改将不会自动保存" : "您的更改将在后台自动保存",
    })
  }

  const uploadFile = async (file: File) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能上传文件",
        variant: "destructive",
      })
      return
    }

    setSyncStatus("syncing")

    try {
      // 使用FileReader将文件转换为Base64格式
      const getBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      let fileUrl = "";
      let thumbnailUrl = undefined;

      // 根据文件类型设置URL
      if (file.type.startsWith("image/")) {
        // 对于图片，将它转换为Base64格式
        fileUrl = await getBase64(file);
        thumbnailUrl = fileUrl; // 对于图片，缩略图和原图使用相同的Base64
      } else if (file.type.includes("pdf")) {
        // 对于PDF，也使用Base64格式存储
        fileUrl = await getBase64(file);
        thumbnailUrl = `/placeholder.svg?text=PDF&name=${encodeURIComponent(file.name)}`;
      } else if (file.type.includes("text") || file.name.endsWith(".txt")) {
        // 对于文本文件，也使用Base64格式存储
        fileUrl = await getBase64(file);
        thumbnailUrl = `/placeholder.svg?text=TXT&name=${encodeURIComponent(file.name)}`;
      } else if (
        file.type.includes("spreadsheet") || 
        file.type.includes("excel") || 
        file.name.endsWith(".xlsx") || 
        file.name.endsWith(".xls") || 
        file.name.endsWith(".csv")
      ) {
        // 对于表格类文件，使用Base64格式存储
        fileUrl = await getBase64(file);
        thumbnailUrl = `/placeholder.svg?text=Excel&name=${encodeURIComponent(file.name)}`;
      } else {
        // 对于其他文件类型，也使用Base64格式
        fileUrl = await getBase64(file);
        thumbnailUrl = `/placeholder.svg?text=File&name=${encodeURIComponent(file.name)}`;
      }

      // 保存文件到数据库
      const result = await createFile(user.username, {
        name: file.name,
        type: file.type,
        url: fileUrl,
        thumbnail: thumbnailUrl,
        size: file.size,
      })

      const newFile = {
        id: String(result.id),
        name: file.name,
        type: file.type,
        url: fileUrl,
        thumbnail: thumbnailUrl,
        uploadedAt: new Date(result.uploaded_at),
        size: file.size,
      }

      const updatedFiles = [newFile, ...uploadedFiles]
      setUploadedFiles(updatedFiles)
      setLastSyncTime(new Date())
      setSyncStatus("success")

      toast({
        title: "文件已上传",
        description: `${file.name} 已成功上传`,
      })

      // Reset to idle state after 2 seconds
      setTimeout(() => {
        setSyncStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Upload failed:", error)
      setSyncStatus("error")

      toast({
        title: "上传失败",
        description: "请重试",
        variant: "destructive",
      })

      // Reset to idle state after 2 seconds
      setTimeout(() => {
        setSyncStatus("idle")
      }, 2000)
    }
  }

  const deleteFile = async (id: string) => {
    if (!user) return

    // 获取要删除的文件信息
    const fileToDelete = uploadedFiles.find((file) => file.id === id)
    if (!fileToDelete) return
    
    // 将ID添加到待删除队列
    pendingDeleteFilesRef.current.push(id)

    // 首先更新UI，立即从界面上移除文件
    const updatedFiles = uploadedFiles.filter((file) => file.id !== id)
    setUploadedFiles(updatedFiles)

    // 然后在后台执行数据库删除操作
    try {
      await deleteFileAction(Number(id), user.username)
      
      // 从待删除队列中移除已成功删除的ID
      pendingDeleteFilesRef.current = pendingDeleteFilesRef.current.filter(pendingId => pendingId !== id)
      
      // 使用防抖的同步函数，而不是直接调用syncNow
      // 只有当这是队列中最后一个待删除项时，才触发同步
      if (pendingDeleteFilesRef.current.length === 0) {
        debouncedSync(true)
      }
    } catch (error) {
      console.error("Delete file failed:", error)
      
      // 从待删除队列中移除失败的ID
      pendingDeleteFilesRef.current = pendingDeleteFilesRef.current.filter(pendingId => pendingId !== id)
      
      // 如果删除失败，恢复UI状态
      setUploadedFiles([...updatedFiles, fileToDelete])
      
      toast({
        title: "删除失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  const saveNote = async (content: string) => {
    console.log("SyncProvider.saveNote 被调用")
    console.log("内容:", content)
    console.log("用户:", user)

    if (!user) {
      console.error("保存便签失败: 用户未登录")
      return { success: false, error: "用户未登录" }
    }

    try {
      console.log("调用 createNote 服务器操作...")
      const result = await createNote(user.username, content)
      console.log("createNote 结果:", result)

      if (!result || !result.id) {
        console.error("保存便签失败: 服务器返回无效结果")
        return { success: false, error: "服务器返回无效结果" }
      }

      // 使用服务器返回的创建时间
      const serverCreatedAt = new Date(result.created_at);
      const serverUpdatedAt = new Date(result.updated_at);
      console.log("使用服务器返回的创建时间:", serverCreatedAt.toISOString());
      
      const newNote = {
        id: String(result.id),
        content,
        createdAt: serverCreatedAt,
        updatedAt: serverUpdatedAt,
      }

      console.log("新便签:", newNote)
      const updatedNotes = [newNote, ...notes]
      setNotes(updatedNotes)

      // Trigger sync
      await syncNow(true)

      return { success: true }
    } catch (error) {
      console.error("保存便签失败:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  const deleteNote = async (id: string) => {
    if (!user) return

    // 获取要删除的便签信息
    const noteToDelete = notes.find((note) => note.id === id)
    if (!noteToDelete) return
    
    // 将ID添加到待删除队列
    pendingDeletesRef.current.push(id)
    
    // 首先更新UI，立即从界面上移除便签
    const updatedNotes = notes.filter((note) => note.id !== id)
    setNotes(updatedNotes)

    // 然后在后台执行数据库删除操作
    try {
      await deleteNoteAction(Number(id), user.username)
      
      // 从待删除队列中移除已成功删除的ID
      pendingDeletesRef.current = pendingDeletesRef.current.filter(pendingId => pendingId !== id)
      
      // 使用防抖的同步函数，而不是直接调用syncNow
      // 只有当这是队列中最后一个待删除项时，才触发同步
      if (pendingDeletesRef.current.length === 0) {
        debouncedSync(true)
      }
    } catch (error) {
      console.error("Delete note failed:", error)
      
      // 从待删除队列中移除失败的ID
      pendingDeletesRef.current = pendingDeletesRef.current.filter(pendingId => pendingId !== id)
      
      // 如果删除失败，恢复UI状态
      setNotes([...updatedNotes, noteToDelete])
      
      toast({
        title: "删除失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  const saveLink = async (link: Omit<Link, "id">) => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能保存链接",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createLink(user.username, link.url, link.title)

      const newLink = {
        id: String(result.id),
        url: link.url,
        title: link.title,
        createdAt: new Date(result.created_at),
      }

      const updatedLinks = [newLink, ...links]
      setLinks(updatedLinks)

      // Trigger sync
      await syncNow(true)
    } catch (error) {
      console.error("Save link failed:", error)
      toast({
        title: "保存失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  const deleteLink = async (id: string) => {
    if (!user) return

    // 获取要删除的链接信息
    const linkToDelete = links.find((link) => link.id === id)
    if (!linkToDelete) return
    
    // 将ID添加到待删除队列
    pendingDeleteLinksRef.current.push(id)
    
    // 首先更新UI，立即从界面上移除链接
    const updatedLinks = links.filter((link) => link.id !== id)
    setLinks(updatedLinks)

    // 然后在后台执行数据库删除操作
    try {
      await deleteLinkAction(Number(id), user.username)
      
      // 从待删除队列中移除已成功删除的ID
      pendingDeleteLinksRef.current = pendingDeleteLinksRef.current.filter(pendingId => pendingId !== id)
      
      // 使用防抖的同步函数，而不是直接调用syncNow
      // 只有当这是队列中最后一个待删除项时，才触发同步
      if (pendingDeleteLinksRef.current.length === 0) {
        debouncedSync(true)
      }
    } catch (error) {
      console.error("Delete link failed:", error)
      
      // 从待删除队列中移除失败的ID
      pendingDeleteLinksRef.current = pendingDeleteLinksRef.current.filter(pendingId => pendingId !== id)
      
      // 如果删除失败，恢复UI状态
      setLinks([...updatedLinks, linkToDelete])
      
      toast({
        title: "删除失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        lastSyncTime,
        isSyncEnabled,
        toggleSync,
        syncNow,
        uploadFile,
        deleteFile,
        uploadedFiles,
        notes,
        saveNote,
        deleteNote,
        links,
        saveLink,
        deleteLink,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
