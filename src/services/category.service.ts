import { Category, ICategory } from '../models/category.model';
import mongoose from 'mongoose';

/**
 * Create a new category for a user
 * @param categoryData - Category data including name, color, and user
 * @returns Created category document
 */
export const createCategory = async (categoryData: Partial<ICategory>): Promise<ICategory> => {
  const category = await Category.create(categoryData);
  return category;
};

/**
 * Get all categories for a specific user
 * @param userId - User ID to filter categories
 * @returns Array of categories belonging to the user
 */
export const getAllCategories = async (userId: string): Promise<ICategory[]> => {
  const categories = await Category.find({ user: userId }).sort({ createdAt: -1 });
  return categories;
};

/**
 * Get a single category by ID
 * @param categoryId - Category ID
 * @returns Category document or null if not found
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
 * @param categoryId - Category ID to update
 * @param updateData - Data to update (name and/or color)
 * @returns Updated category document or null if not found
 */
export const updateCategory = async (
  categoryId: string,
  updateData: Partial<Pick<ICategory, 'name' | 'color'>>
): Promise<ICategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }
  const category = await Category.findByIdAndUpdate(
    categoryId,
    updateData,
    { new: true, runValidators: true }
  );
  return category;
};

/**
 * Delete a category
 * @param categoryId - Category ID to delete
 * @returns Deleted category document or null if not found
 */
export const deleteCategory = async (categoryId: string): Promise<ICategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }
  const category = await Category.findByIdAndDelete(categoryId);
  return category;
};
