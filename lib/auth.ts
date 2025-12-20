import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// 延迟获取 JWT_SECRET，避免构建时报错
function getEncodedSecret(): Uint8Array {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  const SECRET_KEY = JWT_SECRET || 'dev-secret-key-change-in-prod'
  return new TextEncoder().encode(SECRET_KEY)
}

// Token 过期时间
const TOKEN_EXPIRY = '7d' // 7天

export interface TokenPayload {
  userId: string
  username: string
  iat?: number
  exp?: number
}

const tokenPayloadSchema = z.object({
  userId: z.string(),
  username: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
})

/**
 * 签发 JWT Token
 */
export async function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getEncodedSecret())

  return token
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), { algorithms: ['HS256'] })
    const result = tokenPayloadSchema.safeParse(payload)
    if (!result.success) {
      console.error('JWT payload 验证失败:', result.error.message)
      return null
    }
    return result.data
  } catch (error) {
    console.error('JWT 验证失败:', error)
    return null
  }
}

export async function getAuthTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value ?? null
}

export async function getAuthPayloadFromCookies(): Promise<TokenPayload | null> {
  const token = await getAuthTokenFromCookies()
  if (!token) return null
  return verifyToken(token)
}

export type AuthResult = {
  success: true
  userId: string
  username: string
} | {
  success: false
  error: string
  status: number
}

/**
 * API 路由认证验证
 * 从 cookie 中获取 token 并验证，同时检查 userId 是否匹配
 */
export async function verifyApiAuth(requestUserId: string | null): Promise<AuthResult> {
  if (!requestUserId) {
    return { success: false, error: '缺少用户ID参数', status: 400 }
  }

  const token = await getAuthTokenFromCookies()

  if (!token) {
    return { success: false, error: '未登录', status: 401 }
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return { success: false, error: '登录已过期，请重新登录', status: 401 }
  }

  if (payload.userId !== requestUserId) {
    return { success: false, error: '无权访问此资源', status: 403 }
  }

  return { success: true, userId: payload.userId, username: payload.username }
}

/**
 * 创建认证错误响应
 */
export function createAuthErrorResponse(result: Extract<AuthResult, { success: false }>): NextResponse {
  return NextResponse.json(
    { error: result.error, message: result.error },
    { status: result.status }
  )
}
