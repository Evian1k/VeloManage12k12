#!/bin/bash

# AutoCare Pro Development Script

echo "🚗 Starting AutoCare Pro Development Environment..."

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down AutoCare Pro..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "🔧 Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "🎨 Starting Frontend Development Server..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ AutoCare Pro is running:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/v1"
echo ""
echo "📧 Admin Login:"
echo "   Email: emmanuel.evian@autocare.com"
echo "   Password: autocarpro12k@12k.wwc"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait