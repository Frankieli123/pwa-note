#!/usr/bin/env tsx

/**
 * 移除Base64支持的数据库迁移脚本
 * 删除base64_data字段，只保留Vercel Blob存储
 * 
 * 使用方法:
 * npx tsx scripts/remove-base64-support.ts
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

async function removeBase64Support() {
  console.log("🗑️ 开始移除Base64支持...")
  console.log("目标：删除base64_data字段，只保留Vercel Blob存储")
  
  try {
    // 1. 检查当前表结构
    console.log("📋 检查当前 files 表结构...")
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    console.log("当前 files 表字段:")
    tableInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // 2. 检查是否有Base64数据需要迁移
    console.log("\n🔍 检查是否有Base64数据...")
    const base64Count = await sql`
      SELECT COUNT(*) as count 
      FROM files 
      WHERE base64_data IS NOT NULL AND base64_data != ''
    `
    
    const base64Records = base64Count[0].count
    console.log(`发现 ${base64Records} 条Base64记录`)
    
    if (base64Records > 0) {
      console.log("⚠️ 警告：发现Base64数据，建议先迁移到Blob存储")
      console.log("是否继续删除Base64字段？这将导致数据丢失！")
      
      // 在生产环境中，这里应该要求用户确认
      // 为了自动化，我们先备份数据
      console.log("📦 创建数据备份...")
      await sql`
        CREATE TABLE IF NOT EXISTS files_base64_backup AS 
        SELECT id, user_id, name, base64_data, uploaded_at 
        FROM files 
        WHERE base64_data IS NOT NULL AND base64_data != ''
      `
      console.log("✅ Base64数据已备份到 files_base64_backup 表")
    }
    
    // 3. 删除Base64相关字段
    console.log("\n🗑️ 删除Base64相关字段...")
    
    await sql`ALTER TABLE files DROP COLUMN IF EXISTS base64_data`
    console.log("✅ 删除 base64_data 字段")
    
    // 4. 更新字段约束
    console.log("\n🔧 更新字段约束...")
    
    // 将blob_url设为必需字段（新上传的文件必须有blob_url）
    await sql`ALTER TABLE files ALTER COLUMN blob_url SET NOT NULL`
    console.log("✅ blob_url 字段设为必需")
    
    // 5. 删除旧的url和thumbnail字段（向后兼容字段）
    console.log("\n🗑️ 删除旧的兼容字段...")
    
    await sql`ALTER TABLE files DROP COLUMN IF EXISTS url`
    console.log("✅ 删除旧的 url 字段")
    
    await sql`ALTER TABLE files DROP COLUMN IF EXISTS thumbnail`
    console.log("✅ 删除旧的 thumbnail 字段")
    
    // 6. 更新字段注释
    console.log("\n📝 更新字段注释...")
    
    await sql`COMMENT ON COLUMN files.blob_url IS 'Vercel Blob 存储的文件URL（必需）'`
    await sql`COMMENT ON COLUMN files.thumbnail_url IS 'Vercel Blob 存储的缩略图URL'`
    console.log("✅ 字段注释更新完成")
    
    // 7. 验证最终结构
    console.log("\n🔍 验证最终表结构...")
    
    const finalTableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    console.log("最终 files 表字段:")
    finalTableInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // 8. 测试插入新记录
    console.log("\n🧪 测试新记录插入...")
    
    const testUserId = 'test_no_base64_user'
    const testBlobUrl = 'https://test-blob-url.com/test-file.txt'
    
    // 清理可能存在的测试数据
    await sql`DELETE FROM files WHERE user_id = ${testUserId}`
    
    // 测试插入只包含Blob URL的记录
    const insertResult = await sql`
      INSERT INTO files (user_id, name, type, blob_url, size, status, uploaded_at)
      VALUES (${testUserId}, 'test-no-base64.txt', 'text/plain', ${testBlobUrl}, 1024, 'active', NOW())
      RETURNING id
    `
    
    if (insertResult.length === 0) {
      throw new Error("新格式数据插入失败")
    }
    
    console.log("✅ 新格式数据插入成功")
    
    // 清理测试数据
    await sql`DELETE FROM files WHERE user_id = ${testUserId}`
    console.log("✅ 测试数据清理完成")
    
    console.log("\n🎉 Base64支持移除完成！")
    console.log("✅ 删除了 base64_data 字段")
    console.log("✅ 删除了旧的 url 和 thumbnail 字段")
    console.log("✅ blob_url 字段设为必需")
    console.log("✅ 数据库现在只支持 Vercel Blob 存储")
    
    if (base64Records > 0) {
      console.log(`📦 ${base64Records} 条Base64记录已备份到 files_base64_backup 表`)
    }
    
  } catch (error) {
    console.error("❌ 移除Base64支持失败:", error)
    throw error
  }
}

// 运行迁移
removeBase64Support().then(() => {
  console.log("迁移脚本执行完成")
}).catch((error) => {
  console.error("迁移脚本执行失败:", error)
  process.exit(1)
})
