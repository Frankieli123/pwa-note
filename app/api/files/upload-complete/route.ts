import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

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

/**
 * 验证文件是否确实存在于 MinIO
 */
async function verifyFileExists(objectKey: string): Promise<boolean> {
  try {
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${objectKey}`
    
    // 发送 HEAD 请求检查文件是否存在
    const response = await fetch(url, {
      method: 'HEAD'
    })

    return response.ok
  } catch (error) {
    console.error('验证文件存在性失败:', error)
    return false
  }
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
