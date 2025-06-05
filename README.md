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
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 文件，配置以下变量：
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. **启动开发服务器**
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

🔗 **演示地址**: [https://pwa-note-demo.vercel.app](https://pwa-note-demo.vercel.app)

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