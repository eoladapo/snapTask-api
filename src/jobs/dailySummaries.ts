/**
 * Daily Summaries Job
 * 
 * This job runs daily to generate task summaries for each user
 * and sends them at the user's preferred time.
 * 
 * Schedule: Run daily via cron (0 8 * * *)
 * Requirements: 6.1
 */

import { notificationSchedulerService } from '../services/notificationScheduler.service';

/**
 * Main job function to schedule daily summaries
 */
async function runDailySummariesJob(): Promise<void> {
  console.log('=== Daily Summaries Job Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await notificationSchedulerService.scheduleDailySummaries();
    console.log('=== Daily Summaries Job Completed Successfully ===');
  } catch (error) {
    console.error('=== Daily Summaries Job Failed ===');
    console.error('Error:', error);
    throw error;
  }
}

// Export for use by cron routes
export { runDailySummariesJob as runDailySummaries };

// Execute the job if run directly
if (require.main === module) {
  // Import database connection
  import('../config/database')
    .then(({ connectDB }) => connectDB())
    .then(() => {
      console.log('Database connected for daily summaries job');
      return runDailySummariesJob();
    })
    .then(() => {
      console.log('Job execution completed, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Job execution failed:', error);
      process.exit(1);
    });
}

export { runDailySummariesJob };
