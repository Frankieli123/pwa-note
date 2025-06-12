# Vercel 环境变量配置

由于您的 PWA Note 应用部署在 Vercel 上，需要在 Vercel 项目中配置环境变量以使用文件服务器。

## 🔧 在 Vercel 中配置环境变量

### 1. 登录 Vercel Dashboard

访问 [vercel.com](https://vercel.com) 并登录您的账户。

### 2. 找到您的项目

在项目列表中找到 `pwa-note-two` 项目。

### 3. 进入项目设置

点击项目名称 → Settings → Environment Variables

### 4. 添加文件服务器配置

添加以下环境变量：

```bash
# 文件服务器 API 地址
NEXT_PUBLIC_FILE_SERVER_URL=http://124.243.146.198:3001

# 或者如果您希望在代码中直接使用
FILE_UPLOAD_API_URL=http://124.243.146.198:3001/api/upload
FILE_DELETE_API_URL=http://124.243.146.198:3001/api/delete
```

### 5. 设置环境

确保为以下环境都添加这些变量：
- ✅ Production
- ✅ Preview  
- ✅ Development

## 📝 在代码中使用

在您的 PWA Note 项目中，可以这样使用：

```typescript
// 在 uploadFile 函数中
const fileServerUrl = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://124.243.146.198:3001';

const uploadResponse = await fetch(`${fileServerUrl}/api/upload`, {
  method: 'POST',
  body: formData,
});
```

## 🚀 重新部署

配置环境变量后，需要重新部署项目：

1. **自动部署**: 推送代码到 GitHub，Vercel 会自动重新部署
2. **手动部署**: 在 Vercel Dashboard 中点击 "Redeploy"

## 🔍 验证配置

部署完成后，可以通过以下方式验证：

1. **检查环境变量**: 在浏览器开发者工具中查看网络请求
2. **测试上传**: 尝试上传一个文件，查看请求是否发送到正确的地址
3. **查看文件服务器日志**: 在服务器上运行 `pm2 logs pwa-file-server`

## 🌐 域名访问测试

确保从所有域名都能正常访问：

- ✅ https://pwa.slee.top
- ✅ https://pwa.ricewind.com  
- ✅ https://pwa-note-two.vercel.app

## 🐛 故障排除

### CORS 错误
如果遇到 CORS 错误，检查：
1. 文件服务器的 `.env` 文件中是否包含所有域名
2. 文件服务器是否正常运行
3. 防火墙是否允许 3001 端口

### 文件上传失败
1. 检查网络连接
2. 验证文件服务器状态: `curl http://124.243.146.198:3001/health`
3. 查看浏览器开发者工具的网络面板

### 环境变量不生效
1. 确保在 Vercel 中正确配置了环境变量
2. 重新部署项目
3. 检查变量名是否正确（注意 NEXT_PUBLIC_ 前缀）
