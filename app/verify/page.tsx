"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function VerifyPage() {
  const router = useRouter()

  useEffect(() => {
    // 简单重定向到首页，因为我们不再使用魔术链接验证
          router.push("/")
  }, [router])

  return (
    <div className="container max-w-md mx-auto h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-4">正在跳转...</h1>
        <p className="text-muted-foreground">正在将您重定向到首页。</p>
      </div>
    </div>
  )
}
