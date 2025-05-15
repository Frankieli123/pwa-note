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
}

export function FileUploader({
  accept = "*",
  label = "拖放文件到此处",
  className,
  maxSize = 10, // 默认10MB
  multiple = true,
  onClick,
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

      // 检查文件大小
      const oversizedFiles = acceptedFiles.filter((file) => file.size > maxSize * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        setError(`文件大小超过限制 (${maxSize}MB): ${oversizedFiles.map((f) => f.name).join(", ")}`)
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
        // 上传每个文件
        for (const file of acceptedFiles) {
          await uploadFile(file)
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
        setError("上传失败，请重试")
      } finally {
        clearInterval(progressInterval)
      }
    },
    [uploadFile, maxSize, onClick],
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: accept ? { [accept.includes("/") ? accept : `${accept}/*`]: [] } : undefined,
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
          <AlertDescription>{error}</AlertDescription>
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

        <p className="text-sm text-muted-foreground font-apply-target">{isDragActive ? "放下文件以上传" : label}</p>

        {!onClick && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 font-apply-target">
            <span className="font-apply-target">或</span>
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={open}>
              <span className="font-apply-target">选择文件</span>
            </Button>
            <span className="font-apply-target">· 最大 {maxSize}MB</span>
          </div>
        )}

        {isUploading && (
          <div className="w-full mt-2">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1 font-apply-target">上传中... {uploadProgress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
