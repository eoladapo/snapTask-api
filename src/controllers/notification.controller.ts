import { Request, Response } from 'express';
import { NotificationQueue } from '../models/notificationQueue.model';
import User from '../models/user.model';
import { whatsappService } from '../services/whatsapp.service';

/**
 * Get notification history for the authenticated user
 * Returns all notifications (sent, failed, pending) ordered by most recent
 */
export const getNotificationHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Parse query parameters for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get notifications for the user, sorted by most recent
    const notifications = await NotificationQueue.find({ user: userId })
      .populate('taskId', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await NotificationQueue.countDocuments({ user: userId });

    res.status(200).json({
      message: 'Notification history fetched successfully',
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.log('Error fetching notification history', error);
    res.status(500).json({
      message: 'Internal server error, Error fetching notification history',
    });
  }
};

/**
 * Send a test WhatsApp notification to the authenticated user
 * Used to verify WhatsApp integration is working correctly
 */
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if phone is verified
    if (!user.phoneVerified || !user.phoneNumber) {
      return res.status(400).json({
        message: 'Phone number not verified. Please verify your phone number first.',
      });
    }

    // Send test notification
    await whatsappService.sendTestNotification(user);

    res.status(200).json({
      message: 'Test notification sent successfully! Check your WhatsApp.',
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      message: error.message || 'Failed to send test notification',
    });
  }
};
