"use client"

import { useEffect, useRef, ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useSettings } from "@/hooks/use-settings"
import { AuthStatus } from "@/components/auth-provider"

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
  const { user, authStatus, isAuthenticated, isInitializing } = useAuth()
  const { applyFontSettings } = useSettings()

  // 使用ref记录是否已调用过onShowOnboarding，避免重复调用
  const hasCalledOnShowOnboardingRef = useRef(false)

  // 重置ref的逻辑：当用户已认证或已显示过引导时重置
  useEffect(() => {
    if (authStatus === AuthStatus.AUTHENTICATED || localStorage.getItem("hasShownOnboarding")) {
      hasCalledOnShowOnboardingRef.current = false
    }
  }, [authStatus])

  // 检查是否需要显示引导页面 - 使用新的认证状态枚举
  useEffect(() => {
    const checkOnboardingNeeded = () => {
      if (typeof window === "undefined") return

      const hasShownOnboarding = localStorage.getItem("hasShownOnboarding")

      console.log(`[AppInitializer] 检查引导页面需求 - 认证状态: ${authStatus}, 用户: ${user?.username || 'null'}, 已显示引导: ${!!hasShownOnboarding}, 当前显示引导: ${showOnboarding}, ref状态: ${hasCalledOnShowOnboardingRef.current}`)

      // 精确的引导页面显示逻辑：
      // 1. 认证状态必须是UNAUTHENTICATED（确保认证检查已完成）
      // 2. 没有用户数据
      // 3. 没有显示过引导页面
      // 4. 当前没有在显示引导页面
      const shouldShowOnboarding = (
        authStatus === AuthStatus.UNAUTHENTICATED &&
        !user &&
        !hasShownOnboarding &&
        !showOnboarding
      )

      if (shouldShowOnboarding) {
        // 只有在没有调用过onShowOnboarding的情况下才调用，避免重复调用
        if (!hasCalledOnShowOnboardingRef.current) {
          console.log("[AppInitializer] 检测到新用户，显示引导页面")
          onShowOnboarding()
          hasCalledOnShowOnboardingRef.current = true
        } else {
          console.log("[AppInitializer] 已调用过onShowOnboarding，跳过重复调用")
        }
      } else {
        // 记录为什么不显示引导页面
        if (authStatus === AuthStatus.INITIALIZING) {
          console.log("[AppInitializer] 认证状态初始化中，等待完成")
        } else if (authStatus === AuthStatus.CHECKING) {
          console.log("[AppInitializer] 认证状态检查中，等待完成")
        } else if (authStatus === AuthStatus.AUTHENTICATED) {
          console.log("[AppInitializer] 用户已认证，无需显示引导")
        } else if (hasShownOnboarding) {
          console.log("[AppInitializer] 已显示过引导页面，跳过")
        } else if (showOnboarding) {
          console.log("[AppInitializer] 引导页面已显示，跳过重复检查")
        }
      }
    }

    checkOnboardingNeeded()
  }, [authStatus, user, onShowOnboarding, showOnboarding])

  return <>{children}</>
}
