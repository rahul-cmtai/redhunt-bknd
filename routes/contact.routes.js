import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createContactLead,
  getAllContactLeads,
  getContactLeadById,
  updateContactLeadStatus,
  addAdminNotes,
  getContactLeadsStats
} from '../controllers/contact.controller.js';

const router = Router();

// Public route - anyone can submit contact form
router.post('/contact-leads', createContactLead);

// Admin routes - require authentication and admin role
router.use('/contact-leads', authenticate, requireRole('admin'));

router.get('/contact-leads', getAllContactLeads);
router.get('/contact-leads/stats', getContactLeadsStats);
router.get('/contact-leads/:id', getContactLeadById);
router.patch('/contact-leads/:id/status', updateContactLeadStatus);
router.patch('/contact-leads/:id/notes', addAdminNotes);

export default router;

