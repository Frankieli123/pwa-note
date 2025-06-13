'use client'

import { useEffect } from 'react'
import { handleVersionUpdate } from '@/lib/version-manager'

/**
 * 版本检查组件
 * 自动检测应用更新并处理缓存清理
 */
export function VersionChecker() {
  useEffect(() => {
    // 延迟执行版本检查，避免影响首屏加载
    const timer = setTimeout(async () => {
      try {
        const hasUpdate = await handleVersionUpdate()
        if (hasUpdate) {
          // 直接刷新页面，不显示对话框
          console.log('🔄 检测到版本更新，自动刷新页面...')
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      } catch (error) {
        console.error('版本检查失败:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return null
}
