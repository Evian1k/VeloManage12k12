#!/bin/bash

echo "🚀 Starting AutoCare Pro Application..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "📦 Starting MongoDB..."
    sudo mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db
    sleep 2
fi

# Start backend server in background
echo "🔧 Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server is running on http://localhost:3001"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend server
echo "🎨 Starting Frontend Server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check if frontend is running
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend server is running on http://localhost:5173"
else
    echo "❌ Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 AutoCare Pro is now running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3001"
echo "💾 Health:   http://localhost:3001/health"
echo ""
echo "🔐 Admin Login:"
echo "   Email:    emmanuel.evian@autocare.com"
echo "   Password: autocarpro12k@12k.wwc"
echo ""
echo "👤 Sample User Login:"
echo "   Email:    user@demo.com"
echo "   Password: password123"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for user to stop
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ Servers stopped"; exit 0' INT

wait