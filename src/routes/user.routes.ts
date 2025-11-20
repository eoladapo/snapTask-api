import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getStatistics,
  updatePhoneNumber,
  verifyPhoneNumber,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/user.controller';
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

// PUT /api/user/profile/phone - Add or update phone number
router.put('/profile/phone', updatePhoneNumber);

// POST /api/user/profile/phone/verify - Verify phone number with code
router.post('/profile/phone/verify', verifyPhoneNumber);

// GET /api/user/profile/notifications - Get notification preferences
router.get('/profile/notifications', getNotificationPreferences);

// PUT /api/user/profile/notifications - Update notification preferences
router.put('/profile/notifications', updateNotificationPreferences);

export { router as userRouter };
