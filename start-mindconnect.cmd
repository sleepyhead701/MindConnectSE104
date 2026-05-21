@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_EXE=node"

if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_EXE=C:\Program Files\nodejs\node.exe"
)

if not exist "%ROOT%backend\.env" (
  if exist "%ROOT%backend\.env.example" (
    copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
  )
)

echo Starting MindConnect backend on http://localhost:3000 ...
start "MindConnect Backend" /D "%ROOT%backend" "%NODE_EXE%" "src\index.js"

timeout /t 2 /nobreak >nul

echo Starting MindConnect frontend on http://localhost:5500 ...
start "MindConnect Frontend" /D "%ROOT%" "%NODE_EXE%" "tools\static-server.js"

timeout /t 1 /nobreak >nul
start "" "http://localhost:5500/index.html"

echo.
echo MindConnect is opening in your browser.
echo Keep the Backend and Frontend windows open while using the app.
pause
