#!/bin/bash

# PWA Note 服务器状态监控脚本
# 使用方法: ./server-status.sh

echo "=========================================="
echo "    PWA Note 服务器状态监控"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查服务状态
check_service() {
    local service_name=$1
    if systemctl is-active --quiet $service_name; then
        echo -e "${GREEN}✅ $service_name: 运行中${NC}"
    else
        echo -e "${RED}❌ $service_name: 已停止${NC}"
    fi
}

# 检查端口
check_port() {
    local port=$1
    local service=$2
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✅ $service (端口 $port): 监听中${NC}"
    else
        echo -e "${RED}❌ $service (端口 $port): 未监听${NC}"
    fi
}

# 检查磁盘空间
check_disk_space() {
    echo -e "${BLUE}💾 磁盘使用情况:${NC}"
    df -h | grep -E '^/dev/' | awk '{print "  " $1 ": " $3 "/" $2 " (" $5 " 已使用)"}'
}

# 检查内存使用
check_memory() {
    echo -e "${BLUE}🧠 内存使用情况:${NC}"
    free -h | grep "Mem:" | awk '{print "  已使用: " $3 "/" $2 " (" int($3/$2*100) "% 已使用)"}'
}

# 检查上传目录
check_upload_dir() {
    local upload_dir="/var/www/pwa-note/public/uploads"
    echo -e "${BLUE}📁 上传目录状态:${NC}"
    
    if [ -d "$upload_dir" ]; then
        echo -e "${GREEN}  ✅ 目录存在: $upload_dir${NC}"
        
        # 统计文件数量和大小
        local file_count=$(find "$upload_dir" -type f | wc -l)
        local dir_size=$(du -sh "$upload_dir" 2>/dev/null | cut -f1)
        
        echo "  📊 文件数量: $file_count"
        echo "  📏 目录大小: $dir_size"
        
        # 检查权限
        local permissions=$(stat -c "%a" "$upload_dir")
        echo "  🔐 目录权限: $permissions"
        
    else
        echo -e "${RED}  ❌ 目录不存在: $upload_dir${NC}"
    fi
}

# 检查日志文件
check_logs() {
    echo -e "${BLUE}📝 最近日志 (最后10行):${NC}"
    
    local log_files=(
        "/var/log/pm2/pwa-note.log"
        "/var/log/nginx/pwa-note.access.log"
        "/var/log/nginx/pwa-note.error.log"
    )
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            echo -e "${GREEN}  ✅ $log_file${NC}"
            tail -n 3 "$log_file" 2>/dev/null | sed 's/^/    /'
        else
            echo -e "${YELLOW}  ⚠️  $log_file (不存在)${NC}"
        fi
        echo ""
    done
}

# 主检查流程
echo -e "${BLUE}🔍 系统服务状态:${NC}"
check_service "nginx"
check_service "pwa-note"

echo ""
echo -e "${BLUE}🌐 网络端口状态:${NC}"
check_port "80" "Nginx HTTP"
check_port "3000" "PWA Note App"

echo ""
check_disk_space

echo ""
check_memory

echo ""
check_upload_dir

echo ""
check_logs

echo "=========================================="
echo -e "${BLUE}🔧 常用管理命令:${NC}"
echo "  重启应用: sudo systemctl restart pwa-note"
echo "  重启Nginx: sudo systemctl restart nginx"
echo "  查看应用日志: sudo pm2 logs pwa-note"
echo "  查看Nginx日志: sudo tail -f /var/log/nginx/pwa-note.error.log"
echo "  清理文件: cd /var/www/pwa-note && node scripts/cleanup-files.js --dry-run"
echo "=========================================="
