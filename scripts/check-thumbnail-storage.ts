#!/usr/bin/env tsx

/**
 * 检查缩略图存储情况和空间占用
 */

import { listUserFiles, getFileInfo } from '@/lib/blob-utils'

async function checkThumbnailStorage() {
  console.log('🔍 检查缩略图存储情况...\n')

  try {
    // 模拟用户ID（实际使用时需要真实用户ID）
    const testUserId = 'test-user'
    
    console.log('📂 获取用户文件列表...')
    const files = await listUserFiles(testUserId)
    
    if (files.length === 0) {
      console.log('📭 没有找到文件')
      return
    }

    console.log(`📊 找到 ${files.length} 个文件\n`)

    let totalSize = 0
    let thumbnailSize = 0
    let thumbnailCount = 0
    let mainFileSize = 0
    let mainFileCount = 0

    for (const file of files) {
      console.log(`📄 文件: ${file.pathname}`)
      console.log(`   大小: ${(file.size / 1024).toFixed(2)} KB`)
      console.log(`   URL: ${file.url}`)
      
      totalSize += file.size

      if (file.pathname.includes('/thumbnails/')) {
        thumbnailSize += file.size
        thumbnailCount++
        console.log(`   🖼️  这是缩略图文件`)
      } else {
        mainFileSize += file.size
        mainFileCount++
        console.log(`   📁 这是主文件`)
      }
      
      console.log('')
    }

    console.log('📈 存储统计:')
    console.log(`   总文件数: ${files.length}`)
    console.log(`   主文件数: ${mainFileCount}`)
    console.log(`   缩略图数: ${thumbnailCount}`)
    console.log(`   总大小: ${(totalSize / 1024).toFixed(2)} KB`)
    console.log(`   主文件大小: ${(mainFileSize / 1024).toFixed(2)} KB`)
    console.log(`   缩略图大小: ${(thumbnailSize / 1024).toFixed(2)} KB`)
    
    if (thumbnailCount > 0) {
      console.log(`   平均缩略图大小: ${(thumbnailSize / thumbnailCount / 1024).toFixed(2)} KB`)
      console.log(`   缩略图占比: ${((thumbnailSize / totalSize) * 100).toFixed(1)}%`)
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

// 模拟缩略图生成来估算大小
async function simulateThumbnailGeneration() {
  console.log('\n🧪 模拟缩略图生成...')
  
  try {
    // 创建一个测试canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 模拟不同尺寸的缩略图
    const testSizes = [
      { width: 400, height: 300, name: '400x300' },
      { width: 300, height: 400, name: '300x400' },
      { width: 400, height: 400, name: '400x400' },
      { width: 200, height: 150, name: '200x150' }
    ]
    
    console.log('📏 测试不同尺寸的缩略图大小:')
    
    for (const size of testSizes) {
      canvas.width = size.width
      canvas.height = size.height
      
      // 绘制一个简单的测试图像
      if (ctx) {
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, size.width, size.height)
        ctx.fillStyle = '#333'
        ctx.fillRect(10, 10, size.width - 20, size.height - 20)
      }
      
      // 转换为Blob并检查大小
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      })
      
      if (blob) {
        console.log(`   ${size.name}: ${(blob.size / 1024).toFixed(2)} KB`)
      }
    }
    
  } catch (error) {
    console.error('❌ 模拟失败:', error)
  }
}

async function main() {
  console.log('🔍 缩略图存储分析工具\n')
  
  // 检查实际存储
  await checkThumbnailStorage()
  
  // 模拟缩略图生成（仅在浏览器环境中）
  if (typeof document !== 'undefined') {
    await simulateThumbnailGeneration()
  } else {
    console.log('\n💡 缩略图大小估算:')
    console.log('   400x300 JPEG (质量0.8): 约 15-30 KB')
    console.log('   300x400 JPEG (质量0.8): 约 15-30 KB') 
    console.log('   400x400 JPEG (质量0.8): 约 20-40 KB')
    console.log('   200x150 JPEG (质量0.8): 约 8-15 KB')
  }
  
  console.log('\n📋 缩略图存储说明:')
  console.log('   📍 存储位置: Vercel Blob (云存储)')
  console.log('   📁 路径格式: {userId}/thumbnails/{timestamp}_{randomId}_{baseName}_thumb.jpg')
  console.log('   🗂️  数据库字段: thumbnail_url')
  console.log('   🔄 删除策略: 删除主文件时自动删除缩略图')
  console.log('   💾 空间占用: 通常为原图的 5-15%')
}

if (require.main === module) {
  main().catch(console.error)
}
