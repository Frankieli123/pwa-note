"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useSync } from "@/hooks/use-sync"
import { FileUploader } from "@/components/file-uploader"
import { FileGrid } from "@/components/file-grid"
import { SyncStatus } from "@/components/sync-status"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { FileText, Image, Link2, StickyNote, Trash2, Copy, Check, Cloud, Save, X, Edit3 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LinksList } from "@/components/links-list"
import { LinkForm } from "@/components/link-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useTime } from "@/hooks/use-time"
import { useToast } from "@/hooks/use-toast"

// 添加onExpandChange回调属性
interface SyncPanelProps {
  onExpandChange?: (isExpanded: boolean) => void;
}

export function SyncPanel({ onExpandChange }: SyncPanelProps) {
  const { files, lastSync, status, sync, notes, deleteNote, saveNote } = useSync()
  const [activeTab, setActiveTab] = useState("notes")
  const [showLinkForm, setShowLinkForm] = useState(false)
  const isMobile = useMobile()
  const { toast } = useToast()
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(isMobile ? true : false)
  const { getRelativeTime } = useTime();
  const uploadedFiles = files || []; // Provide a default empty array if files is undefined
  const isSyncEnabled = true; // Default to true since it's not provided by context

  // 编辑状态管理
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 当展开状态变化时通知父组件
  useEffect(() => {
    if (onExpandChange && isMobile) {
      onExpandChange(!isCollapsed);
    }
  }, [isCollapsed, onExpandChange, isMobile]);

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
      size: file.size,
      base64_data: file.base64_data,
      user_id: file.user_id
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
      size: file.size,
      base64_data: file.base64_data,
      user_id: file.user_id
    }))

  // 当标签变化时的处理函数
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // 处理折叠/展开
  const handleToggleCollapse = () => {
    if (isMobile) {
      setIsCollapsed(prev => !prev);
    }
  };

  // 删除笔记 - 直接删除，不再弹出确认对话框
  const handleDeleteClick = (id: string) => {
    deleteNote(id)
  }

  // 处理双击编辑
  const handleDoubleClick = (note: any) => {
    // 如果已经在编辑其他笔记，先取消编辑
    if (editingNoteId && editingNoteId !== note.id) {
      setEditingNoteId(null)
      setEditingContent("")
    }

    // 开始编辑当前笔记
    setEditingNoteId(note.id)

    // 将HTML内容转换为纯文本用于编辑，正确处理换行
    const tempDiv = document.createElement("div")
    let html = note.content

    // 处理各种HTML换行元素，转换为换行符
    html = html.replace(/<br\s*\/?>/gi, '\n')
    html = html.replace(/<\/div>/gi, '\n')
    html = html.replace(/<\/p>/gi, '\n')
    html = html.replace(/<\/li>/gi, '\n')

    tempDiv.innerHTML = html
    let textContent = tempDiv.textContent || tempDiv.innerText || ""

    // 清理多余的换行符
    textContent = textContent.replace(/\n{3,}/g, '\n\n').trim()

    setEditingContent(textContent)

    // 延迟聚焦到文本框，不全选文本
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus()
        // 将光标移到文本末尾
        const length = editTextareaRef.current.value.length
        editTextareaRef.current.setSelectionRange(length, length)
      }
    }, 100)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingNoteId || !saveNote) return

    // 检查内容是否为空或只有空白字符
    const trimmedContent = editingContent.trim()
    if (!trimmedContent) {
      // 如果内容为空，直接删除这个笔记
      setEditingNoteId(null)
      setEditingContent("")

      // 删除空白笔记
      await handleDeleteClick(editingNoteId)

      toast({
        title: "已删除空白便签",
        description: "空白内容的便签已被删除",
        duration: 2000,
      })
      return
    }

    // 将纯文本转换为HTML格式，保持换行
    const htmlContent = trimmedContent.replace(/\n/g, '<br>')

    // 立即退出编辑模式，给用户即时反馈
    setEditingNoteId(null)
    setEditingContent("")

    // 后台保存到数据库，saveNote函数内部已经处理了UI更新和错误处理
    try {
      const result = await saveNote(editingNoteId, htmlContent)
      if (result) {
        toast({
          title: "保存成功",
          description: "便签已更新",
          duration: 2000,
        })
      } else {
        toast({
          title: "保存失败",
          description: "无法保存便签，但本地已更新",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("保存编辑失败:", error)
      toast({
        title: "保存失败",
        description: "网络错误，但本地已更新",
        variant: "destructive",
      })
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditingContent("")
  }

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  // 处理复制笔记内容
  const handleCopyClick = (note: any) => {
    // 创建一个临时div来获取纯文本内容，并正确处理换行
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = note.content
    
    // 采用更简单的方法处理HTML到纯文本的转换
    // 首先将常见的HTML块级元素替换为特定的标记
    let html = tempDiv.innerHTML
    
    // 处理div元素（这是最常见的换行来源）
    html = html.replace(/<div[^>]*>/gi, '{DIV_START}')
    html = html.replace(/<\/div>/gi, '{DIV_END}')
    
    // 处理其他块级元素
    html = html.replace(/<p[^>]*>/gi, '{P_START}')
    html = html.replace(/<\/p>/gi, '{P_END}')
    html = html.replace(/<br\s*\/?>/gi, '{BR}')
    html = html.replace(/<li[^>]*>/gi, '{LI_START}')
    html = html.replace(/<\/li>/gi, '{LI_END}')
    
    // 再次应用处理后的HTML并获取文本
    tempDiv.innerHTML = html
    let textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    // 用换行符替换标记
    textContent = textContent
      .replace(/\{DIV_START\}/g, '\n')
      .replace(/\{DIV_END\}/g, '')
      .replace(/\{P_START\}/g, '\n')
      .replace(/\{P_END\}/g, '')
      .replace(/\{BR\}/g, '\n')
      .replace(/\{LI_START\}/g, '\n• ')
      .replace(/\{LI_END\}/g, '')
    
    // 清理多余空行和空格，但确保只有单个换行符
    const cleanedText = textContent
      .replace(/\n{2,}/g, '\n')  // 两个或更多换行符替换为一个
      .replace(/^\s+|\s+$/g, '') // 移除首尾空白字符
    
    // 添加fallback机制，防止navigator.clipboard不可用
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanedText)
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
            fallbackCopy(cleanedText, note.id)
          })
      } else {
        fallbackCopy(cleanedText, note.id)
      }
    } catch (error) {
      console.error('复制错误:', error)
      fallbackCopy(cleanedText, note.id)
    }
  }
  
  // 复制文本的备选方法
  const fallbackCopy = (text: string, noteId: string) => {
    try {
      // 创建临时textarea元素（textarea比div更适合保留换行符）
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

  // 修改 renderNotes 函数，支持富文本显示和编辑
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
                  {editingNoteId === note.id ? (
                    // 编辑模式
                    <div className="space-y-3">
                      <Textarea
                        ref={editTextareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[100px] resize-none text-base"
                        placeholder="编辑便签内容..."
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-7 px-2 text-xs"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          取消
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Ctrl+Enter 保存，Esc 取消
                        </span>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <div
                      className="cursor-pointer"
                      onDoubleClick={() => handleDoubleClick(note)}
                    >
                      <div
                        className="text-sm line-clamp-6 whitespace-pre-wrap mb-2 rich-text-content hover:bg-muted/50 rounded transition-colors"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="text-xs">
                          {getRelativeTime(note.created_at)}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Edit3
                                className="h-3 w-3 opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDoubleClick(note)
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>点击编辑</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>

                {editingNoteId !== note.id && (
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleCopyClick(note)}
                          >
                            {copiedNoteId === note.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>复制内容</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>删除便签</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
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
        onClick={isMobile ? handleToggleCollapse : undefined}
      >
        <div className="flex items-center">
          <span className="font-medium text-xl">
            同步面板 {isMobile && (notes.length > 0 || uploadedFiles.length > 0) &&
              <span className="text-base text-muted-foreground ml-2">
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
                <TabsTrigger value="notes" className={cn("rounded-md text-base font-normal", isMobile ? "px-2 py-1" : "px-4")}>
                  <StickyNote className="h-4 w-4 mr-1" />
                  <span>便签</span>
                </TabsTrigger>
                <TabsTrigger value="docFiles" className={cn("rounded-md text-base font-normal", isMobile ? "px-2 py-1" : "px-4")}>
                  <FileText className="h-4 w-4 mr-1" />
                  <span>文件</span>
                </TabsTrigger>
                <TabsTrigger value="imageFiles" className={cn("rounded-md text-base font-normal", isMobile ? "px-2 py-1" : "px-4")}>
                  <Image className="h-4 w-4 mr-1" />
                  <span>图片</span>
                </TabsTrigger>
                <TabsTrigger value="links" className={cn("rounded-md text-base font-normal", isMobile ? "px-2 py-1" : "px-4")}>
                  <Link2 className="h-4 w-4 mr-1" />
                  <span>链接</span>
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
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      label="拖放文档到此处上传"
                      maxSize={20}
                    />
                  </div>
                  <FileGrid files={documentFiles} />
                </TabsContent>

                <TabsContent value="links" className="flex-1 absolute inset-0 px-3 py-2 mt-0 overflow-auto">
                  {!showLinkForm ? (
                    <Button
                      className={cn("w-full mb-4 text-sm", isMobile && "py-1")}
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

          {/* 版权信息 */}
          <div className="px-3 py-2 bg-muted/30">
            <div className="text-center text-xs text-muted-foreground">
              © Frankie 2025
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
