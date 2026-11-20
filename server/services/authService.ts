import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import { hashPassword, verifyPassword } from '../db/database';
import { env } from '../env';
import { slugifyWorkspaceName, validatePasswordStrength } from '../../src/utils/domain';
import type { UserProfile, UserRole, WorkspaceSummary } from '../../src/shared/api-contracts';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_RENEW_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // Renew when < 3 days remaining

function hashSessionToken(token: string): string {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

function passwordFingerprint(passwordHash: unknown): string {
  const raw = typeof passwordHash === 'string' ? passwordHash : '';
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

interface SignedSessionPayload {
  sid: string;
  uid: string;
  email: string;
  pfp: string;
  exp: number;
}

function signSessionToken(payload: SignedSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(encoded).digest('base64url');
  return `lt1.${encoded}.${sig}`;
}

function verifySignedSessionToken(rawToken: string): SignedSessionPayload | null {
  if (!rawToken.startsWith('lt1.')) return null;
  const parts = rawToken.split('.');
  if (parts.length !== 3) return null;
  const [, encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;
  const expectedSig = crypto.createHmac('sha256', env.SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SignedSessionPayload>;
    if (
      typeof parsed.sid === 'string' &&
      typeof parsed.uid === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.pfp === 'string' &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    ) {
      return parsed as SignedSessionPayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function mapUserRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    role: row.role_slug as UserRole,
    emailVerified: Boolean(row.email_verified),
    status: row.status as UserProfile['status'],
    timezone: String(row.timezone || 'UTC'),
    preferredLanguage: String(row.preferred_language || 'en'),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getWorkspaceSubscriptionSummary(
  db: DbInstance,
  workspaceId: string
): NonNullable<WorkspaceSummary['subscription']> {
  const row = db
    .prepare(`
      SELECT s.status, s.billing_cycle, s.current_period_end,
             sp.code as plan_code, sp.name as plan_name,
             sp.max_workspaces, sp.max_social_accounts, sp.max_team_members, sp.monthly_ai_credits
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.workspace_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 1
    `)
    .get(workspaceId) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      planCode: 'none',
      planName: 'No Active Plan',
      status: 'none',
      billingCycle: 'monthly',
      currentPeriodEnd: null,
      maxWorkspaces: 1,
      maxSocialAccounts: 0,
      maxTeamMembers: 1,
      monthlyAiCredits: 0,
    };
  }

  return {
    planCode: String(row.plan_code) as NonNullable<WorkspaceSummary['subscription']>['planCode'],
    planName: String(row.plan_name),
    status: String(row.status) as NonNullable<WorkspaceSummary['subscription']>['status'],
    billingCycle: String(row.billing_cycle) === 'annual' ? 'annual' : 'monthly',
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : null,
    maxWorkspaces: Number(row.max_workspaces || 1),
    maxSocialAccounts: Number(row.max_social_accounts || 0),
    maxTeamMembers: Number(row.max_team_members || 1),
    monthlyAiCredits: Number(row.monthly_ai_credits || 0),
  };
}

export function listUserWorkspaces(db: DbInstance, userId: string): WorkspaceSummary[] {
  const rows = db.prepare(`
    SELECT DISTINCT w.*,
      bp.id as bp_id, bp.brand_name, bp.logo_url, bp.primary_color, bp.secondary_color,
      bp.accent_color, bp.business_description, bp.industry, bp.target_audience,
      bp.tone_of_voice, bp.preferred_language as bp_lang, bp.timezone as bp_tz, bp.updated_at as bp_updated_at
    FROM workspaces w
    LEFT JOIN brand_profiles bp ON bp.workspace_id = w.id
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ? AND wm.status = 'active'
    WHERE w.owner_user_id = ? OR wm.user_id = ?
    ORDER BY w.created_at ASC
  `).all(userId, userId, userId) as Record<string, unknown>[];

  return rows.map((r) => {
    const wid = String(r.id);
    return {
      id: wid,
      organisationId: String(r.organisation_id),
      ownerUserId: String(r.owner_user_id),
      name: String(r.name),
      slug: String(r.slug),
      timezone: String(r.timezone),
      preferredLanguage: String(r.preferred_language),
      aiCreditsBalance: Number(r.ai_credits_balance),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      brandProfile: {
        id: String(r.bp_id || ''),
        workspaceId: wid,
        brandName: String(r.brand_name || r.name),
        logoUrl: String(r.logo_url || ''),
        primaryColor: String(r.primary_color || '#0052FF'),
        secondaryColor: String(r.secondary_color || '#071436'),
        accentColor: String(r.accent_color || '#F59E0B'),
        businessDescription: String(r.business_description || ''),
        industry: String(r.industry || ''),
        targetAudience: String(r.target_audience || ''),
        toneOfVoice: String(r.tone_of_voice || 'Executive & Authoritative'),
        preferredLanguage: String(r.bp_lang || r.preferred_language || 'en'),
        timezone: String(r.bp_tz || r.timezone || 'UTC'),
        updatedAt: String(r.bp_updated_at || r.updated_at),
      },
      subscription: getWorkspaceSubscriptionSummary(db, wid),
    };
  });
}

export function createSession(db: DbInstance, userId: string): string {
  const userRow = db.prepare('SELECT email, password_hash FROM users WHERE id = ?').get(userId) as
    | { email: string; password_hash: string | null }
    | undefined;
  const sessionId = crypto.randomUUID();
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const expMs = nowMs + SESSION_TTL_MS;
  const expiresAt = new Date(expMs).toISOString();

  const rawToken = userRow
    ? signSessionToken({
        sid: sessionId,
        uid: userId,
        email: userRow.email,
        pfp: passwordFingerprint(userRow.password_hash),
        exp: expMs,
      })
    : crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, expiresAt, now);

  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, userId);
  return rawToken;
}

export function getUserBySessionToken(db: DbInstance, rawToken: string): UserProfile | null {
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const row = db.prepare(`
    SELECT u.*, s.id as session_id, s.expires_at as session_expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
  `).get(tokenHash, now) as Record<string, unknown> | undefined;

  if (row) {
    // Sliding session renewal: extend active sessions approaching expiry
    const expMs = Date.parse(String(row.session_expires_at || ''));
    if (Number.isFinite(expMs) && expMs - nowMs < SESSION_RENEW_THRESHOLD_MS) {
      const renewedExpires = new Date(nowMs + SESSION_TTL_MS).toISOString();
      db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(renewedExpires, String(row.session_id));
    }
    return mapUserRow(row);
  }

  // Serverless cold-start fallback: if ephemeral /tmp SQLite lost the sessions row on a cold start,
  // verify HMAC-signed token against the active user + password fingerprint and re-hydrate cleanly.
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;
  if (isServerless) {
    const verified = verifySignedSessionToken(rawToken);
    if (verified) {
      const userRow = db.prepare(`
        SELECT * FROM users WHERE (id = ? OR email = ?) AND status = 'active' LIMIT 1
      `).get(verified.uid, verified.email) as Record<string, unknown> | undefined;
      if (userRow && passwordFingerprint(userRow.password_hash) === verified.pfp) {
        const expiresAt = new Date(verified.exp).toISOString();
        db.prepare(`
          INSERT OR IGNORE INTO sessions (id, user_id, token_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(verified.sid, String(userRow.id), tokenHash, expiresAt, now);
        return mapUserRow(userRow);
      }
    }
  }

  return null;
}

export function revokeSession(db: DbInstance, rawToken: string): void {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function recordAuditLog(
  db: DbInstance,
  params: {
    actorUserId?: string | null;
    actorEmail?: string | null;
    workspaceId?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, actor_email, workspace_id, action, resource_type, resource_id, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    params.actorUserId ?? null,
    params.actorEmail ?? null,
    params.workspaceId ?? null,
    params.action,
    params.resourceType,
    params.resourceId ?? null,
    JSON.stringify(params.metadata ?? {}),
    now,
    now
  );
}

export function registerUserWithWorkspace(
  db: DbInstance,
  input: {
    email: string;
    password: string;
    fullName: string;
    workspaceName?: string;
    industry?: string;
  }
) {
  const email = input.email.trim().toLowerCase();
  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new Error(strength.reason || 'Weak password');
  }

  const allowReg = db.prepare("SELECT value FROM system_settings WHERE key = 'allow_new_registrations'").get() as { value: string } | undefined;
  if (allowReg?.value === 'false') {
    throw new Error('New registrations are temporarily paused by the administrator.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const wsId = crypto.randomUUID();
  const wsName = (input.workspaceName || `${input.fullName.split(' ')[0]}'s Brand Workspace`).trim();
  const slugBase = slugifyWorkspaceName(wsName);
  const uniqueSlug = `${slugBase}-${crypto.randomBytes(3).toString('hex')}`;
  const initialCredits = 0;
  const verifyToken = crypto.randomBytes(20).toString('hex');

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, auth_provider, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
      VALUES (?, 'password', ?, ?, ?, 'customer', 0, 'active', 'UTC', 'en', ?, ?)
    `).run(userId, email, hashPassword(input.password), input.fullName.trim(), now, now);

    db.prepare(`
      INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, userId, wsName, uniqueSlug, email, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'UTC', 'en', ?, ?, ?)
    `).run(wsId, orgId, userId, wsName, uniqueSlug, initialCredits, now, now);

    db.prepare(`
      INSERT INTO brand_profiles (
        id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
        business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
      ) VALUES (?, ?, ?, '', '#0052FF', '#071436', '#F59E0B', '', ?, '', 'Professional & Modern', 'en', 'UTC', ?, ?)
    `).run(crypto.randomUUID(), wsId, wsName, input.industry || '', now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsId, userId, email, userId, now, now);

    db.prepare(`
      INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
      VALUES (?, ?, ?, 'billing', 'Select Your Subscription Plan', 'Your workspace is ready. Visit Billing & Subscriptions to choose Basic, Pro, or Enterprise and unlock your package modules.', 0, ?, ?)
    `).run(crypto.randomUUID(), wsId, userId, now, now);

    const verifyExpires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
      VALUES (?, ?, 'email_verify', ?, ?, ?)
    `).run(crypto.randomUUID(), userId, verifyToken, verifyExpires, now);

    recordAuditLog(db, {
      actorUserId: userId,
      actorEmail: email,
      workspaceId: wsId,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: userId,
      metadata: { workspaceName: wsName },
    });
  });

  tx();

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const token = createSession(db, userId);
  return {
    user: mapUserRow(userRow),
    workspaces: listUserWorkspaces(db, userId),
    token,
    verificationToken: verifyToken,
  };
}

export function loginWithPassword(db: DbInstance, emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
  if (!row || !row.password_hash) {
    throw new Error('Invalid email or password.');
  }
  if (row.status === 'suspended') {
    throw new Error('This account has been suspended. Contact support for assistance.');
  }
  if (row.status === 'deleted') {
    throw new Error('This account is scheduled for deletion. Use Account Recovery to restore access.');
  }
  if (!verifyPassword(password, String(row.password_hash))) {
    throw new Error('Invalid email or password.');
  }

  const user = mapUserRow(row);
  const token = createSession(db, user.id);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'auth.login',
    resourceType: 'session',
    resourceId: user.id,
  });

  return {
    user,
    workspaces: listUserWorkspaces(db, user.id),
    token,
  };
}

export function syncFirebaseGoogleUser(
  db: DbInstance,
  input: { externalUid: string; email: string; fullName: string; avatarUrl?: string | null; emailVerified: boolean }
) {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  let row = db.prepare('SELECT * FROM users WHERE external_uid = ? OR email = ?').get(input.externalUid, email) as Record<string, unknown> | undefined;

  if (!row) {
    const userId = crypto.randomUUID();
    const orgId = crypto.randomUUID();
    const wsId = crypto.randomUUID();
    const role: UserRole = email === 'livingstoneedu64@gmail.com' ? 'super_admin' : 'customer';
    const wsName = `${input.fullName.split(' ')[0]}'s Agency Workspace`;
    const uniqueSlug = `${slugifyWorkspaceName(wsName)}-${crypto.randomBytes(3).toString('hex')}`;
    const enterprisePlan =
      role === 'super_admin'
        ? (db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get() as { id: string } | undefined)
        : undefined;
    const periodEnd = new Date(Date.now() + 365 * 86400 * 1000).toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, auth_provider, external_uid, email, full_name, avatar_url, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
        VALUES (?, 'google', ?, ?, ?, ?, ?, ?, 'active', 'UTC', 'en', ?, ?)
      `).run(userId, input.externalUid, email, input.fullName, input.avatarUrl ?? null, role, input.emailVerified ? 1 : 0, now, now);

      db.prepare(`
        INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, userId, wsName, uniqueSlug, email, now, now);

      db.prepare(`
        INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'UTC', 'en', ?, ?, ?)
      `).run(wsId, orgId, userId, wsName, uniqueSlug, role === 'super_admin' ? 15000 : 0, now, now);

      db.prepare(`
        INSERT INTO brand_profiles (
          id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
          business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
        ) VALUES (?, ?, ?, '', '#0052FF', '#071436', '#F59E0B', '', '', '', 'Executive & Authoritative', 'en', 'UTC', ?, ?)
      `).run(crypto.randomUUID(), wsId, wsName, now, now);

      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
      `).run(crypto.randomUUID(), wsId, userId, email, userId, now, now);

      if (enterprisePlan) {
        db.prepare(`
          INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'active', 'annual', ?, ?, ?, ?)
        `).run(crypto.randomUUID(), orgId, wsId, enterprisePlan.id, now, periodEnd, now, now);
      }
    })();

    row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  } else {
    db.prepare(`
      UPDATE users
      SET external_uid = COALESCE(external_uid, ?),
          avatar_url = COALESCE(?, avatar_url),
          email_verified = CASE WHEN ? = 1 THEN 1 ELSE email_verified END,
          updated_at = ?
      WHERE id = ?
    `).run(input.externalUid, input.avatarUrl ?? null, input.emailVerified ? 1 : 0, now, row.id);
    row = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id) as Record<string, unknown>;
  }

  const user = mapUserRow(row);
  if (user.status !== 'active') {
    throw new Error('This account is not active.');
  }
  const token = createSession(db, user.id);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'auth.google_login',
    resourceType: 'session',
    resourceId: user.id,
  });

  return {
    user,
    workspaces: listUserWorkspaces(db, user.id),
    token,
  };
}

export function createPasswordResetToken(db: DbInstance, emailInput: string): { resetToken?: string } {
  const email = emailInput.trim().toLowerCase();
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as { id: string; email: string } | undefined;
  if (!user) {
    // Do not leak user existence in production responses; return empty
    return {};
  }
  const resetToken = crypto.randomBytes(20).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  db.prepare(`
    INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
    VALUES (?, ?, 'password_reset', ?, ?, ?)
  `).run(crypto.randomUUID(), user.id, resetToken, expiresAt, now);

  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'auth.password_reset_requested',
    resourceType: 'user',
    resourceId: user.id,
  });

  return { resetToken };
}

export function confirmPasswordReset(db: DbInstance, tokenValue: string, newPassword: string): void {
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new Error(strength.reason || 'Weak password');
  }
  const now = new Date().toISOString();
  const tokenRow = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE token_value = ? AND token_type = 'password_reset' AND used_at IS NULL AND expires_at > ?
  `).get(tokenValue, now) as { id: string; user_id: string } | undefined;

  if (!tokenRow) {
    throw new Error('Invalid or expired password reset token.');
  }

  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hashPassword(newPassword), now, tokenRow.user_id);
    db.prepare('UPDATE auth_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tokenRow.user_id);
    recordAuditLog(db, {
      actorUserId: tokenRow.user_id,
      action: 'auth.password_reset_completed',
      resourceType: 'user',
      resourceId: tokenRow.user_id,
    });
  })();
}

export function verifyEmailWithToken(db: DbInstance, tokenValue: string): void {
  const now = new Date().toISOString();
  const tokenRow = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE token_value = ? AND token_type = 'email_verify' AND used_at IS NULL AND expires_at > ?
  `).get(tokenValue, now) as { id: string; user_id: string } | undefined;

  if (!tokenRow) {
    throw new Error('Invalid or expired verification token.');
  }

  db.transaction(() => {
    db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(now, tokenRow.user_id);
    db.prepare('UPDATE auth_tokens SET used_at = ? WHERE id = ?').run(now, tokenRow.id);
    recordAuditLog(db, {
      actorUserId: tokenRow.user_id,
      action: 'auth.email_verified',
      resourceType: 'user',
      resourceId: tokenRow.user_id,
    });
  })();
}

export function assertWorkspaceAccess(db: DbInstance, userId: string, workspaceId: string, role: UserRole): boolean {
  if (role === 'super_admin') {
    const ws = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(workspaceId);
    return Boolean(ws);
  }
  const owned = db.prepare('SELECT id FROM workspaces WHERE id = ? AND owner_user_id = ?').get(workspaceId, userId);
  if (owned) return true;
  const member = db.prepare("SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'").get(workspaceId, userId);
  return Boolean(member);
}
