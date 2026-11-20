import type { NextFunction, Request, Response } from 'express';
import type { DbInstance } from '../db/database';
import { getWorkspaceSubscriptionSummary } from './authService';
import {
  FEATURE_CATALOG,
  type FeatureKey,
  canAccessFeature,
  getEffectivePlanTier,
  getTierDisplayName,
} from '../../src/utils/planEntitlements';

export function createWorkspaceFeatureGuard(db: DbInstance, feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const wid = String(req.params.wid || '');
    if (!wid) {
      return res.status(400).json({ error: 'Workspace ID is required.' });
    }
    const subscription = getWorkspaceSubscriptionSummary(db, wid);
    if (!canAccessFeature(subscription, feature)) {
      const meta = FEATURE_CATALOG[feature];
      const requiredName = getTierDisplayName(meta.requiredTier);
      const currentTier = getEffectivePlanTier(subscription);
      const currentName = getTierDisplayName(currentTier);
      return res.status(403).json({
        error: `${meta.label} is not available on your current plan (${currentName}). Subscribe to the ${requiredName} plan under Billing & Subscriptions to unlock this feature.`,
        code: 'SUBSCRIPTION_REQUIRED',
        feature,
        currentPlan: currentTier,
        requiredPlan: meta.requiredTier,
      });
    }
    next();
  };
}
