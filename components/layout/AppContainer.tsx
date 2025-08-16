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

  // 移除重复的引导逻辑，统一由AppInitializer处理

  // 统一渲染主应用和引导页面，避免重新挂载导致状态丢失
  return (
    <>
      {/* 始终渲染AppInitializer，让它处理所有的引导逻辑 */}
      <AppInitializer
        onShowOnboarding={handleShowOnboarding}
        showOnboarding={showOnboarding}
      >
        {/* 只有在非初始化状态下才渲染主界面 */}
        {!isInitializing && (
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
        )}

        {/* 版本检查和缓存管理 */}
        <VersionChecker />
      </AppInitializer>

      {/* 新用户引导覆盖层 - 统一在这里渲染，避免重新挂载 */}
      {showOnboarding && (
        <OnboardingAnimation
          key="onboarding-stable"
          onComplete={handleOnboardingComplete}
        />
      )}
    </>
  )
}
