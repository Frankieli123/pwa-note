"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(false)
  const { login, loginWithPassword, checkPasswordRequired, isLoading } = useAuth()

  // 检查用户名变化时是否需要密码
  useEffect(() => {
    const checkPassword = async () => {
      if (username.trim().length > 0) {
        setCheckingPassword(true)
        setError(null)
        try {
          const required = await checkPasswordRequired(username.trim())
          setPasswordRequired(required)
          if (required) {
            setPassword("") // 清空密码输入
          }
        } catch (error) {
          console.error('检查密码需求失败:', error)
          setPasswordRequired(false)
        } finally {
          setCheckingPassword(false)
        }
      } else {
        setPasswordRequired(false)
        setPassword("")
      }
    }

    // 防抖处理，避免频繁检查
    const timeoutId = setTimeout(checkPassword, 500)
    return () => clearTimeout(timeoutId)
  }, [username, checkPasswordRequired])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError("请输入用户名")
      return
    }

    if (passwordRequired && !password.trim()) {
      setError("请输入密码")
      return
    }

    try {
      if (passwordRequired) {
        await loginWithPassword(username.trim(), password)
      } else {
        await login(username.trim())
      }

      // 登录成功，关闭对话框并重置表单
      setIsOpen(false)
      setUsername("")
      setPassword("")
      setPasswordRequired(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "登录失败，请重试"
      setError(errorMessage)
    }
  }

  // 重置表单状态
  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setUsername("")
      setPassword("")
      setPasswordRequired(false)
      setError(null)
      setCheckingPassword(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span>登录</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>登录快速笔记</DialogTitle>
          <DialogDescription>
            {passwordRequired
              ? "该用户已设置密码，请输入密码登录。"
              : "输入用户名即可快速登录使用。"}
          </DialogDescription>
        </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {checkingPassword && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* 密码输入框 - 条件显示 */}
              {passwordRequired && (
                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading || checkingPassword || (passwordRequired && !password.trim())}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : checkingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    检查中...
                  </>
                ) : (
                  passwordRequired ? "密码登录" : "快速登录"
                )}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  )
}
