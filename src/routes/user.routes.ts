import { Router } from 'express';
import { getProfile, updateProfile, getStatistics } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/user/profile - Get user profile
router.get('/profile', getProfile);

// PUT /api/user/profile - Update user profile
router.put('/profile', updateProfile);

// GET /api/user/statistics - Get user statistics
router.get('/statistics', getStatistics);

export { router as userRouter };
