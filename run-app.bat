@echo off
echo 正在启动PWA笔记应用...

:: 检查node_modules目录是否存在
if not exist "%~dp0node_modules" (
  echo 正在安装依赖项...
  npm install
)

:: 直接运行，不使用管理员权限
echo 尝试在端口8080启动应用...
start cmd /k "cd /d "%~dp0" && npm run dev -- -p 8081"

:: 等待几秒钟，确保服务器有时间启动
timeout /t 5 /nobreak > nul

:: 尝试打开浏览器
echo 正在打开浏览器...
start http://localhost:8081

echo.
echo 如果浏览器未自动打开，请手动访问: http://localhost:8080
echo 如果端口8080被占用，请查看命令窗口中的端口信息
echo 要停止服务器，请关闭已打开的命令窗口
echo. 