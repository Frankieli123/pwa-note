"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { initializeDatabase } from "@/app/actions/init-db"
import { seedDatabase } from "@/app/actions/seed-db"

export function SilentDbInitializer() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === "undefined") return
    
    // 检查是否已经初始化过数据库
    const hasInitialized = localStorage.getItem("db_initialized")
    if (hasInitialized) return

    const initialize = async () => {
      try {
        // 静默初始化数据库
        console.log("静默初始化数据库...")
        const initResult = await initializeDatabase()
        
        if (initResult.success) {
          console.log("数据库初始化成功")
          localStorage.setItem("db_initialized", "true")

          // 如果用户已登录，添加示例数据
          if (user) {
            console.log("自动添加示例数据...")
            await seedDatabase(user.id)
          }
        } else {
          console.error("数据库初始化失败，但不显示错误:", initResult.message)
        }
      } catch (error) {
        console.error("静默初始化数据库出错:", error)
      }
    }

    initialize()
  }, [user])

  // 不渲染任何UI
  return null
} 