import { NextRequest, NextResponse } from 'next/server'
import { getFileWithMinio, deleteFile } from '@/app/actions/db-actions'

/**
 * 获取单个文件详情（包含Blob URL）
 * GET /api/files/[id]?userId=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { id } = await params
    const fileId = parseInt(id)

    // 验证参数
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: '缺少必需的参数：userId'
        },
        { status: 400 }
      )
    }

    if (isNaN(fileId)) {
      return NextResponse.json(
        { 
          error: 'Invalid file ID',
          message: '无效的文件ID'
        },
        { status: 400 }
      )
    }

    console.log(`📥 API请求获取文件: ${fileId}`)

    // 获取文件详情
    const file = await getFileWithMinio(fileId, userId)

    if (!file) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件不存在或无权访问'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.minio_url,
        minio_url: file.minio_url,
        thumbnail: file.thumbnail_url,
        thumbnail_url: file.thumbnail_url,
        uploaded_at: file.uploaded_at
      }
    })

  } catch (error) {
    console.error('Get file API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '服务器内部错误，请稍后再试'
      },
      { status: 500 }
    )
  }
}

/**
 * 删除单个文件
 * DELETE /api/files/[id]?userId=xxx
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { id } = await params
    const fileId = parseInt(id)

    // 验证参数
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: '缺少必需的参数：userId'
        },
        { status: 400 }
      )
    }

    if (isNaN(fileId)) {
      return NextResponse.json(
        { 
          error: 'Invalid file ID',
          message: '无效的文件ID'
        },
        { status: 400 }
      )
    }

    // 删除文件
    await deleteFile(fileId, userId)

    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    })

  } catch (error) {
    console.error('Delete file API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '服务器内部错误，请稍后再试'
      },
      { status: 500 }
    )
  }
}
