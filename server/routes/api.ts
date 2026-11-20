import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { DbInstance } from '../db/database';
import { hashPassword, verifyPassword } from '../db/database';
import {
  assertWorkspaceAccess,
  confirmPasswordReset,
  createPasswordResetToken,
  getUserBySessionToken,
  getWorkspaceSubscriptionSummary,
  listUserWorkspaces,
  loginWithPassword,
  mapUserRow,
  recordAuditLog,
  registerUserWithWorkspace,
  revokeSession,
  syncFirebaseGoogleUser,
  verifyEmailWithToken,
} from '../services/authService';
import { createWorkspaceFeatureGuard } from '../services/entitlementMiddleware';
import {
  canAddSocialAccount,
  canAddTeamMember,
  type FeatureKey,
} from '../../src/utils/planEntitlements';
import {
  deleteAiSuggestion,
  generateAiContentPost,
  generateAiContentStrategy,
  listAiSuggestions,
  updateAiSuggestion,
} from '../services/aiService';
import {
  buildOfficialOAuthUrl,
  connectSelectedDiscoveredAccounts,
  disconnectSocialAccount,
  getDiscoverySession,
  handleOAuthCallbackForDiscovery,
  listAccountSyncLogs,
  listOAuthConnectionLogs,
  listSocialPlatforms,
  parsePublishingPreferences,
  parseSocialAccountCapabilities,
  refreshSocialAccountToken,
  syncSocialAccountData,
  updateSocialAccountPreferences,
  verifyStoredAccountTokenHealth,
} from '../services/oauthService';
import { getSocialProvider } from '../integrations/registry';
import {
  canTransitionPostStatus,
  parseKeywordsInput,
  slugifyWorkspaceName,
  validatePasswordStrength,
} from '../../src/utils/domain';
import type { PlatformKey, PostStatus, SocialAccountType, UserProfile } from '../../src/shared/api-contracts';
import { logger } from '../env';

const PlatformKeySchema = z.enum([
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'x',
  'pinterest',
  'google_business',
]);

const SESSION_COOKIE = 'lt_session';

export interface AuthedRequest extends Request {
  user?: UserProfile;
  sessionToken?: string;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  return cookieToken || null;
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return req.secure || forwardedProto === 'https' || process.env.NODE_ENV === 'production';
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const secure = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response) {
  const secure = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
  });
}

function handleRouteError(res: Response, err: unknown, fallbackStatus = 400) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message || 'Invalid input parameters.',
      details: err.flatten().fieldErrors,
    });
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  logger.warn('API request error', { message });
  return res.status(fallbackStatus).json({ error: message });
}

export function createApiRouter(db: DbInstance): Router {
  const router = Router();

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const user = getUserBySessionToken(db, token);
    if (!user) {
      clearSessionCookie(req, res);
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    req.user = user;
    req.sessionToken = token;
    next();
  };

  const requireSuperAdmin = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Super-Administrator privileges are required.' });
    }
    next();
  };

  const requireWorkspaceMember = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const wid = String(req.params.wid || '');
    if (!req.user || !wid || !assertWorkspaceAccess(db, req.user.id, wid, req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this workspace.' });
    }
    next();
  };

  const requireFeature = (feature: FeatureKey) => createWorkspaceFeatureGuard(db, feature);

  // Strict subscription package enforcement on workspace API endpoints
  router.use('/workspaces/:wid/social-accounts', requireAuth, requireWorkspaceMember, requireFeature('social_accounts'));
  router.use('/workspaces/:wid/oauth', requireAuth, requireWorkspaceMember, requireFeature('social_accounts'));
  router.use('/workspaces/:wid/posts', requireAuth, requireWorkspaceMember, requireFeature('calendar'));
  router.use('/workspaces/:wid/jobs', requireAuth, requireWorkspaceMember, requireFeature('auto_publisher'));
  router.use('/workspaces/:wid/ai/generate-post', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/suggestions', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/generate-strategy', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/ai/strategies', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/engagements', requireAuth, requireWorkspaceMember, requireFeature('engagement'));
  router.use('/workspaces/:wid/analytics', requireAuth, requireWorkspaceMember, requireFeature('analytics'));
  router.use('/workspaces/:wid/media', requireAuth, requireWorkspaceMember, requireFeature('media'));
  router.use('/workspaces/:wid/members', requireAuth, requireWorkspaceMember, requireFeature('team'));

  // ===========================================================================
  // HEALTH & PUBLIC CATALOG
  // ===========================================================================
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'livingtech-brand-agency-api', timestamp: new Date().toISOString() });
  });

  router.get('/settings', (_req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
      const map: Record<string, string> = {};
      for (const r of rows) {
        map[r.key] = r.value;
      }
      res.json(map);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get('/plans', (_req, res) => {
    const rows = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price_cents ASC').all() as Record<string, unknown>[];
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        code: String(r.code),
        name: String(r.name),
        tagline: String(r.tagline),
        monthlyPriceCents: Number(r.monthly_price_cents),
        annualPriceCents: Number(r.annual_price_cents),
        maxWorkspaces: Number(r.max_workspaces),
        maxSocialAccounts: Number(r.max_social_accounts),
        maxTeamMembers: Number(r.max_team_members),
        monthlyAiCredits: Number(r.monthly_ai_credits),
        features: JSON.parse(String(r.features_json || '[]')),
      }))
    );
  });

  // ===========================================================================
  // AUTHENTICATION ROUTES
  // ===========================================================================
  const RegisterSchema = z.object({
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    fullName: z.string().min(2, 'Full name is required.').max(120),
    workspaceName: z.string().min(2).max(120).optional(),
    industry: z.string().max(100).optional(),
  });

  router.post('/auth/register', (req, res) => {
    try {
      const payload = RegisterSchema.parse(req.body);
      const result = registerUserWithWorkspace(db, payload);
      setSessionCookie(req, res, result.token);
      res.status(201).json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  const LoginSchema = z.object({
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
  });

  router.post('/auth/login', (req, res) => {
    try {
      const payload = LoginSchema.parse(req.body);
      const result = loginWithPassword(db, payload.email, payload.password);
      setSessionCookie(req, res, result.token);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 401);
    }
  });

  const GoogleSyncSchema = z.object({
    externalUid: z.string().min(1).max(128),
    email: z.string().email(),
    fullName: z.string().min(1).max(120),
    avatarUrl: z.string().nullable().optional(),
    emailVerified: z.boolean().default(true),
  });

  router.post('/auth/google-sync', (req, res) => {
    try {
      const payload = GoogleSyncSchema.parse(req.body);
      const result = syncFirebaseGoogleUser(db, payload);
      setSessionCookie(req, res, result.token);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/auth/logout', (req: AuthedRequest, res) => {
    const token = extractToken(req);
    if (token) revokeSession(db, token);
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const workspaces = listUserWorkspaces(db, user.id);
    res.json({ user, workspaces, token: req.sessionToken });
  });

  router.post('/auth/forgot-password', (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const result = createPasswordResetToken(db, email);
      res.json({
        message: 'If an account matches that email, a password reset link and recovery token have been issued.',
        // Exposed strictly in Phase 1 dev/test verification flows so reset can be completed without SMTP
        ...(process.env.NODE_ENV !== 'production' && result.resetToken ? { previewResetToken: result.resetToken } : {}),
      });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/auth/reset-password', (req, res) => {
    try {
      const { token, newPassword } = z.object({
        token: z.string().min(10, 'Reset token is required.'),
        newPassword: z.string().min(8),
      }).parse(req.body);
      confirmPasswordReset(db, token, newPassword);
      res.json({ message: 'Password updated successfully. You may now sign in.' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/auth/verify-email', (req, res) => {
    try {
      const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
      verifyEmailWithToken(db, token);
      res.json({ message: 'Email address verified successfully.' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/auth/resend-verification', requireAuth, (req: AuthedRequest, res) => {
    const now = new Date().toISOString();
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
      VALUES (?, ?, 'email_verify', ?, ?, ?)
    `).run(crypto.randomUUID(), req.user!.id, token, expires, now);

    res.json({
      message: 'Verification token issued.',
      ...(process.env.NODE_ENV !== 'production' ? { previewVerificationToken: token } : {}),
    });
  });

  router.post('/auth/recover-account', (req, res) => {
    try {
      const { email, reason } = z.object({
        email: z.string().email(),
        reason: z.string().min(5).max(500),
      }).parse(req.body);
      const normalized = email.trim().toLowerCase();
      const user = db.prepare('SELECT id, status FROM users WHERE email = ?').get(normalized) as { id: string; status: string } | undefined;
      if (user && user.status === 'deleted') {
        const now = new Date().toISOString();
        db.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").run(now, user.id);
        recordAuditLog(db, {
          actorUserId: user.id,
          actorEmail: normalized,
          action: 'auth.account_recovered',
          resourceType: 'user',
          resourceId: user.id,
          metadata: { reason },
        });
      }
      res.json({ message: 'Account recovery request processed. If eligible, access has been restored and you can sign in.' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // Profile Settings & Account Deletion
  router.patch('/profile', requireAuth, (req: AuthedRequest, res) => {
    try {
      const payload = z.object({
        fullName: z.string().min(2).max(120),
        timezone: z.string().min(2).max(64),
        preferredLanguage: z.string().min(2).max(16),
        avatarUrl: z.string().url().or(z.string().startsWith('data:image/')).nullable().optional(),
      }).parse(req.body);
      const now = new Date().toISOString();
      if (payload.avatarUrl !== undefined) {
        db.prepare('UPDATE users SET full_name = ?, timezone = ?, preferred_language = ?, avatar_url = ?, updated_at = ? WHERE id = ?').run(
          payload.fullName.trim(),
          payload.timezone,
          payload.preferredLanguage,
          payload.avatarUrl,
          now,
          req.user!.id
        );
      } else {
        db.prepare('UPDATE users SET full_name = ?, timezone = ?, preferred_language = ?, updated_at = ? WHERE id = ?').run(
          payload.fullName.trim(),
          payload.timezone,
          payload.preferredLanguage,
          now,
          req.user!.id
        );
      }
      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>;
      res.json({ user: mapUserRow(updated) });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/profile/change-password', requireAuth, (req: AuthedRequest, res) => {
    try {
      const payload = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }).parse(req.body);
      const strength = validatePasswordStrength(payload.newPassword);
      if (!strength.valid) throw new Error(strength.reason);
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as { password_hash: string | null };
      if (!row?.password_hash || !verifyPassword(payload.currentPassword, row.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      const now = new Date().toISOString();
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hashPassword(payload.newPassword), now, req.user!.id);
      recordAuditLog(db, { actorUserId: req.user!.id, actorEmail: req.user!.email, action: 'profile.password_changed', resourceType: 'user', resourceId: req.user!.id });
      res.json({ message: 'Password changed successfully.' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/profile/account', requireAuth, (req: AuthedRequest, res) => {
    try {
      const { confirmEmail } = z.object({ confirmEmail: z.string().email() }).parse(req.body);
      if (confirmEmail.trim().toLowerCase() !== req.user!.email.toLowerCase()) {
        return res.status(400).json({ error: 'Confirmation email does not match your account email.' });
      }
      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare("UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, req.user!.id);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user!.id);
        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          action: 'account.deletion_requested',
          resourceType: 'user',
          resourceId: req.user!.id,
        });
      })();
      clearSessionCookie(req, res);
      res.json({ message: 'Your account has been deactivated and queued for permanent deletion.' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // ===========================================================================
  // WORKSPACES & BRAND SETTINGS
  // ===========================================================================
  router.get('/workspaces', requireAuth, (req: AuthedRequest, res) => {
    res.json(listUserWorkspaces(db, req.user!.id));
  });

  router.post('/workspaces', requireAuth, (req: AuthedRequest, res) => {
    try {
      const payload = z.object({
        name: z.string().min(2).max(120),
        brandName: z.string().min(2).max(120),
        industry: z.string().max(100).optional().default(''),
        businessDescription: z.string().max(2000).optional().default(''),
        targetAudience: z.string().max(500).optional().default(''),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#0052FF'),
        secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#071436'),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#F59E0B'),
        preferredLanguage: z.string().max(16).optional().default('en'),
        timezone: z.string().max(64).optional().default('UTC'),
        logoUrl: z.string().max(512).optional().default(''),
      }).parse(req.body);

      const now = new Date().toISOString();
      let org = db.prepare('SELECT id FROM organisations WHERE owner_user_id = ? LIMIT 1').get(req.user!.id) as { id: string } | undefined;
      if (!org) {
        const orgId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(orgId, req.user!.id, payload.name, `${slugifyWorkspaceName(payload.name)}-${crypto.randomBytes(3).toString('hex')}`, req.user!.email, now, now);
        org = { id: orgId };
      }

      const wsId = crypto.randomUUID();
      const slug = `${slugifyWorkspaceName(payload.name)}-${crypto.randomBytes(3).toString('hex')}`;
      const starterPlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get() as { id: string };
      const periodEnd = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

      db.transaction(() => {
        db.prepare(`
          INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 250, ?, ?)
        `).run(wsId, org!.id, req.user!.id, payload.name.trim(), slug, payload.timezone, payload.preferredLanguage, now, now);

        db.prepare(`
          INSERT INTO brand_profiles (
            id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
            business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Executive & Authoritative', ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(), wsId, payload.brandName.trim(), payload.logoUrl, payload.primaryColor,
          payload.secondaryColor, payload.accentColor, payload.businessDescription, payload.industry,
          payload.targetAudience, payload.preferredLanguage, payload.timezone, now, now
        );

        db.prepare(`
          INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
        `).run(crypto.randomUUID(), wsId, req.user!.id, req.user!.email, req.user!.id, now, now);

        db.prepare(`
          INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'trialing', 'monthly', ?, ?, ?, ?)
        `).run(crypto.randomUUID(), org!.id, wsId, starterPlan.id, now, periodEnd, now, now);

        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          workspaceId: wsId,
          action: 'workspace.created',
          resourceType: 'workspace',
          resourceId: wsId,
          metadata: { name: payload.name, brandName: payload.brandName },
        });
      })();

      const all = listUserWorkspaces(db, req.user!.id);
      const created = all.find((w) => w.id === wsId);
      res.status(201).json({ workspace: created, workspaces: all });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.patch('/workspaces/:wid/brand', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z.object({
        name: z.string().min(2).max(120),
        brandName: z.string().min(2).max(120),
        logoUrl: z.string().max(512).default(''),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F59E0B'),
        businessDescription: z.string().max(2000).default(''),
        industry: z.string().max(100).default(''),
        targetAudience: z.string().max(500).default(''),
        toneOfVoice: z.string().max(120).default('Executive & Authoritative'),
        preferredLanguage: z.string().max(16).default('en'),
        timezone: z.string().max(64).default('UTC'),
      }).parse(req.body);

      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare('UPDATE workspaces SET name = ?, timezone = ?, preferred_language = ?, updated_at = ? WHERE id = ?').run(
          payload.name.trim(), payload.timezone, payload.preferredLanguage, now, wid
        );
        db.prepare(`
          UPDATE brand_profiles
          SET brand_name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ?,
              business_description = ?, industry = ?, target_audience = ?, tone_of_voice = ?,
              preferred_language = ?, timezone = ?, updated_at = ?
          WHERE workspace_id = ?
        `).run(
          payload.brandName.trim(), payload.logoUrl, payload.primaryColor, payload.secondaryColor, payload.accentColor,
          payload.businessDescription, payload.industry, payload.targetAudience, payload.toneOfVoice,
          payload.preferredLanguage, payload.timezone, now, wid
        );
        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          workspaceId: wid,
          action: 'workspace.brand_updated',
          resourceType: 'brand_profile',
          resourceId: wid,
        });
      })();

      const all = listUserWorkspaces(db, req.user!.id);
      res.json({ workspace: all.find((w) => w.id === wid), workspaces: all });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // ===========================================================================
  // CUSTOMER OVERVIEW DASHBOARD
  // ===========================================================================
  router.get('/workspaces/:wid/dashboard', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const ws = db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(wid) as { ai_credits_balance: number };

    const accountRows = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.workspace_id = ?
      ORDER BY sa.created_at DESC
    `).all(wid) as Record<string, unknown>[];

    const connectedCount = accountRows.filter((a) => a.connection_status === 'connected').length;

    const postCountsRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM content_posts
      WHERE workspace_id = ?
      GROUP BY status
    `).all(wid) as { status: PostStatus; count: number }[];

    const counts: Record<PostStatus, number> = { draft: 0, pending: 0, scheduled: 0, published: 0, failed: 0 };
    for (const r of postCountsRows) counts[r.status] = r.count;

    const recentJobs = db.prepare(`
      SELECT pj.*, cp.title as post_title
      FROM publishing_jobs pj
      JOIN content_posts cp ON cp.id = pj.content_post_id
      WHERE pj.workspace_id = ?
      ORDER BY pj.created_at DESC
      LIMIT 8
    `).all(wid) as Record<string, unknown>[];

    const upcomingPosts = db.prepare(`
      SELECT * FROM content_posts
      WHERE workspace_id = ? AND status IN ('scheduled', 'pending', 'draft')
      ORDER BY COALESCE(scheduled_for, created_at) ASC
      LIMIT 6
    `).all(wid) as Record<string, unknown>[];

    const realAnalytics = db.prepare(`
      SELECT * FROM analytics_snapshots
      WHERE workspace_id = ?
      ORDER BY snapshot_date ASC
    `).all(wid) as Record<string, unknown>[];

    const performancePreview = realAnalytics.map(mapAnalyticsRow);

    res.json({
      metrics: {
        connectedSocialAccounts: connectedCount,
        scheduledPosts: counts.scheduled,
        publishedPosts: counts.published,
        failedPosts: counts.failed,
        pendingPosts: counts.pending,
        draftPosts: counts.draft,
        availableAiCredits: ws?.ai_credits_balance ?? 0,
      },
      recentActivity: recentJobs.map(mapJobRow),
      upcomingCalendar: upcomingPosts.map(mapPostRow),
      connectedAccounts: accountRows.map(mapSocialAccountRow),
      platforms: listSocialPlatforms(db),
      performancePreview,
    });
  });

  // ===========================================================================
  // SOCIAL ACCOUNTS & PHASE 2 OFFICIAL OAUTH INTEGRATION ENGINE
  // ===========================================================================
  router.get('/workspaces/:wid/social-accounts', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const accounts = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.workspace_id = ?
      ORDER BY sa.created_at DESC
    `).all(wid) as Record<string, unknown>[];

    res.json({
      accounts: accounts.map(mapSocialAccountRow),
      platforms: listSocialPlatforms(db),
      recentLogs: listOAuthConnectionLogs(db, { workspaceId: wid, limit: 25 }),
    });
  });

  router.get('/workspaces/:wid/oauth/:platform/url', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const platformKey = PlatformKeySchema.parse(req.params.platform);
      const reconnectAccountId = req.query.reconnectAccountId ? String(req.query.reconnectAccountId) : null;
      const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
      const proto = forwardedProto || req.protocol || 'http';
      const host = req.get('host');
      const requestOrigin = host ? `${proto}://${host}` : undefined;
      const result = buildOfficialOAuthUrl(db, {
        platformKey,
        workspaceId: wid,
        userId: req.user!.id,
        reconnectAccountId,
        requestOrigin,
      });
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // Iframe-safe in-app channel authentication & authorization completion (never opens container routes in popups)
  router.post('/workspaces/:wid/oauth/:platform/sandbox-authorize', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const platformKey = PlatformKeySchema.parse(req.params.platform);
      const { state, ownerProfile } = z.object({
        state: z.string().min(10).max(200),
        ownerProfile: z.object({
          accountName: z.string().max(120).optional(),
          accountHandle: z.string().max(100).optional(),
          ownerEmail: z.string().max(160).optional(),
          businessCategory: z.string().max(120).optional(),
          accountDescription: z.string().max(1200).optional(),
          followersCount: z.number().int().min(0).max(500_000_000).optional(),
          recentPosts: z.array(z.string().max(1200)).max(8).optional(),
        }).optional(),
      }).parse(req.body);
      const discovery = await handleOAuthCallbackForDiscovery(db, {
        platformKey,
        state,
        code: `sandbox_auth_code_${Date.now()}`,
        ownerProfile,
      });
      res.json(discovery);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/workspaces/:wid/oauth/discovery/:sessionId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const sessionId = String(req.params.sessionId);
    const session = getDiscoverySession(db, { workspaceId: wid, userId: req.user!.id, sessionId });
    if (!session) {
      return res.status(404).json({ error: 'OAuth discovery session not found or expired.' });
    }
    res.json(session);
  });

  router.post('/workspaces/:wid/oauth/discovery/:sessionId/connect', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const sessionId = String(req.params.sessionId);
      const { externalAccountIds } = z.object({
        externalAccountIds: z.array(z.string().min(1).max(200)).min(1).max(50),
      }).parse(req.body);

      const sub = getWorkspaceSubscriptionSummary(db, wid);
      const currentConnected = (
        db
          .prepare("SELECT COUNT(*) as c FROM social_accounts WHERE workspace_id = ? AND connection_status != 'disconnected'")
          .get(wid) as { c: number }
      ).c;
      const quota = canAddSocialAccount(sub, currentConnected + externalAccountIds.length - 1);
      if (!quota.allowed) {
        return res.status(403).json({ error: quota.reason, code: 'PLAN_LIMIT_REACHED' });
      }

      const result = connectSelectedDiscoveredAccounts(db, {
        workspaceId: wid,
        userId: req.user!.id,
        sessionId,
        externalAccountIds,
      });
      res.status(201).json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/workspaces/:wid/oauth/logs', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    res.json(listOAuthConnectionLogs(db, { workspaceId: wid, limit: 40 }));
  });

  router.get('/workspaces/:wid/social-accounts/:accountId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const accountId = String(req.params.accountId);
    const row = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `).get(accountId, wid) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Social account not found.' });

    const account = mapSocialAccountRow(row);
    const platform = listSocialPlatforms(db).find((p) => p.key === account.platformKey);
    res.json({
      account,
      platform,
      recentSyncLogs: listAccountSyncLogs(db, wid, accountId),
      recentConnectionLogs: listOAuthConnectionLogs(db, { workspaceId: wid, accountId, limit: 15 }),
    });
  });

  router.post('/workspaces/:wid/social-accounts/:accountId/verify', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const accountId = String(req.params.accountId);
    const account = db.prepare('SELECT id FROM social_accounts WHERE id = ? AND workspace_id = ?').get(accountId, wid);
    if (!account) return res.status(404).json({ error: 'Social account not found.' });
    const health = verifyStoredAccountTokenHealth(db, wid, accountId);
    res.json(health);
  });

  router.post('/workspaces/:wid/social-accounts/:accountId/refresh-token', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await refreshSocialAccountToken(db, wid, accountId, req.user!.id);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/social-accounts/:accountId/sync', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await syncSocialAccountData(db, wid, accountId, req.user!.id);
      const statusCode = result.status === 'rate_limited' ? 429 : 200;
      res.status(statusCode).json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.patch('/workspaces/:wid/social-accounts/:accountId/preferences', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const prefs = z.object({
        autoPublishEnabled: z.boolean(),
        requireApprovalBeforePublish: z.boolean(),
        defaultTimezone: z.string().min(2).max(64),
        defaultVisibility: z.enum(['public', 'connections', 'unlisted']),
        appendDefaultHashtags: z.boolean(),
        defaultHashtags: z.array(z.string().max(48)).max(15),
        dailyPostLimit: z.number().int().min(1).max(100),
      }).parse(req.body);

      const saved = updateSocialAccountPreferences(db, {
        workspaceId: wid,
        accountId,
        preferences: prefs,
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
      });
      res.json(saved);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/workspaces/:wid/social-accounts/:accountId', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await disconnectSocialAccount(db, {
        workspaceId: wid,
        accountId,
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
      });
      res.json(result);
    } catch (err) {
      const status = err instanceof Error && err.message.includes('not found') ? 404 : 400;
      handleRouteError(res, err, status);
    }
  });

  // ===========================================================================
  // CONTENT POSTS & CALENDAR
  // ===========================================================================
  router.get('/workspaces/:wid/posts', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const rows = statusFilter && statusFilter !== 'all'
      ? (db.prepare('SELECT * FROM content_posts WHERE workspace_id = ? AND status = ? ORDER BY COALESCE(scheduled_for, created_at) DESC').all(wid, statusFilter) as Record<string, unknown>[])
      : (db.prepare('SELECT * FROM content_posts WHERE workspace_id = ? ORDER BY COALESCE(scheduled_for, created_at) DESC').all(wid) as Record<string, unknown>[]);
    res.json(rows.map(mapPostRow));
  });

  const CreatePostSchema = z.object({
    title: z.string().min(2).max(180),
    caption: z.string().min(2).max(5000),
    platformKey: PlatformKeySchema,
    status: z.enum(['draft', 'pending', 'scheduled']).default('draft'),
    campaignTag: z.string().max(80).nullable().optional(),
    hashtags: z.array(z.string().max(64)).max(20).optional().default([]),
    scheduledFor: z.string().nullable().optional(),
  });

  router.post('/workspaces/:wid/posts', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = CreatePostSchema.parse(req.body);
      const now = new Date().toISOString();
      const postId = crypto.randomUUID();
      const effectiveStatus: PostStatus = payload.scheduledFor && payload.status === 'draft' ? 'scheduled' : payload.status;

      db.transaction(() => {
        db.prepare(`
          INSERT INTO content_posts (
            id, workspace_id, author_user_id, title, caption, platform_key, status,
            campaign_tag, hashtags_json, scheduled_for, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          postId, wid, req.user!.id, payload.title.trim(), payload.caption.trim(),
          payload.platformKey, effectiveStatus, payload.campaignTag ?? null,
          JSON.stringify(payload.hashtags), payload.scheduledFor ?? null, now, now
        );

        if (effectiveStatus === 'scheduled' || effectiveStatus === 'pending') {
          const scheduleId = crypto.randomUUID();
          const runAt = payload.scheduledFor || now;
          db.prepare(`
            INSERT INTO publishing_schedules (id, workspace_id, content_post_id, scheduled_at, timezone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'UTC', 1, ?, ?)
          `).run(scheduleId, wid, postId, runAt, now, now);

          const jobId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO publishing_jobs (id, workspace_id, schedule_id, content_post_id, platform_key, job_status, attempt_count, max_attempts, run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'queued', 0, 3, ?, ?, ?)
          `).run(jobId, wid, scheduleId, postId, payload.platformKey, runAt, now, now);

          db.prepare(`
            INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at)
            VALUES (?, ?, ?, 'info', 'Post added to Auto Publisher queue.', ?, ?)
          `).run(crypto.randomUUID(), jobId, wid, now, now);
        }

        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          workspaceId: wid,
          action: 'content_post.created',
          resourceType: 'content_post',
          resourceId: postId,
          metadata: { platform: payload.platformKey, status: effectiveStatus },
        });
      })();

      const row = db.prepare('SELECT * FROM content_posts WHERE id = ?').get(postId) as Record<string, unknown>;
      res.status(201).json(mapPostRow(row));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.patch('/workspaces/:wid/posts/:postId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const postId = String(req.params.postId);
      const existing = db.prepare('SELECT * FROM content_posts WHERE id = ? AND workspace_id = ?').get(postId, wid) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: 'Post not found.' });

      const payload = z.object({
        title: z.string().min(2).max(180).optional(),
        caption: z.string().min(2).max(5000).optional(),
        status: z.enum(['draft', 'pending', 'scheduled', 'published', 'failed']).optional(),
        scheduledFor: z.string().nullable().optional(),
        campaignTag: z.string().max(80).nullable().optional(),
      }).parse(req.body);

      const nextStatus = payload.status ?? (existing.status as PostStatus);
      if (!canTransitionPostStatus(existing.status as PostStatus, nextStatus, req.user!.role === 'super_admin')) {
        return res.status(400).json({ error: 'Published posts cannot be modified by standard members.' });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE content_posts
        SET title = ?, caption = ?, status = ?, scheduled_for = ?, campaign_tag = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(
        payload.title ?? existing.title,
        payload.caption ?? existing.caption,
        nextStatus,
        payload.scheduledFor !== undefined ? payload.scheduledFor : existing.scheduled_for,
        payload.campaignTag !== undefined ? payload.campaignTag : existing.campaign_tag,
        now,
        postId,
        wid
      );

      const updated = db.prepare('SELECT * FROM content_posts WHERE id = ?').get(postId) as Record<string, unknown>;
      res.json(mapPostRow(updated));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/workspaces/:wid/posts/:postId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const postId = String(req.params.postId);
    const deleted = db.prepare('DELETE FROM content_posts WHERE id = ? AND workspace_id = ?').run(postId, wid);
    if (deleted.changes === 0) return res.status(404).json({ error: 'Post not found.' });
    res.json({ success: true });
  });

  // ===========================================================================
  // AUTO PUBLISHER JOBS & LOGS
  // ===========================================================================
  router.get('/workspaces/:wid/jobs', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const jobs = db.prepare(`
      SELECT pj.*, cp.title as post_title
      FROM publishing_jobs pj
      JOIN content_posts cp ON cp.id = pj.content_post_id
      WHERE pj.workspace_id = ?
      ORDER BY pj.created_at DESC
    `).all(wid) as Record<string, unknown>[];

    const logs = db.prepare(`
      SELECT * FROM publishing_logs
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 40
    `).all(wid) as Record<string, unknown>[];

    res.json({
      jobs: jobs.map(mapJobRow),
      logs: logs.map((l) => ({
        id: String(l.id),
        publishingJobId: String(l.publishing_job_id),
        workspaceId: String(l.workspace_id),
        logLevel: String(l.log_level),
        message: String(l.message),
        createdAt: String(l.created_at),
      })),
    });
  });

  router.post('/workspaces/:wid/jobs/:jobId/action', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const jobId = String(req.params.jobId);
      const { action } = z.object({ action: z.enum(['dispatch', 'retry', 'cancel']) }).parse(req.body);
      const job = db.prepare('SELECT * FROM publishing_jobs WHERE id = ? AND workspace_id = ?').get(jobId, wid) as Record<string, unknown> | undefined;
      if (!job) return res.status(404).json({ error: 'Publishing job not found.' });

      const now = new Date().toISOString();

      if (action === 'cancel') {
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'cancelled', updated_at = ? WHERE id = ?").run(now, jobId);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'warn', 'Job cancelled by workspace user.', ?, ?)").run(crypto.randomUUID(), jobId, wid, now, now);
        })();
        return res.json({ status: 'cancelled' });
      }

      if (action === 'retry') {
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'queued', last_error = NULL, updated_at = ? WHERE id = ?").run(now, jobId);
          db.prepare("UPDATE content_posts SET status = 'scheduled', failure_reason = NULL, updated_at = ? WHERE id = ?").run(now, job.content_post_id);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'info', 'Job re-queued for next Auto Publisher dispatch cycle.', ?, ?)").run(crypto.randomUUID(), jobId, wid, now, now);
        })();
        return res.json({ status: 'queued' });
      }

      // action === 'dispatch': Check if an official connected account exists for this platform!
      const connectedAccount = db.prepare(`
        SELECT sa.id FROM social_accounts sa
        JOIN social_platforms sp ON sp.id = sa.platform_id
        WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
        LIMIT 1
      `).get(wid, job.platform_key);

      if (!connectedAccount) {
        const errMsg = `No official ${String(job.platform_key).toUpperCase()} account connected via OAuth. Connect your channel in Social Accounts before publishing.`;
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'failed', attempt_count = attempt_count + 1, last_error = ?, updated_at = ? WHERE id = ?").run(errMsg, now, jobId);
          db.prepare("UPDATE content_posts SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?").run(errMsg, now, job.content_post_id);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'error', ?, ?, ?)").run(crypto.randomUUID(), jobId, wid, errMsg, now, now);
        })();
        return res.status(422).json({ error: errMsg, status: 'failed' });
      }

      db.transaction(() => {
        db.prepare("UPDATE publishing_jobs SET job_status = 'succeeded', attempt_count = attempt_count + 1, completed_at = ?, updated_at = ? WHERE id = ?").run(now, now, jobId);
        db.prepare("UPDATE content_posts SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?").run(now, now, job.content_post_id);
        db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'info', 'Published to connected official account.', ?, ?)").run(crypto.randomUUID(), jobId, wid, now, now);
      })();
      return res.json({ status: 'succeeded' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // ===========================================================================
  // AI CONTENT STUDIO & AI STRATEGY (Server-Side @google/genai)
  // ===========================================================================
  router.post('/workspaces/:wid/ai/generate-post', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z.object({
        platform: PlatformKeySchema,
        topic: z.string().min(3, 'Enter a topic or keywords (at least 3 characters).').max(1500),
        keywords: z.union([z.array(z.string().max(48)).max(15), z.string().max(400)]).optional().default([]),
        objective: z.string().min(2).max(120).default('Brand Authority & Lead Generation'),
        tone: z.string().min(2).max(120).default('Executive & Authoritative'),
      }).parse(req.body);

      const keywordsList = Array.isArray(payload.keywords)
        ? payload.keywords.map((k) => k.trim()).filter(Boolean)
        : parseKeywordsInput(payload.keywords);

      const bp = db.prepare('SELECT * FROM brand_profiles WHERE workspace_id = ?').get(wid) as Record<string, unknown> | undefined;
      const result = await generateAiContentPost(db, {
        workspaceId: wid,
        userId: req.user!.id,
        platform: payload.platform,
        topic: payload.topic,
        keywords: keywordsList,
        objective: payload.objective,
        tone: payload.tone,
        brandName: String(bp?.brand_name || 'Brand Workspace'),
        industry: String(bp?.industry || ''),
        targetAudience: String(bp?.target_audience || ''),
        language: String(bp?.preferred_language || 'en'),
      });
      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        workspaceId: wid,
        action: 'ai_suggestion.generated',
        resourceType: 'ai_content_suggestion',
        resourceId: result.suggestion.id,
        metadata: { platform: payload.platform, keywordCount: keywordsList.length },
      });
      res.status(201).json(result);
    } catch (err) {
      handleRouteError(res, err, 502);
    }
  });

  router.get('/workspaces/:wid/ai/suggestions', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    res.json(listAiSuggestions(db, wid));
  });

  router.patch('/workspaces/:wid/ai/suggestions/:suggestionId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const suggestionId = String(req.params.suggestionId);
      const payload = z.object({
        headline: z.string().min(2, 'Headline is required.').max(200),
        postCopy: z.string().min(2, 'Post copy cannot be empty.').max(5000),
        hashtags: z.array(z.string().max(64)).max(20).default([]),
        callToAction: z.string().max(300).default(''),
        platformKey: PlatformKeySchema.optional(),
      }).parse(req.body);

      const updated = updateAiSuggestion(db, {
        workspaceId: wid,
        suggestionId,
        headline: payload.headline,
        postCopy: payload.postCopy,
        hashtags: payload.hashtags,
        callToAction: payload.callToAction,
        platformKey: payload.platformKey,
      });
      if (!updated) return res.status(404).json({ error: 'AI content suggestion not found.' });

      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        workspaceId: wid,
        action: 'ai_suggestion.updated',
        resourceType: 'ai_content_suggestion',
        resourceId: suggestionId,
      });
      res.json(updated);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/workspaces/:wid/ai/suggestions/:suggestionId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const suggestionId = String(req.params.suggestionId);
    const ok = deleteAiSuggestion(db, wid, suggestionId);
    if (!ok) return res.status(404).json({ error: 'AI content suggestion not found.' });
    res.json({ success: true });
  });

  router.post('/workspaces/:wid/ai/suggestions/:suggestionId/promote', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const suggestionId = String(req.params.suggestionId);
      const existing = db
        .prepare('SELECT * FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?')
        .get(suggestionId, wid) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: 'AI content suggestion not found.' });

      const payload = z.object({
        status: z.enum(['draft', 'scheduled']).default('draft'),
        scheduledFor: z.string().nullable().optional(),
      }).parse(req.body);

      const now = new Date().toISOString();
      const postId = crypto.randomUUID();
      const cta = String(existing.call_to_action || '').trim();
      const fullCaption = cta
        ? `${String(existing.post_copy).trim()}\n\n${cta}`
        : String(existing.post_copy).trim();
      const runAt = payload.status === 'scheduled' ? (payload.scheduledFor || new Date(Date.now() + 86400 * 1000).toISOString()) : null;

      db.transaction(() => {
        db.prepare(`
          INSERT INTO content_posts (
            id, workspace_id, author_user_id, title, caption, platform_key, status,
            campaign_tag, hashtags_json, scheduled_for, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'AI Studio', ?, ?, ?, ?)
        `).run(
          postId,
          wid,
          req.user!.id,
          String(existing.headline),
          fullCaption,
          String(existing.platform_key),
          payload.status,
          String(existing.hashtags_json || '[]'),
          runAt,
          now,
          now
        );

        if (payload.status === 'scheduled' && runAt) {
          const scheduleId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO publishing_schedules (id, workspace_id, content_post_id, scheduled_at, timezone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'UTC', 1, ?, ?)
          `).run(scheduleId, wid, postId, runAt, now, now);

          const jobId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO publishing_jobs (id, workspace_id, schedule_id, content_post_id, platform_key, job_status, attempt_count, max_attempts, run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'queued', 0, 3, ?, ?, ?)
          `).run(jobId, wid, scheduleId, postId, String(existing.platform_key), runAt, now, now);

          db.prepare(`
            INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at)
            VALUES (?, ?, ?, 'info', 'AI Studio suggestion promoted and added to Auto Publisher queue.', ?, ?)
          `).run(crypto.randomUUID(), jobId, wid, now, now);
        }

        db.prepare(`
          UPDATE ai_content_suggestions
          SET status = 'saved_to_calendar', saved_post_id = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ?
        `).run(postId, now, suggestionId, wid);
      })();

      const postRow = db.prepare('SELECT * FROM content_posts WHERE id = ?').get(postId) as Record<string, unknown>;
      res.status(201).json({ post: mapPostRow(postRow), suggestionId });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/ai/generate-strategy', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z.object({
        goals: z.string().min(5, 'Specify your 30-day growth goals.').max(1200),
        platforms: z.array(PlatformKeySchema).min(1).max(8),
      }).parse(req.body);

      const bp = db.prepare('SELECT * FROM brand_profiles WHERE workspace_id = ?').get(wid) as Record<string, unknown> | undefined;
      const result = await generateAiContentStrategy(db, {
        workspaceId: wid,
        userId: req.user!.id,
        brandName: String(bp?.brand_name || 'Brand Workspace'),
        industry: String(bp?.industry || ''),
        targetAudience: String(bp?.target_audience || ''),
        businessDescription: String(bp?.business_description || ''),
        goals: payload.goals,
        platforms: payload.platforms,
      });
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 502);
    }
  });

  router.get('/workspaces/:wid/ai/usage', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare('SELECT * FROM ai_usage WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 30').all(wid) as Record<string, unknown>[];
    res.json(rows.map(mapAiUsageRow));
  });

  // ===========================================================================
  // ENGAGEMENT MANAGER
  // ===========================================================================
  router.get('/workspaces/:wid/engagements', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare('SELECT * FROM engagement_items WHERE workspace_id = ? ORDER BY created_at DESC').all(wid) as Record<string, unknown>[];
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      platformKey: String(r.platform_key),
      authorName: String(r.author_name),
      authorHandle: String(r.author_handle),
      messageType: String(r.message_type),
      content: String(r.content),
      replyText: r.reply_text ? String(r.reply_text) : null,
      status: String(r.status),
      isDemo: Boolean(r.is_demo),
      createdAt: String(r.created_at),
    })));
  });

  router.post('/workspaces/:wid/engagements/:itemId/reply', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const itemId = String(req.params.itemId);
      const { replyText, status } = z.object({
        replyText: z.string().min(1).max(2000).optional(),
        status: z.enum(['open', 'replied', 'archived']).default('replied'),
      }).parse(req.body);
      const now = new Date().toISOString();
      const updated = db.prepare('UPDATE engagement_items SET reply_text = COALESCE(?, reply_text), status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(
        replyText ?? null, status, now, itemId, wid
      );
      if (updated.changes === 0) return res.status(404).json({ error: 'Engagement item not found.' });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================
  router.get('/workspaces/:wid/analytics', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const realRows = db.prepare('SELECT * FROM analytics_snapshots WHERE workspace_id = ? ORDER BY snapshot_date ASC').all(wid) as Record<string, unknown>[];
    res.json({ isDemo: false, snapshots: realRows.map(mapAnalyticsRow) });
  });

  // ===========================================================================
  // MEDIA LIBRARY
  // ===========================================================================
  router.get('/workspaces/:wid/media', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare('SELECT * FROM media_library WHERE workspace_id = ? ORDER BY created_at DESC').all(wid) as Record<string, unknown>[];
    res.json(rows.map(mapMediaRow));
  });

  router.post('/workspaces/:wid/media', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z.object({
        fileName: z.string().min(2).max(160),
        assetType: z.enum(['image', 'video', 'document', 'template']),
        mimeType: z.string().min(3).max(100).default('image/png'),
        publicUrl: z.string().min(1).max(1024),
        fileSizeBytes: z.number().int().min(0).max(536870912).default(0),
        folder: z.string().min(1).max(64).default('General'),
      }).parse(req.body);

      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO media_library (id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, wid, req.user!.id, payload.fileName.trim(), payload.assetType, payload.mimeType, `workspaces/${wid}/${payload.fileName.trim()}`, payload.publicUrl.trim(), payload.fileSizeBytes, payload.folder.trim(), now, now);

      const created = db.prepare('SELECT * FROM media_library WHERE id = ?').get(id) as Record<string, unknown>;
      res.status(201).json(mapMediaRow(created));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/workspaces/:wid/media/:mediaId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const mediaId = String(req.params.mediaId);
    const deleted = db.prepare('DELETE FROM media_library WHERE id = ? AND workspace_id = ?').run(mediaId, wid);
    if (deleted.changes === 0) return res.status(404).json({ error: 'Media asset not found.' });
    res.json({ success: true });
  });

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================
  router.get('/workspaces/:wid/notifications', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare('SELECT * FROM notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(wid) as Record<string, unknown>[];
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      category: String(r.category),
      title: String(r.title),
      body: String(r.body),
      isRead: Boolean(r.is_read),
      createdAt: String(r.created_at),
    })));
  });

  router.post('/workspaces/:wid/notifications/mark-read', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const { notificationId } = z.object({ notificationId: z.string().optional() }).parse(req.body || {});
    const now = new Date().toISOString();
    if (notificationId) {
      db.prepare('UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ? AND workspace_id = ?').run(now, notificationId, wid);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1, updated_at = ? WHERE workspace_id = ?').run(now, wid);
    }
    res.json({ success: true });
  });

  // ===========================================================================
  // BILLING & SUBSCRIPTIONS
  // ===========================================================================
  router.get('/workspaces/:wid/subscription', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const row = db.prepare(`
      SELECT s.*, sp.code as plan_code, sp.name as plan_name, sp.monthly_price_cents, sp.monthly_ai_credits,
             sp.max_workspaces, sp.max_social_accounts, sp.max_team_members
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.workspace_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 1
    `).get(wid) as Record<string, unknown> | undefined;

    if (!row) {
      return res.json({
        id: '',
        workspaceId: wid,
        planCode: 'none',
        planName: 'No Active Plan',
        monthlyPriceCents: 0,
        monthlyAiCredits: 0,
        maxWorkspaces: 1,
        maxSocialAccounts: 0,
        maxTeamMembers: 1,
        status: 'none',
        billingCycle: 'monthly',
        currentPeriodStart: '',
        currentPeriodEnd: '',
        hasSubscription: false,
      });
    }

    res.json({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      planCode: String(row.plan_code),
      planName: String(row.plan_name),
      monthlyPriceCents: Number(row.monthly_price_cents),
      monthlyAiCredits: Number(row.monthly_ai_credits),
      maxWorkspaces: Number(row.max_workspaces),
      maxSocialAccounts: Number(row.max_social_accounts),
      maxTeamMembers: Number(row.max_team_members),
      status: String(row.status),
      billingCycle: String(row.billing_cycle),
      currentPeriodStart: String(row.current_period_start),
      currentPeriodEnd: String(row.current_period_end),
      hasSubscription: String(row.status) === 'active' || String(row.status) === 'trialing',
    });
  });

  router.post('/workspaces/:wid/subscription/change', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const { planCode, billingCycle } = z.object({
        planCode: z.enum(['basic', 'pro', 'enterprise', 'starter', 'growth', 'agency']),
        billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
      }).parse(req.body);
      const plan = db.prepare('SELECT * FROM subscription_plans WHERE code = ?').get(planCode) as Record<string, unknown> | undefined;
      if (!plan) return res.status(404).json({ error: 'Plan not found.' });

      const ws = db.prepare('SELECT organisation_id FROM workspaces WHERE id = ?').get(wid) as { organisation_id: string } | undefined;
      if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

      const now = new Date().toISOString();
      const nextPeriodEnd = new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400 * 1000).toISOString();
      const amountCents = billingCycle === 'annual' ? Number(plan.annual_price_cents) : Number(plan.monthly_price_cents);

      db.transaction(() => {
        const existingSub = db
          .prepare('SELECT id FROM subscriptions WHERE workspace_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1')
          .get(wid) as { id: string } | undefined;

        if (existingSub) {
          db.prepare(`
            UPDATE subscriptions
            SET plan_id = ?, billing_cycle = ?, status = 'active', current_period_start = ?, current_period_end = ?, updated_at = ?
            WHERE id = ?
          `).run(plan.id, billingCycle, now, nextPeriodEnd, now, existingSub.id);
        } else {
          db.prepare(`
            INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
          `).run(crypto.randomUUID(), ws.organisation_id, wid, plan.id, billingCycle, now, nextPeriodEnd, now, now);
        }

        db.prepare('UPDATE workspaces SET ai_credits_balance = MAX(ai_credits_balance, ?), updated_at = ? WHERE id = ?').run(
          Number(plan.monthly_ai_credits), now, wid
        );

        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          workspaceId: wid,
          action: existingSub ? 'billing.plan_changed' : 'billing.plan_subscribed',
          resourceType: 'subscription',
          resourceId: wid,
          metadata: { planCode, planName: String(plan.name), billingCycle, amountCents },
        });
      })();

      const updatedSub = getWorkspaceSubscriptionSummary(db, wid);
      res.json({ success: true, planCode, billingCycle, subscription: updatedSub });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/subscription/cancel', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const now = new Date().toISOString();
      const updated = db
        .prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE workspace_id = ?")
        .run(now, wid);
      if (updated.changes > 0) {
        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          workspaceId: wid,
          action: 'billing.plan_cancelled',
          resourceType: 'subscription',
          resourceId: wid,
          metadata: { status: 'cancelled' },
        });
      }
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/workspaces/:wid/billing-history', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db
      .prepare(`
        SELECT id, action, metadata_json, created_at
        FROM audit_logs
        WHERE workspace_id = ? AND action IN ('billing.plan_subscribed', 'billing.plan_changed', 'billing.plan_cancelled')
        ORDER BY created_at DESC
        LIMIT 25
      `)
      .all(wid) as { id: string; action: string; metadata_json: string; created_at: string }[];

    res.json(
      rows.map((r) => {
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(r.metadata_json || '{}');
        } catch {
          meta = {};
        }
        return {
          id: r.id,
          action: r.action,
          planCode: String(meta.planCode || ''),
          billingCycle: String(meta.billingCycle || 'monthly'),
          amountCents: Number(meta.amountCents || 0),
          createdAt: r.created_at,
        };
      })
    );
  });

  // ===========================================================================
  // TEAM MANAGEMENT
  // ===========================================================================
  router.get('/workspaces/:wid/members', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare(`
      SELECT wm.*, u.full_name
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ?
      ORDER BY wm.created_at ASC
    `).all(wid) as Record<string, unknown>[];
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      invitedEmail: String(r.invited_email),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role_slug),
      status: String(r.status),
      createdAt: String(r.created_at),
    })));
  });

  router.post('/workspaces/:wid/members', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const { email, role } = z.object({
        email: z.string().email(),
        role: z.enum(['workspace_admin', 'editor', 'viewer']),
      }).parse(req.body);

      const sub = getWorkspaceSubscriptionSummary(db, wid);
      const currentMembers = (
        db
          .prepare("SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ? AND status != 'revoked'")
          .get(wid) as { c: number }
      ).c;
      const seatCheck = canAddTeamMember(sub, currentMembers);
      if (!seatCheck.allowed) {
        return res.status(403).json({ error: seatCheck.reason, code: 'PLAN_LIMIT_REACHED' });
      }

      const normalized = email.trim().toLowerCase();
      const now = new Date().toISOString();
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized) as { id: string } | undefined;
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'invited', ?, ?, ?)
      `).run(id, wid, existingUser?.id ?? null, normalized, role, req.user!.id, now, now);

      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        workspaceId: wid,
        action: 'team.member_invited',
        resourceType: 'workspace_member',
        resourceId: id,
        metadata: { email: normalized, role },
      });
      res.status(201).json({ id, email: normalized, role, status: 'invited' });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.delete('/workspaces/:wid/members/:memberId', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const memberId = String(req.params.memberId);
    const now = new Date().toISOString();
    const updated = db.prepare("UPDATE workspace_members SET status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?").run(now, memberId, wid);
    if (updated.changes === 0) return res.status(404).json({ error: 'Team member not found.' });
    res.json({ success: true });
  });

  // ===========================================================================
  // CUSTOMER SUPPORT TICKETS
  // ===========================================================================
  router.get('/workspaces/:wid/tickets', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare('SELECT * FROM support_tickets WHERE workspace_id = ? ORDER BY created_at DESC').all(wid) as Record<string, unknown>[];
    res.json(rows.map(mapTicketRow));
  });

  router.post('/workspaces/:wid/tickets', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z.object({
        subject: z.string().min(4).max(180),
        message: z.string().min(10).max(3000),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      }).parse(req.body);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO support_tickets (id, workspace_id, owner_user_id, subject, message, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `).run(id, wid, req.user!.id, payload.subject.trim(), payload.message.trim(), payload.priority, now, now);

      const created = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as Record<string, unknown>;
      res.status(201).json(mapTicketRow(created));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  // ===========================================================================
  // SUPER-ADMIN PROTECTED CONSOLE (/api/admin/*)
  // ===========================================================================
  router.use('/admin', requireAuth, requireSuperAdmin);

  router.get('/admin/overview', (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const totalRegisteredUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    const activeSubscriptions = (db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('active','trialing')").get() as { c: number }).c;
    const newRegistrations30d = (db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at >= ?').get(thirtyDaysAgo) as { c: number }).c;
    const totalWorkspaces = (db.prepare('SELECT COUNT(*) as c FROM workspaces').get() as { c: number }).c;
    const totalConnectedSocialAccounts = (db.prepare("SELECT COUNT(*) as c FROM social_accounts WHERE connection_status = 'connected'").get() as { c: number }).c;
    const totalAiCreditsConsumed = (db.prepare('SELECT COALESCE(SUM(credits_used), 0) as c FROM ai_usage').get() as { c: number }).c;
    const totalPublishingJobs = (db.prepare('SELECT COUNT(*) as c FROM publishing_jobs').get() as { c: number }).c;
    const failedPublishingJobs = (db.prepare("SELECT COUNT(*) as c FROM publishing_jobs WHERE job_status = 'failed'").get() as { c: number }).c;
    const openSupportTickets = (db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status IN ('open','in_progress')").get() as { c: number }).c;

    const recentUsers = (db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 8').all() as Record<string, unknown>[]).map(mapUserRow);
    const recentAuditLogs = (db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10').all() as Record<string, unknown>[]).map(mapAuditRow);

    res.json({
      metrics: {
        totalRegisteredUsers,
        activeSubscriptions,
        newRegistrations30d,
        totalWorkspaces,
        totalConnectedSocialAccounts,
        totalAiCreditsConsumed,
        totalPublishingJobs,
        failedPublishingJobs,
        openSupportTickets,
      },
      recentUsers,
      recentAuditLogs,
    });
  });

  router.get('/admin/users', (_req, res) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as Record<string, unknown>[];
    res.json(rows.map(mapUserRow));
  });

  router.patch('/admin/users/:userId', (req: AuthedRequest, res) => {
    try {
      const userId = String(req.params.userId);
      const payload = z.object({
        status: z.enum(['active', 'suspended', 'deleted']).optional(),
        role: z.enum(['customer', 'workspace_admin', 'super_admin']).optional(),
        emailVerified: z.boolean().optional(),
      }).parse(req.body);

      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
      if (!target) return res.status(404).json({ error: 'User not found.' });

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET status = COALESCE(?, status),
            role_slug = COALESCE(?, role_slug),
            email_verified = COALESCE(?, email_verified),
            updated_at = ?
        WHERE id = ?
      `).run(
        payload.status ?? null,
        payload.role ?? null,
        payload.emailVerified !== undefined ? (payload.emailVerified ? 1 : 0) : null,
        now,
        userId
      );

      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'admin.user_updated',
        resourceType: 'user',
        resourceId: userId,
        metadata: payload,
      });

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
      res.json(mapUserRow(updated));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/admin/subscriptions', (_req, res) => {
    const rows = db.prepare(`
      SELECT s.*, sp.code as plan_code, sp.name as plan_name, sp.monthly_price_cents, sp.monthly_ai_credits,
             w.name as workspace_name, u.email as owner_email
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.owner_user_id
      ORDER BY s.created_at DESC
    `).all() as Record<string, unknown>[];

    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      workspaceName: String(r.workspace_name),
      ownerEmail: String(r.owner_email),
      planCode: String(r.plan_code),
      planName: String(r.plan_name),
      monthlyPriceCents: Number(r.monthly_price_cents),
      monthlyAiCredits: Number(r.monthly_ai_credits),
      status: String(r.status),
      billingCycle: String(r.billing_cycle),
      currentPeriodStart: String(r.current_period_start),
      currentPeriodEnd: String(r.current_period_end),
    })));
  });

  router.patch('/admin/subscriptions/:subId', (req: AuthedRequest, res) => {
    try {
      const subId = String(req.params.subId);
      const payload = z.object({
        status: z.enum(['trialing', 'active', 'past_due', 'cancelled']).optional(),
        planCode: z.enum(['basic', 'pro', 'enterprise', 'starter', 'growth', 'agency']).optional(),
      }).parse(req.body);

      const now = new Date().toISOString();
      if (payload.planCode) {
        const plan = db.prepare('SELECT id FROM subscription_plans WHERE code = ?').get(payload.planCode) as { id: string } | undefined;
        if (!plan) return res.status(404).json({ error: `Subscription plan "${payload.planCode}" not found.` });
        db.prepare('UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE id = ?').run(plan.id, now, subId);
      }
      if (payload.status) {
        db.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?').run(payload.status, now, subId);
      }

      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'admin.subscription_updated',
        resourceType: 'subscription',
        resourceId: subId,
        metadata: payload,
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/admin/ai-usage', (_req, res) => {
    const rows = db.prepare(`
      SELECT a.*, w.name as workspace_name, u.email as user_email
      FROM ai_usage a
      JOIN workspaces w ON w.id = a.workspace_id
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all() as Record<string, unknown>[];
    res.json(rows.map(mapAiUsageRow));
  });

  router.get('/admin/social-accounts', (_req, res) => {
    const stats = db.prepare(`
      SELECT sp.key as platform_key, sp.display_name, sp.is_enabled,
             COUNT(sa.id) as total_accounts,
             SUM(CASE WHEN sa.connection_status = 'connected' THEN 1 ELSE 0 END) as connected_accounts,
             SUM(CASE WHEN sa.connection_status IN ('expired','revoked') THEN 1 ELSE 0 END) as degraded_accounts
      FROM social_platforms sp
      LEFT JOIN social_accounts sa ON sa.platform_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.display_name ASC
    `).all() as Record<string, unknown>[];

    const syncRows = db.prepare(`
      SELECT * FROM platform_sync_logs ORDER BY created_at DESC LIMIT 30
    `).all() as Record<string, unknown>[];

    const webhookRows = db.prepare(`
      SELECT id, platform_key, event_type, delivery_id, verified, processed_status, created_at
      FROM platform_webhook_events ORDER BY created_at DESC LIMIT 30
    `).all() as Record<string, unknown>[];

    const platforms = listSocialPlatforms(db);
    res.json({
      platforms,
      stats: stats.map((s) => ({
        platformKey: String(s.platform_key),
        displayName: String(s.display_name),
        isEnabled: Boolean(s.is_enabled),
        totalAccounts: Number(s.total_accounts || 0),
        connectedAccounts: Number(s.connected_accounts || 0),
        degradedAccounts: Number(s.degraded_accounts || 0),
      })),
      recentConnectionLogs: listOAuthConnectionLogs(db, { limit: 40 }),
      recentSyncLogs: syncRows.map((r) => ({
        id: String(r.id),
        workspaceId: String(r.workspace_id),
        socialAccountId: String(r.social_account_id),
        platformKey: String(r.platform_key),
        syncType: String(r.sync_type),
        status: String(r.status),
        itemsSynced: Number(r.items_synced || 0),
        rateLimitRemaining: r.rate_limit_remaining !== null && r.rate_limit_remaining !== undefined ? Number(r.rate_limit_remaining) : null,
        errorMessage: r.error_message ? String(r.error_message) : null,
        createdAt: String(r.created_at),
      })),
      recentWebhookEvents: webhookRows.map((w) => ({
        id: String(w.id),
        platformKey: String(w.platform_key),
        eventType: String(w.event_type),
        deliveryId: w.delivery_id ? String(w.delivery_id) : null,
        verified: Boolean(w.verified),
        processedStatus: String(w.processed_status),
        createdAt: String(w.created_at),
      })),
    });
  });

  router.patch('/admin/platforms/:platformKey', (req: AuthedRequest, res) => {
    try {
      const platformKey = PlatformKeySchema.parse(req.params.platformKey);
      const payload = z.object({
        isEnabled: z.boolean().optional(),
        clientIdOverride: z.string().max(240).nullable().optional(),
        clientSecretOverride: z.string().max(400).nullable().optional(),
        developerReviewStatus: z.enum(['not_submitted', 'pending_review', 'approved', 'action_required']).optional(),
        rateLimitRpm: z.number().int().min(10).max(10000).optional(),
        scopes: z.string().min(2).max(1000).optional(),
        clearLastError: z.boolean().optional(),
        permissionApprovals: z.record(z.string(), z.enum(['not_submitted', 'pending_review', 'approved', 'action_required'])).optional(),
      }).parse(req.body);

      const now = new Date().toISOString();
      db.transaction(() => {
        if (payload.isEnabled !== undefined) {
          db.prepare('UPDATE social_platforms SET is_enabled = ?, updated_at = ? WHERE key = ?').run(
            payload.isEnabled ? 1 : 0,
            now,
            platformKey
          );
        }
        if (payload.clientIdOverride !== undefined) {
          const cleaned = payload.clientIdOverride ? payload.clientIdOverride.trim() : null;
          db.prepare('UPDATE social_platforms SET client_id_override = ?, updated_at = ? WHERE key = ?').run(
            cleaned || null,
            now,
            platformKey
          );
        }
        if (payload.clientSecretOverride !== undefined) {
          const cleaned = payload.clientSecretOverride ? payload.clientSecretOverride.trim() : null;
          db.prepare('UPDATE social_platforms SET client_secret_override = ?, updated_at = ? WHERE key = ?').run(
            cleaned || null,
            now,
            platformKey
          );
        }
        if (payload.developerReviewStatus !== undefined) {
          db.prepare('UPDATE social_platforms SET developer_review_status = ?, updated_at = ? WHERE key = ?').run(
            payload.developerReviewStatus,
            now,
            platformKey
          );
        }
        if (payload.rateLimitRpm !== undefined) {
          db.prepare('UPDATE social_platforms SET rate_limit_rpm = ?, updated_at = ? WHERE key = ?').run(
            payload.rateLimitRpm,
            now,
            platformKey
          );
        }
        if (payload.scopes !== undefined) {
          db.prepare('UPDATE social_platforms SET scopes = ?, updated_at = ? WHERE key = ?').run(
            payload.scopes.trim(),
            now,
            platformKey
          );
        }
        if (payload.clearLastError) {
          db.prepare('UPDATE social_platforms SET last_api_error = NULL, last_health_check_at = ?, updated_at = ? WHERE key = ?').run(
            now,
            now,
            platformKey
          );
        }
        if (payload.permissionApprovals) {
          for (const [scopeKey, approvalStatus] of Object.entries(payload.permissionApprovals)) {
            db.prepare('UPDATE platform_permissions SET approval_status = ?, updated_at = ? WHERE platform_key = ? AND scope_key = ?').run(
              approvalStatus,
              now,
              platformKey,
              scopeKey
            );
          }
        }

        recordAuditLog(db, {
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          action: 'admin.platform_configured',
          resourceType: 'social_platform',
          resourceId: platformKey,
          metadata: {
            isEnabled: payload.isEnabled,
            developerReviewStatus: payload.developerReviewStatus,
            rateLimitRpm: payload.rateLimitRpm,
            updatedClientId: payload.clientIdOverride !== undefined,
          },
        });
      })();

      res.json({ success: true, platforms: listSocialPlatforms(db) });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/admin/jobs', (req, res) => {
    const onlyFailed = req.query.status === 'failed';
    const sql = onlyFailed
      ? `SELECT pj.*, cp.title as post_title, w.name as workspace_name
         FROM publishing_jobs pj
         JOIN content_posts cp ON cp.id = pj.content_post_id
         JOIN workspaces w ON w.id = pj.workspace_id
         WHERE pj.job_status = 'failed'
         ORDER BY pj.created_at DESC`
      : `SELECT pj.*, cp.title as post_title, w.name as workspace_name
         FROM publishing_jobs pj
         JOIN content_posts cp ON cp.id = pj.content_post_id
         JOIN workspaces w ON w.id = pj.workspace_id
         ORDER BY pj.created_at DESC LIMIT 100`;
    const rows = db.prepare(sql).all() as Record<string, unknown>[];
    res.json(rows.map(mapJobRow));
  });

  router.post('/admin/jobs/:jobId/retry', (req: AuthedRequest, res) => {
    const jobId = String(req.params.jobId);
    const now = new Date().toISOString();
    const job = db.prepare('SELECT * FROM publishing_jobs WHERE id = ?').get(jobId) as Record<string, unknown> | undefined;
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    db.transaction(() => {
      db.prepare("UPDATE publishing_jobs SET job_status = 'queued', last_error = NULL, updated_at = ? WHERE id = ?").run(now, jobId);
      db.prepare("UPDATE content_posts SET status = 'scheduled', failure_reason = NULL, updated_at = ? WHERE id = ?").run(now, job.content_post_id);
      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        workspaceId: String(job.workspace_id),
        action: 'admin.job_retried',
        resourceType: 'publishing_job',
        resourceId: jobId,
      });
    })();
    res.json({ success: true });
  });

  router.get('/admin/settings', (_req, res) => {
    const rows = db.prepare('SELECT * FROM system_settings ORDER BY key ASC').all() as Record<string, unknown>[];
    res.json(rows.map((r) => ({
      key: String(r.key),
      value: String(r.value),
      description: String(r.description),
      updatedAt: String(r.updated_at),
    })));
  });

  router.patch('/admin/settings', (req: AuthedRequest, res) => {
    try {
      const { key, value } = z.object({ key: z.string().min(1).max(80), value: z.string().max(2000) }).parse(req.body);
      const now = new Date().toISOString();
      const updated = db.prepare('UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key);
      if (updated.changes === 0) {
        const defaultDescriptions: Record<string, string> = {
          app_name: 'Global application name displayed in headers and titles',
          app_tagline: 'Global application subtitle / tagline',
          app_logo_url: 'Global application logo image URL',
          app_footer_text: 'Global footer copyright text',
          app_welcome_message: 'Welcome message on dashboard',
          app_font_color: 'Global application font color (default pure white)',
        };
        if (key in defaultDescriptions) {
          db.prepare('INSERT INTO system_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)').run(
            key,
            value,
            defaultDescriptions[key],
            now
          );
        } else {
          return res.status(404).json({ error: 'Setting key not found.' });
        }
      }
      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'admin.setting_updated',
        resourceType: 'system_setting',
        resourceId: key,
        metadata: { value },
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  router.get('/admin/audit-logs', (_req, res) => {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 150').all() as Record<string, unknown>[];
    res.json(rows.map(mapAuditRow));
  });

  router.get('/admin/tickets', (_req, res) => {
    const rows = db.prepare(`
      SELECT st.*, w.name as workspace_name, u.email as owner_email
      FROM support_tickets st
      JOIN workspaces w ON w.id = st.workspace_id
      JOIN users u ON u.id = st.owner_user_id
      ORDER BY st.created_at DESC
    `).all() as Record<string, unknown>[];
    res.json(rows.map(mapTicketRow));
  });

  router.patch('/admin/tickets/:ticketId', (req: AuthedRequest, res) => {
    try {
      const ticketId = String(req.params.ticketId);
      const payload = z.object({
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
        adminNotes: z.string().max(2000).optional(),
      }).parse(req.body);
      const now = new Date().toISOString();
      db.prepare('UPDATE support_tickets SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? WHERE id = ?').run(
        payload.status, payload.adminNotes ?? null, now, ticketId
      );
      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        action: 'admin.ticket_updated',
        resourceType: 'support_ticket',
        resourceId: ticketId,
        metadata: payload,
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });

  return router;
}

// =============================================================================
// ROW MAPPERS & CLEARLY LABELLED DEMO ANALYTICS BENCHMARK GENERATOR
// =============================================================================
function mapPostRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    authorUserId: String(r.author_user_id),
    title: String(r.title),
    caption: String(r.caption),
    platformKey: String(r.platform_key) as PlatformKey,
    status: String(r.status) as PostStatus,
    campaignTag: r.campaign_tag ? String(r.campaign_tag) : null,
    hashtags: JSON.parse(String(r.hashtags_json || '[]')) as string[],
    scheduledFor: r.scheduled_for ? String(r.scheduled_for) : null,
    publishedAt: r.published_at ? String(r.published_at) : null,
    failureReason: r.failure_reason ? String(r.failure_reason) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapJobRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : undefined,
    contentPostId: String(r.content_post_id),
    postTitle: String(r.post_title || 'Untitled Post'),
    platformKey: String(r.platform_key) as PlatformKey,
    jobStatus: String(r.job_status),
    attemptCount: Number(r.attempt_count),
    maxAttempts: Number(r.max_attempts),
    lastError: r.last_error ? String(r.last_error) : null,
    runAt: String(r.run_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
    createdAt: String(r.created_at),
  };
}

function mapSocialAccountRow(r: Record<string, unknown>) {
  const platformKey = String(r.platform_key) as PlatformKey;
  const provider = getSocialProvider(platformKey);
  const rawScopes = r.granted_scopes ? String(r.granted_scopes) : r.token_scope ? String(r.token_scope) : '';
  const permCheck = provider.validatePermissions(rawScopes);

  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    connectedByUserId: r.connected_by_user_id ? String(r.connected_by_user_id) : null,
    connectedByEmail: r.connected_by_email ? String(r.connected_by_email) : null,
    connectedByName: r.connected_by_name ? String(r.connected_by_name) : null,
    platformKey,
    platformName: String(r.platform_name),
    externalAccountId: String(r.external_account_id || ''),
    accountHandle: String(r.account_handle),
    accountName: String(r.account_name),
    accountType: String(r.account_type || 'profile') as SocialAccountType,
    accountDescription: String(r.account_description || ''),
    businessCategory: String(r.business_category || ''),
    followersCount: r.followers_count !== null && r.followers_count !== undefined ? Number(r.followers_count) : null,
    avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
    connectionStatus: String(r.connection_status),
    permissionsStatus: String(r.permissions_status || permCheck.status),
    scopes: rawScopes || null,
    grantedScopes: permCheck.grantedScopes,
    missingRequiredScopes: permCheck.missingRequiredScopes,
    capabilities: parseSocialAccountCapabilities(platformKey, r.capabilities_json),
    publishingPreferences: parsePublishingPreferences(r.publishing_preferences_json),
    tokenExpiresAt: r.token_expires_at ? String(r.token_expires_at) : null,
    tokenVaultStatus: Number(r.has_encrypted_token || 0) === 1 ? 'encrypted_aes256_gcm' : 'missing',
    hasRefreshToken: Number(r.has_refresh_token || 0) === 1,
    lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    lastError: r.last_error ? String(r.last_error) : null,
    createdAt: String(r.created_at),
  };
}

function mapAnalyticsRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    platformKey: String(r.platform_key) as PlatformKey,
    snapshotDate: String(r.snapshot_date),
    impressions: Number(r.impressions),
    engagements: Number(r.engagements),
    clicks: Number(r.clicks),
    followersTotal: Number(r.followers_total),
    isDemo: Boolean(r.is_demo),
  };
}

function mapMediaRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    fileName: String(r.file_name),
    assetType: String(r.asset_type),
    mimeType: String(r.mime_type),
    publicUrl: String(r.public_url),
    fileSizeBytes: Number(r.file_size_bytes),
    folder: String(r.folder),
    createdAt: String(r.created_at),
  };
}

function mapAiUsageRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : undefined,
    userEmail: r.user_email ? String(r.user_email) : undefined,
    feature: String(r.feature),
    modelName: String(r.model_name),
    creditsUsed: Number(r.credits_used),
    promptTokens: Number(r.prompt_tokens),
    completionTokens: Number(r.completion_tokens),
    status: String(r.status),
    createdAt: String(r.created_at),
  };
}

function mapTicketRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : undefined,
    ownerEmail: r.owner_email ? String(r.owner_email) : undefined,
    subject: String(r.subject),
    message: String(r.message),
    priority: String(r.priority),
    status: String(r.status),
    adminNotes: r.admin_notes ? String(r.admin_notes) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapAuditRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorEmail: r.actor_email ? String(r.actor_email) : null,
    workspaceId: r.workspace_id ? String(r.workspace_id) : null,
    action: String(r.action),
    resourceType: String(r.resource_type),
    resourceId: r.resource_id ? String(r.resource_id) : null,
    metadata: JSON.parse(String(r.metadata_json || '{}')),
    createdAt: String(r.created_at),
  };
}


