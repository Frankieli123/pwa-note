import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'minio'
import crypto from 'crypto'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'
import { isFileTypeSupported, validateFileSizeByNumber, getMaxFileSizeBytes } from '@/lib/file-validation'

/**
 * MinIO 预签名 URL 生成 API
 * 为前端直接上传到 MinIO 提供临时凭证和预签名 URL
 */

const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
  region: process.env.MINIO_REGION || 'us-east-1'
}

function parseEndpoint(endpoint: string): { host: string; port: number; useSSL: boolean } {
  try {
    const url = new URL(endpoint)
    const useSSL = url.protocol === 'https:'
    const defaultPort = useSSL ? 443 : 9000
    const port = url.port ? parseInt(url.port, 10) : defaultPort
    return { host: url.hostname, port, useSSL }
  } catch {
    throw new Error(`MINIO_ENDPOINT 配置无效: "${endpoint}"。请确保是绝对 URL (如 http://localhost:9000)`)
  }
}

function getMinioClient(): Client {
  const { host, port, useSSL } = parseEndpoint(MINIO_CONFIG.endpoint)
  return new Client({
    endPoint: host,
    port,
    useSSL,
    accessKey: MINIO_CONFIG.accessKey,
    secretKey: MINIO_CONFIG.secretKey,
    region: MINIO_CONFIG.region,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType, fileSize, userId } = body

    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    if (!fileName || !fileType || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: 'Missing parameters', message: '缺少必需参数：fileName, fileType, fileSize' },
        { status: 400 }
      )
    }

    if (!isFileTypeSupported(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type', message: `不支持的文件类型: ${fileType}` },
        { status: 400 }
      )
    }

    const sizeValidation = validateFileSizeByNumber(fileSize)
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: 'File size exceeded', message: sizeValidation.error },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 15)
    const fileExtension = fileName.split('.').pop() || ''
    const objectKey = `${userId}/files/${timestamp}_${randomId}.${fileExtension}`

    const minioClient = getMinioClient()
    const expiresIn = 3600

    const presignedUrl = await minioClient.presignedPutObject(
      MINIO_CONFIG.bucketName,
      objectKey,
      expiresIn
    )

    return NextResponse.json({
      success: true,
      message: '预签名 URL 生成成功',
      data: {
        uploadUrl: presignedUrl,
        objectKey,
        fields: { 'Content-Type': fileType },
        fileUrl: `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${objectKey}`,
        expiresIn,
      },
    })
  } catch (error) {
    console.error('❌ 预签名 URL 生成失败:', error)
    return NextResponse.json(
      { error: 'Presigned URL generation failed', message: error instanceof Error ? error.message : '预签名 URL 生成失败' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const maxBytes = getMaxFileSizeBytes()
    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: `${Math.round(maxBytes / 1024 / 1024)}MB`,
        supportedTypes: '受支持的白名单类型',
        expiresIn: 3600,
        endpoint: '/api/files/presigned-url',
        method: 'POST',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get config', message: '获取配置失败' },
      { status: 500 }
    )
  }
}
