import { Router } from 'express';
import { authenticate, requireRole, requireApprovedEmployer } from '../middleware/auth.js';
import {
  addCandidate,
  verifyCandidate,
  listCandidates,
  listAllCandidates,
  searchCandidates,
  employerMetrics,
  employerReports,
  employerProfile,
  updateEmployerProfile,
} from '../controllers/employer.controller.js';

const router = Router();

router.use(authenticate, requireRole('employer'), requireApprovedEmployer);

router.post('/candidates', addCandidate);

router.get('/verify', verifyCandidate);
router.get('/candidates', listCandidates);
router.get('/candidates/all', listAllCandidates);
router.get('/candidates/search', searchCandidates);
router.get('/metrics', employerMetrics);
router.get('/reports', employerReports);
router.get('/profile', employerProfile);
router.put('/profile', updateEmployerProfile);

export default router;