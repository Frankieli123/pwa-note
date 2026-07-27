import { NextRequest, NextResponse } from 'next/server'
import { updateFileName } from '@/app/actions/db-actions'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

/**
 * 重命名文件 API
 * PUT /api/files/[id]/rename
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const fileId = parseInt(id)
    const body = await request.json()
    const { userId, newName } = body

    const authResult = await verifyApiAuth(typeof userId === 'string' ? userId : null)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // 验证参数
    if (!userId || !newName) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: '缺少必需的参数：userId, newName'
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

    console.log(`📝 API请求重命名文件: ${fileId} -> ${newName}`)

    // 更新文件名
    const updatedFile = await updateFileName(fileId, userId, newName)

    return NextResponse.json({
      success: true,
      message: '文件重命名成功',
      data: {
        id: updatedFile.id,
        name: updatedFile.name,
        type: updatedFile.type,
        size: updatedFile.size,
        url: updatedFile.minio_url,
        thumbnail: updatedFile.thumbnail_url,
        uploaded_at: updatedFile.uploaded_at
      }
    })

  } catch (error) {
    console.error('Rename file API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误'
    const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 
                      errorMessage.includes('非法') || errorMessage.includes('过长') || errorMessage.includes('为空') ? 400 : 500
    
    return NextResponse.json(
      { 
        error: 'Rename failed',
        message: errorMessage
      },
      { status: statusCode }
    )
  }
}
