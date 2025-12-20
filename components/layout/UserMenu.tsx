"use client"

import { useAuth } from "@/hooks/use-auth"
import { useSync } from "@/hooks/use-sync"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoginForm } from "@/components/login-form"
import { UserAvatar } from "@/components/user-avatar"
import { useMobile } from "@/hooks/use-mobile"

interface UserMenuProps {
  className?: string
}

/**
 * UserMenu - 用户菜单组件
 * 
 * 职责：
 * - 显示用户头像和信息
 * - 提供用户操作菜单（退出登录等）
 * - 处理登录/未登录状态
 * - 显示同步状态指示器
 */
export function UserMenu({ className }: UserMenuProps) {
  const { user, logout } = useAuth()
  const { status: syncStatus } = useSync()
  const isMobile = useMobile()

  if (!user) {
    return (
      <div className={cn("flex items-center", className)}>
        <LoginForm />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full relative",
              isMobile ? "h-9 w-9" : "h-9 w-9"
            )}
            aria-label={`用户菜单 - ${user.username}`}
          >
            <UserAvatar
              user={user}
              size={isMobile ? 32 : 32}
              loading="eager"
              className="h-full w-full"
            />

            {/* 同步状态指示器 */}
            {syncStatus === "syncing" && (
              <span 
                className="absolute inset-0 flex items-center justify-center"
                aria-label="正在同步"
              >
                <span className="animate-ping absolute h-full w-full rounded-full bg-primary/20 opacity-75" />
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-apply-target">{user.username}</span>
              {user.deviceInfo?.name && (
                <span className="text-xs font-normal text-muted-foreground font-apply-target">
                  {user.deviceInfo.name}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={logout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="font-apply-target">退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
