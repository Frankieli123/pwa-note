"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { seedDatabase } from "@/app/actions/seed-db"
import { useSync } from "@/hooks/use-sync"
import { Loader2, Database } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function SeedDatabaseButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
  }>({})
  const { toast } = useToast()
  const { user } = useAuth()
  const { syncNow } = useSync()

  const handleSeed = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能添加示例数据",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setResult({})

    try {
      console.log("开始添加示例数据...")
      const response = await seedDatabase(user.id)
      console.log("添加示例数据结果:", response)

      setResult({
        success: response.success,
        message: response.message,
      })

      setIsDialogOpen(true)

      if (response.success) {
        toast({
          title: "成功",
          description: response.message,
        })
        // 刷新数据
        await syncNow()
      } else {
        toast({
          title: "失败",
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("添加示例数据错误:", error)

      setResult({
        success: false,
        message: "添加示例数据失败",
        error: error instanceof Error ? error.message : String(error),
      })

      setIsDialogOpen(true)

      toast({
        title: "添加示例数据失败",
        description: "请检查详细错误信息",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleSeed} disabled={isLoading || !user} variant="outline" className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        添加示例数据
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{result.success ? "添加示例数据成功 ✅" : "添加示例数据失败 ❌"}</DialogTitle>
            <DialogDescription>
              {result.message || (result.success ? "示例数据已成功添加到数据库" : "添加示例数据时出错")}
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
