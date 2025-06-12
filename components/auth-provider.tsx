"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { getOrCreateUserAvatarConfig, getUserAvatarUrl, getUserAvatarConfigFromDB, cleanExpiredAvatarCache, type AvatarConfig } from "@/lib/avatar-utils"

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
  login: (username: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
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
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

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
      setIsLoading(false)
      return
    }

    // 清理过期的头像缓存
    cleanExpiredAvatarCache()

    // Check existing session
    const checkAuth = async () => {
      try {
        // In a real app, this would verify token with backend
        const token = localStorage.getItem("authToken")
        if (token) {
          // Try to get user info from local storage
          const savedUser = localStorage.getItem("userData")
          if (savedUser) {
            const userData = JSON.parse(savedUser)
            setUser(userData)
            // 异步加载数据库中的头像配置
            if (userData.id) {
              loadUserAvatarFromDB(userData.id)
            }
          } else {
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

            setUser(defaultUser)

            // 异步加载数据库中的头像配置
            loadUserAvatarFromDB(userId)
          }
        }
      } catch (error) {
        console.error("认证检查失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string) => {
    setIsLoading(true)
    try {
      // 先清除任何现有的登录状态，确保干净的环境
      localStorage.removeItem("authToken")
      localStorage.removeItem("refreshToken")
      localStorage.removeItem("userData")

      // 模拟登录 - 在真实应用中，您会调用API
      const mockToken = "mock-jwt-token-" + Math.random().toString(36).substring(2)
      localStorage.setItem("authToken", mockToken)
      localStorage.setItem("refreshToken", "mock-refresh-token-" + Math.random().toString(36).substring(2))

      const userId = generateUserId(username)
      const deviceType = getDeviceType();

      // 先创建基础用户对象，不设置头像配置
      const newUser = {
        id: userId,
        username,
        deviceInfo: {
          name: "当前设备",
          type: deviceType,
        },
      }

      // 保存用户数据到本地存储
      localStorage.setItem("userData", JSON.stringify(newUser))

      // 立即设置用户状态，不等待数据库操作
      setUser(newUser)
      setIsLoading(false) // 立即结束loading状态

      // 显示成功消息
      toast({
        title: "登录成功",
        description: "欢迎回来！",
      })

      // 后台异步加载数据库中的头像配置，不阻塞UI
      setTimeout(async () => {
        try {
          const dbAvatarConfig = await getUserAvatarConfigFromDB(userId)
          if (dbAvatarConfig) {
            console.log(`从数据库加载用户 ${userId} 的头像配置:`, dbAvatarConfig)
            setUser(prevUser => {
              if (prevUser && prevUser.id === userId) {
                const updatedUser = {
                  ...prevUser,
                  dbAvatarConfig,
                  avatar: getUserAvatarUrl({ ...prevUser, dbAvatarConfig })
                }
                // 更新本地存储
                localStorage.setItem("userData", JSON.stringify(updatedUser))
                return updatedUser
              }
              return prevUser
            })
          } else {
            // 如果数据库中没有头像配置，生成新的并保存
            console.log(`用户 ${userId} 在数据库中没有头像配置，生成新的`)
            const avatarConfig = getOrCreateUserAvatarConfig(userId)
            setUser(prevUser => {
              if (prevUser && prevUser.id === userId) {
                const updatedUser = {
                  ...prevUser,
                  avatarConfig,
                  avatar: getUserAvatarUrl({ ...prevUser, avatarConfig })
                }
                // 更新本地存储
                localStorage.setItem("userData", JSON.stringify(updatedUser))
                return updatedUser
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
              const updatedUser = {
                ...prevUser,
                avatarConfig,
                avatar: getUserAvatarUrl({ ...prevUser, avatarConfig })
              }
              // 更新本地存储
              localStorage.setItem("userData", JSON.stringify(updatedUser))
              return updatedUser
            }
            return prevUser
          })
        }

        // 强制页面更新以确保所有组件能获取到最新的用户状态
        if (process.env.NODE_ENV === "development") {
          const event = new Event('storage')
          window.dispatchEvent(event)
        }
      }, 100) // 100ms后开始后台处理

    } catch (error) {
      console.error("登录失败:", error)
      toast({
        title: "登录失败",
        description: "请重试",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("userData")
    setUser(null)
    toast({
      title: "已退出登录",
      description: "您已成功退出登录",
    })
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
