import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';
import { ITask } from '../models/task.model';
import { taskActionService, TaskActionResult } from './taskAction.service';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

export interface TaskContext {
  totalTasks: number;
  pendingTasks: ITask[];
  inProgressTasks: ITask[];
  completedTasks: ITask[];
}

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// Function declarations for Gemini function calling
const functionDeclarations = [
  {
    name: 'createTask',
    description: 'Creates a new task for the user',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        title: {
          type: 'STRING' as const,
          description: 'The title of the task (required, max 100 characters)',
        },
        description: {
          type: 'STRING' as const,
          description: 'Detailed description of the task (optional, max 500 characters)',
        },
        status: {
          type: 'STRING' as const,
          description: "Initial status of the task (optional, defaults to 'pending')",
          enum: ['pending', 'in-progress', 'completed'],
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateTaskStatus',
    description: 'Updates the status of an existing task',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        taskIdentifier: {
          type: 'STRING' as const,
          description: 'The title or partial title of the task to update',
        },
        status: {
          type: 'STRING' as const,
          description: 'The new status for the task',
          enum: ['pending', 'in-progress', 'completed'],
        },
      },
      required: ['taskIdentifier', 'status'],
    },
  },
  {
    name: 'updateTask',
    description: 'Updates the title and/or description of an existing task',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        taskIdentifier: {
          type: 'STRING' as const,
          description: 'The title or partial title of the task to update',
        },
        newTitle: {
          type: 'STRING' as const,
          description: 'The new title for the task (optional)',
        },
        newDescription: {
          type: 'STRING' as const,
          description: 'The new description for the task (optional)',
        },
      },
      required: ['taskIdentifier'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Deletes an existing task',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        taskIdentifier: {
          type: 'STRING' as const,
          description: 'The title or partial title of the task to delete',
        },
        confirmed: {
          type: 'BOOLEAN' as const,
          description: 'Whether the user has confirmed the deletion',
        },
      },
      required: ['taskIdentifier', 'confirmed'],
    },
  },
];

// Tools configuration for Gemini
const tools = [
  {
    functionDeclarations,
  },
];

export const initializeGemini = (): boolean => {
  try {
    const apiKey = config.GEMINI_API_KEY;
    const modelName = config.GEMINI_MODEL || 'gemini-pro';

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.error('❌ Gemini API key is missing or not configured');
      return false;
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: modelName });

    console.log(`✅ Gemini AI initialized successfully with model: ${modelName}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error);
    return false;
  }
};

export const isGeminiAvailable = (): boolean => {
  return genAI !== null && model !== null;
};

export const getGeminiModel = () => {
  if (!model) {
    throw new Error('Gemini AI is not initialized. Please check your API key configuration.');
  }
  return model;
};

export const buildSystemPrompt = (taskContext: TaskContext): string => {
  const { totalTasks, pendingTasks, inProgressTasks, completedTasks } = taskContext;

  // Format task lists
  const formatTaskList = (tasks: ITask[], status: string): string => {
    if (tasks.length === 0) return `No ${status} tasks.`;
    return tasks
      .map((task, index) => `${index + 1}. "${task.title}" - ${task.description}`)
      .join('\n');
  };

  const systemPrompt = `You are a helpful task management assistant. You help users understand and manage their tasks through conversation and can perform task actions on their behalf.

Current Task Summary:
- Total Tasks: ${totalTasks}
- Pending: ${pendingTasks.length}
- In Progress: ${inProgressTasks.length}
- Completed: ${completedTasks.length}

Task Details:

PENDING TASKS:
${formatTaskList(pendingTasks, 'pending')}

IN-PROGRESS TASKS:
${formatTaskList(inProgressTasks, 'in-progress')}

COMPLETED TASKS:
${formatTaskList(completedTasks, 'completed')}

=== TASK ACTION CAPABILITIES ===

You have access to four functions to manage tasks:

1. createTask(title, description?, status?)
   - Use when: User wants to add, create, or make a new task
   - Examples: "create a task to buy groceries", "add a new task called meeting prep", "make a task for the project"
   - Required: title (extract from user message)
   - Optional: description (any additional details), status (defaults to 'pending')

2. updateTaskStatus(taskIdentifier, status)
   - Use when: User wants to change task status, mark as complete/in-progress/pending, or start/finish a task
   - Examples: "mark the coding task as complete", "set groceries to in progress", "complete the meeting task"
   - Status values: 'pending', 'in-progress', 'completed'
   - Common phrases: "mark as done/complete/finished" → 'completed', "start/begin/working on" → 'in-progress', "reset/undo" → 'pending'

3. updateTask(taskIdentifier, newTitle?, newDescription?)
   - Use when: User wants to rename, edit, change, or update task details
   - Examples: "rename the first task to New Title", "update the description of coding task", "change the title"
   - At least one of newTitle or newDescription must be provided

4. deleteTask(taskIdentifier, confirmed)
   - Use when: User wants to remove, delete, or get rid of a task
   - Examples: "delete the old task", "remove the completed task", "get rid of the meeting task"
   - IMPORTANT: Always set confirmed=false on first call to request confirmation
   - Only set confirmed=true after user explicitly confirms (handled automatically by system)

=== TASK IDENTIFICATION GUIDELINES ===

When identifying tasks from user messages:
- Extract the most specific identifier possible (full or partial task title)
- Look for quoted text: "buy groceries" → use "buy groceries"
- Look for descriptive phrases: "the coding task" → use "coding"
- Look for positional references: "the first task" → use the title of the first task in the list
- Look for status-based references: "the completed task" → use title from completed tasks
- Be flexible with partial matches: "grocery" can match "buy groceries"

=== HANDLING NATURAL LANGUAGE PATTERNS ===

Recognize these common patterns:

CREATE patterns:
- "create/add/make a task [to/for/called] [title]"
- "new task: [title]"
- "remind me to [title]"
- "I need to [title]"

STATUS UPDATE patterns:
- "mark/set [task] as [status]"
- "complete/finish [task]"
- "start/begin [task]"
- "[task] is done/finished"
- "I completed [task]"

UPDATE patterns:
- "rename/change [task] to [new title]"
- "update [task] description to [new description]"
- "edit [task]"

DELETE patterns:
- "delete/remove [task]"
- "get rid of [task]"
- "I don't need [task] anymore"

MULTI-STEP patterns:
- "create a task called [title] and mark it as in progress" → call createTask with status='in-progress'
- "complete [task] and create a new one for [title]" → call updateTaskStatus then createTask

=== HANDLING AMBIGUOUS REQUESTS ===

When a task identifier matches multiple tasks:
1. The system will return a disambiguation message with matched tasks
2. Present the options clearly to the user: "I found multiple tasks matching '[identifier]'. Which one did you mean?"
3. List the matched tasks with numbers: "1. [Task Title 1], 2. [Task Title 2]"
4. Wait for user to specify which task (by number or more specific identifier)
5. The system will handle the follow-up automatically

When no tasks match:
1. Inform the user politely: "I couldn't find a task matching '[identifier]'"
2. Suggest alternatives: "Did you mean one of these tasks?" (list similar tasks)
3. Offer to create a new task if appropriate

When request is unclear:
1. Ask clarifying questions: "Which task would you like me to update?"
2. Provide context: "You have [X] pending tasks. Which one are you referring to?"
3. Suggest specific actions: "Would you like me to create a new task or update an existing one?"

=== CONFIRMATION FLOWS ===

For DELETE operations:
1. ALWAYS request confirmation first (set confirmed=false)
2. The system will ask: "Are you sure you want to delete '[task title]'? This action cannot be undone."
3. Wait for user confirmation (yes/confirm/ok/etc.)
4. The system automatically handles the confirmed deletion
5. Never delete without confirmation

For other operations:
1. Execute immediately (no confirmation needed for create/update)
2. Provide clear feedback: "I've created/updated/marked [task] as [status]"
3. Include task details in confirmation: "Task '[title]' has been marked as completed"

=== ERROR HANDLING ===

When function calls fail:
1. Read the error message from the function response
2. Explain the error in user-friendly terms
3. Suggest corrective actions when possible
4. Examples:
   - "Task not found" → "I couldn't find that task. Here are your current tasks..."
   - "Validation error" → "I need more information. Please provide a task title."
   - "Permission error" → "You don't have permission to modify this task."

=== GENERAL GUIDELINES ===

- Be concise and actionable
- Reference specific tasks by title when making recommendations
- Suggest prioritization based on task status
- Encourage users to break down complex tasks
- Maintain a friendly, supportive tone
- If asked about tasks that don't exist, politely clarify
- Keep responses brief (2-3 sentences unless more detail is requested)
- Always confirm actions with specific details (task title, new status, etc.)
- Use natural, conversational language in responses
- Proactively use functions when user intent is clear
- Don't ask for permission to use functions - just use them when appropriate`;

  return systemPrompt;
};

export const formatConversationHistory = (
  history: Array<{ role: string; content: string }>
): any[] => {
  return history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
};

/**
 * Detect if user message is a confirmation response
 * @param message - User message to check
 * @returns true if message indicates confirmation
 */
const isConfirmationResponse = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase().trim();
  const confirmationPatterns = [
    /^yes$/,
    /^yeah$/,
    /^yep$/,
    /^yup$/,
    /^sure$/,
    /^ok$/,
    /^okay$/,
    /^confirm$/,
    /^confirmed$/,
    /^do it$/,
    /^go ahead$/,
    /^proceed$/,
    /^delete it$/,
    /^yes,?\s*(please|do it|go ahead)?$/,
  ];
  
  return confirmationPatterns.some(pattern => pattern.test(normalizedMessage));
};

/**
 * Execute function calls from Gemini
 * @param functionCalls - Array of function calls from Gemini
 * @param userId - The user ID for task operations
 * @param conversationContext - Optional context from previous interaction (disambiguation or confirmation)
 * @returns Array of function responses with updated context
 */
const executeFunctionCalls = async (
  functionCalls: any[],
  userId: string,
  conversationContext?: any
): Promise<{ responses: any[]; newConversationContext?: any }> => {
  const functionResponses = [];
  let newConversationContext: any = undefined;

  for (const functionCall of functionCalls) {
    const { name, args } = functionCall;
    let result: TaskActionResult;

    try {
      // Validate user ID before executing any function
      if (!userId) {
        functionResponses.push({
          name,
          response: {
            success: false,
            message: 'Authentication required. Please log in to perform this action.',
            error: 'PERMISSION_ERROR',
            retryable: false,
          },
        });
        continue;
      }

      // Extract disambiguation and confirmation contexts
      const disambiguationTasks = conversationContext?.matchedTasks;
      const confirmationContext = conversationContext?.taskToDelete 
        ? { taskToDelete: conversationContext.taskToDelete }
        : undefined;

      switch (name) {
        case 'createTask':
          result = await taskActionService.createTask(userId, {
            title: args.title,
            description: args.description,
            status: args.status,
          });
          break;

        case 'updateTaskStatus':
          result = await taskActionService.updateTaskStatus(
            userId,
            {
              taskIdentifier: args.taskIdentifier,
              status: args.status,
            },
            disambiguationTasks
          );
          break;

        case 'updateTask':
          result = await taskActionService.updateTask(
            userId,
            {
              taskIdentifier: args.taskIdentifier,
              newTitle: args.newTitle,
              newDescription: args.newDescription,
            },
            disambiguationTasks
          );
          break;

        case 'deleteTask':
          result = await taskActionService.deleteTask(
            userId,
            {
              taskIdentifier: args.taskIdentifier,
              confirmed: args.confirmed,
            },
            disambiguationTasks,
            confirmationContext
          );
          break;

        default:
          result = {
            success: false,
            message: `Unknown function: ${name}. Available functions are: createTask, updateTaskStatus, updateTask, deleteTask.`,
            error: 'UNKNOWN_FUNCTION' as any,
            retryable: false,
          };
      }

      // Store disambiguation context if needed
      if (result.requiresDisambiguation && result.disambiguationContext) {
        newConversationContext = result.disambiguationContext;
      }

      // Store confirmation context if needed
      if (result.requiresConfirmation && result.confirmationContext) {
        newConversationContext = result.confirmationContext;
      }

      functionResponses.push({
        name,
        response: {
          success: result.success,
          message: result.message,
          task: result.task,
          tasks: result.tasks,
          error: result.error,
          errorDetails: result.errorDetails,
          retryable: result.retryable,
          requiresDisambiguation: result.requiresDisambiguation,
          requiresConfirmation: result.requiresConfirmation,
        },
      });
    } catch (error: any) {
      console.error(`Error executing function ${name}:`, error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'An unexpected error occurred while executing the action.';
      let retryable = true;

      if (error.message?.includes('database') || error.message?.includes('Database')) {
        errorMessage = 'Database error occurred. Please try again in a moment.';
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
        errorMessage = 'Permission denied. Please ensure you are logged in.';
        retryable = false;
      }

      functionResponses.push({
        name,
        response: {
          success: false,
          message: errorMessage,
          error: 'EXECUTION_ERROR',
          errorDetails: error.message,
          retryable,
        },
      });
    }
  }

  return { responses: functionResponses, newConversationContext };
};

export interface GenerateResponseResult {
  text: string;
  actionPerformed?: boolean;
  actionType?: string;
  taskId?: string;
  conversationContext?: any;
}

export const generateResponse = async (
  userMessage: string,
  taskContext: TaskContext,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userId: string,
  conversationContext?: any,
  timeoutMs: number = 15000
): Promise<GenerateResponseResult> => {
  try {
    if (!isGeminiAvailable()) {
      throw new Error('Gemini AI is not available. Please check your configuration.');
    }

    const systemPrompt = buildSystemPrompt(taskContext);
    const geminiModel = getGeminiModel();

    // Check if user is responding to a confirmation request
    const isConfirming = conversationContext?.action === 'deleteTask' && 
                        conversationContext?.taskToDelete &&
                        isConfirmationResponse(userMessage);

    // If user is confirming a deletion, automatically call deleteTask with confirmed=true
    if (isConfirming) {
      const result = await taskActionService.deleteTask(
        userId,
        {
          taskIdentifier: conversationContext.taskToDelete.title,
          confirmed: true,
        },
        undefined,
        { taskToDelete: conversationContext.taskToDelete }
      );

      // Generate a natural response based on the result
      let responseText: string;
      if (result.success) {
        responseText = result.message;
      } else {
        responseText = `I'm sorry, but ${result.message}`;
      }

      return {
        text: responseText,
        actionPerformed: result.success,
        actionType: result.success ? 'deleteTask' : undefined,
        taskId: result.task?._id.toString(),
        conversationContext: undefined, // Clear context after confirmation
      };
    }

    // Build the conversation with system context and tools
    const chat = geminiModel.startChat({
      tools,
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will help you manage your tasks based on the information provided.' }],
        },
        ...formatConversationHistory(conversationHistory),
      ],
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeoutMs);
    });

    // Race between API call and timeout
    const result = await Promise.race([
      chat.sendMessage(userMessage),
      timeoutPromise,
    ]);

    const response = result.response;

    // Check if function calls were requested
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Execute function calls with conversation context
      const { responses: functionResponses, newConversationContext } = 
        await executeFunctionCalls(functionCalls, userId, conversationContext);
      
      // Extract action type and task ID from the first successful function call
      let actionType: string | undefined;
      let taskId: string | undefined;
      
      for (const fr of functionResponses) {
        if (fr.response.success) {
          actionType = fr.name;
          if (fr.response.task?._id) {
            taskId = fr.response.task._id.toString();
          }
          break;
        }
      }
      
      // Send function responses back to Gemini for final message generation
      const functionResponseParts = functionResponses.map((fr) => ({
        functionResponse: {
          name: fr.name,
          response: fr.response,
        },
      }));

      // Create timeout for second call
      const timeoutPromise2 = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, timeoutMs);
      });

      // Get final response from Gemini
      const finalResult = await Promise.race([
        chat.sendMessage(functionResponseParts),
        timeoutPromise2,
      ]);

      const finalText = finalResult.response.text();

      if (!finalText || finalText.trim().length === 0) {
        throw new Error('EMPTY_RESPONSE');
      }

      return {
        text: finalText,
        actionPerformed: true,
        actionType,
        taskId,
        conversationContext: newConversationContext,
      };
    }

    // No function calls, return regular response
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('EMPTY_RESPONSE');
    }

    return {
      text,
      actionPerformed: false,
    };
  } catch (error: any) {
    console.error('Error generating Gemini response:', error);
    
    // Handle specific error types
    if (error.message === 'TIMEOUT') {
      throw new Error('The AI service took too long to respond. Please try again.');
    }
    
    if (error.message === 'EMPTY_RESPONSE') {
      throw new Error('The AI service returned an empty response. Please try again.');
    }
    
    // Handle API key errors
    if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key. Please check your Gemini API configuration.');
    }
    
    // Handle quota/rate limit errors
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('AI service quota exceeded. Please try again later.');
    }
    
    // Handle network errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
      throw new Error('Unable to connect to AI service. Please check your internet connection.');
    }
    
    // Handle blocked content errors
    if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
      throw new Error('Your message was blocked by content filters. Please rephrase your question.');
    }
    
    // Generic error
    throw new Error('Failed to generate AI response. Please try again later.');
  }
};
