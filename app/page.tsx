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
  const { lastSyncTime, syncStatus } = useSync()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const { applyFontSettings } = useSettings()

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

  // 使用 useMemo 优化条件渲染
  const mainContent = useMemo(() => {
    if (showOnboarding) {
      return <OnboardingAnimation onComplete={handleOnboardingComplete} />
    }

    // 使用 useMemo 优化类名计算
    const mainContentClassName = cn(
      "flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out",
      !isMobile && sidebarOpen ? "mr-80 lg:mr-96" : "",
      isMobile ? "pb-[40vh]" : "" // 在移动端增加底部内边距，为同步面板留出空间
    )

    const mobileSidebarClassName = cn(
      "fixed bottom-0 left-0 right-0 h-[40vh] border-t w-full",
      "bg-background/80 backdrop-blur-xl z-10 font-apply-target"
    )

    const desktopSidebarClassName = cn(
      "fixed top-14 bottom-0 right-0 border-l h-[calc(100vh-3.5rem)]",
      "bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-10 font-apply-target",
      sidebarOpen ? "w-80 lg:w-96" : "w-0 opacity-0 pointer-events-none",
    )

    return (
      <main className="flex min-h-screen w-full flex-col bg-gradient-to-b from-background to-muted/50 font-apply-target">
        <StatusBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className="flex w-full flex-1 pt-0">
          {/* 主要内容区域 - 当侧边栏打开时向左移动 */}
          <div className={mainContentClassName}>
            <FloatingNoteInput />
          </div>

          {/* 侧边栏 - 在移动端底部，在桌面端右侧 */}
          {isMobile ? (
            <div className={mobileSidebarClassName}>
              <SyncPanel />
            </div>
          ) : (
            <div className={desktopSidebarClassName}>
              <SyncPanel />
            </div>
          )}
        </div>
      </main>
    )
  }, [showOnboarding, handleOnboardingComplete, isMobile, sidebarOpen, toggleSidebar])

  return mainContent
}
