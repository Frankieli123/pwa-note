"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface AppHeaderProps {
  className?: string
}

/**
 * AppHeader - 应用标题和图标组件
 * 
 * 职责：
 * - 显示应用图标和名称
 * - 响应式尺寸调整
 * - 保持品牌一致性
 */
export function AppHeader({ className }: AppHeaderProps) {
  const isMobile = useMobile()

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 px-3", className)}>
      <Image
        src="/1.png"
        alt="应用图标"
        width={isMobile ? 20 : 24}
        height={isMobile ? 20 : 24}
        className="text-foreground"
        priority
      />
      <span className="font-medium text-xl">
        快速笔记
      </span>
    </div>
  )
}
