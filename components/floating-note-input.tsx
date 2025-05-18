"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/use-sync"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Editor } from "@/components/editor"
import { useSettings } from "@/hooks/use-settings"
import { useTime } from "@/hooks/use-time"
import { Save, FileUp, Paperclip, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { FileUploader } from "@/components/file-uploader"
import { useAuth } from "@/hooks/use-auth"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

export function FloatingNoteInput() {
  const [content, setContent] = useState("")
  const { status, sync, saveNote } = useSync()
  const { settings, applyFontSettings } = useSettings()
  const { toast } = useToast()
  const isMobile = useMobile()
  const { user } = useAuth()
  const lastEditRef = useRef<Date>(new Date())
  const lastContentRef = useRef<string>("")
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const prevSettingsRef = useRef(settings)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState<"image" | "file">("image")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setError] = useState<string | null>(null)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  const { getRelativeTime } = useTime()
  // Add state to track if we're on client side
  const [isClient, setIsClient] = useState(false)
  // 添加键盘状态
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  // First mark that we're on the client to fix hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 监听移动端键盘弹出事件
  useEffect(() => {
    if (!isClient || !isMobile) return;
    
    // 在iOS上，键盘弹出时窗口高度会变小
    const handleResize = () => {
      // 如果可视高度比窗口高度小很多，键盘可能已弹出
      const isKeyboard = window.innerHeight < window.outerHeight * 0.75;
      setIsKeyboardVisible(isKeyboard);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient, isMobile]);

  // 定期更新当前时间
  useEffect(() => {
    // Only start updating time after hydration is complete
    if (!isClient) return;
    
    // 每秒更新一次时间
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isClient]);

  // 格式化日期函数
  const formatDate = (date: Date) => {
    if (!isClient) return "加载日期中..."; // Static placeholder for server
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long'
    }) + ' ' + date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 加载草稿内容
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedDraft = localStorage.getItem("noteDraft");
    if (savedDraft) {
      setContent(savedDraft);
      lastContentRef.current = savedDraft;
    }
  }, []);

  // 当设置变化时应用字体设置
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      prevSettingsRef.current.fontFamily !== settings.fontFamily ||
      prevSettingsRef.current.fontSize !== settings.fontSize
    ) {
      requestAnimationFrame(() => {
        applyFontSettings();
      });
      prevSettingsRef.current = { ...settings };
    }
  }, [settings, applyFontSettings]);

  // 优化自动保存逻辑
  useEffect(() => {
    if (typeof window === "undefined") return
    
    // 调试信息
    console.log("自动保存间隔设置为:", settings.syncInterval, "秒");

    // 内容没变，不需要设置新的计时器
    if (content === lastContentRef.current) return

    // 记录编辑时间
    lastEditRef.current = new Date()
    console.log("内容已变更，重置自动保存计时器");

    // 清除之前的计时器
    if (autoSaveTimerRef.current) {
      console.log("清除之前的自动保存计时器");
      clearTimeout(autoSaveTimerRef.current)
    }

    // 设置新的自动保存计时器
    console.log(`设置新的自动保存计时器: ${settings.syncInterval}秒后执行`);
    autoSaveTimerRef.current = setTimeout(async () => {
      if (content && content.trim() && content !== lastContentRef.current && user) {
        console.log("自动保存执行: 保存到本地存储");
        localStorage.setItem("noteDraft", content)
        lastContentRef.current = content
        
        // 更新最后自动保存时间
        const now = new Date();
        setLastAutoSaveTime(now);

        // 增加自动保存状态提示
        setIsSaving(true);
        
        try {
          console.log("自动保存执行: 保存到数据库");
          // 实际保存到数据库，使用"new"作为ID以创建新的笔记
          const result = await saveNote("new", content);
          console.log("自动保存结果:", result);
          
          if (result) {
            console.log("自动保存成功");
            // 移除自动保存的 toast 提示
          } else {
            console.error("自动保存失败");
          }
        } catch (error) {
          console.error("自动保存错误:", error);
        } finally {
          setIsSaving(false);
        }
      } else {
        console.log("内容为空、未变化或用户未登录，跳过自动保存");
      }
    }, settings.syncInterval * 1000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [content, saveNote, sync, settings.syncInterval, user])

  // 优化保存便签函数
  const handleSaveNote = async () => {
    console.log("开始保存便签...")
    console.log("内容:", content)
    console.log("用户登录状态:", !!user)

    if (!content.trim()) {
      toast({
        title: "无法保存空笔记",
        description: "请先添加一些内容",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能保存便签",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // 保存为便签，使用"new"作为ID来创建新的笔记
      console.log("调用 saveNote 函数...")
      const result = await saveNote("new", content);
      console.log("保存结果:", result);

      if (result) {
        // 清空编辑器
        setContent("")
        localStorage.removeItem("noteDraft")
        lastContentRef.current = ""
        
        toast({
          title: "保存成功",
          description: "便签已保存",
        })
      } else {
        const errorMsg = "保存便签时发生未知错误"
        console.error("保存便签失败:", errorMsg)
        setError(errorMsg)
        setIsErrorDialogOpen(true)

        toast({
          title: "保存失败",
          description: "无法保存便签",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("保存便签错误:", error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      setError(errorMsg)
      setIsErrorDialogOpen(true)

      toast({
        title: "保存失败",
        description: "发生错误，请查看详细信息",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 处理上传完成
  const handleUploadComplete = useCallback(() => {
    setIsUploadDialogOpen(false)
    toast({
      title: "上传成功",
      description: "文件已上传并可在同步面板中查看",
    })
  }, [toast])

  // 打开上传对话框
  const openUploadDialog = useCallback((type: "image" | "file") => {
    setUploadType(type)
    setIsUploadDialogOpen(true)
  }, [])

  // 使用 useMemo 优化类名计算
  const cardClassName = cn(
    "w-full shadow-lg transition-all duration-300",
    "bg-background/80 backdrop-blur-xl border border-border/50",
    "rounded-2xl overflow-hidden",
    isMobile 
      ? "h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] mx-0 my-0" 
      : "h-[85vh] max-h-[800px] max-w-3xl mx-auto",
  )

  // 创建移动端专用工具栏组件
  const MobileToolbar = () => (
    <div className="w-full flex justify-around items-center px-2 py-1 bg-background/95 border-t-0">
      <button
        onClick={() => openUploadDialog("image")}
        className="flex-1 flex items-center justify-center gap-1"
        style={{ fontSize: "14px", height: "36px" }}
      >
        <FileUp className="h-4 w-4" />
        <span>图片</span>
      </button>
      <button
        onClick={() => openUploadDialog("file")}
        className="flex-1 flex items-center justify-center gap-1"
        style={{ fontSize: "14px", height: "36px" }}
      >
        <Paperclip className="h-4 w-4" />
        <span>文件</span>
      </button>
      <button
        onClick={handleSaveNote}
        disabled={!content.trim() || isSaving}
        className="flex-1 flex items-center justify-center gap-1"
        style={{ fontSize: "14px", height: "36px" }}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>保存</span>
      </button>
    </div>
  );

  // 创建移动设备专用的渲染函数
  const renderMobileLayout = () => {
    return (
      <div 
        className="fixed inset-0 top-12 bottom-0 z-20 bg-background flex flex-col" 
        style={{ 
          touchAction: 'none', 
          userSelect: 'none',
          height: 'calc(100% - 3.5rem)',
          overscrollBehavior: 'none'
        }}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* 移动端工具栏 - 位置与标题栏底部对齐 */}
        <MobileToolbar />
        
        {/* 编辑器卡片 - 使用fixed定位完全阻止上拉 */}
        <Card className="flex-1 w-full shadow-none bg-background/95 border-0 rounded-none m-0">
          <CardContent className="px-2 h-full overflow-hidden">
            {/* 编辑区域 - 使用多重技术禁止拖动 */}
            <div 
              className="h-full" 
              style={{ touchAction: 'none', userSelect: 'none', overscrollBehavior: 'none' }}
            >
              <Editor 
                value={content} 
                onChange={setContent} 
                placeholder="点击此处开始输入" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 创建桌面版专用的渲染函数
  const renderDesktopLayout = () => {
    return (
      <Card className={cardClassName}>
        <CardContent className="p-0 h-full flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex flex-col text-sm font-medium text-muted-foreground">
              <div className="font-apply-target">
                {isClient ? formatDate(currentDate) : "加载日期中..."}
              </div>
              {lastAutoSaveTime && (
                <div className="opacity-70 font-apply-target text-xs mt-1">
                  上次自动保存: {lastAutoSaveTime.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openUploadDialog("image")}
                className="flex items-center gap-1"
              >
                <FileUp className="h-4 w-4" />
                <span className="font-apply-target">上传图片</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openUploadDialog("file")}
                className="flex items-center gap-1"
              >
                <Paperclip className="h-4 w-4" />
                <span className="font-apply-target">上传文件</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveNote}
                disabled={!content.trim() || isSaving}
                className="flex items-center gap-1"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="font-apply-target">{isSaving ? "保存中..." : "保存便签"}</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <Editor value={content} onChange={setContent} placeholder="点击此处开始输入" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className={cn(
          "max-w-md mx-auto", 
          isMobile && "w-[90%] p-4 top-[30%] fixed left-[5%] right-[5%]"
        )}>
          <DialogHeader>
            <DialogTitle className="font-apply-target">{uploadType === "image" ? "上传图片" : "上传文件"}</DialogTitle>
            <DialogDescription className="font-apply-target">
              {uploadType === "image"
                ? "上传图片到您的笔记应用。支持 JPG、PNG 和 GIF 格式。"
                : "上传文件到您的笔记应用。支持 PDF、DOC、TXT 等格式。"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FileUploader
              accept={uploadType === "image" ? "image/*" : ".pdf,.doc,.docx,.txt"}
              label={uploadType === "image" ? "拖放图片到此处" : "拖放文件到此处"}
              maxSize={uploadType === "image" ? 5 : 20}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              <span className="font-apply-target">取消</span>
            </Button>
            <Button onClick={handleUploadComplete}>
              <span className="font-apply-target">完成</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className={cn(
          "max-w-md mx-auto", 
          isMobile && "w-[90%] p-4 top-[30%] fixed left-[5%] right-[5%]"
        )}>
          <DialogHeader>
            <DialogTitle className="font-apply-target">保存便签失败 ❌</DialogTitle>
            <DialogDescription className="font-apply-target">保存便签时发生错误</DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-1 font-apply-target">错误详情:</div>
              <div className="bg-muted p-2 rounded-md overflow-auto max-h-40 text-xs">
                <pre className="font-apply-target">{saveError}</pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsErrorDialogOpen(false)}>
              <span className="font-apply-target">关闭</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
