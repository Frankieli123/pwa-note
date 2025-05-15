"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

type User = {
  id: string
  username: string
  avatar?: string
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
  console.log("生成用户 ID，用户名:", username)

  let hash = 0
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  const userId = `user_${Math.abs(hash).toString(16)}`
  console.log("生成的用户 ID:", userId)
  return userId
}

// Helper function to get a random avatar or a consistent one based on username
function getAvatarForUser(username: string): string {
  // Create a simple hash from username to make avatar selection deterministic for each user
  let usernameHash = 0;
  for (let i = 0; i < username.length; i++) {
    usernameHash = ((usernameHash << 5) - usernameHash) + username.charCodeAt(i);
    usernameHash = usernameHash & usernameHash; // Convert to 32bit integer
  }
  
  // List of available avatar types
  const avatarTypes = [
    "avatar", // We have avatar1.png through avatar10.png
    "bottts",
    "micah",
    "adventurer",
    "personas",
    "pixel"
  ];
  
  // Use the hash to select a category
  const typeIndex = Math.abs(usernameHash) % avatarTypes.length;
  const selectedType = avatarTypes[typeIndex];
  
  // For "avatar" type, we have 10 options, for others we only have 1 each for now
  let avatarNumber = 1;
  if (selectedType === "avatar") {
    avatarNumber = (Math.abs(usernameHash) % 10) + 1;
  }
  
  return `/avatars/${selectedType}${avatarNumber}.png`;
}

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

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false)
      return
    }

    // Check existing session
    const checkAuth = async () => {
      try {
        console.log("检查认证状态...")
        // In a real app, this would verify token with backend
        const token = localStorage.getItem("authToken")
        if (token) {
          console.log("找到认证令牌")
          // Try to get user info from local storage
          const savedUser = localStorage.getItem("userData")
          if (savedUser) {
            console.log("找到用户数据")
            const userData = JSON.parse(savedUser)
            console.log("用户数据:", userData)
            setUser(userData)
          } else {
            console.log("未找到用户数据，设置默认用户")
            // If no user data but token exists, set default user
            const defaultUsername = "默认用户"
            const userId = generateUserId(defaultUsername)
            const deviceType = getDeviceType();
            
            setUser({
              id: userId,
              username: defaultUsername,
              avatar: getAvatarForUser(defaultUsername),
              deviceInfo: {
                name: "当前设备",
                type: deviceType,
              },
            })
          }
        } else {
          console.log("未找到认证令牌")
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
    console.log("登录，用户名:", username)
    setIsLoading(true)
    try {
      // 模拟登录 - 在真实应用中，您会调用API
      const mockToken = "mock-jwt-token-" + Math.random().toString(36).substring(2)
      localStorage.setItem("authToken", mockToken)
      localStorage.setItem("refreshToken", "mock-refresh-token-" + Math.random().toString(36).substring(2))

      const userId = generateUserId(username)
      const deviceType = getDeviceType();
      
      const newUser = {
        id: userId,
        username,
        avatar: getAvatarForUser(username),
        deviceInfo: {
          name: "当前设备",
          type: deviceType,
        },
      }

      console.log("设置用户:", newUser)
      // 保存用户数据到本地存储
      localStorage.setItem("userData", JSON.stringify(newUser))
      setUser(newUser)

      toast({
        title: "登录成功",
        description: "欢迎回来！",
      })
    } catch (error) {
      console.error("登录失败:", error)
      toast({
        title: "登录失败",
        description: "请重试",
        variant: "destructive",
      })
    } finally {
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
