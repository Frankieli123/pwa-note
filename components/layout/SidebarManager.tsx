"use client"

import { useLayoutEffect, ReactNode } from "react"
import { useMobile } from "@/hooks/use-mobile"

interface SidebarManagerProps {
  children: ReactNode
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

/**
 * SidebarManager - 侧边栏管理组件
 * 
 * 职责：
 * - 响应设备变化自动调整侧边栏状态
 * - 管理侧边栏的显示/隐藏逻辑
 * - 处理移动端和桌面端的不同行为
 */
export function SidebarManager({ children, sidebarOpen, setSidebarOpen }: SidebarManagerProps) {
  const isMobile = useMobile()

  // 响应窗口大小变化，使用 useLayoutEffect 减少闪烁
  useLayoutEffect(() => {
    // 移动端默认关闭侧边栏，桌面端默认打开
    setSidebarOpen(!isMobile)
  }, [isMobile, setSidebarOpen])

  return <>{children}</>
}
