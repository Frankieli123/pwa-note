"use client"

import { useCallback } from "react"

// 提供统一的时间计算钩子函数 - 完全使用客户端时间
export function useTime() {
  // 计算相对时间函数 - 完全使用客户端本地时间
  const getRelativeTime = useCallback((timestamp: Date | string) => {
    try {
      // 解析传入的时间戳
      const itemTime = new Date(timestamp);
      
      // 使用客户端当前时间
      const clientNow = new Date();
      
      // 计算与当前时间的差值（毫秒）
      const timeDiff = clientNow.getTime() - itemTime.getTime();
      
      // 对于所有时间戳，只计算过去时间
      
      // 小于1分钟
      if (timeDiff < 60000) {
        return "刚刚";
      }
      
      // 分钟 (1-59分钟)
      const diffInMinutes = Math.floor(timeDiff / (1000 * 60));
      if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
      }
      
      // 小时 (1-23小时)
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours}小时前`;
      }
      
      // 天 (1-29天)
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `${diffInDays}天前`;
      }
      
      // 月 (1-11个月)
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths}个月前`;
      }
      
      // 年 (1年或更久)
      return `${Math.floor(diffInMonths / 12)}年前`;
      
    } catch (error) {
      console.error("时间计算错误:", error);
      return "未知时间";
    }
  }, []);
  
  // 获取当前客户端时间
  const getCurrentTime = useCallback(() => {
    return new Date();
  }, []);
  
  return {
    getRelativeTime,
    getCurrentTime
  };
} 