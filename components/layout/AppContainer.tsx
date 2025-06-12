"use client"

import { FloatingNoteInput } from "@/components/floating-note-input"
import { SyncPanel } from "@/components/sync-panel"
import { StatusBar } from "@/components/status-bar"
import { OnboardingAnimation } from "@/components/onboarding-animation"
import { MainLayout } from "@/components/layout/MainLayout"
import { AppInitializer } from "@/components/layout/AppInitializer"
import { SidebarManager } from "@/components/layout/SidebarManager"
import { useAppState } from "@/hooks/use-app-state"

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

  // 条件渲染：新用户引导
  if (showOnboarding) {
    return <OnboardingAnimation onComplete={handleOnboardingComplete} />
  }

  return (
    <AppInitializer onShowOnboarding={handleShowOnboarding}>
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
    </AppInitializer>
  )
}
