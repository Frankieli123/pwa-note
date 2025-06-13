#!/usr/bin/env tsx

/**
 * Vercel Blob 连接测试脚本
 * 
 * 使用方法:
 * npx tsx scripts/test-blob-connection.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { validateBlobConnection } from "../lib/blob-utils"

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local')
console.log("加载环境变量文件:", envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error("加载环境变量失败:", envResult.error)
  process.exit(1)
}

// 验证 Blob 令牌
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("❌ 错误: 未找到 BLOB_READ_WRITE_TOKEN 环境变量")
  console.error("请确保 .env.local 文件存在并包含有效的 BLOB_READ_WRITE_TOKEN")
  process.exit(1)
}

async function testBlobConnection() {
  console.log("🔍 测试 Vercel Blob 连接...")
  console.log("Token:", process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) + "...")
  
  try {
    const result = await validateBlobConnection()
    
    if (result.success) {
      console.log("✅ Vercel Blob 连接成功!")
      console.log("🎉 环境配置正确，可以开始使用 Blob 存储")
    } else {
      console.error("❌ Vercel Blob 连接失败:", result.error)
      console.error("请检查 BLOB_READ_WRITE_TOKEN 是否正确")
    }
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error)
  }
}

// 运行测试
testBlobConnection().then(() => {
  console.log("测试完成")
}).catch((error) => {
  console.error("测试失败:", error)
  process.exit(1)
})
