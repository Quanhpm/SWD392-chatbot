import cors from 'cors';
import express from 'express';

import { connectDatabase } from './config/database.js';
import { env } from './config/environment.js';
import { authRoutes } from './routes/authRoutes.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { subjectRoutes } from './routes/subjectRoutes.js';
import { subscriptionRoutes } from './routes/subscriptionRoutes.js';
import { testSetRoutes } from './routes/testSetRoutes.js';
import { subscriptionService } from './config/dependencies.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { QuestionQuotaModel } from './models/QuestionQuota.js';
import { logger } from './utils/logger.js';
import { seedSubscriptionPlans } from './utils/seedPlans.js';

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'SE1939 Learning Document Management Platform — Backend API v2.0',
    endpoints: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/register | POST /api/auth/login',
      subjects: 'GET|POST /api/subjects | POST /api/subjects/:id/enroll',
      documents: 'GET|POST|DELETE /api/documents',
      chat: 'GET|POST|DELETE /api/chat/sessions',
      subscriptions: 'GET|POST /api/subscriptions',
      testSet: 'GET /api/test-set',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', version: '2.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);         // Public: register & login
app.use('/api/subjects', subjectRoutes);  // Protected: CRUD + enrollment
app.use('/api/documents', documentRoutes); // Protected: teacher-only upload
app.use('/api/chat', chatRoutes);         // Protected: document-scoped chat
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/test-set', testSetRoutes);  // Public: test set data

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await seedSubscriptionPlans();
  await QuestionQuotaModel.syncIndexes();
  await subscriptionService.expireSubscriptions();
  await subscriptionService.resetMonthlyQuotas();

  const housekeepingTimer = setInterval(() => {
    void subscriptionService.expireSubscriptions().catch((error) => {
      logger.error(`Subscription expiry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
    void subscriptionService.resetMonthlyQuotas().catch((error) => {
      logger.error(`Quota reset check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }, 60 * 60 * 1_000);
  housekeepingTimer.unref();

  // NOTE: seedDefaultSubject() has been removed — subjects now require
  // password and teacherId fields which cannot be auto-seeded.
  // Create subjects via POST /api/subjects with a teacher account.
  app.listen(env.port, () => {
    logger.info(`🚀 Backend listening on http://localhost:${env.port}`);
    logger.info(`📚 Environment: ${env.nodeEnv}`);
  });
};

void startServer().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  logger.error(`Server startup failed: ${message}`);
  process.exit(1);
});
