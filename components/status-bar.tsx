"use client"

import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/use-sync"
import { cn } from "@/lib/utils"
import { Laptop, LogOut, Smartphone, Tablet, User, PanelRight, PanelRightClose } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoginForm } from "@/components/login-form"
import { SettingsDialog } from "@/components/settings-dialog"
import { useMobile } from "@/hooks/use-mobile"

interface StatusBarProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function StatusBar({ onToggleSidebar, sidebarOpen }: StatusBarProps) {
  const { user, logout } = useAuth()
  const { status: syncStatus } = useSync()
  const isMobile = useMobile()

  const getDeviceIcon = (type?: "mobile" | "tablet" | "desktop") => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      default:
        return <Laptop className="h-4 w-4" />
    }
  }

  // 头像现在通过 UserAvatar 组件处理

  return (
    <div className={cn(
      "w-full sticky top-0 z-30",
      isMobile 
        ? "bg-background/95 border-b shadow-none" 
        : "border-b bg-background/95 backdrop-blur-sm shadow-sm"
    )}>
      <div className={cn(
        "flex items-center justify-between",
        isMobile ? "px-0 h-12 mx-0 w-full" : "px-4 h-14 w-full"
      )}>
        <div className="flex items-center gap-1 sm:gap-2 px-3">
          <Image
            src="/1.png"
            alt="应用图标"
            width={isMobile ? 20 : 24}
            height={isMobile ? 20 : 24}
            className="text-foreground"
          />
          <span className={cn("font-medium font-apply-target", isMobile ? "text-base" : "text-lg")}>快速笔记</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 justify-end px-3">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-8 w-8"
              aria-label={sidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
            >
              {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
          )}
          
          <div className="flex items-center">
            <SettingsDialog />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn(
                  "rounded-full relative",
                  isMobile ? "h-7 w-7" : "h-8 w-8"
                )}>
                  <UserAvatar
                    user={user}
                    size={isMobile ? 28 : 32}
                    loading="eager"
                    className="h-full w-full"
                  />

                  {syncStatus === "syncing" && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-primary/20 opacity-75" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-apply-target">{user.username}</span>
                    <span className="text-xs font-normal text-muted-foreground font-apply-target">
                      {user.deviceInfo?.name}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="font-apply-target">退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </div>
  )
}
