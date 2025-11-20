import { Router } from 'express';
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

// POST /api/categories - Create a new category
router.post('/', create);

// GET /api/categories - Get all categories for the authenticated user
router.get('/', getAll);

// GET /api/categories/:id - Get a single category by ID
router.get('/:id', getById);

// PUT /api/categories/:id - Update a category
router.put('/:id', update);

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', remove);

export { router as categoryRouter };
