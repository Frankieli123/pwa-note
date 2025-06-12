"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { testConnection } from "@/app/actions/test-connection"
import { Loader2, Database } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function TestConnectionButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    time?: string
    error?: string
  }>({})
  const { toast } = useToast()

  const handleTest = async () => {
    setIsLoading(true)
    setResult({})

    try {
      console.log("开始测试数据库连接...")
      const response = await testConnection()
      console.log("测试连接响应:", response)

      setResult({
        success: response.success,
        message: response.error ? `连接失败: ${response.error}` : "数据库连接成功",
        time: response.result ? new Date().toLocaleString() : undefined,
      })

      setIsDialogOpen(true)

      if (response.success) {
        toast({
          title: "连接成功",
          description: `数据库连接测试成功`,
        })
      } else {
        toast({
          title: "连接失败",
          description: response.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("测试连接错误:", error)

      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })

      setIsDialogOpen(true)

      toast({
        title: "测试连接失败",
        description: "发生错误，请查看详细信息",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleTest} disabled={isLoading} variant="outline" className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        测试数据库连接
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{result.success ? "数据库连接成功 ✅" : "数据库连接失败 ❌"}</DialogTitle>
            {/* 修改这里，不要在 DialogDescription 中使用 <p> 标签 */}
            <DialogDescription>
              {result.success
                ? `${result.message} 服务器时间: ${result.time}`
                : `${result.message || "连接到数据库时出错"}`}
            </DialogDescription>
          </DialogHeader>

          {/* 将额外内容移到 DialogDescription 之外 */}
          {!result.success && result.error && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-1">错误详情:</div>
              <div className="bg-muted p-2 rounded-md overflow-auto max-h-40 text-xs">
                <pre>{result.error}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
