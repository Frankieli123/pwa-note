import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

/**
 * MinIO 预签名 URL 生成 API
 * 为前端直接上传到 MinIO 提供临时凭证和预签名 URL
 *
 * 请求格式：POST /api/files/presigned-url
 * Body: {
 *   fileName: string,
 *   fileType: string,
 *   fileSize: number,
 *   userId: string
 * }
 */

/**
 * MinIO 配置
 */
const MINIO_CONFIG = {
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
  region: process.env.MINIO_REGION || 'us-east-1'
}

/**
 * 文件大小限制配置（500MB）
 */
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * 验证文件类型是否支持
 */
function isFileTypeSupported(mimeType: string): boolean {
  // 暂时支持所有类型，后续可以根据需要限制
  return true
}

/**
 * 验证文件大小
 */
function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制，最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    }
  }
  return { valid: true }
}

/**
 * 生成预签名URL的 AWS4-HMAC-SHA256 签名
 */
function createPresignedUrlSignature(
  method: string,
  path: string,
  queryParams: URLSearchParams,
  timeStamp: string,
  dateStamp: string
): string {
  const accessKey = MINIO_CONFIG.accessKey
  const secretKey = MINIO_CONFIG.secretKey
  const region = MINIO_CONFIG.region
  const service = 's3'

  // 对查询参数进行排序和编码
  const sortedParams = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  // 创建规范请求
  const canonicalHeaders = `host:${MINIO_CONFIG.endpoint.replace(/^https?:\/\//, '')}\n`
  const signedHeaders = 'host'
  const payloadHash = 'UNSIGNED-PAYLOAD'

  const canonicalRequest = [
    method,
    path,
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')

  // 创建签名字符串
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    algorithm,
    timeStamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n')

  // 计算签名
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  return signature
}

/**
 * 生成预签名 URL
 */
function generatePresignedUrl(
  fileName: string,
  fileType: string,
  userId: string,
  expiresIn: number = 3600 // 1小时
): {
  url: string
  fields: Record<string, string>
  objectKey: string
} {
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  // 生成唯一的文件名
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileExtension = fileName.split('.').pop() || ''
  const objectKey = `${userId}/files/${timestamp}_${randomId}.${fileExtension}`

  const algorithm = 'AWS4-HMAC-SHA256'
  const credential = `${MINIO_CONFIG.accessKey}/${dateStamp}/${MINIO_CONFIG.region}/s3/aws4_request`

  // 构建查询参数（不包含签名）
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': credential,
    'X-Amz-Date': timeStamp,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  })

  const path = `/${MINIO_CONFIG.bucketName}/${objectKey}`

  // 生成签名
  const signature = createPresignedUrlSignature('PUT', path, queryParams, timeStamp, dateStamp)

  // 添加签名到查询参数
  queryParams.set('X-Amz-Signature', signature)

  // 构建最终的预签名 URL
  const presignedUrl = `${MINIO_CONFIG.endpoint}${path}?${queryParams.toString()}`

  return {
    url: presignedUrl,
    fields: {
      'Content-Type': fileType
    },
    objectKey
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始生成 MinIO 预签名 URL...')

    const body = await request.json()
    const { fileName, fileType, fileSize, userId } = body

    // 认证验证
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // 验证必需参数
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: '缺少必需参数：fileName, fileType, fileSize'
        },
        { status: 400 }
      )
    }

    console.log(`📋 文件信息: ${fileName}, 大小: ${fileSize}, 类型: ${fileType}`)

    // 验证文件类型
    if (!isFileTypeSupported(fileType)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          message: `不支持的文件类型: ${fileType}`
        },
        { status: 400 }
      )
    }

    // 验证文件大小
    const sizeValidation = validateFileSize(fileSize)
    if (!sizeValidation.valid) {
      return NextResponse.json(
        {
          error: 'File size exceeded',
          message: sizeValidation.error
        },
        { status: 400 }
      )
    }

    console.log('✅ 文件验证通过')

    // 生成预签名 URL
    const presignedData = generatePresignedUrl(fileName, fileType, userId)

    console.log(`✅ 预签名 URL 生成成功: ${presignedData.objectKey}`)

    return NextResponse.json({
      success: true,
      message: '预签名 URL 生成成功',
      data: {
        uploadUrl: presignedData.url,
        objectKey: presignedData.objectKey,
        fields: presignedData.fields,
        fileUrl: `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${presignedData.objectKey}`,
        expiresIn: 3600 // 1小时
      }
    })

  } catch (error) {
    console.error('❌ 预签名 URL 生成失败:', error)

    return NextResponse.json(
      {
        error: 'Presigned URL generation failed',
        message: error instanceof Error ? error.message : '预签名 URL 生成失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取预签名 URL 配置信息
 * GET /api/files/presigned-url
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: `${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
        supportedTypes: '支持所有文件格式',
        expiresIn: 3600,
        endpoint: '/api/files/presigned-url',
        method: 'POST'
      }
    })
  } catch {
    return NextResponse.json(
      {
        error: 'Failed to get config',
        message: '获取配置失败'
      },
      { status: 500 }
    )
  }
}
