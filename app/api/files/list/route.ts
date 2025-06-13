import { NextRequest, NextResponse } from 'next/server'
import { getFiles } from '@/app/actions/db-actions'

/**
 * 文件列表检索 API
 * 获取用户的所有文件列表，支持过滤和分页
 * 
 * 查询参数：
 * - userId: 用户ID (必需)
 * - type: 文件类型过滤 (image|document|all) 默认: all
 * - include_base64: 是否包含Base64数据 (true|false) 默认: false
 * - page: 页码 (默认: 1)
 * - limit: 每页数量 (默认: 50, 最大: 100)
 * - sort: 排序方式 (date_desc|date_asc|name_asc|name_desc|size_desc|size_asc) 默认: date_desc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all'
    const includeBase64 = searchParams.get('include_base64') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const sort = searchParams.get('sort') || 'date_desc'

    // 验证必需参数
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: '缺少必需的参数：userId'
        },
        { status: 400 }
      )
    }

    // 验证参数
    const validTypes = ['image', 'document', 'all']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { 
          error: 'Invalid type',
          message: `无效的类型参数，支持：${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    const validSorts = ['date_desc', 'date_asc', 'name_asc', 'name_desc', 'size_desc', 'size_asc']
    if (!validSorts.includes(sort)) {
      return NextResponse.json(
        { 
          error: 'Invalid sort',
          message: `无效的排序参数，支持：${validSorts.join(', ')}`
        },
        { status: 400 }
      )
    }

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { 
          error: 'Invalid pagination',
          message: '页码和每页数量必须大于0'
        },
        { status: 400 }
      )
    }

    // 获取所有文件（根据参数决定是否包含Base64数据）
    const allFiles = await getFiles(userId, includeBase64)

    // 按类型过滤
    let filteredFiles = allFiles
    if (type === 'image') {
      filteredFiles = allFiles.filter(file => file.type.startsWith('image/'))
    } else if (type === 'document') {
      filteredFiles = allFiles.filter(file => 
        !file.type.startsWith('image/') && (
          file.type.includes('pdf') || 
          file.type.includes('doc') || 
          file.type.includes('text') ||
          file.type.includes('spreadsheet') ||
          file.type.includes('excel') ||
          file.type === 'text/csv'
        )
      )
    }

    // 排序
    filteredFiles.sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
        case 'date_desc':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'name_desc':
          return b.name.localeCompare(a.name)
        case 'size_asc':
          return a.size - b.size
        case 'size_desc':
          return b.size - a.size
        default:
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      }
    })

    // 分页
    const total = filteredFiles.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedFiles = filteredFiles.slice(offset, offset + limit)

    // 处理返回数据
    const responseFiles = paginatedFiles.map(file => {
      const fileData: any = {
        id: file.id,
        name: file.name,
        type: file.type,
        url: file.url,
        thumbnail: file.thumbnail,
        size: file.size,
        uploaded_at: file.uploaded_at
      }

      // 根据参数决定是否包含Base64数据
      if (includeBase64) {
        fileData.base64_data = file.base64_data
      }

      return fileData
    })

    // 计算统计信息
    const stats = {
      total_files: total,
      image_count: allFiles.filter(f => f.type.startsWith('image/')).length,
      document_count: allFiles.filter(f => !f.type.startsWith('image/')).length,
      total_size: allFiles.reduce((sum, f) => sum + f.size, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        files: responseFiles,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        filters: {
          type,
          sort,
          include_base64: includeBase64
        },
        stats
      }
    })

  } catch (error) {
    console.error('File list API error:', error)
    
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
 * 批量文件操作 API
 * 支持批量删除、批量下载等操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, fileIds } = body

    if (!userId || !action || !Array.isArray(fileIds)) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          message: '缺少必需的参数：userId, action, fileIds'
        },
        { status: 400 }
      )
    }

    const validActions = ['delete', 'get_info']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          error: 'Invalid action',
          message: `无效的操作，支持：${validActions.join(', ')}`
        },
        { status: 400 }
      )
    }

    if (fileIds.length === 0) {
      return NextResponse.json(
        { 
          error: 'Empty file list',
          message: '文件ID列表不能为空'
        },
        { status: 400 }
      )
    }

    if (fileIds.length > 100) {
      return NextResponse.json(
        { 
          error: 'Too many files',
          message: '一次最多处理100个文件'
        },
        { status: 400 }
      )
    }

    // 获取用户的所有文件（不包含Base64数据以提高性能）
    const allFiles = await getFiles(userId, false)
    const requestedFiles = allFiles.filter(file => 
      fileIds.includes(file.id.toString()) || fileIds.includes(file.id)
    )

    if (requestedFiles.length === 0) {
      return NextResponse.json(
        { 
          error: 'No files found',
          message: '未找到指定的文件'
        },
        { status: 404 }
      )
    }

    switch (action) {
      case 'get_info':
        // 返回文件信息（不包含Base64数据）
        const fileInfo = requestedFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploaded_at: file.uploaded_at,
          thumbnail: file.thumbnail
        }))

        return NextResponse.json({
          success: true,
          data: {
            files: fileInfo,
            total: fileInfo.length
          }
        })

      case 'delete':
        // 批量删除功能需要在这里实现
        // 目前返回不支持的操作
        return NextResponse.json(
          { 
            error: 'Not implemented',
            message: '批量删除功能尚未实现，请使用单个文件删除API'
          },
          { status: 501 }
        )

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            message: `不支持的操作：${action}`
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Batch file operation API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '服务器内部错误，请稍后再试'
      },
      { status: 500 }
    )
  }
}
