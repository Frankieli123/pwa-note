import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/version-manager'

/**
 * 版本信息 API
 * 返回当前应用版本和构建信息
 */
export async function GET() {
  try {
    const versionInfo = {
      version: APP_VERSION,
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      gitHash: APP_VERSION.startsWith('dev-') ? null : APP_VERSION,
      environment: process.env.NODE_ENV,
      vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      vercelCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      vercelCommitAuthor: process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME || null,
    }

    return NextResponse.json(versionInfo, {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('获取版本信息失败:', error)
    return NextResponse.json(
      { error: '获取版本信息失败' },
      { status: 500 }
    )
  }
}
