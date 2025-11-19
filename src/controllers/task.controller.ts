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
import { Request, Response } from 'express';

export const createTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, status } = req.body;

    const newTask = await create({ title, description, status, user });

    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal server error, Error creating task, Please try again' });
    console.log('Error creating task', error);
  }
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    const tasks = await getAllTasks();
    if (!tasks) {
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
    const { title, description, status } = req.body as ITask;

    console.log('Update task request:', { id, title, description, status, user: user?._id });

    if (!user) {
      console.log('Update task - Unauthorized: No user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await getTask(id);

    if (!task) {
      console.log('Update task - Task not found:', id);
      return res.status(404).json({ message: 'Task not found' });
    }

    console.log('Update task - Found task:', task);

    const updatedTask = await updateTask(id, { title, description, status } as ITask);

    console.log('Update task - Updated task:', updatedTask);

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

    const complete = await completeTask(id);

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

    const inProgress = await inProgressTask(id);

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

    const pending = await pendingTask(id);

    res.status(200).json({ message: 'Task marked as pending successfully', task: pending });
  } catch (error) {
    res.status(500).json({
      message: 'Internal server error, Error marking task as completed, Please try again',
    });
  }
};
