import { Category, ICategory } from '../models/category.model';
import mongoose from 'mongoose';
import { cache, cacheKeys } from '../utils/cache';

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

  // Invalidate user's category cache
  cache.delete(cacheKeys.userCategories(userId));
  cache.delete(cacheKeys.userCategoryCount(userId));

  return category;
};

/**
 * Get all categories for a specific user
 */
export const getAllCategories = async (userId: string): Promise<ICategory[]> => {
  // Check cache first
  const cacheKey = cacheKeys.userCategories(userId);
  const cached = cache.get<ICategory[]>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from database
  const categories = await Category.find({ user: userId }).sort({ createdAt: 1 });

  // Store in cache for 5 minutes
  cache.set(cacheKey, categories, 5 * 60 * 1000);

  return categories;
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (categoryId: string): Promise<ICategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  // Check cache first
  const cacheKey = cacheKeys.category(categoryId);
  const cached = cache.get<ICategory>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from database
  const category = await Category.findById(categoryId);

  if (category) {
    // Store in cache for 5 minutes
    cache.set(cacheKey, category, 5 * 60 * 1000);
  }

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

  if (category) {
    // Invalidate caches
    cache.delete(cacheKeys.category(categoryId));
    cache.delete(cacheKeys.userCategories(category.user.toString()));
  }

  return category;
};

/**
 * Delete a category
 */
export const deleteCategory = async (categoryId: string): Promise<ICategory | null> => {
  const category = await Category.findByIdAndDelete(categoryId);

  if (category) {
    // Invalidate caches
    cache.delete(cacheKeys.category(categoryId));
    cache.delete(cacheKeys.userCategories(category.user.toString()));
    cache.delete(cacheKeys.userCategoryCount(category.user.toString()));
  }

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
  // Check cache first
  const cacheKey = cacheKeys.userCategoryCount(userId);
  const cached = cache.get<number>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  // Fetch from database
  const count = await Category.countDocuments({ user: userId });

  // Store in cache for 5 minutes
  cache.set(cacheKey, count, 5 * 60 * 1000);

  return count;
};
