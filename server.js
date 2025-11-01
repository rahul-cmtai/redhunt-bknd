import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import employerRoutes from './routes/employer.routes.js';
import reportRoutes from './routes/report.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import { connectDB } from './config/db.js';

dotenv.config();
await connectDB();

const app = express();

// ✅ CORS Configuration (Fix for Vercel Deployment)
const allowedOrigins = [
  'http://localhost:3000',
  'https://redhunt.vercel.app',
  'https://www.redhunt.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for this origin'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// ✅ Handle preflight requests explicitly (important for Vercel)
app.options('*', cors());

// ✅ Middleware
app.use(express.json());

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api', reportRoutes);
app.use('/api/candidate', candidateRoutes);

// ✅ Health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

// ✅ Root route
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Red-Flagged Backend',
    status: 'online',
    version: '1.0.0',
  });
});

// ✅ Default port
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Red-Flagged API running on port ${PORT}`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
});

export default app;
