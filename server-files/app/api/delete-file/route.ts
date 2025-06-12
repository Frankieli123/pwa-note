import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, userId } = await request.json()

    if (!fileUrl || !userId) {
      return NextResponse.json({ 
        error: 'Missing fileUrl or userId',
        message: '缺少文件URL或用户ID' 
      }, { status: 400 })
    }

    // 验证文件URL格式
    if (!fileUrl.startsWith(`/uploads/${userId}/`)) {
      return NextResponse.json({ 
        error: 'Invalid file URL',
        message: '无效的文件URL' 
      }, { status: 400 })
    }

    // 构建文件路径
    const fileName = fileUrl.split('/').pop()
    const filePath = join(process.cwd(), 'public', 'uploads', userId, fileName)

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found',
        message: '文件不存在' 
      }, { status: 404 })
    }

    // 删除文件
    await unlink(filePath)
    
    console.log(`文件删除成功: ${filePath}`)
    
    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    })

  } catch (error) {
    console.error('File delete error:', error)
    return NextResponse.json({ 
      error: 'Delete failed',
      message: '文件删除失败，请稍后重试' 
    }, { status: 500 })
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
