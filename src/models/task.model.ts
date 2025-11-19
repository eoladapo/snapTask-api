import { Schema, model } from 'mongoose';

export interface ITask {
  title: string;
  description: string;
  status: string;
  user: Schema.Types.ObjectId;
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
  },
  {
    timestamps: true,
  }
);

export const Task = model<ITask>('Task', taskSchema);
