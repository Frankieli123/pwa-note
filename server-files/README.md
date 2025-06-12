# PWA Note 服务器部署指南

## 📋 服务器文件说明

这个文件夹包含了在服务器 `http://124.243.146.198` 上部署 PWA Note 应用所需的所有文件。

## 📁 文件结构

```
server-files/
├── app/api/
│   ├── upload/route.ts          # 文件上传 API
│   └── delete-file/route.ts     # 文件删除 API
├── scripts/
│   ├── cleanup-files.js         # 文件清理脚本
│   └── server-status.sh         # 服务器状态监控
├── .env.local.example           # 环境配置模板
├── nginx.conf                   # Nginx 配置文件
├── ecosystem.config.js          # PM2 配置文件
├── deploy.sh                    # 自动部署脚本
└── README.md                    # 本说明文件
```

## 🚀 快速部署

### 1. 上传文件到服务器

将 `server-files` 文件夹中的所有文件上传到服务器的临时目录：

```bash
# 在服务器上创建临时目录
mkdir -p /tmp/pwa-note-deploy
cd /tmp/pwa-note-deploy

# 上传所有文件到这个目录
```

### 2. 运行自动部署脚本

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 以 root 权限运行部署脚本
sudo ./deploy.sh
```

### 3. 上传项目代码

```bash
# 将您的项目代码上传到 /var/www/pwa-note
# 确保包含以下文件：
# - package.json
# - next.config.js
# - 所有源代码文件
```

### 4. 配置环境变量

```bash
# 编辑环境配置文件
sudo nano /var/www/pwa-note/.env.local

# 填入您的数据库连接字符串和其他配置
```

### 5. 安装依赖并启动

```bash
cd /var/www/pwa-note

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务
sudo systemctl start pwa-note
```

## 🔧 手动部署步骤

如果自动部署脚本无法使用，可以按以下步骤手动部署：

### 1. 安装系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2
sudo npm install -g pm2
```

### 2. 创建项目目录

```bash
sudo mkdir -p /var/www/pwa-note
sudo mkdir -p /var/www/pwa-note/public/uploads
sudo chown -R www-data:www-data /var/www/pwa-note
sudo chmod 755 /var/www/pwa-note/public/uploads
```

### 3. 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/pwa-note

# 修改配置中的路径
sudo sed -i 's|/path/to/your/project|/var/www/pwa-note|g' /etc/nginx/sites-available/pwa-note

# 启用站点
sudo ln -s /etc/nginx/sites-available/pwa-note /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### 4. 设置 PM2 和系统服务

```bash
# 复制 PM2 配置
cp ecosystem.config.js /var/www/pwa-note/

# 创建系统服务
sudo cp pwa-note.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pwa-note
```

## 📊 监控和维护

### 查看服务状态

```bash
# 运行状态监控脚本
chmod +x scripts/server-status.sh
./scripts/server-status.sh
```

### 常用管理命令

```bash
# 查看应用状态
sudo systemctl status pwa-note

# 重启应用
sudo systemctl restart pwa-note

# 查看应用日志
sudo pm2 logs pwa-note

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/pwa-note.error.log
```

### 文件清理

```bash
# 测试清理（不实际删除）
cd /var/www/pwa-note
node scripts/cleanup-files.js --dry-run

# 实际清理过期文件
node scripts/cleanup-files.js
```

## 🔒 安全配置

### 防火墙设置

```bash
# 允许 HTTP 和 SSH
sudo ufw allow 22
sudo ufw allow 80
sudo ufw enable
```

### 文件权限

```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/pwa-note
sudo chmod -R 755 /var/www/pwa-note
sudo chmod -R 755 /var/www/pwa-note/public/uploads
```

## 🐛 故障排除

### 常见问题

1. **文件上传失败**
   - 检查 `/var/www/pwa-note/public/uploads` 目录权限
   - 查看 Nginx 错误日志

2. **应用无法启动**
   - 检查环境变量配置
   - 查看 PM2 日志

3. **数据库连接失败**
   - 验证 `.env.local` 中的数据库连接字符串
   - 确保数据库服务正在运行

### 日志位置

- 应用日志: `/var/log/pm2/pwa-note.log`
- Nginx 访问日志: `/var/log/nginx/pwa-note.access.log`
- Nginx 错误日志: `/var/log/nginx/pwa-note.error.log`

## 📞 支持

如果遇到问题，请检查：
1. 服务器状态监控脚本输出
2. 相关日志文件
3. 网络连接和防火墙设置
