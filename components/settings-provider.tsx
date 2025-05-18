"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
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
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const { setTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // 客户端渲染检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 从本地存储加载设置（作为默认值或离线备份）
  const loadLocalSettings = () => {
    if (!isClient) return null
    
    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings)
      } catch (error) {
        console.error("加载本地设置失败:", error)
        return null
      }
    }
    return null
  }

  // 保存设置到本地存储
  const saveLocalSettings = (settingsToSave: Settings) => {
    if (!isClient) return
    
    try {
      localStorage.setItem("appSettings", JSON.stringify(settingsToSave))
    } catch (error) {
      console.error("保存本地设置失败:", error)
    }
  }

  // 从服务器加载设置
  const loadServerSettings = async () => {
    if (!user) return null
    
    setIsSyncing(true)
    try {
      const serverSettings = await getUserSettings(user.id)
      setLastSyncTime(new Date())
      
      if (serverSettings) {
        // 将服务器设置格式转换为客户端设置格式
        return {
          fontFamily: serverSettings.font_family as FontFamily,
          fontSize: serverSettings.font_size as FontSize,
          syncInterval: serverSettings.sync_interval as SyncInterval,
        }
      }
      return null
    } catch (error) {
      console.error("加载服务器设置失败:", error)
      toast({
        title: "设置同步失败",
        description: "无法从服务器加载设置，将使用本地设置",
        variant: "destructive",
      })
      return null
    } finally {
      setIsSyncing(false)
    }
  }

  // 保存设置到服务器
  const saveServerSettings = async (settingsToSave: Settings) => {
    if (!user) return false
    
    setIsSyncing(true)
    try {
      await updateUserSettings(user.id, {
        font_family: settingsToSave.fontFamily,
        font_size: settingsToSave.fontSize,
        sync_interval: settingsToSave.syncInterval,
      })
      setLastSyncTime(new Date())
      return true
    } catch (error) {
      console.error("保存服务器设置失败:", error)
      toast({
        title: "设置同步失败",
        description: "无法将设置保存到服务器，但已保存在本地",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSyncing(false)
    }
  }

  // 初始化设置 - 优先从服务器加载，如果失败则从本地加载
  useEffect(() => {
    if (!isClient) return

    const initializeSettings = async () => {
      // 先从本地加载
      const localSettings = loadLocalSettings()
      
      // 如果有本地设置，先使用它们
      if (localSettings) {
        setSettings(localSettings)
      } else {
        // 如果没有本地设置，保存默认设置
        saveLocalSettings(defaultSettings)
      }
      
      // 如果用户已登录，尝试从服务器加载
      if (user) {
        const serverSettings = await loadServerSettings()
        if (serverSettings) {
          // 使用服务器设置覆盖本地设置
          setSettings(serverSettings)
          // 更新本地存储以匹配服务器
          saveLocalSettings(serverSettings)
        } else if (localSettings) {
          // 如果无法从服务器加载但有本地设置，将本地设置同步到服务器
          saveServerSettings(localSettings)
        }
      }
    }

    initializeSettings()
  }, [isClient, user])

  // 当设置变化时应用字体设置
  useEffect(() => {
    if (isClient) {
      applyFontSettings()
    }
  }, [settings, isClient])
  
  // 修改 updateSettings 函数，确保设置同步到服务器和本地
  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    
    // 先更新本地状态和存储
    setSettings(updatedSettings)
    saveLocalSettings(updatedSettings)
    
    // 如果用户已登录，同步到服务器
    if (user) {
      saveServerSettings(updatedSettings)
    }
  }

  const resetSettings = async () => {
    setSettings(defaultSettings)
    saveLocalSettings(defaultSettings)
    
    // 如果用户已登录，同步重置的设置到服务器
    if (user) {
      saveServerSettings(defaultSettings)
    }
  }

  // Update the applyFontSettings function to check for window
  const applyFontSettings = () => {
    if (typeof window === "undefined" || !isClient) return

    // Avoid unnecessary console logs, only in development
    if (process.env.NODE_ENV === "development") {
      console.log("应用字体设置:", settings.fontFamily, settings.fontSize)
    }

    // Only run this code in the browser
    if (typeof document !== "undefined") {
      // Get current applied font class and size class
      const currentFontClass = `font-${settings.fontFamily}`
      const currentSizeClass = `text-size-${settings.fontSize}`

      // All possible font classes
      const allFontClasses = [
        "font-sans",
        "font-serif",
        "font-mono",
        "font-roboto",
        "font-lora",
        "font-nunito",
        "font-roboto-mono",
        "font-ma-shan-zheng",
        "font-zcool-xiaowei",
        "font-zcool-qingke-huangyou",
      ]

      // All possible font size classes
      const allSizeClasses = ["text-size-small", "text-size-medium", "text-size-large", "text-size-x-large"]

      // 首先应用到body
      const bodyClassList = document.body.classList
        bodyClassList.remove(...allFontClasses)
        bodyClassList.remove(...allSizeClasses)
        bodyClassList.add(currentFontClass)
        bodyClassList.add(currentSizeClass)

      // 计算字体样式
        const fontFamily = getComputedStyle(document.body).fontFamily
        const fontSize = getComputedStyle(document.body).fontSize

      // 使用requestAnimationFrame优化DOM更新
        requestAnimationFrame(() => {
        // 应用到所有标记的元素
          const elements = document.querySelectorAll(".font-apply-target")
          elements.forEach((element) => {
            if (element instanceof HTMLElement) {
            // 移除旧的字体类
            element.classList.remove(...allFontClasses)
            element.classList.remove(...allSizeClasses)
            // 添加新的字体类
            element.classList.add(currentFontClass)
            element.classList.add(currentSizeClass)
            }
          })
        
          // 应用到编辑器内容
          const editors = document.querySelectorAll(".editor-content")
          editors.forEach((editor) => {
            if (editor instanceof HTMLElement) {
              editor.style.fontFamily = fontFamily
              editor.style.fontSize = fontSize
            }
          })
        })
    }
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        applyFontSettings,
        isSyncing,
        lastSyncTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
