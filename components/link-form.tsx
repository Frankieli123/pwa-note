"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSync } from "@/hooks/use-sync"
import { useToast } from "@/hooks/use-toast"
import { Link2 } from "lucide-react"

interface LinkFormProps {
  onComplete?: () => void
}

export function LinkForm({ onComplete }: LinkFormProps) {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { saveLink } = useSync()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) {
      toast({
        title: "请输入链接",
        description: "链接地址不能为空",
        variant: "destructive",
      })
      return
    }

    // 验证URL格式
    try {
      // 如果没有协议，添加https://
      const urlToValidate = url.match(/^https?:\/\//) ? url : `https://${url}`
      new URL(urlToValidate)

      setIsSubmitting(true)

      // 保存链接
      await saveLink({
        url: urlToValidate,
        title: title || urlToValidate,
        createdAt: new Date(),
      })

      // 重置表单
      setUrl("")
      setTitle("")

      toast({
        title: "链接已保存",
        description: "您的链接已成功保存",
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      toast({
        title: "无效的链接",
        description: "请输入有效的URL地址",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col justify-start">
      <div className="space-y-1 mb-3">
        <Label htmlFor="url" className="text-lg font-medium">
          链接地址
        </Label>
        <Input
          id="url"
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-1 mb-3">
        <Label htmlFor="title" className="text-lg font-medium">
          标题 (可选)
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="链接标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <Button type="submit" className="w-full h-9 text-sm mt-1" disabled={isSubmitting}>
        <Link2 className="mr-2 h-4 w-4" />
        {isSubmitting ? "保存中..." : "保存链接"}
      </Button>
    </form>
  )
}
