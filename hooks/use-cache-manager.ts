"use client"

import { useState, useRef, useCallback, useEffect } from 'react'

interface CacheConfig {
  maxSize: number // 最大缓存项目数
  ttl: number // 缓存生存时间（毫秒）
  enablePersistence: boolean // 是否启用本地存储持久化
  storageKey: string // 本地存储键名
}

interface CacheItem<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccess: number
}

interface CacheStats {
  size: number
  hitRate: number
  totalRequests: number
  totalHits: number
}

/**
 * useCacheManager - 缓存管理Hook
 * 
 * 功能：
 * - LRU缓存策略
 * - TTL过期管理
 * - 本地存储持久化
 * - 缓存统计
 * - 内存优化
 */
export function useCacheManager<T>(
  config: Partial<CacheConfig> = {}
) {
  const defaultConfig: CacheConfig = {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5分钟
    enablePersistence: true,
    storageKey: 'notes-cache',
    ...config
  }

  // 缓存存储
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map())
  
  // 统计信息
  const [stats, setStats] = useState<CacheStats>({
    size: 0,
    hitRate: 0,
    totalRequests: 0,
    totalHits: 0
  })

  // 更新统计信息
  const updateStats = useCallback((isHit: boolean) => {
    setStats(prev => {
      const totalRequests = prev.totalRequests + 1
      const totalHits = prev.totalHits + (isHit ? 1 : 0)
      return {
        size: cacheRef.current.size,
        hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
        totalRequests,
        totalHits
      }
    })
  }, [])

  // 检查缓存项是否过期
  const isExpired = useCallback((item: CacheItem<T>): boolean => {
    return Date.now() - item.timestamp > defaultConfig.ttl
  }, [defaultConfig.ttl])

  // 清理过期缓存
  const cleanExpiredItems = useCallback(() => {
    const cache = cacheRef.current
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, item] of cache.entries()) {
      if (now - item.timestamp > defaultConfig.ttl) {
        cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理过期缓存: ${cleanedCount} 项`)
      setStats(prev => ({ ...prev, size: cache.size }))
    }
  }, [defaultConfig.ttl])

  // LRU淘汰策略
  const evictLRU = useCallback(() => {
    const cache = cacheRef.current
    if (cache.size <= defaultConfig.maxSize) return

    // 找到最少使用的项目
    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, item] of cache.entries()) {
      if (item.lastAccess < lruTime) {
        lruTime = item.lastAccess
        lruKey = key
      }
    }

    if (lruKey) {
      cache.delete(lruKey)
      console.log(`🗑️ LRU淘汰缓存项: ${lruKey}`)
      setStats(prev => ({ ...prev, size: cache.size }))
    }
  }, [defaultConfig.maxSize])

  // 获取缓存
  const get = useCallback((key: string): T | null => {
    const cache = cacheRef.current
    const item = cache.get(key)

    updateStats(!!item)

    if (!item) {
      return null
    }

    if (isExpired(item)) {
      cache.delete(key)
      setStats(prev => ({ ...prev, size: cache.size }))
      return null
    }

    // 更新访问信息
    item.lastAccess = Date.now()
    item.accessCount++

    return item.data
  }, [isExpired, updateStats])

  // 设置缓存
  const set = useCallback((key: string, data: T) => {
    const cache = cacheRef.current
    const now = Date.now()

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccess: now
    }

    cache.set(key, item)

    // 检查是否需要淘汰
    if (cache.size > defaultConfig.maxSize) {
      evictLRU()
    }

    setStats(prev => ({ ...prev, size: cache.size }))
  }, [defaultConfig.maxSize, evictLRU])

  // 删除缓存
  const remove = useCallback((key: string): boolean => {
    const cache = cacheRef.current
    const deleted = cache.delete(key)
    
    if (deleted) {
      setStats(prev => ({ ...prev, size: cache.size }))
    }
    
    return deleted
  }, [])

  // 清空缓存
  const clear = useCallback(() => {
    cacheRef.current.clear()
    setStats({
      size: 0,
      hitRate: 0,
      totalRequests: 0,
      totalHits: 0
    })
    console.log('🧹 缓存已清空')
  }, [])

  // 获取所有键
  const keys = useCallback((): string[] => {
    return Array.from(cacheRef.current.keys())
  }, [])

  // 获取缓存大小
  const size = useCallback((): number => {
    return cacheRef.current.size
  }, [])

  // 检查是否存在
  const has = useCallback((key: string): boolean => {
    const item = cacheRef.current.get(key)
    return !!item && !isExpired(item)
  }, [isExpired])

  // 从本地存储加载缓存
  const loadFromStorage = useCallback(() => {
    if (!defaultConfig.enablePersistence || typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(defaultConfig.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        const cache = cacheRef.current
        
        let loadedCount = 0
        for (const [key, item] of Object.entries(data)) {
          if (!isExpired(item as CacheItem<T>)) {
            cache.set(key, item as CacheItem<T>)
            loadedCount++
          }
        }
        
        console.log(`💾 从本地存储加载缓存: ${loadedCount} 项`)
        setStats(prev => ({ ...prev, size: cache.size }))
      }
    } catch (error) {
      console.error('❌ 加载缓存失败:', error)
    }
  }, [defaultConfig.enablePersistence, defaultConfig.storageKey, isExpired])

  // 保存到本地存储
  const saveToStorage = useCallback(() => {
    if (!defaultConfig.enablePersistence || typeof window === 'undefined') return

    try {
      const cache = cacheRef.current
      const data = Object.fromEntries(cache.entries())
      localStorage.setItem(defaultConfig.storageKey, JSON.stringify(data))
      console.log(`💾 缓存已保存到本地存储: ${cache.size} 项`)
    } catch (error) {
      console.error('❌ 保存缓存失败:', error)
    }
  }, [defaultConfig.enablePersistence, defaultConfig.storageKey])

  // 定期清理过期缓存
  useEffect(() => {
    const interval = setInterval(cleanExpiredItems, 60000) // 每分钟清理一次
    return () => clearInterval(interval)
  }, [cleanExpiredItems])

  // 组件卸载时保存缓存
  useEffect(() => {
    loadFromStorage() // 初始加载

    return () => {
      saveToStorage() // 卸载时保存
    }
  }, [loadFromStorage, saveToStorage])

  // 页面可见性变化时的处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveToStorage() // 页面隐藏时保存
      } else {
        cleanExpiredItems() // 页面显示时清理过期项
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [saveToStorage, cleanExpiredItems])

  return {
    get,
    set,
    remove,
    clear,
    keys,
    size,
    has,
    stats,
    cleanExpiredItems,
    saveToStorage,
    loadFromStorage
  }
}
