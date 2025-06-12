"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Progress } from "@/components/ui/progress"
import { useSync } from "@/hooks/use-sync"
import { cn } from "@/lib/utils"
import { AlertCircle, Upload, Link2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface FileUploaderProps {
  accept?: string
  label?: string
  className?: string
  maxSize?: number // 最大文件大小（MB）
  multiple?: boolean
  onClick?: () => void // 添加点击回调
  onUploadSuccess?: (url: string) => void // 上传成功回调
}

// 文件类型配置
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
]

const MAX_IMAGE_SIZE = 5 // MB
const MAX_DOCUMENT_SIZE = 20 // MB

// 文件验证函数
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type)

  // 检查文件类型
  if (!isImage && !isDocument) {
    return {
      isValid: false,
      error: `不支持的文件类型: ${file.type}。支持的图片格式: JPG, PNG, GIF, WebP；支持的文档格式: PDF, DOC, DOCX, TXT, XLS, XLSX, CSV`
    }
  }

  // 检查文件大小
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE
  const fileSizeMB = file.size / (1024 * 1024)

  if (fileSizeMB > maxSize) {
    return {
      isValid: false,
      error: `文件大小超过限制: ${fileSizeMB.toFixed(1)}MB > ${maxSize}MB (${isImage ? '图片' : '文档'})`
    }
  }

  return { isValid: true }
}

export function FileUploader({
  accept = "*",
  label = "拖放文件到此处",
  className,
  maxSize = 10, // 默认10MB
  multiple = true,
  onClick,
  onUploadSuccess,
}: FileUploaderProps) {
  const { uploadFile } = useSync()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      if (onClick) return // 如果有onClick回调，不处理文件上传

      setIsUploading(true)
      setUploadProgress(0)
      setError(null)

      // 验证所有文件
      const validationErrors: string[] = []
      const validFiles: File[] = []

      for (const file of acceptedFiles) {
        const validation = validateFile(file)
        if (validation.isValid) {
          validFiles.push(file)
        } else {
          validationErrors.push(`${file.name}: ${validation.error}`)
        }
      }

      // 如果有验证错误，显示错误信息
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'))
        setIsUploading(false)
        return
      }

      // 如果没有有效文件，退出
      if (validFiles.length === 0) {
        setError('没有有效的文件可以上传')
        setIsUploading(false)
        return
      }

      // 模拟进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + 5
        })
      }, 100)

      try {
        // 检查网络状态
        if (!navigator.onLine) {
          setError("网络连接不可用，请检查网络连接后重试")
          setIsUploading(false)
          clearInterval(progressInterval)
          return
        }

        // 上传每个验证通过的文件
        for (const file of validFiles) {
          const result = await uploadFile(file)
          if (result && onUploadSuccess) {
            onUploadSuccess(result.url)
          }
        }

        // 完成进度
        setUploadProgress(100)

        // 延迟后重置
        setTimeout(() => {
          setIsUploading(false)
          setUploadProgress(0)
        }, 1000)
      } catch (error) {
        console.error("上传失败:", error)

        // 根据错误类型提供更具体的错误信息
        let errorMessage = "上传失败，请重试"
        if (error instanceof Error) {
          if (error.message.includes("网络")) {
            errorMessage = "网络连接失败，请检查网络连接后重试"
          } else if (error.message.includes("大小")) {
            errorMessage = "文件大小超过限制，请选择更小的文件"
          } else if (error.message.includes("类型")) {
            errorMessage = "文件类型不支持，请选择支持的文件格式"
          } else if (error.message.includes("服务器")) {
            errorMessage = "服务器暂时不可用，请稍后重试"
          }
        }

        setError(errorMessage)
        setIsUploading(false)
      } finally {
        clearInterval(progressInterval)
      }
    },
    [uploadFile, maxSize, onClick, onUploadSuccess],
  )

  // 正确处理 MIME 类型配置
  const getAcceptConfig = (acceptString: string) => {
    if (!acceptString || acceptString === "*") return undefined;

    // 如果包含逗号，说明是多个 MIME 类型
    if (acceptString.includes(",")) {
      const mimeTypes = acceptString.split(",").map(type => type.trim());
      const acceptConfig: Record<string, string[]> = {};

      mimeTypes.forEach(mimeType => {
        acceptConfig[mimeType] = [];
      });

      return acceptConfig;
    }

    // 单个 MIME 类型或通配符
    return { [acceptString.includes("/") ? acceptString : `${acceptString}/*`]: [] };
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: getAcceptConfig(accept),
    multiple,
    noClick: isUploading || !!onClick, // 上传中或有onClick回调时禁用默认点击
  })

  // 处理自定义点击
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      open()
    }
  }

  return (
    <div className={cn("w-full h-32", className)}>
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-3 transition-colors h-full",
          "flex flex-col items-center justify-center text-center",
          isDragActive ? "border-primary bg-primary/5" : "border-border",
          isUploading && "pointer-events-none opacity-70",
          onClick && "cursor-pointer hover:border-primary hover:bg-primary/5",
        )}
        onClick={handleClick}
      >
        <input {...getInputProps()} />

        {onClick ? (
          <Link2 className="h-6 w-6 text-muted-foreground mb-1" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
        )}

        <p className="text-sm text-muted-foreground">{isDragActive ? "放下文件以上传" : label}</p>

        {!onClick && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>或</span>
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={open}>
              <span>选择文件</span>
            </Button>
            <span>· 最大 {maxSize}MB</span>
          </div>
        )}

        {isUploading && (
          <div className="w-full mt-2">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">上传中... {uploadProgress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
