"use server"

import { sql } from "@/lib/db"

/**
 * 数据库性能优化 - 添加关键索引
 * 解决check-updates API查询慢的问题
 */
export async function optimizeDatabase() {
  console.log("🚀 开始数据库性能优化...")

  try {
    // 1. 为notes表添加复合索引
    console.log("📝 优化notes表索引...")
    await sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_created 
      ON notes (user_id, created_at DESC)
    `
    
    await sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_updated 
      ON notes (user_id, updated_at DESC)
    `

    // 2. 为links表添加复合索引
    console.log("🔗 优化links表索引...")
    await sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_user_created 
      ON links (user_id, created_at DESC)
    `

    // 3. 为files表添加复合索引
    console.log("📁 优化files表索引...")
    await sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_uploaded 
      ON files (user_id, uploaded_at DESC)
    `

    // 4. 为user_settings表添加索引（如果存在）
    console.log("⚙️ 优化user_settings表索引...")
    await sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id 
      ON user_settings (user_id)
    `

    console.log("✅ 数据库索引优化完成！")
    
    return {
      success: true,
      message: "数据库索引优化成功，查询性能将显著提升"
    }

  } catch (error) {
    console.error("❌ 数据库优化失败:", error)
    
    return {
      success: false,
      message: `数据库优化失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 检查索引是否存在
 */
export async function checkIndexes() {
  console.log("🔍 检查数据库索引状态...")

  try {
    const result = await sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('notes', 'links', 'files', 'user_settings')
      ORDER BY tablename, indexname
    `

    console.log("📊 当前索引状态:")
    result.forEach((row: any) => {
      console.log(`  ${row.tablename}.${row.indexname}: ${row.indexdef}`)
    })

    return {
      success: true,
      indexes: result
    }

  } catch (error) {
    console.error("❌ 检查索引失败:", error)
    
    return {
      success: false,
      message: `检查索引失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 分析查询性能
 */
export async function analyzeQueryPerformance(userId: string) {
  console.log("📈 分析查询性能...")

  try {
    const lastUpdate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时前

    // 分析notes查询
    console.log("分析notes查询...")
    const notesExplain = await sql`
      EXPLAIN ANALYZE 
      SELECT COUNT(*) as count FROM notes 
      WHERE user_id = ${userId} AND (created_at > ${lastUpdate} OR updated_at > ${lastUpdate})
    `

    // 分析links查询
    console.log("分析links查询...")
    const linksExplain = await sql`
      EXPLAIN ANALYZE 
      SELECT COUNT(*) as count FROM links 
      WHERE user_id = ${userId} AND created_at > ${lastUpdate}
    `

    // 分析files查询
    console.log("分析files查询...")
    const filesExplain = await sql`
      EXPLAIN ANALYZE 
      SELECT COUNT(*) as count FROM files 
      WHERE user_id = ${userId} AND uploaded_at > ${lastUpdate}
    `

    console.log("📊 查询性能分析结果:")
    console.log("Notes查询:", notesExplain)
    console.log("Links查询:", linksExplain)
    console.log("Files查询:", filesExplain)

    return {
      success: true,
      analysis: {
        notes: notesExplain,
        links: linksExplain,
        files: filesExplain
      }
    }

  } catch (error) {
    console.error("❌ 性能分析失败:", error)
    
    return {
      success: false,
      message: `性能分析失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
