import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyMaintenanceRequest } from '@/lib/maintenance-auth'

export async function POST(request: NextRequest) {
  try {
    const authError = verifyMaintenanceRequest(request)
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const { userId } = body

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
      error: '数据库迁移失败'
    }, { status: 500 })
  }
}
