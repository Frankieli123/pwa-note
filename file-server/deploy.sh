#!/bin/bash

# PWA Note 文件服务器部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "=========================================="
echo "    PWA Note 文件服务器部署脚本"
echo "=========================================="

# 设置变量
PROJECT_DIR="/opt/pwa-note-file-server"
SERVICE_NAME="pwa-file-server"
PORT=3001

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请以 root 权限运行此脚本: sudo ./deploy.sh"
    exit 1
fi

echo "[1/7] 检查系统环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

echo "[2/7] 创建项目目录..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/uploads
chmod 755 $PROJECT_DIR/uploads

echo "[3/7] 复制项目文件..."
cp package.json $PROJECT_DIR/
cp server.js $PROJECT_DIR/
cp .env.example $PROJECT_DIR/.env

echo "[4/7] 安装依赖..."
cd $PROJECT_DIR
npm install --production

echo "[5/7] 配置防火墙..."
ufw allow $PORT/tcp

echo "[6/7] 创建 PM2 配置..."
cat > $PROJECT_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'server.js',
    cwd: '$PROJECT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
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

echo "[7/7] 创建系统服务..."
mkdir -p /var/log/pm2

# 创建 systemd 服务文件
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=PWA Note File Server
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable $SERVICE_NAME

echo "=========================================="
echo "           部署完成！"
echo "=========================================="
echo ""
echo "📋 下一步操作："
echo "1. 编辑环境配置: $PROJECT_DIR/.env"
echo "2. 启动服务: systemctl start $SERVICE_NAME"
echo ""
echo "🌐 服务地址: http://124.243.146.198:$PORT"
echo "📁 上传目录: $PROJECT_DIR/uploads"
echo "📝 日志文件: /var/log/pm2/$SERVICE_NAME.log"
echo ""
echo "🔧 常用命令:"
echo "  查看状态: systemctl status $SERVICE_NAME"
echo "  重启服务: systemctl restart $SERVICE_NAME"
echo "  查看日志: pm2 logs $SERVICE_NAME"
echo "  健康检查: curl http://124.243.146.198:$PORT/health"
