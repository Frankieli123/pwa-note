"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/use-settings"
import { useTheme } from "next-themes"
import { Settings, Moon, Sun, RotateCcw, Type, Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"

// 优化 SettingsDialog 组件，减少不必要的重渲染和DOM操作
export function SettingsDialog() {
  const { settings, updateSettings, resetSettings, applyFontSettings, isSyncing, lastSyncTime, syncError, syncSettings } = useSettings()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const prevSettingsRef = useRef(settings)
  const isMobile = useMobile()
  const { user } = useAuth()

  // 确保组件已挂载，避免水合不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  // 格式化最后同步时间
  const formattedSyncTime = useCallback(() => {
    if (!lastSyncTime) return "未同步";
    return lastSyncTime.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastSyncTime]);

  // 使用 useMemo 优化选项数组，避免重复创建
  const fontFamilyOptions = useMemo(
    () => [
      { value: "sans", label: "思源黑体 (Noto Sans)" },
      { value: "serif", label: "思源宋体 (Noto Serif)" },
      { value: "mono", label: "JetBrains Mono" },
      { value: "roboto", label: "Roboto" },
      { value: "lora", label: "Lora" },
      { value: "nunito", label: "Nunito" },
      { value: "roboto-mono", label: "Roboto Mono" },
      { value: "ma-shan-zheng", label: "马善政毛笔字体" },
      { value: "zcool-xiaowei", label: "站酷小薇" },
      { value: "zcool-qingke-huangyou", label: "站酷庆科黄油体" },
    ],
    [],
  )

  const fontSizeOptions = useMemo(
    () => [
      { value: "small", label: "小" },
      { value: "medium", label: "中" },
      { value: "large", label: "大" },
      { value: "x-large", label: "特大" },
    ],
    [],
  )

  const syncIntervalOptions = useMemo(
    () => [
      { value: "5", label: "5秒" },
      { value: "10", label: "10秒" },
      { value: "30", label: "30秒" },
      { value: "60", label: "1分钟" },
      { value: "300", label: "5分钟" },
      { value: "600", label: "10分钟" },
    ],
    [],
  )

  // 优化处理函数，使用 useCallback
  const handleFontFamilyChange = useCallback(
    (value: string) => {
      // 先更新设置
      updateSettings({ fontFamily: value as any })
      // 使用 requestAnimationFrame 优化DOM更新
      requestAnimationFrame(() => {
        // 强制立即应用字体设置
        applyFontSettings()
      })
    },
    [updateSettings, applyFontSettings],
  )

  const handleFontSizeChange = useCallback(
    (value: string) => {
      // 先更新设置
      updateSettings({ fontSize: value as "small" | "medium" | "large" | "x-large" })
      // 使用 requestAnimationFrame 优化DOM更新
      requestAnimationFrame(() => {
        // 强制立即应用字体设置
        applyFontSettings()
      })
    },
    [updateSettings, applyFontSettings],
  )

  const handleSyncIntervalChange = useCallback(
    (value: string) => {
      updateSettings({ syncInterval: Number.parseInt(value) as 5 | 10 | 30 | 60 | 300 | 600 })
    },
    [updateSettings],
  )

  const handleThemeChange = useCallback(
    (value: string) => {
      setTheme(value)
    },
    [setTheme],
  )

  const handleReset = useCallback(() => {
    resetSettings()
    setTheme("system")
    // 使用 requestAnimationFrame 优化DOM更新
    requestAnimationFrame(() => {
      // 强制立即应用字体设置
      applyFontSettings()
    })
  }, [resetSettings, setTheme, applyFontSettings])

  // 优化对话框关闭处理
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (!open) {
        // 对话框关闭时，检查设置是否有变化
        if (
          prevSettingsRef.current.fontFamily !== settings.fontFamily ||
          prevSettingsRef.current.fontSize !== settings.fontSize
        ) {
          // 使用 requestAnimationFrame 优化DOM更新
          requestAnimationFrame(() => {
            applyFontSettings()
          })
          prevSettingsRef.current = { ...settings }
        }
      }
    },
    [settings, applyFontSettings],
  )

  // 添加手动同步处理函数
  const handleSyncSettings = useCallback(async () => {
    if (user) {
      // 验证localStorage中的用户ID与当前用户ID是否一致
      const storedUserData = localStorage.getItem("userData");
      if (storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          if (parsedUserData.id !== user.id) {
            console.error("本地存储的用户ID与当前用户ID不一致");
          }
        } catch (e) {
          console.error("解析本地用户数据出错:", e);
        }
      }
    }
    
    await syncSettings();
  }, [syncSettings, user]);
  
  // 处理保存设置
  const handleSaveSettings = useCallback(() => {
    // 保存当前设置
    toast({
      title: "设置已保存",
      description: "您的设置已成功保存",
    })
    
    // 关闭对话框
    setIsOpen(false)
    
    // 应用设置
    requestAnimationFrame(() => {
      applyFontSettings()
    })
  }, [applyFontSettings, toast])

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("sm:max-w-[425px] mx-auto", isMobile && "w-[calc(100%-2rem)] p-4")}>
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>应用设置</DialogTitle>
            {user && (
              <div className="flex items-center text-xs text-muted-foreground">
                {isSyncing ? (
                  <div className="flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    <span>正在同步...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    {lastSyncTime ? (
                      <>
                        <Cloud className="h-3 w-3 mr-1 text-green-500" />
                        <span>{formattedSyncTime()}</span>
                      </>
                    ) : (
                      <>
                        <CloudOff className="h-3 w-3 mr-1 text-amber-500" />
                        <span>未同步</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogDescription>
            {user 
              ? "应用设置将自动保存到您的账号，并在所有设备上同步。" 
              : "自定义您的应用外观和行为。登录后可将设置同步到您的账号。"}
          </DialogDescription>
          
          {/* 显示同步错误信息（如果有） */}
          {syncError && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md">
              <p className="font-semibold">同步错误:</p>
              <p>{syncError}</p>
            </div>
          )}
          
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:py-4">
          <div className={cn("grid items-center gap-2 sm:gap-4", isMobile ? "grid-cols-1" : "grid-cols-4")}>
            {isMobile ? (
              <>
                <Label htmlFor="theme">主题</Label>
                <Select value={theme || "system"} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme" className="w-full">
                    <SelectValue placeholder="选择主题" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>亮色模式</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>暗色模式</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">系统默认</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Label htmlFor="theme" className="text-right">
                  主题
                </Label>
                <Select value={theme || "system"} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme" className="col-span-3">
                    <SelectValue placeholder="选择主题" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>亮色模式</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>暗色模式</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">系统默认</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className={cn("grid items-center gap-2 sm:gap-4", isMobile ? "grid-cols-1" : "grid-cols-4")}>
            {isMobile ? (
              <>
                <Label htmlFor="fontFamily">字体</Label>
                <Select value={settings.fontFamily} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger id="fontFamily" className="w-full">
                    <SelectValue placeholder="选择字体" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Label htmlFor="fontFamily" className="text-right">
                  字体
                </Label>
                <Select value={settings.fontFamily} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger id="fontFamily" className="col-span-3">
                    <SelectValue placeholder="选择字体" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className={cn("grid items-center gap-2 sm:gap-4", isMobile ? "grid-cols-1" : "grid-cols-4")}>
            {isMobile ? (
              <>
                <Label htmlFor="fontSize">字号</Label>
                <Select value={settings.fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger id="fontSize" className="w-full">
                    <SelectValue placeholder="选择字号" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Label htmlFor="fontSize" className="text-right">
                  字号
                </Label>
                <Select value={settings.fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger id="fontSize" className="col-span-3">
                    <SelectValue placeholder="选择字号" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className={cn("grid items-center gap-2 sm:gap-4", isMobile ? "grid-cols-1" : "grid-cols-4")}>
            {isMobile ? (
              <>
                <Label htmlFor="sync-interval">同步间隔</Label>
                <Select value={settings.syncInterval.toString()} onValueChange={handleSyncIntervalChange}>
                  <SelectTrigger id="sync-interval" className="w-full">
                    <SelectValue placeholder="选择同步间隔" />
                  </SelectTrigger>
                  <SelectContent>
                    {syncIntervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Label htmlFor="sync-interval" className="text-right">
                  同步间隔
                </Label>
                <Select value={settings.syncInterval.toString()} onValueChange={handleSyncIntervalChange}>
                  <SelectTrigger id="sync-interval" className="col-span-3">
                    <SelectValue placeholder="选择同步间隔" />
                  </SelectTrigger>
                  <SelectContent>
                    {syncIntervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSaveSettings} className="gap-1">
              <span>保存</span>
            </Button>
          </div>
          
          {user && (
            <div className="text-xs text-muted-foreground">
              {isSyncing ? "正在同步..." : (lastSyncTime ? `上次同步: ${formattedSyncTime()}` : "未同步到云端")}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
