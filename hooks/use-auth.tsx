"use client"

import { useContext } from "react"
import { AuthContext, AuthStatus } from "@/components/auth-provider"

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  // 添加便利方法和状态查询
  const enhancedContext = {
    ...context,
    // 便利状态查询方法
    isUnauthenticated: context.authStatus === AuthStatus.UNAUTHENTICATED,
    isChecking: context.authStatus === AuthStatus.CHECKING,
    isReady: context.authStatus !== AuthStatus.INITIALIZING && context.authStatus !== AuthStatus.CHECKING,

    // 调试信息
    getAuthStatusInfo: () => ({
      status: context.authStatus,
      hasUser: !!context.user,
      username: context.user?.username || null,
      isLoading: context.isLoading,
      isAuthenticated: context.isAuthenticated,
      isInitializing: context.isInitializing
    })
  }

  return enhancedContext
}
