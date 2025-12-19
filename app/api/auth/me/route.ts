import { NextResponse } from 'next/server'
import { getAuthPayloadFromCookies } from '@/lib/auth'

export async function GET() {
  try {
    const payload = await getAuthPayloadFromCookies()

    if (!payload) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        username: payload.username,
      },
    })
  } catch (error) {
    console.error('获取当前用户失败:', error)
    return NextResponse.json(
      { authenticated: false, user: null, error: '认证检查失败' },
      { status: 200 }
    )
  }
}
