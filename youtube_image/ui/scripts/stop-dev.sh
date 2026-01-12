#!/bin/bash

# 개발 서버 중지 스크립트

echo "🛑 Stopping development server..."

if [ -f logs/dev-server.pid ]; then
    PID=$(cat logs/dev-server.pid)
    
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo "✅ Development server stopped (PID: $PID)"
        rm logs/dev-server.pid
    else
        echo "⚠️  No running server found with PID: $PID"
        rm logs/dev-server.pid
    fi
else
    echo "⚠️  PID file not found. Trying to kill all vite processes..."
    pkill -f "vite" && echo "✅ All vite processes stopped" || echo "ℹ️  No vite processes found"
fi
