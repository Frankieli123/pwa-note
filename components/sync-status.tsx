"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Cloud, CloudOff } from "lucide-react"
import { useTime } from "@/hooks/use-time"
import { useMobile } from "@/hooks/use-mobile"

interface SyncStatusProps {
  status: "idle" | "syncing" | "error" | "success"
  lastSyncTime: Date | null
  isEnabled: boolean
  onToggle: () => void
}

export function SyncStatus({ status, isEnabled, onToggle }: SyncStatusProps) {

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn("h-8 w-8 rounded-full relative", !isEnabled && "text-muted-foreground")}
            >
              {isEnabled ? (
                <Cloud className={cn(
                  "h-4 w-4",
                  status === "syncing" && "animate-breathing"
                )} />
              ) : (
                <CloudOff className="h-4 w-4" />
              )}

              {status === "error" && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-destructive" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>点击立即同步数据</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
