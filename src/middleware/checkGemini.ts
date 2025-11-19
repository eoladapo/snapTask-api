import { Request, Response, NextFunction } from 'express';
import { isGeminiAvailable } from '@src/services/gemini.service';

/**
 * Middleware to check if Gemini AI service is available
 * Returns 503 Service Unavailable if Gemini is not initialized
 */
export const checkGeminiAvailable = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isGeminiAvailable()) {
    res.status(503).json({
      message: 'AI service is currently unavailable. Please check your configuration or try again later.',
    });
    return;
  }
  next();
};
