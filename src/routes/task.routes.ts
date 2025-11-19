import {
  createTask,
  deleteTask,
  getAll,
  getTaskById,
  markAsCompleted,
  markAsInProgress,
  markAsPending,
  update,
} from '@src/controllers/task.controller';
import { authenticate } from '@src/middleware/authenticate';
import { Router } from 'express';

const router: Router = Router();

router.post('/', authenticate, createTask);
router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getTaskById);
router.put('/:id', authenticate, update);
router.patch('/complete/:id', authenticate, markAsCompleted);
router.patch('/in-progress/:id', authenticate, markAsInProgress);
router.patch('/pending/:id', authenticate, markAsPending);
router.delete('/:id', authenticate, deleteTask);

export { router as taskRouter };
