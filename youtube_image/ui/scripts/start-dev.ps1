# 안전한 개발 서버 시작 스크립트 (Windows PowerShell)
# 백그라운드에서 실행되며 로그를 파일에 저장합니다

Write-Host "🚀 Starting development server in background..." -ForegroundColor Green

# 기존 프로세스 종료
Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.MainWindowTitle -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 로그 디렉토리 생성
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 백그라운드로 개발 서버 시작
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1 | Tee-Object -FilePath "logs/dev-server.log"
}

# Job ID 저장
$job.Id | Out-File -FilePath "logs/dev-server.pid"

Start-Sleep -Seconds 3

# 서버 상태 확인
if ($job.State -eq "Running") {
    Write-Host "✅ Development server started successfully!" -ForegroundColor Green
    Write-Host "📝 Job ID: $($job.Id)" -ForegroundColor Cyan
    Write-Host "📋 Logs: Get-Content logs/dev-server.log -Wait" -ForegroundColor Yellow
    Write-Host "🌐 URL: http://localhost:3000" -ForegroundColor Blue
    Write-Host ""
    Write-Host "⚠️  To stop the server, run: .\scripts\stop-dev.ps1" -ForegroundColor Yellow
    Write-Host "⚠️  Or use: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to start development server" -ForegroundColor Red
    Write-Host "📋 Check logs: Get-Content logs/dev-server.log" -ForegroundColor Yellow
    $job | Remove-Job -Force
    exit 1
}
