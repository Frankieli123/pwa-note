"use client"

import * as React from "react"
import { useContext, useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Search, FileText, Link as LinkIcon, File, Loader2 } from "lucide-react"
import { SyncContext } from "@/components/sync-provider"
import { SearchResultNoteItem } from "@/components/search-result-note-item"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const syncContext = useContext(SyncContext)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [serverResults, setServerResults] = useState<{
    notes: any[]
    files: any[]
    links: any[]
  }>({ notes: [], files: [], links: [] })
  const abortControllerRef = useRef<AbortController | null>(null)
  const isRestoringFromCache = useRef(false)

  if (!syncContext) {
    return null
  }

  const { notes, files, links, user, saveNote, deleteNote } = syncContext

  // 搜索缓存工具函数
  const saveSearchToCache = useCallback((query: string, results: any) => {
    try {
      const cacheData = {
        query,
        results,
        timestamp: Date.now()
      }
      localStorage.setItem('search-cache', JSON.stringify(cacheData))
    } catch (error) {
      console.error('保存搜索缓存失败:', error)
    }
  }, [])

  const loadSearchFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem('search-cache')
      if (cached) {
        const cacheData = JSON.parse(cached)
        // 缓存有效期：1小时
        if (Date.now() - cacheData.timestamp < 60 * 60 * 1000) {
          return cacheData
        }
      }
    } catch (error) {
      console.error('加载搜索缓存失败:', error)
    }
    return null
  }, [])

  // 组件初始化时恢复搜索缓存
  useEffect(() => {
    if (open) {
      const cached = loadSearchFromCache()
      if (cached) {
        isRestoringFromCache.current = true
        setSearchQuery(cached.query)
        setServerResults(cached.results)
        console.log('🔄 恢复搜索缓存:', cached)
        // 短暂延迟后重置标志位，确保防抖搜索不会触发
        setTimeout(() => {
          isRestoringFromCache.current = false
        }, 500) // 给足够时间让防抖搜索跳过
      }
    }
  }, [open]) // 移除 loadSearchFromCache 依赖，避免无限循环

  // 服务端搜索函数
  const searchServer = useCallback(async (query: string) => {
    if (!user || !query.trim()) {
      setServerResults({ notes: [], files: [], links: [] })
      return
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 创建新的 AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsSearching(true)

    try {
      console.log('🔍 发起搜索请求:', { userId: user.id, query })
      const response = await fetch(
        `/api/search?userId=${user.id}&q=${encodeURIComponent(query)}&limit=10`,
        { signal: abortController.signal }
      )

      if (abortController.signal.aborted) {
        console.log('🚫 搜索请求被取消')
        return
      }

      const result = await response.json()
      console.log('📡 搜索响应:', result)

      if (result.success) {
        console.log('✅ 搜索成功，设置结果:', result.data)
        setServerResults(result.data)

        // 保存搜索结果到缓存
        saveSearchToCache(query, result.data)
      } else {
        console.error('❌ 搜索失败:', result.error)
        setServerResults({ notes: [], files: [], links: [] })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 搜索请求被中止')
        return
      }
      console.error('❌ 搜索请求失败:', error)
      setServerResults({ notes: [], files: [], links: [] })
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [user, saveSearchToCache])

  // 防抖搜索
  useEffect(() => {
    // 如果正在从缓存恢复，跳过搜索
    if (isRestoringFromCache.current) {
      console.log('🚫 跳过搜索：正在从缓存恢复')
      return
    }

    const timer = setTimeout(() => {
      searchServer(searchQuery)
    }, 300) // 300ms防抖

    return () => clearTimeout(timer)
  }, [searchQuery, searchServer])

  // 监听便签列表变化，重新搜索以更新结果
  useEffect(() => {
    // 如果正在从缓存恢复，跳过搜索
    if (isRestoringFromCache.current) {
      return
    }

    if (searchQuery.trim() && notes.length > 0) {
      // 当便签列表发生变化且有搜索查询时，重新搜索
      const timer = setTimeout(() => {
        searchServer(searchQuery)
      }, 100) // 短延迟，避免频繁搜索

      return () => clearTimeout(timer)
    }
  }, [notes, searchQuery, searchServer])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 对话框关闭时重置搜索状态
  useEffect(() => {
    if (!open) {
      setSearchQuery("")
      setServerResults({ notes: [], files: [], links: [] })
      setIsSearching(false)
    }
  }, [open])

  // 合并本地和服务端搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { notes: [], files: [], links: [] }
    }

    // 直接使用服务端结果（包含所有数据库中的数据）
    return {
      notes: serverResults.notes || [],
      files: serverResults.files || [],
      links: serverResults.links || []
    }
  }, [searchQuery, serverResults])

  // 添加调试信息
  console.log('🔍 搜索状态:', {
    searchQuery,
    isSearching,
    serverResults,
    searchResults
  })

  // 处理便签点击
  const handleNoteClick = (note: any) => {
    // TODO: 实现跳转到便签的逻辑
    console.log("点击便签:", note)
    onOpenChange(false)
  }

  // 处理文件点击
  const handleFileClick = (file: any) => {
    // 打开文件
    if (file.url) {
      window.open(file.url, '_blank')
    }
    onOpenChange(false)
  }

  // 处理链接点击
  const handleLinkClick = (link: any) => {
    // 打开链接
    window.open(link.url, '_blank')
    onOpenChange(false)
  }

  // 格式化便签内容预览并高亮关键词
  const formatNotePreview = (content: string, highlight?: string) => {
    let preview = content.length > 80 ? content.substring(0, 80) + "..." : content

    // 如果有搜索关键词，进行高亮处理
    if (highlight && highlight.trim()) {
      const regex = new RegExp(`(${highlight.trim()})`, 'gi')
      preview = preview.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
    }

    return preview
  }

  // 高亮文件名
  const highlightText = (text: string, highlight?: string) => {
    if (!highlight || !highlight.trim()) return text

    const regex = new RegExp(`(${highlight.trim()})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      aria-label="搜索便签、文件和链接"
      shouldFilter={false}
    >
      <CommandInput
        placeholder="搜索便签、文件、链接..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {isSearching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">搜索中...</span>
          </div>
        )}



        {!isSearching && searchQuery.trim() && (
          <>
            {/* 便签结果 */}
            {searchResults.notes.length > 0 && (
              <CommandGroup heading="便签">
                {searchResults.notes.map((note, index) => {
                  console.log(`📝 渲染便签 ${index + 1}:`, note)

                  // 包装操作函数以在操作后刷新搜索结果
                  const handleSaveNote = async (id: string, content: string) => {
                    const result = await saveNote(id, content)
                    // 操作成功后，短延迟重新搜索以更新结果
                    if (result) {
                      setTimeout(() => searchServer(searchQuery), 200)
                    }
                    return result
                  }

                  const handleDeleteNote = async (id: string) => {
                    const result = await deleteNote(id)
                    // 操作成功后，短延迟重新搜索以更新结果
                    if (result) {
                      setTimeout(() => searchServer(searchQuery), 200)
                    }
                    return result
                  }

                  return (
                    <CommandItem
                      key={`note-${note.id}`}
                      value={`${note.title || '无标题'} ${note.content || ''} ${note.id}`}
                      onSelect={() => {}} // 禁用默认选择行为
                      className="p-0 h-auto cursor-pointer"
                    >
                      <SearchResultNoteItem
                        note={note}
                        searchQuery={searchQuery}
                        onSaveNote={handleSaveNote}
                        onDeleteNote={handleDeleteNote}
                        onClose={() => onOpenChange(false)}
                        className="w-full"
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {/* 文件结果 */}
            {searchResults.files.length > 0 && (
              <CommandGroup heading="文件">
                {searchResults.files.map((file) => (
                  <CommandItem
                    key={`file-${file.id}`}
                    value={`file-${file.id}-${file.name}`}
                    onSelect={() => handleFileClick(file)}
                  >
                    <File className="mr-2 h-4 w-4 text-green-500" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {file.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 链接结果 */}
            {searchResults.links.length > 0 && (
              <CommandGroup heading="链接">
                {searchResults.links.map((link) => (
                  <CommandItem
                    key={`link-${link.id}`}
                    value={`link-${link.id}-${link.title}`}
                    onSelect={() => handleLinkClick(link)}
                  >
                    <LinkIcon className="mr-2 h-4 w-4 text-purple-500" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {link.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.url}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 无结果时显示 */}
            {searchResults.notes.length === 0 && searchResults.files.length === 0 && searchResults.links.length === 0 && (
              <CommandEmpty>未找到包含 "{searchQuery}" 的结果</CommandEmpty>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
