import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * 测试COUNT vs EXISTS性能差异
 * GET /api/test-query-performance?userId=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      )
    }

    const lastUpdate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时前
    
    console.log('🧪 开始性能测试...')

    // 测试1：COUNT查询
    const countStartTime = Date.now()
    const countResult = await query(`
      SELECT COUNT(*) as count FROM notes 
      WHERE user_id = $1 AND (created_at > $2 OR updated_at > $2)
    `, [userId, lastUpdate])
    const countEndTime = Date.now()
    const countDuration = countEndTime - countStartTime

    // 测试2：EXISTS查询
    const existsStartTime = Date.now()
    const existsResult = await query(`
      SELECT EXISTS(
        SELECT 1 FROM notes 
        WHERE user_id = $1 AND (created_at > $2 OR updated_at > $2)
        LIMIT 1
      ) as has_updates
    `, [userId, lastUpdate])
    const existsEndTime = Date.now()
    const existsDuration = existsEndTime - existsStartTime

    // 结果分析
    const countValue = parseInt(countResult.rows[0].count, 10)
    const existsValue = existsResult.rows[0].has_updates
    const hasUpdates = countValue > 0
    const resultsMatch = hasUpdates === existsValue

    const performanceGain = countDuration > 0 ? 
      ((countDuration - existsDuration) / countDuration * 100).toFixed(1) : 0

    console.log('📊 性能测试结果:')
    console.log(`COUNT查询: ${countDuration}ms, 结果: ${countValue}`)
    console.log(`EXISTS查询: ${existsDuration}ms, 结果: ${existsValue}`)
    console.log(`性能提升: ${performanceGain}%`)

    return NextResponse.json({
      success: true,
      results: {
        count: {
          duration: countDuration,
          result: countValue,
          hasUpdates: hasUpdates
        },
        exists: {
          duration: existsDuration,
          result: existsValue,
          hasUpdates: existsValue
        },
        comparison: {
          performanceGainPercent: parseFloat(performanceGain.toString()),
          resultsMatch: resultsMatch,
          recommendation: existsDuration < countDuration ? 
            'EXISTS查询更快' : 'COUNT查询更快'
        }
      }
    })

  } catch (error) {
    console.error('❌ 性能测试失败:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
