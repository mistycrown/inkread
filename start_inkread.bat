@echo off
echo Starting InkRead...

:: 1. 检查是否已经在运行
netstat -ano | find "5173" >nul
if %errorlevel% neq 0 (
    echo Starting Development Server...
    start /min cmd /c "npm run dev"
    :: 等待几秒钟让服务启动
    timeout /t 5 >nul
) else (
    echo Server is already running.
)

:: 2. 打开浏览器 (Edge App 模式)
:: --app 参数会让它以无地址栏的 App 模式打开，体验更好
start msedge --app=http://localhost:5173

exit
