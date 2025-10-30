import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { 
  listEmployers, approveEmployer, rejectEmployer, adminMetrics, adminReports, 
  listAllCandidates, suspendEmployer, unsuspendEmployer, listCandidateUsers, 
  approveCandidateUser, rejectCandidateUser, suspendCandidateUser, unsuspendCandidateUser,
  getPendingCandidateUsers, getVerifiedCandidateUsers, getCandidateUserDetails, updateCandidateUserStatus
} from '../controllers/admin.controller.js';
import { 
  updateCandidateUserHistoryEntry, 
  deleteCandidateUserHistoryEntry 
} from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

// Employer routes
router.get('/employers', listEmployers);
router.patch('/employers/:id/approve', approveEmployer);
router.patch('/employers/:id/reject', rejectEmployer);
router.patch('/employers/:id/suspend', suspendEmployer);
router.patch('/employers/:id/unsuspend', unsuspendEmployer);

// Metrics and reports
router.get('/metrics', adminMetrics);
router.get('/reports', adminReports);

// Candidate routes (old Candidate model)
router.get('/candidates', listAllCandidates);

// Candidate User routes (new comprehensive model)
router.get('/candidate-users', listCandidateUsers);
router.get('/candidate-users/pending', getPendingCandidateUsers);
router.get('/candidate-users/verified', getVerifiedCandidateUsers);
router.get('/candidate-users/:id', getCandidateUserDetails);
router.patch('/candidate-users/:id/approve', approveCandidateUser);
router.patch('/candidate-users/:id/reject', rejectCandidateUser);
router.patch('/candidate-users/:id/suspend', suspendCandidateUser);
router.patch('/candidate-users/:id/unsuspend', unsuspendCandidateUser);
router.patch('/candidate-users/:id/status', updateCandidateUserStatus);
router.patch('/candidate-users/:id/update-history/:entryId', updateCandidateUserHistoryEntry);
router.delete('/candidate-users/:id/update-history/:entryId', deleteCandidateUserHistoryEntry);

export default router;


