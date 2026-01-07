#!/bin/bash

# 안전한 개발 서버 시작 스크립트
# 백그라운드에서 실행되며 로그를 파일에 저장합니다

echo "🚀 Starting development server in background..."

# 기존 프로세스 종료
pkill -f "vite" 2>/dev/null || true

# 로그 디렉토리 생성
mkdir -p logs

# 백그라운드로 개발 서버 시작
nohup npm run dev > logs/dev-server.log 2>&1 &

# 프로세스 ID 저장
echo $! > logs/dev-server.pid

sleep 2

# 서버 상태 확인
if ps -p $(cat logs/dev-server.pid) > /dev/null 2>&1; then
    echo "✅ Development server started successfully!"
    echo "📝 PID: $(cat logs/dev-server.pid)"
    echo "📋 Logs: tail -f logs/dev-server.log"
    echo "🌐 URL: http://localhost:3000"
    echo ""
    echo "⚠️  To stop the server, run: ./scripts/stop-dev.sh"
else
    echo "❌ Failed to start development server"
    echo "📋 Check logs: cat logs/dev-server.log"
    exit 1
fi
