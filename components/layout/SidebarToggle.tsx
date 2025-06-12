"use client"

import { Button } from "@/components/ui/button"
import { PanelRight, PanelRightClose } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarToggleProps {
  sidebarOpen: boolean
  onToggle: () => void
  className?: string
}

/**
 * SidebarToggle - 侧边栏切换按钮组件
 * 
 * 职责：
 * - 提供侧边栏开关功能
 * - 显示当前侧边栏状态
 * - 提供无障碍访问支持
 */
export function SidebarToggle({ sidebarOpen, onToggle, className }: SidebarToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn("h-8 w-8", className)}
      aria-label={sidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
      aria-expanded={sidebarOpen}
    >
      {sidebarOpen ? (
        <PanelRightClose className="h-4 w-4" />
      ) : (
        <PanelRight className="h-4 w-4" />
      )}
    </Button>
  )
}
