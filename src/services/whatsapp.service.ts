import twilio from 'twilio';
import { IUser } from '../common/interface/user-interface';
import { ITask } from '../models/task.model';
import { decrypt } from '../utils/encryption';
import { Document, Types } from 'mongoose';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Validate Twilio configuration
if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('Twilio credentials not configured. WhatsApp notifications will be disabled.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Retry configuration
const MAX_RETRY_ATTEMPTS = parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10);
const RETRY_DELAYS = [1000, 3000, 9000]; // Exponential backoff: 1s, 3s, 9s

/**
 * Interface for task summary used in daily summaries
 */
export interface TaskSummary {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  dueTodayTasks: number;
  overdueTasks: number;
}

/**
 * WhatsApp Service for sending notifications via Twilio
 */
class WhatsAppService {
  /**
   * Check if WhatsApp service is configured and available
   */
  private isConfigured(): boolean {
    return client !== null && !!whatsappNumber;
  }

  /**
   * Get user's phone number (decrypted)
   */
  private getUserPhoneNumber(user: IUser): string | null {
    if (!user.phoneNumber) {
      return null;
    }

    try {
      return decrypt(user.phoneNumber);
    } catch (error) {
      console.error('Failed to decrypt phone number:', error);
      return null;
    }
  }

  /**
   * Check if user has WhatsApp notifications enabled
   */
  private canSendNotification(user: IUser): boolean {
    return (
      user.phoneVerified &&
      user.notificationPreferences?.whatsappEnabled === true &&
      !!this.getUserPhoneNumber(user)
    );
  }

  /**
   * Format phone number for WhatsApp (add whatsapp: prefix if not present)
   */
  private formatWhatsAppNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('whatsapp:')) {
      return phoneNumber;
    }
    return `whatsapp:${phoneNumber}`;
  }

  /**
   * Send a WhatsApp message with retry logic
   */
  async sendMessage(phoneNumber: string, message: string, retryCount = 0): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('WhatsApp service is not configured');
      return false;
    }

    if (!client || !whatsappNumber) {
      return false;
    }

    try {
      const formattedNumber = this.formatWhatsAppNumber(phoneNumber);

      const result = await client.messages.create({
        body: message,
        from: whatsappNumber,
        to: formattedNumber,
      });

      console.log(`WhatsApp message sent successfully. SID: ${result.sid}`);
      return true;
    } catch (error: any) {
      console.error(`WhatsApp message failed (attempt ${retryCount + 1}):`, error.message);

      // Check for Twilio trial account error
      if (error.code === 21608 || error.message?.includes('not a valid')) {
        console.error('⚠️  TWILIO TRIAL ACCOUNT: This phone number is not verified. Add it to your Twilio verified numbers or upgrade to a paid account.');
        throw new Error('This phone number cannot receive messages on a Twilio trial account. Please verify the number in your Twilio dashboard or upgrade to a paid account.');
      }

      // Retry logic with exponential backoff (skip retry for trial account errors)
      if (retryCount < MAX_RETRY_ATTEMPTS - 1 && error.code !== 21608) {
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`Retrying in ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendMessage(phoneNumber, message, retryCount + 1);
      }

      console.error('Max retry attempts reached. Message failed to send.');
      return false;
    }
  }

  /**
   * Send a verification code to a phone number
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `🔐 SnapTask Verification Code\n\nYour verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this message.`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Format task details for WhatsApp message
   */
  private formatTaskDetails(task: ITask, categoryName?: string): string {
    let details = `📋 *${task.title}*\n`;

    if (task.description) {
      // Truncate long descriptions
      const maxLength = 100;
      const description =
        task.description.length > maxLength
          ? task.description.substring(0, maxLength) + '...'
          : task.description;
      details += `${description}\n\n`;
    }

    if (categoryName) {
      details += `📁 Category: ${categoryName}\n`;
    }

    details += `Status: ${this.formatStatus(task.status)}\n`;

    if (task.dueDate) {
      details += `📅 Due: ${this.formatDate(task.dueDate)}\n`;
    }

    return details;
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
   * Get app link for task
   */
  private getTaskLink(taskId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://snaptask.app';
    return `${baseUrl}/tasks/${taskId}`;
  }

  /**
   * Send task reminder notification
   */
  async sendTaskReminder(user: IUser, task: ITask & Document, categoryName?: string): Promise<boolean> {
    if (!this.canSendNotification(user)) {
      console.log('User cannot receive notifications');
      return false;
    }

    if (!user.notificationPreferences?.taskReminders) {
      console.log('User has task reminders disabled');
      return false;
    }

    const phoneNumber = this.getUserPhoneNumber(user);
    if (!phoneNumber) {
      return false;
    }

    const taskDetails = this.formatTaskDetails(task, categoryName);
    const taskId = (task._id as Types.ObjectId).toString();
    const message = `⏰ *Task Reminder*\n\n${taskDetails}\n🔗 View task: ${this.getTaskLink(taskId)}`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(
    user: IUser,
    task: ITask & Document,
    oldStatus: string,
    categoryName?: string
  ): Promise<boolean> {
    if (!this.canSendNotification(user)) {
      console.log('User cannot receive notifications');
      return false;
    }

    if (!user.notificationPreferences?.statusUpdates) {
      console.log('User has status updates disabled');
      return false;
    }

    const phoneNumber = this.getUserPhoneNumber(user);
    if (!phoneNumber) {
      return false;
    }

    let emoji = '📢';
    let title = 'Task Status Updated';

    if (task.status === 'completed') {
      emoji = '🎉';
      title = 'Task Completed!';
    } else if (task.status === 'in-progress') {
      emoji = '🚀';
      title = 'Task Started';
    }

    const taskDetails = this.formatTaskDetails(task, categoryName);
    const taskId = (task._id as Types.ObjectId).toString();
    const message = `${emoji} *${title}*\n\n${taskDetails}\nPrevious status: ${this.formatStatus(oldStatus)}\n\n🔗 View task: ${this.getTaskLink(taskId)}`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(user: IUser, summary: TaskSummary): Promise<boolean> {
    if (!this.canSendNotification(user)) {
      console.log('User cannot receive notifications');
      return false;
    }

    if (!user.notificationPreferences?.dailySummary) {
      console.log('User has daily summary disabled');
      return false;
    }

    const phoneNumber = this.getUserPhoneNumber(user);
    if (!phoneNumber) {
      return false;
    }

    let message = `☀️ *Good Morning, ${user.username}!*\n\n`;
    message += `📊 *Your Task Summary*\n\n`;
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

    message += `\n🔗 Open SnapTask: ${process.env.FRONTEND_URL || 'https://snaptask.app'}`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send test notification
   */
  async sendTestNotification(user: IUser): Promise<boolean> {
    if (!user.phoneVerified || !user.phoneNumber) {
      throw new Error('Phone number not verified');
    }

    const phoneNumber = this.getUserPhoneNumber(user);
    if (!phoneNumber) {
      throw new Error('Failed to decrypt phone number');
    }

    const message = `👋 *Hello from SnapTask!*\n\nThis is a test notification to confirm your WhatsApp integration is working correctly.\n\nYou're all set to receive task reminders and updates! 🎉`;

    try {
      const success = await this.sendMessage(phoneNumber, message);

      if (!success) {
        throw new Error('Failed to send test notification. Please check your Twilio configuration.');
      }

      return true;
    } catch (error: any) {
      // Re-throw with user-friendly message
      if (error.message.includes('trial account')) {
        throw error; // Already has a good message
      }
      throw new Error('Failed to send test notification: ' + error.message);
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
