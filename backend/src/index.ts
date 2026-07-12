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
import { documentService, emailService, subscriptionService } from './config/dependencies.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { QuestionQuotaModel } from './models/QuestionQuota.js';
import { AuditLogModel } from './models/AuditLog.js';
import { logger } from './utils/logger.js';
import { seedSubscriptionPlans } from './utils/seedPlans.js';
import { seedInitialAdmin } from './utils/seedAdmin.js';
import { DocumentModel } from './models/Document.js';
import { EmailNotificationModel } from './models/EmailNotification.js';
import { migrateSubjectOnly } from './utils/migrateSubjectOnly.js';
import { SubjectAssignmentModel } from './models/SubjectAssignment.js';

const app = express();
app.disable('x-powered-by');

app.use(securityHeaders);
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
      auth: 'POST /api/auth/login',
      subjects: 'GET|POST|PATCH|DELETE /api/subjects',
      documents: 'GET|POST|PATCH|DELETE /api/documents',
      chat: 'GET|POST|DELETE /api/chat/sessions',
      subscriptions: 'GET|POST /api/subscriptions',
      admin: 'GET|POST|PATCH|DELETE /api/admin',
      testSet: 'GET /api/test-set',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    version: '2.0.0',
    services: { emailNotifications: emailService.isEnabled() ? 'enabled' : 'disabled' },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);         // Public: login
app.use('/api/admin', adminRoutes);       // Admin-only user management
app.use('/api/subjects', subjectRoutes);  // Protected: Subject CRUD + teacher assignment
app.use('/api/documents', documentRoutes); // Protected: teacher-only upload
app.use('/api/chat', chatRoutes);         // Protected: document-scoped chat
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/test-set', testSetRoutes);  // Admin-only RAG evaluation data

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await seedInitialAdmin();
  await seedSubscriptionPlans();
  await migrateSubjectOnly();
  await QuestionQuotaModel.syncIndexes();
  await DocumentModel.syncIndexes();
  await SubjectAssignmentModel.syncIndexes();
  await EmailNotificationModel.syncIndexes();
  await AuditLogModel.syncIndexes();
  await subscriptionService.expireSubscriptions();
  await subscriptionService.resetMonthlyQuotas();
  if (emailService.isEnabled()) {
    await emailService.verifyConnection();
    await emailService.retryPendingNotifications();
  }

  await DocumentModel.updateMany({ status: 'processing' }, { $set: { status: 'uploaded' } }).exec();
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
    if (emailService.isEnabled()) {
      void emailService.retryPendingNotifications().catch((error) => {
        logger.error(`Email retry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    }
  }, 60 * 60 * 1_000);
  housekeepingTimer.unref();

  // Subjects and teacher assignments are created by administrators through their APIs.
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
