import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/app/actions/init-db'
import { seedDatabase } from '@/app/actions/seed-db'

/**
 * 手动数据库初始化API
 * POST /api/init-db - 初始化数据库表
 * 只在需要时手动调用，不会自动执行
 */
export async function POST(request: Request) {
  try {
    const { action, userId } = await request.json()

    switch (action) {
      case 'init':
        console.log('🔧 手动初始化数据库...')
        const initResult = await initializeDatabase()
        return NextResponse.json(initResult)

      case 'seed':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing userId for seeding' },
            { status: 400 }
          )
        }
        console.log('🌱 添加示例数据...')
        const seedResult = await seedDatabase(userId)
        return NextResponse.json(seedResult)

      case 'init-and-seed':
        console.log('🔧 初始化数据库并添加示例数据...')
        const initRes = await initializeDatabase()
        if (!initRes.success) {
          return NextResponse.json(initRes)
        }
        
        if (userId) {
          const seedRes = await seedDatabase(userId)
          return NextResponse.json({
            success: true,
            message: `数据库初始化成功，${seedRes.success ? '示例数据添加成功' : '示例数据添加失败'}`
          })
        }
        
        return NextResponse.json(initRes)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "init", "seed", or "init-and-seed"' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ 数据库初始化API错误:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: '数据库初始化API',
    usage: {
      init: 'POST /api/init-db with { "action": "init" }',
      seed: 'POST /api/init-db with { "action": "seed", "userId": "user_id" }',
      'init-and-seed': 'POST /api/init-db with { "action": "init-and-seed", "userId": "user_id" }'
    }
  })
}
