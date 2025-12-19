import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()

    cookieStore.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return NextResponse.json({
      success: true,
      message: '已退出登录',
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    return NextResponse.json(
      { success: false, error: '退出登录失败' },
      { status: 500 }
    )
  }
}
