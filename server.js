import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import employerRoutes from './routes/employer.routes.js';
import reportRoutes from './routes/report.routes.js';
import candidateRoutes from './routes/candidate.routes.js';
import contactRoutes from './routes/contact.routes.js';
import blogRoutes from './routes/blog.routes.js';
import { connectDB } from './config/db.js';

dotenv.config();
await connectDB();

const app = express();

// ⭐ Correct CORS
const allowedOrigins = [
  "https://www.red-flagged.com",
  "https://red-flagged.com",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  })
);

// Handle preflight
app.options("*", cors());

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api', reportRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api', contactRoutes);
app.use('/api/blogs', blogRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Red-Flagged Backend',
    status: 'online',
    version: '1.0.0'
  });
});

const DEFAULT_PORT = Number(process.env.PORT) || 3001;

app.listen(DEFAULT_PORT, () => {
  console.log(`Red-Flagged API running at http://localhost:${DEFAULT_PORT}`);
});

export default app;
