import { Router, type NextFunction, type Request, type Response } from 'express';
import { body } from 'express-validator';

import { subscriptionService } from '../config/dependencies.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { recordAuditLog } from '../services/auditService.js';

export const subscriptionRoutes = Router();

const objectIdOf = (value: unknown): string => {
  if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id);
  return String(value);
};

const planNameValidator = [
  body('planName')
    .isIn(['free', 'plus', 'pro'])
    .withMessage('planName must be one of: free, plus, pro.'),
];

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
 * Subscribe to a plan immediately in demo-payment mode.
 * Body: { planName: 'free' | 'plus' | 'pro' }
 */
subscriptionRoutes.post(
  '/subscribe',
  requireRole('student'),
  planNameValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { planName } = req.body as { planName: string };
      const subscription = await subscriptionService.subscribeToPlan(req.user!.id, planName);
      await recordAuditLog({
        actor: { id: req.user!.id, role: req.user!.role },
        action: 'subscription.subscribe',
        entityType: 'subscription',
        entityId: objectIdOf(subscription),
        metadata: { planName },
      });
      res.status(201).json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/subscriptions/cancel
 * Cancel the current active subscription.
 */
subscriptionRoutes.post('/cancel', requireRole('student'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cancelled = await subscriptionService.cancelSubscription(req.user!.id);
    await Promise.all(cancelled.map((subscription) => recordAuditLog({
      actor: { id: req.user!.id, role: req.user!.role },
      action: 'subscription.cancel',
      entityType: 'subscription',
      entityId: objectIdOf(subscription),
      metadata: { planName: subscription.planName },
    })));
    res.json({ success: true, message: 'Subscription cancelled.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscriptions/quota
 * Get account-wide usage for the current UTC calendar month.
 */
subscriptionRoutes.get('/quota', requireRole('student', 'teacher'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quota = await subscriptionService.checkQuota(req.user!.id, req.user!.role);
    res.json({ success: true, quota });
  } catch (error) {
    next(error);
  }
});
