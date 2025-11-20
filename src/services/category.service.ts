import { Category, ICategory } from '../models/category.model';
import mongoose from 'mongoose';

/**
 * Create a new category for a user
 */
export const createCategory = async (
  userId: string,
  name: string,
  color: string
): Promise<ICategory> => {
  const category = await Category.create({
    name,
    color,
    user: userId,
  });
  return category;
};

/**
 * Get all categories for a specific user
 */
export const getAllCategories = async (userId: string): Promise<ICategory[]> => {
  const categories = await Category.find({ user: userId }).sort({ createdAt: 1 });
  return categories;
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (categoryId: string): Promise<ICategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }
  const category = await Category.findById(categoryId);
  return category;
};

/**
 * Update a category
 */
export const updateCategory = async (
  categoryId: string,
  updates: { name?: string; color?: string }
): Promise<ICategory | null> => {
  const category = await Category.findByIdAndUpdate(categoryId, updates, {
    new: true,
    runValidators: true,
  });
  return category;
};

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: string): Promise<ICategory | null> => {
  const category = await Category.findByIdAndDelete(categoryId);
  return category;
};

/**
 * Check if a category name already exists for a user
 */
export const categoryNameExists = async (userId: string, name: string): Promise<boolean> => {
  const category = await Category.findOne({ user: userId, name });
  return !!category;
};

/**
 * Get category count for a user
 */
export const getCategoryCount = async (userId: string): Promise<number> => {
  const count = await Category.countDocuments({ user: userId });
  return count;
};
