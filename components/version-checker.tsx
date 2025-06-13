'use client'

import { useEffect, useState } from 'react'
import { handleVersionUpdate, getVersionInfo } from '@/lib/version-manager'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

/**
 * 版本检查组件
 * 自动检测应用更新并处理缓存清理
 */
export function VersionChecker() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // 延迟执行版本检查，避免影响首屏加载
    const timer = setTimeout(async () => {
      try {
        const hasUpdate = await handleVersionUpdate()
        if (hasUpdate) {
          setShowUpdateDialog(true)
        }
      } catch (error) {
        console.error('版本检查失败:', error)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    setIsUpdating(true)
    
    try {
      // 再次执行版本更新处理
      await handleVersionUpdate()
      
      // 延迟刷新页面，让用户看到更新完成
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('更新失败:', error)
      setIsUpdating(false)
    }
  }

  // 开发环境下显示版本信息
  const isDev = process.env.NODE_ENV === 'development'
  const versionInfo = isDev ? getVersionInfo() : null

  return (
    <>
      {/* 开发环境版本信息 */}
      {isDev && versionInfo && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-50">
          <div>当前版本: {versionInfo.current}</div>
          <div>存储版本: {versionInfo.stored || '未知'}</div>
          <div>缓存版本: {versionInfo.cache}</div>
        </div>
      )}

      {/* 更新提示对话框 */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>应用已更新</AlertDialogTitle>
            <AlertDialogDescription>
              检测到新版本，已自动清理缓存数据。点击刷新以获得最佳体验。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleRefresh}
              disabled={isUpdating}
            >
              {isUpdating ? '更新中...' : '刷新页面'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * 手动触发缓存清理的组件（用于设置页面）
 */
export function CacheClearButton() {
  const [isClearing, setIsClearing] = useState(false)

  const handleClearCache = async () => {
    setIsClearing(true)
    
    try {
      await handleVersionUpdate()
      
      // 显示成功提示
      alert('缓存清理完成！页面将自动刷新。')
      
      // 刷新页面
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('清理缓存失败:', error)
      alert('清理缓存失败，请手动刷新页面。')
      setIsClearing(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleClearCache}
      disabled={isClearing}
      className="w-full"
    >
      {isClearing ? '清理中...' : '清理应用缓存'}
    </Button>
  )
}
