import { Request, Response } from 'express';
import { generateResponse, isGeminiAvailable, TaskContext } from '@src/services/gemini.service';
import { Task } from '@src/models/task.model';

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  conversationContext?: any;
}

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user; // user is the ObjectId from JWT
    const { message, conversationHistory = [], conversationContext } = req.body as ChatRequest;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in again.' });
    }

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required and must be a string.' });
    }

    // Trim message
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty.' });
    }

    // Validate message length (max 500 characters)
    if (trimmedMessage.length > 500) {
      return res.status(400).json({ message: 'Message must be 500 characters or less.' });
    }

    // Validate conversation history format
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({ message: 'Invalid conversation history format.' });
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return res.status(503).json({ 
        message: 'AI service is currently unavailable. Please check your configuration or try again later.' 
      });
    }

    // Fetch user's tasks with error handling
    let userTasks;
    try {
      userTasks = await Task.find({ user: userId });
    } catch (dbError: any) {
      console.error('Database error fetching tasks:', dbError);
      return res.status(500).json({ 
        message: 'Failed to retrieve your tasks. Please try again.' 
      });
    }

    // Group tasks by status
    const taskContext: TaskContext = {
      totalTasks: userTasks.length,
      pendingTasks: userTasks.filter(task => task.status === 'pending'),
      inProgressTasks: userTasks.filter(task => task.status === 'in-progress'),
      completedTasks: userTasks.filter(task => task.status === 'completed'),
    };

    // Generate AI response with conversation context (handles both disambiguation and confirmation)
    const aiResponse = await generateResponse(
      trimmedMessage,
      taskContext,
      conversationHistory,
      userId,
      conversationContext
    );

    // Log AI-initiated actions for audit purposes
    if (aiResponse.actionPerformed) {
      console.log('[AI Action] Task action performed', {
        userId: userId,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        actionType: aiResponse.actionType || 'unknown',
        taskId: aiResponse.taskId || null,
      });
    }

    res.status(200).json({
      message: trimmedMessage,
      response: aiResponse.text,
      actionPerformed: aiResponse.actionPerformed,
      conversationContext: aiResponse.conversationContext,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in sendMessage controller:', error);
    
    // Handle specific error types with user-friendly messages
    if (error.message?.includes('API key') || error.message?.includes('Invalid API key')) {
      return res.status(503).json({ 
        message: 'AI service configuration error. Please contact support.',
        retryable: false,
      });
    }

    if (error.message?.includes('timeout') || error.message?.includes('took too long')) {
      return res.status(504).json({ 
        message: 'The AI service is taking too long to respond. Please try again.',
        retryable: true,
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('exceeded')) {
      return res.status(503).json({ 
        message: 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.',
        retryable: true,
      });
    }

    if (error.message?.includes('network') || error.message?.includes('connect')) {
      return res.status(503).json({ 
        message: 'Unable to connect to AI service. Please check your connection and try again.',
        retryable: true,
      });
    }

    if (error.message?.includes('blocked') || error.message?.includes('content filters')) {
      return res.status(400).json({ 
        message: error.message,
        retryable: false,
      });
    }

    if (error.message?.includes('Authentication') || error.message?.includes('permission')) {
      return res.status(403).json({ 
        message: 'You don\'t have permission to perform this action. Please log in again.',
        retryable: false,
      });
    }

    if (error.message?.includes('database') || error.message?.includes('Database')) {
      return res.status(500).json({ 
        message: 'Database error occurred. Please try again in a moment.',
        retryable: true,
      });
    }

    // Generic error
    res.status(500).json({ 
      message: 'Failed to process your message. Please try again.',
      retryable: true,
    });
  }
};

export const getWelcomeMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user; // user is the ObjectId from JWT

    // Validate user authentication
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in again.' });
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      return res.status(503).json({ 
        message: 'AI service is currently unavailable. Please check your configuration or try again later.' 
      });
    }

    // Fetch user's tasks with error handling
    let userTasks;
    try {
      userTasks = await Task.find({ user: userId });
    } catch (dbError: any) {
      console.error('Database error fetching tasks:', dbError);
      return res.status(500).json({ 
        message: 'Failed to retrieve your tasks. Please try again.' 
      });
    }

    // Group tasks by status
    const taskContext: TaskContext = {
      totalTasks: userTasks.length,
      pendingTasks: userTasks.filter(task => task.status === 'pending'),
      inProgressTasks: userTasks.filter(task => task.status === 'in-progress'),
      completedTasks: userTasks.filter(task => task.status === 'completed'),
    };

    // Handle empty task list scenario
    if (userTasks.length === 0) {
      return res.status(200).json({
        response: "Welcome! 👋 I'm your AI Task Assistant. It looks like you don't have any tasks yet. Once you create some tasks, I'll be here to help you manage them, provide insights, and answer questions about your workload. Feel free to ask me anything!",
        timestamp: new Date().toISOString(),
      });
    }

    // Generate welcome message with timeout
    const welcomePrompt = 'Generate a brief, friendly welcome message summarizing my current tasks and offering to help.';
    const welcomeResponse = await generateResponse(welcomePrompt, taskContext, [], userId);

    res.status(200).json({
      response: welcomeResponse.text,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in getWelcomeMessage controller:', error);
    
    // Handle specific error types with user-friendly messages
    if (error.message?.includes('API key') || error.message?.includes('Invalid API key')) {
      return res.status(503).json({ 
        message: 'AI service configuration error. Please contact support.' 
      });
    }

    if (error.message?.includes('timeout') || error.message?.includes('took too long')) {
      return res.status(504).json({ 
        message: 'The AI service is taking too long to respond. Please try again.' 
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('exceeded')) {
      return res.status(503).json({ 
        message: 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.' 
      });
    }

    if (error.message?.includes('network') || error.message?.includes('connect')) {
      return res.status(503).json({ 
        message: 'Unable to connect to AI service. Please check your connection and try again.' 
      });
    }

    // Generic error with fallback message
    res.status(500).json({ 
      message: 'Failed to generate welcome message. Please try again.' 
    });
  }
};
