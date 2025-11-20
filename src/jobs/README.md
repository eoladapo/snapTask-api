# Notification Jobs

This directory contains cron jobs for the WhatsApp notification system.

## Jobs Overview

### 1. Task Reminders (`taskReminders.ts`)
- **Purpose**: Query tasks due within 24 hours and create notifications for pending tasks
- **Schedule**: Hourly (`0 * * * *`)
- **Requirements**: 6.2

### 2. Daily Summaries (`dailySummaries.ts`)
- **Purpose**: Generate daily task summary per user and send at user's preferred time
- **Schedule**: Daily at 8 AM (`0 8 * * *`)
- **Requirements**: 6.1

### 3. Process Queue (`processQueue.ts`)
- **Purpose**: Process pending notifications, handle retries for failed notifications, and update notification status
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Requirements**: 6.6, 8.3

## Running Jobs Manually

You can run any job manually for testing:

```bash
# Task Reminders
npm run job:task-reminders

# Daily Summaries
npm run job:daily-summaries

# Process Queue
npm run job:process-queue
```

Or run directly with ts-node:

```bash
# Task Reminders
npx ts-node src/jobs/taskReminders.ts

# Daily Summaries
npx ts-node src/jobs/dailySummaries.ts

# Process Queue
npx ts-node src/jobs/processQueue.ts
```

## Setting Up Cron Jobs

### Option 1: Using node-cron (Recommended for Development)

Install node-cron:
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Create a scheduler file (`src/jobs/scheduler.ts`):
```typescript
import cron from 'node-cron';
import { runTaskRemindersJob } from './taskReminders';
import { runDailySummariesJob } from './dailySummaries';
import { runProcessQueueJob } from './processQueue';

// Task reminders - every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running task reminders job...');
  await runTaskRemindersJob();
});

// Daily summaries - every day at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily summaries job...');
  await runDailySummariesJob();
});

// Process queue - every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running process queue job...');
  await runProcessQueueJob();
});

console.log('Cron jobs scheduled successfully');
```

Then import and run in your server:
```typescript
// In src/server.ts
import './jobs/scheduler';
```

### Option 2: Using System Cron (Production)

Add to your crontab (`crontab -e`):

```bash
# Task Reminders - Every hour
0 * * * * cd /path/to/backend && npx ts-node src/jobs/taskReminders.ts >> /var/log/task-reminders.log 2>&1

# Daily Summaries - Every day at 8 AM
0 8 * * * cd /path/to/backend && npx ts-node src/jobs/dailySummaries.ts >> /var/log/daily-summaries.log 2>&1

# Process Queue - Every 5 minutes
*/5 * * * * cd /path/to/backend && npx ts-node src/jobs/processQueue.ts >> /var/log/process-queue.log 2>&1
```

### Option 3: Using PM2 (Production)

Create an ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'task-reminders',
      script: 'dist/jobs/taskReminders.js',
      cron_restart: '0 * * * *',
      autorestart: false,
    },
    {
      name: 'daily-summaries',
      script: 'dist/jobs/dailySummaries.js',
      cron_restart: '0 8 * * *',
      autorestart: false,
    },
    {
      name: 'process-queue',
      script: 'dist/jobs/processQueue.js',
      cron_restart: '*/5 * * * *',
      autorestart: false,
    },
  ],
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
```

## Environment Variables

Ensure these environment variables are set:

```env
# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Notification Settings
MAX_NOTIFICATIONS_PER_DAY=10
NOTIFICATION_RETRY_ATTEMPTS=3

# Database
MONGODB_URI=your_mongodb_connection_string
```

## Monitoring

Monitor job execution through logs:

```bash
# View logs in real-time
tail -f /var/log/task-reminders.log
tail -f /var/log/daily-summaries.log
tail -f /var/log/process-queue.log
```

Or use PM2 logs:
```bash
pm2 logs task-reminders
pm2 logs daily-summaries
pm2 logs process-queue
```

## Troubleshooting

### Jobs not running
- Check cron service is running: `systemctl status cron`
- Verify crontab entries: `crontab -l`
- Check log files for errors

### Database connection issues
- Ensure MongoDB is running
- Verify MONGODB_URI environment variable
- Check network connectivity

### WhatsApp notifications not sending
- Verify Twilio credentials
- Check user phone verification status
- Ensure notification preferences are enabled
- Review notification queue for failed messages

## Testing

Test each job individually before deploying:

```bash
# Test task reminders
npm run job:task-reminders

# Test daily summaries
npm run job:daily-summaries

# Test process queue
npm run job:process-queue
```

Check the notification queue in MongoDB to verify notifications are being created and processed correctly.
