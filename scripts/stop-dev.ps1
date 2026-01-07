# 개발 서버 중지 스크립트 (Windows PowerShell)

Write-Host "🛑 Stopping development server..." -ForegroundColor Yellow

if (Test-Path "logs/dev-server.pid") {
    $jobId = Get-Content "logs/dev-server.pid"
    
    $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
    
    if ($job) {
        Stop-Job -Id $jobId
        Remove-Job -Id $jobId -Force
        Write-Host "✅ Development server stopped (Job ID: $jobId)" -ForegroundColor Green
        Remove-Item "logs/dev-server.pid"
    } else {
        Write-Host "⚠️  No running job found with ID: $jobId" -ForegroundColor Yellow
        Remove-Item "logs/dev-server.pid"
    }
} else {
    Write-Host "⚠️  PID file not found. Trying to kill all node processes..." -ForegroundColor Yellow
    $processes = Get-Process | Where-Object { $_.ProcessName -eq "node" }
    if ($processes) {
        $processes | Stop-Process -Force
        Write-Host "✅ All node processes stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No node processes found" -ForegroundColor Cyan
    }
}

# 모든 PowerShell Jobs 정리
Write-Host ""
Write-Host "Cleaning up all PowerShell background jobs..." -ForegroundColor Cyan
Get-Job | Remove-Job -Force
Write-Host "✅ All jobs cleaned up" -ForegroundColor Green
