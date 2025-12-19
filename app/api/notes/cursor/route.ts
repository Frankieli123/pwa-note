import { NextRequest, NextResponse } from 'next/server'
import { getNotesCursor } from '@/app/actions/db-actions'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

/**
 * 游标分页便签API - 高性能大数据量查询
 * GET /api/notes/cursor?userId=xxx&limit=20&cursor=2024-01-01T00:00:00.000Z
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const cursor = searchParams.get('cursor') || undefined
    const groupId = searchParams.get('groupId') || 'all'

    // 认证验证
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // userId已通过认证验证，此处安全使用
    const validUserId = userId as string

    // 验证limit范围
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: 'Invalid limit',
          message: 'limit必须在1-100之间'
        },
        { status: 400 }
      )
    }

    console.log('🚀 游标分页API调用:', { userId: validUserId, limit, cursor })

    // 执行游标分页查询
    const result = await getNotesCursor(validUserId, limit, cursor, groupId)

    console.log('✅ 游标分页API完成:', {
      count: result.notes.length,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    })

    return NextResponse.json({
      success: true,
      data: result.notes,
      pagination: {
        limit,
        count: result.notes.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ 游标分页API错误:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败'
      },
      { status: 500 }
    )
  }
}
