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

app.use(
  cors({
    origin: ["https://www.red-flagged.com/","red-flagged.com", "http://localhost:3000"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH","OPTIONS"],
    credentials: true,
  })
);
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


// Root route - Welcome message
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Welcome to Red-Flagged Backend',
    status: 'online',
    version: '1.0.0'
  });
});

const DEFAULT_PORT = Number(process.env.PORT) || 3001;


app.listen(DEFAULT_PORT, () => {
  console.log(`Red-Flagged API listening on http://localhost:${DEFAULT_PORT}`);
  console.log(`Server running on port ${DEFAULT_PORT}`);
});

export default app;


