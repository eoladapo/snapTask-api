import { NotificationQueue, INotificationQueue } from '../models/notificationQueue.model';
import { Task, ITask } from '../models/task.model';
import User from '../models/user.model';
import { Category } from '../models/category.model';
import { whatsappService, TaskSummary } from './whatsapp.service';
import { IUser } from '../common/interface/user-interface';
import { Document, Types } from 'mongoose';

// Configuration constants
const MAX_NOTIFICATIONS_PER_DAY = parseInt(process.env.MAX_NOTIFICATIONS_PER_DAY || '10', 10);
const TASK_REMINDER_HOURS = 24; // Send reminders for tasks due within 24 hours

/**
 * Notification Scheduler Service
 * Handles scheduling, rate limiting, and processing of WhatsApp notifications
 */
class NotificationSchedulerService {
  /**
   * Check if current time is within user's quiet hours
   */
  private isQuietHours(user: IUser): boolean {
    const prefs = user.notificationPreferences;
    
    if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    // Parse quiet hours (format: "HH:MM")
    const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);

    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime < quietEnd;
    }

    return currentTime >= quietStart && currentTime < quietEnd;
  }

  /**
   * Calculate when to schedule notification based on quiet hours
   */
  private calculateScheduleTime(user: IUser, preferredTime?: Date): Date {
    const scheduleTime = preferredTime || new Date();

    // If not in quiet hours, schedule immediately
    if (!this.isQuietHours(user)) {
      return scheduleTime;
    }

    // If in quiet hours, schedule for end of quiet hours
    const prefs = user.notificationPreferences;
    if (!prefs?.quietHoursEnd) {
      return scheduleTime;
    }

    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);

    // If quiet hours end is tomorrow (spans midnight), add a day
    const now = new Date();
    if (endTime < now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return endTime;
  }

  /**
   * Check if user has reached daily notification limit
   */
  private async hasReachedDailyLimit(userId: string): Promise<boolean> {
    const count = await this.getTodayNotificationCount(userId);
    return count >= MAX_NOTIFICATIONS_PER_DAY;
  }

  /**
   * Get count of notifications sent today for a user
   * Optimized with single query and uses index on { user: 1, status: 1, sentAt: 1 }
   */
  private async getTodayNotificationCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This query uses the compound index { user: 1, status: 1 }
    return await NotificationQueue.countDocuments({
      user: userId,
      status: 'sent',
      sentAt: { $gte: today, $lt: tomorrow },
    });
  }

  /**
   * Queue a notification for later delivery
   */
  private async queueNotification(
    userId: string,
    type: 'task_reminder' | 'status_change' | 'daily_summary',
    message: string,
    scheduledFor: Date,
    taskId?: string
  ): Promise<INotificationQueue> {
    const notification = new NotificationQueue({
      user: userId,
      type,
      message,
      scheduledFor,
      taskId,
      status: 'pending',
      retryCount: 0,
    });

    await notification.save();
    return notification;
  }

  /**
   * Schedule task reminders for tasks due within 24 hours
   * Should be run hourly via cron job
   */
  async scheduleTaskReminders(): Promise<void> {
    try {
      console.log('Starting task reminder scheduling...');

      const now = new Date();
      const reminderWindow = new Date(now.getTime() + TASK_REMINDER_HOURS * 60 * 60 * 1000);

      // Optimized query: Find tasks due within the next 24 hours that are not completed
      // Uses index on { dueDate: 1, status: 1, user: 1 }
      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: reminderWindow },
        status: { $in: ['pending', 'in-progress'] },
      })
        .populate('user category')
        .lean(); // Use lean() for better performance when we don't need Mongoose documents

      console.log(`Found ${tasks.length} tasks due within ${TASK_REMINDER_HOURS} hours`);

      for (const task of tasks) {
        const user = task.user as unknown as (IUser & Document & { _id: Types.ObjectId });
        
        if (!user) continue;

        // Check if user has notifications enabled
        if (!user.phoneVerified || !user.notificationPreferences?.whatsappEnabled) {
          continue;
        }

        if (!user.notificationPreferences?.taskReminders) {
          continue;
        }

        // Check if we already have a pending reminder for this task
        const existingReminder = await NotificationQueue.findOne({
          user: user._id,
          taskId: task._id,
          type: 'task_reminder',
          status: 'pending',
        });

        if (existingReminder) {
          console.log(`Reminder already queued for task ${task._id}`);
          continue;
        }

        // Check daily limit
        if (await this.hasReachedDailyLimit(user._id.toString())) {
          console.log(`User ${user._id} has reached daily notification limit`);
          // Queue for tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(8, 0, 0, 0); // Schedule for 8 AM tomorrow

          const categoryName = task.category ? (task.category as any).name : undefined;
          const message = this.formatTaskReminderMessage(task, categoryName);
          
          await this.queueNotification(
            user._id.toString(),
            'task_reminder',
            message,
            tomorrow,
            task._id.toString()
          );
          continue;
        }

        // Calculate schedule time based on quiet hours
        const scheduleTime = this.calculateScheduleTime(user);

        // Get category name if exists
        const categoryName = task.category ? (task.category as any).name : undefined;
        const message = this.formatTaskReminderMessage(task, categoryName);

        // Queue the notification
        await this.queueNotification(
          user._id.toString(),
          'task_reminder',
          message,
          scheduleTime,
          task._id.toString()
        );

        console.log(`Queued reminder for task ${task._id} at ${scheduleTime}`);
      }

      console.log('Task reminder scheduling completed');
    } catch (error) {
      console.error('Error scheduling task reminders:', error);
      throw error;
    }
  }

  /**
   * Format task reminder message
   */
  private formatTaskReminderMessage(task: ITask, categoryName?: string): string {
    let message = `⏰ Task Reminder\n\n📋 ${task.title}\n`;
    
    if (task.description) {
      const maxLength = 100;
      const description = task.description.length > maxLength
        ? task.description.substring(0, maxLength) + '...'
        : task.description;
      message += `${description}\n\n`;
    }

    if (categoryName) {
      message += `📁 Category: ${categoryName}\n`;
    }

    if (task.dueDate) {
      message += `📅 Due: ${this.formatDate(task.dueDate)}\n`;
    }

    return message;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const taskDate = new Date(date);
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`;
    } else {
      return `in ${diffDays} days`;
    }
  }

  /**
   * Schedule daily summaries for all users
   * Should be run daily via cron job
   */
  async scheduleDailySummaries(): Promise<void> {
    try {
      console.log('Starting daily summary scheduling...');

      // Find all users with daily summary enabled
      const users = await User.find({
        phoneVerified: true,
        'notificationPreferences.whatsappEnabled': true,
        'notificationPreferences.dailySummary': true,
      }) as Array<IUser & Document & { _id: Types.ObjectId }>;

      console.log(`Found ${users.length} users with daily summary enabled`);

      for (const user of users) {
        // Check daily limit
        if (await this.hasReachedDailyLimit(user._id.toString())) {
          console.log(`User ${user._id} has reached daily notification limit`);
          continue;
        }

        // Check if summary already scheduled for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingSummary = await NotificationQueue.findOne({
          user: user._id,
          type: 'daily_summary',
          status: { $in: ['pending', 'sent'] },
          scheduledFor: { $gte: today, $lt: tomorrow },
        });

        if (existingSummary) {
          console.log(`Daily summary already scheduled for user ${user._id}`);
          continue;
        }

        // Calculate summary
        const summary = await this.calculateTaskSummary(user._id.toString());

        // Format message
        const message = this.formatDailySummaryMessage(user.username, summary);

        // Schedule for 8 AM (or after quiet hours)
        const scheduleTime = new Date();
        scheduleTime.setHours(8, 0, 0, 0);
        
        const finalScheduleTime = this.calculateScheduleTime(user, scheduleTime);

        // Queue the notification
        await this.queueNotification(
          user._id.toString(),
          'daily_summary',
          message,
          finalScheduleTime
        );

        console.log(`Queued daily summary for user ${user._id} at ${finalScheduleTime}`);
      }

      console.log('Daily summary scheduling completed');
    } catch (error) {
      console.error('Error scheduling daily summaries:', error);
      throw error;
    }
  }

  /**
   * Calculate task summary for a user
   */
  private async calculateTaskSummary(userId: string): Promise<TaskSummary> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allTasks = await Task.find({ user: userId });

    const summary: TaskSummary = {
      totalTasks: allTasks.length,
      pendingTasks: allTasks.filter(t => t.status === 'pending').length,
      inProgressTasks: allTasks.filter(t => t.status === 'in-progress').length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      dueTodayTasks: allTasks.filter(
        t => t.dueDate && t.dueDate >= today && t.dueDate < tomorrow && t.status !== 'completed'
      ).length,
      overdueTasks: allTasks.filter(
        t => t.dueDate && t.dueDate < today && t.status !== 'completed'
      ).length,
    };

    return summary;
  }

  /**
   * Format daily summary message
   */
  private formatDailySummaryMessage(username: string, summary: TaskSummary): string {
    let message = `☀️ Good Morning, ${username}!\n\n`;
    message += `📊 Your Task Summary\n\n`;
    message += `Total Tasks: ${summary.totalTasks}\n`;
    message += `⏳ Pending: ${summary.pendingTasks}\n`;
    message += `⚡ In Progress: ${summary.inProgressTasks}\n`;
    message += `✅ Completed: ${summary.completedTasks}\n\n`;

    if (summary.dueTodayTasks > 0) {
      message += `📅 Due Today: ${summary.dueTodayTasks}\n`;
    }

    if (summary.overdueTasks > 0) {
      message += `⚠️ Overdue: ${summary.overdueTasks}\n`;
    }

    return message;
  }

  /**
   * Process pending notifications in the queue
   * Should be run every 5 minutes via cron job
   */
  async processNotificationQueue(): Promise<void> {
    try {
      console.log('Starting notification queue processing...');

      const now = new Date();

      // Optimized query: Find pending notifications that are due
      // Uses index on { scheduledFor: 1, status: 1 }
      const pendingNotifications = await NotificationQueue.find({
        status: 'pending',
        scheduledFor: { $lte: now },
        retryCount: { $lt: 3 },
      })
        .populate('user')
        .populate('taskId')
        .sort({ scheduledFor: 1 })
        .limit(50) // Process in batches to avoid memory issues
        .lean(); // Use lean() for better performance

      console.log(`Found ${pendingNotifications.length} pending notifications to process`);

      for (const notification of pendingNotifications) {
        try {
          const user = notification.user as unknown as (IUser & Document & { _id: Types.ObjectId });

          if (!user) {
            console.error(`User not found for notification ${notification._id}`);
            notification.status = 'failed';
            notification.error = 'User not found';
            await notification.save();
            continue;
          }

          // Double-check user preferences
          if (!user.phoneVerified || !user.notificationPreferences?.whatsappEnabled) {
            console.log(`User ${user._id} has notifications disabled`);
            notification.status = 'failed';
            notification.error = 'Notifications disabled';
            await notification.save();
            continue;
          }

          // Check if still in quiet hours
          if (this.isQuietHours(user)) {
            console.log(`User ${user._id} is in quiet hours, rescheduling`);
            notification.scheduledFor = this.calculateScheduleTime(user);
            await notification.save();
            continue;
          }

          // Check daily limit before sending
          const todayCount = await this.getTodayNotificationCount(user._id.toString());
          if (todayCount >= MAX_NOTIFICATIONS_PER_DAY) {
            console.log(`User ${user._id} has reached daily limit, rescheduling for tomorrow`);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8, 0, 0, 0);
            notification.scheduledFor = tomorrow;
            await notification.save();
            continue;
          }

          // Send the notification based on type
          let success = false;

          if (notification.type === 'task_reminder' && notification.taskId) {
            const task = notification.taskId as unknown as ITask & Document;
            const category = task.category ? await Category.findById(task.category) : null;
            success = await whatsappService.sendTaskReminder(user, task, category?.name);
          } else if (notification.type === 'daily_summary') {
            const summary = await this.calculateTaskSummary(user._id.toString());
            success = await whatsappService.sendDailySummary(user, summary);
          } else if (notification.type === 'status_change' && notification.taskId) {
            // Status change notifications are handled directly in the controller
            // This is here for retry logic
            console.log('Status change notification in queue - skipping');
            notification.status = 'sent';
            notification.sentAt = new Date();
            await notification.save();
            continue;
          }

          if (success) {
            notification.status = 'sent';
            notification.sentAt = new Date();
            console.log(`Successfully sent notification ${notification._id}`);
          } else {
            notification.retryCount += 1;
            
            if (notification.retryCount >= 3) {
              notification.status = 'failed';
              notification.error = 'Max retry attempts reached';
              console.error(`Notification ${notification._id} failed after 3 attempts`);
            } else {
              // Schedule retry with exponential backoff
              const retryDelay = Math.pow(2, notification.retryCount) * 5; // 10, 20, 40 minutes
              notification.scheduledFor = new Date(now.getTime() + retryDelay * 60 * 1000);
              console.log(`Rescheduling notification ${notification._id} for retry in ${retryDelay} minutes`);
            }
          }

          await notification.save();
        } catch (error: any) {
          console.error(`Error processing notification ${notification._id}:`, error);
          notification.retryCount += 1;
          notification.error = error.message;

          if (notification.retryCount >= 3) {
            notification.status = 'failed';
          }

          await notification.save();
        }
      }

      console.log('Notification queue processing completed');
    } catch (error) {
      console.error('Error processing notification queue:', error);
      throw error;
    }
  }

  /**
   * Schedule a status change notification
   * Called directly from task controller when status changes
   */
  async scheduleStatusChangeNotification(
    userId: string,
    taskId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found');
        return;
      }

      // Check if user has notifications enabled
      if (!user.phoneVerified || !user.notificationPreferences?.whatsappEnabled) {
        return;
      }

      if (!user.notificationPreferences?.statusUpdates) {
        return;
      }

      // Check daily limit
      if (await this.hasReachedDailyLimit(userId)) {
        console.log(`User ${userId} has reached daily notification limit`);
        return;
      }

      // Get task details
      const task = await Task.findById(taskId).populate('category');
      if (!task) {
        console.error('Task not found');
        return;
      }

      const category = task.category as any;
      const categoryName = category?.name;

      // Send immediately if not in quiet hours, otherwise queue
      const scheduleTime = this.calculateScheduleTime(user);
      const isImmediate = scheduleTime.getTime() <= new Date().getTime() + 60000; // Within 1 minute

      if (isImmediate) {
        // Send directly
        await whatsappService.sendStatusUpdate(user, task as any, oldStatus, categoryName);
      } else {
        // Queue for later
        const message = this.formatStatusChangeMessage(task, oldStatus, newStatus, categoryName);
        await this.queueNotification(userId, 'status_change', message, scheduleTime, taskId);
      }
    } catch (error) {
      console.error('Error scheduling status change notification:', error);
    }
  }

  /**
   * Format status change message
   */
  private formatStatusChangeMessage(
    task: ITask,
    oldStatus: string,
    newStatus: string,
    categoryName?: string
  ): string {
    let emoji = '📢';
    let title = 'Task Status Updated';

    if (newStatus === 'completed') {
      emoji = '🎉';
      title = 'Task Completed!';
    } else if (newStatus === 'in-progress') {
      emoji = '🚀';
      title = 'Task Started';
    }

    let message = `${emoji} ${title}\n\n📋 ${task.title}\n`;

    if (categoryName) {
      message += `📁 Category: ${categoryName}\n`;
    }

    message += `Previous: ${this.formatStatus(oldStatus)}\n`;
    message += `Current: ${this.formatStatus(newStatus)}\n`;

    return message;
  }

  /**
   * Format status with emoji
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '⏳ Pending',
      'in-progress': '⚡ In Progress',
      completed: '✅ Completed',
    };
    return statusMap[status] || status;
  }
}

// Export singleton instance
export const notificationSchedulerService = new NotificationSchedulerService();

