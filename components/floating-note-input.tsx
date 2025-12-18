"use client"

import { useEffect } from "react"
import { SimpleTextEditor } from "@/components/simple-text-editor"
import { useSettings } from "@/hooks/use-settings"
import { useNoteEditorState } from "@/components/note-editor/NoteEditorState"
import { AutoSaveManager } from "@/components/note-editor/AutoSaveManager"
import { NoteEditorToolbar } from "@/components/note-editor/NoteEditorToolbar"
import { MobileNoteToolbar } from "@/components/note-editor/MobileNoteToolbar"
import { NoteEditorLayout } from "@/components/note-editor/NoteEditorLayout"
import { UploadDialogs } from "@/components/note-editor/UploadDialogs"
import { useMobile } from "@/hooks/use-mobile"

/**
 * FloatingNoteInput - 浮动笔记输入组件
 *
 * 职责：
 * - 协调各个子组件的工作
 * - 管理编辑器的整体状态和生命周期
 * - 提供统一的笔记编辑体验
 */
export function FloatingNoteInput() {
  // 使用自定义Hook管理状态
  const {
    content,
    isSaving,
    saveError,
    lastAutoSaveTime,
    isUploadDialogOpen,
    uploadType,
    isErrorDialogOpen,
    lastEditRef,
    lastContentRef,
    autoSaveTimerRef,
    editorRef,
    setContent,
    setIsSaving,
    setLastAutoSaveTime,
    setIsUploadDialogOpen,
    setIsErrorDialogOpen,
    loadDraft,
    handleSaveNote,
    handleUploadSuccess,
    openUploadDialog,
  } = useNoteEditorState()

  const { settings, applyFontSettings } = useSettings()
  const isMobile = useMobile()

  // 加载草稿内容
  useEffect(() => {
    loadDraft()
  }, [loadDraft])

  // 当设置变化时应用字体设置
  useEffect(() => {
    if (typeof window === "undefined") return

    requestAnimationFrame(() => {
      applyFontSettings()
    })
  }, [settings, applyFontSettings])

  // 渲染组件
  return (
    <>
      {/* 自动保存管理器 */}
      <AutoSaveManager
        content={content}
        lastContentRef={lastContentRef}
        lastEditRef={lastEditRef}
        autoSaveTimerRef={autoSaveTimerRef}
        setLastAutoSaveTime={setLastAutoSaveTime}
        setIsSaving={setIsSaving}
      />

      {/* 主要布局 */}
      <NoteEditorLayout
        toolbar={
          isMobile ? (
            <MobileNoteToolbar
              isSaving={isSaving}
              onSave={handleSaveNote}
              onUploadImage={() => openUploadDialog("image")}
              onUploadFile={() => openUploadDialog("file")}
            />
          ) : (
            <NoteEditorToolbar
              isSaving={isSaving}
              onSave={handleSaveNote}
              onUploadImage={() => openUploadDialog("image")}
              onUploadFile={() => openUploadDialog("file")}
              lastAutoSaveTime={lastAutoSaveTime}
            />
          )
        }
        editor={
          <SimpleTextEditor
            value={content}
            onChange={setContent}
            onSave={handleSaveNote}
            placeholder="点击此处开始输入"
          />
        }
      />

      {/* 上传和错误对话框 */}
      <UploadDialogs
        isUploadDialogOpen={isUploadDialogOpen}
        uploadType={uploadType}
        isErrorDialogOpen={isErrorDialogOpen}
        saveError={saveError}
        onUploadDialogClose={() => setIsUploadDialogOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onErrorDialogClose={() => setIsErrorDialogOpen(false)}
      />
    </>
  )
}


