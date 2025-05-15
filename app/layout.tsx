import type React from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { SyncProvider } from "@/components/sync-provider"
import { SettingsProvider } from "@/components/settings-provider"
import { SilentDbInitializer } from "@/components/silent-db-initializer"
import {
  Inter,
  Noto_Sans_SC,
  Noto_Serif_SC,
  JetBrains_Mono,
  Roboto,
  Lora,
  Nunito,
  Roboto_Mono,
  Ma_Shan_Zheng,
  ZCOOL_XiaoWei,
  ZCOOL_QingKe_HuangYou,
} from "next/font/google"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/toaster"

// 优化字体加载，减少 CLS (Cumulative Layout Shift)
// 为每个字体添加 preload 策略
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
})

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: true,
})

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif",
  display: "swap",
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
})

// 添加更多字体，优化加载策略
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  preload: false, // 非主要字体可以设置为不预加载
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
})

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
  preload: false,
})

// 中文特色字体，设置为可选加载以提高性能
const maShanZheng = Ma_Shan_Zheng({
  weight: ["400"],
  variable: "--font-ma-shan-zheng",
  display: "swap",
  subsets: ["latin"],
  preload: false,
})

const zcoolXiaoWei = ZCOOL_XiaoWei({
  weight: ["400"],
  variable: "--font-zcool-xiaowei",
  display: "swap",
  subsets: ["latin"],
  preload: false,
})

const zcoolQingKeHuangYou = ZCOOL_QingKe_HuangYou({
  weight: ["400"],
  variable: "--font-zcool-qingke-huangyou",
  display: "swap",
  subsets: ["latin"],
  preload: false,
})

// 优化 metadata 以提高性能
export const metadata: Metadata = {
  title: "快速笔记",
  description: "跨平台笔记应用，支持实时同步",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "快速笔记",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`
        ${inter.variable} 
        ${notoSans.variable} 
        ${notoSerif.variable} 
        ${jetbrainsMono.variable}
        ${roboto.variable}
        ${lora.variable}
        ${nunito.variable}
        ${robotoMono.variable}
        ${maShanZheng.variable}
        ${zcoolXiaoWei.variable}
        ${zcoolQingKeHuangYou.variable}
      `}
    >
      <head>
        {/* 预加载主要字体以减少 CLS */}
        <link rel="preload" href="/fonts/noto-sans-sc-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SettingsProvider>
            <AuthProvider>
              <SyncProvider>
                <SilentDbInitializer />
                {children}
                <Toaster />
              </SyncProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
