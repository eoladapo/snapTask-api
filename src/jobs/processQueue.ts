/**
 * Process Notification Queue Job
 * 
 * This job runs every 5 minutes to process pending notifications,
 * handle retries for failed notifications, and update notification status.
 * 
 * Schedule: Run every 5 minutes via cron
 * Requirements: 6.6, 8.3
 */

import { notificationSchedulerService } from '../services/notificationScheduler.service';

/**
 * Main job function to process the notification queue
 */
async function runProcessQueueJob(): Promise<void> {
  console.log('=== Process Notification Queue Job Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await notificationSchedulerService.processNotificationQueue();
    console.log('=== Process Notification Queue Job Completed Successfully ===');
  } catch (error) {
    console.error('=== Process Notification Queue Job Failed ===');
    console.error('Error:', error);
    throw error;
  }
}

// Export for use by cron routes
export { runProcessQueueJob as runProcessQueue };

// Execute the job if run directly
if (require.main === module) {
  // Import database connection
  import('../config/database')
    .then(({ connectDB }) => connectDB())
    .then(() => {
      console.log('Database connected for process queue job');
      return runProcessQueueJob();
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

export { runProcessQueueJob };
