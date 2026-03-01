# Start both Frontend and Backend servers
# Maintenix AI - Predictive Maintenance Dashboard

Write-Host "=== Starting Maintenix AI Servers ===" -ForegroundColor Cyan
Write-Host ""

# Start Backend (FastAPI)
Write-Host "Starting Backend API server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\python_backend'; python main.py" -WindowStyle Normal

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend (Vite)
Write-Host "Starting Frontend development server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✓ Both servers are starting in separate windows" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend:    http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Wait 10-15 seconds for servers to fully start, then:" -ForegroundColor Yellow
Write-Host "  Open http://localhost:8080/dashboard in your browser" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

