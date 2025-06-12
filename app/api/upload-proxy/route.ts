import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData()
    
    // 转发到文件服务器
    const uploadResponse = await fetch('http://124.243.146.198:3001/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('文件服务器错误:', errorText)
      return NextResponse.json(
        { error: `Upload failed: ${uploadResponse.status} ${errorText}` },
        { status: uploadResponse.status }
      )
    }

    const result = await uploadResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('代理上传错误:', error)
    return NextResponse.json(
      { error: 'Proxy upload failed' },
      { status: 500 }
    )
  }
}
