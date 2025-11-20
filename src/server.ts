import express from 'express';
import cors from 'cors'
import { connectDB } from './config/database';
import router from './routes/auth.routes';
import { taskRouter } from './routes/task.routes';
import { chatRouter } from './routes/chat.routes';
import { userRouter } from './routes/user.routes';
import config from './config';
import { initializeGemini } from './services/gemini.service';


const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: ["http://localhost:5173", "https://snap-task-ui.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-retry-count"]
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",  "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-retry-count");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// database connection
connectDB();

// initialize Gemini AI
const geminiInitialized = initializeGemini();
if (!geminiInitialized) {
  console.warn('⚠️  Warning: Gemini AI failed to initialize. Chat features will be unavailable.');
  console.warn('⚠️  Please check your GEMINI_API_KEY in the .env file.');
}

// health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      gemini: geminiInitialized ? 'available' : 'unavailable',
    },
  });
});

// base route
app.use('/api/auth', router);
app.use('/api/task', taskRouter);
app.use('/api/chat', chatRouter);
app.use('/api/user', userRouter);

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
