"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { ArrowRight, Cloud, Edit3, Sparkles } from "lucide-react"

interface OnboardingAnimationProps {
  onComplete: () => void
}

export function OnboardingAnimation({ onComplete }: OnboardingAnimationProps) {
  const [username, setUsername] = useState("")
  const { login, isLoading } = useAuth()

  // 使用sessionStorage持久化step状态
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('onboarding-step')
      return savedStep ? parseInt(savedStep, 10) : 0
    }
    return 0
  })

  // 添加组件挂载和step变化的调试日志
  useEffect(() => {
    console.log('[OnboardingAnimation] 组件挂载，从sessionStorage恢复step:', step)
    return () => {
      console.log('[OnboardingAnimation] 组件卸载，最终step:', step)
    }
  }, [])

  // 当step变化时保存到sessionStorage
  useEffect(() => {
    console.log('[OnboardingAnimation] step变化:', step)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding-step', step.toString())
    }
  }, [step])

  // 完成引导时清除sessionStorage
  const handleComplete = () => {
    console.log('[OnboardingAnimation] 引导完成，清除sessionStorage')
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('onboarding-step')
    }
    onComplete()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username) return

    try {
      // 执行登录
      await login(username)

      // 登录成功后完成引导流程
      handleComplete()
    } catch (error) {
      console.error("登录失败:", error)
      // 登录失败时保持在引导页面，用户可以重试
    }
  }

  const steps = [
    {
      title: "欢迎使用快速笔记",
      description: "您的跨平台笔记应用，支持实时同步",
      icon: <Sparkles className="h-12 w-12 text-primary" />,
    },
    {
      title: "随时随地记录",
      description: "通过我们的浮动编辑器，在所有设备上即刻开始输入",
      icon: <Edit3 className="h-12 w-12 text-primary" />,
    },
    {
      title: "无处不在的同步",
      description: "您的笔记会自动保存并同步到所有设备",
      icon: <Cloud className="h-12 w-12 text-primary" />,
    },
  ]

  const currentStep = steps[step]

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div
          className={cn(
            "transition-all duration-500 transform",
            step < steps.length ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
          )}
        >
          <div className="flex justify-center mb-6">{currentStep?.icon}</div>

          <h1 className="text-2xl font-normal mb-2">{currentStep?.title}</h1>

          <p className="text-muted-foreground mb-8">{currentStep?.description}</p>

          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              继续
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="输入您的用户名以开始使用"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "创建账户中..." : "开始使用"}
              </Button>
              <Button variant="ghost" onClick={handleComplete} className="w-full">
                暂时跳过
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
