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

  // 图片配置 - 允许外部域名（支持环境变量）
  images: {
    remotePatterns: [
      // MinIO 域名（从环境变量获取）
      ...(process.env.MINIO_ENDPOINT ? [{
        protocol: process.env.MINIO_ENDPOINT.startsWith('https') ? 'https' : 'http',
        hostname: process.env.MINIO_ENDPOINT.replace(/^https?:\/\//, ''),
        port: '',
        pathname: '/**',
      }] : []),
      // 头像服务域名
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      // 备用 MinIO 域名（硬编码作为后备）
      {
        protocol: 'https',
        hostname: 'minio-pwa.vryo.de',
        port: '',
        pathname: '/**',
      }
    ],
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
