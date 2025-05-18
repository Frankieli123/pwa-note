"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"

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
  url: string
  thumbnail: string | null
  size: number
  uploaded_at: Date
}

// Notes actions
export async function getNotes(userId: string): Promise<Note[]> {
  console.log("服务器操作: getNotes", { userId })
  try {
    const result = await query("SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC", [userId])
    console.log("getNotes 结果:", result.rows)
    return result.rows
  } catch (error) {
    console.error("getNotes 错误:", error)
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
    
    console.log("createNote 结果:", result.rows[0])
    revalidatePath("/")
    return result.rows[0]
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
    
    console.log("updateNote 结果:", result.rows[0])
    revalidatePath("/")
    return result.rows[0]
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

// Links actions
export async function getLinks(userId: string): Promise<Link[]> {
  console.log("服务器操作: getLinks", { userId })
  try {
    const result = await query("SELECT * FROM links WHERE user_id = $1 ORDER BY created_at DESC", [userId])
    console.log("getLinks 结果:", result.rows)
    return result.rows
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
    
    console.log("createLink 结果:", result.rows[0])
    revalidatePath("/")
    return result.rows[0]
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

// Files actions
export async function getFiles(userId: string): Promise<File[]> {
  console.log("服务器操作: getFiles", { userId })
  try {
    const result = await query("SELECT * FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC", [userId])
    console.log("getFiles 结果:", result.rows)
    return result.rows
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
    url: string
    thumbnail?: string
    size: number
  },
): Promise<File> {
  console.log("服务器操作: createFile", { userId, fileData })
  try {
    const result = await query(
      "INSERT INTO files (user_id, name, type, url, thumbnail, size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [userId, fileData.name, fileData.type, fileData.url, fileData.thumbnail || null, fileData.size],
    )
    console.log("createFile 结果:", result.rows[0])
    revalidatePath("/")
    return result.rows[0]
  } catch (error) {
    console.error("createFile 错误:", error)
    throw error
  }
}

export async function deleteFile(id: number, userId: string): Promise<void> {
  console.log("服务器操作: deleteFile", { id, userId })
  try {
    await query("DELETE FROM files WHERE id = $1 AND user_id = $2", [id, userId])
    console.log("deleteFile 成功")
    revalidatePath("/")
  } catch (error) {
    console.error("deleteFile 错误:", error)
    throw error
  }
}
