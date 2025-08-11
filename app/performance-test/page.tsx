"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { performanceTester, PerformanceTestConfig, PerformanceTestResult } from '@/lib/performance-tester'
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor'
import { Play, Download, Trash2, Activity } from 'lucide-react'

export default function PerformanceTestPage() {
  const [config, setConfig] = useState<PerformanceTestConfig>({
    noteCount: 9999,
    batchSize: 20,
    testDuration: 10,
    enableVirtualScroll: true,
    enableCache: true
  })

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [results, setResults] = useState<PerformanceTestResult[]>([])
  const [showMonitor, setShowMonitor] = useState(false)

  // 运行性能测试
  const runTest = async () => {
    setIsRunning(true)
    setProgress(0)
    setCurrentTest('初始化测试...')

    try {
      // 模拟测试进度
      const steps = [
        '初始化测试环境...',
        '测试初始加载性能...',
        '测试渲染性能...',
        '测试滚动性能...',
        '测试加载更多性能...',
        '分析测试结果...'
      ]

      for (let i = 0; i < steps.length; i++) {
        setCurrentTest(steps[i])
        setProgress((i / steps.length) * 100)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 运行实际测试
      const result = await performanceTester.runFullTest(config)
      
      // 更新结果
      setResults(performanceTester.getResults())
      setProgress(100)
      setCurrentTest('测试完成！')

    } catch (error) {
      console.error('测试失败:', error)
      setCurrentTest('测试失败')
    } finally {
      setIsRunning(false)
    }
  }

  // 导出结果
  const exportResults = () => {
    const data = performanceTester.exportResults()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-test-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清除结果
  const clearResults = () => {
    performanceTester.clearResults()
    setResults([])
  }

  // 获取性能等级
  const getPerformanceLevel = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return { level: 'good', color: 'bg-green-500' }
    if (value <= thresholds.fair) return { level: 'fair', color: 'bg-yellow-500' }
    return { level: 'poor', color: 'bg-red-500' }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">性能测试工具</h1>
        <Button
          variant="outline"
          onClick={() => setShowMonitor(!showMonitor)}
        >
          <Activity className="h-4 w-4 mr-2" />
          性能监控
        </Button>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">测试配置</TabsTrigger>
          <TabsTrigger value="results">测试结果</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* 测试配置 */}
          <Card>
            <CardHeader>
              <CardTitle>测试配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noteCount">便签数量</Label>
                  <Input
                    id="noteCount"
                    type="number"
                    value={config.noteCount}
                    onChange={(e) => setConfig(prev => ({ ...prev, noteCount: parseInt(e.target.value) }))}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchSize">批次大小</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={config.batchSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                    disabled={isRunning}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testDuration">测试持续时间（秒）</Label>
                <Input
                  id="testDuration"
                  type="number"
                  value={config.testDuration}
                  onChange={(e) => setConfig(prev => ({ ...prev, testDuration: parseInt(e.target.value) }))}
                  disabled={isRunning}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="virtualScroll"
                    checked={config.enableVirtualScroll}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableVirtualScroll: checked }))}
                    disabled={isRunning}
                  />
                  <Label htmlFor="virtualScroll">启用虚拟滚动</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cache"
                    checked={config.enableCache}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableCache: checked }))}
                    disabled={isRunning}
                  />
                  <Label htmlFor="cache">启用缓存</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 测试控制 */}
          <Card>
            <CardHeader>
              <CardTitle>测试控制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={runTest}
                disabled={isRunning}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? '测试进行中...' : '开始测试'}
              </Button>

              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentTest}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {/* 结果控制 */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">测试结果 ({results.length})</h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={exportResults} disabled={results.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                导出结果
              </Button>
              <Button variant="outline" onClick={clearResults} disabled={results.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                清除结果
              </Button>
            </div>
          </div>

          {/* 测试结果列表 */}
          <div className="space-y-4">
            {results.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  暂无测试结果，请先运行性能测试
                </CardContent>
              </Card>
            ) : (
              results.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        测试 #{results.length - index}
                      </CardTitle>
                      <Badge variant="outline">
                        {result.timestamp.toLocaleString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">初始加载</div>
                        <div className="text-muted-foreground">
                          {result.metrics.initialLoadTime.toFixed(2)}ms
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">平均渲染</div>
                        <div className="text-muted-foreground">
                          {result.metrics.averageRenderTime.toFixed(2)}ms
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">滚动FPS</div>
                        <div className="text-muted-foreground">
                          {result.metrics.scrollPerformance.averageFPS.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">内存使用</div>
                        <div className="text-muted-foreground">
                          {result.metrics.memoryUsage.peak}MB
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-muted-foreground">
                      配置: {result.config.noteCount}条便签, 批次{result.config.batchSize}, 
                      虚拟滚动{result.config.enableVirtualScroll ? '开启' : '关闭'}, 
                      缓存{result.config.enableCache ? '开启' : '关闭'}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 性能监控组件 */}
      <PerformanceMonitor
        isVisible={showMonitor}
        onToggle={() => setShowMonitor(!showMonitor)}
      />
    </div>
  )
}
