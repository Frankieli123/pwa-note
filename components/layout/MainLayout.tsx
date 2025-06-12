"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface MainLayoutProps {
  children: ReactNode
  statusBar: ReactNode
  sidebar: ReactNode
  sidebarOpen: boolean
  syncPanelExpanded: boolean
  className?: string
}

/**
 * MainLayout - 应用主布局组件
 * 
 * 职责：
 * - 管理整体布局结构
 * - 处理响应式布局切换
 * - 协调状态栏、侧边栏和主内容区域的定位
 * - 为桌面端和移动端提供不同的布局体验
 */
export function MainLayout({
  children,
  statusBar,
  sidebar,
  sidebarOpen,
  syncPanelExpanded,
  className
}: MainLayoutProps) {
  const isMobile = useMobile()

  // 主内容区域样式计算
  const mainContentClassName = cn(
    "flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out",
    // 桌面端：为侧边栏留出空间
    !isMobile && sidebarOpen ? "mr-80 lg:mr-96" : "",
    // 移动端：为折叠状态的标题栏留出空间
    (isMobile && !syncPanelExpanded) ? "pb-12" : ""
  )

  // 移动端侧边栏样式
  const mobileSidebarClassName = cn(
    "transition-all w-full z-40 font-apply-target",
    syncPanelExpanded 
      ? "fixed top-12 bottom-0 left-0 right-0 bg-background border-t" // 展开时从顶部标题栏下方开始
      : "fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-xl overflow-hidden" // 折叠时在底部
  )

  // 桌面端侧边栏样式
  const desktopSidebarClassName = cn(
    "fixed top-14 bottom-0 right-0 border-l h-[calc(100vh-3.5rem)]",
    "bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-10 font-apply-target",
    sidebarOpen ? "w-80 lg:w-96" : "w-0 opacity-0 pointer-events-none"
  )

  return (
    <main className={cn(
      "flex min-h-screen w-full flex-col bg-gradient-to-b from-background to-muted/50 font-apply-target",
      className
    )}>
      {/* 状态栏 */}
      {statusBar}
      
      {/* 主要内容区域 */}
      <div className="flex w-full flex-1 pt-0">
        {/* 主内容 - 如果移动端同步面板展开，则隐藏主内容 */}
        {!(isMobile && syncPanelExpanded) && (
          <div className={mainContentClassName}>
            {children}
          </div>
        )}

        {/* 侧边栏 - 在移动端底部/顶部，在桌面端右侧 */}
        {isMobile ? (
          <div className={mobileSidebarClassName}>
            {sidebar}
          </div>
        ) : (
          <div className={desktopSidebarClassName}>
            {sidebar}
          </div>
        )}
      </div>
    </main>
  )
}
