"use client"

import { useEffect, useRef, useCallback } from 'react'

interface PreloadConfig {
  threshold: number // 距离底部多少像素时开始预加载
  debounceMs: number // 防抖延迟
  maxPreloadBatches: number // 最大预加载批次数
  enableIntersectionObserver: boolean // 是否使用IntersectionObserver
}

interface PreloadCallbacks {
  onPreload: () => Promise<boolean>
  onVisibilityChange?: (isVisible: boolean) => void
}

/**
 * usePreloadStrategy - 预加载策略Hook
 * 
 * 功能：
 * - 智能预加载触发
 * - 可见性检测优化
 * - 防抖处理
 * - 性能监控
 */
export function usePreloadStrategy(
  containerRef: React.RefObject<HTMLElement>,
  config: Partial<PreloadConfig> = {},
  callbacks: PreloadCallbacks
) {
  const defaultConfig: PreloadConfig = {
    threshold: 200,
    debounceMs: 100,
    maxPreloadBatches: 3,
    enableIntersectionObserver: true,
    ...config
  }

  const preloadCountRef = useRef(0)
  const isPreloadingRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  // 防抖处理的预加载函数
  const debouncedPreload = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (isPreloadingRef.current || preloadCountRef.current >= defaultConfig.maxPreloadBatches) {
        return
      }

      isPreloadingRef.current = true
      preloadCountRef.current++

      try {
        console.log(`🚀 预加载触发 (${preloadCountRef.current}/${defaultConfig.maxPreloadBatches})`)
        const hasMore = await callbacks.onPreload()
        
        if (!hasMore) {
          console.log('📭 预加载完成：没有更多数据')
        }
      } catch (error) {
        console.error('❌ 预加载失败:', error)
        preloadCountRef.current-- // 失败时减少计数
      } finally {
        isPreloadingRef.current = false
      }
    }, defaultConfig.debounceMs)
  }, [callbacks.onPreload, defaultConfig.debounceMs, defaultConfig.maxPreloadBatches])

  // 检查是否需要预加载
  const checkPreloadTrigger = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // 计算距离底部的距离
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // 如果距离底部小于阈值，触发预加载
    if (distanceFromBottom <= defaultConfig.threshold) {
      debouncedPreload()
    }
  }, [containerRef, defaultConfig.threshold, debouncedPreload])

  // 滚动事件处理
  const handleScroll = useCallback((e: Event) => {
    checkPreloadTrigger()
  }, [checkPreloadTrigger])

  // 可见性变化处理
  const handleVisibilityChange = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      const isVisible = entry.isIntersecting
      callbacks.onVisibilityChange?.(isVisible)
      
      if (isVisible) {
        // 当容器变为可见时，检查是否需要预加载
        setTimeout(checkPreloadTrigger, 100)
      }
    })
  }, [callbacks.onVisibilityChange, checkPreloadTrigger])

  // 重置预加载状态
  const resetPreloadState = useCallback(() => {
    preloadCountRef.current = 0
    isPreloadingRef.current = false
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  // 手动触发预加载检查
  const triggerPreloadCheck = useCallback(() => {
    checkPreloadTrigger()
  }, [checkPreloadTrigger])

  // 设置滚动监听
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 添加滚动监听
    container.addEventListener('scroll', handleScroll, { passive: true })

    // 初始检查
    setTimeout(checkPreloadTrigger, 100)

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, handleScroll, checkPreloadTrigger])

  // 设置可见性监听
  useEffect(() => {
    if (!defaultConfig.enableIntersectionObserver || !containerRef.current) return

    // 创建IntersectionObserver
    intersectionObserverRef.current = new IntersectionObserver(
      handleVisibilityChange,
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    // 开始观察容器
    intersectionObserverRef.current.observe(containerRef.current)

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
        intersectionObserverRef.current = null
      }
    }
  }, [containerRef, defaultConfig.enableIntersectionObserver, handleVisibilityChange])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    resetPreloadState,
    triggerPreloadCheck,
    isPreloading: isPreloadingRef.current,
    preloadCount: preloadCountRef.current
  }
}
