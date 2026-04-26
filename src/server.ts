import 'dotenv/config';
import 'express-async-errors'; // Must be imported BEFORE express — patches async error handling
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

// ─── Startup Validation — fail fast if critical env vars are absent ───────────
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error('❌  Missing required environment variables:');
  missingVars.forEach((key) => console.error(`   - ${key}`));
  console.error('   Set these in your .env file (local) or Render dashboard (production).');
  process.exit(1);
}

import prisma from './config/prisma';
import { notFoundHandler, globalErrorHandler, sendSuccess } from './utils/response';

// Route modules
import authRouter from './routes/auth.routes';
import eventsRouter from './routes/events.routes';
import registrationsRouter from './routes/registrations.routes';
import applicationsRouter from './routes/applications.routes';
import contactRouter from './routes/contact.routes';
import adminRouter from './routes/admin.routes';
import teamsRouter from './routes/teams.routes';

// ─────────────────────────────────────────────────────────────────────────────
// App Factory
// ─────────────────────────────────────────────────────────────────────────────

const app: Application = express();
const PORT = Number(process.env.PORT ?? 3000);

// ─── Security Middleware ───────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",                    // inline <script> blocks in HTML
                'https://checkout.razorpay.com',       // Razorpay payment modal
                'https://cdn.jsdelivr.net',            // Chart.js for Admin Dashboard
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
              ],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
              connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', 'https://cdn.jsdelivr.net'],
              frameSrc: ['https://api.razorpay.com'],
            },
          }
        : false,
  }),
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed.`));
      }
    },
    credentials: true,
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Assets (Vanilla HTML/CSS/TS-compiled-JS frontend) ────────────────
// Use process.cwd() (project root) instead of __dirname (dist/) so the paths
// remain correct regardless of how many directory levels deep the compiled
// server.js ends up at runtime.

app.use(express.static(path.join(process.cwd(), 'src', 'public')));
app.use('/gallery', express.static(path.join(process.cwd(), 'gallery')));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response): void => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }, 'Yuvaverse API is live.');
});

// ─── Versioned API Routes ──────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);

// ─── 404 & Global Error Handlers (must be last) ───────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — connect to DB then start listener
// ─────────────────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // Use a lightweight query to verify DB reachability through PgBouncer.
    // prisma.$connect() is incompatible with Supabase's Transaction Pooler
    // (port 6543) because PgBouncer manages connections per-transaction and
    // does not support persistent client-side connection pools.
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅  Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`🚀  Yuvaverse API running on port ${PORT}`);
      console.log(`🔍  Health check → /api/health`);
      console.log(`🌐  Environment  → ${process.env.NODE_ENV ?? 'development'}`);
    });
  } catch (error) {
    console.error('❌  Failed to connect to the database:', error);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n🛑  SIGINT received — shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑  SIGTERM received — shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
