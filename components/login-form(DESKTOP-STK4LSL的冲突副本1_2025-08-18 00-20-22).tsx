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
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username) {
      setError("请输入用户名")
      return
    }

    try {
      await login(username)
        setIsOpen(false)
      setUsername("")
    } catch (err) {
      setError("登录失败，请重试")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span>登录</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>登录快速笔记</DialogTitle>
          <DialogDescription>输入用户名即可快速登录使用。</DialogDescription>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  )
}
