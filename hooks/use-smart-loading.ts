"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

interface SmartLoadingConfig {
  initialBatchSize: number
  maxBatchSize: number
  preloadThreshold: number // 距离底部多少像素时开始预加载
  cacheSize: number // 缓存的项目数量
  adaptiveBatchSize: boolean // 是否根据网络状况自适应调整批次大小
}

interface SmartLoadingState {
  isLoading: boolean
  hasMore: boolean
  error: string | null
  loadedCount: number
  totalEstimate: number | null
  currentBatchSize: number
  networkSpeed: 'fast' | 'medium' | 'slow'
}

interface SmartLoadingActions {
  loadMore: () => Promise<boolean>
  reset: () => void
  setHasMore: (hasMore: boolean) => void
  updateNetworkSpeed: (speed: 'fast' | 'medium' | 'slow') => void
}

/**
 * useSmartLoading - 智能加载策略Hook
 * 
 * 功能：
 * - 自适应批次大小调整
 * - 网络状况检测和优化
 * - 预加载策略
 * - 错误重试机制
 * - 性能监控
 */
export function useSmartLoading<T>(
  loadFunction: (batchSize: number, cursor?: string) => Promise<{
    items: T[]
    nextCursor?: string
    hasMore: boolean
    totalCount?: number
  }>,
  config: Partial<SmartLoadingConfig> = {}
): SmartLoadingState & SmartLoadingActions {
  
  const defaultConfig: SmartLoadingConfig = {
    initialBatchSize: 20,
    maxBatchSize: 100,
    preloadThreshold: 200,
    cacheSize: 1000,
    adaptiveBatchSize: true,
    ...config
  }

  // 状态管理
  const [state, setState] = useState<SmartLoadingState>({
    isLoading: false,
    hasMore: true,
    error: null,
    loadedCount: 0,
    totalEstimate: null,
    currentBatchSize: defaultConfig.initialBatchSize,
    networkSpeed: 'medium'
  })

  // 引用
  const nextCursorRef = useRef<string | undefined>(undefined)
  const loadTimesRef = useRef<number[]>([])
  const retryCountRef = useRef(0)
  const isLoadingRef = useRef(false)

  // 网络速度检测
  const detectNetworkSpeed = useCallback((loadTime: number, itemCount: number) => {
    if (itemCount === 0) return

    const timePerItem = loadTime / itemCount
    
    let speed: 'fast' | 'medium' | 'slow'
    if (timePerItem < 10) {
      speed = 'fast'
    } else if (timePerItem < 50) {
      speed = 'medium'
    } else {
      speed = 'slow'
    }

    setState(prev => ({ ...prev, networkSpeed: speed }))
    return speed
  }, [])

  // 自适应批次大小调整
  const adjustBatchSize = useCallback((networkSpeed: 'fast' | 'medium' | 'slow', loadTime: number) => {
    if (!defaultConfig.adaptiveBatchSize) return state.currentBatchSize

    let newBatchSize = state.currentBatchSize

    if (networkSpeed === 'fast' && loadTime < 500) {
      // 网络快且加载时间短，增加批次大小
      newBatchSize = Math.min(state.currentBatchSize * 1.5, defaultConfig.maxBatchSize)
    } else if (networkSpeed === 'slow' || loadTime > 2000) {
      // 网络慢或加载时间长，减少批次大小
      newBatchSize = Math.max(state.currentBatchSize * 0.7, defaultConfig.initialBatchSize)
    }

    newBatchSize = Math.floor(newBatchSize)
    setState(prev => ({ ...prev, currentBatchSize: newBatchSize }))
    return newBatchSize
  }, [state.currentBatchSize, defaultConfig.adaptiveBatchSize, defaultConfig.maxBatchSize, defaultConfig.initialBatchSize])

  // 加载更多数据
  const loadMore = useCallback(async (): Promise<boolean> => {
    if (isLoadingRef.current || !state.hasMore) {
      return false
    }

    isLoadingRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const startTime = Date.now()

    try {
      const result = await loadFunction(state.currentBatchSize, nextCursorRef.current)
      const loadTime = Date.now() - startTime

      // 记录加载时间
      loadTimesRef.current.push(loadTime)
      if (loadTimesRef.current.length > 10) {
        loadTimesRef.current.shift() // 只保留最近10次的记录
      }

      // 检测网络速度
      const networkSpeed = detectNetworkSpeed(loadTime, result.items.length)

      // 调整批次大小
      const newBatchSize = adjustBatchSize(networkSpeed || state.networkSpeed, loadTime)

      // 更新状态
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: result.hasMore,
        loadedCount: prev.loadedCount + result.items.length,
        totalEstimate: result.totalCount || prev.totalEstimate,
        currentBatchSize: newBatchSize,
        networkSpeed: networkSpeed || prev.networkSpeed
      }))

      // 更新游标
      nextCursorRef.current = result.nextCursor

      // 重置重试计数
      retryCountRef.current = 0

      console.log(`📊 智能加载完成: ${result.items.length}条, 耗时${loadTime}ms, 网络${networkSpeed}, 批次${newBatchSize}`)

      return result.items.length > 0

    } catch (error) {
      console.error('❌ 智能加载失败:', error)
      
      // 错误重试逻辑
      retryCountRef.current++
      const shouldRetry = retryCountRef.current <= 3

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: shouldRetry 
          ? `加载失败，正在重试 (${retryCountRef.current}/3)...` 
          : '加载失败，请检查网络连接'
      }))

      // 自动重试
      if (shouldRetry) {
        setTimeout(() => {
          loadMore()
        }, 1000 * retryCountRef.current) // 递增延迟重试
      }

      return false
    } finally {
      isLoadingRef.current = false
    }
  }, [state.currentBatchSize, state.hasMore, state.networkSpeed, loadFunction, detectNetworkSpeed, adjustBatchSize])

  // 重置状态
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      hasMore: true,
      error: null,
      loadedCount: 0,
      totalEstimate: null,
      currentBatchSize: defaultConfig.initialBatchSize,
      networkSpeed: 'medium'
    })
    nextCursorRef.current = undefined
    loadTimesRef.current = []
    retryCountRef.current = 0
    isLoadingRef.current = false
  }, [defaultConfig.initialBatchSize])

  // 设置是否还有更多数据
  const setHasMore = useCallback((hasMore: boolean) => {
    setState(prev => ({ ...prev, hasMore }))
  }, [])

  // 更新网络速度
  const updateNetworkSpeed = useCallback((speed: 'fast' | 'medium' | 'slow') => {
    setState(prev => ({ ...prev, networkSpeed: speed }))
  }, [])

  // 性能监控
  useEffect(() => {
    if (loadTimesRef.current.length >= 5) {
      const avgLoadTime = loadTimesRef.current.reduce((a, b) => a + b, 0) / loadTimesRef.current.length
      console.log(`📈 平均加载时间: ${avgLoadTime.toFixed(0)}ms, 当前批次: ${state.currentBatchSize}`)
    }
  }, [state.currentBatchSize, state.loadedCount])

  return {
    ...state,
    loadMore,
    reset,
    setHasMore,
    updateNetworkSpeed
  }
}
