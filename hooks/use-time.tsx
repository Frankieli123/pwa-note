"use client"

import { useState, useCallback } from "react"

// 提供统一的时间计算钩子函数 - 只基于服务器时间
export function useTime() {
  // 记录最新的服务器时间戳
  const [latestServerTime, setLatestServerTime] = useState<Date | null>(null)
  
  // 计算相对时间函数 - 纯粹基于服务器时间
  const getRelativeTime = useCallback((timestamp: Date | string) => {
    try {
      // 当前条目的服务器时间
      const currentTime = new Date(timestamp)
      
      // 更新最新的服务器时间（如果当前时间更新）
      if (!latestServerTime || currentTime > latestServerTime) {
        setLatestServerTime(currentTime)
      }
      
      // 如果没有最新时间或当前条目就是最新时间，显示"不到1分钟前"
      if (!latestServerTime || currentTime.getTime() >= latestServerTime.getTime()) {
        return "不到1分钟前"
      }
      
      // 计算与最新服务器时间的差值（毫秒）
      const timeDiff = latestServerTime.getTime() - currentTime.getTime()
      
      // 分钟 (1-59分钟)
      const diffInMinutes = Math.floor(timeDiff / (1000 * 60))
      // 如果小于1分钟，显示"不到1分钟前"
      if (diffInMinutes < 1) {
        return "不到1分钟前"
      }
      // 1-59分钟
      if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`
      }
      
      // 小时 (1-23小时)
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) {
        return `${diffInHours}小时前`
      }
      
      // 天 (1-29天)
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 30) {
        return `${diffInDays}天前`
      }
      
      // 月 (1-11个月)
      const diffInMonths = Math.floor(diffInDays / 30)
      if (diffInMonths < 12) {
        return `${diffInMonths}个月前`
      }
      
      // 年 (1年或更久)
      return `${Math.floor(diffInMonths / 12)}年前`
      
    } catch (error) {
      console.error("时间计算错误:", error)
      return "不到1分钟前"
    }
  }, [latestServerTime])
  
  return {
    getRelativeTime
  }
} 