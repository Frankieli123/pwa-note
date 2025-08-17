#!/usr/bin/env node

/**
 * 搜索功能诊断脚本
 * 用于排查Coolify部署后搜索功能失效的问题
 */

const { Pool } = require('pg')
const https = require('https')
const http = require('http')

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 从环境变量或.env.local读取配置
function loadConfig() {
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch (e) {
    // dotenv可能未安装，手动读取.env.local
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env.local')
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=')
        if (key && value && !key.startsWith('#')) {
          process.env[key.trim()] = value.trim()
        }
      })
    }
  }
  
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
}

// 1. 检查环境配置
async function checkEnvironment() {
  log('\n=== 步骤1: 检查环境配置 ===', 'blue')
  
  const config = loadConfig()
  
  log(`NODE_ENV: ${config.NODE_ENV}`)
  log(`DATABASE_URL: ${config.DATABASE_URL ? '已配置' : '未配置'}`, config.DATABASE_URL ? 'green' : 'red')
  log(`MINIO_ENDPOINT: ${config.MINIO_ENDPOINT || '未配置'}`)
  
  if (!config.DATABASE_URL) {
    log('❌ DATABASE_URL未配置，这是搜索功能失效的主要原因', 'red')
    return false
  }
  
  // 解析数据库URL
  try {
    const url = new URL(config.DATABASE_URL)
    log(`数据库主机: ${url.hostname}:${url.port}`)
    log(`数据库名称: ${url.pathname.slice(1)}`)
    log(`用户名: ${url.username}`)
    log(`SSL模式: ${url.searchParams.get('sslmode') || '未指定'}`)
  } catch (error) {
    log(`❌ DATABASE_URL格式错误: ${error.message}`, 'red')
    return false
  }
  
  return true
}

// 2. 测试数据库连接
async function testDatabaseConnection() {
  log('\n=== 步骤2: 测试数据库连接 ===', 'blue')
  
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    log('❌ 跳过数据库测试：DATABASE_URL未配置', 'red')
    return false
  }
  
  // 测试不同的SSL配置
  const sslConfigs = [
    { ssl: false, name: '无SSL' },
    { ssl: { rejectUnauthorized: false }, name: 'SSL(忽略证书)' },
    { ssl: true, name: 'SSL(验证证书)' }
  ]
  
  for (const config of sslConfigs) {
    try {
      log(`测试连接配置: ${config.name}`)
      
      const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: config.ssl,
        connectionTimeoutMillis: 5000
      })
      
      const client = await pool.connect()
      const result = await client.query('SELECT 1 as test, NOW() as current_time')
      client.release()
      await pool.end()
      
      log(`✅ ${config.name} 连接成功`, 'green')
      log(`   测试结果: ${JSON.stringify(result.rows[0])}`)
      return true
      
    } catch (error) {
      log(`❌ ${config.name} 连接失败: ${error.message}`, 'red')
    }
  }
  
  return false
}

// 3. 检查数据库表结构
async function checkDatabaseSchema() {
  log('\n=== 步骤3: 检查数据库表结构 ===', 'blue')
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    })
    
    // 检查必要的表是否存在
    const tables = ['notes', 'files', 'links', 'users']
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table])
      
      const exists = result.rows[0].exists
      log(`表 ${table}: ${exists ? '存在' : '不存在'}`, exists ? 'green' : 'red')
      
      if (exists) {
        // 检查表中的数据量
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        log(`   数据量: ${countResult.rows[0].count} 条`)
      }
    }
    
    await pool.end()
    return true
    
  } catch (error) {
    log(`❌ 检查数据库表结构失败: ${error.message}`, 'red')
    return false
  }
}

// 4. 测试搜索API
async function testSearchAPI() {
  log('\n=== 步骤4: 测试搜索API ===', 'blue')
  
  // 这里需要启动Next.js应用来测试API
  log('⚠️  需要启动Next.js应用来测试搜索API', 'yellow')
  log('请在另一个终端运行: npm run dev')
  log('然后访问以下URL进行测试:')
  log('- http://localhost:3000/api/debug-search?userId=test-user&q=测试')
  log('- http://localhost:3000/api/search?userId=test-user&q=测试')
  
  return true
}

// 5. 生成诊断报告
async function generateReport(results) {
  log('\n=== 诊断报告 ===', 'blue')
  
  const [envCheck, dbConnection, dbSchema, apiTest] = results
  
  log(`环境配置: ${envCheck ? '✅ 正常' : '❌ 异常'}`, envCheck ? 'green' : 'red')
  log(`数据库连接: ${dbConnection ? '✅ 正常' : '❌ 异常'}`, dbConnection ? 'green' : 'red')
  log(`数据库表结构: ${dbSchema ? '✅ 正常' : '❌ 异常'}`, dbSchema ? 'green' : 'red')
  log(`API测试: ${apiTest ? '⚠️  需要手动测试' : '❌ 异常'}`, 'yellow')
  
  log('\n=== 建议的解决方案 ===', 'blue')
  
  if (!envCheck) {
    log('1. 检查.env.local文件中的DATABASE_URL配置', 'yellow')
    log('2. 确保DATABASE_URL格式正确: postgres://user:password@host:port/database')
  }
  
  if (!dbConnection) {
    log('3. 检查数据库服务器是否运行', 'yellow')
    log('4. 验证网络连接和防火墙设置', 'yellow')
    log('5. 在Coolify中检查SSL配置，可能需要启用SSL')
  }
  
  if (!dbSchema) {
    log('6. 运行数据库迁移: npm run migration:init', 'yellow')
    log('7. 检查数据库权限设置')
  }
  
  log('\n=== Coolify特定建议 ===', 'blue')
  log('1. 在Coolify环境变量中设置DATABASE_URL', 'yellow')
  log('2. 检查数据库SSL要求，可能需要修改lib/db.ts中的ssl配置', 'yellow')
  log('3. 确保数据库服务与应用在同一网络中', 'yellow')
}

// 主函数
async function main() {
  log('🔍 开始搜索功能诊断...', 'blue')
  
  const results = await Promise.all([
    checkEnvironment(),
    testDatabaseConnection(),
    checkDatabaseSchema(),
    testSearchAPI()
  ])
  
  await generateReport(results)
  
  log('\n诊断完成！', 'green')
}

// 运行诊断
if (require.main === module) {
  main().catch(error => {
    log(`诊断过程中发生错误: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  })
}

module.exports = { main, checkEnvironment, testDatabaseConnection, checkDatabaseSchema }
