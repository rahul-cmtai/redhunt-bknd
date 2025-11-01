import jwt from "jsonwebtoken";
import Employer from "../models/Employer.js";
import CandidateUser from "../models/CandidateUser.js";

/**
 * ✅ Universal Authentication Middleware
 * Skips OPTIONS requests (for CORS preflight)
 * Verifies JWT token and attaches user info to req.user
 */
export function authenticate(req, res, next) {
  // 🔹 Skip authentication for preflight (CORS) requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.error("❌ JWT Error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * ✅ Role-Based Access Control Middleware
 * Allows access only to users with specified roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}

/**
 * ✅ Employer Approval Middleware
 * Ensures employer is authenticated, role = employer, and status = approved
 */
export async function requireApprovedEmployer(req, res, next) {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  if (!req.user || req.user.role !== "employer") {
    return res.status(403).json({ message: "Forbidden: employer only" });
  }

  try {
    const employer = await Employer.findById(req.user.id).select("status");

    if (!employer) {
      return res.status(401).json({ message: "Unauthorized employer" });
    }

    if (employer.status !== "approved") {
      return res.status(403).json({ message: `Account ${employer.status}` });
    }

    next();
  } catch (err) {
    console.error("❌ requireApprovedEmployer error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * ✅ Candidate Approval Middleware
 * Ensures candidate is authenticated, role = candidate, and status = approved
 */
export async function requireApprovedCandidate(req, res, next) {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  if (!req.user || req.user.role !== "candidate") {
    return res.status(403).json({ message: "Forbidden: candidate only" });
  }

  try {
    const candidate = await CandidateUser.findById(req.user.id).select("status");

    if (!candidate) {
      return res.status(401).json({ message: "Unauthorized candidate" });
    }

    if (candidate.status !== "approved") {
      return res.status(403).json({ message: `Account ${candidate.status}` });
    }

    next();
  } catch (err) {
    console.error("❌ requireApprovedCandidate error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
}
