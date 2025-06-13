#!/usr/bin/env tsx

/**
 * 数据库迁移脚本：添加 Vercel Blob 存储字段
 * 
 * 使用方法:
 * npx tsx scripts/migrate-db-to-blob.ts
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
  console.error("请确保 .env.local 文件存在并包含有效的 DATABASE_URL")
  process.exit(1)
}

// 创建数据库连接
const sql = neon(process.env.DATABASE_URL)

async function migrateDatabase() {
  console.log("🚀 开始数据库迁移...")
  console.log("目标：为 files 表添加 Vercel Blob 存储字段")
  
  try {
    // 1. 检查当前表结构
    console.log("📋 检查当前 files 表结构...")
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    console.log("当前 files 表字段:")
    tableInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // 2. 添加新字段
    console.log("\n📝 添加新的 Blob 存储字段...")
    
    await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS blob_url TEXT`
    console.log("✅ 添加 blob_url 字段")
    
    await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`
    console.log("✅ 添加 thumbnail_url 字段")
    
    // 3. 修改现有字段为可空（向后兼容）
    console.log("\n🔄 修改现有字段为可空...")
    
    await sql`ALTER TABLE files ALTER COLUMN url DROP NOT NULL`
    console.log("✅ url 字段改为可空")
    
    // 4. 添加字段注释
    console.log("\n📝 添加字段注释...")
    
    await sql`COMMENT ON COLUMN files.url IS '旧版本文件URL，向后兼容用，将逐步废弃'`
    await sql`COMMENT ON COLUMN files.thumbnail IS '旧版本缩略图，向后兼容用，将逐步废弃'`
    await sql`COMMENT ON COLUMN files.blob_url IS 'Vercel Blob 存储的文件URL'`
    await sql`COMMENT ON COLUMN files.thumbnail_url IS 'Vercel Blob 存储的缩略图URL'`
    await sql`COMMENT ON COLUMN files.base64_data IS 'Base64编码文件内容，迁移期间保留'`
    console.log("✅ 字段注释添加完成")
    
    // 5. 创建索引
    console.log("\n🔍 创建性能索引...")
    
    await sql`CREATE INDEX IF NOT EXISTS idx_files_blob_url ON files(blob_url)`
    console.log("✅ 创建 blob_url 索引")
    
    await sql`CREATE INDEX IF NOT EXISTS idx_files_user_id_uploaded_at ON files(user_id, uploaded_at)`
    console.log("✅ 创建 user_id + uploaded_at 复合索引")
    
    // 6. 验证迁移结果
    console.log("\n🔍 验证迁移结果...")
    
    const updatedTableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      ORDER BY ordinal_position
    `
    
    console.log("迁移后 files 表字段:")
    updatedTableInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // 7. 检查索引
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'files'
      ORDER BY indexname
    `
    
    console.log("\nfiles 表索引:")
    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`)
    })
    
    console.log("\n🎉 数据库迁移完成！")
    console.log("✅ 已添加 blob_url 和 thumbnail_url 字段")
    console.log("✅ 现有字段保持向后兼容")
    console.log("✅ 性能索引已创建")
    
  } catch (error) {
    console.error("❌ 数据库迁移失败:", error)
    throw error
  }
}

// 运行迁移
migrateDatabase().then(() => {
  console.log("迁移脚本执行完成")
}).catch((error) => {
  console.error("迁移脚本执行失败:", error)
  process.exit(1)
})
