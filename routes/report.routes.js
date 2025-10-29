import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

// Placeholder for future system-wide or public reports
const router = Router();

router.get('/ping', (_req, res) => res.json({ ok: true }));

export default router;


