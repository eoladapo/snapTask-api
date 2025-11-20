/**
 * Cron Job Routes
 * 
 * These endpoints are designed to be called by external cron services
 * (like cron-job.org, GitHub Actions, etc.) to trigger scheduled jobs.
 * 
 * Security: All endpoints require a CRON_SECRET header for authentication.
 */

import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

/**
 * Middleware to verify cron secret
 * Protects endpoints from unauthorized access
 */
const verifyCronSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers['x-cron-secret'];
  
  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET not configured in environment variables');
    return res.status(500).json({ 
      error: 'Cron jobs not configured',
      message: 'CRON_SECRET environment variable is missing'
    });
  }
  
  if (secret !== process.env.CRON_SECRET) {
    console.warn(`⚠️  Unauthorized cron job attempt from IP: ${req.ip}`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing x-cron-secret header'
    });
  }
  
  next();
};

/**
 * POST /api/cron/task-reminders
 * Triggers task reminder notifications
 * Schedule: Every hour (0 * * * *)
 */
router.post('/task-reminders', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    console.log('🔔 Running task reminders job...');
    
    // Dynamically import to avoid loading at startup
    const { runTaskReminders } = await import('../jobs/taskReminders');
    await runTaskReminders();
    
    console.log('✅ Task reminders job completed successfully');
    res.json({ 
      success: true, 
      job: 'task-reminders',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Task reminders job failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Job execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cron/daily-summaries
 * Sends daily task summaries to users
 * Schedule: Daily at 8 AM UTC (0 8 * * *)
 */
router.post('/daily-summaries', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    console.log('📊 Running daily summaries job...');
    
    const { runDailySummaries } = await import('../jobs/dailySummaries');
    await runDailySummaries();
    
    console.log('✅ Daily summaries job completed successfully');
    res.json({ 
      success: true, 
      job: 'daily-summaries',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Daily summaries job failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Job execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cron/process-queue
 * Processes pending notification queue
 * Schedule: Every 5 minutes (*\/5 * * * *)
 */
router.post('/process-queue', verifyCronSecret, async (req: Request, res: Response) => {
  try {
    console.log('⚙️  Running process queue job...');
    
    const { runProcessQueue } = await import('../jobs/processQueue');
    await runProcessQueue();
    
    console.log('✅ Process queue job completed successfully');
    res.json({ 
      success: true, 
      job: 'process-queue',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Process queue job failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Job execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/cron/health
 * Health check endpoint for cron jobs
 * Does not require authentication
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    cronJobsConfigured: !!process.env.CRON_SECRET,
    timestamp: new Date().toISOString()
  });
});

export default router;
