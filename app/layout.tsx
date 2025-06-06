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
import type { Metadata, Viewport } from "next"
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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/2.png", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/2.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "快速笔记",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
}

// 从metadata中移出viewport配置，按照Next.js推荐方式单独导出
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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

        {/* PWA相关meta标签 */}
        <meta name="theme-color" content="#000000" />
        <meta name="background-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="快速笔记" />
        <link rel="manifest" href="/manifest.json" />

        {/* Service Worker注册 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />

        {/* 图标链接 */}
        <link rel="icon" href="/2.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/2.png" />
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SettingsProvider>
              <SyncProvider>
                <SilentDbInitializer />
                {children}
                <Toaster />
              </SyncProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
