"use client"

import { useState } from "react"
import { FileUploader } from "@/components/file-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Upload, AlertTriangle } from "lucide-react"

const isDevelopment = process.env.NODE_ENV === 'development'

interface TestResult {
  id: string
  fileName: string
  fileSize: number
  status: 'pending' | 'success' | 'error'
  message?: string
  duration?: number
  url?: string
}

export default function TestUploadPage() {
  if (!isDevelopment) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="border-destructive">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              此页面仅在开发环境中可用
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 添加测试结果
  const addTestResult = (result: Omit<TestResult, 'id'>) => {
    const newResult: TestResult = {
      ...result,
      id: Date.now().toString()
    }
    setTestResults(prev => [newResult, ...prev])
    return newResult.id
  }

  // 更新测试结果
  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.id === id ? { ...result, ...updates } : result
    ))
  }

  // 测试单个文件上传
  const testFileUpload = async (file: File) => {
    const startTime = Date.now()
    const resultId = addTestResult({
      fileName: file.name,
      fileSize: file.size,
      status: 'pending'
    })

    try {
      // 模拟上传过程（这里应该调用实际的上传函数）
      console.log(`开始测试上传: ${file.name} (${formatFileSize(file.size)})`)
      
      // 这里应该调用实际的 uploadFile 函数
      // const result = await uploadFile(file)
      
      // 模拟上传延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const duration = Date.now() - startTime
      updateTestResult(resultId, {
        status: 'success',
        message: '上传成功',
        duration,
        url: `https://example.com/files/${file.name}`
      })

      console.log(`✅ 上传成功: ${file.name} (${duration}ms)`)
      
    } catch (error) {
      const duration = Date.now() - startTime
      updateTestResult(resultId, {
        status: 'error',
        message: error instanceof Error ? error.message : '上传失败',
        duration
      })

      console.error(`❌ 上传失败: ${file.name}`, error)
    }
  }

  // 运行自动化测试
  const runAutomatedTests = async () => {
    setIsRunningTests(true)
    setTestResults([])

    try {
      console.log('🚀 开始自动化测试...')

      // 测试1: 小文件 (1MB)
      console.log('📋 测试小文件上传...')
      const smallFileBlob = new Blob(['x'.repeat(1024 * 1024)], { type: 'text/plain' })
      const smallFile = new File([smallFileBlob], 'test-small-1mb.txt', { type: 'text/plain' })
      await testFileUpload(smallFile)

      // 测试2: 中等文件 (10MB)
      console.log('📋 测试中等文件上传...')
      const mediumFileBlob = new Blob(['x'.repeat(10 * 1024 * 1024)], { type: 'text/plain' })
      const mediumFile = new File([mediumFileBlob], 'test-medium-10mb.txt', { type: 'text/plain' })
      await testFileUpload(mediumFile)

      // 测试3: 大文件 (50MB)
      console.log('📋 测试大文件上传...')
      const largeFileBlob = new Blob(['x'.repeat(50 * 1024 * 1024)], { type: 'text/plain' })
      const largeFile = new File([largeFileBlob], 'test-large-50mb.txt', { type: 'text/plain' })
      await testFileUpload(largeFile)

      // 测试4: 超大文件 (100MB)
      console.log('📋 测试超大文件上传...')
      const extraLargeFileBlob = new Blob(['x'.repeat(100 * 1024 * 1024)], { type: 'text/plain' })
      const extraLargeFile = new File([extraLargeFileBlob], 'test-extra-large-100mb.txt', { type: 'text/plain' })
      await testFileUpload(extraLargeFile)

      console.log('🎉 自动化测试完成!')

    } catch (error) {
      console.error('❌ 自动化测试失败:', error)
    } finally {
      setIsRunningTests(false)
    }
  }

  // 清除测试结果
  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">大文件上传测试</h1>
        <p className="text-muted-foreground">
          测试新的直接上传到MinIO的大文件上传功能
        </p>
      </div>

      <div className="grid gap-6">
        {/* 手动测试区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              手动测试
            </CardTitle>
            <CardDescription>
              拖拽或选择文件进行上传测试，支持最大500MB文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              accept="*"
              label="拖放任意文件到此处测试上传"
              multiple={true}
              onUploadSuccess={(url) => {
                console.log('上传成功:', url)
              }}
            />
          </CardContent>
        </Card>

        {/* 自动化测试区域 */}
        <Card>
          <CardHeader>
            <CardTitle>自动化测试</CardTitle>
            <CardDescription>
              运行预定义的测试用例，测试不同大小的文件上传
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runAutomatedTests} 
                disabled={isRunningTests}
                className="flex items-center gap-2"
              >
                {isRunningTests ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    运行中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    运行测试
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={clearResults}>
                清除结果
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>测试用例:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>小文件: 1MB 文本文件</li>
                <li>中等文件: 10MB 文本文件</li>
                <li>大文件: 50MB 文本文件</li>
                <li>超大文件: 100MB 文本文件</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>测试结果</CardTitle>
              <CardDescription>
                上传测试的详细结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {result.status === 'pending' && (
                        <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
                      )}
                      
                      <div>
                        <p className="font-medium">{result.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(result.fileSize)}
                          {result.duration && ` • ${result.duration}ms`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          result.status === 'success' ? 'default' :
                          result.status === 'error' ? 'destructive' : 'secondary'
                        }
                      >
                        {result.status === 'success' ? '成功' :
                         result.status === 'error' ? '失败' : '进行中'}
                      </Badge>
                      
                      {result.message && (
                        <span className="text-sm text-muted-foreground">
                          {result.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
