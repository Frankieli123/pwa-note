/**
 * 文件验证工具函数
 * 统一的文件大小验证逻辑
 */

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export function isFileTypeSupported(_mimeType: string): boolean {
  return true // 允许所有文件格式
}

export function validateFileSizeByNumber(fileSize: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(fileSize) || fileSize < 0) {
    return { valid: false, error: '文件大小参数无效' }
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制，最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
    }
  }
  return { valid: true }
}

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  return validateFileSizeByNumber(file.size)
}

export function getMaxFileSizeBytes(): number {
  return MAX_FILE_SIZE
}
