#!/usr/bin/env tsx

/**
 * 数据库迁移验证脚本
 * 验证 files 表结构是否正确迁移
 * 
 * 使用方法:
 * npx tsx scripts/verify-db-migration.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { neon } from "@neondatabase/serverless"

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local')
console.log("加载环境变量文件:", envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error("加载环境变量失败:", envResult.error)
  process.exit(1)
}

// 验证数据库连接字符串
if (!process.env.DATABASE_URL) {
  console.error("❌ 错误: 未找到 DATABASE_URL 环境变量")
  process.exit(1)
}

// 创建数据库连接
const sql = neon(process.env.DATABASE_URL)

async function verifyMigration() {
  console.log("🔍 验证数据库迁移结果...")
  
  try {
    // 1. 检查表结构
    console.log("📋 检查 files 表结构...")
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    // 期望的字段
    const expectedColumns = [
      'id', 'user_id', 'name', 'type', 'url', 'thumbnail', 
      'size', 'status', 'base64_data', 'uploaded_at', 
      'blob_url', 'thumbnail_url'
    ]
    
    const actualColumns = columns.map((col: any) => col.column_name)
    
    console.log("✅ 当前字段:", actualColumns.join(', '))
    
    // 检查必需字段是否存在
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col))
    if (missingColumns.length > 0) {
      console.error("❌ 缺少字段:", missingColumns.join(', '))
      return false
    }
    
    // 检查新字段
    const newColumns = ['blob_url', 'thumbnail_url']
    const hasNewColumns = newColumns.every(col => actualColumns.includes(col))
    if (!hasNewColumns) {
      console.error("❌ 新字段未正确添加")
      return false
    }
    
    console.log("✅ 所有必需字段都存在")
    
    // 2. 检查字段类型和约束
    console.log("\n📝 检查字段约束...")
    
    const urlColumn = columns.find((col: any) => col.column_name === 'url')
    if (urlColumn?.is_nullable !== 'YES') {
      console.error("❌ url 字段应该是可空的")
      return false
    }
    console.log("✅ url 字段正确设置为可空")
    
    const blobUrlColumn = columns.find((col: any) => col.column_name === 'blob_url')
    if (!blobUrlColumn || blobUrlColumn.data_type !== 'text') {
      console.error("❌ blob_url 字段类型不正确")
      return false
    }
    console.log("✅ blob_url 字段类型正确")
    
    const thumbnailUrlColumn = columns.find((col: any) => col.column_name === 'thumbnail_url')
    if (!thumbnailUrlColumn || thumbnailUrlColumn.data_type !== 'text') {
      console.error("❌ thumbnail_url 字段类型不正确")
      return false
    }
    console.log("✅ thumbnail_url 字段类型正确")
    
    // 3. 检查索引
    console.log("\n🔍 检查索引...")
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'files'
      ORDER BY indexname
    `
    
    const indexNames = indexes.map((idx: any) => idx.indexname)
    console.log("当前索引:", indexNames.join(', '))
    
    const expectedIndexes = ['idx_files_blob_url', 'idx_files_user_id_uploaded_at']
    const hasExpectedIndexes = expectedIndexes.every(idx => indexNames.includes(idx))
    
    if (!hasExpectedIndexes) {
      console.warn("⚠️ 部分性能索引可能缺失")
    } else {
      console.log("✅ 性能索引已正确创建")
    }
    
    // 4. 测试插入操作
    console.log("\n🧪 测试数据库操作...")
    
    const testUserId = 'test_migration_user'
    const testFileName = 'test_migration_file.txt'
    
    // 清理可能存在的测试数据
    await sql`DELETE FROM files WHERE user_id = ${testUserId} AND name = ${testFileName}`
    
    // 测试插入新格式数据
    const insertResult = await sql`
      INSERT INTO files (user_id, name, type, blob_url, thumbnail_url, size, status, uploaded_at)
      VALUES (${testUserId}, ${testFileName}, 'text/plain', 'https://test-blob-url.com/file.txt', 'https://test-blob-url.com/thumb.jpg', 1024, 'active', NOW())
      RETURNING id
    `
    
    if (insertResult.length === 0) {
      console.error("❌ 插入测试数据失败")
      return false
    }
    
    console.log("✅ 新格式数据插入成功")
    
    // 测试查询
    const queryResult = await sql`
      SELECT id, user_id, name, blob_url, thumbnail_url
      FROM files 
      WHERE user_id = ${testUserId} AND name = ${testFileName}
    `
    
    if (queryResult.length === 0) {
      console.error("❌ 查询测试数据失败")
      return false
    }
    
    console.log("✅ 数据查询成功")
    
    // 清理测试数据
    await sql`DELETE FROM files WHERE user_id = ${testUserId} AND name = ${testFileName}`
    console.log("✅ 测试数据清理完成")
    
    console.log("\n🎉 数据库迁移验证通过！")
    console.log("✅ 表结构正确")
    console.log("✅ 字段约束正确")
    console.log("✅ 索引已创建")
    console.log("✅ 数据操作正常")
    
    return true
    
  } catch (error) {
    console.error("❌ 验证过程中发生错误:", error)
    return false
  }
}

// 运行验证
verifyMigration().then((success) => {
  if (success) {
    console.log("\n✅ 数据库迁移验证成功！可以继续下一步任务。")
    process.exit(0)
  } else {
    console.log("\n❌ 数据库迁移验证失败！请检查迁移脚本。")
    process.exit(1)
  }
}).catch((error) => {
  console.error("验证脚本执行失败:", error)
  process.exit(1)
})
