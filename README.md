# SnapTask Backend API

A TypeScript-based REST API for task management with AI-powered chat assistance using Google's Gemini AI.

## Features

- **User Authentication** - JWT-based auth with access and refresh tokens
- **Task Management** - Full CRUD operations for tasks with status tracking
- **Custom Categories** - User-defined categories for organizing tasks
- **AI Chat Assistant** - Gemini-powered conversational interface for task management
- **Function Calling** - AI can create, update, delete, and manage tasks via natural language
- **WhatsApp Notifications** - Task reminders and updates via WhatsApp (Twilio)
- **Rate Limiting** - Protection against API abuse
- **MongoDB Integration** - Persistent data storage

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **AI**: Google Gemini AI
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs for password hashing

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Google Gemini API key
- Twilio account (for WhatsApp notifications) - See [Twilio Setup Guide](TWILIO_SETUP_GUIDE.md)

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory (see `.env.example`):
```env
PORT=4545
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES=1h
REFRESH_TOKEN_EXPIRES=7d
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
PHONE_ENCRYPTION_KEY=your_secure_encryption_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

4. Set up Twilio for WhatsApp notifications (optional):
   - Follow the [Twilio Setup Guide](TWILIO_SETUP_GUIDE.md)
   - Use the [Setup Checklist](TWILIO_SETUP_CHECKLIST.md) to track progress
   - Verify setup with: `node scripts/verify-twilio-setup.js`

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:4545`

## Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Documentation

For complete API documentation including all endpoints, request/response formats, and examples, see:

📖 **[API Documentation](API_DOCUMENTATION.md)**

### Quick Reference

**Authentication**
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

**Tasks**
- `POST /api/task` - Create a new task
- `GET /api/task` - Get all tasks (supports filtering by status and category)
- `GET /api/task/:id` - Get task by ID
- `PUT /api/task/:id` - Update task
- `PATCH /api/task/complete/:id` - Mark task as completed
- `PATCH /api/task/in-progress/:id` - Mark task as in-progress
- `PATCH /api/task/pending/:id` - Mark task as pending
- `DELETE /api/task/:id` - Delete task

**Categories**
- `POST /api/categories` - Create a new category
- `GET /api/categories` - Get all user categories
- `GET /api/categories/:id` - Get category by ID
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

**User Profile**
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile/phone` - Add/update phone number
- `POST /api/users/profile/phone/verify` - Verify phone number
- `PUT /api/users/profile/notifications` - Update notification preferences
- `GET /api/users/statistics` - Get user statistics

**Notifications**
- `POST /api/notifications/test` - Send test WhatsApp notification
- `GET /api/notifications/history` - Get notification history

**Chat (AI Assistant)**
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/welcome` - Get welcome message with task summary

**Health Check**
- `GET /api/health` - Check API and service status

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── lib/             # Utility libraries (JWT)
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript (generated)
├── .env                 # Environment variables
├── package.json
└── tsconfig.json
```

## AI Chat Features

The AI assistant can:
- Create tasks from natural language
- Update task status (pending, in-progress, completed)
- Modify task titles and descriptions
- Delete tasks (with confirmation)
- Handle disambiguation when multiple tasks match
- Provide task summaries and insights

Example interactions:
- "Create a task to buy groceries"
- "Mark the coding task as complete"
- "Update the meeting task description"
- "Delete the old task"

## Environment Variables

For complete environment variable documentation including security best practices and troubleshooting, see:

📖 **[Environment Variables Guide](../ENVIRONMENT_VARIABLES.md)**

### Quick Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `4545` |
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb+srv://...` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | Yes | Random 32+ chars |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret | Yes | Random 32+ chars |
| `ACCESS_TOKEN_EXPIRES` | Access token expiration | No | `1h` |
| `REFRESH_TOKEN_EXPIRES` | Refresh token expiration | No | `7d` |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | `AIza...` |
| `GEMINI_MODEL` | Gemini model to use | No | `gemini-2.5-flash` |
| `PHONE_ENCRYPTION_KEY` | Encryption key for phone numbers | Yes* | 32 random chars |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes* | `ACxxxxxxxx...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes* | `xxxxxxxx...` |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender number | Yes* | `whatsapp:+14155238886` |
| `MAX_NOTIFICATIONS_PER_DAY` | Daily notification limit | No | `10` |
| `NOTIFICATION_RETRY_ATTEMPTS` | Failed notification retry count | No | `3` |

\* Required only if using WhatsApp notification features

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Rate limiting on chat endpoints (10 requests/minute)
- CORS enabled for specified origins
- Environment variables for sensitive data

## Documentation

### For Developers

- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Environment Variables](../ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[Twilio Setup Guide](TWILIO_SETUP_GUIDE.md)** - WhatsApp integration setup
- **[Twilio Setup Checklist](TWILIO_SETUP_CHECKLIST.md)** - Step-by-step checklist
- **[Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)** - Performance tips
- **[Security Audit Report](SECURITY_AUDIT_REPORT.md)** - Security review

### For Users

- **[Category User Guide](../USER_GUIDE_CATEGORIES.md)** - How to use task categories
- **[WhatsApp User Guide](../USER_GUIDE_WHATSAPP.md)** - How to set up notifications

### Background Jobs

- **[Jobs README](src/jobs/README.md)** - Information about scheduled jobs

## License

ISC
