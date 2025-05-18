# 快速笔记 (PWA Note)

一个基于 Next.js 构建的渐进式 Web 应用程序，提供跨设备的笔记同步功能。

## 功能特点

- ✅ 离线工作能力 - 所有核心功能在离线状态下可用
- ✅ 多设备同步 - 在不同设备间同步笔记、链接和设置
- ✅ 个性化设置 - 自定义字体、大小及同步间隔
- ✅ 自动保存 - 在编辑时自动保存内容
- ✅ 响应式设计 - 适配桌面和移动设备
- ✅ PWA 支持 - 可作为本地应用安装

## 技术栈

- **Framework**: [Next.js 15](https://nextjs.org/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **CSS**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: SQLite (通过 Vercel Postgres Client)
- **部署**: 支持 Vercel 部署

## 开始使用

### 安装

1. 克隆仓库:
```bash
git clone https://github.com/yourusername/pwa-note.git
cd pwa-note
```

2. 安装依赖:
```bash
npm install
# 或
yarn
```

3. 运行开发服务器:
```bash
npm run dev
# 或
yarn dev
```

应用将运行在 http://localhost:3000

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 部署

此应用可直接部署到 Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/pwa-note)

## 许可

MIT 