import { Router, type NextFunction, type Request, type Response } from 'express';

import { chatService } from '../config/dependencies.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSessionWithSubjectValidators,
  mongoIdParamValidator,
  sendMessageValidators,
  validateRequest,
} from '../middleware/validation.js';

export const chatRoutes = Router();

// All chat routes require authentication
chatRoutes.use(requireAuth);

/**
 * POST /api/chat/sessions
 * Creates a session scoped to a subject.
 * Body: { subjectId, title? }
 * Student: verified enrolled in subjectId → 403 if not.
 */
chatRoutes.post(
  '/sessions',
  createSessionWithSubjectValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subjectId, title } = req.body as { subjectId: string; title?: string };

      const session = await chatService.createChatSession(
        title,
        subjectId,
        req.user!.id,
        req.user!.role,
        req.user!.enrolledSubjects.map((id) => id.toString()),
      );

      res.status(201).json({ success: true, session });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/chat/sessions
 * Returns only the current user's sessions (no message history).
 */
chatRoutes.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await chatService.listChatSessions(req.user!.id);
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/sessions/:id
 * Returns session with full message history. Verifies ownership.
 */
chatRoutes.get(
  '/sessions/:id',
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const session = await chatService.getChatSession(id, req.user!.id);
      res.json({ success: true, session });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/chat/sessions/:id/messages
 * Sends a message and gets a RAG response.
 * Body: { message }
 * Security enforcements (inside chatService.generateChatResponse):
 *   - Verifies session ownership
 *   - Verifies student enrollment in session's subject
 *   - Restricts chunk retrieval to session's subject (prevents cross-course leaks)
 */
chatRoutes.post(
  '/sessions/:id/messages',
  sendMessageValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };

      const response = await chatService.generateChatResponse(
        id,
        String(req.body.message),
        req.user!.id,
        req.user!.role,
        req.user!.enrolledSubjects.map((enrolledId) => enrolledId.toString()),
      );

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

/**
 * DELETE /api/chat/sessions/:id
 * Deletes a session. Verifies ownership.
 */
chatRoutes.delete(
  '/sessions/:id',
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await chatService.deleteChatSession(id, req.user!.id);
      res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
      next(error);
    }
  },
);
