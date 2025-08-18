/**
 * 测试大文件上传API的脚本
 * 用于验证预签名URL生成和上传完成通知API
 */

const BASE_URL = 'http://localhost:3000'

// 测试数据
const testFile = {
  fileName: 'test-large-file.pdf',
  fileType: 'application/pdf',
  fileSize: 200 * 1024 * 1024, // 200MB
  userId: 'test-user-123'
}

const testSmallFile = {
  fileName: 'test-small-file.jpg',
  fileType: 'image/jpeg',
  fileSize: 2 * 1024 * 1024, // 2MB
  userId: 'test-user-123'
}

/**
 * 测试预签名URL生成API
 */
async function testPresignedUrlAPI() {
  console.log('\n🧪 测试预签名URL生成API...')
  
  try {
    // 测试大文件
    console.log('📋 测试大文件 (200MB)...')
    const response = await fetch(`${BASE_URL}/api/files/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testFile)
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ 大文件预签名URL生成成功')
      console.log('📍 对象键:', data.data.objectKey)
      console.log('🔗 上传URL:', data.data.uploadUrl.substring(0, 100) + '...')
      console.log('📄 文件URL:', data.data.fileUrl)
    } else {
      console.log('❌ 大文件预签名URL生成失败:', data.message)
    }

    // 测试小文件
    console.log('\n📋 测试小文件 (2MB)...')
    const smallResponse = await fetch(`${BASE_URL}/api/files/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSmallFile)
    })

    const smallData = await smallResponse.json()
    
    if (smallResponse.ok && smallData.success) {
      console.log('✅ 小文件预签名URL生成成功')
      console.log('📍 对象键:', smallData.data.objectKey)
    } else {
      console.log('❌ 小文件预签名URL生成失败:', smallData.message)
    }

    return { success: true, largeFileData: data.data, smallFileData: smallData.data }

  } catch (error) {
    console.log('❌ 预签名URL API测试失败:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 测试上传完成通知API
 */
async function testUploadCompleteAPI(presignedData) {
  console.log('\n🧪 测试上传完成通知API...')
  
  try {
    const completeData = {
      objectKey: presignedData.objectKey,
      fileName: testFile.fileName,
      fileType: testFile.fileType,
      fileSize: testFile.fileSize,
      userId: testFile.userId,
      fileUrl: presignedData.fileUrl,
      thumbnailUrl: null
    }

    const response = await fetch(`${BASE_URL}/api/files/upload-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(completeData)
    })

    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('✅ 上传完成通知成功')
      console.log('📄 文件ID:', data.file.id)
      console.log('📝 文件名:', data.file.name)
      console.log('📊 文件大小:', data.file.size)
    } else {
      console.log('❌ 上传完成通知失败:', data.message)
    }

    return { success: response.ok, data }

  } catch (error) {
    console.log('❌ 上传完成API测试失败:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('\n🧪 测试错误处理...')
  
  try {
    // 测试超大文件 (600MB)
    console.log('📋 测试超大文件 (600MB)...')
    const oversizeFile = {
      ...testFile,
      fileSize: 600 * 1024 * 1024 // 600MB，超过500MB限制
    }

    const response = await fetch(`${BASE_URL}/api/files/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(oversizeFile)
    })

    const data = await response.json()
    
    if (!response.ok && data.error === 'File size exceeded') {
      console.log('✅ 文件大小限制验证正常')
    } else {
      console.log('❌ 文件大小限制验证失败')
    }

    // 测试缺少参数
    console.log('📋 测试缺少参数...')
    const incompleteData = {
      fileName: 'test.pdf'
      // 缺少其他必需参数
    }

    const incompleteResponse = await fetch(`${BASE_URL}/api/files/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(incompleteData)
    })

    const incompleteResult = await incompleteResponse.json()
    
    if (!incompleteResponse.ok && incompleteResult.error === 'Missing parameters') {
      console.log('✅ 参数验证正常')
    } else {
      console.log('❌ 参数验证失败')
    }

  } catch (error) {
    console.log('❌ 错误处理测试失败:', error.message)
  }
}

/**
 * 测试配置API
 */
async function testConfigAPIs() {
  console.log('\n🧪 测试配置API...')
  
  try {
    // 测试预签名URL配置
    const presignedConfigResponse = await fetch(`${BASE_URL}/api/files/presigned-url`)
    const presignedConfig = await presignedConfigResponse.json()
    
    if (presignedConfigResponse.ok && presignedConfig.success) {
      console.log('✅ 预签名URL配置API正常')
      console.log('📊 最大文件大小:', presignedConfig.config.maxFileSize)
    } else {
      console.log('❌ 预签名URL配置API失败')
    }

    // 测试上传完成配置
    const completeConfigResponse = await fetch(`${BASE_URL}/api/files/upload-complete`)
    const completeConfig = await completeConfigResponse.json()
    
    if (completeConfigResponse.ok && completeConfig.success) {
      console.log('✅ 上传完成配置API正常')
      console.log('📋 必需字段:', completeConfig.config.requiredFields.join(', '))
    } else {
      console.log('❌ 上传完成配置API失败')
    }

  } catch (error) {
    console.log('❌ 配置API测试失败:', error.message)
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试大文件上传API...')
  console.log('🌐 测试服务器:', BASE_URL)
  
  // 测试配置API
  await testConfigAPIs()
  
  // 测试预签名URL生成
  const presignedResult = await testPresignedUrlAPI()
  
  if (presignedResult.success && presignedResult.largeFileData) {
    // 测试上传完成通知（使用模拟数据，因为我们没有实际上传文件）
    await testUploadCompleteAPI(presignedResult.largeFileData)
  }
  
  // 测试错误处理
  await testErrorHandling()
  
  console.log('\n🎉 测试完成!')
  console.log('\n📝 测试总结:')
  console.log('- 预签名URL生成API: 已测试')
  console.log('- 上传完成通知API: 已测试')
  console.log('- 错误处理: 已测试')
  console.log('- 配置API: 已测试')
  console.log('\n⚠️  注意: 这只是API测试，实际文件上传需要在浏览器中测试')
}

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, testPresignedUrlAPI, testUploadCompleteAPI }
} else {
  runTests().catch(console.error)
}
