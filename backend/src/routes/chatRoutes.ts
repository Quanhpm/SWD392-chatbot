import { Router, type NextFunction, type Request, type Response } from 'express';

import {
  createChatSession,
  deleteChatSession,
  generateChatResponse,
  getChatSession,
  listChatSessions,
} from '../services/chatService.js';
import {
  createSessionValidators,
  mongoIdParamValidator,
  sendMessageValidators,
  validateRequest,
} from '../middleware/validation.js';

export const chatRoutes = Router();

chatRoutes.post('/sessions', createSessionValidators, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title : undefined;
    const session = await createChatSession(title);
    res.status(201).json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

chatRoutes.get('/sessions', async (_req: Request, res: Response, next) => {
  try {
    const sessions = await listChatSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
});

chatRoutes.get('/sessions/:id', mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    const session = await getChatSession(id);
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

chatRoutes.post(
  '/sessions/:id/messages',
  sendMessageValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const response = await generateChatResponse(id, String(req.body.message));
      res.json({
        success: true,
        reply: {
          role: 'assistant',
          content: response.content,
          citations: response.citations,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

chatRoutes.delete('/sessions/:id', mongoIdParamValidator, validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    await deleteChatSession(id);
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
});
