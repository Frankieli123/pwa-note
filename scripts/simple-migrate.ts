#!/usr/bin/env tsx

/**
 * 简单数据库迁移脚本
 * 
 * 使用方法:
 * npx tsx scripts/simple-migrate.ts
 */

import { sql as neonSql } from '@vercel/postgres'
import { sql } from '@/lib/db'

// 旧数据库连接（Neon）
const OLD_DATABASE_URL = "postgresql://neondb_owner:npg_3wVs0kyIgAnH@ep-muddy-sound-a4ok7yeg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

async function simpleMigrate() {
  console.log("🔄 开始简单数据迁移...")

  try {
    // 1. 先在新数据库初始化表结构
    console.log("🏗️  初始化新数据库表结构...")
    
    // 调用初始化 API
    const initResponse = await fetch('http://localhost:3000/api/init-db', {
      method: 'POST'
    })
    
    if (initResponse.ok) {
      console.log("✅ 表结构初始化完成")
    } else {
      console.log("⚠️  表结构可能已存在，继续迁移...")
    }

    // 2. 从旧数据库导出数据
    console.log("📤 从旧数据库导出数据...")
    
    // 这里我们需要手动连接到旧数据库
    // 由于环境限制，我们提供 SQL 导出命令
    
    console.log(`
📋 请手动执行以下步骤：

1. 连接到旧数据库并导出数据：
   psql "${OLD_DATABASE_URL}" -c "\\copy (SELECT * FROM notes) TO 'notes.csv' WITH CSV HEADER;"
   psql "${OLD_DATABASE_URL}" -c "\\copy (SELECT * FROM links) TO 'links.csv' WITH CSV HEADER;"
   psql "${OLD_DATABASE_URL}" -c "\\copy (SELECT * FROM files) TO 'files.csv' WITH CSV HEADER;"

2. 然后导入到新数据库：
   psql "${process.env.DATABASE_URL}" -c "\\copy notes FROM 'notes.csv' WITH CSV HEADER;"
   psql "${process.env.DATABASE_URL}" -c "\\copy links FROM 'links.csv' WITH CSV HEADER;"
   psql "${process.env.DATABASE_URL}" -c "\\copy files FROM 'files.csv' WITH CSV HEADER;"

或者使用 pg_dump 和 pg_restore：
   pg_dump "${OLD_DATABASE_URL}" --data-only --table=notes --table=links --table=files > data.sql
   psql "${process.env.DATABASE_URL}" < data.sql
`)

  } catch (error) {
    console.error("❌ 迁移失败:", error)
  }
}

simpleMigrate()
