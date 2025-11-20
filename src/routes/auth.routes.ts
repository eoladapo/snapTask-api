import { login, signup } from '../controllers/auth.controller';
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router: Router = express.Router();

// Rate limiter for authentication endpoints - prevents brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Auth rate limit exceeded from IP: ${req.ip}, Email: ${req.body.email}`);
    res.status(429).json({
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    });
  }
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);

export default router;
