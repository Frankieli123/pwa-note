"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

interface UploadResult {
  success: boolean
  file?: {
    id: number
    name: string
    type: string
    size: number
    blob_url: string
    thumbnail_url?: string
  }
  error?: string
  message?: string
}

export default function TestBlobUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('userId', 'test_user_frontend')

      const response = await fetch('/api/files/upload-blob', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      clearInterval(progressInterval)
      setUploadProgress(100)

      setUploadResult(result)
    } catch (error) {
      setUploadResult({
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : '上传失败'
      })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Vercel Blob 文件上传测试</CardTitle>
          <CardDescription>
            测试新的 Vercel Blob 存储文件上传功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 文件选择 */}
          <div className="space-y-2">
            <Label htmlFor="file">选择文件</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
              disabled={uploading}
            />
          </div>

          {/* 文件信息 */}
          {selectedFile && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>文件名:</strong> {selectedFile.name}
                  </div>
                  <div>
                    <strong>文件大小:</strong> {formatFileSize(selectedFile.size)}
                  </div>
                  <div>
                    <strong>文件类型:</strong> {selectedFile.type}
                  </div>
                  <div>
                    <strong>最后修改:</strong> {new Date(selectedFile.lastModified).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 上传进度 */}
          {uploading && (
            <div className="space-y-2">
              <Label>上传进度</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {uploadProgress}% 完成
              </p>
            </div>
          )}

          {/* 上传按钮 */}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? '上传中...' : '上传到 Vercel Blob'}
          </Button>

          {/* 上传结果 */}
          {uploadResult && (
            <Alert className={uploadResult.success ? "border-green-500" : "border-red-500"}>
              <AlertDescription>
                {uploadResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-700">✅ 上传成功!</p>
                    <div className="text-sm space-y-1">
                      <p><strong>文件ID:</strong> {uploadResult.file?.id}</p>
                      <p><strong>文件名:</strong> {uploadResult.file?.name}</p>
                      <p><strong>文件大小:</strong> {uploadResult.file?.size && formatFileSize(uploadResult.file.size)}</p>
                      <p><strong>Blob URL:</strong></p>
                      <a 
                        href={uploadResult.file?.blob_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all text-xs"
                      >
                        {uploadResult.file?.blob_url}
                      </a>
                      {uploadResult.file?.thumbnail_url && (
                        <>
                          <p><strong>缩略图 URL:</strong></p>
                          <a 
                            href={uploadResult.file.thumbnail_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all text-xs"
                          >
                            {uploadResult.file.thumbnail_url}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-red-700">❌ 上传失败</p>
                    <p className="text-sm">{uploadResult.message}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 支持的文件类型说明 */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-2">支持的文件类型:</h4>
              <div className="text-sm space-y-1">
                <p><strong>图片 (最大 5MB):</strong> JPEG, PNG, GIF, WebP</p>
                <p><strong>文档 (最大 10MB):</strong> PDF, DOC, DOCX, TXT, XLS, XLSX, CSV</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
