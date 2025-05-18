import { NextResponse } from 'next/server'
import { query } from "@/lib/db"

// 检查自上次同步后是否有新内容
export async function POST(request: Request) {
  try {
    // 捕获解析JSON可能的错误
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error("Invalid JSON in request:", error);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    
    const { userId, lastUpdate } = requestData;
    
    if (!userId) {
      console.error("Missing user ID in request");
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }
    
    // 如果没有提供上次更新时间，假设有更新
    if (!lastUpdate) {
      return NextResponse.json({ hasUpdates: true });
    }
    
    const lastUpdateDate = new Date(lastUpdate);
    
    try {
      // 检查笔记是否有更新
      const notesQuery = `
        SELECT COUNT(*) as count FROM notes 
        WHERE user_id = $1 AND (created_at > $2 OR updated_at > $2)
      `;
      const notesResult = await query(notesQuery, [userId, lastUpdateDate]);
      const hasNoteUpdates = parseInt(notesResult.rows[0].count, 10) > 0;
      
      // 检查链接是否有更新
      const linksQuery = `
        SELECT COUNT(*) as count FROM links 
        WHERE user_id = $1 AND created_at > $2
      `;
      const linksResult = await query(linksQuery, [userId, lastUpdateDate]);
      const hasLinkUpdates = parseInt(linksResult.rows[0].count, 10) > 0;
      
      // 检查文件是否有更新
      const filesQuery = `
        SELECT COUNT(*) as count FROM files 
        WHERE user_id = $1 AND uploaded_at > $2
      `;
      const filesResult = await query(filesQuery, [userId, lastUpdateDate]);
      const hasFileUpdates = parseInt(filesResult.rows[0].count, 10) > 0;
      
      // 如果有任何类型的更新，返回hasUpdates为true
      const hasUpdates = hasNoteUpdates || hasLinkUpdates || hasFileUpdates;
      
      return NextResponse.json({ hasUpdates, checkTime: new Date().toISOString() });
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return NextResponse.json({ 
        error: "Database error", 
        message: "无法查询数据库，请稍后再试" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: "服务器内部错误，请联系管理员"  
    }, { status: 500 });
  }
} 