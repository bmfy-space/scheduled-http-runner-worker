#!/bin/bash

FRONTEND_PORT=5173
WORKER_PORT=8787

cleanup() {
  echo ""
  echo "🛑 正在停止服务..."
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null
  wait 2>/dev/null
  echo "✅ 已停止"
  exit 0
}
trap cleanup SIGINT SIGTERM

# 清理残留进程
kill $(lsof -ti:$FRONTEND_PORT 2>/dev/null) 2>/dev/null
kill $(lsof -ti:$WORKER_PORT 2>/dev/null) 2>/dev/null
sleep 1

echo "🚀 启动前后端服务..."
echo ""

# 启动 Worker (后端)
echo "▸ 启动 Cloudflare Worker (端口 $WORKER_PORT)..."
npx wrangler dev &
WORKER_PID=$!

# 等待 Worker 就绪
echo "  等待 Worker 就绪..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:$WORKER_PORT/api/health > /dev/null 2>&1; then
    echo "✅ Worker 就绪"
    break
  fi
  [ "$i" = "30" ] && echo "⚠️  Worker 启动超时，继续启动前端..."
  sleep 1
done

# 启动前端
echo "▸ 启动前端 (端口 $FRONTEND_PORT)..."
npx vite --host 127.0.0.1 &
DEV_PID=$!
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 服务已启动"
echo ""
echo "  前端:  http://127.0.0.1:$FRONTEND_PORT"
echo "  后端:  http://127.0.0.1:$WORKER_PORT"
echo "  登录令牌: 292922"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 等待退出
wait
