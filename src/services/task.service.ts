import { Task, ITask } from '../models/task.model';

export const create = async (task: ITask) => {
  const result = await Task.create(task);
  return result;
};

export const getAllTasks = async (userId: string, categoryId?: string, taskDate?: string) => {
  const query: any = { user: userId };
  
  if (categoryId !== undefined) {
    // Support filtering by category, including null for uncategorized tasks
    query.category = categoryId === 'null' ? null : categoryId;
  }
  
  if (taskDate) {
    // Filter by taskDate - match the exact date (start of day to end of day)
    const date = new Date(taskDate);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    
    // Match tasks where:
    // 1. taskDate exists and matches the requested date, OR
    // 2. taskDate doesn't exist but createdAt matches the requested date (for backward compatibility)
    query.$or = [
      {
        taskDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
      {
        taskDate: { $exists: false },
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    ];
  }
  
  const result = await Task.find(query).populate('user').populate('category');
  return result;
};

export const getTask = async (id: string) => {
  const result = await Task.findById(id).populate('user').populate('category');
  return result;
};

export const updateTask = async (id: string, task: ITask) => {
  const result = await Task.findByIdAndUpdate(id, task, { new: true }).populate('category');
  return result;
};

export const getCategoryTasks = async (userId: string, categoryId: string) => {
  const query: any = { user: userId };
  query.category = categoryId === 'null' ? null : categoryId;
  
  const result = await Task.find(query).populate('user').populate('category');
  return result;
};

export const deleteTasks = async (id: string) => {
  const result = await Task.findByIdAndDelete(id);
  return result;
};

export const completeTask = async (id: string) => {
  const result = await Task.findByIdAndUpdate(id, { status: 'completed' }, { new: true });
  return result;
};

export const inProgressTask = async (id: string) => {
  const result = await Task.findByIdAndUpdate(id, { status: 'in-progress' }, { new: true });
  return result;
};

export const pendingTask = async (id: string) => {
  const result = await Task.findByIdAndUpdate(id, { status: 'pending' }, { new: true });
  return result;
};
