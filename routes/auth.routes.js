import { Router } from 'express';
import { employerRegister, employerLogin, adminRegister, adminLogin, candidateRegister, candidateLogin, verifyEmailOtp, resendEmailOtp } from '../controllers/auth.controller.js';

const router = Router();

router.post('/employer/register', employerRegister);
router.post('/employer/login', employerLogin);
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);
router.post('/candidate/register', candidateRegister);
router.post('/candidate/login', candidateLogin);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-otp', resendEmailOtp);

export default router;


