import { Router } from 'express';
import { authenticate, requireRole, requireApprovedCandidate } from '../middleware/auth.js';
import { 
  candidateMe, 
  getCandidateUpdateHistory, 
  updateCandidateProfile, 
  changeCandidatePassword,
  addCandidateHistoryComment,
  deleteCandidateHistoryComment
} from '../controllers/auth.controller.js';

const router = Router();

router.use(authenticate, requireRole('candidate'), requireApprovedCandidate);

router.get('/me', candidateMe);
router.get('/update-history', getCandidateUpdateHistory);
router.post('/update-history/:entryId/comments', addCandidateHistoryComment);
router.delete('/update-history/:entryId/comments/:commentId', deleteCandidateHistoryComment);
router.put('/profile', updateCandidateProfile);
router.patch('/password', changeCandidatePassword);

export default router;


