import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyApiAuth, createAuthErrorResponse } from '@/lib/auth'

const isDev = process.env.NODE_ENV !== 'production'
const debugLog = isDev ? console.log.bind(console) : () => {}

/**
 * 全局搜索API - 支持搜索便签、文件、链接
 * GET /api/search?userId=xxx&q=搜索关键词&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const searchQuery = searchParams.get('q')
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 50 ? rawLimit : 20

    // 认证验证
    const authResult = await verifyApiAuth(userId)
    if (!authResult.success) {
      return createAuthErrorResponse(authResult)
    }

    // userId已通过认证验证，此处安全使用
    const validUserId = userId as string

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          notes: [],
          files: [],
          links: []
        },
        total: 0
      })
    }

    const query_text = searchQuery.trim()
    debugLog('🔍 搜索API调用:', { userId: validUserId, query: query_text, limit })

    // 先查看用户有多少数据
    const [totalNotes, totalFiles, totalLinks] = await Promise.all([
      query('SELECT COUNT(*) as count FROM notes WHERE user_id = $1', [validUserId]),
      query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [validUserId]),
      query('SELECT COUNT(*) as count FROM links WHERE user_id = $1', [validUserId])
    ])

    debugLog('📊 用户数据统计:', {
      notes: totalNotes.rows[0]?.count || 0,
      files: totalFiles.rows[0]?.count || 0,
      links: totalLinks.rows[0]?.count || 0
    })

    // 并行搜索所有类型的数据
    const [notesResult, filesResult, linksResult] = await Promise.all([
      searchNotes(validUserId, query_text, limit),
      searchFiles(validUserId, query_text, limit),
      searchLinks(validUserId, query_text, limit)
    ])

    const totalResults = notesResult.length + filesResult.length + linksResult.length

    debugLog('✅ 搜索完成:', {
      notes: notesResult.length,
      files: filesResult.length,
      links: linksResult.length,
      total: totalResults
    })

    return NextResponse.json({
      success: true,
      data: {
        notes: notesResult,
        files: filesResult,
        links: linksResult
      },
      total: totalResults,
      query: query_text
    })

  } catch (error) {
    console.error('❌ 搜索API错误:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '搜索失败'
      },
      { status: 500 }
    )
  }
}

/**
 * 搜索便签 - 支持模糊搜索和内容匹配
 */
async function searchNotes(userId: string, searchQuery: string, limit: number) {
  try {
    debugLog('🔍 搜索便签:', { userId, searchQuery, limit })

    // 使用多种搜索策略提高中文搜索效果
    const searchPattern = `%${searchQuery}%`

    debugLog('🔍 便签搜索参数:', { userId, searchQuery, searchPattern, limit })

    const result = await query(`
      SELECT
        id,
        user_id,
        title,
        content,
        created_at,
        updated_at,
        -- 计算相关度分数（修复除零错误，优化中文搜索）
        (
          (CASE WHEN title ILIKE $2 THEN 20 ELSE 0 END) +
          (CASE WHEN title LIKE $2 THEN 10 ELSE 0 END) +
          (CASE WHEN content ILIKE $2 THEN 10 ELSE 0 END) +
          (CASE WHEN content LIKE $2 THEN 5 ELSE 0 END) +
          CASE
            WHEN LENGTH($3) > 0 THEN
              (LENGTH(title) - LENGTH(REPLACE(title, $3, ''))) / LENGTH($3) * 2 +
              (LENGTH(content) - LENGTH(REPLACE(content, $3, ''))) / LENGTH($3)
            ELSE 0
          END
        ) as relevance_score
      FROM notes
      WHERE user_id = $1
        AND (title ILIKE $2 OR title LIKE $2 OR content ILIKE $2 OR content LIKE $2)
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT $4
    `, [userId, searchPattern, searchQuery, limit])

    debugLog('📝 便签SQL执行结果:', { rowCount: result.rows.length })

    debugLog('📝 便签搜索结果:', result.rows.length, '条')

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      relevance_score: row.relevance_score
    }))

  } catch (error) {
    console.error('❌ 搜索便签失败:', error)
    return []
  }
}

/**
 * 搜索文件 - 按文件名搜索
 */
async function searchFiles(userId: string, searchQuery: string, limit: number) {
  try {
    debugLog('📁 搜索文件:', { userId, searchQuery, limit })

    const result = await query(`
      SELECT
        id,
        user_id,
        name,
        type,
        size,
        minio_url,
        thumbnail_url,
        uploaded_at,
        -- 计算文件名相关度（修复除零错误）
        (
          (CASE WHEN name ILIKE $2 THEN 10 ELSE 0 END) +
          CASE
            WHEN LENGTH($3) > 0 THEN
              (LENGTH(name) - LENGTH(REPLACE(LOWER(name), LOWER($3), ''))) / LENGTH($3)
            ELSE 0
          END
        ) as relevance_score
      FROM files
      WHERE user_id = $1
        AND name ILIKE $2
      ORDER BY relevance_score DESC, uploaded_at DESC
      LIMIT $4
    `, [userId, `%${searchQuery}%`, searchQuery, limit])

    debugLog('📁 文件搜索结果:', result.rows.length, '条')

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      size: row.size,
      url: row.minio_url, // 使用正确的字段名
      minio_url: row.minio_url,
      thumbnail: row.thumbnail_url,
      thumbnail_url: row.thumbnail_url,
      uploaded_at: row.uploaded_at,
      relevance_score: row.relevance_score
    }))

  } catch (error) {
    console.error('❌ 搜索文件失败:', error)
    return []
  }
}

/**
 * 搜索链接 - 按标题和URL搜索
 */
async function searchLinks(userId: string, searchQuery: string, limit: number) {
  try {
    debugLog('🔗 搜索链接:', { userId, searchQuery, limit })

    const result = await query(`
      SELECT
        id,
        user_id,
        url,
        title,
        created_at,
        -- 计算链接相关度（标题权重更高，修复除零错误）
        (
          (CASE WHEN title ILIKE $2 THEN 15 ELSE 0 END) +
          (CASE WHEN url ILIKE $2 THEN 5 ELSE 0 END) +
          CASE
            WHEN LENGTH($3) > 0 THEN
              (LENGTH(title) - LENGTH(REPLACE(LOWER(title), LOWER($3), ''))) / LENGTH($3) * 2 +
              (LENGTH(url) - LENGTH(REPLACE(LOWER(url), LOWER($3), ''))) / LENGTH($3)
            ELSE 0
          END
        ) as relevance_score
      FROM links
      WHERE user_id = $1
        AND (title ILIKE $2 OR url ILIKE $2)
      ORDER BY relevance_score DESC, created_at DESC
      LIMIT $4
    `, [userId, `%${searchQuery}%`, searchQuery, limit])

    debugLog('🔗 链接搜索结果:', result.rows.length, '条')

    return result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      url: row.url,
      title: row.title,
      created_at: row.created_at,
      relevance_score: row.relevance_score
    }))

  } catch (error) {
    console.error('❌ 搜索链接失败:', error)
    return []
  }
}
