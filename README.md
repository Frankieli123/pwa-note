# 快速笔记 (PWA Note) 📝

<div align="center">

<img src="public/2.png" alt="PWA Note Logo" width="120" height="120" />

一个现代化的渐进式 Web 应用程序，提供跨设备的笔记同步功能

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Frankieli123/pwa-note)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

</div>

## ✨ 功能特点

### 📱 核心功能
- **📝 智能笔记** - 支持富文本编辑，自动保存，双击编辑历史记录
- **🔗 链接管理** - 快速保存和管理网页链接
- **📁 文件上传** - 支持图片和文档上传，自动生成缩略图
- **🔄 实时同步** - 多设备间数据实时同步，支持离线操作

### 🎨 用户体验
- **🌓 主题切换** - 支持明暗主题自动切换
- **🎭 个性头像** - 基于DiceBear API的动态头像系统
- **📱 响应式设计** - 完美适配桌面、平板和移动设备
- **⚡ PWA支持** - 可安装为本地应用，支持离线使用

### 🔧 技术特性
- **🚀 性能优化** - 图片缓存、懒加载、代码分割
- **🔒 数据安全** - 用户认证、数据加密存储
- **🌐 国际化** - 支持中文界面，可扩展多语言
- **📊 实时监控** - 同步状态监控、错误处理

## 🛠️ 技术栈

### 前端框架
- **[Next.js 15](https://nextjs.org/)** - React全栈框架
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - 实用优先的CSS框架
- **[shadcn/ui](https://ui.shadcn.com/)** - 现代化UI组件库

### 后端服务
- **[Neon Database](https://neon.tech/)** - 无服务器PostgreSQL数据库
- **[Drizzle ORM](https://orm.drizzle.team/)** - 类型安全的ORM
- **简单认证系统** - 基于用户名的快速登录

### 开发工具
- **[Vercel](https://vercel.com/)** - 部署和托管平台
- **[ESLint](https://eslint.org/)** - 代码质量检查
- **[Prettier](https://prettier.io/)** - 代码格式化

## 🚀 快速开始

### 📋 环境要求

- Node.js 18+
- npm 或 yarn 或 pnpm
- PostgreSQL 数据库（推荐使用 Neon）

### 🔧 本地开发

1. **克隆仓库**
```bash
git clone https://github.com/Frankieli123/pwa-note.git
cd pwa-note
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

3. **环境配置**
```bash
# 运行启动脚本会自动创建 .env.local 模板
# 或手动创建 .env.local 文件，配置以下变量：
DATABASE_URL=your_postgresql_connection_string

# 如果使用 Neon Database：
# 1. 访问 https://neon.tech/ 创建免费数据库
# 2. 复制连接字符串到 DATABASE_URL
```

4. **启动开发服务器**

**方式一：使用自动启动脚本（推荐）**
```bash
# Windows 用户
.\run-app.bat

# 脚本会自动：
# - 检查 Node.js 环境
# - 检测包管理器
# - 创建环境配置文件（如不存在）
# - 安装依赖
# - 启动应用并打开浏览器
```

**方式二：手动启动**
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

5. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 📦 构建部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 🌐 在线体验

🔗 **演示地址**: [https://pwa-note-two.vercel.app](https://pwa-note-two.vercel.app)

## 📱 PWA 安装

### 桌面端
1. 访问应用网址
2. 点击地址栏右侧的安装图标
3. 确认安装到桌面

### 移动端
1. 使用 Chrome/Safari 访问应用
2. 点击浏览器菜单中的"添加到主屏幕"
3. 确认安装

## 🎯 使用指南

### 📝 创建笔记
- 点击主界面的输入框开始创建笔记
- 支持自动保存，无需手动保存
- 双击历史记录可快速编辑

### 🔗 管理链接
- 在链接标签页中添加网页链接
- 自动获取网页标题和描述
- 支持快速访问和管理

### 📁 文件上传
- 支持拖拽上传图片和文档
- 自动生成图片缩略图
- 文件安全存储在云端

### ⚙️ 个性化设置
- 自定义字体和大小
- 选择个性化头像
- 调整同步频率

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**Frankie** - [GitHub](https://github.com/Frankieli123)

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 强大的React框架
- [shadcn/ui](https://ui.shadcn.com/) - 优秀的UI组件库
- [Vercel](https://vercel.com/) - 出色的部署平台
- [DiceBear](https://dicebear.com/) - 头像生成服务

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ 支持一下！**

Made with ❤️ by Frankie

</div>