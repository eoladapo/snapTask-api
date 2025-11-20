import { Request, Response } from 'express';
import User from '../models/user.model';
import { Task } from '../models/task.model';
import { Category } from '../models/category.model';
import { encrypt, decrypt } from '../utils/encryption';
import {
  generateAndStoreCode,
  validateVerificationCode,
} from '../services/phoneVerification.service';

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Decrypt phone number if it exists
    const userObject = user.toObject();
    if (userObject.phoneNumber) {
      try {
        userObject.phoneNumber = decrypt(userObject.phoneNumber);
      } catch (error) {
        console.log('Error decrypting phone number', error);
        // If decryption fails, remove the phone number from response
        userObject.phoneNumber = undefined;
      }
    }

    res.status(200).json({ message: 'Profile fetched successfully', user: userObject });
  } catch (error) {
    console.log('Error fetching profile', error);
    res.status(500).json({ message: 'Internal server error, Error fetching profile' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;
    const { username, bio, profilePicture } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.log('Error updating profile', error);
    res.status(500).json({ message: 'Internal server error, Error updating profile' });
  }
};

// Get user statistics
export const getStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all user tasks
    const tasks = await Task.find({ user: userId });

    // Calculate overall statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get current date info
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Weekly statistics
    const weeklyTasks = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const createdAt = new Date(t.createdAt);
      return createdAt >= startOfWeek;
    });
    const weeklyCompleted = weeklyTasks.filter((t) => t.status === 'completed').length;

    // Monthly statistics
    const monthlyTasks = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const createdAt = new Date(t.createdAt);
      return createdAt >= startOfMonth;
    });
    const monthlyCompleted = monthlyTasks.filter((t) => t.status === 'completed').length;

    // Yearly statistics
    const yearlyTasks = tasks.filter((t) => {
      if (!t.createdAt) return false;
      const createdAt = new Date(t.createdAt);
      return createdAt >= startOfYear;
    });
    const yearlyCompleted = yearlyTasks.filter((t) => t.status === 'completed').length;

    // Daily completion trend (current week: Mon-Sun)
    const dailyTrend = [];
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Adjust so Monday = 0
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - daysFromMonday + i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayTasks = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdAt = new Date(t.createdAt);
        return createdAt >= date && createdAt < nextDate;
      });

      const dayCompleted = dayTasks.filter((t) => t.status === 'completed').length;

      dailyTrend.push({
        date: date.toISOString().split('T')[0],
        completed: dayCompleted,
        total: dayTasks.length,
      });
    }

    // Weekly completion trend (last 4 weeks)
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() + (i * 7)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const weekTasks = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdAt = new Date(t.createdAt);
        return createdAt >= weekStart && createdAt < weekEnd;
      });

      const weekCompleted = weekTasks.filter((t) => t.status === 'completed').length;

      weeklyTrend.push({
        week: `Week ${4 - i}`,
        completed: weekCompleted,
        total: weekTasks.length,
      });
    }

    // Monthly completion trend (last 6 months)
    const monthlyTrend = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthTasks = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdAt = new Date(t.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const monthCompleted = monthTasks.filter((t) => t.status === 'completed').length;

      monthlyTrend.push({
        month: monthNames[monthStart.getMonth()],
        completed: monthCompleted,
        total: monthTasks.length,
      });
    }

    // Get all user categories
    const categories = await Category.find({ user: userId });

    // Calculate category breakdown
    const categoryBreakdown = await Promise.all(
      categories.map(async (category) => {
        const categoryId = category._id?.toString();
        const categoryTasks = tasks.filter(
          (t) => t.category && t.category.toString() === categoryId
        );
        const categoryCompleted = categoryTasks.filter((t) => t.status === 'completed').length;
        const categoryTotal = categoryTasks.length;
        const categoryCompletionRate = categoryTotal > 0 ? Math.round((categoryCompleted / categoryTotal) * 100) : 0;

        return {
          categoryId: categoryId,
          categoryName: category.name,
          categoryColor: category.color,
          totalTasks: categoryTotal,
          completedTasks: categoryCompleted,
          pendingTasks: categoryTasks.filter((t) => t.status === 'pending').length,
          inProgressTasks: categoryTasks.filter((t) => t.status === 'in-progress').length,
          completionRate: categoryCompletionRate,
        };
      })
    );

    // Add uncategorized tasks
    const uncategorizedTasks = tasks.filter((t) => !t.category);
    const uncategorizedCompleted = uncategorizedTasks.filter((t) => t.status === 'completed').length;
    const uncategorizedTotal = uncategorizedTasks.length;
    const uncategorizedCompletionRate = uncategorizedTotal > 0 ? Math.round((uncategorizedCompleted / uncategorizedTotal) * 100) : 0;

    if (uncategorizedTotal > 0) {
      categoryBreakdown.push({
        categoryId: undefined,
        categoryName: 'Uncategorized',
        categoryColor: '#9ca3af',
        totalTasks: uncategorizedTotal,
        completedTasks: uncategorizedCompleted,
        pendingTasks: uncategorizedTasks.filter((t) => t.status === 'pending').length,
        inProgressTasks: uncategorizedTasks.filter((t) => t.status === 'in-progress').length,
        completionRate: uncategorizedCompletionRate,
      });
    }

    const statistics = {
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate,
      },
      periods: {
        week: {
          total: weeklyTasks.length,
          completed: weeklyCompleted,
          completionRate: weeklyTasks.length > 0 ? Math.round((weeklyCompleted / weeklyTasks.length) * 100) : 0,
        },
        month: {
          total: monthlyTasks.length,
          completed: monthlyCompleted,
          completionRate: monthlyTasks.length > 0 ? Math.round((monthlyCompleted / monthlyTasks.length) * 100) : 0,
        },
        year: {
          total: yearlyTasks.length,
          completed: yearlyCompleted,
          completionRate: yearlyTasks.length > 0 ? Math.round((yearlyCompleted / yearlyTasks.length) * 100) : 0,
        },
      },
      trends: {
        daily: dailyTrend,
        weekly: weeklyTrend,
        monthly: monthlyTrend,
      },
      categoryBreakdown,
    };

    res.status(200).json({ message: 'Statistics fetched successfully', statistics });
  } catch (error) {
    console.log('Error fetching statistics', error);
    res.status(500).json({ message: 'Internal server error, Error fetching statistics' });
  }
};

/**
 * Validate phone number format (E.164)
 * E.164 format: +[country code][subscriber number]
 * Example: +14155552671
 * @param phoneNumber - The phone number to validate
 * @returns true if valid, false otherwise
 */
function isValidE164PhoneNumber(phoneNumber: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

// Add or update phone number
export const updatePhoneNumber = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;
    const { phoneNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate phone number is provided
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Validate E.164 format
    if (!isValidE164PhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: 'Invalid phone number format. Please use E.164 format (e.g., +14155552671)',
      });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Encrypt the phone number before saving
    const encryptedPhone = encrypt(phoneNumber);

    // Check if phone number is being changed
    const isPhoneChanged = user.phoneNumber !== encryptedPhone;

    // Update phone number and reset verification status if changed
    user.phoneNumber = encryptedPhone;
    if (isPhoneChanged) {
      user.phoneVerified = false;
    }

    await user.save();

    // Generate and store verification code
    const verificationCode = await generateAndStoreCode(userId, phoneNumber);

    // Send verification code via WhatsApp
    const { whatsappService } = await import('../services/whatsapp.service');
    const sent = await whatsappService.sendVerificationCode(phoneNumber, verificationCode);

    if (!sent) {
      console.warn(`Failed to send verification code to ${phoneNumber}. Code: ${verificationCode}`);
      // Still return success but log the failure
      // In development, return the code in response
      if (process.env.NODE_ENV === 'development') {
        console.log(`Verification code for ${phoneNumber}: ${verificationCode}`);
      }
    }

    res.status(200).json({
      message: sent
        ? 'Phone number updated successfully. Verification code sent via WhatsApp.'
        : 'Phone number updated. Please check console for verification code (WhatsApp service unavailable).',
      phoneNumber: phoneNumber, // Return unencrypted for display
      phoneVerified: false,
      // Only return code in development if WhatsApp failed
      verificationCode:
        process.env.NODE_ENV === 'development' && !sent ? verificationCode : undefined,
    });
  } catch (error) {
    console.log('Error updating phone number', error);
    res.status(500).json({
      message: 'Internal server error, Error updating phone number',
    });
  }
};

// Verify phone number with code
export const verifyPhoneNumber = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate code is provided
    if (!code) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a phone number
    if (!user.phoneNumber) {
      return res.status(400).json({ message: 'No phone number to verify' });
    }

    // Decrypt the phone number
    const phoneNumber = decrypt(user.phoneNumber);

    // Validate the verification code
    const isValid = await validateVerificationCode(userId, phoneNumber, code);

    if (!isValid) {
      return res.status(400).json({
        message: 'Invalid or expired verification code',
      });
    }

    // Mark phone as verified
    user.phoneVerified = true;
    await user.save();

    res.status(200).json({
      message: 'Phone number verified successfully',
      phoneNumber: phoneNumber,
      phoneVerified: true,
    });
  } catch (error) {
    console.log('Error verifying phone number', error);
    res.status(500).json({
      message: 'Internal server error, Error verifying phone number',
    });
  }
};

/**
 * Validate time format (HH:MM)
 * @param time - The time string to validate
 * @returns true if valid, false otherwise
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

// Get notification preferences
export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('notificationPreferences');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Notification preferences fetched successfully',
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    console.log('Error fetching notification preferences', error);
    res.status(500).json({
      message: 'Internal server error, Error fetching notification preferences',
    });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user;
    const {
      whatsappEnabled,
      taskReminders,
      statusUpdates,
      dailySummary,
      quietHoursStart,
      quietHoursEnd,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate boolean values if provided
    if (whatsappEnabled !== undefined && typeof whatsappEnabled !== 'boolean') {
      return res.status(400).json({
        message: 'whatsappEnabled must be a boolean value',
      });
    }

    if (taskReminders !== undefined && typeof taskReminders !== 'boolean') {
      return res.status(400).json({
        message: 'taskReminders must be a boolean value',
      });
    }

    if (statusUpdates !== undefined && typeof statusUpdates !== 'boolean') {
      return res.status(400).json({
        message: 'statusUpdates must be a boolean value',
      });
    }

    if (dailySummary !== undefined && typeof dailySummary !== 'boolean') {
      return res.status(400).json({
        message: 'dailySummary must be a boolean value',
      });
    }

    // Validate quiet hours format if provided
    if (quietHoursStart !== undefined && quietHoursStart !== null) {
      if (typeof quietHoursStart !== 'string' || !isValidTimeFormat(quietHoursStart)) {
        return res.status(400).json({
          message: 'quietHoursStart must be in HH:MM format (e.g., 22:00)',
        });
      }
    }

    if (quietHoursEnd !== undefined && quietHoursEnd !== null) {
      if (typeof quietHoursEnd !== 'string' || !isValidTimeFormat(quietHoursEnd)) {
        return res.status(400).json({
          message: 'quietHoursEnd must be in HH:MM format (e.g., 08:00)',
        });
      }
    }

    // Validate that both quiet hours are provided together or both are null
    const hasQuietHoursStart = quietHoursStart !== undefined && quietHoursStart !== null;
    const hasQuietHoursEnd = quietHoursEnd !== undefined && quietHoursEnd !== null;

    if (hasQuietHoursStart !== hasQuietHoursEnd) {
      return res.status(400).json({
        message: 'Both quietHoursStart and quietHoursEnd must be provided together or both must be null',
      });
    }

    // Update notification preferences
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        whatsappEnabled: false,
        taskReminders: true,
        statusUpdates: true,
        dailySummary: false,
      };
    }

    if (whatsappEnabled !== undefined) {
      user.notificationPreferences.whatsappEnabled = whatsappEnabled;
    }

    if (taskReminders !== undefined) {
      user.notificationPreferences.taskReminders = taskReminders;
    }

    if (statusUpdates !== undefined) {
      user.notificationPreferences.statusUpdates = statusUpdates;
    }

    if (dailySummary !== undefined) {
      user.notificationPreferences.dailySummary = dailySummary;
    }

    if (quietHoursStart !== undefined) {
      user.notificationPreferences.quietHoursStart = quietHoursStart;
    }

    if (quietHoursEnd !== undefined) {
      user.notificationPreferences.quietHoursEnd = quietHoursEnd;
    }

    await user.save();

    res.status(200).json({
      message: 'Notification preferences updated successfully',
      notificationPreferences: user.notificationPreferences,
    });
  } catch (error) {
    console.log('Error updating notification preferences', error);
    res.status(500).json({
      message: 'Internal server error, Error updating notification preferences',
    });
  }
};
