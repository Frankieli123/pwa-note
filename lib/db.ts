import { neon } from "@neondatabase/serverless"

// 移除弃用的fetchConnectionCache配置（现在默认启用）

// 使用环境变量的连接字符串
const CONNECTION_STRING = process.env.DATABASE_URL || ""
console.log("数据库连接字符串:", CONNECTION_STRING ? "Neon" : "未配置")

// 创建 SQL 查询执行器
export const sql = neon(CONNECTION_STRING)

// 测试连接函数
export async function testConnection() {
  if (!CONNECTION_STRING || !sql) {
    console.log("数据库未配置，使用模拟模式")
    return { success: true, result: [{ test: 1 }], mock: true }
  }

  try {
    const result = await sql`SELECT 1 as test`
    console.log("数据库连接测试成功")
    return { success: true, result }
  } catch (error) {
    console.error("测试连接失败:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 数据库查询辅助函数（带重试机制）
export async function query(text: string, params: any[] = [], maxRetries: number = 3) {
  const isNotesQuery = text.includes('FROM notes')

  if (isNotesQuery) {
    console.log("⚡ 便签查询开始...")
  }

  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 检查查询大小限制（调整为更大的限制）
      const querySize = text.length + (params ? JSON.stringify(params).length : 0)
      if (querySize > 8000000) { // 8MB限制（允许更大的文件）
        throw new Error(`Query too large: ${(querySize / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 8MB.`)
      }

      // 添加查询超时控制（根据查询大小动态调整）
      const timeoutMs = querySize > 100000 ? 30000 : 10000 // 大查询30秒，小查询10秒
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      })

      const queryPromise = sql.query(text, params)
      const result = await Promise.race([queryPromise, timeoutPromise]) as any

      if (isNotesQuery) {
        console.log(`⚡ 便签查询完成: ${result.length} 条`)
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`查询完成: ${result.length} 行`)
      }

      return { rows: result }
    } catch (error: any) {
      lastError = error

      // 如果是查询太大的错误，不重试
      if (error.message?.includes('Query too large')) {
        throw error
      }

      // 检查是否是网络连接错误
      const isNetworkError = error.message?.includes('fetch failed') ||
                            error.message?.includes('ECONNRESET') ||
                            error.message?.includes('timeout')

      if (isNetworkError && attempt < maxRetries) {
        console.warn(`🔄 数据库连接失败，重试 ${attempt}/${maxRetries}...`)
        // 指数退避：等待时间递增
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        continue
      }

      console.error("❌ 查询错误:", {
        text: text.substring(0, 50) + "...",
        attempt,
        error: error.message || error
      })

      if (attempt === maxRetries) {
        throw error
      }
    }
  }

  throw lastError
}
