"use client"

import type React from "react"

import { useState } from "react"
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
import { User, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, loginWithPassword, checkUserHasPassword, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username) {
      setError("请输入用户名")
      return
    }

    try {
      if (password) {
        // 如果输入了密码，尝试密码登录
        await loginWithPassword(username, password)
      } else {
        // 如果没有输入密码，尝试快速登录
        await login(username)
      }
      handleLoginSuccess()
    } catch (err) {
      if (password) {
        setError("用户名或密码错误，请重试")
      } else {
        setError("登录失败，请重试")
      }
    }
  }

  const handleLoginSuccess = () => {
    setIsOpen(false)
    setUsername("")
    setPassword("")
    setError(null)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // 对话框关闭时重置所有状态
      setUsername("")
      setPassword("")
      setError(null)
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
            输入用户名登录，密码可选（如果设置了密码则必须输入）。
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
              <Input
                id="username"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus

              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">密码（可选）</Label>
              <Input
                id="password"
                type="password"
                placeholder="如果设置了密码请输入"
                value={password}
                onChange={(e) => setPassword(e.target.value)}

              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading}

            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
