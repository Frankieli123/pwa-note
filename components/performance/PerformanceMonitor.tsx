"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, Clock, Database, Zap, RefreshCw } from 'lucide-react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  itemsRendered: number
  totalItems: number
  scrollFPS: number
  loadTime: number
  cacheHitRate: number
  networkSpeed: 'fast' | 'medium' | 'slow'
}

interface PerformanceMonitorProps {
  isVisible?: boolean
  onToggle?: () => void
  metrics?: Partial<PerformanceMetrics>
}

/**
 * PerformanceMonitor - 性能监控组件
 * 
 * 功能：
 * - 实时性能指标监控
 * - 内存使用情况
 * - 渲染性能分析
 * - 网络状况检测
 * - 缓存效率统计
 */
export function PerformanceMonitor({ 
  isVisible = false, 
  onToggle,
  metrics = {}
}: PerformanceMonitorProps) {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    itemsRendered: 0,
    totalItems: 0,
    scrollFPS: 60,
    loadTime: 0,
    cacheHitRate: 0,
    networkSpeed: 'medium',
    ...metrics
  })

  const [isMonitoring, setIsMonitoring] = useState(false)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const animationFrameRef = useRef<number | undefined>(undefined)

  // 测量渲染性能
  const measureRenderPerformance = () => {
    const startTime = performance.now()
    
    // 模拟渲染测量
    requestAnimationFrame(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      setCurrentMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100
      }))
    })
  }

  // 测量内存使用
  const measureMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      
      setCurrentMetrics(prev => ({
        ...prev,
        memoryUsage: usedMB
      }))
    }
  }

  // 测量滚动FPS
  const measureScrollFPS = () => {
    const now = performance.now()
    frameCountRef.current++
    
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
      
      setCurrentMetrics(prev => ({
        ...prev,
        scrollFPS: fps
      }))
      
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
    
    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(measureScrollFPS)
    }
  }

  // 开始监控
  const startMonitoring = () => {
    setIsMonitoring(true)
    frameCountRef.current = 0
    lastTimeRef.current = performance.now()
    measureScrollFPS()
  }

  // 停止监控
  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  // 获取性能等级
  const getPerformanceLevel = (metric: keyof PerformanceMetrics, value: number) => {
    switch (metric) {
      case 'renderTime':
        if (value < 16) return { level: 'excellent', color: 'bg-green-500' }
        if (value < 33) return { level: 'good', color: 'bg-yellow-500' }
        return { level: 'poor', color: 'bg-red-500' }
      
      case 'scrollFPS':
        if (value >= 55) return { level: 'excellent', color: 'bg-green-500' }
        if (value >= 30) return { level: 'good', color: 'bg-yellow-500' }
        return { level: 'poor', color: 'bg-red-500' }
      
      case 'cacheHitRate':
        if (value >= 80) return { level: 'excellent', color: 'bg-green-500' }
        if (value >= 60) return { level: 'good', color: 'bg-yellow-500' }
        return { level: 'poor', color: 'bg-red-500' }
      
      default:
        return { level: 'unknown', color: 'bg-gray-500' }
    }
  }

  // 定期更新指标
  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      measureRenderPerformance()
      measureMemoryUsage()
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible])

  // 更新外部传入的指标
  useEffect(() => {
    setCurrentMetrics(prev => ({ ...prev, ...metrics }))
  }, [metrics])

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        性能监控
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            性能监控
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 text-xs">
        {/* 渲染性能 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              渲染时间
            </span>
            <Badge variant={getPerformanceLevel('renderTime', currentMetrics.renderTime).level as any}>
              {currentMetrics.renderTime}ms
            </Badge>
          </div>
          <Progress 
            value={Math.min((currentMetrics.renderTime / 50) * 100, 100)} 
            className="h-1"
          />
        </div>

        {/* 滚动FPS */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              滚动FPS
            </span>
            <Badge variant={getPerformanceLevel('scrollFPS', currentMetrics.scrollFPS).level as any}>
              {currentMetrics.scrollFPS}
            </Badge>
          </div>
          <Progress 
            value={(currentMetrics.scrollFPS / 60) * 100} 
            className="h-1"
          />
        </div>

        {/* 内存使用 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              内存使用
            </span>
            <Badge variant="outline">
              {currentMetrics.memoryUsage}MB
            </Badge>
          </div>
        </div>

        {/* 渲染项目 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span>渲染项目</span>
            <Badge variant="outline">
              {currentMetrics.itemsRendered}/{currentMetrics.totalItems}
            </Badge>
          </div>
          <Progress 
            value={currentMetrics.totalItems > 0 ? (currentMetrics.itemsRendered / currentMetrics.totalItems) * 100 : 0} 
            className="h-1"
          />
        </div>

        {/* 缓存命中率 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span>缓存命中率</span>
            <Badge variant={getPerformanceLevel('cacheHitRate', currentMetrics.cacheHitRate).level as any}>
              {currentMetrics.cacheHitRate.toFixed(1)}%
            </Badge>
          </div>
          <Progress 
            value={currentMetrics.cacheHitRate} 
            className="h-1"
          />
        </div>

        {/* 网络状况 */}
        <div className="flex items-center justify-between">
          <span>网络状况</span>
          <Badge 
            variant={
              currentMetrics.networkSpeed === 'fast' ? 'default' :
              currentMetrics.networkSpeed === 'medium' ? 'secondary' : 'destructive'
            }
          >
            {currentMetrics.networkSpeed === 'fast' ? '快速' :
             currentMetrics.networkSpeed === 'medium' ? '中等' : '缓慢'}
          </Badge>
        </div>

        {/* 加载时间 */}
        <div className="flex items-center justify-between">
          <span>加载时间</span>
          <Badge variant="outline">
            {currentMetrics.loadTime}ms
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
