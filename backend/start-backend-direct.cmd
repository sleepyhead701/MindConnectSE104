@echo off
setlocal

set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE_EXE%" (
  echo Node.js was not found at "%NODE_EXE%".
  echo Please install Node.js LTS or update NODE_EXE in this file.
  exit /b 1
)

cd /d "%~dp0"
echo Starting MindConnect backend with Node.js directly...
echo Press Ctrl+C to stop the backend.
"%NODE_EXE%" src\index.js
