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
    if (typeof window !== "undefined") {
      const hasAuthToken = localStorage.getItem("authToken")
      const hasShownOnboarding = localStorage.getItem("onboardingShown")

      // 只有在没有token、没有用户、没有显示过引导的情况下才显示引导
      // 如果有authToken说明用户已登录过，即使暂时没有user状态也不显示引导
      if (!authLoading && !user && !hasAuthToken && !hasShownOnboarding) {
        console.log("检测到新用户，显示引导页面")
        onShowOnboarding()
      } else if (hasAuthToken && !user && !authLoading) {
        console.log("检测到已登录用户但状态未加载，等待认证完成")
      }
    }
  }, [authLoading, user, onShowOnboarding])

  return <>{children}</>
}
