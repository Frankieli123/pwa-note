import { NextRequest, NextResponse } from 'next/server'
import { verifyUserPassword, hasUserPassword } from '@/app/actions/setting-actions'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// Helper function to generate a consistent user ID from username (same as client-side)
function generateUserId(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  const userId = `user_${Math.abs(hash).toString(16)}`
  return userId
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Missing username', message: '请输入用户名' },
        { status: 400 }
      )
    }

    const userId = generateUserId(username)

    // 检查用户是否设置了密码
    const userHasPassword = await hasUserPassword(userId)

    if (userHasPassword) {
      // 用户设置了密码，必须验证
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', message: '此用户需要密码登录' },
          { status: 401 }
        )
      }

      const isValid = await verifyUserPassword(userId, password)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid credentials', message: '密码错误' },
          { status: 401 }
        )
      }
    }
    // 如果用户未设置密码，允许无密码登录

    // 生成 JWT
    const token = await signToken({
      userId,
      username
    })

    // 设置 Cookie
    const cookieStore = await cookies()
    
    // 设置 HttpOnly Cookie
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7天
    })

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: userId,
        username
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
