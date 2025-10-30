import { Router } from 'express';
import { authenticate, requireRole, requireApprovedCandidate } from '../middleware/auth.js';
import { 
  candidateMe, 
  getCandidateUpdateHistory, 
  updateCandidateProfile, 
  changeCandidatePassword 
} from '../controllers/auth.controller.js';

const router = Router();

router.use(authenticate, requireRole('candidate'), requireApprovedCandidate);

router.get('/me', candidateMe);
router.get('/update-history', getCandidateUpdateHistory);
router.put('/profile', updateCandidateProfile);
router.patch('/password', changeCandidatePassword);

export default router;


