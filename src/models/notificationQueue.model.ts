import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationQueue extends Document {
  user: mongoose.Types.ObjectId;
  type: 'task_reminder' | 'status_change' | 'daily_summary';
  taskId?: mongoose.Types.ObjectId;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  sentAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationQueueSchema = new Schema<INotificationQueue>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    type: {
      type: String,
      enum: ['task_reminder', 'status_change', 'daily_summary'],
      required: [true, 'Notification type is required'],
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    scheduledFor: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    sentAt: {
      type: Date,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of pending notifications by scheduled time
notificationQueueSchema.index({ scheduledFor: 1, status: 1 });

// Index for querying notifications by user
notificationQueueSchema.index({ user: 1 });

// Index for querying notifications by status
notificationQueueSchema.index({ status: 1 });

// Compound index for daily limit checks (user + status + sentAt)
notificationQueueSchema.index({ user: 1, status: 1, sentAt: 1 });

// Compound index for checking existing reminders (user + taskId + type + status)
notificationQueueSchema.index({ user: 1, taskId: 1, type: 1, status: 1 });

// TTL index to automatically delete old notifications after 30 days
notificationQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const NotificationQueue = mongoose.model<INotificationQueue>(
  'NotificationQueue',
  notificationQueueSchema
);
