# Add portable Node directory to current PowerShell session PATH and run dev server
$env:PATH = "$env:LOCALAPPDATA\Programs\node;" + $env:PATH
Write-Host "Node version: $(node -v)" -ForegroundColor Green
Write-Host "NPM version: $(npm -v)" -ForegroundColor Green
Write-Host "Starting Vite development server..." -ForegroundColor Cyan
npm run dev
