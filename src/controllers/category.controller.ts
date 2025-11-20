import { Request, Response } from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../services/category.service';
import { Task } from '../models/task.model';
import mongoose from 'mongoose';

/**
 * POST /categories - Create a new category
 */
export const create = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, color } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ message: 'Category name cannot exceed 50 characters' });
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ message: 'Color must be a valid hex code (e.g., #FF5733)' });
    }

    // Check database-level limit: max 50 categories per user
    const MAX_CATEGORIES_PER_USER = 50;
    const categoryCount = await getAllCategories(user.toString());
    
    if (categoryCount.length >= MAX_CATEGORIES_PER_USER) {
      return res.status(429).json({ 
        message: `Maximum category limit reached (${MAX_CATEGORIES_PER_USER}). Please delete some categories before creating new ones.`,
        currentCount: categoryCount.length,
        maxAllowed: MAX_CATEGORIES_PER_USER
      });
    }

    // Create category
    const category = await createCategory(user, name.trim(), color || '#6366f1');

    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error: any) {
    // Handle duplicate category name error
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A category with this name already exists',
      });
    }

    console.error('Error creating category:', error);
    res.status(500).json({
      message: 'Internal server error, Error creating category, Please try again',
    });
  }
};

/**
 * GET /categories - Get all categories for the authenticated user
 */
export const getAll = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const categories = await getAllCategories(user.toString());

    res.status(200).json({
      message: 'Categories fetched successfully',
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      message: 'Internal server error, Error fetching categories, Please try again',
    });
  }
};

/**
 * GET /categories/:id - Get a single category by ID with ownership check
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Verify category belongs to the user
    if (category.user.toString() !== user.toString()) {
      return res.status(403).json({
        message: 'Forbidden: You do not have access to this category',
      });
    }

    res.status(200).json({
      message: 'Category fetched successfully',
      category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      message: 'Internal server error, Error fetching category, Please try again',
    });
  }
};

/**
 * PUT /categories/:id - Update a category with ownership check
 */
export const update = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, color } = req.body;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    // Check if category exists and user owns it
    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Verify category belongs to the user
    if (category.user.toString() !== user.toString()) {
      return res.status(403).json({
        message: 'Forbidden: You do not have access to this category',
      });
    }

    // Validation
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Category name cannot be empty' });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({ message: 'Category name cannot exceed 50 characters' });
      }

      updateData.name = name.trim();
    }

    if (color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({ message: 'Color must be a valid hex code (e.g., #FF5733)' });
      }

      updateData.color = color;
    }

    // Update category
    const updatedCategory = await updateCategory(id, updateData);

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error: any) {
    // Handle duplicate category name error
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A category with this name already exists',
      });
    }

    console.error('Error updating category:', error);
    res.status(500).json({
      message: 'Internal server error, Error updating category, Please try again',
    });
  }
};

/**
 * DELETE /categories/:id - Delete a category with task reassignment logic
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { reassignTo } = req.query;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    // Check if category exists and user owns it
    const category = await getCategoryById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Verify category belongs to the user
    if (category.user.toString() !== user.toString()) {
      return res.status(403).json({
        message: 'Forbidden: You do not have access to this category',
      });
    }

    // Check if there are tasks associated with this category
    const tasksWithCategory = await Task.countDocuments({ category: id });

    if (tasksWithCategory > 0) {
      // If reassignTo is provided, validate and reassign
      if (reassignTo) {
        if (reassignTo !== 'null' && !mongoose.Types.ObjectId.isValid(reassignTo as string)) {
          return res.status(400).json({ message: 'Invalid reassignment category ID' });
        }

        // If reassigning to another category, verify it exists and user owns it
        if (reassignTo !== 'null') {
          const targetCategory = await getCategoryById(reassignTo as string);

          if (!targetCategory) {
            return res.status(404).json({ message: 'Target category not found' });
          }

          if (targetCategory.user.toString() !== user.toString()) {
            return res.status(403).json({
              message: 'Forbidden: You do not have access to the target category',
            });
          }
        }

        // Reassign tasks
        const newCategoryValue = reassignTo === 'null' ? null : reassignTo;
        await Task.updateMany({ category: id }, { category: newCategoryValue });
      } else {
        // No reassignment specified, return error with task count
        return res.status(400).json({
          message: `Cannot delete category with ${tasksWithCategory} associated task(s). Please reassign tasks first.`,
          taskCount: tasksWithCategory,
        });
      }
    }

    // Delete the category
    await deleteCategory(id);

    res.status(200).json({
      message: 'Category deleted successfully',
      tasksReassigned: tasksWithCategory,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      message: 'Internal server error, Error deleting category, Please try again',
    });
  }
};
