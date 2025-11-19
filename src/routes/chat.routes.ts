import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { checkGeminiAvailable } from '../middleware/checkGemini';
import { sendMessage, getWelcomeMessage } from '../controllers/chat.controller';

const router: Router = Router();

// Rate limiter: max 10 requests per minute per user
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: { 
    message: 'Too many requests. You can send up to 10 messages per minute. Please wait a moment and try again.' 
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use user ID as key for rate limiting (requires authentication first)
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?._id?.toString() || 'anonymous';
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests. You can send up to 10 messages per minute. Please wait a moment and try again.',
      retryAfter: 60, // seconds
    });
  },
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Check if Gemini is available before processing requests
router.use(checkGeminiAvailable);

// Apply rate limiting to all routes
router.use(chatRateLimiter);

// POST /api/chat/message - Send message and get AI response
router.post('/message', sendMessage);

// GET /api/chat/welcome - Get welcome message with task summary
router.get('/welcome', getWelcomeMessage);

export { router as chatRouter };
