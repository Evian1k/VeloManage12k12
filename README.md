# AutoCare Pro 🚗

A **complete, real-time, production-ready, full-stack automotive service and fleet management system** that solves real-world problems like inefficient vehicle maintenance, poor service tracking, lost customer trust, and lack of digital oversight.

## 🌟 Features Overview

AutoCare Pro is a comprehensive SaaS solution designed for car garages, fleet managers, and vehicle owners, providing:

### 🚗 **Vehicle Management**
- Complete vehicle profiles with maintenance tracking
- Automated 3,000km service reminders
- QR code-based vehicle check-in system
- GPS location tracking for fleet vehicles
- Comprehensive maintenance scheduling
- Digital vehicle documents storage

### 🔧 **Service Management**
- Real-time service request tracking
- Technician assignment and scheduling
- Image/video upload for service documentation
- Quality inspection checklists
- Customer feedback and rating system
- Service history and analytics

### 📱 **Incident Reporting**
- Comprehensive incident documentation
- Photo/video evidence collection
- Insurance claim integration
- Damage assessment tools
- Investigation workflow management
- Emergency response coordination

### 💰 **Financial Management**
- Professional invoice generation
- Multiple payment methods (Stripe, M-Pesa)
- Automated payment reminders
- PDF receipt generation
- Financial reporting and analytics
- Tax calculation and management

### 🔔 **Real-Time Communication**
- WebSocket-based live updates
- Push notifications for all stakeholders
- In-app messaging system
- Email and SMS notifications
- Sound alerts for urgent updates
- Multi-channel communication

### 👥 **Role-Based Access Control**
- **Customers**: Vehicle management, service requests, incident reporting
- **Staff/Technicians**: Service management, progress updates, communication
- **Admins**: Complete system oversight, analytics, user management
- **Fleet Managers**: Multi-vehicle oversight, maintenance scheduling

### 📊 **Analytics & Reports**
- Comprehensive dashboard with key metrics
- Service trends and performance analytics
- Customer satisfaction tracking
- Financial reporting and insights
- Maintenance prediction algorithms
- Exportable PDF reports

## 🛠 Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for modern, responsive design
- **Framer Motion** for smooth animations
- **Radix UI** for accessible components
- **Socket.IO Client** for real-time updates
- **React Router** for navigation
- **PWA** capabilities for offline use

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** for secure authentication
- **bcrypt** for password hashing
- **Multer** for file uploads
- **Express Rate Limit** for API protection
- **Helmet** for security headers

### Additional Services
- **Stripe** for payment processing
- **Twilio** for SMS notifications
- **Nodemailer** for email services
- **Puppeteer** for PDF generation
- **Sharp** for image processing
- **QR Code** generation for vehicle check-ins

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### One-Command Setup

```bash
# Clone and setup the complete system
git clone <repository-url>
cd autocare-pro
chmod +x setup.sh
./setup.sh
```

### Manual Installation

1. **Install Dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
cd ..
```

2. **Environment Configuration**
```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env

# Update MongoDB connection and other settings
nano backend/.env
```

3. **Database Setup**
```bash
cd backend
node scripts/init-database.js
cd ..
```

4. **Start Development**
```bash
# Start both frontend and backend
./dev.sh

# Or start individually
# Frontend: npm run dev
# Backend: cd backend && npm run dev
```

## 🔧 Configuration

### Backend Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/autocare-pro

# JWT Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Payment Processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Notifications
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend Environment Variables
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_GPS=true
VITE_ENABLE_NOTIFICATIONS=true
```

## 👤 Default Admin Accounts

The system comes with 5 pre-configured admin accounts:

1. **Emmanuel Evian** (Main Admin) - `emmanuel.evian@autocare.com`
2. **Ibrahim Mohamud** - `ibrahim.mohamud@autocare.com`
3. **Joel Ng'ang'a** - `joel.nganga@autocare.com`
4. **Patience Karanja** - `patience.karanja@autocare.com`
5. **Joyrose Kinuthia** - `joyrose.kinuthia@autocare.com`

**Password for all admins**: `autocarpro12k@12k.wwc`

## 📱 User Guide

### For Customers
1. **Register/Login** with email and password
2. **Add Vehicles** with complete details and photos
3. **Request Services** with problem descriptions and images
4. **Track Progress** in real-time with notifications
5. **Report Incidents** with GPS location and evidence
6. **Manage Payments** and download invoices
7. **Rate Services** and provide feedback

### For Technicians/Staff
1. **Login** with staff credentials
2. **View Assigned Services** on dashboard
3. **Update Service Status** with progress notes
4. **Upload Work Photos** and documentation
5. **Communicate** with customers via messaging
6. **Complete Quality Checks** before service completion
7. **Generate Service Reports** and invoices

### For Admins
1. **Login** with admin credentials
2. **Manage All Services** and assignments
3. **Oversee Fleet Operations** with GPS tracking
4. **Handle Incidents** and investigations
5. **Monitor Analytics** and performance metrics
6. **Manage Users** and permissions
7. **Configure System** settings and notifications

## 🏗 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Vite)  │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • User Interface│    │ • REST APIs     │    │ • User Data     │
│ • Real-time UI  │    │ • WebSocket     │    │ • Vehicles      │
│ • PWA Support   │    │ • Authentication│    │ • Services      │
│ • Offline Mode  │    │ • File Upload   │    │ • Incidents     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         ▼                       ▼                       
┌─────────────────┐    ┌─────────────────┐              
│   External      │    │   Notifications │              
│   Services      │    │   (Email/SMS)   │              
│                 │    │                 │              
│ • Stripe Pay    │    │ • Real-time     │              
│ • SMS (Twilio)  │    │ • Push Notify   │              
│ • Email Service │    │ • Sound Alerts  │              
└─────────────────┘    └─────────────────┘              
```

## 📊 Database Schema

### Core Models
- **Users**: Customer and staff management
- **Vehicles**: Complete vehicle profiles
- **Services**: Service request lifecycle
- **Incidents**: Incident reporting and tracking
- **Invoices**: Financial transactions
- **Messages**: Communication logs
- **Branches**: Service center locations
- **Analytics**: Performance metrics

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Role-based Access Control** (RBAC)
- **Password Hashing** with bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** for API security
- **Helmet.js** for HTTP headers security
- **File Upload Validation** with size limits
- **Audit Logging** for all actions

## 🚀 Deployment

### Development
```bash
./dev.sh
```

### Production Build
```bash
./build.sh
```

### Docker Deployment
```bash
# Coming soon - Docker compose setup
docker-compose up -d
```

### Cloud Deployment
The system is ready for deployment on:
- **Render** (recommended)
- **Railway**
- **Heroku**
- **AWS/Azure/GCP**
- **DigitalOcean**

## 📈 Performance Features

- **Real-time Updates** via WebSockets
- **Optimized Database** queries with indexing
- **Image Compression** for faster uploads
- **Lazy Loading** for better UX
- **Caching Strategies** for API responses
- **Progressive Web App** for mobile performance
- **Bundle Optimization** with Vite

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
npm run test

# E2E tests
npm run test:e2e
```

## 📖 API Documentation

The system provides comprehensive API documentation:
- **REST Endpoints**: `/api/v1/*`
- **WebSocket Events**: Real-time communication
- **Authentication**: JWT-based security
- **File Uploads**: Multipart form support

Visit `http://localhost:3001/api/v1` when running locally for API overview.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### Common Issues

1. **MongoDB Connection**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Start MongoDB
   sudo systemctl start mongod
   ```

2. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3001
   lsof -i :5173
   ```

3. **Dependencies Issues**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

### Getting Help
- 📧 Email: support@autocare.com
- 💬 Discord: [AutoCare Community](https://discord.gg/autocare)
- 📖 Documentation: `/docs` folder
- 🐛 Issues: GitHub Issues tab

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core vehicle management
- ✅ Service request system
- ✅ Real-time notifications
- ✅ Basic analytics

### Phase 2 (Q2 2024)
- 🔄 AI-powered diagnostics
- 🔄 Advanced analytics
- 🔄 Mobile app (React Native)
- 🔄 Multi-language support

### Phase 3 (Q3 2024)
- 🔄 IoT integration
- 🔄 Predictive maintenance
- 🔄 Advanced reporting
- 🔄 Third-party integrations

## 🏆 Why AutoCare Pro?

✅ **Complete Solution** - Everything needed for automotive service management  
✅ **Real-time Updates** - Live tracking and notifications  
✅ **Mobile-First** - Responsive design for all devices  
✅ **Scalable** - Handles single garage to large fleet operations  
✅ **Secure** - Enterprise-grade security features  
✅ **Customizable** - Configurable for different business needs  
✅ **Well-Documented** - Comprehensive guides and API docs  
✅ **Production-Ready** - Built for real-world deployment  

---

**AutoCare Pro** - *Revolutionizing automotive service management, one vehicle at a time.* 🚗✨

