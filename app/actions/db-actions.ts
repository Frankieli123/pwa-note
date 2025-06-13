"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"

// 数据库行类型定义
interface NoteRow {
  id: number
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

interface LinkRow {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
}

interface FileRow {
  id: number
  user_id: string
  name: string
  type: string
  size: number
  blob_url: string
  thumbnail_url: string | null
  uploaded_at: string
}

interface UserSettingsRow {
  id: number
  user_id: string
  font_family: string
  font_size: string
  sync_interval: number
  updated_at: string
}

// Types
export type Note = {
  id: number
  user_id: string
  content: string
  created_at: Date
  updated_at: Date
}

export type Link = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: Date
}

export type File = {
  id: number
  user_id: string
  name: string
  type: string
  url: string // 使用 blob_url 作为主要 URL
  thumbnail: string | null // 使用 thumbnail_url 作为缩略图
  blob_url: string // Vercel Blob 存储的文件URL（必需）
  thumbnail_url: string | null // Vercel Blob 存储的缩略图URL
  size: number
  uploaded_at: Date
}

export type UserSettings = {
  id: number
  user_id: string
  font_family: string
  font_size: string
  sync_interval: number
  updated_at: Date
}

// Notes actions (超快速版本 - 支持分页和全量加载)
export async function getNotes(userId: string, limit: number = 20, offset: number = 0): Promise<Note[]> {
  const isLoadAll = limit === -1
  console.log("⚡ 加载便签:", { userId, limit: isLoadAll ? '全部' : limit, offset })

  try {
    let queryText: string
    let queryParams: (string | number)[]

    if (isLoadAll) {
      // 加载所有剩余便签（跳过前offset条）
      queryText = "SELECT id, user_id, content, created_at, updated_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC OFFSET $2"
      queryParams = [userId, offset]
    } else {
      // 分页加载指定数量
      queryText = "SELECT id, user_id, content, created_at, updated_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
      queryParams = [userId, limit, offset]
    }

    const result = await query(queryText, queryParams)
    console.log(`⚡ 便签加载完成: ${result.rows.length} 条 ${isLoadAll ? '(剩余全部)' : ''}`)

    return result.rows.map((row: NoteRow) => ({
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at
    })) as Note[]
  } catch (error) {
    console.error("❌ 便签加载失败:", error)
    throw error
  }
}

export async function createNote(userId: string, content: string, clientTime?: string): Promise<Note> {
  console.log("服务器操作: createNote", { userId, contentLength: content.length, clientTime })

  try {
    let result;

    // 如果提供了客户端时间，使用它作为创建时间和更新时间
    if (clientTime) {
      result = await query(
        "INSERT INTO notes (user_id, content, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING *",
        [userId, content, new Date(clientTime)]
      );
    } else {
      // 没有提供客户端时间时使用默认的NOW()
      result = await query("INSERT INTO notes (user_id, content) VALUES ($1, $2) RETURNING *", [userId, content]);
    }

    const row = result.rows[0];
    const note: Note = {
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    console.log("createNote 结果:", note);
    revalidatePath("/")
    return note;
  } catch (error) {
    console.error("createNote 错误:", error)
    throw error
  }
}

export async function updateNote(id: number, userId: string, content: string, clientTime?: string): Promise<Note> {
  // 确保content不为undefined，如果是则用空字符串代替
  content = content || "";
  console.log("服务器操作: updateNote", { id, userId, contentLength: content.length, clientTime })
  try {
    let result;
    
    // 如果提供了客户端时间，使用它作为更新时间
    if (clientTime) {
      result = await query(
        "UPDATE notes SET content = $1, updated_at = $4 WHERE id = $2 AND user_id = $3 RETURNING *",
        [content, id, userId, new Date(clientTime)],
      );
    } else {
      // 没有提供客户端时间时使用默认的NOW()
      result = await query(
        "UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
        [content, id, userId],
      );
    }
    
    const row = result.rows[0];
    const note: Note = {
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    console.log("updateNote 结果:", note);
    revalidatePath("/")
    return note;
  } catch (error) {
    console.error("updateNote 错误:", error)
    throw error
  }
}

export async function deleteNote(id: number, userId: string): Promise<void> {
  console.log("服务器操作: deleteNote", { id, userId })
  try {
    await query("DELETE FROM notes WHERE id = $1 AND user_id = $2", [id, userId])
    console.log("deleteNote 成功")
    revalidatePath("/")
  } catch (error) {
    console.error("deleteNote 错误:", error)
    throw error
  }
}

// 获取便签总数
export async function getNotesCount(userId: string): Promise<number> {
  console.log("服务器操作: getNotesCount", { userId })
  try {
    const result = await query("SELECT COUNT(*) as count FROM notes WHERE user_id = $1", [userId])
    const count = parseInt(result.rows[0].count, 10)
    console.log(`getNotesCount 结果: ${count} 条便签`)
    return count
  } catch (error) {
    console.error("getNotesCount 错误:", error)
    throw error
  }
}

// Links actions
export async function getLinks(userId: string): Promise<Link[]> {
  console.log("服务器操作: getLinks", { userId })
  try {
    const result = await query("SELECT * FROM links WHERE user_id = $1 ORDER BY created_at DESC", [userId])
    console.log("getLinks 结果:", result.rows)
    return result.rows.map((row: LinkRow) => ({
      id: row.id,
      user_id: row.user_id,
      url: row.url,
      title: row.title,
      created_at: row.created_at
    })) as Link[]
  } catch (error) {
    console.error("getLinks 错误:", error)
    throw error
  }
}

export async function createLink(userId: string, url: string, title: string, clientTime?: string): Promise<Link> {
  console.log("服务器操作: createLink", { userId, url, title, clientTime })
  try {
    let result;
    
    // 如果提供了客户端时间，使用它作为创建时间
    if (clientTime) {
      result = await query(
        "INSERT INTO links (user_id, url, title, created_at) VALUES ($1, $2, $3, $4) RETURNING *", 
        [userId, url, title, new Date(clientTime)]
      );
    } else {
      // 没有提供客户端时间时使用默认的NOW()
      result = await query("INSERT INTO links (user_id, url, title) VALUES ($1, $2, $3) RETURNING *", [
        userId,
        url,
        title,
      ]);
    }
    
    const row = result.rows[0];
    const link: Link = {
      id: row.id,
      user_id: row.user_id,
      url: row.url,
      title: row.title,
      created_at: row.created_at
    };
    
    console.log("createLink 结果:", link);
    revalidatePath("/")
    return link;
  } catch (error) {
    console.error("createLink 错误:", error)
    throw error
  }
}

export async function deleteLink(id: number, userId: string): Promise<void> {
  console.log("服务器操作: deleteLink", { id, userId })
  try {
    await query("DELETE FROM links WHERE id = $1 AND user_id = $2", [id, userId])
    console.log("deleteLink 成功")
    revalidatePath("/")
  } catch (error) {
    console.error("deleteLink 错误:", error)
    throw error
  }
}

// Files actions (只支持 Vercel Blob 存储)
export async function getFiles(userId: string): Promise<File[]> {
  console.log("服务器操作: getFiles (Blob only)", { userId })
  try {
    const result = await query(
      "SELECT id, user_id, name, type, size, blob_url, thumbnail_url, uploaded_at FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [userId]
    )
    console.log(`getFiles 结果: ${result.rows.length} 个文件`)

    return result.rows.map((row: FileRow) => {
      return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        type: row.type,
        url: row.blob_url, // 使用 blob_url 作为主要 URL
        thumbnail: row.thumbnail_url,
        blob_url: row.blob_url,
        thumbnail_url: row.thumbnail_url,
        size: row.size,
        uploaded_at: row.uploaded_at
      };
    }) as File[]
  } catch (error) {
    console.error("getFiles 错误:", error)
    throw error
  }
}

export async function createFile(
  userId: string,
  fileData: {
    name: string
    type: string
    blob_url: string // Vercel Blob URL（必需）
    thumbnail_url?: string // Vercel Blob 缩略图URL
    size: number
  },
): Promise<File> {
  console.log("服务器操作: createFile (Blob only)", { userId, fileData })

  // 验证必需的 blob_url
  if (!fileData.blob_url) {
    throw new Error("blob_url is required")
  }

  try {
    const result = await query(
      `INSERT INTO files (
        user_id, name, type, size,
        blob_url, thumbnail_url
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        fileData.name,
        fileData.type,
        fileData.size,
        fileData.blob_url,
        fileData.thumbnail_url || null
      ],
    )

    const row = result.rows[0];

    const file: File = {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      url: row.blob_url, // 使用 blob_url 作为主要 URL
      thumbnail: row.thumbnail_url,
      blob_url: row.blob_url,
      thumbnail_url: row.thumbnail_url,
      size: row.size,
      uploaded_at: row.uploaded_at
    };

    console.log("createFile 结果:", file);
    revalidatePath("/")
    return file;
  } catch (error) {
    console.error("createFile 错误:", error)
    throw error
  }
}

/**
 * 创建文件记录（只支持 Vercel Blob 存储）
 */
export async function createFileAction(
  userId: string,
  fileData: {
    name: string
    type: string
    size: number
    blob_url: string // Vercel Blob URL（必需）
    thumbnail_url?: string // Vercel Blob 缩略图URL
  }
): Promise<File> {
  console.log("服务器操作: createFileAction (Blob only)", { userId, fileData })

  // 验证必需的 blob_url
  if (!fileData.blob_url) {
    throw new Error("blob_url is required")
  }

  try {
    const result = await query(
      "INSERT INTO files (user_id, name, type, size, blob_url, thumbnail_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [userId, fileData.name, fileData.type, fileData.size, fileData.blob_url, fileData.thumbnail_url || null],
    )

    const row = result.rows[0];

    const file: File = {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      url: row.blob_url, // 使用 blob_url 作为主要 URL
      thumbnail: row.thumbnail_url,
      blob_url: row.blob_url,
      thumbnail_url: row.thumbnail_url,
      size: row.size,
      uploaded_at: row.uploaded_at
    };

    console.log("createFileAction 结果:", file);
    revalidatePath("/")
    return file;
  } catch (error) {
    console.error("createFileAction 错误:", error)
    throw error
  }
}

export async function deleteFile(id: number, userId: string): Promise<void> {
  console.log("服务器操作: deleteFile", { id, userId })
  try {
    // 获取文件信息以便删除 Blob 存储的文件
    const fileResult = await query("SELECT blob_url, thumbnail_url FROM files WHERE id = $1 AND user_id = $2", [id, userId])

    if (fileResult.rows.length > 0) {
      const file = fileResult.rows[0]

      // 删除 Blob 存储的主文件
      if (file.blob_url) {
        try {
          const { deleteFileFromBlob } = await import('@/lib/blob-utils')
          await deleteFileFromBlob(file.blob_url)
          console.log("Blob 文件删除成功")
        } catch (error) {
          console.warn("删除 Blob 文件失败:", error)
          // 继续删除数据库记录，即使 Blob 删除失败
        }
      }

      // 删除 Blob 存储的缩略图
      if (file.thumbnail_url) {
        try {
          const { deleteFileFromBlob } = await import('@/lib/blob-utils')
          await deleteFileFromBlob(file.thumbnail_url)
          console.log("Blob 缩略图删除成功")
        } catch (error) {
          console.warn("删除 Blob 缩略图失败:", error)
        }
      }
    }

    // 删除数据库记录
    await query("DELETE FROM files WHERE id = $1 AND user_id = $2", [id, userId])
    console.log("deleteFile 成功")
    revalidatePath("/")
  } catch (error) {
    console.error("deleteFile 错误:", error)
    throw error
  }
}

// Get file with blob data (for download/preview)
export async function getFileWithBlob(id: number, userId: string): Promise<File | null> {
  console.log("服务器操作: getFileWithBlob", { id, userId })
  try {
    const result = await query(
      "SELECT * FROM files WHERE id = $1 AND user_id = $2",
      [id, userId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      url: row.blob_url, // 使用 blob_url 作为主要 URL
      thumbnail: row.thumbnail_url,
      blob_url: row.blob_url,
      thumbnail_url: row.thumbnail_url,
      size: row.size,
      uploaded_at: row.uploaded_at
    } as File
  } catch (error) {
    console.error("getFileWithBlob 错误:", error)
    throw error
  }
}

// 保持向后兼容的别名
export const getFileWithBase64 = getFileWithBlob



// User settings actions
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  console.log("服务器操作: getUserSettings", { userId })
  try {
    // 检查是否存在settings表，如果不存在则创建
    await ensureUserSettingsTableExists()
    
    let result;
    try {
      result = await query("SELECT * FROM user_settings WHERE user_id = $1", [userId])
    } catch (error: unknown) {
      // 检查是否是外键约束错误
      if (error instanceof Error && 
          (error.message.includes('违反外键约束') || 
           error.message.includes('violates foreign key constraint'))) {
        
        console.error("外键约束错误，尝试修复:", error);
        
        // 尝试删除外键约束
        try {
          await query(`
            ALTER TABLE user_settings 
            DROP CONSTRAINT IF EXISTS fk_user
          `);
          console.log("成功删除外键约束");
          
          // 重新尝试查询
          result = await query("SELECT * FROM user_settings WHERE user_id = $1", [userId])
        } catch (alterError) {
          console.error("无法删除外键约束:", alterError);
          throw new Error(`无法修复外键约束: ${alterError instanceof Error ? alterError.message : String(alterError)}`);
        }
      } else {
        // 如果不是外键错误，重新抛出
        throw error;
      }
    }
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const settings: UserSettings = {
      id: row.id,
      user_id: row.user_id,
      font_family: row.font_family,
      font_size: row.font_size,
      sync_interval: row.sync_interval,
      updated_at: row.updated_at
    };
    
    console.log("getUserSettings 结果:", settings);
    return settings;
  } catch (error) {
    console.error("getUserSettings 错误:", error)
    throw error
  }
}

export async function updateUserSettings(
  userId: string,
  settings: { 
    font_family: string;
    font_size: string;
    sync_interval: number;
  }
): Promise<UserSettings> {
  console.log("服务器操作: updateUserSettings", { userId, settings })
  try {
    // 确保表存在
    await ensureUserSettingsTableExists()
    
    // 检查用户设置是否已存在
    const existingSettings = await getUserSettings(userId)
    
    let result
    try {
      if (existingSettings) {
        // 更新现有设置
        result = await query(
          `UPDATE user_settings 
           SET font_family = $1, font_size = $2, sync_interval = $3, updated_at = NOW() 
           WHERE user_id = $4
           RETURNING *`,
          [settings.font_family, settings.font_size, settings.sync_interval, userId]
        )
      } else {
        // 创建新设置
        result = await query(
          `INSERT INTO user_settings (user_id, font_family, font_size, sync_interval) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [userId, settings.font_family, settings.font_size, settings.sync_interval]
        )
      }
    } catch (error: unknown) {
      // 检查是否是外键约束错误
      if (error instanceof Error && 
          (error.message.includes('违反外键约束') || 
           error.message.includes('violates foreign key constraint'))) {
        
        console.error("外键约束错误，尝试修复:", error);
        
        // 尝试删除外键约束
        try {
          await query(`
            ALTER TABLE user_settings 
            DROP CONSTRAINT IF EXISTS fk_user
          `);
          console.log("成功删除外键约束");
          
          // 重新尝试插入或更新
          if (existingSettings) {
            result = await query(
              `UPDATE user_settings 
               SET font_family = $1, font_size = $2, sync_interval = $3, updated_at = NOW() 
               WHERE user_id = $4
               RETURNING *`,
              [settings.font_family, settings.font_size, settings.sync_interval, userId]
            )
          } else {
            result = await query(
              `INSERT INTO user_settings (user_id, font_family, font_size, sync_interval) 
               VALUES ($1, $2, $3, $4) 
               RETURNING *`,
              [userId, settings.font_family, settings.font_size, settings.sync_interval]
            )
          }
        } catch (alterError) {
          console.error("无法删除外键约束:", alterError);
          throw new Error(`无法修复外键约束: ${alterError instanceof Error ? alterError.message : String(alterError)}`);
        }
      } else {
        // 如果不是外键错误，重新抛出
        throw error;
      }
    }
    
    const row = result.rows[0];
    const userSettings: UserSettings = {
      id: row.id,
      user_id: row.user_id,
      font_family: row.font_family,
      font_size: row.font_size,
      sync_interval: row.sync_interval,
      updated_at: row.updated_at
    };
    
    console.log("updateUserSettings 结果:", userSettings);
    revalidatePath("/")
    return userSettings;
  } catch (error) {
    console.error("updateUserSettings 错误:", error)
    throw error
  }
}

// 确保用户设置表存在的辅助函数
async function ensureUserSettingsTableExists() {
  console.log("开始检查用户设置表是否存在...")
  try {
    // 首先检查表是否已存在
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_settings'
      )
    `);
    
    const exists = tableExists.rows[0]?.exists;
    if (exists) {
      console.log("用户设置表已存在，无需创建");
      return;
    }
    
    // 表不存在，直接创建无外键的表，避免外键约束问题
    console.log("用户设置表不存在，创建无外键的表...");
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        font_family TEXT NOT NULL DEFAULT 'zcool-xiaowei',
        font_size TEXT NOT NULL DEFAULT 'medium',
        sync_interval INTEGER NOT NULL DEFAULT 5,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("成功创建无外键的用户设置表");
  } catch (error) {
    console.error("检查或创建用户设置表时出错:", error);
    // 记录更详细的错误信息
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
      console.error("错误堆栈:", error.stack);
    }
    throw new Error(`无法创建用户设置表: ${error instanceof Error ? error.message : String(error)}`);
  }
}
