@echo off
REM Deployment Monitor Startup Script for Windows

echo.
echo ========================================
echo   Vercel Deployment Monitor Agent
echo ========================================
echo.

REM Check if VERCEL_TOKEN is set
if "%VERCEL_TOKEN%"=="" (
    echo [ERROR] VERCEL_TOKEN environment variable not set!
    echo.
    echo Please set your Vercel token:
    echo   1. Go to https://vercel.com/account/tokens
    echo   2. Create a new token
    echo   3. Set environment variable:
    echo.
    echo      set VERCEL_TOKEN=your_token_here
    echo.
    echo   Or add to .env.local file
    echo.
    pause
    exit /b 1
)

echo [OK] VERCEL_TOKEN is configured
echo.

REM Check if node is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js
    echo   Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

REM Load environment variables from .env.local if it exists
if exist .env.local (
    echo [INFO] Loading environment from .env.local
    for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do (
        set "%%a=%%b"
    )
    echo.
)

echo Starting deployment monitor...
echo Press Ctrl+C to stop monitoring
echo.
echo ----------------------------------------
echo.

node deployment-monitor.js

echo.
echo Monitor stopped.
pause

