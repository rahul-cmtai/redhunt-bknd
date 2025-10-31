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
  updateCandidateUserByEmployer,
  updateCandidateUserHistoryByEmployer,
  deleteCandidateUserHistoryByEmployer,
  getCandidateUserUpdateHistoryByEmployer,
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

// Update verified candidate user (limited fields) by employer and record history
router.patch('/candidate-users/:id', updateCandidateUserByEmployer);
// Manage employer-created update history entries
router.patch('/candidate-users/:id/update-history/:entryId', updateCandidateUserHistoryByEmployer);
router.delete('/candidate-users/:id/update-history/:entryId', deleteCandidateUserHistoryByEmployer);
// Read candidate user's update history (read-only; includes comments)
router.get('/candidate-users/:id/update-history', getCandidateUserUpdateHistoryByEmployer);

export default router;