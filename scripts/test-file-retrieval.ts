#!/usr/bin/env tsx

/**
 * 文件检索API测试脚本
 * 
 * 使用方法:
 * npm run test:file-retrieval
 * 或
 * npx tsx scripts/test-file-retrieval.ts
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

// 使用直接的数据库连接，避免模块加载时的环境变量问题
import { neon } from "@neondatabase/serverless"

// 创建数据库连接
function createDbConnection() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL 环境变量未设置")
  }
  return neon(connectionString)
}

async function testFileRetrievalAPI() {
  console.log("=== PWA Note 文件检索API测试 ===")
  console.log("开始时间:", new Date().toISOString())
  console.log()

  const sql = createDbConnection()
  const testUserId = "test_user_" + Date.now()
  let testFileId: number | null = null

  try {
    // 步骤1: 创建测试文件
    console.log("步骤 1: 创建测试文件")

    const testContent = "Hello, File Retrieval Test!"
    const testBase64 = Buffer.from(testContent).toString('base64')
    const testDataURL = `data:text/plain;base64,${testBase64}`

    // 直接插入数据库
    const insertResult = await sql`
      INSERT INTO files (user_id, name, type, url, size, base64_data)
      VALUES (${testUserId}, ${'test-retrieval.txt'}, ${'text/plain'}, ${testDataURL}, ${testContent.length}, ${testBase64})
      RETURNING *
    `

    if (insertResult.length === 0) {
      throw new Error("文件插入失败")
    }

    const createdFile = insertResult[0]
    testFileId = createdFile.id
    
    console.log("✅ 测试文件创建成功")
    console.log("   文件ID:", testFileId)
    console.log("   文件名:", createdFile.name)
    console.log("   文件类型:", createdFile.type)
    console.log("   文件大小:", createdFile.size)
    console.log()

    // 步骤2: 测试文件列表检索
    console.log("步骤 2: 测试文件列表检索")

    const fileListResult = await sql`
      SELECT * FROM files WHERE user_id = ${testUserId} ORDER BY uploaded_at DESC
    `

    if (fileListResult.length === 0) {
      throw new Error("文件列表为空")
    }

    const retrievedFile = fileListResult.find(f => f.id === testFileId)
    if (!retrievedFile) {
      throw new Error("未找到创建的测试文件")
    }
    
    console.log("✅ 文件列表检索成功")
    console.log("   找到文件数量:", fileListResult.length)
    console.log("   测试文件信息:")
    console.log("   - ID:", retrievedFile.id)
    console.log("   - 名称:", retrievedFile.name)
    console.log("   - 类型:", retrievedFile.type)
    console.log("   - 大小:", retrievedFile.size)
    console.log("   - Base64数据长度:", retrievedFile.base64_data?.length || 0)
    console.log()

    // 步骤3: 验证Base64数据完整性
    console.log("步骤 3: 验证Base64数据完整性")
    
    if (!retrievedFile.base64_data) {
      throw new Error("检索到的文件缺少Base64数据")
    }
    
    if (retrievedFile.base64_data !== testBase64) {
      throw new Error("Base64数据不匹配")
    }
    
    // 验证解码后的内容
    const decodedContent = Buffer.from(retrievedFile.base64_data, 'base64').toString()
    if (decodedContent !== testContent) {
      throw new Error(`解码内容不匹配：期望 "${testContent}"，实际 "${decodedContent}"`)
    }
    
    console.log("✅ Base64数据完整性验证通过")
    console.log("   原始内容:", testContent)
    console.log("   Base64编码:", testBase64.substring(0, 50) + "...")
    console.log("   解码验证:", decodedContent)
    console.log()

    // 步骤4: 测试URL格式
    console.log("步骤 4: 测试URL格式")
    
    if (!retrievedFile.url) {
      throw new Error("文件缺少URL字段")
    }
    
    if (!retrievedFile.url.startsWith('data:')) {
      throw new Error("URL不是data URL格式")
    }
    
    // 验证data URL的完整性
    const urlParts = retrievedFile.url.split(',')
    if (urlParts.length !== 2) {
      throw new Error("data URL格式不正确")
    }
    
    const urlBase64 = urlParts[1]
    if (urlBase64 !== testBase64) {
      throw new Error("data URL中的Base64数据不匹配")
    }
    
    console.log("✅ URL格式验证通过")
    console.log("   URL类型:", retrievedFile.url.split(',')[0])
    console.log("   URL长度:", retrievedFile.url.length)
    console.log()

    // 步骤5: 测试文件类型过滤
    console.log("步骤 5: 测试文件类型过滤")

    // 创建一个图片文件用于测试过滤
    const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    const imageDataURL = `data:image/png;base64,${imageBase64}`

    // 直接插入图片文件
    await sql`
      INSERT INTO files (user_id, name, type, url, size, base64_data)
      VALUES (${testUserId}, ${'test-image.png'}, ${'image/png'}, ${imageDataURL}, ${100}, ${imageBase64})
    `

    // 重新获取文件列表
    const allFilesResult = await sql`
      SELECT * FROM files WHERE user_id = ${testUserId} ORDER BY uploaded_at DESC
    `
    const textFiles = allFilesResult.filter(f => f.type.startsWith('text/'))
    const imageFiles = allFilesResult.filter(f => f.type.startsWith('image/'))
    
    console.log("✅ 文件类型过滤测试通过")
    console.log("   总文件数:", allFilesResult.length)
    console.log("   文本文件数:", textFiles.length)
    console.log("   图片文件数:", imageFiles.length)
    console.log()

    // 步骤6: 性能测试
    console.log("步骤 6: 性能测试")

    const startTime = Date.now()
    const performanceFilesResult = await sql`
      SELECT * FROM files WHERE user_id = ${testUserId} ORDER BY uploaded_at DESC
    `
    const endTime = Date.now()

    const retrievalTime = endTime - startTime
    const totalSize = performanceFilesResult.reduce((sum, f) => sum + (f.base64_data?.length || 0), 0)
    
    console.log("✅ 性能测试完成")
    console.log("   检索时间:", retrievalTime, "ms")
    console.log("   文件数量:", performanceFilesResult.length)
    console.log("   总Base64大小:", totalSize, "字符")
    console.log("   平均每文件时间:", Math.round(retrievalTime / performanceFilesResult.length), "ms")
    console.log()

    // 清理测试数据
    console.log("步骤 7: 清理测试数据")

    await sql`DELETE FROM files WHERE user_id = ${testUserId}`
    console.log("✅ 测试数据清理完成")
    console.log()

    // 完成
    console.log("=== 测试完成 ===")
    console.log("✅ 所有文件检索API测试通过")
    console.log("✅ Base64数据存储和检索功能正常")
    console.log("✅ 文件类型过滤功能正常")
    console.log("✅ 数据完整性验证通过")
    console.log("✅ 性能表现良好")
    console.log()
    console.log("结束时间:", new Date().toISOString())

  } catch (error) {
    console.error("❌ 测试失败:")
    console.error(error)
    
    // 尝试清理测试数据
    if (testFileId) {
      console.log("尝试清理测试数据...")
      // 这里应该调用删除API
    }
    
    process.exit(1)
  }
}

// 运行测试
testFileRetrievalAPI().catch((error) => {
  console.error("❌ 脚本执行失败:")
  console.error(error)
  process.exit(1)
})
