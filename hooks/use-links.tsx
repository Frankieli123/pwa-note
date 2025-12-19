"use client"

import { useMemo } from "react"
import { useSync } from "./use-sync"

export function useLinks() {
  const sync = useSync()

  return useMemo(() => ({
    links: sync.links,
    saveLink: sync.saveLink,
    deleteLink: sync.deleteLink,
  }), [
    sync.links,
    sync.saveLink,
    sync.deleteLink,
  ])
}
