import { NextResponse } from 'next/server'
import { optimizeDatabase, checkIndexes, analyzeQueryPerformance } from '@/lib/optimize-db'

/**
 * 数据库优化API
 * POST /api/optimize-db - 执行数据库优化
 * GET /api/optimize-db - 检查索引状态
 */

export async function POST(request: Request) {
  try {
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
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('🔍 检查数据库索引状态...')
    const result = await checkIndexes()
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ 检查索引API错误:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
