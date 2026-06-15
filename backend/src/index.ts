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
import { adminRoutes } from './routes/adminRoutes.js';
import { classRoutes } from './routes/classRoutes.js';
import { subscriptionService } from './config/dependencies.js';
import { documentService } from './config/dependencies.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { QuestionQuotaModel } from './models/QuestionQuota.js';
import { logger } from './utils/logger.js';
import { seedSubscriptionPlans } from './utils/seedPlans.js';
import { seedInitialAdmin } from './utils/seedAdmin.js';
import { DocumentModel } from './models/Document.js';

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
      subjects: 'GET|POST|PATCH|DELETE /api/subjects',
      documents: 'GET|POST|DELETE /api/documents | POST /api/documents/:id/approve|reject',
      chat: 'GET|POST|DELETE /api/chat/sessions',
      subscriptions: 'GET|POST /api/subscriptions',
      admin: 'GET|POST|PATCH|DELETE /api/admin',
      classes: 'GET|POST|PATCH|DELETE /api/classes',
      testSet: 'GET /api/test-set',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', version: '2.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);         // Public: register & login
app.use('/api/admin', adminRoutes);       // Admin-only user management
app.use('/api/classes', classRoutes);     // Class assignment and enrollment
app.use('/api/subjects', subjectRoutes);  // Protected: CRUD + enrollment
app.use('/api/documents', documentRoutes); // Protected: teacher-only upload
app.use('/api/chat', chatRoutes);         // Protected: document-scoped chat
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/test-set', testSetRoutes);  // Public: test set data

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await seedInitialAdmin();
  await seedSubscriptionPlans();
  await QuestionQuotaModel.syncIndexes();
  await subscriptionService.expireSubscriptions();
  await subscriptionService.resetMonthlyQuotas();

  const interruptedDocuments = await DocumentModel.find({ status: 'uploaded' }).select('_id').lean().exec();
  for (const document of interruptedDocuments) {
    void documentService.processDocument(document._id.toString()).catch((error) => {
      logger.error(`Document resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  const housekeepingTimer = setInterval(() => {
    void subscriptionService.expireSubscriptions().catch((error) => {
      logger.error(`Subscription expiry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
    void subscriptionService.resetMonthlyQuotas().catch((error) => {
      logger.error(`Quota reset check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }, 60 * 60 * 1_000);
  housekeepingTimer.unref();

  // Subjects and classes are created by administrators through their APIs.
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
