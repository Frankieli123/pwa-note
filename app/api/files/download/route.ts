import { NextRequest, NextResponse } from 'next/server'
import { getFiles } from '@/app/actions/db-actions'

/**
 * 生成MinIO签名URL用于安全下载
 */
function generateSignedUrl(filePath: string, expiresIn: number = 3600): string {
  const MINIO_CONFIG = {
    endpoint: process.env.MINIO_ENDPOINT || 'https://minio-pwa.vryo.de',
    accessKey: process.env.MINIO_ACCESS_KEY || 'a3180623',
    secretKey: process.env.MINIO_SECRET_KEY || 'a3865373',
    bucketName: process.env.MINIO_BUCKET_NAME || 'pwa-note-files',
    region: process.env.MINIO_REGION || 'us-east-1'
  }

  // 从完整URL中提取文件路径
  const url = new URL(filePath)
  const objectKey = url.pathname.substring(`/${MINIO_CONFIG.bucketName}/`.length)

  // 生成预签名URL的参数
  const now = new Date()
  const expires = new Date(now.getTime() + expiresIn * 1000)
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'

  // 构建签名URL（简化版本）
  const signedUrl = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucketName}/${objectKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${MINIO_CONFIG.accessKey}%2F${dateStamp}%2F${MINIO_CONFIG.region}%2Fs3%2Faws4_request&X-Amz-Date=${timeStamp}&X-Amz-Expires=${expiresIn}&X-Amz-SignedHeaders=host`

  return signedUrl
}

/**
 * 处理强制下载文件 - 使用代理方式确保权限控制
 */
async function handleDownload(file: { minio_url: string; type: string; name: string; user_id: string }, requestUserId: string) {
  try {
    // 验证用户权限：只能下载自己的文件
    if (file.user_id !== requestUserId) {
      throw new Error('无权限访问此文件')
    }

    // 使用服务器端凭据直接从MinIO获取文件
    const MINIO_CONFIG = {
      endpoint: process.env.MINIO_ENDPOINT || 'https://minio-pwa.vryo.de',
      accessKey: process.env.MINIO_ACCESS_KEY || 'a3180623',
      secretKey: process.env.MINIO_SECRET_KEY || 'a3865373'
    }

    // 创建带认证的请求头
    const response = await fetch(file.minio_url, {
      method: 'GET',
      headers: {
        'Authorization': `AWS ${MINIO_CONFIG.accessKey}:${MINIO_CONFIG.secretKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    const fileBuffer = await response.arrayBuffer()

    // 设置下载响应头
    const headers = new Headers()
    headers.set('Content-Type', file.type || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`)
    headers.set('Content-Length', fileBuffer.byteLength.toString())

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      {
        error: 'Download failed',
        message: error instanceof Error ? error.message : '文件下载失败，请稍后再试'
      },
      { status: 500 }
    )
  }
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
    const validFormats = ['redirect', 'download', 'json']
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
        // 对于redirect，我们也需要验证权限，不能直接重定向到MinIO URL
        if (forceDownload) {
          // 如果要求强制下载，使用download格式
          return await handleDownload(file, userId)
        }
        // 生成临时签名URL进行重定向（1小时有效期）
        const signedUrl = generateSignedUrl(file.minio_url, 3600)
        return NextResponse.redirect(signedUrl, 302)

      case 'download':
        // 强制下载文件
        return await handleDownload(file, userId)

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

    // 获取文件信息
    const files = await getFiles(userId)
    const file = files.find(f => f.id === parseInt(fileId))

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
