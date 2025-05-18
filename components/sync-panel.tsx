"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSync } from "@/hooks/use-sync"
import { FileUploader } from "@/components/file-uploader"
import { FileGrid } from "@/components/file-grid"
import { SyncStatus } from "@/components/sync-status"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { FileText, Image, Link2, StickyNote, Trash2, Copy, Check, Cloud } from "lucide-react"
import { LinksList } from "@/components/links-list"
import { LinkForm } from "@/components/link-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTime } from "@/hooks/use-time"
import { useToast } from "@/hooks/use-toast"

export function SyncPanel() {
  const { files, lastSync, status, isInitialized, sync, notes, deleteNote } = useSync()
  const [activeTab, setActiveTab] = useState("notes")
  const [showLinkForm, setShowLinkForm] = useState(false)
  const isMobile = useMobile()
  const { toast } = useToast()
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(isMobile ? true : false)
  const { getRelativeTime } = useTime();
  const uploadedFiles = files || []; // Provide a default empty array if files is undefined
  const isSyncEnabled = true; // Default to true since it's not provided by context
  // 点击云朵按钮强制刷新数据
  const toggleSync = () => {
    // 显式指定非静默模式，这样会显示同步状态和通知
    sync(false);
    
    // 只显示同步开始通知，成功后不显示
    toast({
      title: "正在同步数据",
      description: "正在从服务器获取最新数据...",
      duration: 2000,
    });
  };

  useEffect(() => {
    setIsCollapsed(isMobile ? true : false)
  }, [isMobile])

  // Transform files to match FileGrid component's expected format
  const imageFiles = uploadedFiles
    .filter((file) => file.type.startsWith("image/"))
    .map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      url: file.url,
      thumbnail: file.thumbnail ? String(file.thumbnail) : undefined,
      uploadedAt: file.uploaded_at,
      size: file.size
    }))

  const documentFiles = uploadedFiles
    .filter((file) => file.type.includes("pdf") || file.type.includes("doc") || file.type.includes("text"))
    .map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      url: file.url,
      thumbnail: file.thumbnail ? String(file.thumbnail) : undefined,
      uploadedAt: file.uploaded_at,
      size: file.size
    }))

  // 当标签变化时的处理函数
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // 删除笔记 - 直接删除，不再弹出确认对话框
  const handleDeleteClick = (id: string) => {
    deleteNote(id)
  }

  // 处理复制笔记内容
  const handleCopyClick = (note: any) => {
    // 创建一个临时div来获取纯文本内容
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = note.content
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    // 添加fallback机制，防止navigator.clipboard不可用
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textContent)
          .then(() => {
            setCopiedNoteId(note.id)
            toast({
              title: "已复制到剪贴板",
              description: "便签内容已成功复制",
              duration: 2000,
            })
            
            // 2秒后重置复制状态
            setTimeout(() => {
              setCopiedNoteId(null)
            }, 2000)
          })
          .catch(err => {
            console.error('复制失败:', err)
            fallbackCopy(textContent, note.id)
          })
      } else {
        fallbackCopy(textContent, note.id)
      }
    } catch (error) {
      console.error('复制错误:', error)
      fallbackCopy(textContent, note.id)
    }
  }
  
  // 复制文本的备选方法
  const fallbackCopy = (text: string, noteId: string) => {
    try {
      // 创建临时textarea元素
      const textArea = document.createElement("textarea")
      textArea.value = text
      
      // 确保textarea不可见
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      
      // 选择文本并复制
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      
      // 移除临时元素
      document.body.removeChild(textArea)
      
      if (successful) {
        setCopiedNoteId(noteId)
        toast({
          title: "已复制到剪贴板",
          description: "便签内容已成功复制",
          duration: 2000,
        })
        
        // 2秒后重置复制状态
        setTimeout(() => {
          setCopiedNoteId(null)
        }, 2000)
      } else {
        toast({
          title: "复制失败",
          description: "无法复制内容到剪贴板",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('备选复制方法失败:', err)
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      })
    }
  }

  // 修改 renderNotes 函数，支持富文本显示
  const renderNotes = () => {
    if (notes.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-apply-target">
          暂无保存的便签
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note.id} className="overflow-hidden rounded-xl">
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0 font-apply-target">
                  {/* 使用 dangerouslySetInnerHTML 显示富文本内容 */}
                  <div
                    className="text-sm line-clamp-6 whitespace-pre-wrap mb-2 rich-text-content font-apply-target"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  <div className="text-xs text-muted-foreground flex items-center gap-2 font-apply-target">
                    <span className="font-apply-target text-xs !text-xs" style={{fontSize: "0.75rem !important"}}>
                      {getRelativeTime(note.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => handleCopyClick(note)}
                    title="复制内容"
                  >
                    {copiedNoteId === note.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(note.id)}
                    title="删除便签"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn(
      "h-full flex flex-col",
      isMobile && isCollapsed ? "h-10" : isMobile && "h-[80vh] max-h-[80vh]"
    )}>
      <div 
        className={cn(
          "flex justify-between items-center px-3 sm:px-4", 
          isMobile ? "py-2 border-b" : "py-3 border-b",
          isMobile && "cursor-pointer"
        )}
        onClick={isMobile ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center">
          <span className={cn("font-medium font-apply-target", isMobile ? "text-base" : "text-xl")}>
            同步面板 {isMobile && (notes.length > 0 || uploadedFiles.length > 0) && 
              <span className="text-xs text-muted-foreground ml-2">
                ({notes.length + uploadedFiles.length}项)
              </span>
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isMobile ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={(e) => {
                e.stopPropagation();
                toggleSync();
              }}
            >
              <Cloud className={cn(
                "h-4 w-4",
                status === "syncing" && "animate-breathing"
              )} />
            </Button>
          ) : (
            <SyncStatus
              status={status}
              lastSyncTime={lastSync}
              isEnabled={isSyncEnabled}
              onToggle={toggleSync}
            />
          )}
        </div>
      </div>
      
      {(!isMobile || !isCollapsed) && (
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden"
        )}>
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full">
              <TabsList className={cn(
                "w-full bg-transparent rounded-none px-2 sticky top-0 z-10",
                isMobile ? "justify-between py-1 h-10" : "justify-start p-2 h-12"
              )}>
                <TabsTrigger value="notes" className={cn("rounded-md", isMobile ? "px-2 py-1" : "px-4")}>
                  <StickyNote className="h-4 w-4 mr-1" />
                  <span className={cn("font-apply-target", isMobile && "text-xs")}>便签</span>
                </TabsTrigger>
                <TabsTrigger value="docFiles" className={cn("rounded-md", isMobile ? "px-2 py-1" : "px-4")}>
                  <FileText className="h-4 w-4 mr-1" />
                  <span className={cn("font-apply-target", isMobile && "text-xs")}>文件</span>
                </TabsTrigger>
                <TabsTrigger value="imageFiles" className={cn("rounded-md", isMobile ? "px-2 py-1" : "px-4")}>
                  <Image className="h-4 w-4 mr-1" />
                  <span className={cn("font-apply-target", isMobile && "text-xs")}>图片</span>
                </TabsTrigger>
                <TabsTrigger value="links" className={cn("rounded-md", isMobile ? "px-2 py-1" : "px-4")}>
                  <Link2 className="h-4 w-4 mr-1" />
                  <span className={cn("font-apply-target", isMobile && "text-xs")}>链接</span>
                </TabsTrigger>
              </TabsList>

              <div className={cn(
                "flex-1 overflow-auto relative",
                isMobile && "h-[calc(80vh-52px)]" // 确保内容区域有足够高度：总高度减去标题栏和标签栏高度
              )}>
                <TabsContent value="notes" className="flex-1 absolute inset-0 px-3 py-2 mt-0 overflow-auto">
                  {renderNotes()}
                </TabsContent>

                <TabsContent value="imageFiles" className="flex-1 absolute inset-0 px-3 py-2 mt-0 overflow-auto">
                  <div className="mb-4">
                    <FileUploader
                      accept="image/*"
                      label="拖放图片到此处上传"
                      maxSize={5}
                    />
                  </div>
                  <FileGrid files={imageFiles} showAsThumbnails={true} />
                </TabsContent>

                <TabsContent value="docFiles" className="flex-1 absolute inset-0 px-3 py-2 mt-0 overflow-auto">
                  <div className="mb-4">
                    <FileUploader
                      accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
                      label="拖放文档到此处上传"
                      maxSize={20}
                    />
                  </div>
                  <FileGrid files={documentFiles} />
                </TabsContent>

                <TabsContent value="links" className="flex-1 absolute inset-0 px-3 py-2 mt-0 overflow-auto">
                  {!showLinkForm ? (
                    <Button
                      className={cn("w-full mb-4 font-apply-target", isMobile && "text-sm py-1")}
                      onClick={() => setShowLinkForm(true)}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      添加新链接
                    </Button>
                  ) : (
                    <div className="mb-4 pt-4">
                      <LinkForm onComplete={() => setShowLinkForm(false)} />
                    </div>
                  )}
                  <LinksList />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}
