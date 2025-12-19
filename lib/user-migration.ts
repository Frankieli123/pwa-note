import { query } from './db'

/**
 * 用户系统迁移脚本
 * 创建 users 表并从 user_settings 迁移现有用户数据
 */
export async function migrateUsersTable(): Promise<boolean> {
  console.log('🔄 开始用户系统迁移...')

  try {
    // 1. 创建 users 表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ users 表创建成功')

    // 2. 创建索引
    await query('CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)')
    await query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
    console.log('✅ 索引创建成功')

    // 3. 从 user_settings 迁移现有用户数据
    // 检查 user_settings 表是否存在
    const tableCheck = await query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings' AND table_schema = current_schema())"
    )

    if (!tableCheck.rows[0]?.exists) {
      console.log('ℹ️ user_settings 表不存在，跳过数据迁移')
      console.log('🎉 用户系统迁移完成!')
      return true
    }

    const existingUsers = await query(`
      SELECT DISTINCT user_id, password_hash
      FROM user_settings
      WHERE user_id IS NOT NULL
    `)

    if (existingUsers.rows.length > 0) {
      console.log(`📦 发现 ${existingUsers.rows.length} 个现有用户需要迁移`)

      for (const row of existingUsers.rows) {
        const userId = row.user_id as string
        // 从 user_id 推断 username (user_xxx -> 使用 user_id 作为临时用户名)
        // 截断到 64 字符以符合 VARCHAR(64) 限制
        const username = (userId.replace(/^user_/, '') || userId).substring(0, 64)

        try {
          await query(`
            INSERT INTO users (user_id, username, password_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO NOTHING
          `, [userId, username, row.password_hash])
        } catch (err: unknown) {
          // 仅处理唯一约束冲突 (PostgreSQL error code 23505)
          const pgErr = err as { code?: string }
          if (pgErr.code !== '23505') throw err
          // username 冲突，添加随机后缀（截断基础名到50字符以保证总长度<=64）
          const uniqueUsername = `${username.substring(0, 50)}_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`
          await query(`
            INSERT INTO users (user_id, username, password_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO NOTHING
          `, [userId, uniqueUsername, row.password_hash])
        }
      }
      console.log('✅ 用户数据迁移完成')
    }

    console.log('🎉 用户系统迁移完成!')
    return true
  } catch (error) {
    console.error('❌ 用户系统迁移失败:', error)
    return false
  }
}

/**
 * 检查用户是否存在
 */
export async function userExists(username: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM users WHERE username = $1',
    [username]
  )
  return result.rows.length > 0
}

/**
 * 通过用户名获取用户
 */
export async function getUserByUsername(username: string): Promise<{
  id: number
  user_id: string
  username: string
  password_hash: string | null
} | null> {
  const result = await query(
    'SELECT id, user_id, username, password_hash FROM users WHERE username = $1',
    [username]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 * 通过 user_id 获取用户
 */
export async function getUserByUserId(userId: string): Promise<{
  id: number
  user_id: string
  username: string
  password_hash: string | null
} | null> {
  const result = await query(
    'SELECT id, user_id, username, password_hash FROM users WHERE user_id = $1',
    [userId]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

/**
 * 创建新用户
 */
export async function createUser(
  username: string,
  userId: string,
  passwordHash?: string
): Promise<{ id: number; user_id: string; username: string; password_hash: string | null } | null> {
  try {
    const result = await query(`
      INSERT INTO users (user_id, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, username, password_hash
    `, [userId, username, passwordHash || null])

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error('创建用户失败:', error)
    return null
  }
}

/**
 * 更新用户密码
 */
export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<boolean> {
  try {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [passwordHash, userId]
    )
    return true
  } catch (error) {
    console.error('更新用户密码失败:', error)
    return false
  }
}
