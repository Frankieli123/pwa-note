#!/usr/bin/env tsx

/**
 * Vercel Blob 文件上传 API 测试脚本
 * 
 * 使用方法:
 * npx tsx scripts/test-blob-upload.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { readFileSync, existsSync } from "fs"

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local')
console.log("加载环境变量文件:", envPath)
const envResult = config({ path: envPath })

if (envResult.error) {
  console.error("加载环境变量失败:", envResult.error)
  process.exit(1)
}

// 验证环境变量
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("❌ 错误: 未找到 BLOB_READ_WRITE_TOKEN 环境变量")
  process.exit(1)
}

const API_BASE_URL = 'http://localhost:3001'
const TEST_USER_ID = 'test_blob_user'

async function testUploadAPI() {
  console.log("🧪 测试 Vercel Blob 文件上传 API...")
  
  try {
    // 1. 测试获取配置信息
    console.log("\n📋 测试获取上传配置...")
    const configResponse = await fetch(`${API_BASE_URL}/api/files/upload-blob`)
    const configData = await configResponse.json()
    
    if (configResponse.ok) {
      console.log("✅ 配置获取成功:")
      console.log("  - 支持的图片类型:", configData.config.supportedTypes.images.join(', '))
      console.log("  - 支持的文档类型:", configData.config.supportedTypes.documents.slice(0, 3).join(', '), '...')
      console.log("  - 图片大小限制:", configData.config.maxSizes.images)
      console.log("  - 文档大小限制:", configData.config.maxSizes.documents)
    } else {
      console.error("❌ 配置获取失败:", configData)
      return false
    }
    
    // 2. 创建测试文件
    console.log("\n📄 创建测试文件...")
    const testContent = "这是一个测试文件，用于验证 Vercel Blob 上传功能。\n测试时间: " + new Date().toISOString()
    const testFile = new File([testContent], 'test-blob-upload.txt', { type: 'text/plain' })
    
    console.log(`📁 测试文件: ${testFile.name}`)
    console.log(`📏 文件大小: ${testFile.size} bytes`)
    console.log(`🏷️ 文件类型: ${testFile.type}`)
    
    // 3. 测试文件上传
    console.log("\n📤 测试文件上传...")
    const formData = new FormData()
    formData.append('file', testFile)
    formData.append('userId', TEST_USER_ID)
    
    const uploadResponse = await fetch(`${API_BASE_URL}/api/files/upload-blob`, {
      method: 'POST',
      body: formData
    })
    
    const uploadData = await uploadResponse.json()
    
    if (uploadResponse.ok) {
      console.log("✅ 文件上传成功!")
      console.log("  - 文件ID:", uploadData.file.id)
      console.log("  - Blob URL:", uploadData.file.blob_url)
      console.log("  - 文件名:", uploadData.file.name)
      console.log("  - 文件大小:", uploadData.file.size)
      
      // 4. 验证 Blob URL 可访问
      console.log("\n🔍 验证 Blob URL 可访问性...")
      const blobResponse = await fetch(uploadData.file.blob_url)
      
      if (blobResponse.ok) {
        const blobContent = await blobResponse.text()
        if (blobContent.includes("这是一个测试文件")) {
          console.log("✅ Blob URL 可访问，内容正确")
        } else {
          console.error("❌ Blob URL 内容不正确")
          return false
        }
      } else {
        console.error("❌ Blob URL 无法访问:", blobResponse.status)
        return false
      }
      
      return uploadData.file.id
    } else {
      console.error("❌ 文件上传失败:", uploadData)
      return false
    }
    
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error)
    return false
  }
}

async function testFileValidation() {
  console.log("\n🛡️ 测试文件验证...")
  
  try {
    // 测试不支持的文件类型
    console.log("📋 测试不支持的文件类型...")
    const invalidFile = new File(['test'], 'test.xyz', { type: 'application/xyz' })
    const formData = new FormData()
    formData.append('file', invalidFile)
    formData.append('userId', TEST_USER_ID)
    
    const response = await fetch(`${API_BASE_URL}/api/files/upload-blob`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (!response.ok && data.error === 'Unsupported file type') {
      console.log("✅ 文件类型验证正常工作")
    } else {
      console.error("❌ 文件类型验证失败")
      return false
    }
    
    // 测试过大文件（模拟）
    console.log("📋 测试文件大小验证...")
    const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' })
    const largeFormData = new FormData()
    largeFormData.append('file', largeFile)
    largeFormData.append('userId', TEST_USER_ID)
    
    const largeResponse = await fetch(`${API_BASE_URL}/api/files/upload-blob`, {
      method: 'POST',
      body: largeFormData
    })
    
    const largeData = await largeResponse.json()
    
    if (!largeResponse.ok && largeData.error === 'File size exceeded') {
      console.log("✅ 文件大小验证正常工作")
    } else {
      console.error("❌ 文件大小验证失败")
      return false
    }
    
    return true
    
  } catch (error) {
    console.error("❌ 验证测试失败:", error)
    return false
  }
}

async function testImageUpload() {
  console.log("\n🖼️ 测试图片上传...")
  
  try {
    // 创建一个简单的 1x1 像素 PNG 图片（Base64）
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=='
    const pngBuffer = Buffer.from(pngBase64, 'base64')
    const imageFile = new File([pngBuffer], 'test-image.png', { type: 'image/png' })
    
    console.log(`🖼️ 测试图片: ${imageFile.name}`)
    console.log(`📏 图片大小: ${imageFile.size} bytes`)
    
    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('userId', TEST_USER_ID)
    
    const response = await fetch(`${API_BASE_URL}/api/files/upload-blob`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log("✅ 图片上传成功!")
      console.log("  - 图片ID:", data.file.id)
      console.log("  - Blob URL:", data.file.blob_url)
      return data.file.id
    } else {
      console.error("❌ 图片上传失败:", data)
      return false
    }
    
  } catch (error) {
    console.error("❌ 图片上传测试失败:", error)
    return false
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("🚀 开始 Vercel Blob 上传 API 完整测试...")
  
  try {
    // 测试基本上传功能
    const fileId = await testUploadAPI()
    if (!fileId) {
      console.log("❌ 基本上传测试失败")
      return false
    }
    
    // 测试文件验证
    const validationResult = await testFileValidation()
    if (!validationResult) {
      console.log("❌ 文件验证测试失败")
      return false
    }
    
    // 测试图片上传
    const imageId = await testImageUpload()
    if (!imageId) {
      console.log("❌ 图片上传测试失败")
      return false
    }
    
    console.log("\n🎉 所有测试通过!")
    console.log("✅ Vercel Blob 上传 API 工作正常")
    console.log("✅ 文件验证功能正常")
    console.log("✅ 图片上传功能正常")
    console.log("✅ Blob URL 可正常访问")
    
    return true
    
  } catch (error) {
    console.error("❌ 测试执行失败:", error)
    return false
  }
}

// 检查开发服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/files/upload-blob`)
    return response.status !== 0
  } catch (error) {
    return false
  }
}

// 主函数
async function main() {
  console.log("🔍 检查开发服务器状态...")
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.error("❌ 开发服务器未运行")
    console.error("请先运行: npm run dev 或 pnpm dev")
    process.exit(1)
  }
  
  console.log("✅ 开发服务器正在运行")
  
  const success = await runAllTests()
  
  if (success) {
    console.log("\n✅ 所有测试成功完成！")
    process.exit(0)
  } else {
    console.log("\n❌ 部分测试失败！")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("脚本执行失败:", error)
  process.exit(1)
})
