"use client"

import type React from "react"

import { createContext, useEffect, useState, useCallback, useRef } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getUserSettings, updateUserSettings } from "@/app/actions/db-actions"

export type FontFamily =
  | "sans"
  | "serif"
  | "mono"
  | "roboto"
  | "lora"
  | "nunito"
  | "roboto-mono"
  | "ma-shan-zheng"
  | "zcool-xiaowei"
  | "zcool-qingke-huangyou"
export type FontSize = "small" | "medium" | "large" | "x-large"
export type SyncInterval = 5 | 10 | 30 | 60 | 300 | 600

export interface Settings {
  fontFamily: FontFamily
  fontSize: FontSize
  syncInterval: SyncInterval
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
  resetSettings: () => void
  applyFontSettings: () => void
  isSyncing: boolean
  lastSyncTime: Date | null
  syncError: string | null
  syncSettings: () => Promise<boolean>
}

const defaultSettings: Settings = {
  fontFamily: "zcool-xiaowei",
  fontSize: "medium",
  syncInterval: 5,
}

export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
  applyFontSettings: () => {},
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  syncSettings: async () => false,
})

// 重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2秒

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const { setTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const prevUserRef = useRef<typeof user>(null)
  const syncInProgressRef = useRef<boolean>(false)
  const retryCountRef = useRef<number>(0)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 客户端渲染检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 添加认证状态监听，确保组件能获取到最新的登录状态
  useEffect(() => {
    if (!isClient) return
    
    // 打印当前认证状态，用于调试
    console.log("SettingsProvider 中的认证状态:", {
      isLoggedIn: !!user,
      userId: user?.id,
      username: user?.username
    })
    
    // 监听存储变化，可能来自其他标签页的登录/登出操作
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userData' || event.key === 'authToken') {
        console.log("检测到存储变化 - 用户数据可能已更新")
        // 可以在这里添加刷新逻辑，比如强制页面刷新
        // window.location.reload()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isClient, user])

  // 从本地存储加载设置（作为默认值或离线备份）
  const loadLocalSettings = useCallback(() => {
    if (!isClient) return null
    
    console.log("尝试从本地存储加载设置...")
    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        console.log("从本地存储成功加载设置:", parsedSettings)
        return parsedSettings
      } catch (error) {
        console.error("加载本地设置失败:", error)
        return null
      }
    }
    console.log("本地存储中没有设置，将使用默认设置")
    return null
  }, [isClient])

  // 保存设置到本地存储
  const saveLocalSettings = useCallback((settingsToSave: Settings) => {
    if (!isClient) return
    
    try {
      localStorage.setItem("appSettings", JSON.stringify(settingsToSave))
      console.log("设置已保存到本地存储")
    } catch (error) {
      console.error("保存本地设置失败:", error)
    }
  }, [isClient])

  // 从服务器加载设置（添加重试机制）
  const loadServerSettings = useCallback(async (retryCount = 0) => {
    if (!user) {
      console.log("用户未登录，无法从服务器加载设置")
      return null
    }
    
    if (syncInProgressRef.current) {
      console.log("已有同步进行中，跳过本次操作")
      return null
    }
    
    syncInProgressRef.current = true
    setIsSyncing(true)
    setSyncError(null)
    
    try {
      console.log(`尝试从服务器加载设置 (尝试 ${retryCount + 1}/${MAX_RETRIES + 1})...`)
      const serverSettings = await getUserSettings(user.id)
      
      if (serverSettings) {
        console.log("从服务器成功加载设置:", serverSettings)
        setLastSyncTime(new Date())
        retryCountRef.current = 0
        
        // 将服务器设置格式转换为客户端设置格式
        return {
          fontFamily: serverSettings.font_family as FontFamily,
          fontSize: serverSettings.font_size as FontSize,
          syncInterval: serverSettings.sync_interval as SyncInterval,
        }
      } else {
        console.log("服务器上没有找到设置")
        return null
      }
    } catch (error) {
      console.error("加载服务器设置失败:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setSyncError(errorMessage)
      
      // 实现重试机制
      if (retryCount < MAX_RETRIES) {
        console.log(`将在 ${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`)
        
        // 清除之前的重试计时器（如果有）
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current)
        }
        
        // 设置新的重试计时器
        return new Promise<Settings | null>((resolve) => {
          retryTimerRef.current = setTimeout(async () => {
            const result = await loadServerSettings(retryCount + 1)
            resolve(result)
          }, RETRY_DELAY)
        })
      }
      
      toast({
        title: "设置同步失败",
        description: "无法从服务器加载设置，将使用本地设置",
        variant: "destructive",
      })
      return null
    } finally {
      syncInProgressRef.current = false
      setIsSyncing(false)
    }
  }, [user, toast])

  // 保存设置到服务器（添加重试机制）
  const saveServerSettings = useCallback(async (settingsToSave: Settings, retryCount = 0) => {
    if (!user) {
      console.log("用户未登录，无法保存设置到服务器")
      return false
    }
    
    if (syncInProgressRef.current) {
      console.log("已有同步进行中，跳过本次操作")
      return false
    }
    
    syncInProgressRef.current = true
    setIsSyncing(true)
    setSyncError(null)
    
    try {
      console.log(`尝试保存设置到服务器 (尝试 ${retryCount + 1}/${MAX_RETRIES + 1})...`, settingsToSave)
      await updateUserSettings(user.id, {
        font_family: settingsToSave.fontFamily,
        font_size: settingsToSave.fontSize,
        sync_interval: settingsToSave.syncInterval,
      })
      
      console.log("设置已成功保存到服务器")
      setLastSyncTime(new Date())
      retryCountRef.current = 0
      return true
    } catch (error) {
      console.error("保存服务器设置失败:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setSyncError(errorMessage)
      
      // 实现重试机制
      if (retryCount < MAX_RETRIES) {
        console.log(`将在 ${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRIES})`)
        
        // 清除之前的重试计时器（如果有）
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current)
        }
        
        // 设置新的重试计时器
        return new Promise<boolean>((resolve) => {
          retryTimerRef.current = setTimeout(async () => {
            const result = await saveServerSettings(settingsToSave, retryCount + 1)
            resolve(result)
          }, RETRY_DELAY)
        })
      }
      
      toast({
        title: "设置同步失败",
        description: "无法将设置保存到服务器，但已保存在本地",
        variant: "destructive",
      })
      return false
    } finally {
      syncInProgressRef.current = false
      setIsSyncing(false)
    }
  }, [user, toast])

  // 初始化设置 - 优先从本地加载，然后在用户登录时尝试从服务器加载
  useEffect(() => {
    if (!isClient) return

    const initializeSettings = async () => {
      console.log("初始化设置...")
      // 先从本地加载
      const localSettings = loadLocalSettings()

      // 如果有本地设置，先使用它们
      if (localSettings) {
        console.log("使用本地设置初始化")
        setSettings(localSettings)
      } else {
        // 如果没有本地设置，保存默认设置
        console.log("没有本地设置，使用默认设置")
        saveLocalSettings(defaultSettings)
      }

      // 标记初始化完成
      setIsInitialized(true)
    }

    initializeSettings()
  }, [isClient, loadLocalSettings, saveLocalSettings])

  // 监听用户状态变化，在用户登录或变化时同步设置
  useEffect(() => {
    if (!isClient) return
    
    const syncOnUserChange = async () => {
      // 检查用户是否变化
      const userChanged = prevUserRef.current?.id !== user?.id
      prevUserRef.current = user
      
      // 如果用户刚登录或用户变化
      if (user && userChanged) {
        console.log("用户状态变化，尝试同步设置...")
        const serverSettings = await loadServerSettings()
        
        if (serverSettings) {
          // 使用服务器设置覆盖本地设置
          console.log("使用服务器设置覆盖本地设置")
          setSettings(serverSettings)
          // 更新本地存储以匹配服务器
          saveLocalSettings(serverSettings)
        } else {
          // 如果无法从服务器加载但有本地设置，将本地设置同步到服务器
          console.log("服务器无设置，尝试上传本地设置")
          saveServerSettings(settings)
        }
      }
    }

    syncOnUserChange()
  }, [isClient, user, loadServerSettings, saveServerSettings, saveLocalSettings, settings])

  // 当设置变化时应用字体设置（但不在初始化时）
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (isClient && isInitialized) {
      applyFontSettings()
    }
  }, [settings, isClient, isInitialized])
  
  // 手动同步函数 - 可在设置对话框中调用
  const syncSettings = useCallback(async () => {
    if (!user) {
      toast({
        title: "同步失败",
        description: "您需要登录才能同步设置",
        variant: "destructive",
      })
      return false
    }
    
    // 额外检查，确认用户ID存在
    if (!user.id) {
      toast({
        title: "同步失败",
        description: "用户信息不完整，请尝试重新登录",
        variant: "destructive",
      })
      return false
    }
    
    try {
      setIsSyncing(true)
      
      // 先尝试从服务器获取最新设置
      const serverSettings = await loadServerSettings()
      
      if (serverSettings) {
        // 如果服务器有设置，使用服务器设置
        setSettings(serverSettings)
        saveLocalSettings(serverSettings)
        toast({
          title: "同步成功",
          description: "已从服务器获取最新设置",
        })
        return true
      } else {
        // 如果服务器没有设置，上传本地设置
        const success = await saveServerSettings(settings)
        
        if (success) {
          toast({
            title: "同步成功",
            description: "已将您的设置保存到服务器",
          })
          return true
        } else {
          toast({
            title: "同步失败",
            description: "无法将设置保存到服务器",
            variant: "destructive",
          })
          return false
        }
      }
    } catch (error) {
      console.error("手动同步失败:", error)
      toast({
        title: "同步失败",
        description: "发生未知错误",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [user, settings, loadServerSettings, saveServerSettings, saveLocalSettings, toast])
  
  // 修改 updateSettings 函数，确保设置同步到服务器和本地
  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    
    // 先更新本地状态和存储
    setSettings(updatedSettings)
    saveLocalSettings(updatedSettings)
    console.log("设置已更新并保存到本地:", updatedSettings)
    
    // 如果用户已登录，同步到服务器
    if (user) {
      console.log("用户已登录，同步设置到服务器")
      saveServerSettings(updatedSettings)
    }
  }, [settings, user, saveLocalSettings, saveServerSettings])

  const resetSettings = useCallback(async () => {
    console.log("重置设置为默认值")
    setSettings(defaultSettings)
    saveLocalSettings(defaultSettings)
    
    // 如果用户已登录，同步重置的设置到服务器
    if (user) {
      console.log("用户已登录，同步重置后的设置到服务器")
      saveServerSettings(defaultSettings)
    }
  }, [user, saveLocalSettings, saveServerSettings])

  // 简化的字体设置应用函数 - 只更新 data 属性
  const applyFontSettings = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    if (process.env.NODE_ENV === "development") {
      console.log("应用字体设置:", settings.fontFamily, settings.fontSize)
    }

    // 更新 :root 元素的 data 属性，CSS 会自动响应
    document.documentElement.setAttribute('data-font-family', settings.fontFamily)
    document.documentElement.setAttribute('data-font-size', settings.fontSize)
  }, [settings.fontFamily, settings.fontSize])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        applyFontSettings,
        isSyncing,
        lastSyncTime,
        syncError,
        syncSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
