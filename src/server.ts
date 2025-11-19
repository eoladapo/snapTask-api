import express from 'express';
import cors from 'cors'
import { connectDB } from './config/database';
import router from '@src/routes/auth.routes';
import { taskRouter } from '@src/routes/task.routes';
import { chatRouter } from '@src/routes/chat.routes';
import config from '@src/config';
import { initializeGemini } from '@src/services/gemini.service';


const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}))

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

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
