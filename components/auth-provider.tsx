"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { getOrCreateUserAvatarConfig, getUserAvatarUrl, getUserAvatarConfigFromDB, cleanExpiredAvatarCache, type AvatarConfig } from "@/lib/avatar-utils"
import { hasUserPassword, getUserPasswordHash } from "@/app/actions/setting-actions"
import { verifyPassword } from "@/lib/password-utils"

// 认证状态枚举
export enum AuthStatus {
  INITIALIZING = "INITIALIZING",     // 初始化中
  CHECKING = "CHECKING",             // 检查认证状态中
  AUTHENTICATED = "AUTHENTICATED",   // 已认证
  UNAUTHENTICATED = "UNAUTHENTICATED" // 未认证
}

type User = {
  id: string
  username: string
  avatar?: string // 向后兼容的旧字段
  avatarConfig?: AvatarConfig // 临时头像配置（用于预览）
  dbAvatarConfig?: AvatarConfig // 从数据库加载的头像配置
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
  checkPasswordRequired: (username: string) => Promise<boolean>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  authStatus: AuthStatus.INITIALIZING,
  isAuthenticated: false,
  isInitializing: true,
  login: async () => {},
  loginWithPassword: async () => {},
  checkPasswordRequired: async () => false,
  logout: () => {},
})

// Helper function to generate a consistent user ID from username
function generateUserId(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  const userId = `user_${Math.abs(hash).toString(16)}`
  return userId
}

// 旧的头像生成函数已移除，现在使用 avatar-utils.ts 中的新函数

// Helper function to determine device type
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.INITIALIZING)
  const { toast } = useToast()

  // 计算派生状态
  const isLoading = authStatus === AuthStatus.INITIALIZING || authStatus === AuthStatus.CHECKING
  const isAuthenticated = authStatus === AuthStatus.AUTHENTICATED && user !== null
  const isInitializing = authStatus === AuthStatus.INITIALIZING || authStatus === AuthStatus.CHECKING

  // 认证状态变化日志
  useEffect(() => {
    console.log(`[AuthProvider] 认证状态变化: ${authStatus}, 用户: ${user?.username || 'null'}, isLoading: ${isLoading}`)
  }, [authStatus, user, isLoading])

  // 监听存储变化，实现设置更新同步
  useEffect(() => {
    const handleStorageChange = () => {
      const userData = localStorage.getItem("userData")
      if (userData) {
        const parsedUserData = JSON.parse(userData)
        console.log('存储变化，更新用户数据:', parsedUserData)
        setUser(parsedUserData)
      }
    }

    // 监听存储事件
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // 从数据库加载用户头像配置
  const loadUserAvatarFromDB = async (userId: string) => {
    try {
      const dbAvatarConfig = await getUserAvatarConfigFromDB(userId)
      if (dbAvatarConfig) {
        console.log(`从数据库加载用户 ${userId} 的头像配置:`, dbAvatarConfig)
        setUser(prevUser => {
          if (prevUser && prevUser.id === userId) {
            return {
              ...prevUser,
              dbAvatarConfig,
              avatar: getUserAvatarUrl({ ...prevUser, dbAvatarConfig })
            }
          }
          return prevUser
        })
      } else {
        console.log(`用户 ${userId} 在数据库中没有头像配置，生成新的`)
        // 如果数据库中没有头像配置，生成新的并保存
        const avatarConfig = getOrCreateUserAvatarConfig(userId)
        setUser(prevUser => {
          if (prevUser && prevUser.id === userId) {
            return {
              ...prevUser,
              avatarConfig,
              avatar: getUserAvatarUrl({ ...prevUser, avatarConfig })
            }
          }
          return prevUser
        })
      }
    } catch (error) {
      console.error(`加载用户 ${userId} 头像配置失败:`, error)
      // 如果加载失败，使用本地生成的配置
      const avatarConfig = getOrCreateUserAvatarConfig(userId)
      setUser(prevUser => {
        if (prevUser && prevUser.id === userId) {
          return {
            ...prevUser,
            avatarConfig,
            avatar: getUserAvatarUrl({ ...prevUser, avatarConfig })
          }
        }
        return prevUser
      })
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      setAuthStatus(AuthStatus.UNAUTHENTICATED)
      return
    }

    // 清理过期的头像缓存
    cleanExpiredAvatarCache()

    // 原子化的认证检查函数
    const checkAuth = async () => {
      console.log('[AuthProvider] 开始认证检查')
      setAuthStatus(AuthStatus.CHECKING)

      try {
        // In a real app, this would verify token with backend
        const token = localStorage.getItem("authToken")

        if (token) {
          console.log('[AuthProvider] 发现认证令牌，检查用户数据')

          // Try to get user info from local storage
          const savedUser = localStorage.getItem("userData")
          if (savedUser) {
            const userData = JSON.parse(savedUser)
            console.log('[AuthProvider] 从本地存储加载用户数据:', userData.username)

            // 原子化状态更新：同时设置用户和认证状态
            setUser(userData)
            setAuthStatus(AuthStatus.AUTHENTICATED)

            // 异步加载数据库中的头像配置（不影响认证状态）
            if (userData.id) {
              loadUserAvatarFromDB(userData.id)
            }
          } else {
            console.log('[AuthProvider] 令牌存在但无用户数据，创建默认用户')

            // If no user data but token exists, set default user
            const defaultUsername = "默认用户"
            const userId = generateUserId(defaultUsername)
            const deviceType = getDeviceType();

            const defaultUser = {
              id: userId,
              username: defaultUsername,
              deviceInfo: {
                name: "当前设备",
                type: deviceType,
              },
            }

            // 原子化状态更新
            setUser(defaultUser)
            setAuthStatus(AuthStatus.AUTHENTICATED)
            localStorage.setItem("userData", JSON.stringify(defaultUser))

            // 异步加载数据库中的头像配置
            loadUserAvatarFromDB(userId)
          }
        } else {
          console.log('[AuthProvider] 无认证令牌，设置为未认证状态')
          setUser(null)
          setAuthStatus(AuthStatus.UNAUTHENTICATED)
        }
      } catch (error) {
        console.error("[AuthProvider] 认证检查失败:", error)
        setUser(null)
        setAuthStatus(AuthStatus.UNAUTHENTICATED)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string) => {
    console.log('[AuthProvider] 开始快速登录流程:', username)
    setAuthStatus(AuthStatus.CHECKING)

    try {
      const userId = generateUserId(username)

      // 检查用户是否设置了密码
      const passwordRequired = await hasUserPassword(userId)
      if (passwordRequired) {
        // 如果用户设置了密码，应该使用 loginWithPassword 函数
        throw new Error('该用户已设置密码，请使用密码登录')
      }

      // 用户未设置密码，执行快速登录
      await performLogin(username, userId)

    } catch (error) {
      console.error("[AuthProvider] 快速登录失败:", error)
      setUser(null)
      setAuthStatus(AuthStatus.UNAUTHENTICATED)

      const errorMessage = error instanceof Error ? error.message : '登录失败，请重试'
      toast({
        title: "登录失败",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    }
  }

  // 检查用户是否需要密码
  const checkPasswordRequired = async (username: string): Promise<boolean> => {
    console.log('[AuthProvider] 检查用户是否需要密码:', username)

    try {
      const userId = generateUserId(username)
      const passwordRequired = await hasUserPassword(userId)
      console.log('[AuthProvider] 密码检查结果:', passwordRequired ? '需要密码' : '无需密码')
      return passwordRequired
    } catch (error) {
      console.error('[AuthProvider] 检查密码需求失败:', error)
      return false
    }
  }

  // 使用密码登录
  const loginWithPassword = async (username: string, password: string) => {
    console.log('[AuthProvider] 开始密码登录流程:', username)
    setAuthStatus(AuthStatus.CHECKING)

    try {
      const userId = generateUserId(username)

      // 获取用户密码哈希
      const passwordHash = await getUserPasswordHash(userId)
      if (!passwordHash) {
        throw new Error('用户未设置密码')
      }

      // 验证密码
      const isPasswordValid = await verifyPassword(password, passwordHash)
      if (!isPasswordValid) {
        throw new Error('密码错误')
      }

      // 密码验证成功，执行登录逻辑
      await performLogin(username, userId)

    } catch (error) {
      console.error("[AuthProvider] 密码登录失败:", error)
      setUser(null)
      setAuthStatus(AuthStatus.UNAUTHENTICATED)

      const errorMessage = error instanceof Error ? error.message : '登录失败'
      toast({
        title: "登录失败",
        description: errorMessage,
        variant: "destructive",
      })
      throw error
    }
  }

  // 共用的登录逻辑
  const performLogin = async (username: string, userId: string) => {
    const mockToken = "mock-jwt-token-" + Math.random().toString(36).substring(2)
    const mockRefreshToken = "mock-refresh-token-" + Math.random().toString(36).substring(2)
    const deviceType = getDeviceType()

    // 创建用户对象
    const newUser = {
      id: userId,
      username,
      deviceInfo: {
        name: "当前设备",
        type: deviceType,
      },
    }

    // 原子化操作：同时更新localStorage和状态
    console.log('[AuthProvider] 原子化更新认证状态和本地存储')

    // 批量更新localStorage
    localStorage.setItem("authToken", mockToken)
    localStorage.setItem("refreshToken", mockRefreshToken)
    localStorage.setItem("userData", JSON.stringify(newUser))

    // 原子化状态更新
    setUser(newUser)
    setAuthStatus(AuthStatus.AUTHENTICATED)
    console.log('[AuthProvider] 登录成功，用户状态已更新')

    // 显示成功消息
    toast({
      title: "登录成功",
      description: "欢迎回来！",
    })

    // 后台异步加载数据库中的头像配置
    setTimeout(async () => {
      try {
        console.log(`[AuthProvider] 开始加载用户 ${userId} 的头像配置`)
        const dbAvatarConfig = await getUserAvatarConfigFromDB(userId)
        if (dbAvatarConfig) {
          console.log(`[AuthProvider] 从数据库加载用户 ${userId} 的头像配置:`, dbAvatarConfig)
          setUser(prevUser => {
            if (prevUser && prevUser.id === userId) {
              return {
                ...prevUser,
                dbAvatarConfig,
                avatar: getUserAvatarUrl({ ...prevUser, avatarConfig: dbAvatarConfig })
              }
            }
            return prevUser
          })
        } else {
          console.log(`[AuthProvider] 用户 ${userId} 无数据库头像配置，使用本地生成`)
          loadUserAvatarFromDB(userId)
        }
      } catch (error) {
        console.error(`[AuthProvider] 加载用户 ${userId} 头像配置失败:`, error)
        loadUserAvatarFromDB(userId)
      }
    }, 100)
  }

  const logout = () => {
    console.log('[AuthProvider] 开始退出登录')
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("userData")

    // 原子化状态更新
    setUser(null)
    setAuthStatus(AuthStatus.UNAUTHENTICATED)

    toast({
      title: "已退出登录",
      description: "您已成功退出登录",
    })
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      authStatus,
      isAuthenticated,
      isInitializing,
      login,
      loginWithPassword,
      checkPasswordRequired,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
