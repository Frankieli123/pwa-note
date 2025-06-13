/** @type {import('next').NextConfig} */

const { execSync } = require('child_process')

// 获取版本号函数
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

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
  },
  
  // 自定义 webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 在构建时替换 Service Worker 中的版本号
    if (!isServer && !dev) {
      const appVersion = getAppVersion()
      
      config.plugins.push(
        new webpack.DefinePlugin({
          '__APP_VERSION__': JSON.stringify(appVersion),
        })
      )
    }
    
    return config
  },
  
  // PWA 相关配置
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/version.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
