/**
 * API 路径工具函数
 * 支持开发环境代理访问（如 Code Server 的 /proxy/3000/）
 * 生产环境不设置 NEXT_PUBLIC_BASE_PATH，值为空，行为不变
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function apiUrl(path: string): string {
  return `${basePath}${path}`
}
