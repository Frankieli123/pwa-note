@echo off
echo 正在启动PWA笔记应用...
powershell -Command "Start-Process cmd -ArgumentList '/c cd %~dp0 && pnpm run dev -- -p 8080' -Verb RunAs"
echo 应用启动成功！请在浏览器中访问 http://localhost:8080 