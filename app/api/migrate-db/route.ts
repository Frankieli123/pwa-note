import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId } = body

    // 认证验证 - 管理操作需要登录
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    console.log('开始数据库迁移...')
    
    // 删除冗余字段
    await query('ALTER TABLE files DROP COLUMN IF EXISTS url')
    await query('ALTER TABLE files DROP COLUMN IF EXISTS thumbnail')
    
    console.log('数据库迁移完成')
    
    return NextResponse.json({ 
      success: true, 
      message: '数据库迁移完成' 
    })
  } catch (error) {
    console.error('数据库迁移失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 })
  }
}
