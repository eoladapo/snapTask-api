import { Schema, model } from 'mongoose';

export interface ITask {
  title: string;
  description: string;
  status: string;
  user: Schema.Types.ObjectId;
  category?: Schema.Types.ObjectId;
  dueDate?: Date;
  taskDate?: Date; // Date this task belongs to (for daily organization)
  createdAt?: Date;
  updatedAt?: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    dueDate: {
      type: Date,
    },
    taskDate: {
      type: Date,
      default: () => {
        // Set to start of current day in user's timezone
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      },
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes
// Index for efficient querying by user
taskSchema.index({ user: 1 });

// Compound index for user + status queries (most common filter)
taskSchema.index({ user: 1, status: 1 });

// Compound index for user + category queries (category filtering)
taskSchema.index({ user: 1, category: 1 });

// Index for due date queries (notification scheduling)
taskSchema.index({ dueDate: 1, status: 1 });

// Compound index for notification queries (tasks due soon that aren't completed)
taskSchema.index({ dueDate: 1, status: 1, user: 1 });

// Index for taskDate queries (daily task organization)
taskSchema.index({ user: 1, taskDate: 1 });

export const Task = model<ITask>('Task', taskSchema);
