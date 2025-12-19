import { NextRequest, NextResponse } from 'next/server'
import { getNotes } from '@/app/actions/db-actions'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

/**
 * 优先便签API - 超快速加载便签
 * GET /api/notes/priority?userId=xxx&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // 认证验证
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // userId已通过认证验证，此处安全使用
    const validUserId = userId as string

    console.log('🚀 优先便签API调用:', { userId: validUserId, limit })

    // 超快速获取便签
    const notes = await getNotes(validUserId, limit, 0)

    console.log('✅ 优先便签API完成:', notes.length, '条')

    return NextResponse.json({
      success: true,
      data: notes,
      count: notes.length
    })

  } catch (error) {
    console.error('❌ 优先便签API错误:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '服务器内部错误，请稍后再试'
      },
      { status: 500 }
    )
  }
}
