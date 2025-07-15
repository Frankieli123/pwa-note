#!/usr/bin/env tsx

/**
 * 数据库迁移脚本
 * 从 Neon 数据库迁移到新的 PostgreSQL 数据库
 * 
 * 使用方法:
 * npx tsx scripts/migrate-database.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { Client } from "pg"

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local')
console.log("加载环境变量文件:", envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error("加载环境变量失败:", envResult.error)
  process.exit(1)
}

// 数据库连接配置
const OLD_DATABASE_URL = "postgresql://neondb_owner:npg_3wVs0kyIgAnH@ep-muddy-sound-a4ok7yeg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
const NEW_DATABASE_URL = process.env.DATABASE_URL

if (!NEW_DATABASE_URL) {
  console.error("❌ 错误: 未找到新数据库连接字符串")
  process.exit(1)
}

console.log("🔄 开始数据库迁移...")
console.log("源数据库: Neon PostgreSQL")
console.log("目标数据库:", NEW_DATABASE_URL.split('@')[1]?.split('/')[0])

async function migrateDatabase() {
  let oldClient: Client | null = null
  let newClient: Client | null = null

  try {
    // 连接到旧数据库
    console.log("\n📡 连接到源数据库...")
    oldClient = new Client({ connectionString: OLD_DATABASE_URL })
    await oldClient.connect()
    console.log("✅ 源数据库连接成功")

    // 连接到新数据库
    console.log("\n📡 连接到目标数据库...")
    newClient = new Client({ connectionString: NEW_DATABASE_URL })
    await newClient.connect()
    console.log("✅ 目标数据库连接成功")

    // 1. 创建表结构
    console.log("\n🏗️  创建表结构...")
    
    // 创建 notes 表
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        priority INTEGER DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `)
    console.log("✅ notes 表创建完成")

    // 创建 links 表
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        title VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log("✅ links 表创建完成")

    // 创建 files 表（使用新的 minio_url 字段）
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        minio_url TEXT NOT NULL,
        thumbnail_url TEXT,
        size INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log("✅ files 表创建完成")

    // 创建 user_avatar_configs 表
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS user_avatar_configs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        avatar_style VARCHAR(50) NOT NULL DEFAULT 'lorelei',
        avatar_seed VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log("✅ user_avatar_configs 表创建完成")

    // 2. 迁移数据
    console.log("\n📦 开始迁移数据...")

    // 迁移 notes
    try {
      const notesResult = await oldClient.query("SELECT * FROM notes ORDER BY id")
      if (notesResult.rows.length > 0) {
        console.log(`📝 迁移 ${notesResult.rows.length} 条笔记...`)
        for (const note of notesResult.rows) {
          await newClient.query(
            "INSERT INTO notes (user_id, title, content, created_at, updated_at, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [note.user_id, note.title, note.content, note.created_at, note.updated_at, note.priority || 0, note.status || 'active']
          )
        }
        console.log("✅ 笔记迁移完成")
      } else {
        console.log("📝 没有笔记需要迁移")
      }
    } catch (error) {
      console.log("⚠️  笔记表不存在或为空，跳过")
    }

    // 迁移 links
    try {
      const linksResult = await oldClient.query("SELECT * FROM links ORDER BY id")
      if (linksResult.rows.length > 0) {
        console.log(`🔗 迁移 ${linksResult.rows.length} 条链接...`)
        for (const link of linksResult.rows) {
          await newClient.query(
            "INSERT INTO links (user_id, url, title, created_at) VALUES ($1, $2, $3, $4)",
            [link.user_id, link.url, link.title, link.created_at]
          )
        }
        console.log("✅ 链接迁移完成")
      } else {
        console.log("🔗 没有链接需要迁移")
      }
    } catch (error) {
      console.log("⚠️  链接表不存在或为空，跳过")
    }

    // 迁移 files（注意：需要将 blob_url 转换为 minio_url）
    try {
      const filesResult = await oldClient.query("SELECT * FROM files ORDER BY id")
      if (filesResult.rows.length > 0) {
        console.log(`📁 迁移 ${filesResult.rows.length} 个文件记录...`)
        console.log("⚠️  注意：文件 URL 需要手动更新为 MinIO URL")
        for (const file of filesResult.rows) {
          // 将 blob_url 字段映射到 minio_url
          const minioUrl = file.blob_url || file.minio_url || ''
          await newClient.query(
            "INSERT INTO files (user_id, name, type, minio_url, thumbnail_url, size, status, uploaded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [file.user_id, file.name, file.type, minioUrl, file.thumbnail_url, file.size, file.status || 'active', file.uploaded_at]
          )
        }
        console.log("✅ 文件记录迁移完成")
      } else {
        console.log("📁 没有文件记录需要迁移")
      }
    } catch (error) {
      console.log("⚠️  文件表不存在或为空，跳过")
    }

    // 迁移 user_avatar_configs
    try {
      const avatarResult = await oldClient.query("SELECT * FROM user_avatar_configs ORDER BY id")
      if (avatarResult.rows.length > 0) {
        console.log(`👤 迁移 ${avatarResult.rows.length} 个用户头像配置...`)
        for (const avatar of avatarResult.rows) {
          await newClient.query(
            "INSERT INTO user_avatar_configs (user_id, avatar_style, avatar_seed, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
            [avatar.user_id, avatar.avatar_style, avatar.avatar_seed, avatar.created_at, avatar.updated_at]
          )
        }
        console.log("✅ 用户头像配置迁移完成")
      } else {
        console.log("👤 没有用户头像配置需要迁移")
      }
    } catch (error) {
      console.log("⚠️  用户头像配置表不存在或为空，跳过")
    }

    console.log("\n🎉 数据库迁移完成！")
    console.log("\n📋 迁移总结:")
    console.log("✅ 表结构已创建")
    console.log("✅ 数据已迁移")
    console.log("⚠️  请注意：如果有文件记录，需要重新上传文件到 MinIO")

  } catch (error) {
    console.error("❌ 迁移过程中发生错误:", error)
    throw error
  } finally {
    // 关闭连接
    if (oldClient) {
      await oldClient.end()
      console.log("🔌 源数据库连接已关闭")
    }
    if (newClient) {
      await newClient.end()
      console.log("🔌 目标数据库连接已关闭")
    }
  }
}

// 运行迁移
migrateDatabase().then(() => {
  console.log("\n✨ 迁移脚本执行完成")
  process.exit(0)
}).catch((error) => {
  console.error("\n💥 迁移失败:", error)
  process.exit(1)
})
