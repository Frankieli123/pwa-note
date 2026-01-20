import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'minio'
import { sql } from '@/lib/db'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

/**
 * MinIO 上传完成通知 API
 * 在文件直接上传到 MinIO 后，保存文件元数据到数据库
 * 
 * 请求格式：POST /api/files/upload-complete
 * Body: {
 *   objectKey: string,
 *   fileName: string,
 *   fileType: string,
 *   fileSize: number,
 *   userId: string,
 *   fileUrl: string,
 *   thumbnailUrl?: string
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

function parseEndpoint(endpoint: string): { host: string; port: number; useSSL: boolean } {
  try {
    const url = new URL(endpoint)
    const useSSL = url.protocol === 'https:'
    const defaultPort = useSSL ? 443 : 9000
    const port = url.port ? parseInt(url.port, 10) : defaultPort
    return { host: url.hostname, port, useSSL }
  } catch {
    throw new Error(`MINIO_ENDPOINT 配置无效: "${endpoint}"。请确保是绝对URL (如 http://localhost:9000)`)
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

function isMinioNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: unknown; name?: unknown; message?: unknown }
  const code = typeof err.code === 'string' ? err.code : typeof err.name === 'string' ? err.name : ''
  if (code === 'NotFound' || code === 'NoSuchKey' || code === 'NoSuchBucket') return true
  const message = typeof err.message === 'string' ? err.message : ''
  return /not[\s-]?found|nosuchkey/i.test(message)
}

/**
 * 验证文件是否确实存在于 MinIO
 */
async function verifyFileExists(objectKey: string): Promise<boolean> {
  const client = getMinioClient()
  const backoffMs = [0, 200, 500, 1000, 2000]
  let lastError: unknown

  for (const delayMs of backoffMs) {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))

    try {
      await client.statObject(MINIO_CONFIG.bucketName, objectKey)
      return true
    } catch (error) {
      if (isMinioNotFoundError(error)) return false
      lastError = error
    }
  }

  console.error('验证文件存在性失败（非 NotFound）:', lastError)
  throw lastError
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始处理上传完成通知...')

    const body = await request.json()
    const { 
      objectKey, 
      fileName, 
      fileType, 
      fileSize, 
      userId, 
      fileUrl,
      thumbnailUrl 
    } = body

    // 验证必需参数
    if (!objectKey || !fileName || !fileType || !fileSize || !userId || !fileUrl) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: '缺少必需参数：objectKey, fileName, fileType, fileSize, userId, fileUrl'
        },
        { status: 400 }
      )
    }

    // 认证验证
    const authResult = await verifyApiAuth(typeof userId === 'string' ? userId : null)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // objectKey前缀校验：确保用户只能操作自己的文件
    if (typeof objectKey === 'string' && !objectKey.startsWith(`${userId}/`)) {
      return NextResponse.json(
        { error: 'Invalid objectKey', message: 'objectKey 与用户不匹配' },
        { status: 400 }
      )
    }

    console.log(`📋 文件信息: ${fileName}, 大小: ${fileSize}, 类型: ${fileType}`)
    console.log(`📍 对象键: ${objectKey}`)

    // 验证文件确实已上传到 MinIO
    console.log('🔍 验证文件是否存在于 MinIO...')
    const fileExists = await verifyFileExists(objectKey)
    
    if (!fileExists) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件未在 MinIO 中找到，上传可能失败'
        },
        { status: 404 }
      )
    }

    console.log('✅ 文件存在验证通过')

    // 保存文件元数据到数据库
    console.log('💾 保存文件元数据到数据库...')
    console.log('📋 插入数据:', {
      userId,
      fileName,
      fileType,
      fileSize,
      fileUrl,
      thumbnailUrl
    })

    let insertResult: any[]
    try {
      insertResult = await sql`
        INSERT INTO files (
          user_id,
          name,
          type,
          minio_url,
          thumbnail_url,
          size,
          status,
          uploaded_at
        )
        VALUES (
          ${userId},
          ${fileName},
          ${fileType},
          ${fileUrl},
          ${thumbnailUrl || null},
          ${Number(fileSize)},
          'active',
          NOW()
        )
        RETURNING id, user_id, name, type, size, minio_url, thumbnail_url, uploaded_at
      `

      if (insertResult.length === 0) {
        throw new Error('数据库插入失败')
      }
    } catch (dbError) {
      console.error('❌ 数据库插入失败:', dbError)
      console.error('插入数据详情:', {
        userId,
        fileName,
        fileType,
        fileSize,
        fileUrl,
        thumbnailUrl
      })
      throw new Error(`数据库插入失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
    }

    const savedFile = insertResult[0]
    console.log(`✅ 文件元数据保存成功, ID: ${savedFile.id}`)

    // 构造返回的文件对象
    const responseFile = {
      id: savedFile.id,
      user_id: savedFile.user_id,
      name: savedFile.name,
      type: savedFile.type,
      size: savedFile.size,
      url: savedFile.minio_url, // 使用 minio_url 作为主要 URL
      thumbnail: savedFile.thumbnail_url,
      minio_url: savedFile.minio_url,
      thumbnail_url: savedFile.thumbnail_url,
      uploaded_at: savedFile.uploaded_at
    }

    console.log('🎉 文件上传完成处理成功!')

    return NextResponse.json({
      success: true,
      message: '文件上传完成',
      file: responseFile
    })

  } catch (error) {
    console.error('❌ 上传完成处理失败:', error)

    return NextResponse.json(
      {
        error: 'Upload completion failed',
        message: error instanceof Error ? error.message : '上传完成处理失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取上传完成 API 配置信息
 * GET /api/files/upload-complete
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      config: {
        description: '文件上传完成通知 API',
        endpoint: '/api/files/upload-complete',
        method: 'POST',
        requiredFields: [
          'objectKey',
          'fileName', 
          'fileType',
          'fileSize',
          'userId',
          'fileUrl'
        ],
        optionalFields: [
          'thumbnailUrl'
        ]
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
