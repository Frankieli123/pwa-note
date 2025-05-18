"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { useTheme } from "next-themes"

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
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const { setTheme } = useTheme()
  const [isClient, setIsClient] = useState(false)

  // 客户端渲染检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 加载保存的设置
  useEffect(() => {
    if (!isClient) return

    const savedSettings = localStorage.getItem("appSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (error) {
        console.error("加载设置失败:", error)
        // 如果加载失败，重置为默认设置
        localStorage.setItem("appSettings", JSON.stringify(defaultSettings))
      }
    } else {
      // 如果没有保存的设置，保存默认设置
      localStorage.setItem("appSettings", JSON.stringify(defaultSettings))
    }
  }, [isClient])

  // 当设置变化时应用字体设置
  useEffect(() => {
    if (isClient) {
      applyFontSettings()
    }
  }, [settings, isClient])

  // 修改 updateSettings 函数，确保立即应用字体设置
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings }
      // 保存到本地存储
      localStorage.setItem("appSettings", JSON.stringify(updatedSettings))
      return updatedSettings
    })

    // 注意：这里不再调用 applyFontSettings，因为 useEffect 会在 settings 更新后调用它
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.setItem("appSettings", JSON.stringify(defaultSettings))
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

        // 应用到所有标题元素
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading) => {
          if (heading instanceof HTMLElement) {
            heading.classList.add(currentFontClass);
          }
        });
        
        // 应用到所有段落元素
        const paragraphs = document.querySelectorAll('p');
        paragraphs.forEach((p) => {
          if (p instanceof HTMLElement) {
            p.classList.add(currentFontClass);
          }
        });
        
        // 应用到所有span元素
        const spans = document.querySelectorAll('span:not(.font-apply-target)');
        spans.forEach((span) => {
          if (span instanceof HTMLElement) {
            span.classList.add(currentFontClass);
          }
        });
        
        // 应用到所有div元素中的文本
        const divs = document.querySelectorAll('div:not(.font-apply-target)');
        divs.forEach((div) => {
          if (div instanceof HTMLElement && div.textContent && div.children.length === 0) {
            div.classList.add(currentFontClass);
          }
        });

        // 触发全局事件通知组件字体已更改
          window.dispatchEvent(
            new CustomEvent("fontSettingsChanged", {
              detail: { fontFamily: settings.fontFamily, fontSize: settings.fontSize },
            }),
          )
        })
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, applyFontSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}
