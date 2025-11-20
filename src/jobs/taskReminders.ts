/**
 * Task Reminders Job
 * 
 * This job runs hourly to query tasks due within 24 hours
 * and creates notifications for pending tasks.
 * 
 * Schedule: Run hourly via cron (0 * * * *)
 * Requirements: 6.2
 */

import { notificationSchedulerService } from '../services/notificationScheduler.service';

/**
 * Main job function to schedule task reminders
 */
async function runTaskRemindersJob(): Promise<void> {
  console.log('=== Task Reminders Job Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await notificationSchedulerService.scheduleTaskReminders();
    console.log('=== Task Reminders Job Completed Successfully ===');
  } catch (error) {
    console.error('=== Task Reminders Job Failed ===');
    console.error('Error:', error);
    throw error;
  }
}

// Execute the job if run directly
if (require.main === module) {
  // Import database connection
  import('../config/database')
    .then(({ connectDB }) => connectDB())
    .then(() => {
      console.log('Database connected for task reminders job');
      return runTaskRemindersJob();
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

export { runTaskRemindersJob };
