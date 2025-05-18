import { query } from "@/lib/db"

// 检查自上次同步后是否有新内容
export async function POST(request: Request) {
  try {
    const { userId, lastUpdate } = await request.json()
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    // 如果没有提供上次更新时间，假设有更新
    if (!lastUpdate) {
      return new Response(JSON.stringify({ hasUpdates: true }), {
        headers: { "Content-Type": "application/json" },
      })
    }
    
    const lastUpdateDate = new Date(lastUpdate)
    
    // 检查笔记是否有更新
    const notesQuery = `
      SELECT COUNT(*) as count FROM notes 
      WHERE user_id = $1 AND (created_at > $2 OR updated_at > $2)
    `
    const notesResult = await query(notesQuery, [userId, lastUpdateDate])
    const hasNoteUpdates = notesResult.rows[0].count > 0
    
    // 检查链接是否有更新
    const linksQuery = `
      SELECT COUNT(*) as count FROM links 
      WHERE user_id = $1 AND created_at > $2
    `
    const linksResult = await query(linksQuery, [userId, lastUpdateDate])
    const hasLinkUpdates = linksResult.rows[0].count > 0
    
    // 检查文件是否有更新
    const filesQuery = `
      SELECT COUNT(*) as count FROM files 
      WHERE user_id = $1 AND uploaded_at > $2
    `
    const filesResult = await query(filesQuery, [userId, lastUpdateDate])
    const hasFileUpdates = filesResult.rows[0].count > 0
    
    // 如果有任何类型的更新，返回hasUpdates为true
    const hasUpdates = hasNoteUpdates || hasLinkUpdates || hasFileUpdates
    
    return new Response(JSON.stringify({ hasUpdates }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error checking for updates:", error)
    return new Response(JSON.stringify({ error: "Failed to check for updates" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
} 