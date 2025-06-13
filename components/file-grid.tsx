"use client"

import { Card, CardContent } from "@/components/ui/card"

import { Download, FileIcon, FileTextIcon, ImageIcon, Trash2, Eye } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/use-sync"
import { useToast } from "@/hooks/use-toast"
import { useTime } from "@/hooks/use-time"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
// 移除 file-download 引用，直接使用 Blob URL

interface FileGridProps {
  files: Array<{
    id: string
    name: string
    type: string
    url: string
    thumbnail?: string
    uploadedAt: Date
    size: number
    base64_data?: string | null
    user_id: string
  }>
  showAsThumbnails?: boolean
}

export function FileGrid({ files, showAsThumbnails = false }: FileGridProps) {
  const { deleteFile, user } = useSync()
  const { toast } = useToast()
  const { getRelativeTime } = useTime()
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)

  // 直接删除文件，不显示确认弹窗
  const handleDeleteClick = (id: string) => {
    deleteFile(id)
  }

  // 处理文件下载
  const handleDownloadClick = async (file: {
    id: string
    name: string
    type: string
    url: string
    blob_url?: string
  }) => {
    try {
      // 使用下载API强制下载文件
      if (!user) {
        throw new Error('用户未登录')
      }

      const downloadUrl = `/api/files/download?id=${file.id}&userId=${user.id}&format=download`

      // 创建隐藏的下载链接
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.name
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "下载开始",
        description: `正在下载 ${file.name}`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        variant: "destructive",
        title: "下载失败",
        description: error instanceof Error ? error.message : "未能下载文件，请稍后再试",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (files.length === 0) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-apply-target">暂无上传文件</div>
  }

  return (
    <>
      <div className={cn("grid gap-4", showAsThumbnails ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1")}>
        {files.map((file) => (
          <Card key={file.id} className="overflow-hidden rounded-xl">
            <CardContent className="p-0">
              {showAsThumbnails && (file.thumbnail || file.type.startsWith('image/')) ? (
              <div className="relative aspect-square group">
                <Image
                  src={file.thumbnail || file.url || "/placeholder.svg"}
                  alt={file.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // 如果缩略图加载失败，尝试使用原图
                    const target = e.target as HTMLImageElement;
                    if (target.src !== file.url && file.type.startsWith('image/')) {
                      target.src = file.url;
                    } else {
                      target.src = "/placeholder.svg";
                    }
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-1 text-sm truncate font-apply-target">
                  {file.name}
                </div>
                <div className="absolute top-1 right-1 text-xs bg-background/80 backdrop-blur-sm rounded px-1 font-apply-target">
                  {getRelativeTime(file.uploadedAt)}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {file.type.startsWith('image/') && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => setPreviewImage({ url: file.url, name: file.name })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleDownloadClick(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClick(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 flex items-center gap-3">
                {file.type.includes("image") ? (
                  <ImageIcon className="h-8 w-8 text-blue-500" />
                ) : file.type.includes("pdf") ? (
                  <FileTextIcon className="h-8 w-8 text-red-500" />
                ) : file.type.includes("spreadsheet") || 
                   file.type.includes("excel") || 
                   file.name.endsWith(".xlsx") || 
                   file.name.endsWith(".xls") || 
                   file.name.endsWith(".csv") ? (
                  <FileIcon className="h-8 w-8 text-green-500" />
                ) : (
                  <FileIcon className="h-8 w-8 text-gray-500" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate font-apply-target text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground font-apply-target">
                    {getRelativeTime(file.uploadedAt)} -
                    {formatFileSize(file.size)}
                  </div>
                </div>

                <div className="flex gap-1">
                  {file.type.startsWith('image/') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setPreviewImage({ url: file.url, name: file.name })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownloadClick(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      </div>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">
            {previewImage ? `预览图片: ${previewImage.name}` : "图片预览"}
          </DialogTitle>
          {previewImage && (
            <div className="relative w-full h-full">
              <Image
                src={previewImage.url}
                alt={previewImage.name}
                width={800}
                height={600}
                className="w-full h-auto max-h-[85vh] object-contain"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 sm:p-4">
                <p className="text-xs sm:text-sm font-medium truncate">{previewImage.name}</p>
                <div className="flex gap-2 mt-1 sm:mt-2">
                  <Button
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      const file = files.find(f => f.url === previewImage.url)
                      if (file) {
                        handleDownloadClick(file)
                      }
                    }}
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    下载
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
