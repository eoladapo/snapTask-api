import { Task, ITask } from '../models/task.model';

export const create = async (task: ITask) => {
  const result = await Task.create(task);
  return result;
};

export const getAllTasks = async (userId: string) => {
  const result = await Task.find({ user: userId }).populate('user');
  return result;
};

export const getTask = async (id: string) => {
  const result = await Task.findById(id).populate('user');
  return result;
};

export const updateTask = async (id: string, task: ITask) => {
  const result = await Task.findByIdAndUpdate(id, task, { new: true });
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
