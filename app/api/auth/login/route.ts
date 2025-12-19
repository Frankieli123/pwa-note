import { NextRequest, NextResponse } from 'next/server'
import { verifyUserPassword, hasUserPassword } from '@/app/actions/setting-actions'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getUserByUsername, getUserByUserId, createUser, migrateUsersTable, updateUserPassword } from '@/lib/user-migration'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().max(128).optional(),
})

type RateLimitEntry = { count: number; resetAt: number }
const loginRateLimit = new Map<string, RateLimitEntry>()

let userTableInitialized = false

const ALLOW_PASSWORDLESS_LOGIN = process.env.ALLOW_PASSWORDLESS_LOGIN === 'true'
const PASSWORD_MIN_LENGTH = 8

function allowAttempt(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const existing = loginRateLimit.get(key)
  if (!existing || existing.resetAt <= now) {
    loginRateLimit.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (existing.count >= limit) return false
  existing.count += 1
  return true
}

function generateLegacyUserId(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return `user_${Math.abs(hash).toString(16)}`
}

function generateNewUserId(): string {
  return `user_${crypto.randomUUID().replace(/-/g, '')}`
}

export async function POST(request: NextRequest) {
  try {
    // 确保用户表已初始化
    if (!userTableInitialized) {
      const migrationSuccess = await migrateUsersTable()
      if (!migrationSuccess) {
        return NextResponse.json(
          { error: 'System initialization failed', message: '系统初始化失败，请稍后重试' },
          { status: 503 }
        )
      }
      userTableInitialized = true
    }

    const body = await request.json().catch(() => null)
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', message: '请求参数无效' },
        { status: 400 }
      )
    }

    const username = parsed.data.username.trim()
    const password = parsed.data.password ?? ''

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username', message: '请输入用户名' },
        { status: 400 }
      )
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimitKey = `${ip}:${username}`

    if (!allowAttempt(rateLimitKey, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: '尝试次数过多，请稀后重试' },
        { status: 429 }
      )
    }

    // 尝试从users表查找用户
    let user = await getUserByUsername(username)

    if (!user) {
      const legacyUserId = generateLegacyUserId(username)

      // 检查 legacyUserId 是否已存在于 users 表
      const existingUserWithLegacyId = await getUserByUserId(legacyUserId)

      // 检查旧系统中是否有此 legacyUserId 的密码
      const legacyHasPassword = await hasUserPassword(legacyUserId)

      if (existingUserWithLegacyId) {
        // legacyUserId 已存在于 users 表
        // 场景：迁移时用户名被错误推断（如 "3180" -> "user_17edd6" -> "17edd6"）
        // 如果用户能验证旧密码，说明他们是同一个人，允许登录
        if (legacyHasPassword) {
          if (!password) {
            return NextResponse.json(
              { error: 'Password required', message: '此用户需要密码登录' },
              { status: 401 }
            )
          }
          const isValid = await verifyUserPassword(legacyUserId, password)
          if (!isValid) {
            return NextResponse.json(
              { error: 'Invalid credentials', message: '密码错误' },
              { status: 401 }
            )
          }
          // 密码验证成功，使用已存在的用户
          user = existingUserWithLegacyId
        } else if (ALLOW_PASSWORDLESS_LOGIN) {
          // 无密码模式：允许登录到已存在的账户
          user = existingUserWithLegacyId
        } else {
          return NextResponse.json(
            { error: 'Account conflict', message: '此用户名与已有账户冲突，请联系管理员' },
            { status: 409 }
          )
        }
      } else if (legacyHasPassword) {
        // 旧用户有密码，验证后迁移到users表
        if (!password) {
          return NextResponse.json(
            { error: 'Password required', message: '此用户需要密码登录' },
            { status: 401 }
          )
        }

        const isValid = await verifyUserPassword(legacyUserId, password)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid credentials', message: '密码错误' },
            { status: 401 }
          )
        }

        // 密码验证成功，迁移用户到users表
        const passwordHash = await bcrypt.hash(password, 10)
        user = await createUser(username, legacyUserId, passwordHash)
        if (!user) {
          return NextResponse.json(
            { error: 'User creation failed', message: '用户迁移失败，请稍后重试' },
            { status: 409 }
          )
        }
      } else {
        // 新用户注册
        if (!password) {
          if (!ALLOW_PASSWORDLESS_LOGIN) {
            return NextResponse.json(
              { error: 'Password required', message: '新用户注册需设置密码' },
              { status: 400 }
            )
          }
          // 无密码模式已启用
          user = await createUser(username, generateNewUserId())
          if (!user) {
            return NextResponse.json(
              { error: 'User creation failed', message: '创建用户失败，请稍后重试' },
              { status: 500 }
            )
          }
        } else {
          if (password.length < PASSWORD_MIN_LENGTH) {
            return NextResponse.json(
              { error: 'Weak password', message: `密码长度至少为 ${PASSWORD_MIN_LENGTH} 位` },
              { status: 400 }
            )
          }
          const passwordHash = await bcrypt.hash(password, 10)
          user = await createUser(username, generateNewUserId(), passwordHash)
          if (!user) {
            return NextResponse.json(
              { error: 'User creation failed', message: '创建用户失败（用户名可能已被占用）' },
              { status: 409 }
            )
          }
        }
      }
    } else {
      // 用户存在于users表
      if (user.password_hash) {
        // 用户设置了密码，必须验证
        if (!password) {
          return NextResponse.json(
            { error: 'Password required', message: '此用户需要密码登录' },
            { status: 401 }
          )
        }

        const isValid = await bcrypt.compare(password, user.password_hash)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid credentials', message: '密码错误' },
            { status: 401 }
          )
        }
      } else {
        // users表无密码：检查user_settings中是否有旧密码需迁移
        const legacyHasPassword = await hasUserPassword(user.user_id)
        if (legacyHasPassword) {
          if (!password) {
            return NextResponse.json(
              { error: 'Password required', message: '此用户需要密码登录' },
              { status: 401 }
            )
          }
          const isValid = await verifyUserPassword(user.user_id, password)
          if (!isValid) {
            return NextResponse.json(
              { error: 'Invalid credentials', message: '密码错误' },
              { status: 401 }
            )
          }
          // 迁移密码到users表
          const newHash = await bcrypt.hash(password, 10)
          const updated = await updateUserPassword(user.user_id, newHash)
          if (!updated) {
            console.warn('密码迁移失败，但允许继续登录:', user.user_id)
          }
        } else if (!ALLOW_PASSWORDLESS_LOGIN) {
          return NextResponse.json(
            { error: 'Password required', message: '此账户未设置密码，请联系管理员' },
            { status: 401 }
          )
        }
      }
    }

    // 生成 JWT
    const token = await signToken({
      userId: user.user_id,
      username: user.username
    })

    // 设置 HttpOnly Cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.user_id,
        username: user.username
      }
    })

  } catch (error) {
    console.error('登录API错误:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
