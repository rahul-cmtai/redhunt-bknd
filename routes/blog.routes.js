import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogsWithFilters
} from '../controllers/blog.controller.js';

const router = Router();

// Public routes (no authentication required)
router.get('/', getBlogs); // Get all published blogs
router.get('/slug/:slug', getBlogBySlug); // Get blog by slug (published only for non-admins)

// Admin routes (authentication and admin role required)
router.use('/admin', authenticate, requireRole('admin'));

// Admin blog management routes
router.get('/admin', getBlogsWithFilters); // Get all blogs with filters (admin)
router.get('/admin/:id', getBlogById); // Get blog by ID (admin)
router.post('/admin', createBlog); // Create blog (admin)
router.put('/admin/:id', updateBlog); // Update blog (admin)
router.patch('/admin/:id', updateBlog); // Update blog (admin) - PATCH support
router.delete('/admin/:id', deleteBlog); // Delete blog (admin)

export default router;

