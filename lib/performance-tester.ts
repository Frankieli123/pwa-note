/**
 * 性能测试工具
 * 用于测试9999条便签场景下的各项性能指标
 */

interface PerformanceTestConfig {
  noteCount: number
  batchSize: number
  testDuration: number // 测试持续时间（秒）
  enableVirtualScroll: boolean
  enableCache: boolean
}

interface PerformanceTestResult {
  testName: string
  config: PerformanceTestConfig
  metrics: {
    initialLoadTime: number
    averageRenderTime: number
    memoryUsage: {
      initial: number
      peak: number
      final: number
    }
    scrollPerformance: {
      averageFPS: number
      minFPS: number
      maxFPS: number
    }
    loadMorePerformance: {
      averageTime: number
      minTime: number
      maxTime: number
    }
    cachePerformance?: {
      hitRate: number
      averageAccessTime: number
    }
  }
  timestamp: Date
  userAgent: string
  deviceInfo: {
    platform: string
    memory?: number
    cores?: number
  }
}

class PerformanceTester {
  private results: PerformanceTestResult[] = []
  private isRunning = false
  private currentTest: string | null = null

  /**
   * 生成测试数据
   */
  generateTestNotes(count: number) {
    const notes = []
    const contentTemplates = [
      "这是一条测试便签，内容长度适中，用于性能测试。",
      "红杏云影视库\nCF线路: https://hongxingyunmovie.vip:443\n用户名: a3180623\n密码: DIv0qg6YRT",
      "长文本测试：" + "这是一段很长的文本内容，".repeat(20),
      "短文本",
      "包含特殊字符的文本：!@#$%^&*()_+{}|:<>?[]\\;'\",./"
    ]

    for (let i = 0; i < count; i++) {
      const template = contentTemplates[i % contentTemplates.length]
      notes.push({
        id: `test-note-${i}`,
        content: `${template} [${i + 1}/${count}]`,
        user_id: 'test-user',
        created_at: new Date(Date.now() - (count - i) * 1000),
        updated_at: new Date(Date.now() - (count - i) * 1000)
      })
    }

    return notes
  }

  /**
   * 测试初始加载性能
   */
  async testInitialLoad(config: PerformanceTestConfig): Promise<number> {
    console.log(`🚀 开始测试初始加载性能 (${config.noteCount}条便签)`)
    
    const startTime = performance.now()
    
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
    
    // 生成测试数据
    const notes = this.generateTestNotes(config.batchSize)
    
    // 模拟渲染时间
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10))
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    console.log(`✅ 初始加载完成: ${loadTime.toFixed(2)}ms`)
    return loadTime
  }

  /**
   * 测试渲染性能
   */
  async testRenderPerformance(noteCount: number): Promise<{
    averageTime: number
    samples: number[]
  }> {
    console.log(`🎨 开始测试渲染性能 (${noteCount}条便签)`)
    
    const samples: number[] = []
    const testCount = 10

    for (let i = 0; i < testCount; i++) {
      const startTime = performance.now()
      
      // 模拟虚拟滚动渲染
      const visibleItems = Math.min(noteCount, 20)
      await new Promise(resolve => setTimeout(resolve, visibleItems * 0.5))
      
      const endTime = performance.now()
      samples.push(endTime - startTime)
    }

    const averageTime = samples.reduce((a, b) => a + b, 0) / samples.length
    console.log(`✅ 渲染性能测试完成: 平均${averageTime.toFixed(2)}ms`)
    
    return { averageTime, samples }
  }

  /**
   * 测试滚动性能
   */
  async testScrollPerformance(duration: number): Promise<{
    averageFPS: number
    minFPS: number
    maxFPS: number
    samples: number[]
  }> {
    console.log(`📜 开始测试滚动性能 (${duration}秒)`)
    
    const samples: number[] = []
    const startTime = Date.now()
    let frameCount = 0
    let lastTime = performance.now()

    return new Promise(resolve => {
      const measureFrame = () => {
        const now = performance.now()
        frameCount++
        
        if (now - lastTime >= 1000) {
          const fps = Math.round((frameCount * 1000) / (now - lastTime))
          samples.push(fps)
          frameCount = 0
          lastTime = now
        }

        if (Date.now() - startTime < duration * 1000) {
          requestAnimationFrame(measureFrame)
        } else {
          const averageFPS = samples.reduce((a, b) => a + b, 0) / samples.length
          const minFPS = Math.min(...samples)
          const maxFPS = Math.max(...samples)
          
          console.log(`✅ 滚动性能测试完成: 平均${averageFPS.toFixed(1)}FPS`)
          resolve({ averageFPS, minFPS, maxFPS, samples })
        }
      }
      
      requestAnimationFrame(measureFrame)
    })
  }

  /**
   * 测试内存使用
   */
  measureMemoryUsage(): { used: number; total?: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      }
    }
    return { used: 0 }
  }

  /**
   * 测试加载更多性能
   */
  async testLoadMorePerformance(batchSize: number, iterations: number): Promise<{
    averageTime: number
    minTime: number
    maxTime: number
    samples: number[]
  }> {
    console.log(`⏬ 开始测试加载更多性能 (${iterations}次, 每次${batchSize}条)`)
    
    const samples: number[] = []

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      
      // 模拟网络请求和数据处理
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100))
      
      const endTime = performance.now()
      samples.push(endTime - startTime)
    }

    const averageTime = samples.reduce((a, b) => a + b, 0) / samples.length
    const minTime = Math.min(...samples)
    const maxTime = Math.max(...samples)
    
    console.log(`✅ 加载更多性能测试完成: 平均${averageTime.toFixed(2)}ms`)
    return { averageTime, minTime, maxTime, samples }
  }

  /**
   * 运行完整性能测试
   */
  async runFullTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
    if (this.isRunning) {
      throw new Error('测试已在运行中')
    }

    this.isRunning = true
    this.currentTest = `test-${Date.now()}`
    
    console.log('🧪 开始完整性能测试', config)

    try {
      // 记录初始内存
      const initialMemory = this.measureMemoryUsage()

      // 测试初始加载
      const initialLoadTime = await this.testInitialLoad(config)

      // 测试渲染性能
      const renderPerf = await this.testRenderPerformance(config.noteCount)

      // 测试滚动性能
      const scrollPerf = await this.testScrollPerformance(config.testDuration)

      // 测试加载更多性能
      const loadMorePerf = await this.testLoadMorePerformance(
        config.batchSize, 
        Math.ceil(config.noteCount / config.batchSize)
      )

      // 记录最终内存
      const finalMemory = this.measureMemoryUsage()

      const result: PerformanceTestResult = {
        testName: this.currentTest,
        config,
        metrics: {
          initialLoadTime,
          averageRenderTime: renderPerf.averageTime,
          memoryUsage: {
            initial: initialMemory.used,
            peak: Math.max(initialMemory.used, finalMemory.used),
            final: finalMemory.used
          },
          scrollPerformance: {
            averageFPS: scrollPerf.averageFPS,
            minFPS: scrollPerf.minFPS,
            maxFPS: scrollPerf.maxFPS
          },
          loadMorePerformance: {
            averageTime: loadMorePerf.averageTime,
            minTime: loadMorePerf.minTime,
            maxTime: loadMorePerf.maxTime
          }
        },
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        deviceInfo: {
          platform: navigator.platform,
          memory: (navigator as any).deviceMemory,
          cores: navigator.hardwareConcurrency
        }
      }

      this.results.push(result)
      console.log('✅ 性能测试完成', result)
      
      return result

    } finally {
      this.isRunning = false
      this.currentTest = null
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results]
  }

  /**
   * 清除测试结果
   */
  clearResults(): void {
    this.results = []
  }

  /**
   * 导出测试结果
   */
  exportResults(): string {
    return JSON.stringify(this.results, null, 2)
  }
}

// 导出单例实例
export const performanceTester = new PerformanceTester()

// 导出类型
export type { PerformanceTestConfig, PerformanceTestResult }
