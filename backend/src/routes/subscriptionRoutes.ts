import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';

import { subscriptionService } from '../config/dependencies.js';
import { DocumentModel } from '../models/Document.js';
import { SubjectModel } from '../models/Subject.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { mongoIdParamValidator, validateRequest } from '../middleware/validation.js';

export const subscriptionRoutes = Router();

const planNameValidator = [
  body('planName')
    .isIn(['free', 'plus', 'pro'])
    .withMessage('planName must be one of: free, plus, pro.'),
];

const verifyQuotaDocumentAccess = async (req: Request, documentId: string): Promise<void> => {
  const document = await DocumentModel.findById(documentId).lean().exec();
  if (!document) {
    throw new AppError('Document not found.', 404);
  }

  const subjectId = document.subjectId
    ? document.subjectId.toString()
    : (await SubjectModel.findOne({ name: document.subject }).select('_id').lean().exec())?._id.toString();

  if (
    !subjectId ||
    !req.user!.enrolledSubjects.some((enrolledId) => enrolledId.toString() === subjectId)
  ) {
    throw new AppError('Access denied. You are not enrolled in this document subject.', 403);
  }
};

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/plans
 * List all active subscription plans. No auth required.
 */
subscriptionRoutes.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await subscriptionService.getPlans();
    res.json({ success: true, plans });
  } catch (error) {
    next(error);
  }
});

// ─── Protected (all routes below require auth) ───────────────────────────────

subscriptionRoutes.use(requireAuth);

/**
 * GET /api/subscriptions/me
 * Get the current user's subscription + effective plan info.
 */
subscriptionRoutes.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await subscriptionService.getCurrentSubscription(req.user!.id);
    const plan = await subscriptionService.getEffectivePlan(req.user!.id);
    res.json({ success: true, subscription, plan });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/subscribe
 * Subscribe to a plan. Paid plans start as 'pending' until approved.
 * Body: { planName: 'free' | 'plus' | 'pro' }
 */
subscriptionRoutes.post(
  '/subscribe',
  planNameValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planName } = req.body as { planName: string };
      const subscription = await subscriptionService.subscribeToPlan(req.user!.id, planName);
      res.status(201).json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subscriptions/cancel
 * Cancel the current active or pending subscription.
 */
subscriptionRoutes.post('/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await subscriptionService.cancelSubscription(req.user!.id);
    res.json({ success: true, message: 'Subscription cancelled.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/quota
 * Get quota usage for all documents.
 */
subscriptionRoutes.get('/quota', requireRole('student'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usage = await subscriptionService.getQuotaUsage(req.user!.id);
    const planName = await subscriptionService.getEffectivePlanName(req.user!.id);
    res.json({ success: true, planName, usage });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/quota/:documentId
 * Get quota for a specific document.
 */
subscriptionRoutes.get(
  '/quota/:documentId',
  requireRole('student'),
  [param('documentId').isMongoId().withMessage('Invalid document id.')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params as { documentId: string };
      await verifyQuotaDocumentAccess(req, documentId);
      const quota = await subscriptionService.getDocumentQuota(req.user!.id, documentId);
      res.json({ success: true, quota });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Admin / Teacher Only ─────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/admin/pending
 * List all pending subscriptions awaiting approval.
 */
subscriptionRoutes.get(
  '/admin/pending',
  requireRole('teacher'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pending = await subscriptionService.listPendingSubscriptions();
      res.json({ success: true, subscriptions: pending });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subscriptions/admin/:id/approve
 * Approve a pending subscription.
 */
subscriptionRoutes.post(
  '/admin/:id/approve',
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const subscription = await subscriptionService.approveSubscription(id, req.user!.id);
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subscriptions/admin/:id/reject
 * Reject a pending subscription.
 */
subscriptionRoutes.post(
  '/admin/:id/reject',
  requireRole('teacher'),
  mongoIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      await subscriptionService.rejectSubscription(id);
      res.json({ success: true, message: 'Subscription rejected.' });
    } catch (error) {
      next(error);
    }
  },
);
