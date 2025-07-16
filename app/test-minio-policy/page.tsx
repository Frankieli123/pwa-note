"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestMinioPolicyPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const setBucketPolicy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/minio/set-bucket-policy', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  const getBucketPolicy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/minio/set-bucket-policy', {
        method: 'GET'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '请求失败' })
    } finally {
      setLoading(false)
    }
  }

  const testFileAccess = async () => {
    setLoading(true)
    try {
      // 测试访问已上传的文件
      const testUrl = 'https://minio-pwa.vryo.de/pwa-note-files/user_17edd6/files/1752651228145_8fwmaujhf5a.xlsx'
      const response = await fetch(testUrl, { method: 'HEAD' })
      setResult({
        success: response.ok,
        status: response.status,
        message: response.ok ? '文件可以访问' : '文件访问被拒绝',
        url: testUrl
      })
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '测试失败' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>MinIO Bucket策略测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={setBucketPolicy} 
              disabled={loading}
              variant="default"
            >
              {loading ? '处理中...' : '设置公开读取策略'}
            </Button>
            
            <Button 
              onClick={getBucketPolicy} 
              disabled={loading}
              variant="outline"
            >
              {loading ? '处理中...' : '查看当前策略'}
            </Button>
            
            <Button 
              onClick={testFileAccess} 
              disabled={loading}
              variant="secondary"
            >
              {loading ? '处理中...' : '测试文件访问'}
            </Button>
          </div>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">执行结果</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>设置公开读取策略：</strong> 允许任何人下载bucket中的文件</p>
              <p><strong>查看当前策略：</strong> 显示当前bucket的访问策略</p>
              <p><strong>测试文件访问：</strong> 测试已上传文件是否可以直接访问</p>
              <p className="text-amber-600">
                <strong>注意：</strong> 设置为公开读取后，所有上传的文件都可以被任何人访问
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
