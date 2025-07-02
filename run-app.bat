@echo off
chcp 65001 >nul

echo.
echo ========================================
echo    PWA Note App - Auto Start Script
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "PORT=3100"
set "PACKAGE_MANAGER=npm"

echo [1/6] Checking Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not detected
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed

echo.
echo [2/6] Detecting package manager...
if exist "%PROJECT_DIR%pnpm-lock.yaml" (
    set "PACKAGE_MANAGER=pnpm"
    echo Using pnpm
) else (
    if exist "%PROJECT_DIR%yarn.lock" (
        set "PACKAGE_MANAGER=yarn"
        echo Using yarn
    ) else (
        echo Using npm
    )
)

:: Check environment configuration file
echo.
echo [3/6] Checking environment configuration...
if exist ".env.local" (
    echo Environment configuration file exists
    :: Check if DATABASE_URL is properly configured
    findstr /C:"DATABASE_URL=postgresql://neondb_owner" ".env.local" >nul
    if errorlevel 1 (
        findstr /C:"DATABASE_URL=postgresql://" ".env.local" | findstr /V /C:"your_username" >nul
        if errorlevel 1 (
            echo Warning: DATABASE_URL not properly configured in .env.local
            echo Please edit .env.local to set your database connection string
            set /p "continue=Open .env.local file for editing now? (y/n): "
            if /i "%continue%"=="y" (
                start notepad ".env.local"
                echo Please edit and save the configuration file, then re-run this script
                pause
                exit /b 0
            ) else (
                echo Please manually edit .env.local file and re-run this script
                pause
                exit /b 0
            )
        ) else (
            echo Environment configuration file exists and is properly configured
        )
    ) else (
        echo Environment configuration file exists and is properly configured
    )
    goto :check_dependencies
) else (
    echo Warning: .env.local file not found, creating template...
    echo.

    :: Create .env.local template file
    echo # PWA Note Environment Configuration > ".env.local"
    echo # Please modify the following configuration according to your setup >> ".env.local"
    echo. >> ".env.local"
    echo # Database connection string (required) >> ".env.local"
    echo # If using Neon Database, get connection string from Neon console >> ".env.local"
    echo # Format: postgresql://username:password@hostname:port/database?sslmode=require >> ".env.local"
    echo DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database >> ".env.local"
    echo. >> ".env.local"
    echo # Optional configuration >> ".env.local"
    echo APP_NAME=PWA Note >> ".env.local"
    echo PORT=%PORT% >> ".env.local"

    echo Template .env.local file created successfully
    echo.
    echo Important Notes:
    echo 1. Please edit .env.local file to configure your database connection
    echo 2. If using Neon Database:
    echo    - Visit https://neon.tech/ to create a free database
    echo    - Copy connection string to DATABASE_URL
    echo 3. After database configuration, you can use the application
    echo    - App uses simple username login system
    echo    - No complex authentication configuration needed
    echo.
    echo Please configure .env.local and re-run this script
    echo.

    set /p "continue=Open .env.local file for editing now? (y/n): "
    if /i "%continue%"=="y" (
        echo Opening configuration file...
        start notepad ".env.local"
        echo.
        echo Please edit and save the configuration file, then re-run this script
        pause
        exit /b 0
    ) else (
        echo.
        echo Please manually edit .env.local file and re-run this script
        pause
        exit /b 0
    )
)

:check_dependencies
:: Check dependencies installation
echo.
echo [4/6] Checking project dependencies...
if not exist "%PROJECT_DIR%node_modules" (
    echo Installing dependencies...
    cd /d "%PROJECT_DIR%"
    %PACKAGE_MANAGER% install
    if errorlevel 1 (
        echo Dependency installation failed
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
) else (
    echo Dependencies already installed
)

:: Check if port is occupied
echo.
echo [5/6] Checking port %PORT%...
netstat -an | find ":%PORT%" | find "LISTENING" >nul
if not errorlevel 1 (
    echo Warning: Port %PORT% is already in use
    echo Application will automatically select another available port
) else (
    echo Port %PORT% is available
)

:: Start application
echo.
echo [6/6] Starting application...
echo.
echo Starting PWA Note Application...
echo Project directory: %PROJECT_DIR%
echo Package manager: %PACKAGE_MANAGER%
echo Access URL: http://localhost:%PORT%
echo.
echo Please wait for application to start...
echo.

cd /d "%PROJECT_DIR%"
start "PWA Note Server" cmd /k "%PACKAGE_MANAGER% run dev"

:: Wait for server to start
echo Waiting for server to start...
timeout /t 8 /nobreak >nul

:: Open browser
echo.
echo Opening browser...
start http://localhost:%PORT%

echo.
echo ========================================
echo           Startup Complete!
echo ========================================
echo.
echo Application URL: http://localhost:%PORT%
echo To stop server, close the "PWA Note Server" window
echo For more information, see README.md
echo.
echo If you encounter issues, please check:
echo 1. Database connection configuration (.env.local)
echo 2. Network connection
echo 3. Firewall settings
echo.
pause