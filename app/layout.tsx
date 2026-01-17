import type React from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeHandler } from "@/components/theme-handler"
import { AuthProvider } from "@/components/auth-provider"
import { SyncProvider } from "@/components/sync-provider"
import { SettingsProvider } from "@/components/settings-provider"
import { SilentDbInitializer } from "@/components/silent-db-initializer"
import {
  Noto_Sans_SC,
  Noto_Serif_SC,
  Ma_Shan_Zheng,
  ZCOOL_XiaoWei,
} from "next/font/google"
import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

// 优化字体加载，只保留必要的字体
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

// 中文特色字体
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

// 优化 metadata 以提高性能
export const metadata: Metadata = {
  title: "快速笔记",
  description: "跨平台笔记应用，支持实时同步",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/favicon.png" },
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
// 移除maximumScale限制以提升可访问性，允许用户缩放
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        ${notoSans.variable}
        ${notoSerif.variable}
        ${maShanZheng.variable}
        ${zcoolXiaoWei.variable}
      `}
    >
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="background-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="快速笔记" />
        <link rel="manifest" href={`${basePath}/manifest.json`} />

        {/* Service Worker注册 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker 注册
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('${basePath}/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);

                      // 自动接管新版本，避免缓存导致的版本不一致（如 Server Action ID 不匹配）
                      var refreshing = false;
                      navigator.serviceWorker.addEventListener('controllerchange', function () {
                        if (refreshing) return;
                        refreshing = true;
                        window.location.reload();
                      });

                      var activateWaitingWorker = function () {
                        if (registration.waiting) {
                          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                      };

                      activateWaitingWorker();

                      registration.addEventListener('updatefound', function () {
                        var newWorker = registration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', function () {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            activateWaitingWorker();
                          }
                        });
                      });
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
        <link rel="icon" href={`${basePath}/favicon.png`} />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
        <link rel="shortcut icon" href={`${basePath}/favicon.png`} />

        {/* 字体初始化脚本 - 在页面渲染前设置字体 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 默认设置
                  let fontFamily = 'zcool-xiaowei';
                  let fontSize = 'medium';

                  // 尝试从 localStorage 读取用户设置
                  const settings = localStorage.getItem('userSettings');
                  if (settings) {
                    const parsed = JSON.parse(settings);
                    fontFamily = parsed.fontFamily || 'zcool-xiaowei';
                    fontSize = parsed.fontSize || 'medium';
                  }

                  // 立即设置到 :root 元素
                  document.documentElement.setAttribute('data-font-family', fontFamily);
                  document.documentElement.setAttribute('data-font-size', fontSize);
                } catch (e) {
                  // 如果出错，使用默认设置
                  document.documentElement.setAttribute('data-font-family', 'zcool-xiaowei');
                  document.documentElement.setAttribute('data-font-size', 'medium');
                }
              })();
            `,
          }}
        />


      </head>
      <body>
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark', 'neutral', 'system']}
          >
            <AuthProvider>
              <SettingsProvider>
                <SyncProvider>
                  <ThemeHandler />
                  <SilentDbInitializer />
                  {children}
                  <Toaster />
                </SyncProvider>
              </SettingsProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
