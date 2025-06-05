"use client"

import { useState, useEffect } from "react"
import { getUserAvatarUrl, getUserAvatarUrlWithCache } from "@/lib/avatar-utils"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  user: any
  size?: number
  className?: string
  showFallback?: boolean
  loading?: "lazy" | "eager"
  useCache?: boolean // 是否使用缓存
}

export function UserAvatar({
  user,
  size = 32,
  className,
  showFallback = true,
  loading = "lazy",
  useCache = true
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  const displayName = user?.username || user?.name || "用户"
  const initials = displayName.slice(0, 2).toUpperCase()

  // 加载头像URL（支持缓存）
  useEffect(() => {
    if (!user) {
      setAvatarUrl('/placeholder-avatar.svg')
      return
    }

    if (useCache) {
      // 使用缓存版本
      getUserAvatarUrlWithCache(user, size).then(url => {
        setAvatarUrl(url)
      }).catch(error => {
        console.warn('获取缓存头像失败:', error)
        setAvatarUrl(getUserAvatarUrl(user, size))
      })
    } else {
      // 不使用缓存，直接获取URL
      setAvatarUrl(getUserAvatarUrl(user, size))
    }
  }, [user, size, useCache])

  // 如果图片加载失败或用户没有头像，显示备用方案
  if (imageError || !avatarUrl || avatarUrl === '/placeholder-avatar.svg') {
    if (!showFallback) return null
    
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
          className
        )}
        style={{ 
          width: size, 
          height: size,
          fontSize: Math.max(size * 0.4, 12)
        }}
        title={displayName}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {/* 加载占位符 */}
      {!imageLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-full bg-muted animate-pulse"
          style={{ width: size, height: size }}
        />
      )}
      
      {/* 头像图片 */}
      <img
        src={avatarUrl}
        alt={`${displayName}的头像`}
        className={cn(
          "rounded-full object-cover transition-opacity duration-200",
          "image-rendering-crisp-edges", // 改善图片渲染质量
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: size,
          height: size,
          imageRendering: 'crisp-edges', // 确保清晰渲染
          backfaceVisibility: 'hidden', // 优化渲染性能
          transform: 'translateZ(0)' // 启用硬件加速
        }}
        loading={loading}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          console.warn(`头像加载失败: ${avatarUrl}`)
          setImageError(true)
        }}
        title={displayName}
      />
    </div>
  )
}

// 预加载头像的工具函数
export function preloadAvatar(user: any, size: number = 128) {
  const avatarUrl = getUserAvatarUrl(user, size)
  
  if (avatarUrl && avatarUrl !== '/placeholder-avatar.svg') {
    const img = new Image()
    img.src = avatarUrl
  }
}

// 批量预加载多个用户头像
export function preloadAvatars(users: any[], size: number = 128) {
  users.forEach(user => preloadAvatar(user, size))
}
