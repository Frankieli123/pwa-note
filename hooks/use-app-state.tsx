"use client"

import { useState, useCallback } from "react"
import { useMobile } from "@/hooks/use-mobile"

/**
 * useAppState - 应用状态管理Hook
 * 
 * 职责：
 * - 统一管理应用级别的状态
 * - 提供状态更新的回调函数
 * - 简化组件间的状态传递
 */
export function useAppState() {
  const isMobile = useMobile()
  
  // 应用状态
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [syncPanelExpanded, setSyncPanelExpanded] = useState(false)

  // 事件处理函数
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem("onboardingShown", "true")
  }, [])

  const handleShowOnboarding = useCallback(() => {
    setShowOnboarding(true)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const handleSyncPanelToggle = useCallback((isExpanded: boolean) => {
    setSyncPanelExpanded(isExpanded)
  }, [])

  return {
    // 状态
    showOnboarding,
    sidebarOpen,
    syncPanelExpanded,
    isMobile,
    
    // 状态更新函数
    setSidebarOpen,
    
    // 事件处理函数
    handleOnboardingComplete,
    handleShowOnboarding,
    toggleSidebar,
    handleSyncPanelToggle,
  }
}
