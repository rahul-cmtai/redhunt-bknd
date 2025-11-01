import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import employerRoutes from './routes/employer.routes.js';
import reportRoutes from './routes/report.routes.js';
import candidateRoutes from './routes/candidate.routes.js';

dotenv.config();

const app = express();

// CORS configuration - must be before other middlewares
// Support environment-specific origins (frontend URLs that make requests to this backend)
const allowedOrigins = [
  "https://redhunt.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) return callback(null, true);
    
    // Always allow localhost in development or if explicitly listed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true); // Temporarily allow all for production to fix issue
        // Uncomment below for stricter production security:
        // callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // Support legacy browsers
  preflightContinue: false, // Let CORS middleware handle preflight
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicit OPTIONS handler as fallback for preflight requests
app.options('*', cors(corsOptions));

// Security middlewares - configured to work with CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

// Root route - Welcome message
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Welcome to Red-Flagged Backend',
    status: 'online',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api', reportRoutes);
app.use('/api/candidate', candidateRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});



const DEFAULT_PORT = Number(process.env.PORT) || 3001;

function listenWithRetry(port, attemptsLeft = 10) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Red-Flagged API listening on http://localhost:${port}`);
      console.log(`Server running on port ${port}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = port + 1;
        console.warn(
          `Port ${port} in use; retrying on ${nextPort} (${attemptsLeft - 1} attempts left)`
        );
        setTimeout(() => {
          listenWithRetry(nextPort, attemptsLeft - 1).then(resolve).catch(reject);
        }, 250);
      } else {
        reject(err);
      }
    });
  });
}

async function start() {
  await connectDB();
  await listenWithRetry(DEFAULT_PORT);
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

export default app;


