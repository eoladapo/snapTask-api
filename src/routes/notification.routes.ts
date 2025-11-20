import { Router } from 'express';
import { getNotificationHistory, sendTestNotification } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/notifications/history - Get notification history
router.get('/history', getNotificationHistory);

// POST /api/notifications/test - Send test notification
router.post('/test', sendTestNotification);

export { router as notificationRouter };
