"use server"

import { sql } from "@/lib/db"

export async function initializeDatabase() {
  console.log("初始化数据库...")

  try {
    // 创建 notes 表
    await sql`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log("notes 表已创建或已存在")

    // 创建 links 表
    await sql`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log("links 表已创建或已存在")

    // 创建 files 表（使用 Vercel Blob 存储）
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        blob_url TEXT NOT NULL,
        thumbnail_url TEXT,
        size INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log("files 表已创建或已存在")

    // 智能字段检测和添加功能
    console.log("🔍 检查并添加缺失的字段...")
    await ensureTableFields()



// 确保所有必需的表字段都存在
async function ensureTableFields() {
  try {
    // 检查 files 表的字段
    const filesColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'files' AND table_schema = 'public'
    `

    const existingColumns = filesColumns.map((row: any) => row.column_name)
    console.log("📋 当前 files 表字段:", existingColumns.join(', '))

    // 定义所有可能需要的字段
    const requiredFields = [
      { name: 'blob_url', type: 'TEXT', description: 'Vercel Blob 存储URL' },
      { name: 'thumbnail_url', type: 'TEXT', description: 'Vercel Blob 缩略图URL' },
      { name: 'status', type: 'VARCHAR(20) DEFAULT \'active\'', description: '文件状态' },
      { name: 'url', type: 'TEXT', description: '向后兼容的文件URL' },
      { name: 'thumbnail', type: 'TEXT', description: '向后兼容的缩略图' },
      { name: 'base64_data', type: 'TEXT', description: 'Base64文件数据' }
    ]

    // 检查并添加缺失的字段
    for (const field of requiredFields) {
      if (!existingColumns.includes(field.name)) {
        console.log(`➕ 添加缺失字段: ${field.name} (${field.description})`)
        await sql.unsafe(`ALTER TABLE files ADD COLUMN ${field.name} ${field.type}`)
        console.log(`✅ 成功添加字段: ${field.name}`)
      } else {
        console.log(`✓ 字段已存在: ${field.name}`)
      }
    }

    console.log("✅ files 表字段检查和更新完成")
  } catch (error) {
    console.error("❌ 字段检测失败:", error)
    // 如果字段检测失败，尝试基本的字段添加
    try {
      await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS blob_url TEXT`
      await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`
      await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`
      console.log("✅ 基本字段添加完成")
    } catch (fallbackError) {
      console.error("❌ 基本字段添加也失败:", fallbackError)
    }
  }
}

// 单独的字段检测和修复功能
export async function fixMissingFields() {
  console.log("🔧 开始修复缺失的数据库字段...")

  try {
    await ensureTableFields()
    return {
      success: true,
      message: "数据库字段检测和修复完成"
    }
  } catch (error) {
    console.error("修复字段失败:", error)
    return {
      success: false,
      message: `修复字段失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
