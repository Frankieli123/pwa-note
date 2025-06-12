import { neon, neonConfig } from "@neondatabase/serverless"

// 启用调试模式
neonConfig.fetchConnectionCache = false

// 使用环境变量的连接字符串
const CONNECTION_STRING = process.env.DATABASE_URL || ""
console.log("数据库连接字符串:", CONNECTION_STRING ? "Neon" : "未配置")

// 创建 SQL 查询执行器
export const sql = neon(CONNECTION_STRING)

// 测试连接函数
export async function testConnection() {
  if (!hasValidConnection || !sql) {
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

// 数据库查询辅助函数
export async function query(text: string, params: any[] = []) {
  console.log("执行查询:", { text, params })

  try {
    // 使用sql.query方法而不是手动替换参数
    console.log("准备执行的查询:", text, "参数:", params)
    const result = await sql.query(text, params)
    console.log("查询结果:", result)
    return { rows: result }
  } catch (error) {
    console.error("执行查询时出错", { text, error })
    throw error
  }
}
