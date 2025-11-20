import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Rate limiter for phone verification - prevents SMS bombing
const phoneVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 verification attempts per hour per user
  keyGenerator: (req) => (req as any).user?.toString() || 'anonymous',
  message: 'Too many phone verification attempts. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Phone verification rate limit exceeded for user: ${(req as any).user}`);
    res.status(429).json({
      message: 'Too many phone verification attempts. Please try again in an hour.',
    });
  }
});

// GET /api/user/profile - Get user profile
router.get('/profile', getProfile);

// PUT /api/user/profile - Update user profile
router.put('/profile', updateProfile);

// GET /api/user/statistics - Get user statistics
router.get('/statistics', getStatistics);

// PUT /api/user/profile/phone - Add or update phone number
router.put('/profile/phone', phoneVerificationLimiter, updatePhoneNumber);

// POST /api/user/profile/phone/verify - Verify phone number with code
router.post('/profile/phone/verify', phoneVerificationLimiter, verifyPhoneNumber);

// GET /api/user/profile/notifications - Get notification preferences
router.get('/profile/notifications', getNotificationPreferences);

// PUT /api/user/profile/notifications - Update notification preferences
router.put('/profile/notifications', updateNotificationPreferences);

export { router as userRouter };
