"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSync } from "@/hooks/use-sync"
import { ExternalLink, Trash2, Plus } from "lucide-react"
import Image from "next/image"
import { useTime } from "@/hooks/use-time"

interface LinksListProps {
  onAddClick?: () => void
}

export function LinksList({ onAddClick }: LinksListProps) {
  const { links, deleteLink } = useSync()
  const { getRelativeTime } = useTime()

  const handleDeleteClick = (id: string) => {
    deleteLink(id)
  }

  return (
    <>
      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-sm p-4">
          <p className="mb-2 font-apply-target">暂无保存的链接</p>
          {onAddClick && (
            <Button variant="outline" size="sm" onClick={onAddClick} className="gap-1">
              <Plus className="h-4 w-4" /> <span className="font-apply-target">添加链接</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card key={link.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1 font-apply-target text-sm"
                    >
                      {link.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="text-xs text-muted-foreground truncate mt-1 font-apply-target">{link.url}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-apply-target">
                      {getRelativeTime(link.created_at)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
