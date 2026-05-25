import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes         from './routes/authRoutes.js';
import vehicleRoutes      from './routes/vehicleRoutes.js';
import customerRoutes     from './routes/customerRoutes.js';
import rentalRoutes       from './routes/rentalRoutes.js';
import hirePurchaseRoutes from './routes/hirePurchaseRoutes.js';
import paymentRoutes      from './routes/paymentRoutes.js';
import maintenanceRoutes  from './routes/maintenanceRoutes.js';
import analyticsRoutes    from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import errorHandler       from './middleware/errorHandler.js';
import { connectDB }      from './config/db.js';

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    // Allow any Vercel deployment URL
    if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Allow same local network IPs for mobile testing
    if (origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'FleetOS API is running', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.use('/api/auth',          authRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/customers',     customerRoutes);
app.use('/api/rentals',       rentalRoutes);
app.use('/api/hire-purchase', hirePurchaseRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/maintenance',   maintenanceRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 FleetOS Server running on port ${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Health: http://localhost:${PORT}/health\n`);
    });
  } catch(err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
export default app;
