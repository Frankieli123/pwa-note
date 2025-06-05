@echo off
chcp 65001 >nul

echo.
echo ========================================
echo    PWA 笔记应用 - 自动启动脚本
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "PORT=3000"
set "PACKAGE_MANAGER=npm"

echo [1/6] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未检测到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

echo.
echo [2/6] 检测包管理器...
if exist "%PROJECT_DIR%pnpm-lock.yaml" (
    set "PACKAGE_MANAGER=pnpm"
    echo ✅ 使用 pnpm
) else (
    if exist "%PROJECT_DIR%yarn.lock" (
        set "PACKAGE_MANAGER=yarn"
        echo ✅ 使用 yarn
    ) else (
        echo ✅ 使用 npm
    )
)

:: 检查环境配置文件
echo.
echo [3/6] 检查环境配置...
if not exist "%PROJECT_DIR%.env.local" (
    echo ⚠️  未找到 .env.local 文件，正在创建模板...
    echo.

    :: 创建 .env.local 模板文件
    echo # PWA Note 环境配置文件 > "%PROJECT_DIR%.env.local"
    echo # 请根据您的实际情况修改以下配置 >> "%PROJECT_DIR%.env.local"
    echo. >> "%PROJECT_DIR%.env.local"
    echo # 数据库连接字符串 (必需) >> "%PROJECT_DIR%.env.local"
    echo # 如果您使用 Neon Database，请从 Neon 控制台获取连接字符串 >> "%PROJECT_DIR%.env.local"
    echo # 格式: postgresql://username:password@hostname:port/database?sslmode=require >> "%PROJECT_DIR%.env.local"
    echo DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database >> "%PROJECT_DIR%.env.local"
    echo. >> "%PROJECT_DIR%.env.local"
    echo # 可选配置 >> "%PROJECT_DIR%.env.local"
    echo # APP_NAME=PWA Note >> "%PROJECT_DIR%.env.local"
    echo # PORT=%PORT% >> "%PROJECT_DIR%.env.local"

    echo ✅ 已创建 .env.local 模板文件
    echo.
    echo 📋 重要提示:
    echo 1. 请编辑 .env.local 文件，配置您的数据库连接
    echo 2. 如果您使用 Neon Database:
    echo    - 访问 https://neon.tech/ 创建免费数据库
    echo    - 复制连接字符串到 DATABASE_URL
    echo 3. 数据库配置完成后即可使用应用
    echo    - 应用使用简单的用户名登录系统
    echo    - 无需复杂的认证配置
    echo.
    echo 🔧 配置完成后，请重新运行此脚本启动应用
    echo.

    set /p "continue=是否现在打开 .env.local 文件进行编辑? (y/n): "
    if /i "%continue%"=="y" (
        echo 正在打开配置文件...
        start notepad "%PROJECT_DIR%.env.local"
        echo.
        echo 请编辑配置文件后保存，然后重新运行此脚本
        pause
        exit /b 0
    ) else (
        echo.
        echo 请手动编辑 .env.local 文件后重新运行此脚本
        pause
        exit /b 0
    )
)
echo ✅ 环境配置文件存在

:: 检查依赖安装
echo.
echo [4/6] 检查项目依赖...
if not exist "%PROJECT_DIR%node_modules" (
    echo 📦 正在安装依赖项...
    cd /d "%PROJECT_DIR%"
    %PACKAGE_MANAGER% install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已安装
)

:: 检查端口是否被占用
echo.
echo [5/6] 检查端口 %PORT%...
netstat -an | find ":%PORT%" | find "LISTENING" >nul
if not errorlevel 1 (
    echo ⚠️  端口 %PORT% 已被占用
    echo 应用将自动选择其他可用端口
) else (
    echo ✅ 端口 %PORT% 可用
)

:: 启动应用
echo.
echo [6/6] 启动应用...
echo.
echo 🚀 正在启动 PWA 笔记应用...
echo 📁 项目目录: %PROJECT_DIR%
echo 📦 包管理器: %PACKAGE_MANAGER%
echo 🌐 访问地址: http://localhost:%PORT%
echo.
echo ⏳ 请等待应用启动完成...
echo.

cd /d "%PROJECT_DIR%"
start "PWA Note Server" cmd /k "%PACKAGE_MANAGER% run dev"

:: 等待服务器启动
echo 正在等待服务器启动...
timeout /t 8 /nobreak >nul

:: 打开浏览器
echo.
echo 🌐 正在打开浏览器...
start http://localhost:%PORT%

echo.
echo ========================================
echo           启动完成！
echo ========================================
echo.
echo 📝 应用地址: http://localhost:%PORT%
echo 🔧 要停止服务器，请关闭 "PWA Note Server" 窗口
echo 📚 更多信息请查看 README.md
echo.
echo 如遇问题，请检查:
echo 1. 数据库连接配置 ^(.env.local^)
echo 2. 网络连接
echo 3. 防火墙设置
echo.
pause