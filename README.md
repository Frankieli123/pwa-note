# PWA 快速笔记应用

一个现代化的跨平台笔记应用，支持实时同步、文件管理和链接收藏。

## 功能特点

### 笔记管理
- 富文本编辑器支持
- 自动保存功能
- 便签式笔记管理
- 支持复制和删除操作

### 文件管理
- 图片上传和预览
- 文档文件管理
- 支持PDF、DOC、TXT等格式
- 文件拖放上传

### 链接管理
- 保存和管理网络链接
- 自动提取链接标题
- 链接快速分享

### 界面与体验
- 响应式设计，同时支持桌面端和移动端
- 深色/浅色主题切换
- 自定义字体和字号
- 简洁直观的用户界面

### 同步与安全
- 实时数据同步
- 用户认证与授权
- 安全的数据存储

## 安装指南

### 前置要求
- Node.js 18.0 或更高版本
- PNPM 包管理器

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/Frankieli123/pwa-note.git
cd pwa-note
```

2. 安装依赖
```bash
pnpm install
```

3. 环境配置
创建 `.env.local` 文件，添加必要的环境变量：
```
DATABASE_URL=your_database_url
```

4. 启动开发服务器
```bash
pnpm dev
```

5. 访问应用
打开浏览器访问 `http://localhost:3000`

## 构建部署

构建生产版本：
```bash
pnpm build
```

启动生产服务器：
```bash
pnpm start
```

## 技术栈

- **前端框架**: Next.js 14
- **UI组件**: Shadcn UI
- **样式解决方案**: Tailwind CSS
- **状态管理**: React Context API
- **数据库**: PostgreSQL
- **认证**: 自定义认证系统
- **部署**: 可作为PWA应用安装在移动设备

## 贡献指南

欢迎提交问题和贡献代码。请先fork仓库并创建Pull Request。

## 许可证

MIT 许可证 