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
set "MINDCONNECT_NODE=%NODE_EXE%"
set "MINDCONNECT_BACKEND=%ROOT%backend"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:MINDCONNECT_NODE -ArgumentList 'src\index.js' -WorkingDirectory $env:MINDCONNECT_BACKEND -WindowStyle Hidden"

timeout /t 2 /nobreak >nul

echo Starting MindConnect frontend on http://localhost:5500 ...
set "MINDCONNECT_ROOT=%ROOT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:MINDCONNECT_NODE -ArgumentList 'tools\static-server.js' -WorkingDirectory $env:MINDCONNECT_ROOT -WindowStyle Hidden"

timeout /t 1 /nobreak >nul
start "" "http://localhost:5500/"

echo.
echo MindConnect is opening in your browser.
echo Backend and frontend are running in the background.
exit /b 0
