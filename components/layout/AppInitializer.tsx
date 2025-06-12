"use client"

import { useEffect, ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSettings } from "@/hooks/use-settings"

interface AppInitializerProps {
  children: ReactNode
  onShowOnboarding: () => void
}

/**
 * AppInitializer - 应用初始化组件
 * 
 * 职责：
 * - 处理新用户引导逻辑
 * - 应用全局字体设置
 * - 管理应用启动时的初始化流程
 */
export function AppInitializer({ children, onShowOnboarding }: AppInitializerProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { applyFontSettings } = useSettings()

  // 初始化逻辑
  useEffect(() => {
    // 新用户引导检测
    if (!authLoading && !user && typeof window !== "undefined" && !localStorage.getItem("onboardingShown")) {
      onShowOnboarding()
    }
  }, [authLoading, user, onShowOnboarding])

  return <>{children}</>
}
