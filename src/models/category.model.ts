import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  color: string;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Category color is required'],
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code (e.g., #FF5733)'],
      default: '#6366f1', // Default indigo color
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique category names per user
categorySchema.index({ user: 1, name: 1 }, { unique: true });

// Index for faster queries by user
categorySchema.index({ user: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
