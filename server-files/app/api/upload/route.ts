import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 允许的文件类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
]

// 文件大小限制
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ 
        error: 'Missing file or userId',
        message: '缺少文件或用户ID' 
      }, { status: 400 })
    }

    // 验证文件类型
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type)
    
    if (!isImage && !isDocument) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        message: '不支持的文件类型' 
      }, { status: 400 })
    }

    // 验证文件大小
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return NextResponse.json({ 
        error: 'File too large',
        message: `文件大小超过限制 (${maxSizeMB}MB)` 
      }, { status: 400 })
    }

    // 创建用户专属文件夹
    const uploadDir = join(process.cwd(), 'public', 'uploads', userId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 生成安全的文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop() || ''
    const safeFileName = `${timestamp}-${randomString}.${fileExtension}`
    const filePath = join(uploadDir, safeFileName)

    // 将文件写入服务器
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 返回文件访问URL
    const fileUrl = `/uploads/${userId}/${safeFileName}`
    
    console.log(`文件上传成功: ${file.name} -> ${fileUrl}`)
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
      originalName: file.name,
      fileName: safeFileName,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ 
      error: 'Upload failed',
      message: '文件上传失败，请稍后重试' 
    }, { status: 500 })
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
