# PWA Note 文件服务器

这是一个独立的文件上传服务器，专门为 PWA Note 应用提供文件上传和存储服务。

## 🏗️ 架构说明

```
域名重定向                Vercel 部署              文件服务器
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ pwa.slee.top    │────▶│pwa-note-two     │────▶│ 124.243.146.198  │
│ pwa.ricewind.com│     │.vercel.app      │     │   端口: 3001     │
│ (域名重定向)     │     │ (Vercel 部署)    │     │ (文件服务器)      │
└─────────────────┘     └─────────────────┘     └──────────────────┘
```

## 🚀 部署到服务器

### 0. 卸载之前错误安装的项目（如果有）

```bash
# 上传卸载脚本
scp file-server/uninstall-old.sh root@124.243.146.198:/tmp/

# 登录服务器并运行卸载脚本
ssh root@124.243.146.198
cd /tmp
chmod +x uninstall-old.sh
sudo ./uninstall-old.sh
```

### 1. 上传文件到服务器

将 `file-server` 文件夹中的所有文件上传到服务器：

```bash
# 方法一：使用 scp
scp -r file-server/* root@124.243.146.198:/tmp/

# 方法二：使用 rsync
rsync -avz file-server/ root@124.243.146.198:/tmp/file-server/
```

### 2. 在服务器上运行部署脚本

```bash
# 登录服务器
ssh root@124.243.146.198

# 进入上传目录
cd /tmp/file-server  # 或 /tmp (取决于上传方式)

# 运行部署脚本
chmod +x deploy.sh
sudo ./deploy.sh
```

### 3. 配置环境变量

```bash
# 编辑配置文件
nano /opt/pwa-note-file-server/.env

# 设置允许的来源（重要！包含所有域名）
ALLOWED_ORIGINS=https://pwa.slee.top,https://pwa.ricewind.com,https://pwa-note-two.vercel.app,http://localhost:3000
```

### 4. 启动服务

```bash
# 启动文件服务器
systemctl start pwa-file-server

# 检查状态
systemctl status pwa-file-server

# 测试服务
curl http://124.243.146.198:3001/health
```

## 📡 API 接口

### 上传文件
```
POST http://124.243.146.198:3001/api/upload
Content-Type: multipart/form-data

参数:
- file: 文件对象
- userId: 用户ID

响应:
{
  "success": true,
  "url": "/uploads/user123/1234567890-abc123.jpg",
  "thumbnailUrl": "/uploads/user123/thumb_1234567890-abc123.jpg",
  "originalName": "photo.jpg",
  "filename": "1234567890-abc123.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

### 删除文件
```
DELETE http://124.243.146.198:3001/api/delete/{userId}/{filename}

响应:
{
  "success": true,
  "message": "文件删除成功"
}
```

### 访问文件
```
GET http://124.243.146.198:3001/uploads/{userId}/{filename}
```

### 健康检查
```
GET http://124.243.146.198:3001/health

响应:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## 🔧 本地 PWA Note 配置

在您的 PWA Note 项目中，需要修改文件上传逻辑以使用这个文件服务器：

```typescript
// 在 uploadFile 函数中
const uploadResponse = await fetch('http://124.243.146.198:3001/api/upload', {
  method: 'POST',
  body: formData,
});

// 注意：您的 PWA Note 应用部署架构
// - 用户访问域名: pwa.slee.top, pwa.ricewind.com
// - 实际 Vercel 部署: pwa-note-two.vercel.app
// - 文件服务器: http://124.243.146.198:3001
```

## 🔒 安全特性

- ✅ CORS 配置
- ✅ 文件类型验证
- ✅ 文件大小限制
- ✅ 速率限制
- ✅ 用户隔离（每个用户独立文件夹）
- ✅ 安全文件名生成

## 📊 监控和维护

### 查看服务状态
```bash
systemctl status pwa-file-server
```

### 查看日志
```bash
pm2 logs pwa-file-server
tail -f /var/log/pm2/pwa-file-server.log
```

### 重启服务
```bash
systemctl restart pwa-file-server
```

### 清理旧文件
```bash
# 删除 30 天前的文件
find /opt/pwa-note-file-server/uploads -type f -mtime +30 -delete
```

## 🐛 故障排除

### 常见问题

1. **CORS 错误**
   - 检查 `.env` 文件中的 `ALLOWED_ORIGINS` 设置
   - 确保包含您的 PWA Note 应用域名

2. **文件上传失败**
   - 检查磁盘空间
   - 验证文件权限
   - 查看错误日志

3. **服务无法启动**
   - 检查端口 3001 是否被占用
   - 验证 Node.js 版本

### 端口配置

如果需要更改端口，修改以下文件：
- `/opt/pwa-note-file-server/.env` - PORT 变量
- 防火墙规则
- PWA Note 应用中的 API 地址
