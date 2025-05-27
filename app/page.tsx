"use client"

import { useEffect, useState, useCallback, useMemo, useLayoutEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSync } from "@/hooks/use-sync"
import { FloatingNoteInput } from "@/components/floating-note-input"
import { SyncPanel } from "@/components/sync-panel"
import { StatusBar } from "@/components/status-bar"
import { OnboardingAnimation } from "@/components/onboarding-animation"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { user, isLoading: authLoading } = useAuth()
  const syncContext = useSync()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const { applyFontSettings } = useSettings()
  // 新增状态跟踪移动端同步面板是否展开
  const [syncPanelExpanded, setSyncPanelExpanded] = useState(false)

  // 优化初始化逻辑
  useEffect(() => {
    // For new users show onboarding
    if (!authLoading && !user && typeof window !== "undefined" && !localStorage.getItem("onboardingShown")) {
      setShowOnboarding(true)
    }

    // Apply global font settings, but only in browser
    if (typeof window !== "undefined") {
      // Use requestAnimationFrame only in browser
      requestAnimationFrame(() => {
        applyFontSettings()
      })
    }
  }, [authLoading, user, applyFontSettings])

  // 响应窗口大小变化，使用 useLayoutEffect 减少闪烁
  useLayoutEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  // 优化处理函数，使用 useCallback
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem("onboardingShown", "true")
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  // 同步面板折叠/展开处理函数
  const handleSyncPanelToggle = useCallback((isExpanded: boolean) => {
    setSyncPanelExpanded(isExpanded);
  }, []);

  // 使用 useMemo 优化条件渲染
  const mainContent = useMemo(() => {
    if (showOnboarding) {
      return <OnboardingAnimation onComplete={handleOnboardingComplete} />
    }

    // 使用 useMemo 优化类名计算
    const mainContentClassName = cn(
      "flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out",
      !isMobile && sidebarOpen ? "mr-80 lg:mr-96" : "",
      (isMobile && !syncPanelExpanded) ? "pb-12" : "" // 只为折叠状态的标题栏留出空间
    )

    // 改进移动端同步面板的定位类，根据展开状态调整
    const mobileSidebarClassName = cn(
      "transition-all w-full z-40 font-apply-target",
      syncPanelExpanded 
        ? "fixed top-12 bottom-0 left-0 right-0 bg-background border-t" // 展开时从顶部标题栏下方开始
        : "fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-xl overflow-hidden" // 折叠时在底部
    )

    const desktopSidebarClassName = cn(
      "fixed top-14 bottom-0 right-0 border-l h-[calc(100vh-3.5rem)]",
      "bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-10 font-apply-target",
      sidebarOpen ? "w-80 lg:w-96" : "w-0 opacity-0 pointer-events-none",
    )

    // 将SyncPanel提取出来，避免在条件渲染中使用不同的组件结构，并传递展开状态回调
    const syncPanelComponent = <SyncPanel onExpandChange={handleSyncPanelToggle} />;

    return (
      <main className="flex min-h-screen w-full flex-col bg-gradient-to-b from-background to-muted/50 font-apply-target">
        <StatusBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="flex w-full flex-1 pt-0">
          {/* 主要内容区域 - 如果移动端同步面板展开，则隐藏主内容 */}
          {!(isMobile && syncPanelExpanded) && (
            <div className={mainContentClassName}>
              <FloatingNoteInput />
            </div>
          )}

          {/* 侧边栏 - 在移动端底部/顶部，在桌面端右侧 */}
          {isMobile ? (
            <div className={mobileSidebarClassName}>
              {syncPanelComponent}
            </div>
          ) : (
            <div className={desktopSidebarClassName}>
              {syncPanelComponent}
            </div>
          )}
        </div>
      </main>
    )
  }, [showOnboarding, handleOnboardingComplete, isMobile, sidebarOpen, toggleSidebar, syncPanelExpanded, handleSyncPanelToggle])

  return mainContent
}
