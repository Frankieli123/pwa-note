import { NextRequest, NextResponse } from 'next/server'
import { getFiles } from '@/app/actions/db-actions'

/**
 * 文件下载 API (重定向到 Vercel Blob)
 * 根据文件ID重定向到 Vercel Blob URL 或返回文件信息
 *
 * 查询参数：
 * - id: 文件ID (必需)
 * - userId: 用户ID (必需)
 * - format: 返回格式 (redirect|json) 默认: redirect
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'redirect'

    // 验证必需参数
    if (!fileId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: '缺少必需的参数：id, userId'
        },
        { status: 400 }
      )
    }

    // 验证格式参数
    const validFormats = ['redirect', 'json']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        {
          error: 'Invalid format',
          message: `无效的格式参数，支持：${validFormats.join(', ')}`
        },
        { status: 400 }
      )
    }

    // 获取文件信息
    const files = await getFiles(userId)
    const file = files.find(f => f.id === parseInt(fileId))

    if (!file) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件不存在'
        },
        { status: 404 }
      )
    }

    if (!file.blob_url) {
      return NextResponse.json(
        {
          error: 'File data not available',
          message: '文件数据不可用'
        },
        { status: 404 }
      )
    }

    // 根据格式返回不同的响应
    switch (format) {
      case 'redirect':
        // 重定向到 Vercel Blob URL
        return NextResponse.redirect(file.blob_url, 302)

      case 'json':
        // 返回完整的文件信息JSON
        return NextResponse.json({
          success: true,
          file: {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            url: file.blob_url,
            blob_url: file.blob_url,
            thumbnail: file.thumbnail_url,
            thumbnail_url: file.thumbnail_url,
            uploaded_at: file.uploaded_at
          }
        })

      default:
        return NextResponse.json(
          {
            error: 'Invalid format',
            message: `无效的格式参数：${format}，支持：${validFormats.join(', ')}`
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('File download API error:', error)
    
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
 * 获取文件缩略图 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, userId } = body

    if (!fileId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          message: '缺少必需的参数：fileId, userId'
        },
        { status: 400 }
      )
    }

    // 获取文件信息
    const files = await getFiles(userId)
    const file = files.find(f => f.id === parseInt(fileId))

    if (!file) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件不存在'
        },
        { status: 404 }
      )
    }

    // 如果文件已有缩略图，直接返回
    if (file.thumbnail_url) {
      return NextResponse.json({
        success: true,
        thumbnail: file.thumbnail_url
      })
    }

    // 如果是图片文件但没有缩略图，返回原图 URL
    if (file.type.startsWith('image/') && file.blob_url) {
      return NextResponse.json({
        success: true,
        thumbnail: file.blob_url,
        isOriginal: true
      })
    }

    // 非图片文件返回默认图标
    return NextResponse.json({
      success: true,
      thumbnail: null,
      fileType: file.type
    })

  } catch (error) {
    console.error('Thumbnail API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '服务器内部错误，请稍后再试'
      },
      { status: 500 }
    )
  }
}
