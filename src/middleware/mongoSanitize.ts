/**
 * MongoDB Sanitization Middleware
 * 
 * Custom implementation compatible with Express v5
 * Prevents NoSQL injection by removing $ and . from user input
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitize an object by removing keys that start with $ or contain .
 */
function sanitizeObject(obj: any, replaceWith: string = '_'): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, replaceWith));
  }

  const sanitized: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Check if key contains $ or .
      if (key.includes('$') || key.includes('.')) {
        // Replace $ and . with the replacement character
        const sanitizedKey = key.replace(/\$/g, replaceWith).replace(/\./g, replaceWith);
        sanitized[sanitizedKey] = sanitizeObject(obj[key], replaceWith);
      } else {
        sanitized[key] = sanitizeObject(obj[key], replaceWith);
      }
    }
  }
  
  return sanitized;
}

interface SanitizeOptions {
  replaceWith?: string;
  onSanitize?: (data: { req: Request; key: string }) => void;
}

/**
 * Express middleware to sanitize request data
 */
export function mongoSanitize(options: SanitizeOptions = {}) {
  const replaceWith = options.replaceWith || '_';
  const onSanitize = options.onSanitize;
  
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let sanitized = false;
      
      // Sanitize req.body (POST/PUT data)
      if (req.body && typeof req.body === 'object') {
        const original = JSON.stringify(req.body);
        req.body = sanitizeObject(req.body, replaceWith);
        if (original !== JSON.stringify(req.body)) {
          sanitized = true;
          if (onSanitize) {
            onSanitize({ req, key: 'body' });
          }
        }
      }
      
      // Sanitize req.params (URL parameters)
      if (req.params && typeof req.params === 'object') {
        const original = JSON.stringify(req.params);
        req.params = sanitizeObject(req.params, replaceWith);
        if (original !== JSON.stringify(req.params)) {
          sanitized = true;
          if (onSanitize) {
            onSanitize({ req, key: 'params' });
          }
        }
      }
      
      // For Express v5, req.query is read-only, so we can't modify it directly
      // Instead, we'll create a sanitized version and attach it to req
      if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitizeObject(req.query, replaceWith);
        // Store sanitized query in a custom property
        (req as any).sanitizedQuery = sanitizedQuery;
        
        // Log if query was sanitized
        if (JSON.stringify(req.query) !== JSON.stringify(sanitizedQuery)) {
          sanitized = true;
          if (onSanitize) {
            onSanitize({ req, key: 'query' });
          }
        }
      }
      
      if (sanitized) {
        console.warn(`⚠️  Sanitized potentially malicious input from ${req.ip}`);
      }
      
      next();
    } catch (error) {
      console.error('Error in mongoSanitize middleware:', error);
      next(error);
    }
  };
}

/**
 * Helper function to get sanitized query
 * Use this in your routes instead of req.query
 */
export function getSanitizedQuery(req: Request): any {
  return (req as any).sanitizedQuery || req.query;
}
