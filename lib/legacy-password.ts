import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'

// Login-only compatibility helpers. These are not Server Actions.
export async function hasLegacyUserPassword(userId: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT password_hash FROM user_settings WHERE user_id = $1',
      [userId],
    )
    return Boolean(result.rows[0]?.password_hash)
  } catch {
    // A fresh installation may not have the legacy table yet.
    return false
  }
}

export async function verifyLegacyUserPassword(userId: string, password: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT password_hash FROM user_settings WHERE user_id = $1',
      [userId],
    )
    const passwordHash = result.rows[0]?.password_hash
    return typeof passwordHash === 'string' && bcrypt.compare(password, passwordHash)
  } catch {
    return false
  }
}
