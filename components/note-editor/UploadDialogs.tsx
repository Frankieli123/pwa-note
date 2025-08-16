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
            <DialogTitle className="font-apply-target">
              {uploadType === "image" ? "上传图片" : "上传文件"}
            </DialogTitle>
            <DialogDescription className="font-apply-target">
              {uploadType === "image"
                ? "选择要上传的图片文件"
                : "选择要上传的文件"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <FileUploader
              accept="*"
              label={uploadType === "image"
                ? "拖放图片到此处上传"
                : "拖放任意文件到此处上传"
              }
              maxSize={999999} // 不限制大小
              multiple={false}
              onUploadSuccess={(url) => onUploadSuccess(url, uploadType)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onUploadDialogClose}>
              <span className="font-apply-target">取消</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 错误提示对话框 */}
      <Dialog open={isErrorDialogOpen} onOpenChange={onErrorDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive font-apply-target">保存失败</DialogTitle>
            <DialogDescription className="font-apply-target">
              保存便签时遇到了问题，请稍后重试。
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="py-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-mono font-apply-target">
                  {saveError}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={onErrorDialogClose}>
              <span className="font-apply-target">确定</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
