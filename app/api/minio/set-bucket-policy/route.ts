import { NextResponse } from 'next/server'

/**
 * 设置MinIO bucket公开读取策略
 */
export async function POST() {
  try {
    const MINIO_CONFIG = {
      endpoint: process.env.MINIO_ENDPOINT || 'https://minio-pwa.vryo.de',
      accessKey: process.env.MINIO_ACCESS_KEY || 'a3180623',
      secretKey: process.env.MINIO_SECRET_KEY || 'a3865373',
      bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
      region: process.env.MINIO_REGION || 'us-east-1'
    }

    // 公开读取策略
    const bucketPolicy = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": "*",
          "Action": "s3:GetObject",
          "Resource": `arn:aws:s3:::${MINIO_CONFIG.bucketName}/*`
        }
      ]
    }

    // 设置bucket策略的URL
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}?policy`
    
    // 创建签名（简化版本，实际应用中需要完整的AWS4签名）
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `AWS ${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`
      },
      body: JSON.stringify(bucketPolicy)
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Bucket策略设置成功，文件现在可以公开访问'
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `设置策略失败: ${response.status} ${errorText}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('设置bucket策略失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 获取当前bucket策略
 */
export async function GET() {
  try {
    const MINIO_CONFIG = {
      endpoint: process.env.MINIO_ENDPOINT || 'https://minio-pwa.vryo.de',
      accessKey: process.env.MINIO_ACCESS_KEY || 'a3180623',
      secretKey: process.env.MINIO_SECRET_KEY || 'a3865373',
      bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files'
    }

    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}?policy`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `AWS ${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`
      }
    })

    if (response.ok) {
      const policy = await response.json()
      return NextResponse.json({
        success: true,
        policy
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `获取策略失败: ${response.status}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('获取bucket策略失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
