"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSync } from "@/hooks/use-sync"
import { useSettings } from "@/hooks/use-settings"
import { isContentEmpty } from "./NoteEditorState"

interface AutoSaveManagerProps {
  content: string
  lastContentRef: React.MutableRefObject<string>
  lastEditRef: React.MutableRefObject<Date>
  autoSaveTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
  setLastAutoSaveTime: (time: Date) => void
  setIsSaving: (saving: boolean) => void
}

/**
 * AutoSaveManager - 自动保存管理组件
 * 
 * 职责：
 * - 管理自动保存定时器
 * - 处理内容变化检测
 * - 执行自动保存到本地存储和数据库
 * - 提供自动保存状态反馈
 */
export function AutoSaveManager({
  content,
  lastContentRef,
  lastEditRef,
  autoSaveTimerRef,
  setLastAutoSaveTime,
  setIsSaving
}: AutoSaveManagerProps) {
  const { user } = useAuth()
  const { saveNote } = useSync()
  const { settings } = useSettings()

  // 自动保存逻辑
  useEffect(() => {
    if (typeof window === "undefined") return

    const autoSaveIntervalSeconds = settings.syncInterval === 0 ? 5 : settings.syncInterval

    // 调试信息：仅在间隔发生变化时打印
    const prevIntervalRef = (window as any).__prevAutoSaveIntervalRef || { current: undefined }
    if (prevIntervalRef.current !== autoSaveIntervalSeconds) {
      console.log("自动保存间隔设置为:", autoSaveIntervalSeconds, "秒")
      prevIntervalRef.current = autoSaveIntervalSeconds
      ;(window as any).__prevAutoSaveIntervalRef = prevIntervalRef
    }

    // 内容没变，不需要设置新的计时器
    if (content === lastContentRef.current) return

    // 记录编辑时间
    lastEditRef.current = new Date()
    console.log("内容已变更，重置自动保存计时器")

    // 清除之前的计时器
    if (autoSaveTimerRef.current) {
      console.log("清除之前的自动保存计时器")
      clearTimeout(autoSaveTimerRef.current)
    }

    // 设置新的自动保存计时器
    console.log(`设置新的自动保存计时器: ${autoSaveIntervalSeconds}秒后执行`)
    autoSaveTimerRef.current = setTimeout(async () => {
      // 检查内容是否真正为空（包括只有HTML标签的情况）
      if (!isContentEmpty(content) && content !== lastContentRef.current && user) {
        const trimmedContent = content.trim()
        console.log("自动保存执行: 保存到本地存储")
        localStorage.setItem("noteDraft", trimmedContent)
        lastContentRef.current = trimmedContent
        
        // 更新最后自动保存时间
        const now = new Date()
        setLastAutoSaveTime(now)

        // 增加自动保存状态提示
        setIsSaving(true)
        
        // 仅保存到本地草稿，不自动提交到数据库
        // 只有用户点击保存按钮时才提交到数据库
        setTimeout(() => {
          setIsSaving(false)
        }, 500)
      } else {
        console.log("内容为空、未变化或用户未登录，跳过自动保存")
      }
    }, autoSaveIntervalSeconds * 1000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [content, saveNote, settings.syncInterval, user, lastContentRef, lastEditRef, autoSaveTimerRef, setLastAutoSaveTime, setIsSaving])

  // 这个组件不渲染任何UI，只处理副作用
  return null
}
