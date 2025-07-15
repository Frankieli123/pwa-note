#!/usr/bin/env tsx

/**
 * MinIO 连接测试脚本
 *
 * 使用方法:
 * npx tsx scripts/test-minio-connection.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { validateMinioConnection } from "../lib/minio-utils"

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local')
console.log("加载环境变量文件:", envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error("加载环境变量失败:", envResult.error)
  process.exit(1)
}

// 验证 MinIO 配置
if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  console.error("❌ 错误: 未找到 MinIO 环境变量")
  console.error("请确保 .env.local 文件存在并包含:")
  console.error("- MINIO_ENDPOINT")
  console.error("- MINIO_ACCESS_KEY")
  console.error("- MINIO_SECRET_KEY")
  console.error("- MINIO_BUCKET_NAME")
  process.exit(1)
}

async function testMinioConnection() {
  console.log("🔍 测试 MinIO 连接...")
  console.log("Endpoint:", process.env.MINIO_ENDPOINT)
  console.log("Access Key:", process.env.MINIO_ACCESS_KEY?.substring(0, 5) + "...")
  console.log("Bucket:", process.env.MINIO_BUCKET_NAME)

  try {
    const result = await validateMinioConnection()

    if (result.success) {
      console.log("✅ MinIO 连接成功!")
      console.log("🎉 环境配置正确，可以开始使用 MinIO 存储")
    } else {
      console.error("❌ MinIO 连接失败:", result.error)
      console.error("请检查 MinIO 配置是否正确")
    }
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error)
  }
}

// 运行测试
testMinioConnection().then(() => {
  console.log("测试完成")
}).catch((error) => {
  console.error("测试失败:", error)
  process.exit(1)
})
