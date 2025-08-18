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
import { Settings, Moon, Sun, Type, Cloud, CloudOff, Loader2, Shuffle, User, Lock, Unlock, Eye, EyeOff, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

// 头像配置类型定义
interface AvatarConfig {
  style: string
  seed: string
}
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { UserAvatar } from "@/components/user-avatar"
import { getUserAvatarUrl } from "@/lib/avatar-utils"
import { Input } from "@/components/ui/input"
import { hasUserPassword, setUserPassword, removeUserPassword } from "@/app/actions/setting-actions"
import { hashPassword, checkPasswordStrength, type PasswordStrengthResult } from "@/lib/password-utils"

// 优化 SettingsDialog 组件，减少不必要的重渲染和DOM操作
export function SettingsDialog() {
  const { settings, updateSettings, resetSettings, applyFontSettings, isSyncing, lastSyncTime, syncError, syncSettings } = useSettings()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const prevSettingsRef = useRef(settings)
  const isMobile = useMobile()
  const { user } = useAuth()

  // 头像相关状态
  const [tempAvatarConfig, setTempAvatarConfig] = useState<AvatarConfig | null>(null)
  const [avatarChanged, setAvatarChanged] = useState(false)

  // 密码相关状态
  const [hasPassword, setHasPassword] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 确保组件已挂载，避免水合不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  // 检查用户是否设置了密码
  useEffect(() => {
    const checkUserPassword = async () => {
      if (user?.id) {
        try {
          const userHasPassword = await hasUserPassword(user.id)
          setHasPassword(userHasPassword)
        } catch (error) {
          console.error('检查用户密码状态失败:', error)
        }
      }
    }

    checkUserPassword()
  }, [user?.id])

  // 监听新密码变化，实时检查强度
  useEffect(() => {
    if (newPassword) {
      const strength = checkPasswordStrength(newPassword)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(null)
    }
  }, [newPassword])

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
      { value: "system", label: "系统默认字体", shortLabel: "系统默认" },
      { value: "sans", label: "思源黑体 (Noto Sans)", shortLabel: "思源黑体" },
      { value: "serif", label: "思源宋体 (Noto Serif)", shortLabel: "思源宋体" },
      { value: "ma-shan-zheng", label: "马善政毛笔字体", shortLabel: "马善政" },
      { value: "zcool-xiaowei", label: "站酷小薇", shortLabel: "站酷小薇" },
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
      { value: "5", label: "5秒", shortLabel: "5秒" },
      { value: "10", label: "10秒", shortLabel: "10秒" },
      { value: "30", label: "30秒", shortLabel: "30秒" },
      { value: "60", label: "1分钟", shortLabel: "1分钟" },
      { value: "300", label: "5分钟", shortLabel: "5分钟" },
      { value: "600", label: "10分钟", shortLabel: "10分钟" },
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
        // 对话框关闭时，重置头像临时状态（取消未保存的头像更改）
        if (avatarChanged) {
          setTempAvatarConfig(null)
          setAvatarChanged(false)
        }

        // 检查设置是否有变化
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
    [settings, applyFontSettings, avatarChanged],
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

  // 密码相关处理函数
  const handleSetPassword = useCallback(async () => {
    if (!user?.id || !newPassword || !confirmPassword) {
      toast({
        title: "设置失败",
        description: "请填写完整的密码信息",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "设置失败",
        description: "两次输入的密码不一致",
        variant: "destructive",
      })
      return
    }

    if (!passwordStrength?.isValid) {
      toast({
        title: "设置失败",
        description: "密码强度不足，请设置更强的密码",
        variant: "destructive",
      })
      return
    }

    setPasswordLoading(true)
    try {
      const passwordHash = await hashPassword(newPassword)
      const success = await setUserPassword(user.id, passwordHash)

      if (success) {
        setHasPassword(true)
        setShowPasswordSection(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        toast({
          title: "密码设置成功",
          description: "下次登录时需要输入密码",
        })
      } else {
        throw new Error("设置密码失败")
      }
    } catch (error) {
      console.error('设置密码失败:', error)
      toast({
        title: "设置失败",
        description: "密码设置失败，请重试",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }, [user?.id, newPassword, confirmPassword, passwordStrength])

  const handleRemovePassword = useCallback(async () => {
    if (!user?.id) return

    setPasswordLoading(true)
    try {
      const success = await removeUserPassword(user.id)

      if (success) {
        setHasPassword(false)
        setShowPasswordSection(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        toast({
          title: "密码已移除",
          description: "现在可以快速登录了",
        })
      } else {
        throw new Error("移除密码失败")
      }
    } catch (error) {
      console.error('移除密码失败:', error)
      toast({
        title: "操作失败",
        description: "移除密码失败，请重试",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }, [user?.id])

  const resetPasswordForm = useCallback(() => {
    setShowPasswordSection(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordStrength(null)
  }, [])

  // 处理保存设置
  const handleSaveSettings = useCallback(async () => {
    // 如果头像有变化，先更新UI，再后台处理数据库
    if (avatarChanged && tempAvatarConfig && user) {
      // 立即更新用户状态，给用户即时反馈
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem("userData")
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          const updatedUser = {
            ...userData,
            dbAvatarConfig: tempAvatarConfig,
            avatar: getUserAvatarUrl({ ...userData, dbAvatarConfig: tempAvatarConfig })
          }
          localStorage.setItem("userData", JSON.stringify(updatedUser))

          // 触发存储事件，通知AuthProvider更新
          window.dispatchEvent(new Event('storage'))
        }
      }

      // 重置头像状态
      setTempAvatarConfig(null)
      setAvatarChanged(false)

      // 立即显示成功消息
      toast({
        title: "设置已保存",
        description: "您的设置和头像已更新",
      })

      // 关闭对话框
      setIsOpen(false)

      // 应用设置
      requestAnimationFrame(() => {
        applyFontSettings()
      })

      // 后台异步保存到数据库
      setTimeout(async () => {
        try {
          const { saveUserSettings } = await import("@/app/actions/setting-actions")
          await saveUserSettings(user.id, {
            font_family: settings.fontFamily,
            font_size: settings.fontSize,
            sync_interval: settings.syncInterval,
            avatar_style: tempAvatarConfig?.style,
            avatar_seed: tempAvatarConfig?.seed
          })

          // 保存头像配置到数据库（通过设置同步系统）
          await syncSettings()

          console.log("头像配置已成功保存到数据库")
        } catch (error) {
          console.error("后台保存头像失败:", error)
          // 后台保存失败时显示提示，但不影响用户体验
          toast({
            title: "云端同步提醒",
            description: "头像已更新，但云端同步可能有延迟",
            variant: "default",
          })
        }
      }, 100)
    } else {
      // 没有头像变化，只保存其他设置
      // 立即显示成功消息
      toast({
        title: "设置已保存",
        description: "您的设置已更新",
      })

      // 关闭对话框
      setIsOpen(false)

      // 应用设置
      requestAnimationFrame(() => {
        applyFontSettings()
      })

      // 后台异步同步设置
      setTimeout(async () => {
        try {
          await syncSettings()
          console.log("设置已成功同步到云端")
        } catch (error) {
          console.error("后台同步设置失败:", error)
        }
      }, 100)
    }
  }, [applyFontSettings, toast, avatarChanged, tempAvatarConfig, user, settings, syncSettings])

  // 处理头像更换（仅预览，不立即保存）
  const handleChangeAvatar = useCallback(() => {
    if (!user) return

    try {
      // 生成新的头像配置（不保存到持久化存储）
      const newAvatarConfig = {
        style: ['lorelei', 'notionists'][Math.floor(Math.random() * 2)],
        seed: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      }

      // 只更新临时状态
      setTempAvatarConfig(newAvatarConfig)
      setAvatarChanged(true)

      toast({
        title: "头像已预览",
        description: "点击保存按钮确认更换",
        duration: 2000,
      })
    } catch (error) {
      console.error("预览头像失败:", error)
      toast({
        title: "预览失败",
        description: "头像预览失败，请稍后再试",
        variant: "destructive",
      })
    }
  }, [user, toast])

  if (!mounted) {
    return null
  }

  return (
    <div>Test</div>
  )
}
