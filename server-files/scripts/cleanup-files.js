#!/usr/bin/env node

/**
 * 文件清理脚本
 * 用于清理过期的临时文件和孤立文件
 * 使用方法: node cleanup-files.js
 */

const fs = require('fs').promises;
const path = require('path');

// 配置
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_AGE_DAYS = 30; // 文件保留天数
const DRY_RUN = process.argv.includes('--dry-run'); // 是否为测试运行

async function cleanupFiles() {
  console.log('🧹 开始清理文件...');
  console.log(`📁 上传目录: ${UPLOAD_DIR}`);
  console.log(`⏰ 保留天数: ${MAX_AGE_DAYS} 天`);
  console.log(`🔍 模式: ${DRY_RUN ? '测试模式' : '实际清理'}`);
  console.log('');

  try {
    const userDirs = await fs.readdir(UPLOAD_DIR);
    let totalFiles = 0;
    let deletedFiles = 0;
    let totalSize = 0;
    let deletedSize = 0;

    for (const userDir of userDirs) {
      const userPath = path.join(UPLOAD_DIR, userDir);
      const stat = await fs.stat(userPath);
      
      if (!stat.isDirectory()) continue;

      console.log(`👤 处理用户: ${userDir}`);
      
      try {
        const files = await fs.readdir(userPath);
        
        for (const file of files) {
          const filePath = path.join(userPath, file);
          const fileStat = await fs.stat(filePath);
          
          if (!fileStat.isFile()) continue;
          
          totalFiles++;
          totalSize += fileStat.size;
          
          // 检查文件年龄
          const ageInDays = (Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24);
          
          if (ageInDays > MAX_AGE_DAYS) {
            console.log(`  🗑️  删除过期文件: ${file} (${Math.round(ageInDays)} 天前)`);
            
            if (!DRY_RUN) {
              await fs.unlink(filePath);
            }
            
            deletedFiles++;
            deletedSize += fileStat.size;
          } else {
            console.log(`  ✅ 保留文件: ${file} (${Math.round(ageInDays)} 天前)`);
          }
        }
        
        // 如果用户目录为空，删除目录
        if (!DRY_RUN) {
          const remainingFiles = await fs.readdir(userPath);
          if (remainingFiles.length === 0) {
            await fs.rmdir(userPath);
            console.log(`  📁 删除空目录: ${userDir}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ 处理用户目录 ${userDir} 时出错:`, error.message);
      }
    }

    console.log('');
    console.log('📊 清理统计:');
    console.log(`  总文件数: ${totalFiles}`);
    console.log(`  删除文件数: ${deletedFiles}`);
    console.log(`  总大小: ${formatBytes(totalSize)}`);
    console.log(`  释放空间: ${formatBytes(deletedSize)}`);
    console.log('');
    
    if (DRY_RUN) {
      console.log('💡 这是测试运行，没有实际删除文件');
      console.log('   要执行实际清理，请运行: node cleanup-files.js');
    } else {
      console.log('✅ 文件清理完成');
    }

  } catch (error) {
    console.error('❌ 清理过程中出错:', error.message);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 运行清理
cleanupFiles().catch(console.error);
