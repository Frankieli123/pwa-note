@echo off
echo Starting PWA Note App...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Start the development server
echo Starting development server...
npm run dev

pause
