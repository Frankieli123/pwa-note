import { NextResponse } from 'next/server'

/**
 * 测试MinIO文件访问
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testUrl = searchParams.get('url') || 'https://minio-pwa.vryo.de/pwa-note-files/user_17edd6/files/1752654429001_9kozigjp1so.xlsx'

    console.log('测试访问URL:', testUrl)

    // 测试直接访问
    const response = await fetch(testUrl, {
      method: 'HEAD' // 只获取头信息，不下载文件内容
    })

    const result = {
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    }

    console.log('访问结果:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('测试访问失败:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : '测试失败',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * 测试MinIO配置信息
 */
export async function POST() {
  try {
    const config = {
      endpoint: process.env.MINIO_ENDPOINT || 'https://minio-pwa.vryo.de',
      bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
      region: process.env.MINIO_REGION || 'us-east-1',
      hasAccessKey: !!(process.env.MINIO_ACCESS_KEY || 'a3180623'),
      hasSecretKey: !!(process.env.MINIO_SECRET_KEY || 'a3865373')
    }

    return NextResponse.json({
      message: 'MinIO配置信息',
      config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('获取配置失败:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : '获取配置失败',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
