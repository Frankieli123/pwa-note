"use client"

import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { SettingsDialog } from "@/components/settings-dialog"
import { AppHeader } from "@/components/layout/AppHeader"
import { UserMenu } from "@/components/layout/UserMenu"
import { SidebarToggle } from "@/components/layout/SidebarToggle"
import { SearchButton } from "@/components/search-button"

interface StatusBarProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
  className?: string
}

/**
 * StatusBar - 应用状态栏组件
 *
 * 职责：
 * - 提供应用顶部导航栏
 * - 集成应用标题、侧边栏切换、设置和用户菜单
 * - 响应式设计适配桌面端和移动端
 * - 保持一致的视觉层次和交互体验
 */
export function StatusBar({ onToggleSidebar, sidebarOpen, className }: StatusBarProps) {
  const isMobile = useMobile()

  return (
    <header
      className={cn(
        "w-full sticky top-0 z-30 pt-[env(safe-area-inset-top)]",
        isMobile
          ? "bg-background/95 border-b shadow-none"
          : "border-b bg-background/95 backdrop-blur-sm shadow-sm",
        className
      )}
      role="banner"
    >
      <div className={cn(
        "flex items-center justify-between",
        isMobile ? "px-4 h-12 mx-0 w-full" : "px-4 h-14 w-full"
      )}>
        {/* 应用标题区域 */}
        <AppHeader />

        {/* 操作按钮区域 */}
        <div className="flex items-center gap-2 justify-end px-3">
          {/* 搜索按钮 */}
          <SearchButton />

          {/* 桌面端侧边栏切换按钮 */}
          {!isMobile && (
            <SidebarToggle
              sidebarOpen={sidebarOpen}
              onToggle={onToggleSidebar}
            />
          )}

          {/* 设置按钮 */}
          <div className="flex items-center">
            <SettingsDialog />
          </div>

          {/* 用户菜单 */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
