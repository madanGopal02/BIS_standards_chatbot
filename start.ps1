# =============================================================================
# BIS Standards AI - start both dev servers
#
#   .\start.ps1            start backend (:8000) + frontend (:5173)
#   .\start.ps1 -Stop      stop both
#
# The browser only ever talks to the Vite dev server on :5173.
# Vite proxies /api -> http://127.0.0.1:8000, so no CORS and no API key in
# the browser.
# =============================================================================

param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$py      = Join-Path $backend 'venv\Scripts\python.exe'

function Stop-Port([int]$port, [string]$label) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conn) { Write-Host "$label : nothing listening on $port" -ForegroundColor DarkGray; return }
    foreach ($c in $conn) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($c.OwningProcess)" -ErrorAction SilentlyContinue
        # Never touch the agent runtime that happens to be a node process.
        if ($proc -and $proc.Name -eq 'node.exe' -and $proc.CommandLine -match 'minimax') {
            Write-Host "$label : skipped (agent runtime pid=$($c.OwningProcess))" -ForegroundColor Yellow
            continue
        }
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "$label : stopped pid=$($c.OwningProcess)" -ForegroundColor Yellow
    }
}

function Wait-Port([int]$port, [int]$seconds = 30) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

Stop-Port 8000 'backend'
Stop-Port 5173 'frontend'
if ($Stop) { Write-Host "`nBoth servers stopped." -ForegroundColor Cyan; return }
Start-Sleep -Seconds 1

if (-not (Test-Path $py)) {
    Write-Host "venv not found at $py - create it first:  python -m venv backend\venv" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting backend (:8000) ..." -ForegroundColor Cyan
$be = Start-Process -FilePath $py `
    -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000' `
    -WorkingDirectory $backend `
    -RedirectStandardOutput (Join-Path $backend 'uvicorn.log') `
    -RedirectStandardError  (Join-Path $backend 'uvicorn.err.log') `
    -WindowStyle Hidden -PassThru

Write-Host "Starting frontend (:5173) ..." -ForegroundColor Cyan
$fe = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', 'npm run dev' `
    -WorkingDirectory $frontend `
    -RedirectStandardOutput (Join-Path $frontend 'vite.log') `
    -RedirectStandardError  (Join-Path $frontend 'vite.err.log') `
    -WindowStyle Hidden -PassThru

$okBackend  = Wait-Port 8000
$okFrontend = Wait-Port 5173

Write-Host ""
if ($okBackend) {
    Write-Host "backend  READY  http://127.0.0.1:8000   (docs: /docs)" -ForegroundColor Green
} else {
    Write-Host "backend  FAILED - see backend\uvicorn.err.log" -ForegroundColor Red
}
if ($okFrontend) {
    Write-Host "frontend READY  http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "frontend FAILED - see frontend\vite.err.log" -ForegroundColor Red
}

if ($okBackend -and $okFrontend) {
    Write-Host "`nHealth check:  (Invoke-RestMethod http://localhost:5173/api/health).model" -ForegroundColor DarkGray
}
