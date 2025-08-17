import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * 数据库调试检查 API
 * 用于检查数据库表结构和数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'table_structure'
    const userId = searchParams.get('userId') || 'user_17edd6'
    
    let result: any = {}
    
    switch (action) {
      case 'table_structure':
        // 检查 files 表结构
        const columns = await query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_name = 'files' AND table_schema = 'public'
           ORDER BY ordinal_position`,
          []
        )
        result.table_structure = columns.rows
        break
        
      case 'recent_files':
        // 检查最近的文件记录
        const recentFiles = await query(
          `SELECT * FROM files
           WHERE user_id = $1
           ORDER BY uploaded_at DESC
           LIMIT 10`,
          [userId]
        )
        result.recent_files = recentFiles.rows
        break
        
      case 'file_by_id':
        const fileId = searchParams.get('fileId') || '13'
        const fileById = await query(
          `SELECT * FROM files
           WHERE id = $1 AND user_id = $2`,
          [parseInt(fileId), userId]
        )
        result.file_by_id = fileById.rows
        break
        
      case 'all_files':
        // 获取所有文件
        const allFiles = await query(
          `SELECT id, user_id, name, type, size, uploaded_at, minio_url, thumbnail_url,
                  CASE WHEN minio_url IS NOT NULL THEN 'has_minio_url' ELSE 'no_minio_url' END as minio_status
           FROM files
           WHERE user_id = $1
           ORDER BY uploaded_at DESC`,
          [userId]
        )
        result.all_files = allFiles.rows
        break

      case 'test_getfiles':
        // 测试 getFiles 查询
        const testFiles = await query(
          "SELECT id, user_id, name, type, size, minio_url, thumbnail_url, uploaded_at FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC",
          [userId]
        )
        result.test_getfiles = {
          query_result: testFiles.rows,
          row_count: testFiles.rows.length,
          user_id_used: userId
        }
        break

      case 'call_getfiles':
        // 直接调用 getFiles 函数
        try {
          const { getFiles } = await import('@/app/actions/db-actions')
          const getFilesResult = await getFiles(userId)
          result.call_getfiles = {
            result: getFilesResult,
            count: getFilesResult.length,
            user_id_used: userId
          }
        } catch (error) {
          result.call_getfiles = {
            error: error instanceof Error ? error.message : String(error),
            user_id_used: userId
          }
        }
        break

      case 'production_debug':
        // 生产环境调试
        try {
          // 检查环境变量
          const envCheck = {
            DATABASE_URL: !!process.env.DATABASE_URL,
            MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
            MINIO_ACCESS_KEY: !!process.env.MINIO_ACCESS_KEY,
            MINIO_SECRET_KEY: !!process.env.MINIO_SECRET_KEY,
            MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME
          }

          // 检查数据库连接
          const dbTest = await query('SELECT NOW() as current_time', [])

          // 检查文件数据
          const fileCount = await query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [userId])
          const recentFiles = await query(
            'SELECT id, name, type, size, uploaded_at FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 5',
            [userId]
          )

          result.production_debug = {
            env_check: envCheck,
            db_connection: dbTest.rows[0],
            file_count: fileCount.rows[0],
            recent_files: recentFiles.rows,
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          result.production_debug = {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          }
        }
        break
        
      default:
        result.error = 'Unknown action'
    }
    
    return NextResponse.json({
      success: true,
      action,
      userId,
      data: result
    })
    
  } catch (error) {
    console.error('数据库检查失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
