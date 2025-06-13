#!/usr/bin/env tsx

/**
 * 检查数据库中是否有需要迁移的Base64数据
 */

import { neon } from '@neondatabase/serverless'

// 直接使用数据库连接字符串
const DATABASE_URL = 'postgresql://neondb_owner:npg_18PHrOToSFwY@ep-curly-poetry-a4ep8xlw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
const sql = neon(DATABASE_URL)

async function checkMigrationData() {
  console.log('🔍 检查数据库中的文件存储情况...\n')

  try {
    // 检查总文件数量
    const totalFiles = await sql`SELECT COUNT(*) as count FROM files`
    const totalCount = Number(totalFiles[0]?.count || 0)
    console.log(`📊 总文件数量: ${totalCount}`)

    if (totalCount === 0) {
      console.log('✅ 数据库中没有文件记录，无需迁移')
      return
    }

    // 检查不同存储类型的文件数量
    console.log('\n📈 文件存储类型分布：')

    // 检查有base64_data的文件
    try {
      const base64Files = await sql`
        SELECT COUNT(*) as count
        FROM files
        WHERE base64_data IS NOT NULL AND base64_data != ''
      `
      const base64Count = Number(base64Files[0]?.count || 0)
      console.log(`  📦 Base64存储文件: ${base64Count}`)
    } catch (error) {
      console.log(`  📦 Base64存储文件: 0 (字段不存在)`)
    }

    // 检查有blob_url的文件
    try {
      const blobFiles = await sql`
        SELECT COUNT(*) as count
        FROM files
        WHERE blob_url IS NOT NULL AND blob_url != ''
      `
      const blobCount = Number(blobFiles[0]?.count || 0)
      console.log(`  ☁️  Blob存储文件: ${blobCount}`)
    } catch (error) {
      console.log(`  ☁️  Blob存储文件: 0 (字段不存在)`)
    }

    // 检查文件类型分布
    console.log('\n📁 文件类型分布：')
    try {
      const fileTypes = await sql`
        SELECT type, COUNT(*) as count
        FROM files
        GROUP BY type
        ORDER BY count DESC
      `

      fileTypes.forEach((row: any) => {
        console.log(`  ${row.type}: ${row.count} 个文件`)
      })
    } catch (error) {
      console.log('  无法获取文件类型分布')
    }

    // 检查是否有需要迁移的数据
    console.log('\n🎯 迁移需求分析：')

    try {
      const needMigration = await sql`
        SELECT COUNT(*) as count
        FROM files
        WHERE (base64_data IS NOT NULL AND base64_data != '')
        AND (blob_url IS NULL OR blob_url = '')
      `
      const migrationCount = Number(needMigration[0]?.count || 0)

      if (migrationCount > 0) {
        console.log(`⚠️  需要迁移的文件: ${migrationCount} 个`)
        console.log('   这些文件有Base64数据但没有Blob URL')

        // 显示需要迁移的文件详情
        const migrationFiles = await sql`
          SELECT id, name, type, size, created_at
          FROM files
          WHERE (base64_data IS NOT NULL AND base64_data != '')
          AND (blob_url IS NULL OR blob_url = '')
          ORDER BY created_at DESC
          LIMIT 10
        `

        console.log('\n需要迁移的文件示例：')
        migrationFiles.forEach((row: any) => {
          console.log(`  ${row.id}: ${row.name} (${row.type}, ${(row.size / 1024).toFixed(1)}KB)`)
        })

      } else {
        console.log('✅ 没有需要迁移的文件')
        console.log('   所有文件都已经使用Blob存储或没有Base64数据')
      }
    } catch (error) {
      console.log('✅ 没有Base64字段，所有文件都使用新的存储系统')
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

async function main() {
  console.log('🔍 数据库迁移状态检查工具\n')
  
  await checkMigrationData()
  
  console.log('\n📋 总结：')
  console.log('1. 如果显示有需要迁移的文件，则需要运行迁移脚本')
  console.log('2. 如果没有需要迁移的文件，则可以跳过迁移任务')
  console.log('3. 如果数据不完整，可能需要清理或修复数据')
}

if (require.main === module) {
  main().catch(console.error)
}
