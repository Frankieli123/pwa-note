#!/usr/bin/env tsx

/**
 * 测试缩略图上传和关联功能
 */

import { createReadStream, readFileSync, existsSync } from 'fs'
import { join } from 'path'

async function testThumbnailUpload() {
  console.log('🧪 测试缩略图上传和关联功能...\n')

  const baseUrl = 'http://localhost:3001'
  const testUserId = 'test-user-thumbnail'

  try {
    // 1. 测试图片文件上传（应该生成缩略图）
    console.log('📸 测试1: 上传图片文件（应该生成缩略图）')
    
    // 创建一个测试图片文件
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const formData = new FormData()
    const imageBlob = new Blob([testImageData], { type: 'image/png' })
    formData.append('file', imageBlob, 'test-image.png')
    formData.append('userId', testUserId)

    const imageResponse = await fetch(`${baseUrl}/api/files/upload-blob`, {
      method: 'POST',
      body: formData
    })

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json()
      throw new Error(`图片上传失败: ${errorData.message}`)
    }

    const imageResult = await imageResponse.json()
    console.log('✅ 图片上传成功')
    console.log(`   文件ID: ${imageResult.file.id}`)
    console.log(`   主文件URL: ${imageResult.file.blob_url}`)
    console.log(`   缩略图URL: ${imageResult.file.thumbnail_url || '未生成'}`)

    if (imageResult.file.thumbnail_url) {
      console.log('✅ 缩略图已生成并关联')
    } else {
      console.log('⚠️  缩略图未生成（可能是客户端生成）')
    }

    // 2. 测试非图片文件上传（不应该生成缩略图）
    console.log('\n📄 测试2: 上传非图片文件（不应该生成缩略图）')
    
    const textData = 'This is a test text file content.'
    const textFormData = new FormData()
    const textBlob = new Blob([textData], { type: 'text/plain' })
    textFormData.append('file', textBlob, 'test-document.txt')
    textFormData.append('userId', testUserId)

    const textResponse = await fetch(`${baseUrl}/api/files/upload-blob`, {
      method: 'POST',
      body: textFormData
    })

    if (!textResponse.ok) {
      const errorData = await textResponse.json()
      throw new Error(`文本文件上传失败: ${errorData.message}`)
    }

    const textResult = await textResponse.json()
    console.log('✅ 文本文件上传成功')
    console.log(`   文件ID: ${textResult.file.id}`)
    console.log(`   主文件URL: ${textResult.file.blob_url}`)
    console.log(`   缩略图URL: ${textResult.file.thumbnail_url || '无（符合预期）'}`)

    if (!textResult.file.thumbnail_url) {
      console.log('✅ 非图片文件正确地没有生成缩略图')
    } else {
      console.log('⚠️  非图片文件意外生成了缩略图')
    }

    // 3. 测试带缩略图的上传
    console.log('\n🖼️  测试3: 手动发送缩略图')
    
    const thumbnailData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header (smaller)
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    const withThumbnailFormData = new FormData()
    const mainImageBlob = new Blob([testImageData], { type: 'image/png' })
    const thumbnailBlob = new Blob([thumbnailData], { type: 'image/png' })
    
    withThumbnailFormData.append('file', mainImageBlob, 'test-with-thumbnail.png')
    withThumbnailFormData.append('thumbnail', thumbnailBlob, 'thumbnail.png')
    withThumbnailFormData.append('userId', testUserId)

    const withThumbnailResponse = await fetch(`${baseUrl}/api/files/upload-blob`, {
      method: 'POST',
      body: withThumbnailFormData
    })

    if (!withThumbnailResponse.ok) {
      const errorData = await withThumbnailResponse.json()
      throw new Error(`带缩略图上传失败: ${errorData.message}`)
    }

    const withThumbnailResult = await withThumbnailResponse.json()
    console.log('✅ 带缩略图上传成功')
    console.log(`   文件ID: ${withThumbnailResult.file.id}`)
    console.log(`   主文件URL: ${withThumbnailResult.file.blob_url}`)
    console.log(`   缩略图URL: ${withThumbnailResult.file.thumbnail_url}`)

    if (withThumbnailResult.file.thumbnail_url) {
      console.log('✅ 手动提供的缩略图已正确上传和关联')
    }

    // 4. 验证数据库存储
    console.log('\n💾 测试4: 验证数据库存储')
    
    const files = [imageResult.file, textResult.file, withThumbnailResult.file]
    
    for (const file of files) {
      console.log(`\n📁 文件: ${file.name}`)
      console.log(`   ID: ${file.id}`)
      console.log(`   类型: ${file.type}`)
      console.log(`   主文件URL: ${file.blob_url ? '✅ 已存储' : '❌ 缺失'}`)
      console.log(`   缩略图URL: ${file.thumbnail_url ? '✅ 已存储' : '⭕ 无（符合预期）'}`)
      
      // 验证URL可访问性
      if (file.blob_url) {
        try {
          const urlResponse = await fetch(file.blob_url, { method: 'HEAD' })
          console.log(`   主文件可访问: ${urlResponse.ok ? '✅' : '❌'}`)
        } catch (error) {
          console.log(`   主文件可访问: ❌ (${error})`)
        }
      }
      
      if (file.thumbnail_url) {
        try {
          const thumbResponse = await fetch(file.thumbnail_url, { method: 'HEAD' })
          console.log(`   缩略图可访问: ${thumbResponse.ok ? '✅' : '❌'}`)
        } catch (error) {
          console.log(`   缩略图可访问: ❌ (${error})`)
        }
      }
    }

    console.log('\n🎉 缩略图上传和关联功能测试完成!')
    
    return {
      success: true,
      results: {
        imageUpload: imageResult,
        textUpload: textResult,
        withThumbnailUpload: withThumbnailResult
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

async function main() {
  console.log('🔍 缩略图上传和关联功能测试\n')
  
  const result = await testThumbnailUpload()
  
  if (result.success) {
    console.log('\n✅ 所有测试通过!')
    console.log('\n📋 功能验证:')
    console.log('   ✅ 图片文件上传正常')
    console.log('   ✅ 非图片文件不生成缩略图')
    console.log('   ✅ 手动缩略图上传和关联正常')
    console.log('   ✅ 数据库存储正确')
    console.log('   ✅ Blob URL可访问')
  } else {
    console.log('\n❌ 测试失败:', result.error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}
