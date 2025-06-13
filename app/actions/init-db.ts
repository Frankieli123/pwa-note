"use server"

import { sql } from "@/lib/db"
import { createFileChunksTable } from "./chunked-upload"

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

    // 创建 files 表
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        thumbnail TEXT,
        size INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        base64_data TEXT,
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    console.log("files 表已创建或已存在")

    // 为现有数据库添加新列（如果不存在）
    try {
      await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`
      await sql`ALTER TABLE files ADD COLUMN IF NOT EXISTS base64_data TEXT`
      console.log("files 表列更新完成")
    } catch (error) {
      console.log("列可能已存在，跳过添加:", error)
    }

    // 创建分块存储表
    await createFileChunksTable()

    return {
      success: true,
      message: "数据库表已成功初始化（包含分块存储）",
    }
  } catch (error) {
    console.error("初始化数据库失败:", error)

    return {
      success: false,
      message: `初始化数据库失败: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error),
    }
  }
}
