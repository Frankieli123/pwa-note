"use client"

import { useMemo } from "react"
import { useSync } from "./use-sync"

export function useNotes() {
  const sync = useSync()

  return useMemo(() => ({
    notes: sync.notes,
    groups: sync.groups,
    selectedGroupId: sync.selectedGroupId,
    setSelectedGroupId: sync.setSelectedGroupId,
    createGroup: sync.createGroup,
    deleteGroup: sync.deleteGroup,
    moveNoteToGroup: sync.moveNoteToGroup,
    saveNote: sync.saveNote,
    deleteNote: sync.deleteNote,
    loadMoreNotes: sync.loadMoreNotes,
    loadMoreNotesCursor: sync.loadMoreNotesCursor,
    hasMoreNotes: sync.hasMoreNotes,
    isLoadingMore: sync.isLoadingMore,
  }), [
    sync.notes,
    sync.groups,
    sync.selectedGroupId,
    sync.setSelectedGroupId,
    sync.createGroup,
    sync.deleteGroup,
    sync.moveNoteToGroup,
    sync.saveNote,
    sync.deleteNote,
    sync.loadMoreNotes,
    sync.loadMoreNotesCursor,
    sync.hasMoreNotes,
    sync.isLoadingMore,
  ])
}
