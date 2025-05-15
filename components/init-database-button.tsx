"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { initializeDatabase } from "@/app/actions/init-db"
import { Loader2, Database } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function InitDatabaseButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
  }>({})
  const { toast } = useToast()

  const handleInit = async () => {
    setIsLoading(true)
    setResult({})

    try {
      console.log("开始初始化数据库...")
      const response = await initializeDatabase()
      console.log("初始化结果:", response)

      setResult({
        success: response.success,
        message: response.message,
        error: response.error,
      })

      setIsDialogOpen(true)

      if (response.success) {
        toast({
          title: "初始化成功",
          description: response.message,
        })
      } else {
        toast({
          title: "初始化失败",
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("初始化数据库错误:", error)

      setResult({
        success: false,
        message: "初始化数据库失败",
        error: error instanceof Error ? error.message : String(error),
      })

      setIsDialogOpen(true)

      toast({
        title: "初始化数据库失败",
        description: "请检查详细错误信息",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleInit} disabled={isLoading} variant="outline" className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        初始化数据库
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{result.success ? "数据库初始化成功 ✅" : "数据库初始化失败 ❌"}</DialogTitle>
            <DialogDescription>
              {result.message || (result.success ? "数据库表已成功创建" : "初始化数据库时出错")}
            </DialogDescription>
          </DialogHeader>

          {!result.success && result.error && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-1">错误详情:</div>
              <div className="bg-muted p-2 rounded-md overflow-auto max-h-40 text-xs">
                <pre>{result.error}</pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
