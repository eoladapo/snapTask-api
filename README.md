# SnapTask Backend API

A TypeScript-based REST API for task management with AI-powered chat assistance using Google's Gemini AI.

## Features

- **User Authentication** - JWT-based auth with access and refresh tokens
- **Task Management** - Full CRUD operations for tasks with status tracking
- **AI Chat Assistant** - Gemini-powered conversational interface for task management
- **Function Calling** - AI can create, update, delete, and manage tasks via natural language
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

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=4545
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES=1h
REFRESH_TOKEN_EXPIRES=7d
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

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

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

### Tasks
- `POST /api/task` - Create a new task
- `GET /api/task` - Get all tasks
- `GET /api/task/:id` - Get task by ID
- `PUT /api/task/:id` - Update task
- `PATCH /api/task/complete/:id` - Mark task as completed
- `PATCH /api/task/in-progress/:id` - Mark task as in-progress
- `PATCH /api/task/pending/:id` - Mark task as pending
- `DELETE /api/task/:id` - Delete task

### Chat (AI Assistant)
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/welcome` - Get welcome message with task summary

### Health Check
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

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `4545` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `ACCESS_TOKEN_SECRET` | JWT access token secret | Random string |
| `REFRESH_TOKEN_SECRET` | JWT refresh token secret | Random string |
| `ACCESS_TOKEN_EXPIRES` | Access token expiration | `1h` |
| `REFRESH_TOKEN_EXPIRES` | Refresh token expiration | `7d` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.5-flash` |

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Rate limiting on chat endpoints (10 requests/minute)
- CORS enabled for specified origins
- Environment variables for sensitive data

## License

ISC
