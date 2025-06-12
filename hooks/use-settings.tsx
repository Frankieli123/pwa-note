"use client"

import { useContext } from "react"
import { SettingsContext } from "@/components/settings-provider"

// 导出类型以便在其他文件中使用
export type FontFamily =
  | "sans"
  | "serif"
  | "mono"
  | "roboto"
  | "lora"
  | "nunito"
  | "roboto-mono"
  | "ma-shan-zheng"
  | "zcool-xiaowei"
  | "zcool-qingke-huangyou"
export type FontSize = "small" | "medium" | "large" | "x-large"
export type SyncInterval = 5 | 10 | 30 | 60 | 300 | 600

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }

  return context
}
