"use server"

import { sql } from "@/lib/db"

export async function seedDatabase(userId: string) {
  try {
    // Sample notes
    await sql`
      INSERT INTO notes (user_id, content, created_at, updated_at)
      VALUES 
        (${userId}, '<p>欢迎使用快速笔记！这是您的第一个便签。</p>', NOW(), NOW()),
        (${userId}, '<h1>待办事项</h1><ul><li>完成项目报告</li><li>准备会议演示</li><li>回复邮件</li></ul>', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        (${userId}, '<blockquote>生活不是等待风暴过去，而是学会在雨中跳舞。</blockquote>', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING
    `

    // Sample links
    await sql`
      INSERT INTO links (user_id, url, title, created_at)
      VALUES 
        (${userId}, 'https://nextjs.org', 'Next.js 官方网站', NOW()),
        (${userId}, 'https://tailwindcss.com', 'Tailwind CSS', NOW() - INTERVAL '1 day'),
        (${userId}, 'https://github.com', 'GitHub', NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING
    `

    // Sample files (使用 Vercel Blob 存储字段)
    await sql`
      INSERT INTO files (user_id, name, type, blob_url, thumbnail_url, size, uploaded_at)
      VALUES
        (${userId}, '项目计划.pdf', 'application/pdf', '/placeholder.svg?text=PDF', NULL, 1024, NOW()),
        (${userId}, '风景照片.jpg', 'image/jpeg', '/placeholder.svg?text=Image', '/placeholder.svg?text=Thumbnail', 2048, NOW() - INTERVAL '1 day'),
        (${userId}, '会议记录.txt', 'text/plain', '/placeholder.svg?text=TXT', NULL, 512, NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING
    `

    return { success: true, message: "示例数据已成功添加到数据库" }
  } catch (error) {
    console.error("Seed database error:", error)
    return { success: false, message: "添加示例数据失败" }
  }
}
