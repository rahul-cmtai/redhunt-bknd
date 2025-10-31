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

// Security middlewares
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(morgan('dev'));
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

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


