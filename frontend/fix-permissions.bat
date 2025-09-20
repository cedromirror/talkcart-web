@echo off
echo Fixing Next.js permissions...

REM Stop Node processes
taskkill /f /im node.exe >nul 2>&1

REM Remove .next directory
if exist ".next" (
    rmdir /s /q ".next"
    echo Removed .next directory
)

REM Clear npm cache
npm cache clean --force >nul 2>&1
echo Cleared npm cache

REM Set environment variables
set NEXT_TELEMETRY_DISABLED=1
set NODE_OPTIONS=--max-old-space-size=4096

echo Environment variables set
echo You can now run 'npm run dev' safely
pause