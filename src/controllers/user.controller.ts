import { Request, Response } from 'express';
import User from '../models/user.model';
import { Task } from '../models/task.model';
import { Category } from '../models/category.model';

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

    res.status(200).json({ message: 'Profile fetched successfully', user });
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
