/**
 * 预签名URL测试脚本
 * 用于测试预签名URL的生成和使用
 */

/**
 * 测试预签名URL生成
 */
async function testPresignedUrlGeneration() {
  console.log('🧪 测试预签名URL生成...')
  
  const testData = {
    fileName: 'test-file.txt',
    fileType: 'text/plain',
    fileSize: 1024,
    userId: 'test-user'
  }
  
  try {
    const response = await fetch('/api/files/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || '预签名URL生成失败')
    }
    
    console.log('✅ 预签名URL生成成功')
    console.log('📋 返回数据:', data.data)
    
    return data.data
  } catch (error) {
    console.error('❌ 预签名URL生成失败:', error)
    throw error
  }
}

/**
 * 测试预签名URL上传
 */
async function testPresignedUrlUpload(presignedData) {
  console.log('🧪 测试预签名URL上传...')
  
  // 创建测试文件
  const testContent = 'This is a test file for MinIO upload'
  const testFile = new Blob([testContent], { type: 'text/plain' })
  
  try {
    const response = await fetch(presignedData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: testFile
    })
    
    console.log('📊 上传响应状态:', response.status, response.statusText)
    console.log('📊 响应头:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      console.log('✅ 预签名URL上传成功')
      return true
    } else {
      const errorText = await response.text()
      console.error('❌ 预签名URL上传失败:', errorText)
      return false
    }
  } catch (error) {
    console.error('❌ 预签名URL上传失败:', error)
    return false
  }
}

/**
 * 测试文件验证
 */
async function testFileVerification(presignedData) {
  console.log('🧪 测试文件验证...')
  
  try {
    const response = await fetch(presignedData.fileUrl, {
      method: 'HEAD'
    })
    
    if (response.ok) {
      console.log('✅ 文件验证成功，文件已存在于MinIO')
      console.log('📊 文件信息:', {
        size: response.headers.get('content-length'),
        type: response.headers.get('content-type'),
        etag: response.headers.get('etag')
      })
      return true
    } else {
      console.error('❌ 文件验证失败:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ 文件验证失败:', error)
    return false
  }
}

/**
 * 完整的预签名URL测试流程
 */
async function runPresignedUrlTest() {
  console.log('🚀 开始预签名URL完整测试...')
  
  try {
    // 1. 生成预签名URL
    const presignedData = await testPresignedUrlGeneration()
    
    // 2. 使用预签名URL上传文件
    const uploadSuccess = await testPresignedUrlUpload(presignedData)
    
    if (!uploadSuccess) {
      console.error('❌ 上传失败，停止测试')
      return false
    }
    
    // 3. 验证文件是否成功上传
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    const verifySuccess = await testFileVerification(presignedData)
    
    if (verifySuccess) {
      console.log('🎉 预签名URL测试完全成功！')
      return true
    } else {
      console.error('❌ 文件验证失败')
      return false
    }
    
  } catch (error) {
    console.error('❌ 预签名URL测试失败:', error)
    return false
  }
}

/**
 * 调试预签名URL
 */
function debugPresignedUrl(url) {
  console.log('🔍 调试预签名URL...')
  
  try {
    const urlObj = new URL(url)
    const params = Object.fromEntries(urlObj.searchParams.entries())
    
    console.log('📋 URL组件:')
    console.log('  协议:', urlObj.protocol)
    console.log('  主机:', urlObj.host)
    console.log('  路径:', urlObj.pathname)
    
    console.log('📋 查询参数:')
    Object.entries(params).forEach(([key, value]) => {
      console.log(`  ${key}:`, value)
    })
    
    // 检查必需的参数
    const requiredParams = [
      'X-Amz-Algorithm',
      'X-Amz-Credential', 
      'X-Amz-Date',
      'X-Amz-Expires',
      'X-Amz-SignedHeaders',
      'X-Amz-Signature'
    ]
    
    const missingParams = requiredParams.filter(param => !params[param])
    
    if (missingParams.length > 0) {
      console.error('❌ 缺少必需参数:', missingParams)
    } else {
      console.log('✅ 所有必需参数都存在')
    }
    
    // 检查时间戳
    const date = params['X-Amz-Date']
    if (date) {
      const timestamp = new Date(
        date.slice(0, 4) + '-' + 
        date.slice(4, 6) + '-' + 
        date.slice(6, 8) + 'T' + 
        date.slice(9, 11) + ':' + 
        date.slice(11, 13) + ':' + 
        date.slice(13, 15) + 'Z'
      )
      const now = new Date()
      const diff = Math.abs(now.getTime() - timestamp.getTime()) / 1000
      
      console.log('📅 时间戳信息:')
      console.log('  URL时间:', timestamp.toISOString())
      console.log('  当前时间:', now.toISOString())
      console.log('  时间差:', diff, '秒')
      
      if (diff > 300) { // 5分钟
        console.warn('⚠️ 时间戳可能不准确，差异超过5分钟')
      }
    }
    
  } catch (error) {
    console.error('❌ URL解析失败:', error)
  }
}

// 导出函数
if (typeof window !== 'undefined') {
  window.testPresignedUrl = {
    testPresignedUrlGeneration,
    testPresignedUrlUpload,
    testFileVerification,
    runPresignedUrlTest,
    debugPresignedUrl
  }
  
  console.log('📝 预签名URL测试脚本已加载')
  console.log('💡 使用方法:')
  console.log('  完整测试: await window.testPresignedUrl.runPresignedUrlTest()')
  console.log('  单独测试: await window.testPresignedUrl.testPresignedUrlGeneration()')
  console.log('  调试URL: window.testPresignedUrl.debugPresignedUrl(url)')
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testPresignedUrlGeneration,
    testPresignedUrlUpload,
    testFileVerification,
    runPresignedUrlTest,
    debugPresignedUrl
  }
}
