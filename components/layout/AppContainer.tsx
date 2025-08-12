"use client"

import { FloatingNoteInput } from "@/components/floating-note-input"
import { SyncPanel } from "@/components/sync-panel"
import { StatusBar } from "@/components/status-bar"
import { OnboardingAnimation } from "@/components/onboarding-animation"
import { MainLayout } from "@/components/layout/MainLayout"
import { AppInitializer } from "@/components/layout/AppInitializer"
import { SidebarManager } from "@/components/layout/SidebarManager"
import { VersionChecker } from "@/components/version-checker"

import { useAppState } from "@/hooks/use-app-state"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useRef } from "react"

/**
 * AppContainer - 应用容器组件
 * 
 * 职责：
 * - 整合所有重构后的组件
 * - 管理应用的整体状态和布局
 * - 提供统一的应用入口点
 * - 简化page.tsx的复杂度
 */
export function AppContainer() {
  // 使用自定义Hook管理应用状态
  const {
    showOnboarding,
    sidebarOpen,
    syncPanelExpanded,
    setSidebarOpen,
    handleOnboardingComplete,
    handleShowOnboarding,
    toggleSidebar,
    handleSyncPanelToggle,
  } = useAppState()

  // 获取认证状态
  const { isInitializing } = useAuth()

  // 初始化阶段的引导显示预判（不渲染主界面，也不显示任何加载UI）
  useEffect(() => {
    if (!isInitializing) return
    if (typeof window === 'undefined') return

    const hasAuthToken = localStorage.getItem('authToken')
    const hasShownOnboarding = localStorage.getItem('hasShownOnboarding')

    // 没有 token 且没看过引导，则直接打开引导覆盖层（避免主界面先渲染）
    if (!hasAuthToken && !hasShownOnboarding && !showOnboarding) {
      handleShowOnboarding()
    }
  }, [isInitializing, showOnboarding, handleShowOnboarding])

  // 初始化期间不渲染主界面，但允许引导覆盖层显示
  if (isInitializing) {
    return (
      <>
        {showOnboarding && (
          <OnboardingAnimation onComplete={handleOnboardingComplete} />
        )}
      </>
    )
  }

  // 初始化完成后再渲染主应用与初始化器
  return (
    <AppInitializer
      onShowOnboarding={handleShowOnboarding}
      showOnboarding={showOnboarding}
    >
      <SidebarManager sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
        <MainLayout
          statusBar={<StatusBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />}
          sidebar={<SyncPanel onExpandChange={handleSyncPanelToggle} />}
          sidebarOpen={sidebarOpen}
          syncPanelExpanded={syncPanelExpanded}
        >
          <FloatingNoteInput />
        </MainLayout>
      </SidebarManager>

      {/* 版本检查和缓存管理 */}
      <VersionChecker />

      {/* 新用户引导覆盖层 */}
      {showOnboarding && (
        <OnboardingAnimation onComplete={handleOnboardingComplete} />
      )}
    </AppInitializer>
  )
}
