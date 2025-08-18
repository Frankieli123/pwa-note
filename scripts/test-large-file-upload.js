/**
 * 大文件上传功能测试脚本
 * 在浏览器控制台中运行此脚本来测试上传功能
 */

// 测试配置
const TEST_CONFIG = {
  // 测试文件大小（字节）
  fileSizes: [
    1 * 1024 * 1024,      // 1MB
    10 * 1024 * 1024,     // 10MB
    50 * 1024 * 1024,     // 50MB
    100 * 1024 * 1024,    // 100MB
  ],
  // 测试用户ID（需要替换为实际用户ID）
  userId: 'test-user-id',
  // API端点
  endpoints: {
    presignedUrl: '/api/files/presigned-url',
    uploadComplete: '/api/files/upload-complete'
  }
}

/**
 * 创建测试文件
 */
function createTestFile(size, name = 'test-file.bin') {
  const buffer = new ArrayBuffer(size)
  const view = new Uint8Array(buffer)
  
  // 填充随机数据
  for (let i = 0; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256)
  }
  
  return new File([buffer], name, { type: 'application/octet-stream' })
}

/**
 * 测试预签名URL获取
 */
async function testPresignedUrl(file, userId) {
  console.log(`🔗 测试预签名URL获取 - 文件: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(TEST_CONFIG.endpoints.presignedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId: userId
      })
    })
    
    const endTime = Date.now()
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '获取预签名URL失败')
    }
    
    console.log(`✅ 预签名URL获取成功 - 耗时: ${endTime - startTime}ms`)
    return data.data
    
  } catch (error) {
    console.error(`❌ 预签名URL获取失败:`, error)
    throw error
  }
}

/**
 * 测试文件上传到MinIO
 */
async function testMinioUpload(file, presignedData, onProgress) {
  console.log(`📤 测试MinIO上传 - 文件: ${file.name}`)
  
  const startTime = Date.now()
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    // 监听上传进度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100
        onProgress?.(progress)
      }
    })
    
    xhr.addEventListener('load', () => {
      const endTime = Date.now()
      const duration = endTime - startTime
      const speed = (file.size / 1024 / 1024) / (duration / 1000) // MB/s
      
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(`✅ MinIO上传成功 - 耗时: ${duration}ms, 速度: ${speed.toFixed(2)}MB/s`)
        resolve()
      } else {
        reject(new Error(`MinIO上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'))
    })
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时'))
    })
    
    // 配置请求
    xhr.open('PUT', presignedData.uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.timeout = 300000 // 5分钟超时
    
    // 开始上传
    xhr.send(file)
  })
}

/**
 * 测试上传完成通知
 */
async function testUploadComplete(file, presignedData, userId) {
  console.log(`💾 测试上传完成通知 - 文件: ${file.name}`)
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(TEST_CONFIG.endpoints.uploadComplete, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        objectKey: presignedData.objectKey,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        userId: userId,
        fileUrl: presignedData.fileUrl,
        thumbnailUrl: null
      })
    })
    
    const endTime = Date.now()
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '保存文件信息失败')
    }
    
    console.log(`✅ 上传完成通知成功 - 耗时: ${endTime - startTime}ms`)
    return data.file
    
  } catch (error) {
    console.error(`❌ 上传完成通知失败:`, error)
    throw error
  }
}

/**
 * 完整的文件上传测试
 */
async function testFileUpload(file, userId) {
  console.log(`\n🚀 开始测试文件上传 - ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
  
  const testStartTime = Date.now()
  let progress = 0
  
  try {
    // 1. 获取预签名URL
    const presignedData = await testPresignedUrl(file, userId)
    
    // 2. 上传到MinIO
    await testMinioUpload(file, presignedData, (p) => {
      progress = p
      if (p % 10 === 0 || p === 100) {
        console.log(`📊 上传进度: ${p.toFixed(1)}%`)
      }
    })
    
    // 3. 通知后端保存元数据
    const savedFile = await testUploadComplete(file, presignedData, userId)
    
    const testEndTime = Date.now()
    const totalDuration = testEndTime - testStartTime
    
    console.log(`🎉 文件上传测试完成 - 总耗时: ${totalDuration}ms`)
    console.log(`📋 保存的文件信息:`, savedFile)
    
    return {
      success: true,
      file: savedFile,
      duration: totalDuration,
      size: file.size
    }
    
  } catch (error) {
    console.error(`❌ 文件上传测试失败:`, error)
    return {
      success: false,
      error: error.message,
      progress: progress
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(userId = TEST_CONFIG.userId) {
  console.log('🧪 开始大文件上传功能测试')
  console.log(`👤 测试用户ID: ${userId}`)
  
  const results = []
  
  for (const size of TEST_CONFIG.fileSizes) {
    const fileName = `test-${(size / 1024 / 1024).toFixed(0)}MB.bin`
    const testFile = createTestFile(size, fileName)
    
    const result = await testFileUpload(testFile, userId)
    results.push({
      size: size,
      fileName: fileName,
      ...result
    })
    
    // 测试间隔
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 输出测试报告
  console.log('\n📊 测试报告:')
  console.table(results.map(r => ({
    '文件大小': `${(r.size / 1024 / 1024).toFixed(0)}MB`,
    '文件名': r.fileName,
    '测试结果': r.success ? '✅ 成功' : '❌ 失败',
    '耗时(ms)': r.duration || 'N/A',
    '错误信息': r.error || 'N/A'
  })))
  
  const successCount = results.filter(r => r.success).length
  console.log(`\n🏆 测试总结: ${successCount}/${results.length} 个测试通过`)
  
  return results
}

// 导出测试函数
window.testLargeFileUpload = {
  createTestFile,
  testPresignedUrl,
  testMinioUpload,
  testUploadComplete,
  testFileUpload,
  runAllTests,
  TEST_CONFIG
}

console.log('📝 大文件上传测试脚本已加载')
console.log('💡 使用方法:')
console.log('   1. 设置用户ID: window.testLargeFileUpload.TEST_CONFIG.userId = "your-user-id"')
console.log('   2. 运行所有测试: await window.testLargeFileUpload.runAllTests()')
console.log('   3. 单独测试: await window.testLargeFileUpload.testFileUpload(file, userId)')
