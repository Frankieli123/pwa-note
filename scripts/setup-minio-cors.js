/**
 * MinIO CORS 配置脚本
 * 用于设置MinIO服务器的CORS配置以支持前端直接上传
 */

// MinIO配置
const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
  region: process.env.MINIO_REGION || 'us-east-1'
}

/**
 * 生成AWS4签名用于MinIO API调用
 */
function createAwsSignature(method, path, headers, payload = '') {
  const crypto = require('crypto')
  
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  // 创建规范请求
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
    .join('')

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';')

  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex')

  const canonicalRequest = [
    method,
    path,
    '', // 查询字符串
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  // 创建签名字符串
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${MINIO_CONFIG.region}/s3/aws4_request`
  const stringToSign = [
    algorithm,
    timeStamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n')

  // 计算签名
  const kDate = crypto.createHmac('sha256', `AWS4${MINIO_CONFIG.secretKey}`).update(dateStamp).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(MINIO_CONFIG.region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest()
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const credential = `${MINIO_CONFIG.accessKey}/${dateStamp}/${MINIO_CONFIG.region}/s3/aws4_request`
  
  return `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

/**
 * 设置MinIO bucket的CORS配置
 */
async function setupCorsConfiguration() {
  console.log('🔧 开始设置MinIO CORS配置...')
  
  const corsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>OPTIONS</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <ExposeHeader>x-amz-server-side-encryption</ExposeHeader>
    <ExposeHeader>x-amz-version-id</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Range</ExposeHeader>
    <ExposeHeader>Accept-Ranges</ExposeHeader>
    <ExposeHeader>Access-Control-Allow-Origin</ExposeHeader>
    <ExposeHeader>Access-Control-Allow-Methods</ExposeHeader>
    <ExposeHeader>Access-Control-Allow-Headers</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`

  const path = `/${MINIO_CONFIG.bucketName}?cors`
  const now = new Date()
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  const headers = {
    'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
    'x-amz-date': timeStamp,
    'Content-Type': 'application/xml',
    'Content-Length': corsConfig.length.toString()
  }

  const authorization = createAwsSignature('PUT', path, headers, corsConfig)
  headers['Authorization'] = authorization

  try {
    const response = await fetch(`${MINIO_CONFIG.endpoint}${path}`, {
      method: 'PUT',
      headers,
      body: corsConfig
    })

    if (response.ok) {
      console.log('✅ CORS配置设置成功')
      return true
    } else {
      const errorText = await response.text()
      console.error(`❌ CORS配置设置失败: ${response.status} ${response.statusText}`)
      console.error('错误详情:', errorText)
      return false
    }
  } catch (error) {
    console.error('❌ CORS配置设置失败:', error)
    return false
  }
}

/**
 * 检查MinIO bucket的CORS配置
 */
async function checkCorsConfiguration() {
  console.log('🔍 检查MinIO CORS配置...')
  
  const path = `/${MINIO_CONFIG.bucketName}?cors`
  const now = new Date()
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  const headers = {
    'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
    'x-amz-date': timeStamp
  }

  const authorization = createAwsSignature('GET', path, headers)
  headers['Authorization'] = authorization

  try {
    const response = await fetch(`${MINIO_CONFIG.endpoint}${path}`, {
      method: 'GET',
      headers
    })

    if (response.ok) {
      const corsConfig = await response.text()
      console.log('✅ 当前CORS配置:')
      console.log(corsConfig)
      return corsConfig
    } else if (response.status === 404) {
      console.log('⚠️ 未找到CORS配置')
      return null
    } else {
      const errorText = await response.text()
      console.error(`❌ 检查CORS配置失败: ${response.status} ${response.statusText}`)
      console.error('错误详情:', errorText)
      return null
    }
  } catch (error) {
    console.error('❌ 检查CORS配置失败:', error)
    return null
  }
}

/**
 * 检查bucket是否存在
 */
async function checkBucketExists() {
  console.log('🔍 检查bucket是否存在...')
  
  const path = `/${MINIO_CONFIG.bucketName}`
  const now = new Date()
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  const headers = {
    'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
    'x-amz-date': timeStamp
  }

  const authorization = createAwsSignature('HEAD', path, headers)
  headers['Authorization'] = authorization

  try {
    const response = await fetch(`${MINIO_CONFIG.endpoint}${path}`, {
      method: 'HEAD',
      headers
    })

    if (response.ok) {
      console.log('✅ Bucket存在')
      return true
    } else if (response.status === 404) {
      console.log('⚠️ Bucket不存在')
      return false
    } else {
      console.error(`❌ 检查bucket失败: ${response.status} ${response.statusText}`)
      return false
    }
  } catch (error) {
    console.error('❌ 检查bucket失败:', error)
    return false
  }
}

/**
 * 创建bucket
 */
async function createBucket() {
  console.log('🔧 创建bucket...')
  
  const path = `/${MINIO_CONFIG.bucketName}`
  const now = new Date()
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  const headers = {
    'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
    'x-amz-date': timeStamp
  }

  const authorization = createAwsSignature('PUT', path, headers)
  headers['Authorization'] = authorization

  try {
    const response = await fetch(`${MINIO_CONFIG.endpoint}${path}`, {
      method: 'PUT',
      headers
    })

    if (response.ok || response.status === 409) {
      console.log('✅ Bucket创建成功或已存在')
      return true
    } else {
      const errorText = await response.text()
      console.error(`❌ 创建bucket失败: ${response.status} ${response.statusText}`)
      console.error('错误详情:', errorText)
      return false
    }
  } catch (error) {
    console.error('❌ 创建bucket失败:', error)
    return false
  }
}

/**
 * 完整的MinIO设置流程
 */
async function setupMinio() {
  console.log('🚀 开始MinIO设置流程...')
  console.log('配置信息:', {
    endpoint: MINIO_CONFIG.endpoint,
    bucketName: MINIO_CONFIG.bucketName,
    region: MINIO_CONFIG.region,
    accessKey: MINIO_CONFIG.accessKey ? '已设置' : '未设置',
    secretKey: MINIO_CONFIG.secretKey ? '已设置' : '未设置'
  })

  // 1. 检查bucket是否存在
  const bucketExists = await checkBucketExists()
  
  // 2. 如果不存在则创建
  if (!bucketExists) {
    const created = await createBucket()
    if (!created) {
      console.error('❌ 无法创建bucket，停止设置')
      return false
    }
  }

  // 3. 检查CORS配置
  const corsConfig = await checkCorsConfiguration()
  
  // 4. 如果没有CORS配置或配置不正确，则设置
  if (!corsConfig || !corsConfig.includes('AllowedMethod')) {
    const corsSet = await setupCorsConfiguration()
    if (!corsSet) {
      console.error('❌ 无法设置CORS配置')
      return false
    }
  }

  console.log('🎉 MinIO设置完成！')
  return true
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupMinio,
    checkCorsConfiguration,
    setupCorsConfiguration,
    checkBucketExists,
    createBucket,
    MINIO_CONFIG
  }
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  window.minioSetup = {
    setupMinio,
    checkCorsConfiguration,
    setupCorsConfiguration,
    checkBucketExists,
    createBucket,
    MINIO_CONFIG
  }
  
  console.log('📝 MinIO设置脚本已加载')
  console.log('💡 使用方法: await window.minioSetup.setupMinio()')
}
