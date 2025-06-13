/**
 * Vercel Blob 存储工具函数
 * 用于处理文件上传到 Vercel Blob 存储
 */

import { put, del, list, head } from '@vercel/blob'

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
 * 上传文件到 Vercel Blob
 */
export async function uploadFileToBlob(
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
    
    // 上传到 Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    })
    
    return {
      url: blob.url,
      pathname: blob.pathname
    }
  } catch (error) {
    console.error('上传文件到 Blob 失败:', error)
    throw error
  }
}

/**
 * 上传缩略图到 Vercel Blob
 */
export async function uploadThumbnailToBlob(
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
    
    // 上传缩略图到 Vercel Blob
    const blob = await put(fileName, thumbnailBlob, {
      access: 'public',
      addRandomSuffix: false,
    })
    
    return {
      url: blob.url,
      pathname: blob.pathname
    }
  } catch (error) {
    console.error('上传缩略图到 Blob 失败:', error)
    throw error
  }
}

/**
 * 从 Vercel Blob 删除文件
 */
export async function deleteFileFromBlob(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error('从 Blob 删除文件失败:', error)
    throw error
  }
}

/**
 * 列出用户的所有文件
 */
export async function listUserFiles(userId: string): Promise<any[]> {
  try {
    const { blobs } = await list({
      prefix: `${userId}/`,
    })
    return blobs
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
    const info = await head(url)
    return info
  } catch (error) {
    console.error('获取文件信息失败:', error)
    throw error
  }
}

/**
 * 验证 Blob 连接
 */
export async function validateBlobConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // 尝试列出文件来验证连接
    await list({ limit: 1 })
    return { success: true }
  } catch (error) {
    console.error('Blob 连接验证失败:', error)
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
