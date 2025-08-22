"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSync } from "@/hooks/use-sync"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileIcon, CheckCircle2, XCircle } from "lucide-react"

interface UploadLog {
  time: string
  message: string
  type: 'info' | 'success' | 'error' | 'progress'
}

export default function TestUploadProgressPage() {
  const { uploadFile } = useSync()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<UploadLog[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)

  const addLog = (message: string, type: UploadLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
    setLogs(prev => [...prev, { time, message, type }])
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setLogs([])
      setUploadResult(null)
      setProgress(0)
      addLog(`选择文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setProgress(0)
    setUploadResult(null)
    addLog('开始上传流程...', 'info')

    try {
      const startTime = Date.now()
      let lastProgressTime = startTime
      let lastProgress = 0

      const result = await uploadFile(selectedFile, (currentProgress) => {
        const now = Date.now()
        const timeDiff = now - lastProgressTime
        const progressDiff = currentProgress - lastProgress
        
        setProgress(currentProgress)
        
        // 只在进度有明显变化时记录日志
        if (progressDiff >= 5 || currentProgress === 100) {
          const speed = timeDiff > 0 ? (progressDiff / timeDiff * 1000).toFixed(2) : '0'
          addLog(
            `进度更新: ${currentProgress.toFixed(1)}% (速度: ${speed}%/s)`,
            'progress'
          )
          lastProgressTime = now
          lastProgress = currentProgress
        }

        // 记录关键节点
        if (currentProgress === 20) {
          addLog('✓ 预签名URL获取完成', 'success')
        } else if (currentProgress === 75) {
          addLog('✓ 服务器开始响应', 'success')
        } else if (currentProgress === 78) {
          addLog('✓ 文件上传完成', 'success')
        } else if (currentProgress === 80) {
          addLog('✓ MinIO上传完成', 'success')
        } else if (currentProgress >= 90 && currentProgress < 100) {
          addLog('处理文件元数据...', 'info')
        }
      })

      const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2)
      
      if (result) {
        setUploadResult({ success: true, message: `上传成功！用时 ${uploadTime} 秒` })
        addLog(`上传成功！文件URL: ${result.url}`, 'success')
        addLog(`总用时: ${uploadTime} 秒`, 'success')
      } else {
        throw new Error('上传返回结果为空')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setUploadResult({ success: false, message: errorMessage })
      addLog(`上传失败: ${errorMessage}`, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const getLogIcon = (type: UploadLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      case 'progress':
        return <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400" />
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>文件上传进度测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 文件选择区域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-input"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              {selectedFile ? (
                <>
                  <FileIcon className="h-12 w-12 text-blue-500" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">点击选择文件或拖放文件到此处</p>
                  <p className="text-sm text-gray-500">最大支持 500MB</p>
                </>
              )}
            </label>
          </div>

          {/* 上传按钮 */}
          {selectedFile && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? '上传中...' : '开始上传'}
            </Button>
          )}

          {/* 进度条 */}
          {(isUploading || progress > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>上传进度</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-xs text-gray-500">
                {progress < 20 ? '获取上传凭证...' :
                 progress < 80 ? '上传文件到存储服务...' :
                 progress < 90 ? '生成缩略图...' :
                 progress < 100 ? '保存文件信息...' : '完成'}
              </div>
            </div>
          )}

          {/* 上传结果 */}
          {uploadResult && (
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              <AlertDescription>
                {uploadResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* 日志区域 */}
          {logs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">上传日志</h3>
              <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-gray-400 flex-shrink-0">{log.time}</span>
                      {getLogIcon(log.type)}
                      <span className={
                        log.type === 'error' ? 'text-red-600' :
                        log.type === 'success' ? 'text-green-600' :
                        log.type === 'progress' ? 'text-blue-600' :
                        'text-gray-600'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 调试提示 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 提示：打开浏览器控制台查看详细的上传日志
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
