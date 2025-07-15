"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InitDbPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleInit = async (action: string) => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          userId: 'admin' // 默认用户ID
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ 
        error: true, 
        message: error instanceof Error ? error.message : '未知错误' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>数据库初始化</CardTitle>
          <CardDescription>
            手动初始化数据库表结构和数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => handleInit('init')}
              disabled={loading}
              variant="outline"
            >
              {loading ? '处理中...' : '仅初始化表结构'}
            </Button>
            
            <Button 
              onClick={() => handleInit('init-and-seed')}
              disabled={loading}
            >
              {loading ? '处理中...' : '初始化并添加示例数据'}
            </Button>
            
            <Button 
              onClick={() => handleInit('fix-fields')}
              disabled={loading}
              variant="secondary"
            >
              {loading ? '处理中...' : '修复缺失字段'}
            </Button>
            
            <Button 
              onClick={() => handleInit('seed')}
              disabled={loading}
              variant="secondary"
            >
              {loading ? '处理中...' : '仅添加示例数据'}
            </Button>
          </div>

          {result && (
            <Card className={result.error ? 'border-red-500' : 'border-green-500'}>
              <CardContent className="pt-6">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
