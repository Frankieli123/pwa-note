"use client"

import type React from "react"

import { createContext, useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  cleanExpiredAvatarCache,
  getOrCreateUserAvatarConfig,
  getUserAvatarConfigFromDB,
  getUserAvatarUrl,
  type AvatarConfig,
} from "@/lib/avatar-utils"
import { hasUserPassword } from "@/app/actions/setting-actions"
import { apiUrl } from "@/lib/api-utils"

export enum AuthStatus {
  INITIALIZING = "INITIALIZING",
  CHECKING = "CHECKING",
  AUTHENTICATED = "AUTHENTICATED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
}

type User = {
  id: string
  username: string
  avatar?: string
  avatarConfig?: AvatarConfig
  dbAvatarConfig?: AvatarConfig
  deviceInfo?: {
    name: string
    type: "mobile" | "tablet" | "desktop"
    location?: string
  }
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  authStatus: AuthStatus
  isAuthenticated: boolean
  isInitializing: boolean
  login: (username: string) => Promise<void>
  loginWithPassword: (username: string, password: string) => Promise<void>
  checkUserHasPassword: (username: string) => Promise<boolean>
  logout: () => Promise<void>
}

type AuthMeResponse = {
  authenticated: boolean
  user: {
    id: string
    username: string
  } | null
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  authStatus: AuthStatus.INITIALIZING,
  isAuthenticated: false,
  isInitializing: true,
  login: async () => {},
  loginWithPassword: async () => {},
  checkUserHasPassword: async () => false,
  logout: async () => {},
})

function generateUserId(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  return `user_${Math.abs(hash).toString(16)}`
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop"

  const width = window.innerWidth
  if (width < 768) return "mobile"
  if (width < 1024) return "tablet"
  return "desktop"
}

function createDefaultDeviceInfo() {
  return {
    name: "当前设备",
    type: getDeviceType(),
  } as const
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.INITIALIZING)
  const { toast } = useToast()
  const authRequestVersionRef = useRef(0)
  const logoutPromiseRef = useRef<Promise<void> | null>(null)

  const isLoading = authStatus === AuthStatus.INITIALIZING || authStatus === AuthStatus.CHECKING
  const isAuthenticated = authStatus === AuthStatus.AUTHENTICATED && user !== null
  const isInitializing = authStatus === AuthStatus.INITIALIZING || authStatus === AuthStatus.CHECKING

  const clearLegacyTokens = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
  }, [])

  const getStoredUserData = useCallback((): User | null => {
    if (typeof window === "undefined") return null

    const savedUser = localStorage.getItem("userData")
    if (!savedUser) return null

    try {
      return JSON.parse(savedUser) as User
    } catch (error) {
      console.error("[AuthProvider] Failed to parse stored user data:", error)
      localStorage.removeItem("userData")
      return null
    }
  }, [])

  const persistUserData = useCallback((nextUser: User | null) => {
    if (typeof window === "undefined") return

    clearLegacyTokens()

    if (nextUser) {
      localStorage.setItem("userData", JSON.stringify(nextUser))
      return
    }

    localStorage.removeItem("userData")
  }, [clearLegacyTokens])

  const applyUnauthenticatedState = useCallback((status: AuthStatus = AuthStatus.UNAUTHENTICATED) => {
    persistUserData(null)
    setUser(null)
    setAuthStatus(status)
  }, [persistUserData])

  const buildAuthenticatedUser = useCallback((baseUser: { id: string; username: string }): User => {
    const storedUser = getStoredUserData()
    const previousUser = storedUser?.id === baseUser.id ? storedUser : null

    return {
      ...(previousUser ?? {}),
      id: baseUser.id,
      username: baseUser.username,
      deviceInfo: previousUser?.deviceInfo ?? createDefaultDeviceInfo(),
    }
  }, [getStoredUserData])

  const applyAuthenticatedState = useCallback((baseUser: { id: string; username: string }) => {
    const nextUser = buildAuthenticatedUser(baseUser)
    setUser(nextUser)
    setAuthStatus(AuthStatus.AUTHENTICATED)
    return nextUser
  }, [buildAuthenticatedUser])

  const loadUserAvatarFromDB = useCallback(async (userId: string) => {
    try {
      const dbAvatarConfig = await getUserAvatarConfigFromDB(userId)

      if (dbAvatarConfig) {
        setUser((prevUser) => {
          if (!prevUser || prevUser.id !== userId) return prevUser
          return {
            ...prevUser,
            dbAvatarConfig,
            avatar: getUserAvatarUrl({ ...prevUser, dbAvatarConfig }),
          }
        })
        return
      }

      const avatarConfig = getOrCreateUserAvatarConfig(userId)
      setUser((prevUser) => {
        if (!prevUser || prevUser.id !== userId) return prevUser
        return {
          ...prevUser,
          avatarConfig,
          avatar: getUserAvatarUrl({ ...prevUser, avatarConfig }),
        }
      })
    } catch (error) {
      console.error(`[AuthProvider] Failed to load avatar config for ${userId}:`, error)
      const avatarConfig = getOrCreateUserAvatarConfig(userId)
      setUser((prevUser) => {
        if (!prevUser || prevUser.id !== userId) return prevUser
        return {
          ...prevUser,
          avatarConfig,
          avatar: getUserAvatarUrl({ ...prevUser, avatarConfig }),
        }
      })
    }
  }, [])

  const restoreSession = useCallback(async (): Promise<User | null> => {
    const requestVersion = ++authRequestVersionRef.current
    console.log("[AuthProvider] Checking auth state with backend cookie")
    setAuthStatus(AuthStatus.CHECKING)

    try {
      const response = await fetch(apiUrl("/api/auth/me"), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      const result = (await response.json()) as AuthMeResponse

      if (requestVersion !== authRequestVersionRef.current) {
        return null
      }

      if (!response.ok || !result.authenticated || !result.user) {
        applyUnauthenticatedState()
        return null
      }

      const nextUser = applyAuthenticatedState(result.user)
      void loadUserAvatarFromDB(nextUser.id)
      return nextUser
    } catch (error) {
      if (requestVersion !== authRequestVersionRef.current) {
        return null
      }
      console.error("[AuthProvider] Failed to restore session:", error)
      applyUnauthenticatedState()
      return null
    }
  }, [applyAuthenticatedState, applyUnauthenticatedState, loadUserAvatarFromDB])

  useEffect(() => {
    console.log(
      `[AuthProvider] Auth status changed: ${authStatus}, user: ${user?.username || "null"}, isLoading: ${isLoading}`,
    )
  }, [authStatus, user, isLoading])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (event?: Event) => {
      if (event instanceof StorageEvent) {
        const changedKey = event.key
        if (changedKey && !["userData", "authToken", "refreshToken"].includes(changedKey)) {
          return
        }
      }

      void restoreSession()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [restoreSession])

  useEffect(() => {
    if (authStatus === AuthStatus.AUTHENTICATED && user) {
      persistUserData(user)
    }
  }, [authStatus, user, persistUserData])

  useEffect(() => {
    if (typeof window === "undefined") {
      setAuthStatus(AuthStatus.UNAUTHENTICATED)
      return
    }

    cleanExpiredAvatarCache()
    void restoreSession()
  }, [restoreSession])

  const waitForPendingLogout = useCallback(async () => {
    if (logoutPromiseRef.current) {
      await logoutPromiseRef.current
    }
  }, [])

  const handleLoginSuccess = useCallback(async () => {
    const nextUser = await restoreSession()
    if (!nextUser) {
      throw new Error("登录状态校验失败，请重试")
    }
    toast({
      title: "登录成功",
      description: "欢迎回来",
    })
  }, [restoreSession, toast])

  const login = async (username: string) => {
    console.log("[AuthProvider] Starting passwordless login:", username)
    await waitForPendingLogout()
    setAuthStatus(AuthStatus.CHECKING)

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: "" }),
        credentials: "include",
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("此用户需要密码登录")
        }
        throw new Error(result.message || "登录失败")
      }

      await handleLoginSuccess()
    } catch (error) {
      console.error("[AuthProvider] Login failed:", error)
      applyUnauthenticatedState()
      toast({
        title: "登录失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  const checkUserHasPassword = async (username: string): Promise<boolean> => {
    console.log("[AuthProvider] Checking whether user has password:", username)
    try {
      const userId = generateUserId(username)
      return await hasUserPassword(userId)
    } catch (error) {
      console.error("[AuthProvider] Failed to check password state:", error)
      return false
    }
  }

  const loginWithPassword = async (username: string, password: string) => {
    console.log("[AuthProvider] Starting password login:", username)
    await waitForPendingLogout()
    setAuthStatus(AuthStatus.CHECKING)

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "登录失败")
      }

      await handleLoginSuccess()
    } catch (error) {
      console.error("[AuthProvider] Password login failed:", error)
      applyUnauthenticatedState()
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive",
      })
      throw error
    }
  }

  const logout = async () => {
    if (logoutPromiseRef.current) {
      await logoutPromiseRef.current
      return
    }

    console.log("[AuthProvider] Starting logout")
    authRequestVersionRef.current += 1
    applyUnauthenticatedState(AuthStatus.CHECKING)

    const logoutTask = (async () => {
      try {
        const response = await fetch(apiUrl("/api/auth/logout"), {
          method: "POST",
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`Logout failed with status ${response.status}`)
        }
      } catch (error) {
        console.error("[AuthProvider] Logout request failed:", error)
      } finally {
        logoutPromiseRef.current = null
        setAuthStatus(AuthStatus.UNAUTHENTICATED)
        toast({
          title: "已退出登录",
          description: "您已成功退出登录",
        })
      }
    })()

    logoutPromiseRef.current = logoutTask
    await logoutTask
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authStatus,
        isAuthenticated,
        isInitializing,
        login,
        loginWithPassword,
        checkUserHasPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
