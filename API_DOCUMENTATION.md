# SnapTask API Documentation

Complete API reference for the SnapTask backend service.

## Base URL

```
http://localhost:4545/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "message": "User created successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Validation error (missing fields, invalid email)
- `409` - User already exists

---

### Login

Authenticate and receive access tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Missing credentials
- `401` - Invalid credentials

---

## Task Endpoints

### Create Task

Create a new task.

**Endpoint:** `POST /task`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Complete project documentation",
  "description": "Write comprehensive API docs",
  "status": "pending",
  "category": "507f1f77bcf86cd799439011",
  "dueDate": "2025-11-25T10:00:00Z"
}
```

**Fields:**
- `title` (required): Task title (max 200 characters)
- `description` (optional): Task description
- `status` (optional): One of `pending`, `in-progress`, `completed` (default: `pending`)
- `category` (optional): Category ID
- `dueDate` (optional): ISO 8601 date string

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Complete project documentation",
  "description": "Write comprehensive API docs",
  "status": "pending",
  "category": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Work",
    "color": "#3B82F6"
  },
  "dueDate": "2025-11-25T10:00:00.000Z",
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T10:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - Category not found

---

### Get All Tasks

Retrieve all tasks for the authenticated user.

**Endpoint:** `GET /task`

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `in-progress`, `completed`)
- `category` (optional): Filter by category ID
- `uncategorized` (optional): Set to `true` to get tasks without a category

**Examples:**
```
GET /task
GET /task?status=pending
GET /task?category=507f1f77bcf86cd799439011
GET /task?uncategorized=true
```

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Complete project documentation",
    "description": "Write comprehensive API docs",
    "status": "pending",
    "category": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Work",
      "color": "#3B82F6"
    },
    "dueDate": "2025-11-25T10:00:00.000Z",
    "user": "507f1f77bcf86cd799439010",
    "createdAt": "2025-11-20T10:00:00.000Z",
    "updatedAt": "2025-11-20T10:00:00.000Z"
  }
]
```

---

### Get Task by ID

Retrieve a specific task.

**Endpoint:** `GET /task/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Complete project documentation",
  "description": "Write comprehensive API docs",
  "status": "pending",
  "category": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Work",
    "color": "#3B82F6"
  },
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T10:00:00.000Z"
}
```

**Errors:**
- `404` - Task not found
- `403` - Not authorized to access this task

---

### Update Task

Update an existing task.

**Endpoint:** `PUT /task/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in-progress",
  "category": "507f1f77bcf86cd799439011",
  "dueDate": "2025-11-26T10:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in-progress",
  "category": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Work",
    "color": "#3B82F6"
  },
  "dueDate": "2025-11-26T10:00:00.000Z",
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T12:00:00.000Z"
}
```

**Errors:**
- `404` - Task not found
- `403` - Not authorized to update this task

---

### Update Task Status (Quick Actions)

Quick endpoints to change task status.

**Endpoints:**
- `PATCH /task/pending/:id` - Set status to pending
- `PATCH /task/in-progress/:id` - Set status to in-progress
- `PATCH /task/complete/:id` - Set status to completed

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "title": "Complete project documentation",
  "status": "completed",
  ...
}
```

---

### Delete Task

Delete a task.

**Endpoint:** `DELETE /task/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

**Errors:**
- `404` - Task not found
- `403` - Not authorized to delete this task

---

## Category Endpoints

### Create Category

Create a new category.

**Endpoint:** `POST /categories`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Work",
  "color": "#3B82F6"
}
```

**Fields:**
- `name` (required): Category name (max 50 characters, unique per user)
- `color` (required): Hex color code (e.g., `#3B82F6`)

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Work",
  "color": "#3B82F6",
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T10:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error (invalid color, missing name)
- `409` - Category name already exists for this user

---

### Get All Categories

Retrieve all categories for the authenticated user.

**Endpoint:** `GET /categories`

**Authentication:** Required

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Work",
    "color": "#3B82F6",
    "user": "507f1f77bcf86cd799439010",
    "createdAt": "2025-11-20T10:00:00.000Z",
    "updatedAt": "2025-11-20T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Personal",
    "color": "#10B981",
    "user": "507f1f77bcf86cd799439010",
    "createdAt": "2025-11-20T11:00:00.000Z",
    "updatedAt": "2025-11-20T11:00:00.000Z"
  }
]
```

---

### Get Category by ID

Retrieve a specific category.

**Endpoint:** `GET /categories/:id`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Work",
  "color": "#3B82F6",
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T10:00:00.000Z"
}
```

**Errors:**
- `404` - Category not found
- `403` - Not authorized to access this category

---

### Update Category

Update an existing category.

**Endpoint:** `PUT /categories/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Work Projects",
  "color": "#6366F1"
}
```

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Work Projects",
  "color": "#6366F1",
  "user": "507f1f77bcf86cd799439010",
  "createdAt": "2025-11-20T10:00:00.000Z",
  "updatedAt": "2025-11-20T12:00:00.000Z"
}
```

**Errors:**
- `404` - Category not found
- `409` - Category name already exists
- `403` - Not authorized to update this category

---

### Delete Category

Delete a category and optionally reassign its tasks.

**Endpoint:** `DELETE /categories/:id`

**Authentication:** Required

**Query Parameters:**
- `reassignTo` (optional): Category ID to reassign tasks to

**Examples:**
```
DELETE /categories/507f1f77bcf86cd799439011
DELETE /categories/507f1f77bcf86cd799439011?reassignTo=507f1f77bcf86cd799439013
```

**Response:** `200 OK`
```json
{
  "message": "Category deleted successfully",
  "tasksReassigned": 5
}
```

**Errors:**
- `404` - Category not found
- `403` - Not authorized to delete this category

---

## User Profile Endpoints

### Get User Profile

Get the authenticated user's profile.

**Endpoint:** `GET /users/profile`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439010",
  "username": "johndoe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "phoneVerified": true,
  "notificationPreferences": {
    "whatsappEnabled": true,
    "taskReminders": true,
    "statusUpdates": true,
    "dailySummary": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  },
  "createdAt": "2025-11-01T10:00:00.000Z"
}
```

---

### Update Phone Number

Add or update the user's phone number.

**Endpoint:** `PUT /users/profile/phone`

**Authentication:** Required

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Fields:**
- `phoneNumber` (required): Phone number in E.164 format (e.g., `+1234567890`)

**Response:** `200 OK`
```json
{
  "message": "Verification code sent to your WhatsApp",
  "phoneNumber": "+1234567890"
}
```

**Errors:**
- `400` - Invalid phone number format
- `500` - Failed to send verification code

---

### Verify Phone Number

Verify phone number with the code sent via WhatsApp.

**Endpoint:** `POST /users/profile/phone/verify`

**Authentication:** Required

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Phone number verified successfully",
  "phoneVerified": true
}
```

**Errors:**
- `400` - Invalid or expired verification code
- `404` - No pending verification

---

### Update Notification Preferences

Update WhatsApp notification settings.

**Endpoint:** `PUT /users/profile/notifications`

**Authentication:** Required

**Request Body:**
```json
{
  "whatsappEnabled": true,
  "taskReminders": true,
  "statusUpdates": true,
  "dailySummary": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00"
}
```

**Fields:**
- `whatsappEnabled` (boolean): Master toggle for all WhatsApp notifications
- `taskReminders` (boolean): Receive reminders for tasks due within 24 hours
- `statusUpdates` (boolean): Receive notifications when task status changes
- `dailySummary` (boolean): Receive daily task summary
- `quietHoursStart` (string): Start of quiet hours (HH:MM format, 24-hour)
- `quietHoursEnd` (string): End of quiet hours (HH:MM format, 24-hour)

**Response:** `200 OK`
```json
{
  "message": "Notification preferences updated successfully",
  "notificationPreferences": {
    "whatsappEnabled": true,
    "taskReminders": true,
    "statusUpdates": true,
    "dailySummary": false,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  }
}
```

---

### Get User Statistics

Get task statistics for the authenticated user.

**Endpoint:** `GET /users/statistics`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "totalTasks": 25,
  "completedTasks": 15,
  "pendingTasks": 7,
  "inProgressTasks": 3,
  "completionRate": 60,
  "categoryBreakdown": [
    {
      "category": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Work",
        "color": "#3B82F6"
      },
      "total": 10,
      "completed": 6,
      "completionRate": 60
    },
    {
      "category": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Personal",
        "color": "#10B981"
      },
      "total": 8,
      "completed": 5,
      "completionRate": 62.5
    },
    {
      "category": null,
      "total": 7,
      "completed": 4,
      "completionRate": 57.14
    }
  ]
}
```

---

## Notification Endpoints

### Send Test Notification

Send a test WhatsApp notification to verify setup.

**Endpoint:** `POST /notifications/test`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Test notification sent successfully"
}
```

**Errors:**
- `400` - Phone number not verified
- `500` - Failed to send notification

---

### Get Notification History

Retrieve notification history for the authenticated user.

**Endpoint:** `GET /notifications/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of notifications to return (default: 50, max: 100)
- `offset` (optional): Number of notifications to skip (default: 0)

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "type": "task_reminder",
      "message": "Reminder: Complete project documentation is due in 2 hours",
      "status": "sent",
      "scheduledFor": "2025-11-25T08:00:00.000Z",
      "sentAt": "2025-11-25T08:00:05.000Z",
      "createdAt": "2025-11-25T07:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439021",
      "type": "status_change",
      "message": "Task 'Review code' is now in progress",
      "status": "sent",
      "scheduledFor": "2025-11-24T14:30:00.000Z",
      "sentAt": "2025-11-24T14:30:02.000Z",
      "createdAt": "2025-11-24T14:30:00.000Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

---

## Chat (AI Assistant) Endpoints

### Send Message

Send a message to the AI assistant.

**Endpoint:** `POST /chat/message`

**Authentication:** Required

**Rate Limit:** 10 requests per minute

**Request Body:**
```json
{
  "message": "Create a task to review the pull request"
}
```

**Response:** `200 OK`
```json
{
  "response": "I've created a new task: 'Review the pull request' with pending status.",
  "action": "task_created",
  "task": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Review the pull request",
    "status": "pending",
    ...
  }
}
```

**Errors:**
- `429` - Rate limit exceeded (10 requests/minute)
- `400` - Invalid message format

---

### Get Welcome Message

Get a welcome message with task summary.

**Endpoint:** `GET /chat/welcome`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "message": "Welcome back, johndoe! You have 7 pending tasks, 3 in progress, and 15 completed. How can I help you today?"
}
```

---

## Health Check

### Check API Health

Check if the API and services are running.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T10:00:00.000Z",
  "services": {
    "database": "connected",
    "ai": "available",
    "whatsapp": "available"
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Not authorized to access resource
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- **Chat endpoints**: 10 requests per minute per user
- **WhatsApp notifications**: 10 messages per day per user
- **Phone verification**: 3 attempts per hour per user

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response includes:**
```json
{
  "data": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

## Webhooks

### Twilio WhatsApp Webhook

Endpoint for receiving WhatsApp message status updates from Twilio.

**Endpoint:** `POST /webhooks/twilio/status`

**Authentication:** Twilio signature validation

This endpoint is used internally by Twilio to report message delivery status.

---

## Best Practices

1. **Always include error handling** for API calls
2. **Store tokens securely** (never in localStorage for sensitive apps)
3. **Refresh tokens** before they expire
4. **Use HTTPS** in production
5. **Validate input** on the client side before sending
6. **Handle rate limits** gracefully with exponential backoff
7. **Cache category data** to reduce API calls
8. **Batch operations** when possible

---

## Example: Complete Task Creation Flow

```javascript
// 1. Get user's categories
const categoriesResponse = await fetch('/api/categories', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const categories = await categoriesResponse.json();

// 2. Create task with category
const taskResponse = await fetch('/api/task', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Complete project documentation',
    description: 'Write comprehensive API docs',
    category: categories[0]._id,
    dueDate: '2025-11-25T10:00:00Z'
  })
});
const task = await taskResponse.json();

// 3. Update task status
const updateResponse = await fetch(`/api/task/in-progress/${task._id}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const updatedTask = await updateResponse.json();
```

---

## Support

For issues or questions:
- Check the [GitHub repository](https://github.com/yourusername/snaptask)
- Review the [User Guides](USER_GUIDE_CATEGORIES.md)
- Contact support at support@snaptask.com
