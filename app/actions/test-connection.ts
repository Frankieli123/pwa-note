"use server"

import { testConnection as dbTestConnection } from "@/lib/db"

export async function testConnection() {
  console.log("测试数据库连接...")
  
  try {
    const result = await dbTestConnection()
    console.log("测试连接结果:", result)
    return result
  } catch (error) {
    console.error("测试连接错误:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}
