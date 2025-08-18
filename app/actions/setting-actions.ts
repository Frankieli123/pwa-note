"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export type UserSettings = {
  id: number
  user_id: string
  font_family: string
  font_size: string
  sync_interval: number
  avatar_style?: string
  avatar_seed?: string
  password_hash?: string
  updated_at: Date
}

// 简化的用户设置表创建函数
async function createUserSettingsTableIfNeeded() {
  console.log("【设置同步】检查用户设置表是否存在...")
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        font_family TEXT NOT NULL DEFAULT 'zcool-xiaowei',
        font_size TEXT NOT NULL DEFAULT 'medium',
        sync_interval INTEGER NOT NULL DEFAULT 5,
        avatar_style TEXT DEFAULT 'lorelei',
        avatar_seed TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // 为现有表添加头像字段（如果不存在）
    try {
      await query(`
        ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS avatar_style TEXT DEFAULT 'lorelei',
        ADD COLUMN IF NOT EXISTS avatar_seed TEXT
      `)
      console.log("【设置同步】头像字段添加成功或已存在")
    } catch (error) {
      console.log("【设置同步】头像字段可能已存在:", error)
    }

    // 为现有表添加密码字段（如果不存在）
    try {
      await query(`
        ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS password_hash TEXT
      `)
      console.log("【设置同步】密码字段添加成功或已存在")
    } catch (error) {
      console.log("【设置同步】密码字段可能已存在:", error)
    }
    console.log("【设置同步】用户设置表创建成功或已存在")
    return true
  } catch (error) {
    console.error("【设置同步】创建用户设置表失败:", error)
    return false
  }
}

// 获取用户设置
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  console.log("【设置同步】开始获取用户设置:", { userId })
  
  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【设置同步】表创建失败，无法获取设置")
      return null
    }
    
    // 查询用户设置
    const result = await query("SELECT * FROM user_settings WHERE user_id = $1", [userId])
    console.log(`【设置同步】查询结果行数: ${result.rows.length}`)
    
    if (result.rows.length === 0) {
      console.log("【设置同步】未找到用户设置")
      return null
    }
    
    const row = result.rows[0]
    const settings: UserSettings = {
      id: row.id,
      user_id: row.user_id,
      font_family: row.font_family,
      font_size: row.font_size,
      sync_interval: row.sync_interval,
      avatar_style: row.avatar_style,
      avatar_seed: row.avatar_seed,
      password_hash: row.password_hash,
      updated_at: row.updated_at
    }
    
    console.log("【设置同步】成功获取用户设置:", settings)
    return settings
  } catch (error) {
    console.error("【设置同步】获取用户设置失败:", error)
    throw new Error(`获取用户设置失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 更新用户设置
export async function saveUserSettings(
  userId: string,
  settings: {
    font_family: string
    font_size: string
    sync_interval: number
    avatar_style?: string
    avatar_seed?: string
  }
): Promise<UserSettings | null> {
  console.log("【设置同步】开始保存用户设置:", { userId, settings })
  
  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【设置同步】表创建失败，无法保存设置")
      return null
    }
    
    // 检查用户设置是否已存在
    const existingSettings = await getUserSettings(userId)
    
    let result
    if (existingSettings) {
      console.log("【设置同步】更新现有设置")
      // 更新现有设置
      result = await query(
        `UPDATE user_settings
         SET font_family = $1, font_size = $2, sync_interval = $3,
             avatar_style = $4, avatar_seed = $5, updated_at = NOW()
         WHERE user_id = $6
         RETURNING *`,
        [settings.font_family, settings.font_size, settings.sync_interval,
         settings.avatar_style, settings.avatar_seed, userId]
      )
    } else {
      console.log("【设置同步】创建新设置")
      // 创建新设置
      result = await query(
        `INSERT INTO user_settings (user_id, font_family, font_size, sync_interval, avatar_style, avatar_seed)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, settings.font_family, settings.font_size, settings.sync_interval,
         settings.avatar_style, settings.avatar_seed]
      )
    }
    
    if (result.rows.length === 0) {
      console.error("【设置同步】保存设置后未返回数据")
      return null
    }
    
    const row = result.rows[0]
    const userSettings: UserSettings = {
      id: row.id,
      user_id: row.user_id,
      font_family: row.font_family,
      font_size: row.font_size,
      sync_interval: row.sync_interval,
      avatar_style: row.avatar_style,
      avatar_seed: row.avatar_seed,
      password_hash: row.password_hash,
      updated_at: row.updated_at
    }
    
    console.log("【设置同步】成功保存用户设置:", userSettings)
    revalidatePath("/")
    return userSettings
  } catch (error) {
    console.error("【设置同步】保存用户设置失败:", error)
    throw new Error(`保存用户设置失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ==================== 密码相关函数 ====================

/**
 * 检查用户是否设置了密码
 * @param userId 用户ID
 * @returns 是否设置了密码
 */
export async function hasUserPassword(userId: string): Promise<boolean> {
  console.log("【密码检查】检查用户是否设置密码:", userId)

  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【密码检查】表创建失败")
      return false
    }

    const result = await query(
      "SELECT password_hash FROM user_settings WHERE user_id = $1",
      [userId]
    )

    const hasPassword = result.rows.length > 0 && result.rows[0].password_hash
    console.log("【密码检查】用户密码状态:", hasPassword ? "已设置" : "未设置")
    return !!hasPassword
  } catch (error) {
    console.error("【密码检查】检查用户密码失败:", error)
    return false
  }
}

/**
 * 获取用户密码哈希
 * @param userId 用户ID
 * @returns 密码哈希，如果不存在返回null
 */
export async function getUserPasswordHash(userId: string): Promise<string | null> {
  console.log("【密码获取】获取用户密码哈希:", userId)

  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【密码获取】表创建失败")
      return null
    }

    const result = await query(
      "SELECT password_hash FROM user_settings WHERE user_id = $1",
      [userId]
    )

    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      console.log("【密码获取】用户未设置密码")
      return null
    }

    console.log("【密码获取】成功获取用户密码哈希")
    return result.rows[0].password_hash
  } catch (error) {
    console.error("【密码获取】获取用户密码哈希失败:", error)
    return null
  }
}

/**
 * 设置用户密码
 * @param userId 用户ID
 * @param passwordHash 密码哈希
 * @returns 是否设置成功
 */
export async function setUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  console.log("【密码设置】设置用户密码:", userId)

  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【密码设置】表创建失败")
      return false
    }

    // 检查用户设置是否已存在
    const existingSettings = await getUserSettings(userId)

    if (existingSettings) {
      // 更新现有设置的密码
      await query(
        "UPDATE user_settings SET password_hash = $1, updated_at = NOW() WHERE user_id = $2",
        [passwordHash, userId]
      )
      console.log("【密码设置】更新用户密码成功")
    } else {
      // 创建新的用户设置记录
      await query(
        `INSERT INTO user_settings (user_id, font_family, font_size, sync_interval, password_hash)
         VALUES ($1, 'zcool-xiaowei', 'medium', 5, $2)`,
        [userId, passwordHash]
      )
      console.log("【密码设置】创建用户设置并设置密码成功")
    }

    revalidatePath("/")
    return true
  } catch (error) {
    console.error("【密码设置】设置用户密码失败:", error)
    return false
  }
}

/**
 * 移除用户密码
 * @param userId 用户ID
 * @returns 是否移除成功
 */
export async function removeUserPassword(userId: string): Promise<boolean> {
  console.log("【密码移除】移除用户密码:", userId)

  try {
    // 确保表存在
    const tableCreated = await createUserSettingsTableIfNeeded()
    if (!tableCreated) {
      console.error("【密码移除】表创建失败")
      return false
    }

    await query(
      "UPDATE user_settings SET password_hash = NULL, updated_at = NOW() WHERE user_id = $1",
      [userId]
    )

    console.log("【密码移除】移除用户密码成功")
    revalidatePath("/")
    return true
  } catch (error) {
    console.error("【密码移除】移除用户密码失败:", error)
    return false
  }
}

/**
 * 验证用户密码
 * @param userId 用户ID
 * @param password 用户输入的密码
 * @returns 是否验证成功
 */
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  console.log("【密码验证】验证用户密码:", userId)

  try {
    // 获取用户密码哈希
    const passwordHash = await getUserPasswordHash(userId)
    if (!passwordHash) {
      console.log("【密码验证】用户未设置密码")
      return false
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, passwordHash)
    console.log("【密码验证】密码验证结果:", isValid ? "成功" : "失败")
    return isValid
  } catch (error) {
    console.error("【密码验证】验证用户密码失败:", error)
    return false
  }
}