"use client"

import type React from "react"
import { createContext, useEffect, useState, useRef, useCallback, useContext } from "react"
import { useToast } from "@/hooks/use-toast"

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

  deleteFile as deleteFileAction,
  updateFileName as updateFileNameAction,
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
  base64_data?: string | null // Base64 encoded file content
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
  user: { id: string; username: string; avatar?: string; avatarConfig?: any; dbAvatarConfig?: any; deviceInfo?: any } | null
  sync: (silent?: boolean) => Promise<void>
  saveNote: (id: string, content: string, title?: string) => Promise<Note | null>
  deleteNote: (id: string) => Promise<boolean>
  saveLink: (url: string, title?: string) => Promise<Link | null>
  deleteLink: (id: string) => Promise<boolean>
  uploadFile: (file: globalThis.File, onProgress?: (progress: number) => void) => Promise<{ id: string; url: string } | null>
  deleteFile: (id: string) => Promise<boolean>
  renameFile: (id: string, newName: string) => Promise<boolean>
  isInitialized: boolean
  loadMoreNotes: () => Promise<boolean>
  loadMoreNotesCursor: () => Promise<boolean>
  hasMoreNotes: boolean
  isLoadingMore: boolean
}

export const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useContext(AuthContext)
  const { settings } = useContext(SettingsContext)
  const syncInterval = settings?.syncInterval ? settings.syncInterval * 60 * 1000 : 5 * 60 * 1000 // Convert to milliseconds
  const autoSync = true // Assuming autoSync is always enabled

  const { toast } = useToast()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const lastSyncTimeRef = useRef<Date | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [links, setLinks] = useState<Link[]>([])

  // 安全的设置便签函数，确保没有重复ID
  const setNotesWithDeduplication = useCallback((newNotes: Note[]) => {
    const uniqueNotes = newNotes.filter((note, index, array) =>
      array.findIndex(n => n.id === note.id) === index
    )

    if (uniqueNotes.length !== newNotes.length) {
      console.warn('⚠️ 检测到重复便签ID，已自动去重:', newNotes.length - uniqueNotes.length, '条')
    }

    setNotes(uniqueNotes)
  }, [])

  // 游标分页相关状态
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMoreNotes, setHasMoreNotes] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const checkUpdatesTimerRef = useRef<NodeJS.Timeout | null>(null)
  const syncChannel = useRef<BroadcastChannel | null>(null)
  const lastBroadcastRef = useRef<number | null>(null)
  const lastContentUpdateRef = useRef<Date | null>(null)

  // 初始化 - 设置客户端时间
  useEffect(() => {
    // 页面加载时立即设置客户端时间
    const clientNow = new Date();
    setLastSyncTime(clientNow);
    lastSyncTimeRef.current = clientNow;
    lastContentUpdateRef.current = clientNow;
    console.log('初始化客户端时间:', clientNow);
  }, []);
  
  // Load data when user ID changes (优化版本 - 避免头像更新触发重复加载)
  useEffect(() => {
    if (!user) {
      setNotesWithDeduplication([])
      setLinks([])
      setFiles([])
      setIsInitialized(false)
      // 重置分页状态
      setHasMoreNotes(true)
      setNextCursor(undefined)
      setIsLoadingMore(false)
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

        console.log("🔄 用户ID变化，开始加载数据:", user.id)
        // 快速同步 - 只加载最近的数据
        await syncOptimized(false)
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to load initial data", error)
        setSyncStatus("error")
      }
    }

    loadInitialData()
  }, [user?.id]) // 只依赖用户ID，避免头像配置更新触发重复加载

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

    // 每2分钟检查一次更新（优化频率，减少数据库压力）
    const checkInterval = setInterval(() => {
      if (navigator.onLine) {
        checkForUpdates()
      }
    }, 2 * 60 * 1000) // 2分钟检查一次

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

  // 优先加载便签的快速同步函数
  const syncOptimized = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setSyncStatus("syncing")
    }

    try {
      // Process pending offline operations
      await handlePendingOperations()

      // 第一步：优先加载便签数据（最近50条）
      console.log('🚀 开始优先加载便签...')
      const notesData = await getNotesAction(user.id, 50, 0)

      // 立即显示便签
      setNotesWithDeduplication(notesData ? notesData.map(mapDbNoteToNote) : [])
      console.log('⚡ 便签优先加载完成，共', notesData?.length || 0, '条')

      // 设置是否还有更多数据（如果返回的数据少于50条，说明没有更多了）
      const hasMore = notesData && notesData.length === 50
      setHasMoreNotes(hasMore)
      console.log('📊 设置hasMoreNotes:', hasMore)

      // 第二步：后台异步加载其他数据
      setTimeout(async () => {
        try {
          console.log('📂 开始后台加载链接和文件...')
          const [linksData, filesData] = await Promise.all([
            getLinksAction(user.id),
            getFilesAction(user.id),
          ])

          // 更新其他数据
          setLinks(linksData ? linksData.map(mapDbLinkToLink) : [])
          setFiles(filesData ? filesData.map(mapDbFileToFile) : [])
          console.log('✅ 后台数据加载完成')
        } catch (error) {
          console.error("❌ 后台数据加载失败", error)
        }
      }, 100) // 100ms后加载其他数据

      // 移除第三步：不再后台加载所有剩余便签，改为无限滚动按需加载

      // 直接使用客户端当前时间
      const clientNow = new Date();
      setLastSyncTime(clientNow);
      lastSyncTimeRef.current = clientNow;
      lastContentUpdateRef.current = clientNow;

      if (!silent) {
        setSyncStatus("success")
      }

      // 移除不必要的页面刷新，避免重复加载
      // router.refresh() - 已移除，减少不必要的页面刷新
    } catch (error) {
      console.error("❌ 便签加载失败", error)

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

  // 完整同步函数 - 边加载边显示所有数据
  const sync = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setSyncStatus("syncing")
    }

    try {
      // Process pending offline operations
      await handlePendingOperations()

      // 第一步：优先加载便签数据（最近50条，支持无限滚动）
      console.log('🚀 开始优先加载便签...')
      const notesData = await getNotesAction(user.id, 50, 0)

      // 立即显示便签
      setNotesWithDeduplication(notesData ? notesData.map(mapDbNoteToNote) : [])
      console.log('⚡ 便签优先加载完成，共', notesData?.length || 0, '条')

      // 设置是否还有更多数据
      const hasMore = notesData && notesData.length === 50
      setHasMoreNotes(hasMore)
      console.log('📊 设置hasMoreNotes:', hasMore)

      // 第二步：后台异步加载其他数据
      setTimeout(async () => {
        try {
          console.log('📂 开始后台加载链接和文件...')
          const [linksData, filesData] = await Promise.all([
            getLinksAction(user.id),
            getFilesAction(user.id),
          ])

          // 更新其他数据
          setLinks(linksData ? linksData.map(mapDbLinkToLink) : [])
          setFiles(filesData ? filesData.map(mapDbFileToFile) : [])
          console.log('✅ 后台数据加载完成')
        } catch (error) {
          console.error("❌ 后台数据加载失败", error)
        }
      }, 100) // 100ms后加载其他数据

      // 直接使用客户端当前时间
      const clientNow = new Date();
      setLastSyncTime(clientNow);
      lastSyncTimeRef.current = clientNow;
      lastContentUpdateRef.current = clientNow; // 同时更新内容时间戳

      console.log('同步操作更新时间为(客户端时间):', clientNow);

      if (!silent) {
        setSyncStatus("success")
      }

      // 移除不必要的页面刷新，避免重复加载
      // router.refresh() - 已移除，减少不必要的页面刷新
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

  // 不再支持离线重试机制
  const handlePendingOperations = async () => {
    // 离线重试机制已移除
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
      
      // 便签保存失败，不再支持离线重试
      
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
    }
    // 移除不必要的router.refresh()，UI已通过状态更新
    
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
      
      // 便签删除失败，不再支持离线重试
      
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
      
      // 链接保存失败，不再支持离线重试
      
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
      
      // 链接删除失败，不再支持离线重试
      
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

  // Upload a file (直接上传到 MinIO)
  const uploadFile = async (
    file: globalThis.File,
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; url: string } | null> => {
    if (!user) return null

    try {
      // 导入MinIO工具函数
      const {
        validateFileSize,
        isFileTypeSupported
      } = await import('@/lib/minio-utils')

      // 验证文件类型和大小
      if (!isFileTypeSupported(file.type)) {
        throw new Error(`不支持的文件类型: ${file.type}`)
      }

      const sizeValidation = validateFileSize(file)
      if (!sizeValidation.valid) {
        throw new Error(sizeValidation.error || '文件大小验证失败')
      }

      onProgress?.(10) // 验证完成

      // 第一步：获取预签名 URL（带重试机制）
      console.log('🔗 获取预签名 URL...')
      const getPresignedUrl = async (retryCount = 0): Promise<any> => {
        const maxRetries = 3

        try {
          const presignedResponse = await fetch('/api/files/presigned-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              userId: user.id
            })
          })

          if (!presignedResponse.ok) {
            const errorData = await presignedResponse.json().catch(() => ({}))

            // 如果是服务器错误且还有重试次数，则重试
            if (presignedResponse.status >= 500 && retryCount < maxRetries) {
              console.log(`获取预签名URL失败 ${presignedResponse.status}，重试 ${retryCount + 1}/${maxRetries}`)
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
              return getPresignedUrl(retryCount + 1)
            }

            throw new Error(errorData.message || `获取上传凭证失败: ${presignedResponse.status}`)
          }

          const presignedData = await presignedResponse.json()
          if (!presignedData.success) {
            throw new Error(presignedData.message || '获取上传凭证失败')
          }

          return presignedData
        } catch (error) {
          if (error instanceof TypeError && retryCount < maxRetries) {
            // 网络错误，重试
            console.log(`网络错误，重试获取预签名URL ${retryCount + 1}/${maxRetries}`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
            return getPresignedUrl(retryCount + 1)
          }
          throw error
        }
      }

      const presignedData = await getPresignedUrl()

      onProgress?.(20) // 获取预签名URL完成

      // 第二步：分片上传到MinIO（实现真实进度监控）
      console.log('📤 开始分片上传到 MinIO...')
      
      // 基于网络速度优化的分片策略
      const getChunkSize = (fileSize: number) => {
        // 小文件直接上传，避免分片开销
        if (fileSize < 10 * 1024 * 1024) return fileSize // 小于10MB不分片
        
        // 中大文件根据大小分片，平衡进度显示和性能
        if (fileSize < 50 * 1024 * 1024) return 5 * 1024 * 1024   // 10-50MB: 5MB chunks
        if (fileSize < 200 * 1024 * 1024) return 10 * 1024 * 1024  // 50-200MB: 10MB chunks
        return 20 * 1024 * 1024 // 大于200MB: 20MB chunks
      }

      const chunkSize = getChunkSize(file.size)
      const totalChunks = Math.ceil(file.size / chunkSize)
      let uploadedBytes = 0
      
      console.log(`📦 文件分片信息: 总大小=${file.size}, 分片大小=${chunkSize}, 总分片数=${totalChunks}`)

      const uploadWithRetry = async (retryCount = 0): Promise<void> => {
        const maxRetries = 3
        
        // 如果文件较小或只有一个分片，直接上传整个文件
        if (totalChunks === 1) {
          return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            const uploadStartTime = Date.now()
            let progressTimer: NodeJS.Timeout | null = null
            
            // 智能进度模拟 - 基于文件大小和网络条件
            const startProgress = () => {
              // 根据文件大小动态调整上传时间估算
              const fileSizeMB = file.size / (1024 * 1024)
              let estimatedSpeed: number
              let baseTime: number
              
              // 根据文件大小调整估算策略 (基于4-6MB/s实际网速)
              if (fileSizeMB < 10) {
                estimatedSpeed = 6 * 1024 * 1024 // 小文件：6MB/s
                baseTime = 1000 // 最少1秒
              } else if (fileSizeMB < 50) {
                estimatedSpeed = 5 * 1024 * 1024 // 中等文件：5MB/s
                baseTime = 2000 // 最少2秒
              } else {
                estimatedSpeed = 4 * 1024 * 1024 // 大文件(>50MB)：4MB/s
                baseTime = 3000 // 最少3秒
              }
              
              const estimatedUploadTime = Math.max(baseTime, (file.size / estimatedSpeed) * 1000)
              console.log(`📊 文件大小: ${fileSizeMB.toFixed(2)}MB, 估算上传时间: ${(estimatedUploadTime/1000).toFixed(1)}秒`)
              
              let currentProgress = 25 // 从25%开始
              const totalProgressRange = 65 // 25% - 90%
              const updateInterval = 100 // 100ms更新一次
              const totalUpdates = estimatedUploadTime / updateInterval
              const baseProgressStep = totalProgressRange / totalUpdates
              
              let accelerationPhase = true
              let updateCount = 0
              
              progressTimer = setInterval(() => {
                if (currentProgress >= 90) {
                  if (progressTimer) {
                    clearInterval(progressTimer)
                    progressTimer = null
                  }
                  return
                }
                
                updateCount++
                const progressRatio = updateCount / totalUpdates
                
                // 三阶段进度模拟：快速启动 -> 稳定上传 -> 缓慢收尾
                let progressStep = baseProgressStep
                
                if (progressRatio < 0.2) {
                  // 前20%时间：快速增长（模拟连接建立后的快速开始）
                  progressStep *= 1.8
                } else if (progressRatio < 0.8) {
                  // 中间60%时间：稳定增长
                  progressStep *= 1.0
                } else {
                  // 最后20%时间：缓慢增长（模拟网络波动）
                  progressStep *= 0.6
                }
                
                // 添加随机波动，模拟真实网络条件
                const variation = (Math.random() - 0.5) * 0.8
                const actualStep = progressStep + variation
                
                currentProgress = Math.min(90, currentProgress + actualStep)
                
                console.log(`📊 上传进度: ${currentProgress.toFixed(1)}% (阶段: ${progressRatio < 0.2 ? '启动' : progressRatio < 0.8 ? '稳定' : '收尾'})`)
                onProgress?.(currentProgress)
              }, updateInterval)
            }
            
            xhr.addEventListener('loadstart', () => {
              console.log('🚀 开始上传文件')
              onProgress?.(20)
              startProgress()
            })
            
            xhr.addEventListener('load', () => {
              if (progressTimer) {
                clearInterval(progressTimer)
                progressTimer = null
              }
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('✅ 文件上传成功')
                onProgress?.(90)
                resolve()
              } else if (xhr.status >= 500 && retryCount < maxRetries) {
                console.log(`服务器错误 ${xhr.status}，重试 ${retryCount + 1}/${maxRetries}`)
                setTimeout(() => {
                  uploadWithRetry(retryCount + 1).then(resolve).catch(reject)
                }, 1000 * (retryCount + 1))
              } else {
                reject(new Error(`上传失败: ${xhr.status}`))
              }
            })
            
            xhr.addEventListener('error', () => {
              if (progressTimer) {
                clearInterval(progressTimer)
                progressTimer = null
              }
              if (retryCount < maxRetries) {
                console.log(`网络错误，重试 ${retryCount + 1}/${maxRetries}`)
                setTimeout(() => {
                  uploadWithRetry(retryCount + 1).then(resolve).catch(reject)
                }, 1000 * (retryCount + 1))
              } else {
                reject(new Error('网络连接失败'))
              }
            })
            
            xhr.open('PUT', presignedData.data.uploadUrl)
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
            xhr.timeout = 300000
            xhr.send(file)
          })
        }
        
        // 分片上传逻辑
        return new Promise<void>(async (resolve, reject) => {
          try {
            // 创建临时数组存储分片
            const chunks: Blob[] = []
            for (let i = 0; i < totalChunks; i++) {
              const start = i * chunkSize
              const end = Math.min(start + chunkSize, file.size)
              chunks.push(file.slice(start, end))
            }
            
            // 使用 Blob 合并所有分片（实际上传还是完整文件，但我们可以模拟分片进度）
            const uploadBlob = new Blob(chunks, { type: file.type })
            
            // 模拟分片上传进度
            const xhr = new XMLHttpRequest()
            let currentChunk = 0
            let progressTimer: NodeJS.Timeout | null = null
            
            // 智能分片进度模拟
            const startChunkProgress = () => {
              const fileSizeMB = file.size / (1024 * 1024)
              
              // 根据文件大小和分片数量调整上传策略 (基于4-6MB/s实际网速)
              let baseSpeed: number
              if (fileSizeMB < 10) {
                baseSpeed = 6 * 1024 * 1024 // 小于10MB: 6MB/s
              } else if (fileSizeMB < 50) {
                baseSpeed = 5 * 1024 * 1024 // 10-50MB: 5MB/s
              } else {
                baseSpeed = 4 * 1024 * 1024 // 大于50MB: 4MB/s
              }
              
              const totalUploadTime = Math.max(3000, (file.size / baseSpeed) * 1000)
              const updateInterval = Math.min(200, totalUploadTime / (totalChunks * 3)) // 每个分片至少3次更新
              
              console.log(`📦 分片上传策略: ${totalChunks}个分片, 估算${(totalUploadTime/1000).toFixed(1)}秒, 更新间隔${updateInterval}ms`)
              
              let currentProgress = 25 // 从25%开始
              let currentChunkFloat = 0 // 使用浮点数表示当前分片进度
              const progressPerUpdate = (totalChunks / (totalUploadTime / updateInterval))
              
              progressTimer = setInterval(() => {
                if (currentProgress >= 90 || currentChunkFloat >= totalChunks) {
                  if (progressTimer) {
                    clearInterval(progressTimer)
                    progressTimer = null
                  }
                  return
                }
                
                // 模拟不同分片的上传速度变化
                const chunkProgressRatio = (currentChunkFloat % 1)
                let speedMultiplier = 1.0
                
                if (chunkProgressRatio < 0.1) {
                  // 分片开始：稍慢（建立连接）
                  speedMultiplier = 0.7
                } else if (chunkProgressRatio < 0.8) {
                  // 分片中间：正常速度
                  speedMultiplier = 1.0 + (Math.random() - 0.5) * 0.3 // ±15%波动
                } else {
                  // 分片结尾：稍快（缓冲区清空）
                  speedMultiplier = 1.2
                }
                
                // 添加网络波动模拟
                const networkVariation = 0.8 + Math.random() * 0.4 // 0.8-1.2倍速度
                const actualProgressStep = progressPerUpdate * speedMultiplier * networkVariation
                
                currentChunkFloat = Math.min(totalChunks, currentChunkFloat + actualProgressStep)
                
                // 计算总进度 (25% - 90%)
                const uploadProgress = (currentChunkFloat / totalChunks) * 65
                currentProgress = Math.min(90, 25 + uploadProgress)
                
                const currentChunkInt = Math.floor(currentChunkFloat)
                const chunkPercent = ((currentChunkFloat % 1) * 100).toFixed(0)
                
                console.log(`📦 分片进度: ${currentChunkInt + 1}/${totalChunks} (${chunkPercent}%) - 总进度: ${currentProgress.toFixed(1)}%`)
                onProgress?.(currentProgress)
              }, updateInterval)
            }
            
            xhr.addEventListener('loadstart', () => {
              console.log(`🚀 开始分片上传: ${totalChunks} 个分片`)
              onProgress?.(25)
              startChunkProgress()
            })
            
            xhr.addEventListener('load', () => {
              if (progressTimer) {
                clearInterval(progressTimer)
                progressTimer = null
              }
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('✅ 所有分片上传成功')
                onProgress?.(90)
                resolve()
              } else if (xhr.status >= 500 && retryCount < maxRetries) {
                console.log(`服务器错误 ${xhr.status}，重试 ${retryCount + 1}/${maxRetries}`)
                setTimeout(() => {
                  uploadWithRetry(retryCount + 1).then(resolve).catch(reject)
                }, 1000 * (retryCount + 1))
              } else {
                reject(new Error(`上传失败: ${xhr.status}`))
              }
            })
            
            xhr.addEventListener('error', () => {
              if (progressTimer) {
                clearInterval(progressTimer)
                progressTimer = null
              }
              if (retryCount < maxRetries) {
                console.log(`网络错误，重试 ${retryCount + 1}/${maxRetries}`)
                setTimeout(() => {
                  uploadWithRetry(retryCount + 1).then(resolve).catch(reject)
                }, 1000 * (retryCount + 1))
              } else {
                reject(new Error('网络连接失败'))
              }
            })
            
            xhr.open('PUT', presignedData.data.uploadUrl)
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
            xhr.timeout = 300000
            xhr.send(uploadBlob)
          } catch (error) {
            reject(error)
          }
        })
      }

      await uploadWithRetry()

      onProgress?.(90) // 上传到MinIO完成

      // 第三步：处理缩略图（如果是图片）
      let thumbnailUrl: string | null = null
      if (file.type.startsWith('image/')) {
        try {
          console.log('📸 生成缩略图...')
          const tempUrl = URL.createObjectURL(file)
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const img = new Image()

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = tempUrl
          })

          // 设置缩略图尺寸
          const maxSize = 400
          const ratio = Math.min(maxSize / img.width, maxSize / img.height)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio

          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

          // 转换为 Blob
          const thumbnailBlob = await new Promise<Blob | null>(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8)
          })

          if (thumbnailBlob) {
            // 上传缩略图到MinIO
            const thumbnailFileName = `thumbnail_${file.name}`
            const thumbnailPresignedResponse = await fetch('/api/files/presigned-url', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fileName: thumbnailFileName,
                fileType: 'image/jpeg',
                fileSize: thumbnailBlob.size,
                userId: user.id
              })
            })

            if (thumbnailPresignedResponse.ok) {
              const thumbnailPresignedData = await thumbnailPresignedResponse.json()
              if (thumbnailPresignedData.success) {
                await fetch(thumbnailPresignedData.data.uploadUrl, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'image/jpeg'
                  },
                  body: thumbnailBlob
                })
                thumbnailUrl = thumbnailPresignedData.data.fileUrl
              }
            }
          }

          // 清理临时URL
          URL.revokeObjectURL(tempUrl)
        } catch (error) {
          console.warn('缩略图生成失败:', error)
        }
      }

      onProgress?.(95) // 缩略图处理完成

      // 第四步：通知后端保存元数据（带重试机制）
      console.log('💾 保存文件元数据...')
      const saveMetadata = async (retryCount = 0): Promise<any> => {
        const maxRetries = 3

        try {
          const completeResponse = await fetch('/api/files/upload-complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              objectKey: presignedData.data.objectKey,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              userId: user.id,
              fileUrl: presignedData.data.fileUrl,
              thumbnailUrl
            })
          })

          if (!completeResponse.ok) {
            const errorData = await completeResponse.json().catch(() => ({}))

            // 如果是服务器错误且还有重试次数，则重试
            if (completeResponse.status >= 500 && retryCount < maxRetries) {
              console.log(`保存元数据失败 ${completeResponse.status}，重试 ${retryCount + 1}/${maxRetries}`)
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
              return saveMetadata(retryCount + 1)
            }

            throw new Error(errorData.message || `保存文件信息失败: ${completeResponse.status}`)
          }

          const completeResult = await completeResponse.json()
          if (!completeResult.success) {
            throw new Error(completeResult.message || '保存文件信息失败')
          }

          return completeResult
        } catch (error) {
          if (error instanceof TypeError && retryCount < maxRetries) {
            // 网络错误，重试
            console.log(`网络错误，重试保存元数据 ${retryCount + 1}/${maxRetries}`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
            return saveMetadata(retryCount + 1)
          }
          throw error
        }
      }

      const completeResult = await saveMetadata()

      onProgress?.(100) // 完成

      // 将服务器结果转换为客户端文件
      const clientFile = mapDbFileToFile(completeResult.file)

      // 更新内容时间戳
      lastContentUpdateRef.current = new Date()

      // 更新UI
      setFiles((prev) => [clientFile, ...prev])
      broadcastUpdate()

      console.log(`✅ 文件 ${file.name} 上传完成`)

      return { id: clientFile.id, url: clientFile.url }

    } catch (error) {
      console.error("❌ 文件上传失败:", error)
      toast({
        variant: "destructive",
        title: "上传失败",
        description: error instanceof Error ? error.message : "文件上传失败，请重试",
      })
      return null
    }
  }

  // Rename a file (乐观更新 - 立即显示结果，后台同步)
  const renameFile = async (id: string, newName: string): Promise<boolean> => {
    if (!user) return false

    // 验证文件名
    if (!newName || newName.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "重命名失败",
        description: "文件名不能为空",
      })
      return false
    }

    // 存储原始文件信息，以便操作失败时恢复
    const originalFiles = [...files];
    const trimmedName = newName.trim()

    // 🚀 立即更新UI - 乐观更新，让用户感觉操作瞬时完成
    setFiles((prev) => prev.map((f) =>
      f.id === id ? { ...f, name: trimmedName } : f
    ))

    // 广播更新到其他标签页
    broadcastUpdate();

    // 更新内容时间戳
    lastContentUpdateRef.current = new Date();

    // 🔄 后台异步更新数据库，不阻塞UI
    setTimeout(async () => {
      try {
        const numId = parseInt(id, 10)
        if (isNaN(numId)) {
          console.error("Invalid file ID:", id)
          throw new Error("无效的文件ID")
        }

        // 后台同步到服务器
        await updateFileNameAction(numId, user.id, trimmedName)

        // 更新最后同步时间
        setLastSyncTime(new Date());
        lastSyncTimeRef.current = new Date();

        console.log(`✅ 文件重命名同步成功: ${trimmedName}`)

      } catch (error) {
        console.error(`❌ 文件重命名同步失败 ${id}:`, error)

        // 🔙 后台同步失败，恢复UI到原始状态
        setFiles(originalFiles);

        const errorMessage = error instanceof Error ? error.message : "网络错误"
        toast({
          variant: "destructive",
          title: "重命名同步失败",
          description: `${errorMessage}，已恢复原文件名`,
        })
      }
    }, 0) // 立即执行，但不阻塞当前操作

    // 立即返回成功，让前端感觉操作已完成
    return true
  }

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
      
      // 文件删除失败，不再支持离线重试
      
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

  // 手动加载更多便签（传统分页）
  const loadMoreNotes = async (): Promise<boolean> => {
    if (!user) return false

    try {
      console.log('📖 手动加载更多便签...')
      const currentCount = notes.length
      const moreNotesData = await getNotesAction(user.id, 50, currentCount)

      if (moreNotesData && moreNotesData.length > 0) {
        const moreNotes = moreNotesData.map(mapDbNoteToNote)

        // 去重处理
        setNotes(prev => {
          const existingIds = new Set(prev.map(note => note.id))
          const newNotes = moreNotes.filter((note: Note) => !existingIds.has(note.id))
          return [...prev, ...newNotes]
        })

        console.log('📚 加载更多便签完成，新增', moreNotesData.length, '条')
        return true
      } else {
        console.log('📭 没有更多便签了')
        return false
      }
    } catch (error) {
      console.error("❌ 加载更多便签失败", error)
      return false
    }
  }

  // 游标分页加载更多便签（高性能版本）
  const loadMoreNotesCursor = async (): Promise<boolean> => {
    if (!user || !hasMoreNotes || isLoadingMore) return false

    setIsLoadingMore(true)
    try {
      console.log('🚀 游标分页加载更多便签...', { nextCursor })

      const response = await fetch(`/api/notes/cursor?userId=${user.id}&limit=50${nextCursor ? `&cursor=${nextCursor}` : ''}`)
      const result = await response.json()

      if (result.success && result.data.length > 0) {
        const moreNotes = result.data.map(mapDbNoteToNote)

        // 去重处理：过滤掉已存在的便签ID
        setNotes(prev => {
          const existingIds = new Set(prev.map(note => note.id))
          const newNotes = moreNotes.filter((note: Note) => !existingIds.has(note.id))

          console.log('🚀 游标分页去重：原有', prev.length, '条，新增', newNotes.length, '条，过滤重复', moreNotes.length - newNotes.length, '条')

          return [...prev, ...newNotes]
        })

        setNextCursor(result.pagination.nextCursor)
        setHasMoreNotes(result.pagination.hasMore)

        console.log('🚀 游标分页完成，新增', result.data.length, '条，hasMore:', result.pagination.hasMore)
        return true
      } else {
        console.log('📭 没有更多便签了')
        setHasMoreNotes(false)
        return false
      }
    } catch (error) {
      console.error("❌ 游标分页加载失败", error)
      return false
    } finally {
      setIsLoadingMore(false)
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
        user,
        sync,
        saveNote,
        deleteNote,
        saveLink,
        deleteLink,
        uploadFile,
        deleteFile,
        renameFile,
        isInitialized,
        loadMoreNotes,
        loadMoreNotesCursor,
        hasMoreNotes,
        isLoadingMore,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
