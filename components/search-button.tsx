"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchDialog } from "@/components/search-dialog"
import { cn } from "@/lib/utils"

interface SearchButtonProps {
  className?: string
}

export function SearchButton({ className }: SearchButtonProps) {
  const [open, setOpen] = useState(false)

  // 键盘快捷键支持
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn("h-9 w-9 rounded-sm", className)}
        aria-label="搜索 (Ctrl+K)"
        title="搜索 (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
      </Button>
      
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
