"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/file-uploader"

interface UploadDialogsProps {
  isUploadDialogOpen: boolean
  uploadType: "image" | "file"
  isErrorDialogOpen: boolean
  saveError: string | null
  onUploadDialogClose: () => void
  onUploadSuccess: (url: string, type: "image" | "file") => void
  onErrorDialogClose: () => void
}

/**
 * UploadDialogs - 上传对话框组件
 * 
 * 职责：
 * - 管理文件上传对话框
 * - 处理错误提示对话框
 * - 提供统一的对话框交互体验
 */
export function UploadDialogs({
  isUploadDialogOpen,
  uploadType,
  isErrorDialogOpen,
  saveError,
  onUploadDialogClose,
  onUploadSuccess,
  onErrorDialogClose
}: UploadDialogsProps) {
  return (
    <>
      {/* 文件上传对话框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={onUploadDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadType === "image" ? "上传图片" : "上传文件"}
            </DialogTitle>
            <DialogDescription>
              {uploadType === "image" 
                ? "选择要上传的图片文件，支持 JPG、PNG、GIF 格式"
                : "选择要上传的文件，支持常见的文档格式"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <FileUploader
              accept={uploadType === "image" ? "image/*" : "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"}
              label={uploadType === "image"
                ? "拖放图片到此处上传 (JPG, PNG, GIF, WebP, 最大5MB)"
                : "拖放文档到此处上传 (PDF, DOC, DOCX, TXT, XLS, XLSX, CSV, 最大20MB)"
              }
              multiple={false}
              onUploadSuccess={(url) => onUploadSuccess(url, uploadType)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onUploadDialogClose}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 错误提示对话框 */}
      <Dialog open={isErrorDialogOpen} onOpenChange={onErrorDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">保存失败</DialogTitle>
            <DialogDescription>
              保存便签时遇到了问题，请稍后重试。
            </DialogDescription>
          </DialogHeader>
          
          {saveError && (
            <div className="py-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-mono">
                  {saveError}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={onErrorDialogClose}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
