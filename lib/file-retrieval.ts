/**
 * 文件检索客户端工具函数
 * 用于从API获取文件数据和元数据
 */

export interface FileRetrievalOptions {
  format?: 'base64' | 'stream' | 'json'
  download?: boolean
  includeMetadata?: boolean
}

export interface FileListOptions {
  type?: 'image' | 'document' | 'all'
  includeBase64?: boolean
  page?: number
  limit?: number
  sort?: 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc'
}

/**
 * 获取单个文件的Base64数据
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @param options - 检索选项
 * @returns Promise<string> - Base64字符串
 */
export async function getFileBase64(
  fileId: string | number,
  userId: string,
  options: FileRetrievalOptions = {}
): Promise<string> {
  const { format = 'base64', includeMetadata = false } = options

  const params = new URLSearchParams({
    id: String(fileId),
    userId,
    format,
    include_metadata: String(includeMetadata)
  })

  const response = await fetch(`/api/files/download?${params}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  if (format === 'base64' && !includeMetadata) {
    // 直接返回Base64字符串
    return await response.text()
  } else {
    // 返回JSON格式
    const data = await response.json()
    if (includeMetadata) {
      return data.data.base64_data
    } else {
      return data.file.base64_data
    }
  }
}

/**
 * 获取文件的完整信息（包含Base64数据）
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @returns Promise<object> - 文件信息对象
 */
export async function getFileInfo(
  fileId: string | number,
  userId: string
): Promise<{
  id: number
  name: string
  type: string
  size: number
  base64_data: string
  url: string
  thumbnail?: string
  uploaded_at: Date
}> {
  const params = new URLSearchParams({
    id: String(fileId),
    userId,
    format: 'json'
  })

  const response = await fetch(`/api/files/download?${params}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.file
}

/**
 * 获取文件的二进制数据流
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @param download - 是否强制下载
 * @returns Promise<Blob> - 文件的Blob对象
 */
export async function getFileStream(
  fileId: string | number,
  userId: string,
  download: boolean = false
): Promise<Blob> {
  const params = new URLSearchParams({
    id: String(fileId),
    userId,
    format: 'stream',
    download: String(download)
  })

  const response = await fetch(`/api/files/download?${params}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return await response.blob()
}

/**
 * 获取文件列表
 * @param userId - 用户ID
 * @param options - 列表选项
 * @returns Promise<object> - 文件列表响应
 */
export async function getFileList(
  userId: string,
  options: FileListOptions = {}
): Promise<{
  files: Array<any>
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  filters: {
    type: string
    sort: string
    include_base64: boolean
  }
  stats: {
    total_files: number
    image_count: number
    document_count: number
    total_size: number
  }
}> {
  const {
    type = 'all',
    includeBase64 = false,
    page = 1,
    limit = 50,
    sort = 'date_desc'
  } = options

  const params = new URLSearchParams({
    userId,
    type,
    include_base64: String(includeBase64),
    page: String(page),
    limit: String(limit),
    sort
  })

  const response = await fetch(`/api/files/list?${params}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * 创建文件的预览URL
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @returns string - 预览URL
 */
export function createFilePreviewURL(
  fileId: string | number,
  userId: string
): string {
  const params = new URLSearchParams({
    id: String(fileId),
    userId,
    format: 'stream',
    download: 'false'
  })

  return `/api/files/download?${params}`
}

/**
 * 创建文件的下载URL
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @returns string - 下载URL
 */
export function createFileDownloadURL(
  fileId: string | number,
  userId: string
): string {
  const params = new URLSearchParams({
    id: String(fileId),
    userId,
    format: 'stream',
    download: 'true'
  })

  return `/api/files/download?${params}`
}

/**
 * 验证文件是否存在且用户有权限访问
 * @param fileId - 文件ID
 * @param userId - 用户ID
 * @returns Promise<boolean> - 是否有权限
 */
export async function validateFileAccess(
  fileId: string | number,
  userId: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      userId,
      action: 'get_info',
      fileIds: JSON.stringify([String(fileId)])
    })

    const response = await fetch('/api/files/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        action: 'get_info',
        fileIds: [String(fileId)]
      })
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.success && data.data.files.length > 0
  } catch (error) {
    console.error('Error validating file access:', error)
    return false
  }
}

/**
 * 批量获取文件信息
 * @param fileIds - 文件ID数组
 * @param userId - 用户ID
 * @returns Promise<Array> - 文件信息数组
 */
export async function getBatchFileInfo(
  fileIds: Array<string | number>,
  userId: string
): Promise<Array<{
  id: number
  name: string
  type: string
  size: number
  uploaded_at: Date
  thumbnail?: string
}>> {
  const response = await fetch('/api/files/list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      action: 'get_info',
      fileIds: fileIds.map(id => String(id))
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.data.files
}

/**
 * 从Base64数据创建临时下载链接
 * @param base64Data - Base64字符串
 * @param mimeType - MIME类型
 * @param filename - 文件名
 * @returns string - 临时URL
 */
export function createTempDownloadURL(
  base64Data: string,
  mimeType: string,
  filename: string
): string {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  
  return URL.createObjectURL(blob)
}

/**
 * 清理临时URL
 * @param url - 要清理的URL
 */
export function revokeTempURL(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
