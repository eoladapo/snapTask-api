import { Task, ITask } from '../models/task.model';
import { Types } from 'mongoose';

/**
 * Error types for task actions
 */
export enum TaskActionErrorType {
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MULTIPLE_MATCHES = 'MULTIPLE_MATCHES',
  CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface TaskActionResult {
  success: boolean;
  message: string;
  task?: ITask & { _id: Types.ObjectId };
  tasks?: Array<ITask & { _id: Types.ObjectId }>;
  error?: TaskActionErrorType;
  errorDetails?: string; // Additional error context for debugging
  requiresDisambiguation?: boolean;
  disambiguationContext?: {
    originalAction: string;
    originalParams: any;
    matchedTasks: Array<ITask & { _id: Types.ObjectId }>;
  };
  requiresConfirmation?: boolean;
  confirmationContext?: {
    action: string;
    taskToDelete: ITask & { _id: Types.ObjectId };
  };
  retryable?: boolean; // Indicates if the user should retry the action
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
}

export interface UpdateStatusParams {
  taskIdentifier: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface UpdateTaskParams {
  taskIdentifier: string;
  newTitle?: string;
  newDescription?: string;
}

export interface DeleteTaskParams {
  taskIdentifier: string;
  confirmed: boolean;
}

/**
 * Service for handling AI-initiated task actions
 */
class TaskActionService {
  /**
   * Find task by identifier using exact, case-insensitive, and partial matching
   * Also handles disambiguation selection by number (e.g., "1", "2", "option 1")
   * @param userId - The user ID to filter tasks
   * @param identifier - The task title, partial title, or selection number
   * @param disambiguationTasks - Optional array of tasks from previous disambiguation
   * @returns Single task, array of tasks (for disambiguation), or null
   * @throws Error with specific message if database operation fails
   */
  async findTaskByIdentifier(
    userId: string,
    identifier: string,
    disambiguationTasks?: Array<ITask & { _id: Types.ObjectId }>
  ): Promise<ITask & { _id: Types.ObjectId } | Array<ITask & { _id: Types.ObjectId }> | null> {
    try {
      // Validate inputs
      if (!userId || !identifier) {
        throw new Error('User ID and identifier are required');
      }

      // Handle disambiguation selection by number
      if (disambiguationTasks && disambiguationTasks.length > 0) {
        // Check if identifier is a number or contains a number (e.g., "1", "option 1", "the first one")
        const numberMatch = identifier.match(/\b(\d+)\b/);
        if (numberMatch) {
          const selectedIndex = parseInt(numberMatch[1], 10) - 1; // Convert to 0-based index
          if (selectedIndex >= 0 && selectedIndex < disambiguationTasks.length) {
            return disambiguationTasks[selectedIndex];
          }
          // Invalid selection number
          throw new Error(`Invalid selection. Please choose a number between 1 and ${disambiguationTasks.length}`);
        }

        // Check if identifier matches one of the disambiguation task titles exactly
        const exactMatch = disambiguationTasks.find(
          (t) => t.title.toLowerCase() === identifier.toLowerCase()
        );
        if (exactMatch) {
          return exactMatch;
        }
      }

      // Get all user tasks with error handling
      let userTasks;
      try {
        userTasks = await Task.find({ user: userId }).lean();
      } catch (dbError: any) {
        console.error('Database error in findTaskByIdentifier:', dbError);
        throw new Error('Failed to retrieve tasks from database');
      }

      if (userTasks.length === 0) {
        return null;
      }

      // 1. Exact match
      const exactMatch = userTasks.find((t) => t.title === identifier);
      if (exactMatch) {
        return exactMatch as ITask & { _id: Types.ObjectId };
      }

      // 2. Case-insensitive exact match
      const caseInsensitiveMatch = userTasks.find(
        (t) => t.title.toLowerCase() === identifier.toLowerCase()
      );
      if (caseInsensitiveMatch) {
        return caseInsensitiveMatch as ITask & { _id: Types.ObjectId };
      }

      // 3. Partial matches (case-insensitive)
      const partialMatches = userTasks.filter((t) =>
        t.title.toLowerCase().includes(identifier.toLowerCase())
      );

      if (partialMatches.length === 1) {
        return partialMatches[0] as ITask & { _id: Types.ObjectId };
      }

      if (partialMatches.length > 1) {
        // Sort by relevance: prioritize exact word matches and status
        const sortedMatches = partialMatches.sort((a, b) => {
          // Check if identifier is a complete word in the title
          const aHasWord = new RegExp(`\\b${identifier}\\b`, 'i').test(a.title);
          const bHasWord = new RegExp(`\\b${identifier}\\b`, 'i').test(b.title);
          
          if (aHasWord && !bHasWord) return -1;
          if (!aHasWord && bHasWord) return 1;
          
          // Prioritize by status: in-progress > pending > completed
          const statusPriority = { 'in-progress': 0, 'pending': 1, 'completed': 2 };
          const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 3;
          const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 3;
          
          if (aPriority !== bPriority) return aPriority - bPriority;
          
          // Finally, sort alphabetically by title
          return a.title.localeCompare(b.title);
        });

        // Return sorted matches for disambiguation
        return sortedMatches as Array<ITask & { _id: Types.ObjectId }>;
      }

      // No match found
      return null;
    } catch (error: any) {
      console.error('Error finding task by identifier:', error);
      // Re-throw with context
      if (error.message?.includes('database') || error.message?.includes('Failed to retrieve')) {
        throw error;
      }
      throw new Error(`Failed to find task: ${error.message}`);
    }
  }

  /**
   * Format disambiguation message for multiple task matches
   * @param matches - Array of matched tasks
   * @param identifier - The original search identifier
   * @param action - The action being attempted (e.g., "update status", "delete")
   * @returns Formatted disambiguation message
   */
  formatDisambiguationMessage(
    matches: Array<ITask & { _id: Types.ObjectId }>,
    identifier: string,
    action: string
  ): string {
    const taskList = matches
      .map((t, index) => {
        const statusEmoji = {
          'pending': '⏳',
          'in-progress': '🔄',
          'completed': '✅'
        }[t.status] || '📋';
        
        return `${index + 1}. ${statusEmoji} "${t.title}" (${t.status})`;
      })
      .join('\n');

    return `I found ${matches.length} tasks matching "${identifier}". Which one would you like to ${action}?\n\n${taskList}\n\nPlease reply with the number (e.g., "1") or the exact task title.`;
  }

  /**
   * Create a new task via AI
   * @param userId - The user ID who owns the task
   * @param params - Task creation parameters
   * @returns TaskActionResult with success status and task data
   */
  async createTask(userId: string, params: CreateTaskParams): Promise<TaskActionResult> {
    try {
      // Validate user ID
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required. Please log in to create tasks.',
          error: TaskActionErrorType.PERMISSION_ERROR,
          errorDetails: 'Missing user ID',
          retryable: false,
        };
      }

      // Validate required fields
      if (!params.title || params.title.trim().length === 0) {
        return {
          success: false,
          message: 'Task title is required. Please provide a title for the task.',
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: 'Empty or missing title',
          retryable: false,
        };
      }

      // Validate title length
      if (params.title.length > 100) {
        return {
          success: false,
          message: `Task title is too long (${params.title.length} characters). Please keep it under 100 characters.`,
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: `Title length: ${params.title.length}`,
          retryable: false,
        };
      }

      // Validate description length if provided
      if (params.description && params.description.length > 500) {
        return {
          success: false,
          message: `Task description is too long (${params.description.length} characters). Please keep it under 500 characters.`,
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: `Description length: ${params.description.length}`,
          retryable: false,
        };
      }

      // Validate status if provided
      const validStatuses = ['pending', 'in-progress', 'completed'];
      if (params.status && !validStatuses.includes(params.status)) {
        return {
          success: false,
          message: `Invalid status "${params.status}". Valid statuses are: pending, in-progress, or completed.`,
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: `Invalid status: ${params.status}`,
          retryable: false,
        };
      }

      // Create the task with database error handling
      let newTask;
      try {
        newTask = await Task.create({
          title: params.title.trim(),
          description: params.description?.trim() || '',
          status: params.status || 'pending',
          user: userId,
        });
      } catch (dbError: any) {
        console.error('Database error creating task:', dbError);
        
        // Handle specific database errors
        if (dbError.name === 'ValidationError') {
          return {
            success: false,
            message: 'Task data validation failed. Please check your input and try again.',
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: dbError.message,
            retryable: false,
          };
        }

        if (dbError.code === 11000) {
          return {
            success: false,
            message: 'A task with this information already exists.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: 'Duplicate key error',
            retryable: false,
          };
        }

        return {
          success: false,
          message: 'Failed to save the task to the database. Please try again in a moment.',
          error: TaskActionErrorType.DATABASE_ERROR,
          errorDetails: dbError.message,
          retryable: true,
        };
      }

      return {
        success: true,
        message: `Task "${newTask.title}" has been created successfully with status "${newTask.status}".`,
        task: newTask.toObject() as ITask & { _id: Types.ObjectId },
        retryable: false,
      };
    } catch (error: any) {
      console.error('Unexpected error creating task:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while creating the task. Please try again.',
        error: TaskActionErrorType.UNKNOWN_ERROR,
        errorDetails: error.message,
        retryable: true,
      };
    }
  }

  /**
   * Update task status via AI
   * @param userId - The user ID who owns the task
   * @param params - Status update parameters
   * @param disambiguationTasks - Optional tasks from previous disambiguation
   * @returns TaskActionResult with success status and task data
   */
  async updateTaskStatus(
    userId: string,
    params: UpdateStatusParams,
    disambiguationTasks?: Array<ITask & { _id: Types.ObjectId }>
  ): Promise<TaskActionResult> {
    try {
      // Validate user ID
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required. Please log in to update tasks.',
          error: TaskActionErrorType.PERMISSION_ERROR,
          errorDetails: 'Missing user ID',
          retryable: false,
        };
      }

      // Validate task identifier
      if (!params.taskIdentifier || params.taskIdentifier.trim().length === 0) {
        return {
          success: false,
          message: 'Please specify which task you want to update.',
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: 'Missing task identifier',
          retryable: false,
        };
      }

      // Validate status
      const validStatuses = ['pending', 'in-progress', 'completed'];
      if (!params.status || !validStatuses.includes(params.status)) {
        return {
          success: false,
          message: `Invalid status "${params.status}". Valid statuses are: pending, in-progress, or completed.`,
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: `Invalid status: ${params.status}`,
          retryable: false,
        };
      }

      // Find the task with error handling
      let taskResult;
      try {
        taskResult = await this.findTaskByIdentifier(
          userId,
          params.taskIdentifier,
          disambiguationTasks
        );
      } catch (findError: any) {
        console.error('Error finding task for status update:', findError);
        
        if (findError.message?.includes('database')) {
          return {
            success: false,
            message: 'Failed to search for tasks. Please try again in a moment.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: findError.message,
            retryable: true,
          };
        }

        return {
          success: false,
          message: `Error finding task: ${findError.message}`,
          error: TaskActionErrorType.UNKNOWN_ERROR,
          errorDetails: findError.message,
          retryable: true,
        };
      }

      if (!taskResult) {
        return {
          success: false,
          message: `I couldn't find a task matching "${params.taskIdentifier}". Please check the task name and try again, or ask me to list your tasks.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: `No match for identifier: ${params.taskIdentifier}`,
          retryable: false,
        };
      }

      // Handle disambiguation
      if (Array.isArray(taskResult)) {
        return {
          success: false,
          message: this.formatDisambiguationMessage(
            taskResult,
            params.taskIdentifier,
            'update the status'
          ),
          error: TaskActionErrorType.MULTIPLE_MATCHES,
          errorDetails: `Found ${taskResult.length} matching tasks`,
          tasks: taskResult,
          requiresDisambiguation: true,
          disambiguationContext: {
            originalAction: 'updateTaskStatus',
            originalParams: params,
            matchedTasks: taskResult,
          },
          retryable: false,
        };
      }

      // Update the task status with database error handling
      let updatedTask;
      try {
        updatedTask = await Task.findByIdAndUpdate(
          taskResult._id,
          { status: params.status },
          { new: true, runValidators: true }
        ).lean();
      } catch (dbError: any) {
        console.error('Database error updating task status:', dbError);
        
        if (dbError.name === 'CastError') {
          return {
            success: false,
            message: 'Invalid task ID format. The task may have been deleted.',
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: dbError.message,
            retryable: false,
          };
        }

        return {
          success: false,
          message: 'Failed to update the task in the database. Please try again in a moment.',
          error: TaskActionErrorType.DATABASE_ERROR,
          errorDetails: dbError.message,
          retryable: true,
        };
      }

      if (!updatedTask) {
        return {
          success: false,
          message: `The task "${taskResult.title}" no longer exists. It may have been deleted.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: 'Task not found after update attempt',
          retryable: false,
        };
      }

      return {
        success: true,
        message: `Task "${updatedTask.title}" has been marked as ${params.status}.`,
        task: updatedTask as ITask & { _id: Types.ObjectId },
        retryable: false,
      };
    } catch (error: any) {
      console.error('Unexpected error updating task status:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while updating the task status. Please try again.',
        error: TaskActionErrorType.UNKNOWN_ERROR,
        errorDetails: error.message,
        retryable: true,
      };
    }
  }

  /**
   * Update task title and/or description via AI
   * @param userId - The user ID who owns the task
   * @param params - Task update parameters
   * @param disambiguationTasks - Optional tasks from previous disambiguation
   * @returns TaskActionResult with success status and task data
   */
  async updateTask(
    userId: string,
    params: UpdateTaskParams,
    disambiguationTasks?: Array<ITask & { _id: Types.ObjectId }>
  ): Promise<TaskActionResult> {
    try {
      // Validate user ID
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required. Please log in to update tasks.',
          error: TaskActionErrorType.PERMISSION_ERROR,
          errorDetails: 'Missing user ID',
          retryable: false,
        };
      }

      // Validate task identifier
      if (!params.taskIdentifier || params.taskIdentifier.trim().length === 0) {
        return {
          success: false,
          message: 'Please specify which task you want to update.',
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: 'Missing task identifier',
          retryable: false,
        };
      }

      // Validate that at least one field is being updated
      if (!params.newTitle && params.newDescription === undefined) {
        return {
          success: false,
          message: 'Please specify what you want to update (title or description).',
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: 'No update fields provided',
          retryable: false,
        };
      }

      // Validate title length if provided
      if (params.newTitle !== undefined) {
        if (params.newTitle.trim().length === 0) {
          return {
            success: false,
            message: 'Task title cannot be empty. Please provide a valid title.',
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: 'Empty title',
            retryable: false,
          };
        }

        if (params.newTitle.length > 100) {
          return {
            success: false,
            message: `Task title is too long (${params.newTitle.length} characters). Please keep it under 100 characters.`,
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: `Title length: ${params.newTitle.length}`,
            retryable: false,
          };
        }
      }

      // Validate description length if provided
      if (params.newDescription !== undefined && params.newDescription.length > 500) {
        return {
          success: false,
          message: `Task description is too long (${params.newDescription.length} characters). Please keep it under 500 characters.`,
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: `Description length: ${params.newDescription.length}`,
          retryable: false,
        };
      }

      // Find the task with error handling
      let taskResult;
      try {
        taskResult = await this.findTaskByIdentifier(
          userId,
          params.taskIdentifier,
          disambiguationTasks
        );
      } catch (findError: any) {
        console.error('Error finding task for update:', findError);
        
        if (findError.message?.includes('database')) {
          return {
            success: false,
            message: 'Failed to search for tasks. Please try again in a moment.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: findError.message,
            retryable: true,
          };
        }

        return {
          success: false,
          message: `Error finding task: ${findError.message}`,
          error: TaskActionErrorType.UNKNOWN_ERROR,
          errorDetails: findError.message,
          retryable: true,
        };
      }

      if (!taskResult) {
        return {
          success: false,
          message: `I couldn't find a task matching "${params.taskIdentifier}". Please check the task name and try again, or ask me to list your tasks.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: `No match for identifier: ${params.taskIdentifier}`,
          retryable: false,
        };
      }

      // Handle disambiguation
      if (Array.isArray(taskResult)) {
        return {
          success: false,
          message: this.formatDisambiguationMessage(
            taskResult,
            params.taskIdentifier,
            'update'
          ),
          error: TaskActionErrorType.MULTIPLE_MATCHES,
          errorDetails: `Found ${taskResult.length} matching tasks`,
          tasks: taskResult,
          requiresDisambiguation: true,
          disambiguationContext: {
            originalAction: 'updateTask',
            originalParams: params,
            matchedTasks: taskResult,
          },
          retryable: false,
        };
      }

      // Prepare update object
      const updateData: Partial<ITask> = {};
      if (params.newTitle) {
        updateData.title = params.newTitle.trim();
      }
      if (params.newDescription !== undefined) {
        updateData.description = params.newDescription.trim();
      }

      // Update the task with database error handling
      let updatedTask;
      try {
        updatedTask = await Task.findByIdAndUpdate(taskResult._id, updateData, {
          new: true,
          runValidators: true,
        }).lean();
      } catch (dbError: any) {
        console.error('Database error updating task:', dbError);
        
        if (dbError.name === 'ValidationError') {
          return {
            success: false,
            message: 'Task data validation failed. Please check your input and try again.',
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: dbError.message,
            retryable: false,
          };
        }

        if (dbError.name === 'CastError') {
          return {
            success: false,
            message: 'Invalid task ID format. The task may have been deleted.',
            error: TaskActionErrorType.VALIDATION_ERROR,
            errorDetails: dbError.message,
            retryable: false,
          };
        }

        return {
          success: false,
          message: 'Failed to update the task in the database. Please try again in a moment.',
          error: TaskActionErrorType.DATABASE_ERROR,
          errorDetails: dbError.message,
          retryable: true,
        };
      }

      if (!updatedTask) {
        return {
          success: false,
          message: `The task "${taskResult.title}" no longer exists. It may have been deleted.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: 'Task not found after update attempt',
          retryable: false,
        };
      }

      // Build success message
      const changes: string[] = [];
      if (params.newTitle) changes.push('title');
      if (params.newDescription !== undefined) changes.push('description');

      return {
        success: true,
        message: `Task "${updatedTask.title}" has been updated successfully (${changes.join(' and ')}).`,
        task: updatedTask as ITask & { _id: Types.ObjectId },
        retryable: false,
      };
    } catch (error: any) {
      console.error('Unexpected error updating task:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while updating the task. Please try again.',
        error: TaskActionErrorType.UNKNOWN_ERROR,
        errorDetails: error.message,
        retryable: true,
      };
    }
  }

  /**
   * Delete a task via AI
   * @param userId - The user ID who owns the task
   * @param params - Task deletion parameters
   * @param disambiguationTasks - Optional tasks from previous disambiguation
   * @param confirmationContext - Optional context for pending deletion confirmation
   * @returns TaskActionResult with success status
   */
  async deleteTask(
    userId: string,
    params: DeleteTaskParams,
    disambiguationTasks?: Array<ITask & { _id: Types.ObjectId }>,
    confirmationContext?: { taskToDelete: ITask & { _id: Types.ObjectId } }
  ): Promise<TaskActionResult> {
    try {
      // Validate user ID
      if (!userId) {
        return {
          success: false,
          message: 'Authentication required. Please log in to delete tasks.',
          error: TaskActionErrorType.PERMISSION_ERROR,
          errorDetails: 'Missing user ID',
          retryable: false,
        };
      }

      // If we have confirmation context and user confirmed, delete the task directly
      if (confirmationContext && params.confirmed) {
        const taskToDelete = confirmationContext.taskToDelete;
        
        // Verify the task still exists and belongs to the user with error handling
        let existingTask;
        try {
          existingTask = await Task.findOne({ _id: taskToDelete._id, user: userId }).lean();
        } catch (dbError: any) {
          console.error('Database error verifying task for deletion:', dbError);
          return {
            success: false,
            message: 'Failed to verify task ownership. Please try again in a moment.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: dbError.message,
            retryable: true,
          };
        }

        if (!existingTask) {
          return {
            success: false,
            message: `The task "${taskToDelete.title}" no longer exists or you don't have permission to delete it.`,
            error: TaskActionErrorType.TASK_NOT_FOUND,
            errorDetails: 'Task not found or permission denied',
            retryable: false,
          };
        }

        // Delete the task with database error handling
        let deletedTask;
        try {
          deletedTask = await Task.findByIdAndDelete(taskToDelete._id).lean();
        } catch (dbError: any) {
          console.error('Database error deleting task:', dbError);
          return {
            success: false,
            message: 'Failed to delete the task from the database. Please try again in a moment.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: dbError.message,
            retryable: true,
          };
        }

        if (!deletedTask) {
          return {
            success: false,
            message: `The task "${taskToDelete.title}" could not be deleted. It may have already been removed.`,
            error: TaskActionErrorType.TASK_NOT_FOUND,
            errorDetails: 'Task not found during deletion',
            retryable: false,
          };
        }

        return {
          success: true,
          message: `Task "${deletedTask.title}" has been deleted successfully.`,
          task: deletedTask as ITask & { _id: Types.ObjectId },
          retryable: false,
        };
      }

      // Validate task identifier
      if (!params.taskIdentifier || params.taskIdentifier.trim().length === 0) {
        return {
          success: false,
          message: 'Please specify which task you want to delete.',
          error: TaskActionErrorType.VALIDATION_ERROR,
          errorDetails: 'Missing task identifier',
          retryable: false,
        };
      }

      // Find the task with error handling
      let taskResult;
      try {
        taskResult = await this.findTaskByIdentifier(
          userId,
          params.taskIdentifier,
          disambiguationTasks
        );
      } catch (findError: any) {
        console.error('Error finding task for deletion:', findError);
        
        if (findError.message?.includes('database')) {
          return {
            success: false,
            message: 'Failed to search for tasks. Please try again in a moment.',
            error: TaskActionErrorType.DATABASE_ERROR,
            errorDetails: findError.message,
            retryable: true,
          };
        }

        return {
          success: false,
          message: `Error finding task: ${findError.message}`,
          error: TaskActionErrorType.UNKNOWN_ERROR,
          errorDetails: findError.message,
          retryable: true,
        };
      }

      if (!taskResult) {
        return {
          success: false,
          message: `I couldn't find a task matching "${params.taskIdentifier}". Please check the task name and try again, or ask me to list your tasks.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: `No match for identifier: ${params.taskIdentifier}`,
          retryable: false,
        };
      }

      // Handle disambiguation
      if (Array.isArray(taskResult)) {
        return {
          success: false,
          message: this.formatDisambiguationMessage(
            taskResult,
            params.taskIdentifier,
            'delete'
          ),
          error: TaskActionErrorType.MULTIPLE_MATCHES,
          errorDetails: `Found ${taskResult.length} matching tasks`,
          tasks: taskResult,
          requiresDisambiguation: true,
          disambiguationContext: {
            originalAction: 'deleteTask',
            originalParams: params,
            matchedTasks: taskResult,
          },
          retryable: false,
        };
      }

      // Check if deletion is confirmed
      if (!params.confirmed) {
        return {
          success: false,
          message: `Are you sure you want to delete "${taskResult.title}"? This action cannot be undone. Reply 'yes' to confirm.`,
          error: TaskActionErrorType.CONFIRMATION_REQUIRED,
          errorDetails: 'Awaiting user confirmation',
          task: taskResult,
          requiresConfirmation: true,
          confirmationContext: {
            action: 'deleteTask',
            taskToDelete: taskResult,
          },
          retryable: false,
        };
      }

      // If confirmed without prior context, delete directly with database error handling
      let deletedTask;
      try {
        deletedTask = await Task.findByIdAndDelete(taskResult._id).lean();
      } catch (dbError: any) {
        console.error('Database error deleting task:', dbError);
        return {
          success: false,
          message: 'Failed to delete the task from the database. Please try again in a moment.',
          error: TaskActionErrorType.DATABASE_ERROR,
          errorDetails: dbError.message,
          retryable: true,
        };
      }

      if (!deletedTask) {
        return {
          success: false,
          message: `The task "${taskResult.title}" could not be deleted. It may have already been removed.`,
          error: TaskActionErrorType.TASK_NOT_FOUND,
          errorDetails: 'Task not found during deletion',
          retryable: false,
        };
      }

      return {
        success: true,
        message: `Task "${deletedTask.title}" has been deleted successfully.`,
        task: deletedTask as ITask & { _id: Types.ObjectId },
        retryable: false,
      };
    } catch (error: any) {
      console.error('Unexpected error deleting task:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while deleting the task. Please try again.',
        error: TaskActionErrorType.UNKNOWN_ERROR,
        errorDetails: error.message,
        retryable: true,
      };
    }
  }
}

// Export singleton instance
export const taskActionService = new TaskActionService();
