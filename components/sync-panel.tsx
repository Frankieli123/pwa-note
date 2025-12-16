"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSync } from "@/hooks/use-sync"
import { FileUploader } from "@/components/file-uploader"
import { FileGrid } from "@/components/file-grid"
import { SyncStatus } from "@/components/sync-status"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { FileText, Image as ImageIcon, Link2, StickyNote, Cloud, MoreVertical, Plus } from "lucide-react"
import { LinksList } from "@/components/links-list"
import { LinkForm } from "@/components/link-form"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { VirtualNotesList } from "@/components/virtual-scroll/VirtualNotesList"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

// 添加onExpandChange回调属性
interface SyncPanelProps {
  onExpandChange?: (isExpanded: boolean) => void;
}

export function SyncPanel({ onExpandChange }: SyncPanelProps) {
  const {
    files,
    lastSync,
    status,
    sync,
    notes,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    createGroup,
    deleteGroup,
    moveNoteToGroup,
    deleteNote,
    saveNote,
    loadMoreNotesCursor,
    hasMoreNotes,
    isLoadingMore
  } = useSync()
  const [activeTab, setActiveTab] = useState("notes")
  const [showLinkForm, setShowLinkForm] = useState(false)
  const isMobile = useMobile()
  const { toast } = useToast()
  const [isCollapsed, setIsCollapsed] = useState(isMobile ? true : false)
  const uploadedFiles = files || []; // Provide a default empty array if files is undefined
  const isSyncEnabled = true; // Default to true since it's not provided by context
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

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
      thumbnail: file.thumbnail || undefined,
      uploadedAt: file.uploaded_at,
      size: file.size,
      base64_data: file.base64_data,
      user_id: file.user_id
    }))

  const documentFiles = uploadedFiles
    .filter((file) => !file.type.startsWith("image/"))
    .map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      url: file.url,
      thumbnail: file.thumbnail || undefined,
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







  // 使用虚拟滚动渲染便签列表（支持9999条便签）
  const renderNotes = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 pb-2">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部便签</SelectItem>
              <SelectItem value="ungrouped">未分组</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setIsCreateGroupOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                新建分组
              </DropdownMenuItem>

              {selectedGroupId !== "all" && selectedGroupId !== "ungrouped" && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    deleteGroup(selectedGroupId)
                  }}
                >
                  删除当前分组
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建分组</DialogTitle>
              </DialogHeader>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="分组名称"
              />
              <DialogFooter>
                <Button
                  onClick={async () => {
                    const created = await createGroup(newGroupName)
                    if (created) {
                      setSelectedGroupId(created.id)
                    }
                    setNewGroupName("")
                    setIsCreateGroupOpen(false)
                  }}
                >
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 min-h-0">
          <VirtualNotesList
            notes={notes}
            onLoadMore={loadMoreNotesCursor}
            hasMore={hasMoreNotes}
            isLoading={isLoadingMore}
            onDeleteNote={deleteNote}
            onSaveNote={saveNote}
            groups={groups}
            onMoveNoteToGroup={moveNoteToGroup}
            containerHeight={0} // 设为0，让组件自动计算高度
          />
        </div>
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
                isMobile ? "justify-between py-1 h-10" : "justify-center p-2 h-12 gap-2"
              )}>
                <TabsTrigger value="notes" className={cn(
                  "rounded-md font-normal",
                  // 响应式字体大小：极小宽度text-base，中等宽度text-sm，大宽度text-base
                  "text-base sm:text-sm lg:text-base",
                  // 响应式内边距：配合字体大小调整
                  isMobile ? "px-2 py-1" : "px-1 sm:px-2 lg:px-4"
                )}>
                  <StickyNote className="h-4 w-4 mr-1" />
                  <span className="font-apply-target">便签</span>
                </TabsTrigger>
                <TabsTrigger value="docFiles" className={cn(
                  "rounded-md font-normal",
                  "text-base sm:text-sm lg:text-base",
                  isMobile ? "px-2 py-1" : "px-1 sm:px-2 lg:px-4"
                )}>
                  <FileText className="h-4 w-4 mr-1" />
                  <span className="font-apply-target">文件</span>
                </TabsTrigger>
                <TabsTrigger value="imageFiles" className={cn(
                  "rounded-md font-normal",
                  "text-base sm:text-sm lg:text-base",
                  isMobile ? "px-2 py-1" : "px-1 sm:px-2 lg:px-4"
                )}>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  <span className="font-apply-target">图片</span>
                </TabsTrigger>
                <TabsTrigger value="links" className={cn(
                  "rounded-md font-normal",
                  "text-base sm:text-sm lg:text-base",
                  isMobile ? "px-2 py-1" : "px-1 sm:px-2 lg:px-4"
                )}>
                  <Link2 className="h-4 w-4 mr-1" />
                  <span className="font-apply-target">链接</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 relative">
                <TabsContent value="notes" className="absolute inset-0 py-0 mt-0">
                  <div className="px-3 py-2 h-full">
                    {renderNotes()}
                  </div>
                </TabsContent>

                <TabsContent value="imageFiles" className="absolute inset-0 py-0 mt-0 overflow-auto">
                  <div className="p-3">
                    <div className="mb-4">
                      <FileUploader
                        accept="image/*"
                        label="拖放图片到此处上传"
                      />
                    </div>
                    <FileGrid files={imageFiles} showAsThumbnails={true} />
                  </div>
                </TabsContent>

                <TabsContent value="docFiles" className="absolute inset-0 py-0 mt-0 overflow-auto">
                  <div className="p-3">
                    <div className="mb-4">
                      <FileUploader
                        accept="*"
                        label="拖放任意文件到此处上传"
                      />
                    </div>
                    <FileGrid files={documentFiles} />
                  </div>
                </TabsContent>

                <TabsContent value="links" className="absolute inset-0 py-0 mt-0 overflow-auto">
                  <div className="p-3">
                    {!showLinkForm ? (
                      <Button
                        className={cn("w-full mb-4 text-sm", isMobile && "py-1")}
                        onClick={() => setShowLinkForm(true)}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        <span className="font-apply-target">添加新链接</span>
                      </Button>
                    ) : (
                      <div className="mb-4 pt-4">
                        <LinkForm onComplete={() => setShowLinkForm(false)} />
                      </div>
                    )}
                    <LinksList />
                  </div>
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
