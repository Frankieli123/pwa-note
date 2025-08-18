'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function ThemeHandler() {
  const { theme, systemTheme } = useTheme()

  useEffect(() => {
    const root = document.documentElement

    // 移除所有主题类
    root.classList.remove('theme-neutral')

    // 获取实际应用的主题
    const actualTheme = theme === 'system' ? systemTheme : theme

    // 应用主题类
    if (theme === 'neutral') {
      root.classList.add('theme-neutral')

      // 检查系统是否为暗色模式，如果是则添加 dark 类
      const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDarkSystem) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [theme, systemTheme])

  return null
}
