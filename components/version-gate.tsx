'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { APP_VERSION, handleVersionUpdate } from '@/lib/version-manager'

export function VersionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const prepareVersion = async () => {
      try {
        const hasUpdate = await handleVersionUpdate()
        if (cancelled) return

        if (hasUpdate) {
          const reloadWindow = window as typeof window & { __PWA_RELOAD_SCHEDULED__?: boolean }
          if (!reloadWindow.__PWA_RELOAD_SCHEDULED__) {
            reloadWindow.__PWA_RELOAD_SCHEDULED__ = true
            setTimeout(() => window.location.reload(), 800)
          }
          return
        }
      } catch (error) {
        console.error('Version preparation failed:', error)
      }

      if (!cancelled) {
        console.log(`Version ready: ${APP_VERSION}`)
        setReady(true)
      }
    }

    void prepareVersion()
    return () => {
      cancelled = true
    }
  }, [])

  return ready ? children : null
}
