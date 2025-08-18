/**
 * MinIO 对象存储工具函数
 * 用于处理文件上传到 MinIO 存储
 */

import crypto from 'crypto'

/**
 * MinIO 配置
 */
const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
  region: process.env.MINIO_REGION || 'us-east-1'
}

/**
 * 支持的文件类型配置
 */
export const SUPPORTED_FILE_TYPES = {
  images: {
    'image/jpeg': { maxSize: 5 * 1024 * 1024, extensions: ['.jpg', '.jpeg'] },
    'image/png': { maxSize: 5 * 1024 * 1024, extensions: ['.png'] },
    'image/gif': { maxSize: 5 * 1024 * 1024, extensions: ['.gif'] },
    'image/webp': { maxSize: 5 * 1024 * 1024, extensions: ['.webp'] },
  },
  documents: {
    'application/pdf': { maxSize: 20 * 1024 * 1024, extensions: ['.pdf'] },
    'application/msword': { maxSize: 20 * 1024 * 1024, extensions: ['.doc'] },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      maxSize: 20 * 1024 * 1024,
      extensions: ['.docx']
    },
    'text/plain': { maxSize: 20 * 1024 * 1024, extensions: ['.txt'] },
    'application/vnd.ms-excel': { maxSize: 20 * 1024 * 1024, extensions: ['.xls'] },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      maxSize: 20 * 1024 * 1024,
      extensions: ['.xlsx']
    },
    'text/csv': { maxSize: 20 * 1024 * 1024, extensions: ['.csv'] },
  }
}

/**
 * 获取所有支持的文件类型
 */
export function getAllSupportedTypes(): string[] {
  return [
    ...Object.keys(SUPPORTED_FILE_TYPES.images),
    ...Object.keys(SUPPORTED_FILE_TYPES.documents)
  ]
}

/**
 * 文件大小限制配置（500MB）
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * 验证文件类型是否支持（现在支持所有类型）
 */
export function isFileTypeSupported(mimeType: string): boolean {
  return true // 不限制文件格式
}

/**
 * 验证文件大小是否符合要求
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制，最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    }
  }
  return { valid: true }
}

/**
 * 验证文件大小是否符合要求（接受数字参数）
 */
export function validateFileSizeByNumber(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制，最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    }
  }
  return { valid: true }
}

/**
 * 检查文件类型是否为图片
 */
export function isImageFile(mimeType: string): boolean {
  return Object.keys(SUPPORTED_FILE_TYPES.images).includes(mimeType)
}

/**
 * 生成 AWS4-HMAC-SHA256 签名
 */
function createAwsSignature(
  method: string,
  path: string,
  headers: Record<string, string>,
  payload: string = ''
): string {
  const accessKey = MINIO_CONFIG.accessKey
  const secretKey = MINIO_CONFIG.secretKey
  const region = MINIO_CONFIG.region
  const service = 's3'

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
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  // 创建签名字符串
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    timeStamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n')

  // 计算签名
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  return `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

/**
 * 创建 MinIO bucket（如果不存在）
 */
async function ensureBucketExists(): Promise<void> {
  try {
    const path = `/${MINIO_CONFIG.bucketName}`
    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('PUT', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(`${MINIO_CONFIG.endpoint}${path}`, {
      method: 'PUT',
      headers
    })

    if (response.ok || response.status === 409) {
      // 409 表示 bucket 已存在，这也是成功的情况
      console.log('MinIO bucket 已确保存在')
    } else {
      console.warn(`创建 bucket 失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.warn('确保 bucket 存在时出错:', error)
    // 不抛出错误，让上传继续尝试
  }
}

/**
 * 上传文件到 MinIO
 */
export async function uploadFileToMinio(
  file: File,
  userId: string,
  folder: string = 'files'
): Promise<{ url: string; pathname: string }> {
  try {
    // 确保 bucket 存在
    await ensureBucketExists()

    // 验证文件类型和大小
    if (!isFileTypeSupported(file.type)) {
      throw new Error(`不支持的文件类型: ${file.type}`)
    }

    const sizeValidation = validateFileSize(file)
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error)
    }

    // 生成唯一的文件名
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || ''
    const fileName = `${userId}/${folder}/${timestamp}_${randomId}.${fileExtension}`

    // 使用 AWS4-HMAC-SHA256 签名上传
    const arrayBuffer = await file.arrayBuffer()
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${fileName}`
    const path = `/${MINIO_CONFIG.bucketName}/${fileName}`

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'Content-Type': file.type,
      'Content-Length': arrayBuffer.byteLength.toString(),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('PUT', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: arrayBuffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MinIO 上传失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return {
      url,
      pathname: fileName
    }
  } catch (error) {
    console.error('上传文件到 MinIO 失败:', error)
    throw error
  }
}

/**
 * 上传缩略图到 MinIO
 */
export async function uploadThumbnailToMinio(
  thumbnailBlob: Blob,
  userId: string,
  originalFileName: string
): Promise<{ url: string; pathname: string }> {
  try {
    // 生成缩略图文件名
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const baseName = originalFileName.split('.')[0]
    const fileName = `${userId}/thumbnails/${timestamp}_${randomId}_${baseName}_thumb.jpg`

    // 使用 AWS4-HMAC-SHA256 签名上传
    const arrayBuffer = await thumbnailBlob.arrayBuffer()
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${fileName}`
    const path = `/${MINIO_CONFIG.bucketName}/${fileName}`

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'Content-Type': 'image/jpeg',
      'Content-Length': arrayBuffer.byteLength.toString(),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('PUT', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: arrayBuffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MinIO 缩略图上传失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return {
      url,
      pathname: fileName
    }
  } catch (error) {
    console.error('上传缩略图到 MinIO 失败:', error)
    throw error
  }
}

/**
 * 从 MinIO 下载文件
 */
export async function downloadFileFromMinio(fileUrl: string): Promise<ArrayBuffer> {
  try {
    const url = new URL(fileUrl)
    const objectKey = url.pathname.substring(`/${MINIO_CONFIG.bucketName}/`.length)

    console.log(`📥 下载 MinIO 文件: ${objectKey}`)

    const downloadUrl = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${objectKey}`
    const path = `/${MINIO_CONFIG.bucketName}/${objectKey}`

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('GET', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MinIO 下载失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const fileBuffer = await response.arrayBuffer()
    console.log(`✅ MinIO 文件下载成功: ${objectKey}, 大小: ${fileBuffer.byteLength} bytes`)

    return fileBuffer
  } catch (error) {
    console.error('❌ MinIO 文件下载失败:', error)
    throw error
  }
}

/**
 * 从 MinIO 删除文件
 */
export async function deleteFileFromMinio(url: string): Promise<void> {
  try {
    // 从 URL 中提取路径
    const urlObj = new URL(url)
    const path = urlObj.pathname

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('DELETE', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    })

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      throw new Error(`MinIO 删除失败: ${response.status} ${response.statusText} - ${errorText}`)
    }
  } catch (error) {
    console.error('从 MinIO 删除文件失败:', error)
    throw error
  }
}

/**
 * 列出用户的所有文件
 */
export async function listUserFiles(userId: string): Promise<any[]> {
  try {
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}?list-type=2&prefix=${userId}/`
    const path = `/${MINIO_CONFIG.bucketName}?list-type=2&prefix=${userId}/`

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('GET', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MinIO 列表获取失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // 解析 XML 响应（简化版本）
    const xmlText = await response.text()
    // 这里需要解析 XML，暂时返回空数组
    return []
  } catch (error) {
    console.error('列出用户文件失败:', error)
    throw error
  }
}

/**
 * 获取文件信息
 */
export async function getFileInfo(url: string): Promise<any> {
  try {
    const response = await fetch(url, { method: 'HEAD' })

    if (!response.ok) {
      throw new Error(`获取文件信息失败: ${response.status} ${response.statusText}`)
    }

    return {
      size: response.headers.get('content-length'),
      type: response.headers.get('content-type'),
      lastModified: response.headers.get('last-modified')
    }
  } catch (error) {
    console.error('获取文件信息失败:', error)
    throw error
  }
}

/**
 * 验证 MinIO 连接
 */
export async function validateMinioConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // 尝试列出 bucket 来验证连接
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}?list-type=2&max-keys=1`
    const path = `/${MINIO_CONFIG.bucketName}?list-type=2&max-keys=1`

    const now = new Date()
    const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

    const headers: Record<string, string> = {
      'Host': MINIO_CONFIG.endpoint.replace(/^https?:\/\//, ''),
      'x-amz-date': timeStamp
    }

    const authorization = createAwsSignature('GET', path, headers, '')
    headers['Authorization'] = authorization

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`连接验证失败: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return { success: true }
  } catch (error) {
    console.error('MinIO 连接验证失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 生成安全的文件名
 */
export function generateSafeFileName(originalName: string, userId: string): string {
  // 移除特殊字符，保留字母数字和点号
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  
  return `${userId}_${timestamp}_${randomId}_${safeName}`
}
