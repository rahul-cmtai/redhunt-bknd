import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import employerRoutes from "./routes/employer.routes.js";
import reportRoutes from "./routes/report.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();

// ✅ Use CORS middleware FIRST — before anything else
const allowedOrigins = [
  "https://redhunt.vercel.app",
  "http://localhost:3000",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // ✅ Handle OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// ✅ Connect DB safely (non-blocking)
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/employer", employerRoutes);
app.use("/api", reportRoutes);
app.use("/api/candidate", candidateRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "RedHunt backend running fine" });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to Red-Flagged Backend",
    status: "online",
    version: "1.0.1",
  });
});

// ✅ Default export for Vercel serverless function
export default app;

// ✅ Local dev server (only runs when not in Vercel)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}
