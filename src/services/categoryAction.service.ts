import { Category, ICategory } from '../models/category.model';
import { Types } from 'mongoose';

/**
 * Error types for category actions
 */
export enum CategoryActionErrorType {
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface CategoryActionResult {
  success: boolean;
  message: string;
  category?: ICategory & { _id: Types.ObjectId };
  categories?: Array<ICategory & { _id: Types.ObjectId }>;
  error?: CategoryActionErrorType;
  errorDetails?: string;
  retryable?: boolean;
}

export interface CreateCategoryParams {
  name: string;
  color?: string;
}

/**
 * Service for handling AI-initiated category actions
 */
class CategoryActionService {
  /**
   * Create a new category via AI
   * @param userId - The user ID who owns the category
   * @param params - Category creation parameters
   * @returns CategoryActionResult with success status and category data
   */
  async createCategory(userId: string, params: CreateCategoryParams): Promise<CategoryActionResult> {
    try {
      // Validate user ID
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required. Please log in to create categories.',
          error: CategoryActionErrorType.PERMISSION_ERROR,
          errorDetails: 'Missing user ID',
          retryable: false,
        };
      }

      // Validate required fields
      if (!params.name || params.name.trim().length === 0) {
        return {
          success: false,
          message: 'Category name is required. Please provide a name for the category.',
          error: CategoryActionErrorType.VALIDATION_ERROR,
          errorDetails: 'Empty or missing name',
          retryable: false,
        };
      }

      // Validate name length
      if (params.name.length > 50) {
        return {
          success: false,
          message: `Category name is too long (${params.name.length} characters). Please keep it under 50 characters.`,
          error: CategoryActionErrorType.VALIDATION_ERROR,
          errorDetails: `Name length: ${params.name.length}`,
          retryable: false,
        };
      }

      // Validate color format if provided
      if (params.color && !/^#[0-9A-F]{6}$/i.test(params.color)) {
        return {
          success: false,
          message: 'Invalid color format. Please use a hex color code (e.g., #FF5733).',
          error: CategoryActionErrorType.VALIDATION_ERROR,
          errorDetails: `Invalid color: ${params.color}`,
          retryable: false,
        };
      }

      // Check if category with same name already exists
      const existingCategory = await Category.findOne({
        user: userId,
        name: params.name.trim(),
      }).lean();

      if (existingCategory) {
        return {
          success: false,
          message: `A category named "${params.name.trim()}" already exists. Please choose a different name.`,
          error: CategoryActionErrorType.DUPLICATE_CATEGORY,
          errorDetails: 'Category name already exists',
          retryable: false,
        };
      }

      // Create the category with database error handling
      let newCategory;
      try {
        newCategory = await Category.create({
          name: params.name.trim(),
          color: params.color || '#6366f1',
          user: userId,
        });
      } catch (dbError: any) {
        console.error('Database error creating category:', dbError);

        // Handle specific database errors
        if (dbError.name === 'ValidationError') {
          return {
            success: false,
            message: 'Category data validation failed. Please check your input and try again.',
            error: CategoryActionErrorType.VALIDATION_ERROR,
            errorDetails: dbError.message,
            retryable: false,
          };
        }

        if (dbError.code === 11000) {
          return {
            success: false,
            message: 'A category with this name already exists.',
            error: CategoryActionErrorType.DUPLICATE_CATEGORY,
            errorDetails: 'Duplicate key error',
            retryable: false,
          };
        }

        return {
          success: false,
          message: 'Failed to save the category to the database. Please try again in a moment.',
          error: CategoryActionErrorType.DATABASE_ERROR,
          errorDetails: dbError.message,
          retryable: true,
        };
      }

      return {
        success: true,
        message: `Category "${newCategory.name}" has been created successfully.`,
        category: newCategory.toObject() as ICategory & { _id: Types.ObjectId },
        retryable: false,
      };
    } catch (error: any) {
      console.error('Unexpected error creating category:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while creating the category. Please try again.',
        error: CategoryActionErrorType.UNKNOWN_ERROR,
        errorDetails: error.message,
        retryable: true,
      };
    }
  }
}

// Export singleton instance
export const categoryActionService = new CategoryActionService();
