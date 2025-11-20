import express from 'express';
import cors from 'cors'
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { mongoSanitize } from './middleware/mongoSanitize';
import { connectDB } from './config/database';
import router from './routes/auth.routes';
import { taskRouter } from './routes/task.routes';
import { chatRouter } from './routes/chat.routes';
import { userRouter } from './routes/user.routes';
import { categoryRouter } from './routes/category.routes';
import { notificationRouter } from './routes/notification.routes';
import cronRouter from './routes/cron.routes';
import config from './config';
import { initializeGemini } from './services/gemini.service';


const app = express();

// Validate required environment variables at startup
const requiredEnvVars = [
  'ACCESS_TOKEN_SECRET',
  'PHONE_ENCRYPTION_KEY',
  'MONGODB_URI'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Validate encryption key strength
if (process.env.PHONE_ENCRYPTION_KEY && process.env.PHONE_ENCRYPTION_KEY.length < 32) {
  console.error('❌ PHONE_ENCRYPTION_KEY must be at least 32 characters long for security.');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

// Security middleware
// Helmet - sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Body parser middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// MongoDB query sanitization - prevents NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  Sanitized potentially malicious input: ${key} from ${req.ip}`);
  },
}));

// Global rate limiter - prevents API abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded from IP: ${req.ip}`);
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});


app.use(cors({
  origin: ["https://snaptask-geo.onrender.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-retry-count"]
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",  "https://snaptask-geo.onrender.com");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-retry-count");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

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
app.use('/api/categories', categoryRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/cron', cronRouter);

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
