#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts the Vercel Deployment Monitor Agent

.DESCRIPTION
    This script starts the deployment monitoring agent that watches
    Vercel deployments for errors and generates fix reports.

.PARAMETER Background
    Run the monitor in a background PowerShell window

.EXAMPLE
    .\start-deployment-monitor.ps1
    Starts the monitor in the current window

.EXAMPLE
    .\start-deployment-monitor.ps1 -Background
    Starts the monitor in a background window
#>

param(
    [switch]$Background
)

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  Vercel Deployment Monitor Agent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if VERCEL_TOKEN is set
if (-not $env:VERCEL_TOKEN) {
    # Try loading from .env.local
    if (Test-Path ".env.local") {
        Write-Host "[INFO] Loading environment from .env.local" -ForegroundColor Yellow
        Get-Content ".env.local" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $name = $matches[1]
                $value = $matches[2].Trim('"')
                Set-Item -Path "env:$name" -Value $value
            }
        }
        Write-Host ""
    }
    
    # Check again
    if (-not $env:VERCEL_TOKEN) {
        Write-Host "[ERROR] VERCEL_TOKEN environment variable not set!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please set your Vercel token:" -ForegroundColor Yellow
        Write-Host "  1. Go to https://vercel.com/account/tokens"
        Write-Host "  2. Create a new token"
        Write-Host "  3. Set environment variable:"
        Write-Host ""
        Write-Host '     $env:VERCEL_TOKEN="your_token_here"' -ForegroundColor Green
        Write-Host ""
        Write-Host "  Or add to .env.local file"
        Write-Host ""
        pause
        exit 1
    }
}

Write-Host "[OK] VERCEL_TOKEN is configured" -ForegroundColor Green
Write-Host ""

# Check if node is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found! Please install Node.js" -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "[OK] Node.js found" -ForegroundColor Green
Write-Host ""

# Check if deployment-monitor.js exists
if (-not (Test-Path "deployment-monitor.js")) {
    Write-Host "[ERROR] deployment-monitor.js not found!" -ForegroundColor Red
    Write-Host "  Please run this script from the project root directory" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

if ($Background) {
    Write-Host "[INFO] Starting monitor in background window..." -ForegroundColor Yellow
    Write-Host ""
    
    Start-Process powershell -ArgumentList `
        "-NoExit", `
        "-Command", `
        "`$env:VERCEL_TOKEN='$env:VERCEL_TOKEN'; node deployment-monitor.js" `
        -WindowStyle Normal
    
    Write-Host "[OK] Monitor started in background" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Starting deployment monitor..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "----------------------------------------"
    Write-Host ""
    
    node deployment-monitor.js
    
    Write-Host ""
    Write-Host "Monitor stopped." -ForegroundColor Yellow
}



