import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  create,
  getAll,
  getById,
  update,
  remove,
} from '../controllers/category.controller';
import { authenticate } from '../middleware/authenticate';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Rate limiter for category operations - prevents abuse
const categoryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 category operations per hour per user
  keyGenerator: (req) => (req as any).user?.toString() || 'anonymous',
  message: 'Too many category operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/categories - Create a new category
router.post('/', categoryLimiter, create);

// GET /api/categories - Get all categories for the authenticated user
router.get('/', getAll);

// GET /api/categories/:id - Get a single category by ID
router.get('/:id', getById);

// PUT /api/categories/:id - Update a category
router.put('/:id', update);

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', remove);

export { router as categoryRouter };
