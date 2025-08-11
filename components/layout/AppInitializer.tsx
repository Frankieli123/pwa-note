"use client"

import { useEffect, useRef, ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSettings } from "@/hooks/use-settings"

interface AppInitializerProps {
  children: ReactNode
  onShowOnboarding: () => void
  showOnboarding: boolean
}

/**
 * AppInitializer - 应用初始化组件
 * 
 * 职责：
 * - 处理新用户引导逻辑
 * - 应用全局字体设置
 * - 管理应用启动时的初始化流程
 */
export function AppInitializer({ children, onShowOnboarding, showOnboarding }: AppInitializerProps) {
  const { user, isLoading: authLoading } = useAuth()
  const { applyFontSettings } = useSettings()

  // 使用ref记录是否已调用过onShowOnboarding，避免重复调用
  const hasCalledOnShowOnboardingRef = useRef(false)

  // 初始化逻辑
  useEffect(() => {
    // 新用户引导检测
    if (typeof window !== "undefined") {
      const hasAuthToken = localStorage.getItem("authToken")
      const hasShownOnboarding = localStorage.getItem("onboardingShown")

      // 只有在没有token、没有用户、没有显示过引导、且当前没有在显示引导页面的情况下才显示引导
      // 如果有authToken说明用户已登录过，即使暂时没有user状态也不显示引导
      // 如果已经在显示引导页面，避免重复调用
      if (!authLoading && !user && !hasAuthToken && !hasShownOnboarding && !showOnboarding) {
        // 只有在没有调用过onShowOnboarding的情况下才调用，避免重复调用
        if (!hasCalledOnShowOnboardingRef.current) {
          console.log("检测到新用户，显示引导页面")
          onShowOnboarding()
          hasCalledOnShowOnboardingRef.current = true
        } else {
          console.log("已调用过onShowOnboarding，跳过重复调用")
        }
      } else if (hasAuthToken && !user && !authLoading) {
        console.log("检测到已登录用户但状态未加载，等待认证完成")
      } else if (showOnboarding) {
        console.log("引导页面已显示，跳过重复检查")
      }
    }
  }, [authLoading, user, onShowOnboarding, showOnboarding])

  return <>{children}</>
}
