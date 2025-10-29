import jwt from 'jsonwebtoken';
import Employer from '../models/Employer.js';
import CandidateUser from '../models/CandidateUser.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded; // { id, role }
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export async function requireApprovedEmployer(req, res, next) {
  if (!req.user || req.user.role !== 'employer') return res.status(403).json({ message: 'Forbidden' });
  try {
    const employer = await Employer.findById(req.user.id).select('status');
    if (!employer) return res.status(401).json({ message: 'Unauthorized' });
    if (employer.status !== 'approved') {
      return res.status(403).json({ message: `Account ${employer.status}` });
    }
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function requireApprovedCandidate(req, res, next) {
  if (!req.user || req.user.role !== 'candidate') return res.status(403).json({ message: 'Forbidden' });
  try {
    const candidate = await CandidateUser.findById(req.user.id).select('status');
    if (!candidate) return res.status(401).json({ message: 'Unauthorized' });
    if (candidate.status !== 'approved') {
      return res.status(403).json({ message: `Account ${candidate.status}` });
    }
    next();
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
}


