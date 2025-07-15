import { NextRequest, NextResponse } from 'next/server'
import {
  validateFileSize,
  isFileTypeSupported,
  uploadFileToMinio,
  uploadThumbnailToMinio
} from '@/lib/minio-utils'
import { sql } from '@/lib/db'

/**
 * MinIO 文件上传 API
 * 处理文件上传到 MinIO 对象存储并在数据库中保存元数据
 * 
 * 请求格式：multipart/form-data
 * - file: 要上传的文件
 * - userId: 用户ID
 * - thumbnail: 可选的缩略图文件
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始 MinIO 文件上传...')
    
    // 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const thumbnail = formData.get('thumbnail') as File | null
    
    // 验证必需参数
    if (!file) {
      return NextResponse.json(
        { 
          error: 'Missing file',
          message: '缺少文件参数'
        },
        { status: 400 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing userId',
          message: '缺少用户ID参数'
        },
        { status: 400 }
      )
    }
    
    console.log(`📋 文件信息: ${file.name}, 大小: ${file.size}, 类型: ${file.type}`)
    
    // 验证文件类型
    if (!isFileTypeSupported(file.type)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file type',
          message: `不支持的文件类型: ${file.type}`
        },
        { status: 400 }
      )
    }
    
    // 验证文件大小
    const sizeValidation = validateFileSize(file)
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
    
    // 上传主文件到 MinIO
    console.log('📤 上传主文件到 MinIO...')
    const mainFileResult = await uploadFileToMinio(file, userId, 'files')
    console.log(`✅ 主文件上传成功: ${mainFileResult.url}`)
    
    // 处理缩略图上传（如果提供）
    let thumbnailUrl: string | null = null
    if (thumbnail) {
      console.log('📤 上传缩略图到 MinIO...')
      const thumbnailResult = await uploadThumbnailToMinio(thumbnail, userId, file.name)
      thumbnailUrl = thumbnailResult.url
      console.log(`✅ 缩略图上传成功: ${thumbnailUrl}`)
    } else if (file.type.startsWith('image/')) {
      // 如果是图片但没有提供缩略图，可以在这里生成
      console.log('📸 图片文件但未提供缩略图，将在客户端生成')
    }
    
    // 保存文件元数据到数据库
    console.log('💾 保存文件元数据到数据库...')
    const insertResult = await sql`
      INSERT INTO files (
        user_id, 
        name, 
        type, 
        size, 
        minio_url, 
        thumbnail_url,
        status,
        uploaded_at
      )
      VALUES (
        ${userId}, 
        ${file.name}, 
        ${file.type}, 
        ${file.size}, 
        ${mainFileResult.url}, 
        ${thumbnailUrl},
        'active',
        NOW()
      )
      RETURNING id, user_id, name, type, size, minio_url, thumbnail_url, uploaded_at
    `
    
    if (insertResult.length === 0) {
      throw new Error('数据库插入失败')
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
    
    console.log('🎉 文件上传完成!')
    
    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      file: responseFile
    })
    
  } catch (error) {
    console.error('❌ 文件上传失败:', error)
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: error instanceof Error ? error.message : '文件上传失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 获取上传配置信息
 * GET /api/files/upload
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      config: {
        maxSizes: {
          images: '无限制',
          documents: '无限制'
        },
        supportedTypes: {
          images: '支持所有图片格式',
          documents: '支持所有文件格式'
        },
        endpoint: '/api/files/upload',
        method: 'POST',
        contentType: 'multipart/form-data'
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
