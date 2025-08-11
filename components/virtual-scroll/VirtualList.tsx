"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  onLoadMore?: () => Promise<boolean>
  hasMore?: boolean
  isLoading?: boolean
  className?: string
  overscan?: number // 预渲染的额外项目数量
}

/**
 * VirtualList - 虚拟滚动列表组件
 * 
 * 职责：
 * - 只渲染可见区域的项目，提升大列表性能
 * - 支持无限滚动和懒加载
 * - 自动计算可见项目范围
 * - 支持动态加载更多数据
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className,
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // 计算可见项目范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // 计算总高度
  const totalHeight = items.length * itemHeight

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [items, visibleRange, itemHeight])

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)

    // 检查是否需要加载更多
    if (
      onLoadMore &&
      hasMore &&
      !isLoading &&
      !isLoadingMore &&
      !loadingRef.current
    ) {
      const scrollHeight = e.currentTarget.scrollHeight
      const clientHeight = e.currentTarget.clientHeight
      const threshold = scrollHeight - clientHeight - 200 // 提前200px触发

      if (newScrollTop >= threshold) {
        loadingRef.current = true
        setIsLoadingMore(true)
        
        onLoadMore().then((hasMoreData) => {
          if (!hasMoreData) {
            // 没有更多数据了
          }
        }).finally(() => {
          loadingRef.current = false
          setIsLoadingMore(false)
        })
      }
    }
  }, [onLoadMore, hasMore, isLoading, isLoadingMore])

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
      setScrollTop(0)
    }
  }, [])

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight
      containerRef.current.scrollTop = targetScrollTop
      setScrollTop(targetScrollTop)
    }
  }, [itemHeight])

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见项目 */}
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}

        {/* 加载更多指示器 */}
        {(isLoading || isLoadingMore) && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>加载中...</span>
            </div>
          </div>
        )}

        {/* 没有更多数据指示器 */}
        {!hasMore && items.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: totalHeight,
              left: 0,
              right: 0,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="text-xs text-muted-foreground">
              已加载全部 {items.length} 条数据
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 导出工具函数
export const VirtualListUtils = {
  scrollToTop: (containerRef: React.RefObject<HTMLDivElement>) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  },
  
  scrollToIndex: (
    containerRef: React.RefObject<HTMLDivElement>,
    index: number,
    itemHeight: number
  ) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight
    }
  }
}
