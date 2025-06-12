"use client"

import type React from "react"
import { createContext, useEffect, useState, useRef, useCallback, useContext } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/hooks/use-settings"
import { useAuth } from "@/hooks/use-auth"
import { AuthContext } from "./auth-provider"
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { SettingsContext } from './settings-provider'

import {
  getNotes as getNotesAction,
  createNote as createNoteAction,
  updateNote as updateNoteAction,
  deleteNote as deleteNoteAction,
  getLinks as getLinksAction,
  createLink as createLinkAction,
  deleteLink as deleteLinkAction,
  getFiles as getFilesAction,
  createFile as createFileAction,
  deleteFile as deleteFileAction,
  Note as DbNote,
  Link as DbLink,
  File as DbFile
} from "@/app/actions/db-actions"

// Client-side types that match DB types but with string IDs for easier handling
type Note = {
  id: string
  content: string
  title?: string
  user_id: string
  created_at: Date
  updated_at: Date
}

type Link = {
  id: string
  url: string
  title: string
  user_id: string
  created_at: Date
}

type File = {
  id: string
  name: string
  type: string
  url: string
  thumbnail?: string | null
  size: number
  user_id: string
  uploaded_at: Date
}

// Function to convert DB types to client types
const mapDbNoteToNote = (dbNote: DbNote): Note => ({
  ...dbNote,
  id: String(dbNote.id)
})

const mapDbLinkToLink = (dbLink: DbLink): Link => ({
  ...dbLink,
  id: String(dbLink.id)
})

const mapDbFileToFile = (dbFile: DbFile): File => ({
  ...dbFile,
  id: String(dbFile.id),
  thumbnail: dbFile.thumbnail || undefined
})

type SyncStatus = "idle" | "syncing" | "error" | "success"

interface SyncContextType {
  status: SyncStatus
  lastSync: Date | null
  notes: Note[]
  links: Link[]
  files: File[]
  sync: (silent?: boolean) => Promise<void>
  saveNote: (id: string, content: string, title?: string) => Promise<Note | null>
  deleteNote: (id: string) => Promise<boolean>
  saveLink: (url: string, title?: string) => Promise<Link | null>
  deleteLink: (id: string) => Promise<boolean>
  uploadFile: (file: globalThis.File) => Promise<{ id: string; url: string } | null>
  deleteFile: (id: string) => Promise<boolean>
  isInitialized: boolean
}

export const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useContext(AuthContext)
  const { settings } = useContext(SettingsContext)
  const syncInterval = settings?.syncInterval ? settings.syncInterval * 60 * 1000 : 5 * 60 * 1000 // Convert to milliseconds
  const autoSync = true // Assuming autoSync is always enabled
  const syncOnStartup = true // Assuming syncOnStartup is always enabled
  const { toast } = useToast()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const lastSyncTimeRef = useRef<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const checkUpdatesTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingDeletesRef = useRef<string[]>([])
  const pendingDeleteFilesRef = useRef<string[]>([])
  const pendingDeleteLinksRef = useRef<string[]>([])
  const syncChannel = useRef<BroadcastChannel | null>(null)
  const lastBroadcastRef = useRef<number | null>(null)
  const lastContentUpdateRef = useRef<Date | null>(null)
  const pendingSaveNotesRef = useRef<Array<{
    tempId: string;
    content: string;
    title?: string;
  }>>([])
  const pendingSaveLinksRef = useRef<Array<{
    tempId: string;
    url: string;
    title: string;
  }>>([])
  const pendingUploadFilesRef = useRef<Array<{
    tempId: string;
    file: File;
  }>>([])

  // 初始化 - 设置客户端时间
  useEffect(() => {
    // 页面加载时立即设置客户端时间
    const clientNow = new Date();
    setLastSyncTime(clientNow);
    lastSyncTimeRef.current = clientNow;
    lastContentUpdateRef.current = clientNow;
    console.log('初始化客户端时间:', clientNow);
  }, []);
  
  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setNotes([])
      setLinks([])
      setFiles([])
      setIsInitialized(false)
      return
    }

    const loadInitialData = async () => {
      setSyncStatus("syncing")
      try {
        // 初始化时设置客户端时间
        const clientNow = new Date();
        setLastSyncTime(clientNow);
        lastSyncTimeRef.current = clientNow;
        lastContentUpdateRef.current = clientNow;
        
        await sync(false)
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to load initial data", error)
        setSyncStatus("error")
      }
    }

    loadInitialData()
  }, [user])

  // Set up sync timer and update checker
  useEffect(() => {
    if (!user || !autoSync) {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
      if (checkUpdatesTimerRef.current) {
        clearInterval(checkUpdatesTimerRef.current)
        checkUpdatesTimerRef.current = null
      }
      return
    }

    // Initialize BroadcastChannel for cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      syncChannel.current = new BroadcastChannel('sync_channel');
      
      // Listen for messages from other tabs
      syncChannel.current.onmessage = (event) => {
        const { type, timestamp, userId } = event.data;
        
        // Only process updates from the same user
        if (type === 'content_updated' && userId === user?.id && timestamp !== lastBroadcastRef.current) {
          console.log('Received sync broadcast, performing silent sync...');
          // Trigger silent sync
          sync(true);
        }
      };
    }

    // 每5分钟执行一次完整同步（备份方案）
    const interval = setInterval(() => {
      if (navigator.onLine) {
        sync(true)
      }
    }, syncInterval || 5 * 60 * 1000)

    // 每30秒检查一次更新（轻量级检查）
    const checkInterval = setInterval(() => {
      if (navigator.onLine) {
        checkForUpdates()
      }
    }, 30 * 1000) // 30秒检查一次

    syncTimerRef.current = interval
    checkUpdatesTimerRef.current = checkInterval

    return () => {
      clearInterval(interval)
      clearInterval(checkInterval)
      if (syncChannel.current) {
        syncChannel.current.close();
      }
    }
  }, [user, autoSync, syncInterval])

  // 检查服务器上是否有更新的函数
  const checkForUpdates = async () => {
    if (!user) return;

    try {
      // 获取上次内容更新时间
      const lastUpdate = lastContentUpdateRef.current || lastSyncTime;

      if (!lastUpdate) {
        // 如果没有上次更新时间，执行完整同步
        await sync(true);
        return;
      }

      // 调用轻量级API检查是否有更新，添加重试机制
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          const response = await fetch('/api/check-updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              lastUpdate: lastUpdate.toISOString()
            })
          });

          if (!response.ok) {
            if (response.status === 404) {
              // API路由不存在，跳过检查
              console.warn("check-updates API not available, skipping update check");
              return;
            }
            throw new Error(`Error checking for updates: ${response.statusText}`);
          }

          const { hasUpdates } = await response.json();

          // 如果有更新，执行静默同步
          if (hasUpdates) {
            console.log('Updates detected, syncing...');
            await sync(true);
          }

          // 成功执行，跳出重试循环
          break;
        } catch (fetchError) {
          if (retryCount === maxRetries) {
            throw fetchError;
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Failed to check for updates after retries:', error);
      // 如果检查更新失败，静默忽略，避免影响用户体验
    }
  };

  // 广播更新通知到所有打开的标签页
  const broadcastUpdate = useCallback((updateType: string = 'content_updated') => {
    if (!user?.id || !syncChannel.current) return;

    const timestamp = Date.now();
    // 存储同步点到localStorage
    localStorage.setItem(`last_sync_broadcast_${user.id}`, timestamp.toString());
    lastBroadcastRef.current = timestamp;

    // 广播消息到其他标签页
    syncChannel.current.postMessage({
      type: updateType,
      timestamp,
      userId: user.id
    });
  }, [user?.id]);

  // Sync with the server
  const sync = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setSyncStatus("syncing")
    }

    try {
      // Process pending offline operations
      await handlePendingOperations()

      const [notesData, linksData, filesData] = await Promise.all([
        getNotesAction(user.id),
        getLinksAction(user.id),
        getFilesAction(user.id),
      ])

      // Map DB types to client types with null checks
      setNotes(notesData ? notesData.map(mapDbNoteToNote) : [])
      setLinks(linksData ? linksData.map(mapDbLinkToLink) : [])
      setFiles(filesData ? filesData.map(mapDbFileToFile) : [])
      
      // 直接使用客户端当前时间
      const clientNow = new Date();
      setLastSyncTime(clientNow);
      lastSyncTimeRef.current = clientNow;
      lastContentUpdateRef.current = clientNow; // 同时更新内容时间戳
      
      console.log('同步操作更新时间为(客户端时间):', clientNow);

      if (!silent) {
        setSyncStatus("success")
      }

      // Force refresh after sync
      router.refresh()
    } catch (error) {
      console.error("Sync failed", error)

      if (!silent) {
        setSyncStatus("error")
        toast({
          variant: "destructive",
          title: "同步失败",
          description: "未能同步数据，请稍后再试",
        })
      }
    }
  }

  // Handle pending operations (created offline)
  const handlePendingOperations = async () => {
    // Process pending deletes
    if (pendingDeletesRef.current.length > 0) {
      const pendingDeletes = [...pendingDeletesRef.current]
      pendingDeletesRef.current = []

      for (const id of pendingDeletes) {
        try {
          // 确保 id 是有效的数字
          const numId = parseInt(id, 10)
          if (isNaN(numId)) {
            console.error("Invalid note ID:", id)
            continue;
          }
          await deleteNoteAction(numId, user?.id || "")
        } catch (error) {
          console.error(`Failed to delete note ${id}`, error)
          pendingDeletesRef.current.push(id)
        }
      }
    }

    // Process pending file deletes
    if (pendingDeleteFilesRef.current.length > 0) {
      const pendingDeletes = [...pendingDeleteFilesRef.current]
      pendingDeleteFilesRef.current = []

      for (const id of pendingDeletes) {
        try {
          // 确保 id 是有效的数字
          const numId = parseInt(id, 10)
          if (isNaN(numId)) {
            console.error("Invalid file ID:", id)
            continue;
          }
          await deleteFileAction(numId, user?.id || "")
        } catch (error) {
          console.error(`Failed to delete file ${id}`, error)
          pendingDeleteFilesRef.current.push(id)
        }
      }
    }

    // Process pending link deletes
    if (pendingDeleteLinksRef.current.length > 0) {
      const pendingDeletes = [...pendingDeleteLinksRef.current]
      pendingDeleteLinksRef.current = []

      for (const id of pendingDeletes) {
        try {
          // 确保 id 是有效的数字
          const numId = parseInt(id, 10)
          if (isNaN(numId)) {
            console.error("Invalid link ID:", id)
            continue;
          }
          await deleteLinkAction(numId, user?.id || "")
        } catch (error) {
          console.error(`Failed to delete link ${id}`, error)
          pendingDeleteLinksRef.current.push(id)
        }
      }
    }
    
    // Process pending note saves
    if (pendingSaveNotesRef.current.length > 0) {
      const pendingSaves = [...pendingSaveNotesRef.current]
      pendingSaveNotesRef.current = []
      
      for (const item of pendingSaves) {
        try {
          const result = await createNoteAction(user?.id || "", item.content);
          const clientNote = mapDbNoteToNote(result);
          
          // 用实际ID更新UI中的临时笔记
          setNotes((prev) => {
            const tempIndex = prev.findIndex((n) => n.id === item.tempId);
            if (tempIndex !== -1) {
              return [
                ...prev.slice(0, tempIndex),
                clientNote,
                ...prev.slice(tempIndex + 1),
              ];
            }
            return prev;
          });
        } catch (error) {
          console.error(`Failed to save pending note ${item.tempId}`, error);
          pendingSaveNotesRef.current.push(item);
        }
      }
    }
    
    // Process pending link saves
    if (pendingSaveLinksRef.current.length > 0) {
      const pendingSaves = [...pendingSaveLinksRef.current]
      pendingSaveLinksRef.current = []
      
      for (const item of pendingSaves) {
        try {
          const result = await createLinkAction(user?.id || "", item.url, item.title);
          const clientLink = mapDbLinkToLink(result);
          
          // 用实际ID更新UI中的临时链接
          setLinks((prev) => {
            const tempIndex = prev.findIndex((l) => l.id === item.tempId);
            if (tempIndex !== -1) {
              return [
                ...prev.slice(0, tempIndex),
                clientLink,
                ...prev.slice(tempIndex + 1),
              ];
            }
            return prev;
          });
        } catch (error) {
          console.error(`Failed to save pending link ${item.tempId}`, error);
          pendingSaveLinksRef.current.push(item);
        }
      }
    }
    
    // Process pending file uploads
    if (pendingUploadFilesRef.current.length > 0) {
      const pendingUploads = [...pendingUploadFilesRef.current]
      pendingUploadFilesRef.current = []
      
      for (const item of pendingUploads) {
        try {
          const fileData = {
            name: item.file.name,
            type: item.file.type,
            url: item.file.url,
            thumbnail: item.file.thumbnail || undefined,
            size: item.file.size
          };
          
          const result = await createFileAction(user?.id || "", fileData);
          const clientFile = mapDbFileToFile(result);
          
          // 用实际ID更新UI中的临时文件
          setFiles((prev) => {
            const tempIndex = prev.findIndex((f) => f.id === item.tempId);
            if (tempIndex !== -1) {
              return [
                ...prev.slice(0, tempIndex),
                clientFile,
                ...prev.slice(tempIndex + 1),
              ];
            }
            return prev;
          });
        } catch (error) {
          console.error(`Failed to upload pending file ${item.tempId}`, error);
          pendingUploadFilesRef.current.push(item);
        }
      }
    }
  }

  // Save a note
  const saveNote = async (
    id: string,
    content: string,
    title: string = ""
  ): Promise<Note | null> => {
    if (!user) {
      console.log("Cannot save note: user not logged in")
      return null
    }
    
    // 检查笔记内容是否为空或只有空白字符
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      console.log("Cannot save empty note")
      return null
    }
    
    // 生成临时ID（用于新笔记）和临时数据
    const isNewNote = id === "new" || !id;
    const tempId = isNewNote ? `temp_${Date.now()}` : id;
    const now = new Date();
    
    // 创建临时笔记对象用于UI显示
    const tempNote: Note = {
      id: tempId,
      content,
      title,
      user_id: user.id,
      created_at: now,
      updated_at: now
    };
    
    // 存储原始笔记列表，以便操作失败时恢复
    const originalNotes = [...notes];
    
    // 立即更新UI
    setNotes((prev) => {
      if (isNewNote) {
        // 添加新笔记到列表顶部
        return [tempNote, ...prev];
      } else {
        // 更新现有笔记
        const existing = prev.findIndex((n) => n.id === tempId);
        if (existing !== -1) {
          return [
            ...prev.slice(0, existing),
            tempNote,
            ...prev.slice(existing + 1),
          ];
        }
        return [tempNote, ...prev];
      }
    });
    
    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      let result: DbNote;
      let clientNote: Note;
      
      // 获取客户端当前时间用于保存
      const clientTimeNow = new Date();
      const clientTimeISO = clientTimeNow.toISOString();
      
      // 后台处理服务器保存操作
      if (isNewNote) {
        // 创建时传递客户端时间
        result = await createNoteAction(user.id, content, clientTimeISO);
      } else {
        // 确保ID是有效的数字
        const numId = parseInt(id, 10);
        if (isNaN(numId)) {
          console.error("Invalid note ID:", id);
          throw new Error("无效的笔记ID");
        }
        // 更新时传递客户端时间
        result = await updateNoteAction(numId, user.id, content, clientTimeISO);
      }
      
      // 将服务器结果转换为客户端笔记
      clientNote = mapDbNoteToNote(result);
      
      // 使用保存时的客户端时间
      setLastSyncTime(clientTimeNow);
      lastSyncTimeRef.current = clientTimeNow;
      lastContentUpdateRef.current = clientTimeNow;
      
      console.log('保存笔记后更新时间为(客户端时间):', clientTimeNow);
      
      // 如果是新笔记，用实际ID更新UI中的临时笔记
      if (isNewNote) {
        setNotes((prev) => {
          const tempIndex = prev.findIndex((n) => n.id === tempId);
          if (tempIndex !== -1) {
            return [
              ...prev.slice(0, tempIndex),
              clientNote,
              ...prev.slice(tempIndex + 1),
            ];
          }
          return prev;
        });
        
        // 再次广播更新（现在有了真实ID）
        broadcastUpdate();
      }
      
      return clientNote;
    } catch (error) {
      console.error("Failed to save note", error);
      
      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingSaveNotesRef.current.push({
          tempId,
          content,
          title
        });
        return tempNote;
      }
      
      // 如果操作失败，恢复UI
      setNotes(originalNotes);
      
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "未能保存笔记，请稍后再试",
      });
      return null;
    }
  };

  // Delete a note
  const deleteNote = async (id: string): Promise<boolean> => {
    if (!user) return false

    // 存储原始笔记列表，以便操作失败时恢复
    const originalNotes = [...notes];
    
    // 立即更新UI
    setNotes((prev) => prev.filter((n) => n.id !== id))
    
    // If on the note's page, redirect to home
    if (pathname.includes(id)) {
      router.push("/")
    } else {
      router.refresh()
    }
    
    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      // 后台处理服务器删除操作
      const numId = parseInt(id, 10)
      if (isNaN(numId)) {
        console.error("Invalid note ID:", id)
        throw new Error("无效的笔记ID")
      }
      
      // 异步删除服务器数据
      await deleteNoteAction(numId, user.id)
      
      // 直接使用客户端时间
      const clientNow = new Date();
      setLastSyncTime(clientNow);
      lastSyncTimeRef.current = clientNow;
      lastContentUpdateRef.current = clientNow;
      
      console.log('删除笔记后更新时间为(客户端时间):', clientNow);
      
      return true
    } catch (error) {
      console.error(`Failed to delete note ${id}`, error)
      
      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingDeletesRef.current.push(id)
        return true
      }
      
      // 如果操作失败，恢复UI
      setNotes(originalNotes);
      
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "未能删除笔记，请稍后再试",
      })
      return false
    }
  }

  // Save a link
  const saveLink = async (
    url: string,
    title: string = ""
  ): Promise<Link | null> => {
    if (!user) return null
    
    // 生成临时ID和临时数据
    const tempId = `temp_${Date.now()}`;
    const now = new Date();
    
    // 创建临时链接对象用于UI显示
    const tempLink: Link = {
      id: tempId,
      url,
      title,
      user_id: user.id,
      created_at: now
    };
    
    // 存储原始链接列表，以便操作失败时恢复
    const originalLinks = [...links];
    
    // 立即更新UI
    setLinks((prev) => [tempLink, ...prev]);
    
    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      // 获取客户端当前时间用于保存
      const clientTimeNow = new Date();
      const clientTimeISO = clientTimeNow.toISOString();
      
      // 后台处理服务器保存操作
      const result = await createLinkAction(user.id, url, title, clientTimeISO);
      
      // 将服务器结果转换为客户端链接
      const clientLink = mapDbLinkToLink(result);
      
      // 使用保存时的客户端时间
      setLastSyncTime(clientTimeNow);
      lastSyncTimeRef.current = clientTimeNow;
      lastContentUpdateRef.current = clientTimeNow;
      
      console.log('保存链接后更新时间为(客户端时间):', clientTimeNow);
      
      // 用实际ID更新UI中的临时链接
      setLinks((prev) => {
        const tempIndex = prev.findIndex((l) => l.id === tempId);
        if (tempIndex !== -1) {
          return [
            ...prev.slice(0, tempIndex),
            clientLink,
            ...prev.slice(tempIndex + 1),
          ];
        }
        return prev;
      });
      
      // 再次广播更新（现在有了真实ID）
      broadcastUpdate();
      
      return clientLink;
    } catch (error) {
      console.error("Failed to save link", error);
      
      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingSaveLinksRef.current.push({
          tempId,
          url,
          title
        });
        return tempLink;
      }
      
      // 如果操作失败，恢复UI
      setLinks(originalLinks);
      
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "未能保存链接，请稍后再试",
      });
      return null;
    }
  };

  // Delete a link
  const deleteLink = async (id: string): Promise<boolean> => {
    if (!user) return false

    // 存储原始链接列表，以便操作失败时恢复
    const originalLinks = [...links];
    
    // 立即更新UI
    setLinks((prev) => prev.filter((l) => l.id !== id))
    
    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      // 后台处理服务器删除操作
      const numId = parseInt(id, 10)
      if (isNaN(numId)) {
        console.error("Invalid link ID:", id)
        throw new Error("无效的链接ID")
      }
      
      // 更新内容时间戳
      lastContentUpdateRef.current = new Date();
      
      // 异步删除服务器数据
      await deleteLinkAction(numId, user.id)
      
      // 更新最后同步时间 - 保证时间计算钩子使用最新的服务器时间
      setLastSyncTime(new Date());
      lastSyncTimeRef.current = new Date();
      
      return true
    } catch (error) {
      console.error(`Failed to delete link ${id}`, error)
      
      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingDeleteLinksRef.current.push(id)
        return true
      }
      
      // 如果操作失败，恢复UI
      setLinks(originalLinks);
      
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "未能删除链接，请稍后再试",
      })
      return false
    }
  }

  // Upload a file
  const uploadFile = async (
    file: globalThis.File
  ): Promise<{ id: string; url: string } | null> => {
    if (!user) return null

    // 生成临时ID和临时数据
    const tempId = `temp_${Date.now()}`;
    const now = new Date();

    // 为文件生成临时URL（用于预览）
    const tempUrl = URL.createObjectURL(file);

    // 服务器会自动生成缩略图，这里不需要客户端生成
    let thumbnail: string | undefined;

    // 创建临时文件对象用于UI显示
    const tempFile: File = {
      id: tempId,
      name: file.name,
      type: file.type,
      url: tempUrl,
      thumbnail: thumbnail,
      size: file.size,
      user_id: user.id,
      uploaded_at: now
    };

    // 存储原始文件列表，以便操作失败时恢复
    const originalFiles = [...files];

    // 立即更新UI
    setFiles((prev) => [tempFile, ...prev]);

    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      // 上传文件到服务器
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      console.log('开始上传文件到服务器:', file.name);

      const uploadResponse = await fetch('http://124.243.146.198:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('服务器响应状态:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('服务器错误响应:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();

      // 准备文件数据保存到数据库
      const fileData = {
        name: file.name,
        type: file.type,
        url: `http://124.243.146.198:3001${uploadResult.url}`, // 使用服务器返回的完整URL
        thumbnail: uploadResult.thumbnailUrl ? `http://124.243.146.198:3001${uploadResult.thumbnailUrl}` : undefined,
        size: file.size
      };

      // 保存文件信息到数据库
      const result = await createFileAction(user.id, fileData);

      // 将服务器结果转换为客户端文件
      const clientFile = mapDbFileToFile(result);

      // 更新内容时间戳
      lastContentUpdateRef.current = new Date();

      // 用实际ID更新UI中的临时文件
      setFiles((prev) => {
        const tempIndex = prev.findIndex((f) => f.id === tempId);
        if (tempIndex !== -1) {
          return [
            ...prev.slice(0, tempIndex),
            clientFile,
            ...prev.slice(tempIndex + 1),
          ];
        }
        return prev;
      });

      // 清理临时URL
      URL.revokeObjectURL(tempUrl);

      // 再次广播更新（现在有了真实ID）
      broadcastUpdate();

      return { id: clientFile.id, url: clientFile.url };
    } catch (error) {
      console.error("Failed to upload file", error);

      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingUploadFilesRef.current.push({
          tempId,
          file: tempFile
        });
        return { id: tempId, url: tempUrl };
      }

      // 如果操作失败，恢复UI
      setFiles(originalFiles);

      // 清理临时URL
      URL.revokeObjectURL(tempUrl);

      toast({
        variant: "destructive",
        title: "上传失败",
        description: error instanceof Error ? error.message : "未能上传文件，请稍后再试",
      });
      return null;
    }
  };

  // Delete a file
  const deleteFile = async (id: string): Promise<boolean> => {
    if (!user) return false

    // 存储原始文件列表，以便操作失败时恢复
    const originalFiles = [...files];
    
    // 立即更新UI
    setFiles((prev) => prev.filter((f) => f.id !== id))
    
    // 广播更新到其他标签页
    broadcastUpdate();

    try {
      // 后台处理服务器删除操作
      const numId = parseInt(id, 10)
      if (isNaN(numId)) {
        console.error("Invalid file ID:", id)
        throw new Error("无效的文件ID")
      }
      
      // 更新内容时间戳
      lastContentUpdateRef.current = new Date();
      
      // 异步删除服务器数据
      await deleteFileAction(numId, user.id)
      
      // 更新最后同步时间 - 保证时间计算钩子使用最新的服务器时间
      setLastSyncTime(new Date());
      lastSyncTimeRef.current = new Date();
      
      return true
    } catch (error) {
      console.error(`Failed to delete file ${id}`, error)
      
      // 如果是离线状态，加入待处理队列
      if (!navigator.onLine) {
        pendingDeleteFilesRef.current.push(id)
        return true
      }
      
      // 如果操作失败，恢复UI
      setFiles(originalFiles);
      
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "未能删除文件，请稍后再试",
      })
      return false
    }
  }

  return (
    <SyncContext.Provider
      value={{
        status: syncStatus,
        lastSync: lastSyncTime,
        notes,
        links,
        files,
        sync,
        saveNote,
        deleteNote,
        saveLink,
        deleteLink,
        uploadFile,
        deleteFile,
        isInitialized,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
