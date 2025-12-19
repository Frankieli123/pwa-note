"use client"

import { useMemo } from "react"
import { useSync } from "./use-sync"

export function useFiles() {
  const sync = useSync()

  return useMemo(() => ({
    files: sync.files,
    uploadFile: sync.uploadFile,
    deleteFile: sync.deleteFile,
    renameFile: sync.renameFile,
  }), [
    sync.files,
    sync.uploadFile,
    sync.deleteFile,
    sync.renameFile,
  ])
}
