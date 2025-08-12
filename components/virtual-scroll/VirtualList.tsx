"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number | ((item: T, index: number) => number) // 支持动态高度函数
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  onLoadMore?: () => Promise<boolean>
  hasMore?: boolean
  isLoading?: boolean
  className?: string
  overscan?: number // 预渲染的额外项目数量
  estimatedItemHeight?: number // 估算高度，用于初始渲染
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
  overscan = 5,
  estimatedItemHeight = 100
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // 高度缓存：存储每个项目的实际高度
  const heightCache = useRef<Map<number, number>>(new Map())
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // 获取项目高度的函数
  const getItemHeight = useCallback((item: T, index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(item, index)
    }
    return itemHeight
  }, [itemHeight])

  // 测量并缓存项目高度
  const measureItem = useCallback((index: number) => {
    const element = itemRefs.current.get(index)
    if (element) {
      const height = element.getBoundingClientRect().height
      heightCache.current.set(index, height)
      return height
    }
    return estimatedItemHeight
  }, [estimatedItemHeight])

  // 获取缓存的高度或估算高度
  const getCachedHeight = useCallback((item: T, index: number): number => {
    const cached = heightCache.current.get(index)
    if (cached !== undefined) {
      return cached
    }
    return getItemHeight(item, index)
  }, [getItemHeight])

  // 计算累积高度和位置
  const { totalHeight, itemPositions } = useMemo(() => {
    let currentTop = 0
    const positions: Array<{ top: number; height: number }> = []

    for (let i = 0; i < items.length; i++) {
      const height = getCachedHeight(items[i], i)
      positions.push({ top: currentTop, height })
      currentTop += height
    }

    return {
      totalHeight: currentTop,
      itemPositions: positions
    }
  }, [items, getCachedHeight])

  // 计算可见项目范围（基于累积高度）
  const visibleRange = useMemo(() => {
    let startIndex = 0
    let endIndex = items.length - 1

    // 找到第一个可见项目
    for (let i = 0; i < itemPositions.length; i++) {
      if (itemPositions[i].top + itemPositions[i].height >= scrollTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
    }

    // 找到最后一个可见项目
    for (let i = startIndex; i < itemPositions.length; i++) {
      if (itemPositions[i].top > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan)
        break
      }
    }

    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan])

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => {
      const actualIndex = startIndex + index
      return {
        item,
        index: actualIndex,
        top: itemPositions[actualIndex]?.top || 0,
        height: itemPositions[actualIndex]?.height || estimatedItemHeight
      }
    })
  }, [items, visibleRange, itemPositions, estimatedItemHeight])

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
    if (containerRef.current && index < items.length) {
      // 使用itemPositions来获取准确的位置，如果不存在则使用估算
      const targetScrollTop = itemPositions[index]?.top || (index * (typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight))
      containerRef.current.scrollTop = targetScrollTop
      setScrollTop(targetScrollTop)
    }
  }, [itemHeight, itemPositions, items.length, estimatedItemHeight])

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见项目 */}
        {visibleItems.map(({ item, index, top, height }) => (
          <div
            key={index}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(index, el)
                // 测量实际高度并更新缓存
                setTimeout(() => measureItem(index), 0)
              }
            }}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              minHeight: height
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
