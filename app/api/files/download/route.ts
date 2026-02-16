import { NextRequest, NextResponse } from 'next/server'
import { getFileWithMinio } from '@/app/actions/db-actions'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'
import { downloadFileFromMinio } from '@/lib/minio-utils'

/**
 * 以应用自身的 API 代理方式提供文件访问。
 * - 避免前端直接请求私有 MinIO URL 导致 403
 * - 支持 inline 预览 / attachment 下载
 * - 支持 thumbnail 变体（如果存在）
 */
type FileRecord = Awaited<ReturnType<typeof getFileWithMinio>>

async function serveFromMinio(params: {
  file: NonNullable<FileRecord>
  requestUserId: string
  variant: 'original' | 'thumbnail'
  disposition: 'inline' | 'attachment'
}) {
  const { file, requestUserId, variant, disposition } = params

  if (file.user_id !== requestUserId) {
    return NextResponse.json(
      { error: 'Access denied', message: '无权限访问此文件' },
      { status: 403 }
    )
  }

  const useThumbnail = variant === 'thumbnail' && !!file.thumbnail_url
  const sourceUrl = useThumbnail ? file.thumbnail_url! : file.minio_url
  const contentType = useThumbnail ? 'image/jpeg' : (file.type || 'application/octet-stream')

  const fileBuffer = await downloadFileFromMinio(sourceUrl)

  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.name)}"`)
  headers.set('Content-Length', fileBuffer.byteLength.toString())
  headers.set('Cache-Control', 'private, max-age=3600')

  return new NextResponse(fileBuffer, { status: 200, headers })
}

/**
 * 文件下载 API
 * 根据文件ID下载文件或返回文件信息
 *
 * 查询参数：
 * - id: 文件ID (必需)
 * - userId: 用户ID (必需)
 * - format: 返回格式 (redirect|download|json) 默认: redirect
 * - download: 是否强制下载 (true|false) 默认: false
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'redirect'
    const forceDownload = searchParams.get('download') === 'true'
    const variant = (searchParams.get('variant') || 'original') as 'original' | 'thumbnail'

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

    // 认证验证（cookie + userId 匹配）
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // 验证格式参数
    const validFormats = ['redirect', 'download', 'inline', 'json']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        {
          error: 'Invalid format',
          message: `无效的格式参数，支持：${validFormats.join(', ')}`
        },
        { status: 400 }
      )
    }

    // 验证 variant 参数
    if (variant !== 'original' && variant !== 'thumbnail') {
      return NextResponse.json(
        {
          error: 'Invalid variant',
          message: '无效的 variant 参数，支持：original, thumbnail'
        },
        { status: 400 }
      )
    }

    // 获取文件信息
    const numericFileId = parseInt(fileId, 10)
    if (Number.isNaN(numericFileId)) {
      return NextResponse.json(
        {
          error: 'Invalid file ID',
          message: '无效的文件ID'
        },
        { status: 400 }
      )
    }

    const file = await getFileWithMinio(numericFileId, userId)

    if (!file) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件不存在或无权限访问'
        },
        { status: 404 }
      )
    }

    if (!file.minio_url) {
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
        // 避免暴露 MinIO URL：redirect 到自身 inline/download
        {
          const redirectUrl = new URL(request.url)
          redirectUrl.searchParams.set('format', forceDownload ? 'download' : 'inline')
          return NextResponse.redirect(redirectUrl, 302)
        }

      case 'download':
        // 强制下载文件
        return await serveFromMinio({
          file,
          requestUserId: userId,
          variant,
          disposition: 'attachment'
        })

      case 'inline':
        // 浏览器预览（用于图片缩略图等）
        return await serveFromMinio({
          file,
          requestUserId: userId,
          variant,
          disposition: 'inline'
        })

      case 'json':
        // 返回完整的文件信息JSON
        return NextResponse.json({
          success: true,
          file: {
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

    // 认证验证（cookie + userId 匹配）
    const authResult = await verifyApiAuth(typeof userId === 'string' ? userId : null)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // 获取文件信息
    const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : Number(fileId)
    if (!Number.isFinite(numericFileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID', message: '无效的文件ID' },
        { status: 400 }
      )
    }

    const file = await getFileWithMinio(numericFileId, userId)

    if (!file) {
      return NextResponse.json(
        {
          error: 'File not found',
          message: '文件不存在或无权限访问'
        },
        { status: 404 }
      )
    }

    // 验证文件所有权：确保用户只能访问自己的文件
    if (file.user_id !== userId) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: '无权限访问此文件'
        },
        { status: 403 }
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
    if (file.type.startsWith('image/') && file.minio_url) {
      return NextResponse.json({
        success: true,
        thumbnail: file.minio_url,
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
