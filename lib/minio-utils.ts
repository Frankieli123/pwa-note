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
 * 验证文件类型是否支持
 */
export function isFileTypeSupported(mimeType: string): boolean {
  return getAllSupportedTypes().includes(mimeType)
}

/**
 * 验证文件大小是否符合要求
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const allTypes = { ...SUPPORTED_FILE_TYPES.images, ...SUPPORTED_FILE_TYPES.documents }
  const typeConfig = allTypes[file.type as keyof typeof allTypes]
  
  if (!typeConfig) {
    return { valid: false, error: `不支持的文件类型: ${file.type}` }
  }
  
  if (file.size > typeConfig.maxSize) {
    const maxSizeMB = typeConfig.maxSize / (1024 * 1024)
    return { valid: false, error: `文件大小超过限制 (最大 ${maxSizeMB}MB)` }
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
 * 生成预签名 URL 用于文件上传
 */
async function generatePresignedUploadUrl(
  objectName: string,
  contentType: string
): Promise<string> {
  try {
    // 使用 MinIO 的 presigned URL API
    const url = new URL(`${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${objectName}`)

    // 添加查询参数
    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${MINIO_CONFIG.accessKey}/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${MINIO_CONFIG.region}/s3/aws4_request`,
      'X-Amz-Date': new Date().toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z',
      'X-Amz-Expires': '3600',
      'X-Amz-SignedHeaders': 'host'
    })

    url.search = params.toString()
    return url.toString()
  } catch (error) {
    console.error('生成预签名 URL 失败:', error)
    throw error
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

    // 使用简单的 PUT 请求上传（MinIO 支持基本认证）
    const arrayBuffer = await file.arrayBuffer()
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${fileName}`

    // 创建基本认证头
    const auth = btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Authorization': `Basic ${auth}`,
        'Content-Length': arrayBuffer.byteLength.toString()
      },
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

    // 使用简单的 PUT 请求上传
    const arrayBuffer = await thumbnailBlob.arrayBuffer()
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${fileName}`

    // 创建基本认证头
    const auth = btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Authorization': `Basic ${auth}`,
        'Content-Length': arrayBuffer.byteLength.toString()
      },
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
 * 从 MinIO 删除文件
 */
export async function deleteFileFromMinio(url: string): Promise<void> {
  try {
    // 创建基本认证头
    const auth = btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`
      }
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

    // 创建基本认证头
    const auth = btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
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

    // 创建基本认证头
    const auth = btoa(`${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
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
