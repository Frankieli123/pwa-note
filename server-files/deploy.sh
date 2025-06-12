#!/bin/bash

# PWA Note 服务器部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "=========================================="
echo "    PWA Note 服务器部署脚本"
echo "=========================================="

# 设置变量
PROJECT_DIR="/var/www/pwa-note"
SERVICE_NAME="pwa-note"
PORT=3000

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请以 root 权限运行此脚本: sudo ./deploy.sh"
    exit 1
fi

echo "[1/8] 检查系统环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

echo "[2/8] 创建项目目录..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/public/uploads
chmod 755 $PROJECT_DIR/public/uploads

echo "[3/8] 设置文件权限..."
chown -R www-data:www-data $PROJECT_DIR/public/uploads

echo "[4/8] 配置 Nginx..."
# 复制 Nginx 配置
cp nginx.conf /etc/nginx/sites-available/pwa-note

# 更新配置中的路径
sed -i "s|/path/to/your/project|$PROJECT_DIR|g" /etc/nginx/sites-available/pwa-note

# 启用站点
ln -sf /etc/nginx/sites-available/pwa-note /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "✅ Nginx 配置成功"
else
    echo "❌ Nginx 配置错误"
    exit 1
fi

echo "[5/8] 创建环境配置..."
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    cp .env.local.example $PROJECT_DIR/.env.local
    echo "⚠️  请编辑 $PROJECT_DIR/.env.local 文件，配置数据库连接"
fi

echo "[6/8] 创建 PM2 配置..."
cat > $PROJECT_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$PROJECT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/$SERVICE_NAME-error.log',
    out_file: '/var/log/pm2/$SERVICE_NAME-out.log',
    log_file: '/var/log/pm2/$SERVICE_NAME.log'
  }]
}
EOF

echo "[7/8] 创建日志目录..."
mkdir -p /var/log/pm2
chown -R www-data:www-data /var/log/pm2

echo "[8/8] 创建系统服务..."
# 创建 systemd 服务文件
cat > /etc/systemd/system/pwa-note.service << EOF
[Unit]
Description=PWA Note Application
After=network.target

[Service]
Type=forking
User=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pwa-note

echo "=========================================="
echo "           部署完成！"
echo "=========================================="
echo ""
echo "📋 下一步操作："
echo "1. 将您的项目文件上传到: $PROJECT_DIR"
echo "2. 编辑环境配置: $PROJECT_DIR/.env.local"
echo "3. 安装依赖: cd $PROJECT_DIR && npm install"
echo "4. 构建项目: npm run build"
echo "5. 启动服务: systemctl start pwa-note"
echo ""
echo "🌐 访问地址: http://124.243.146.198"
echo "📁 上传目录: $PROJECT_DIR/public/uploads"
echo "📝 日志文件: /var/log/pm2/$SERVICE_NAME.log"
echo ""
echo "🔧 常用命令:"
echo "  查看状态: systemctl status pwa-note"
echo "  重启服务: systemctl restart pwa-note"
echo "  查看日志: pm2 logs $SERVICE_NAME"
