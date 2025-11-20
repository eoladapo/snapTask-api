import {
  createTask,
  deleteTask,
  getAll,
  getTaskById,
  markAsCompleted,
  markAsInProgress,
  markAsPending,
  update,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/authenticate';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router: Router = Router();

// Rate limiter for task creation - prevents abuse
const taskCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 task creations per hour per user
  keyGenerator: (req) => (req as any).user?.toString() || 'anonymous',
  message: 'Too many tasks created. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', authenticate, taskCreationLimiter, createTask);
router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getTaskById);
router.put('/:id', authenticate, update);
router.patch('/complete/:id', authenticate, markAsCompleted);
router.patch('/in-progress/:id', authenticate, markAsInProgress);
router.patch('/pending/:id', authenticate, markAsPending);
router.delete('/:id', authenticate, deleteTask);

export { router as taskRouter };
