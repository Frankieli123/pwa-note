#!/bin/bash

# 卸载之前错误安装的 PWA Note 项目
# 使用方法: chmod +x uninstall-old.sh && sudo ./uninstall-old.sh

echo "=========================================="
echo "    卸载之前安装的 PWA Note 项目"
echo "=========================================="

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请以 root 权限运行此脚本: sudo ./uninstall-old.sh"
    exit 1
fi

echo "[1/8] 停止相关服务..."

# 停止 pwa-note 服务
if systemctl is-active --quiet pwa-note; then
    echo "停止 pwa-note 服务..."
    systemctl stop pwa-note
fi

# 停止可能的 PM2 进程
if command -v pm2 &> /dev/null; then
    echo "停止 PM2 进程..."
    pm2 delete pwa-note 2>/dev/null || true
    pm2 save
fi

echo "[2/8] 禁用并删除系统服务..."

# 禁用服务
systemctl disable pwa-note 2>/dev/null || true

# 删除 systemd 服务文件
if [ -f "/etc/systemd/system/pwa-note.service" ]; then
    echo "删除 systemd 服务文件..."
    rm /etc/systemd/system/pwa-note.service
fi

echo "[3/8] 删除项目文件..."

# 删除项目目录
if [ -d "/var/www/pwa-note" ]; then
    echo "删除项目目录 /var/www/pwa-note..."
    rm -rf /var/www/pwa-note
fi

echo "[4/8] 删除 Nginx 配置..."

# 删除 Nginx 站点配置
if [ -f "/etc/nginx/sites-available/pwa-note" ]; then
    echo "删除 Nginx 站点配置..."
    rm /etc/nginx/sites-available/pwa-note
fi

if [ -L "/etc/nginx/sites-enabled/pwa-note" ]; then
    echo "删除 Nginx 站点链接..."
    rm /etc/nginx/sites-enabled/pwa-note
fi

# 恢复默认站点（如果需要）
if [ -f "/etc/nginx/sites-available/default" ] && [ ! -L "/etc/nginx/sites-enabled/default" ]; then
    echo "恢复 Nginx 默认站点..."
    ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
fi

echo "[5/8] 测试并重启 Nginx..."

# 测试 Nginx 配置
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx 重启成功"
else
    echo "❌ Nginx 配置有误，请检查"
fi

echo "[6/8] 清理日志文件..."

# 清理相关日志
if [ -f "/var/log/pm2/pwa-note.log" ]; then
    rm /var/log/pm2/pwa-note*.log 2>/dev/null || true
fi

if [ -f "/var/log/nginx/pwa-note.access.log" ]; then
    rm /var/log/nginx/pwa-note*.log 2>/dev/null || true
fi

echo "[7/8] 重新加载系统配置..."

# 重新加载 systemd
systemctl daemon-reload

echo "[8/8] 检查清理结果..."

# 检查是否还有残留
echo "检查残留文件和服务..."

if systemctl list-units --all | grep -q pwa-note; then
    echo "⚠️  警告: 仍有 pwa-note 相关服务"
else
    echo "✅ 系统服务已清理"
fi

if [ -d "/var/www/pwa-note" ]; then
    echo "⚠️  警告: 项目目录仍存在"
else
    echo "✅ 项目目录已清理"
fi

if [ -f "/etc/nginx/sites-available/pwa-note" ] || [ -L "/etc/nginx/sites-enabled/pwa-note" ]; then
    echo "⚠️  警告: Nginx 配置仍存在"
else
    echo "✅ Nginx 配置已清理"
fi

echo ""
echo "=========================================="
echo "           卸载完成！"
echo "=========================================="
echo ""
echo "📋 卸载总结:"
echo "  ✅ 停止了 pwa-note 服务"
echo "  ✅ 删除了系统服务配置"
echo "  ✅ 清理了项目文件"
echo "  ✅ 删除了 Nginx 配置"
echo "  ✅ 清理了日志文件"
echo "  ✅ 重新加载了系统配置"
echo ""
echo "🚀 现在可以安装文件服务器了:"
echo "  1. 上传 file-server 文件"
echo "  2. 运行 ./deploy.sh"
echo "  3. 配置环境变量"
echo "  4. 启动文件服务器"
echo ""
echo "🌐 您的 PWA Note 应用地址:"
echo "   - pwa.slee.top (重定向)"
echo "   - pwa.ricewind.com (重定向)"
echo "   - pwa-note-two.vercel.app (Vercel 实际部署)"
echo "📁 文件服务器将运行在: http://124.243.146.198:3001"
