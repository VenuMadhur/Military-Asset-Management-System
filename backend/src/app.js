import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import prisma from './config/database.js';
import env from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { loggerMiddleware } from './middleware/loggerMiddleware.js';
import assetRoutes from './routes/assetRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import authRoutes from './routes/authRoutes.js';
import baseRoutes from './routes/baseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import expenditureRoutes from './routes/expenditureRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.clientUrls.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(loggerMiddleware);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      success: true,
      status: 'ok',
      database: 'connected',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bases', baseRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/expenditures', expenditureRoutes);
app.use('/api/audit-logs', auditRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
