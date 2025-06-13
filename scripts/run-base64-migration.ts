#!/usr/bin/env tsx

/**
 * 运行 Base64 数据列迁移脚本
 *
 * 使用方法:
 * npm run migration:base64
 * 或
 * npx tsx scripts/run-base64-migration.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

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

console.log("✅ 环境变量加载成功")
console.log("数据库连接:", process.env.DATABASE_URL ? "已配置" : "未配置")

import { addBase64DataColumn, testBase64DataColumn } from "../lib/add-base64-migration"

async function main() {
  console.log("=== PWA Note Base64 数据列迁移 ===")
  console.log("开始时间:", new Date().toISOString())
  console.log()

  try {
    // 步骤1: 添加 base64_data 列
    console.log("步骤 1: 添加 base64_data 列")
    const addResult = await addBase64DataColumn()
    
    if (!addResult.success) {
      console.error("❌ 迁移失败:", addResult.message)
      if (addResult.error) {
        console.error("错误详情:", addResult.error)
      }
      process.exit(1)
    }

    if (addResult.alreadyExists) {
      console.log("✅ 列已存在，跳过添加")
    } else {
      console.log("✅ 列添加成功")
      if (addResult.columnInfo) {
        console.log("   列信息:", addResult.columnInfo)
      }
    }
    console.log()

    // 步骤2: 测试列功能
    console.log("步骤 2: 测试 base64_data 列功能")
    const testResult = await testBase64DataColumn()
    
    if (!testResult.success) {
      console.error("❌ 功能测试失败:", testResult.message)
      if (testResult.error) {
        console.error("错误详情:", testResult.error)
      }
      process.exit(1)
    }

    console.log("✅ 功能测试通过")
    if (testResult.testData) {
      console.log("   测试数据:")
      console.log("   - 原始内容:", testResult.testData.originalContent)
      console.log("   - Base64编码:", testResult.testData.base64Content.substring(0, 50) + "...")
      console.log("   - 解码验证:", testResult.testData.retrievedContent)
    }
    console.log()

    // 完成
    console.log("=== 迁移完成 ===")
    console.log("✅ base64_data 列已成功添加到 files 表")
    console.log("✅ 列功能测试通过")
    console.log("✅ 数据库已准备好存储 Base64 文件数据")
    console.log()
    console.log("下一步:")
    console.log("1. 更新 ORM 模型以包含 base64_data 字段")
    console.log("2. 修改文件上传 API 以使用 Base64 存储")
    console.log("3. 修改文件检索 API 以返回 Base64 数据")
    console.log()
    console.log("结束时间:", new Date().toISOString())

  } catch (error) {
    console.error("❌ 迁移过程中发生未预期的错误:")
    console.error(error)
    process.exit(1)
  }
}

// 运行迁移
main().catch((error) => {
  console.error("❌ 脚本执行失败:")
  console.error(error)
  process.exit(1)
})
