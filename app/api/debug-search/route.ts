import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * 调试搜索API - 查看数据库中的实际数据
 * GET /api/debug-search?userId=xxx&q=搜索关键词
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const searchQuery = searchParams.get('q')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    console.log('🔍 调试搜索:', { userId, searchQuery })

    // 1. 查看用户的所有便签（前10条）
    const allNotes = await query(`
      SELECT id, content, created_at 
      FROM notes 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [userId])

    console.log('📝 用户便签示例:', allNotes.rows.map((note: any) => ({
      id: note.id,
      content: note.content.substring(0, 50) + '...',
      created_at: note.created_at
    })))

    // 2. 如果有搜索关键词，测试不同的搜索方式
    let searchTests = {}
    if (searchQuery && searchQuery.trim()) {
      const query_text = searchQuery.trim()
      
      // 测试1: 精确匹配
      const exactMatch = await query(`
        SELECT id, content 
        FROM notes 
        WHERE user_id = $1 AND content = $2
        LIMIT 5
      `, [userId, query_text])

      // 测试2: LIKE模糊匹配
      const likeMatch = await query(`
        SELECT id, content 
        FROM notes 
        WHERE user_id = $1 AND content LIKE $2
        LIMIT 5
      `, [userId, `%${query_text}%`])

      // 测试3: ILIKE不区分大小写模糊匹配
      const ilikeMatch = await query(`
        SELECT id, content 
        FROM notes 
        WHERE user_id = $1 AND content ILIKE $2
        LIMIT 5
      `, [userId, `%${query_text}%`])

      // 测试4: 检查是否包含中文字符
      const containsChinese = /[\u4e00-\u9fff]/.test(query_text)

      searchTests = {
        query: query_text,
        containsChinese,
        exactMatch: exactMatch.rows.length,
        likeMatch: likeMatch.rows.length,
        ilikeMatch: ilikeMatch.rows.length,
        ilikeResults: ilikeMatch.rows.map((row: any) => ({
          id: row.id,
          content: row.content.substring(0, 100) + '...'
        }))
      }

      console.log('🧪 搜索测试结果:', searchTests)
    }

    // 3. 数据库编码检查（兼容不同PostgreSQL版本）
    let encodingInfo
    try {
      encodingInfo = await query(`
        SELECT
          current_setting('server_encoding') as server_encoding,
          current_setting('client_encoding') as client_encoding,
          version() as pg_version
      `)
    } catch (error) {
      console.error('获取数据库编码信息失败:', error)
      encodingInfo = { rows: [{ server_encoding: 'unknown', client_encoding: 'unknown', pg_version: 'unknown' }] }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalNotes: allNotes.rows.length,
        sampleNotes: allNotes.rows.map((note: any) => ({
          id: note.id,
          content: note.content.substring(0, 100) + '...',
          created_at: note.created_at
        })),
        searchTests,
        databaseInfo: encodingInfo.rows[0]
      }
    })

  } catch (error) {
    console.error('❌ 调试搜索失败:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '调试失败'
      },
      { status: 500 }
    )
  }
}
