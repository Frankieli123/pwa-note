import { NextResponse } from 'next/server'
import { optimizeDatabase, checkIndexes, analyzeQueryPerformance } from '@/lib/optimize-db'
import { verifyMaintenanceRequest } from '@/lib/maintenance-auth'

/**
 * 数据库优化API
 * POST /api/optimize-db - 执行数据库优化
 * GET /api/optimize-db - 检查索引状态
 */

export async function POST(request: Request) {
  try {
    const authError = verifyMaintenanceRequest(request)
    if (authError) return authError

    const { action, userId } = await request.json()

    switch (action) {
      case 'optimize':
        console.log('🚀 执行数据库优化...')
        const optimizeResult = await optimizeDatabase()
        return NextResponse.json(optimizeResult)

      case 'analyze':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing userId for analysis' },
            { status: 400 }
          )
        }
        console.log('📈 分析查询性能...')
        const analyzeResult = await analyzeQueryPerformance(userId)
        return NextResponse.json(analyzeResult)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "optimize" or "analyze"' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ 数据库优化API错误:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '数据库维护操作失败'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const authError = verifyMaintenanceRequest(request)
    if (authError) return authError
    console.log('🔍 检查数据库索引状态...')
    const result = await checkIndexes()
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ 检查索引API错误:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: '数据库维护操作失败'
      },
      { status: 500 }
    )
  }
}
