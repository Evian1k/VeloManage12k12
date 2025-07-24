#!/bin/bash

# AutoCare Pro Setup Script
# This script sets up the complete AutoCare Pro system

set -e

echo "🚗 AutoCare Pro - Complete Setup Script"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MongoDB is available (optional)
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed"
else
    echo "⚠️  MongoDB not found locally. Make sure you have MongoDB Atlas connection string ready."
fi

echo ""
echo "📦 Installing Frontend Dependencies..."
echo "======================================"

# Install frontend dependencies
npm install

echo ""
echo "📦 Installing Backend Dependencies..."
echo "===================================="

# Navigate to backend and install dependencies
cd backend
npm install

echo ""
echo "🔧 Setting up Environment Variables..."
echo "======================================"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating backend .env file..."
    cat > .env << EOL
# AutoCare Pro Backend Configuration

# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/autocare-pro

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_PASSWORD=autocarpro12k@12k.wwc

# Email Configuration (Optional - for notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@autocare.com

# SMS Configuration (Optional - Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Payment Configuration (Optional - Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=info
EOL
    echo "✅ Created .env file with default configuration"
else
    echo "✅ .env file already exists"
fi

# Go back to root directory
cd ..

# Create frontend .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    cat > .env << EOL
# AutoCare Pro Frontend Configuration

# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001

# App Configuration
VITE_APP_NAME=AutoCare Pro
VITE_APP_VERSION=1.0.0

# Features Configuration
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_GPS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_CHAT=true

# Maps Configuration (Optional)
VITE_GOOGLE_MAPS_API_KEY=
VITE_MAPBOX_ACCESS_TOKEN=

# Analytics Configuration (Optional)
VITE_GOOGLE_ANALYTICS_ID=
EOL
    echo "✅ Created frontend .env file with default configuration"
else
    echo "✅ Frontend .env file already exists"
fi

echo ""
echo "🗂️  Creating Directory Structure..."
echo "=================================="

# Create necessary directories
mkdir -p backend/uploads/vehicles
mkdir -p backend/uploads/services
mkdir -p backend/uploads/incidents
mkdir -p backend/uploads/documents
mkdir -p backend/logs
mkdir -p public/images
mkdir -p public/icons

echo "✅ Directory structure created"

echo ""
echo "🔧 Setting up Database..."
echo "========================"

# Check if MongoDB is running and initialize database
cd backend

if command -v mongod &> /dev/null; then
    echo "Initializing database with sample data..."
    node scripts/init-database.js || echo "⚠️  Database initialization failed. You may need to set up MongoDB connection first."
else
    echo "⚠️  MongoDB not found. Please run 'node scripts/init-database.js' after setting up MongoDB connection."
fi

cd ..

echo ""
echo "🎨 Setting up Frontend Assets..."
echo "==============================="

# Create a simple favicon if it doesn't exist
if [ ! -f public/favicon.ico ]; then
    echo "Creating default favicon..."
    # This would typically be a proper favicon file
    touch public/favicon.ico
fi

# Create PWA manifest
if [ ! -f public/manifest.json ]; then
    echo "Creating PWA manifest..."
    cat > public/manifest.json << EOL
{
  "name": "AutoCare Pro",
  "short_name": "AutoCare",
  "description": "Professional automotive service and fleet management system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOL
    echo "✅ PWA manifest created"
fi

echo ""
echo "📝 Creating Run Scripts..."
echo "========================="

# Create development script
cat > dev.sh << EOL
#!/bin/bash

# AutoCare Pro Development Script

echo "🚗 Starting AutoCare Pro Development Environment..."

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down AutoCare Pro..."
    kill \$(jobs -p) 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "🔧 Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=\$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "🎨 Starting Frontend Development Server..."
cd .. && npm run dev &
FRONTEND_PID=\$!

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
EOL

chmod +x dev.sh

# Create production build script
cat > build.sh << EOL
#!/bin/bash

# AutoCare Pro Production Build Script

echo "🚗 Building AutoCare Pro for Production..."

echo "📦 Building Frontend..."
npm run build

echo "📦 Preparing Backend..."
cd backend
npm install --production

echo "✅ Build completed!"
echo ""
echo "📋 Deployment Instructions:"
echo "1. Upload the 'dist' folder contents to your web server"
echo "2. Upload the 'backend' folder to your server"
echo "3. Set up environment variables on your server"
echo "4. Start the backend server: npm start"
echo "5. Configure your web server to serve the frontend and proxy API requests"
EOL

chmod +x build.sh

echo ""
echo "🔍 Running System Check..."
echo "========================="

# Check if all required packages are installed
echo "Checking frontend dependencies..."
if npm list --depth=0 > /dev/null 2>&1; then
    echo "✅ Frontend dependencies are properly installed"
else
    echo "⚠️  Some frontend dependencies may be missing"
fi

echo "Checking backend dependencies..."
cd backend
if npm list --depth=0 > /dev/null 2>&1; then
    echo "✅ Backend dependencies are properly installed"
else
    echo "⚠️  Some backend dependencies may be missing"
fi
cd ..

echo ""
echo "🎉 AutoCare Pro Setup Complete!"
echo "==============================="
echo ""
echo "🚀 Quick Start:"
echo "   1. Start development: ./dev.sh"
echo "   2. Build for production: ./build.sh"
echo ""
echo "📚 Important Information:"
echo "   • Frontend runs on: http://localhost:5173"
echo "   • Backend runs on: http://localhost:3001"
echo "   • Database: MongoDB (configure in backend/.env)"
echo ""
echo "👤 Default Admin Account:"
echo "   Email: emmanuel.evian@autocare.com"
echo "   Password: autocarpro12k@12k.wwc"
echo ""
echo "🛠️  Configuration:"
echo "   • Frontend config: .env"
echo "   • Backend config: backend/.env"
echo "   • Update MongoDB connection string in backend/.env"
echo ""
echo "📖 Documentation:"
echo "   • README.md - Project overview"
echo "   • backend/README.md - Backend API documentation"
echo "   • Check /docs folder for additional documentation"
echo ""
echo "🆘 Need Help?"
echo "   • Check the logs in backend/logs/"
echo "   • Ensure MongoDB is running and accessible"
echo "   • Verify all environment variables are set correctly"
echo ""
echo "Happy coding! 🎯"