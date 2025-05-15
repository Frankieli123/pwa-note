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

export function SyncStatus({ status, lastSyncTime, isEnabled, onToggle }: SyncStatusProps) {
  const { getRelativeTime } = useTime(); // 使用统一的时间钩子
  const isMobile = useMobile();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {lastSyncTime && (
          <span className={cn(
            "text-muted-foreground font-apply-target",
            isMobile ? "text-xs" : "text-xs"
          )}>
            {getRelativeTime(lastSyncTime)}
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn("h-8 w-8 rounded-full relative", !isEnabled && "text-muted-foreground")}
            >
              {isEnabled ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}

              {status === "syncing" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-ping absolute h-3 w-3 rounded-full bg-primary opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-primary" />
                </span>
              )}

              {status === "error" && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-destructive" />}

              {status === "success" && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-apply-target">
              {isEnabled ? "禁用自动同步" : "启用自动同步"}
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
