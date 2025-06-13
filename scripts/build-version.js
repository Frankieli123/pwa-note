#!/usr/bin/env node

/**
 * 构建时版本号注入脚本
 * 自动获取 Git 提交哈希并注入到应用中
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 获取版本号
function getAppVersion() {
  try {
    // 优先使用环境变量（Vercel 部署时）
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8)
    }
    
    // 本地开发时使用 Git 命令
    const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    return gitHash.slice(0, 8)
  } catch (error) {
    console.warn('无法获取 Git 提交哈希，使用时间戳版本:', error.message)
    // 如果无法获取 Git 信息，使用时间戳
    return 'dev-' + Date.now().toString(36)
  }
}

// 替换文件中的版本占位符
function replaceVersionInFile(filePath, version) {
  if (!fs.existsSync(filePath)) {
    console.warn(`文件不存在: ${filePath}`)
    return
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // 替换版本占位符
    content = content.replace(/__APP_VERSION__/g, version)
    
    // 只有内容发生变化时才写入文件
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ 已更新版本号到 ${filePath}: ${version}`)
    }
  } catch (error) {
    console.error(`更新文件失败 ${filePath}:`, error.message)
  }
}

// 主函数
function main() {
  const version = getAppVersion()
  console.log(`🔄 构建版本: ${version}`)
  
  // 需要替换版本号的文件列表
  const filesToUpdate = [
    'public/sw.js',
    '.next/static/sw.js', // 如果存在的话
  ]
  
  // 设置环境变量
  process.env.NEXT_PUBLIC_APP_VERSION = version
  
  // 替换文件中的版本号
  filesToUpdate.forEach(file => {
    replaceVersionInFile(file, version)
  })
  
  // 输出版本信息到文件，供运行时使用
  const versionInfo = {
    version,
    buildTime: new Date().toISOString(),
    gitHash: version.startsWith('dev-') ? null : version,
  }
  
  // 确保目录存在
  const publicDir = path.join(process.cwd(), 'public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(publicDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2),
    'utf8'
  )
  
  console.log(`✅ 版本信息已写入 public/version.json`)
  console.log(`📦 应用版本: ${version}`)
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = { getAppVersion, replaceVersionInFile }
