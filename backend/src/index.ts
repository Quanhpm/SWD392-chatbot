import cors from 'cors';
import express from 'express';

import { connectDatabase } from './config/database.js';
import { env } from './config/environment.js';
import { chatRoutes } from './routes/chatRoutes.js';
import { documentRoutes } from './routes/documentRoutes.js';
import { testSetRoutes } from './routes/testSetRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

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
    message: 'Welcome to the SE1939 RAG Chatbot Academic Backend API.',
    endpoints: {
      health: '/api/health',
      documents: '/api/documents',
      sessions: '/api/chat/sessions',
      testSet: '/api/test-set'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test-set', testSetRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  app.listen(env.port, () => {
    logger.info(`Backend listening on http://localhost:${env.port}`);
  });
};

void startServer().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error';
  logger.error(`Server startup failed: ${message}`);
  process.exit(1);
});
