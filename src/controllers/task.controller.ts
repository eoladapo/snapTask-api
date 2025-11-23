import { ITask } from '../models/task.model';
import {
  completeTask,
  create,
  deleteTasks,
  getAllTasks,
  getTask,
  inProgressTask,
  pendingTask,
  updateTask,
} from '../services/task.service';
import { getCategoryById } from '../services/category.service';
import { notificationSchedulerService } from '../services/notificationScheduler.service';
import { Request, Response } from 'express';

// Helper function to extract user ID from task.user (handles both populated and non-populated)
const getTaskUserId = (taskUser: any): string => {
  return typeof taskUser === 'object' && taskUser._id ? taskUser._id.toString() : taskUser.toString();
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, status, category, taskDate } = req.body;

    // Validate category ownership if category is provided
    if (category) {
      const categoryDoc = await getCategoryById(category);
      
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Verify category belongs to the user
      if (categoryDoc.user.toString() !== user.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this category' });
      }
    }

    const newTask = await create({ title, description, status, category, taskDate, user });

    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error creating task, Please try again' });
    console.log('Error creating task', error);
  }
};

export const getAll = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get category and date filters from query parameters
    const categoryId = req.query.category as string | undefined;
    const taskDate = req.query.date as string | undefined;

    // Validate category ownership if category filter is provided
    if (categoryId && categoryId !== 'null') {
      const categoryDoc = await getCategoryById(categoryId);
      
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Verify category belongs to the user
      if (categoryDoc.user.toString() !== user.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this category' });
      }
    }

    const tasks = await getAllTasks(user, categoryId, taskDate);
    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: 'No tasks found' });
    }
    res.status(200).json({ message: 'Tasks fetched successfully', tasks });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error fetching tasks, Please try again' });
    console.log('Error fetching tasks', error);
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    res.status(200).json({ message: 'Task fetched successfully', task });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error fetching task, Please try again' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { title, description, status, category, taskDate } = req.body as ITask;

    console.log('Update task request:', { id, title, description, status, category, user: user?._id });

    if (!user) {
      console.log('Update task - Unauthorized: No user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      console.log('Update task - Task not found:', id);
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    // Validate new category ownership if category is being changed
    if (category !== undefined && category !== null) {
      const categoryDoc = await getCategoryById(category.toString());
      
      if (!categoryDoc) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Verify category belongs to the user
      if (categoryDoc.user.toString() !== user.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this category' });
      }
    }

    console.log('Update task - Found task:', task);

    // Store old status for notification
    const oldStatus = task.status;

    const updatedTask = await updateTask(id, { title, description, status, category, taskDate } as ITask);

    console.log('Update task - Updated task:', updatedTask);

    // Send notification if status changed to in-progress or completed
    if (status && status !== oldStatus && (status === 'in-progress' || status === 'completed')) {
      // Schedule notification asynchronously (don't wait for it)
      notificationSchedulerService
        .scheduleStatusChangeNotification(user.toString(), id, oldStatus, status)
        .catch((error) => {
          console.error('Error scheduling status change notification:', error);
        });
    }

    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.log('Error updating task', error);
    res
      .status(500)
      .json({ message: 'Internal server error, Error updating task, Please try again' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    await deleteTasks(id);

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error deleting task, Please try again' });
  }
};

export const markAsCompleted = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    // Store old status for notification
    const oldStatus = task.status;

    const complete = await completeTask(id);

    // Send notification if status changed to completed
    if (oldStatus !== 'completed') {
      // Schedule notification asynchronously (don't wait for it)
      notificationSchedulerService
        .scheduleStatusChangeNotification(user.toString(), id, oldStatus, 'completed')
        .catch((error) => {
          console.error('Error scheduling status change notification:', error);
        });
    }

    res.status(200).json({ message: 'Task marked as completed successfully', task: complete });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error, Error marking task as completed, Please try again',
    });
  }
};

export const markAsInProgress = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    // Store old status for notification
    const oldStatus = task.status;

    const inProgress = await inProgressTask(id);

    // Send notification if status changed to in-progress
    if (oldStatus !== 'in-progress') {
      // Schedule notification asynchronously (don't wait for it)
      notificationSchedulerService
        .scheduleStatusChangeNotification(user.toString(), id, oldStatus, 'in-progress')
        .catch((error) => {
          console.error('Error scheduling status change notification:', error);
        });
    }

    res.status(200).json({ message: 'Task marked as in progress successfully', task: inProgress });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error, Error marking task as completed, Please try again',
    });
  }
};

export const markAsPending = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify task belongs to the user
    if (getTaskUserId(task.user) !== user.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task' });
    }

    const pending = await pendingTask(id);

    res.status(200).json({ message: 'Task marked as pending successfully', task: pending });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error, Error marking task as completed, Please try again',
    });
  }
};
