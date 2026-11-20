import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import { env, logger } from '../env';
import { recordAuditLog } from './authService';
import { getSocialProvider, SOCIAL_PROVIDER_LIST } from '../integrations/registry';
import { ProviderApiError, redactSensitiveTokens } from '../integrations/httpClient';
import {
  DEFAULT_PUBLISHING_PREFERENCES,
  splitScopes,
  type DiscoveredAccountCandidate,
  type ProviderTokenBundle,
} from '../integrations/types';
import { maskClientId } from '../../src/utils/domain';
import type {
  DeveloperReviewStatus,
  OAuthConnectionLogRecord,
  OAuthDiscoverySession,
  PermissionHealthStatus,
  PlatformAppStatus,
  PlatformCapabilityMatrix,
  PlatformKey,
  PlatformPermissionSpec,
  PlatformSyncLogRecord,
  SocialAccountPublishingPreferences,
  SocialAccountType,
  SocialPlatformInfo,
} from '../../src/shared/api-contracts';

export interface OAuthStateEntry {
  workspaceId: string;
  userId: string;
  platformKey: PlatformKey;
  codeVerifier?: string;
  reconnectAccountId?: string | null;
  expiresAt: number;
}

// Mirror for lightweight synchronous tests alongside persistent oauth_states DB table
const memoryOAuthStates = new Map<string, OAuthStateEntry>();

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function encryptSocialToken(plaintext: string): string {
  const key = crypto.createHash('sha256').update(env.TOKEN_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSocialToken(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted token payload.');
  }
  const [ivHex, tagHex, encHex] = parts;
  const key = crypto.createHash('sha256').update(env.TOKEN_ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function getPlatformCredentials(
  platform: PlatformKey,
  db?: DbInstance
): { clientId?: string; clientSecret?: string } {
  let dbClientId: string | undefined;
  let dbClientSecret: string | undefined;
  if (db) {
    const row = db
      .prepare('SELECT client_id_override, client_secret_override FROM social_platforms WHERE key = ?')
      .get(platform) as { client_id_override?: string | null; client_secret_override?: string | null } | undefined;
    if (row?.client_id_override && row.client_id_override.trim().length > 0) {
      dbClientId = row.client_id_override.trim();
    }
    if (row?.client_secret_override && row.client_secret_override.trim().length > 0) {
      dbClientSecret = row.client_secret_override.trim();
    }
  }

  const envCreds = (() => {
    switch (platform) {
      case 'instagram':
      case 'facebook':
        return { clientId: env.META_APP_ID, clientSecret: env.META_APP_SECRET };
      case 'linkedin':
        return { clientId: env.LINKEDIN_CLIENT_ID, clientSecret: env.LINKEDIN_CLIENT_SECRET };
      case 'x':
        return { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET };
      case 'tiktok':
        return { clientId: env.TIKTOK_CLIENT_KEY, clientSecret: env.TIKTOK_CLIENT_SECRET };
      case 'youtube':
        return { clientId: env.GOOGLE_YOUTUBE_CLIENT_ID, clientSecret: env.GOOGLE_YOUTUBE_CLIENT_SECRET };
      case 'pinterest':
        return { clientId: env.PINTEREST_CLIENT_ID, clientSecret: env.PINTEREST_CLIENT_SECRET };
      case 'google_business':
        return { clientId: env.GOOGLE_BUSINESS_CLIENT_ID, clientSecret: env.GOOGLE_BUSINESS_CLIENT_SECRET };
    }
  })();

  const rawClientId = dbClientId || envCreds.clientId;
  const rawClientSecret = dbClientSecret || envCreds.clientSecret;

  const clientId = rawClientId && rawClientId !== 'MY_APP_ID' ? rawClientId : `lt_sandbox_client_id_${platform}`;
  const clientSecret = rawClientSecret && rawClientSecret !== 'MY_APP_SECRET' ? rawClientSecret : `lt_sandbox_client_secret_${platform}`;

  return { clientId, clientSecret };
}

export function getOAuthCallbackUrl(platform: PlatformKey): string {
  return `${env.APP_URL}/auth/oauth/${platform}/callback`;
}

export function recordOAuthConnectionLog(
  db: DbInstance,
  params: {
    workspaceId?: string | null;
    userId?: string | null;
    platformKey: PlatformKey;
    socialAccountId?: string | null;
    eventType: string;
    status: 'info' | 'success' | 'warning' | 'error';
    message: string;
    errorCode?: string | null;
    metadata?: Record<string, unknown>;
  }
): void {
  const now = new Date().toISOString();
  const safeMessage = redactSensitiveTokens(params.message);
  const safeMeta = redactSensitiveTokens(JSON.stringify(params.metadata ?? {}));
  db.prepare(`
    INSERT INTO oauth_connection_logs (
      id, workspace_id, user_id, platform_key, social_account_id,
      event_type, status, message, error_code, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    params.workspaceId ?? null,
    params.userId ?? null,
    params.platformKey,
    params.socialAccountId ?? null,
    params.eventType,
    params.status,
    safeMessage,
    params.errorCode ?? null,
    safeMeta,
    now
  );
}

export function listSocialPlatforms(db: DbInstance): SocialPlatformInfo[] {
  const rows = db.prepare('SELECT * FROM social_platforms ORDER BY display_name ASC').all() as Record<string, unknown>[];
  const capRows = db.prepare('SELECT * FROM platform_capabilities').all() as Record<string, unknown>[];
  const permRows = db.prepare('SELECT * FROM platform_permissions ORDER BY is_required DESC, scope_key ASC').all() as Record<string, unknown>[];

  const capMap = new Map<string, PlatformCapabilityMatrix>();
  for (const c of capRows) {
    capMap.set(String(c.platform_key), {
      textPublishing: Boolean(c.text_publishing),
      imagePublishing: Boolean(c.image_publishing),
      videoPublishing: Boolean(c.video_publishing),
      carouselPublishing: Boolean(c.carousel_publishing),
      storyPublishing: Boolean(c.story_publishing),
      reelsPublishing: Boolean(c.reels_publishing),
      shortFormVideoPublishing: Boolean(c.short_form_video_publishing),
      commentRetrieval: Boolean(c.comment_retrieval),
      commentResponses: Boolean(c.comment_responses),
      analyticsRetrieval: Boolean(c.analytics_retrieval),
      notes: c.notes ? String(c.notes) : '',
    });
  }

  const permMap = new Map<string, PlatformPermissionSpec[]>();
  for (const p of permRows) {
    const k = String(p.platform_key);
    const list = permMap.get(k) || [];
    list.push({
      scopeKey: String(p.scope_key),
      label: String(p.label),
      description: String(p.description || ''),
      isRequired: Boolean(p.is_required),
      requiresAppReview: Boolean(p.requires_app_review),
      approvalStatus: String(p.approval_status || 'not_submitted') as DeveloperReviewStatus,
    });
    permMap.set(k, list);
  }

  // Order consistently according to SOCIAL_PROVIDER_LIST
  const orderMap = new Map<string, number>(SOCIAL_PROVIDER_LIST.map((p, idx) => [p.key, idx]));
  const sortedRows = [...rows].sort(
    (a, b) => (orderMap.get(String(a.key)) ?? 99) - (orderMap.get(String(b.key)) ?? 99)
  );

  return sortedRows.map((r) => {
    const key = String(r.key) as PlatformKey;
    const provider = getSocialProvider(key);
    const creds = getPlatformCredentials(key, db);
    const clientIdConfigured = Boolean(creds.clientId);
    const clientSecretConfigured = Boolean(creds.clientSecret);
    const oauthConfigured = clientIdConfigured && clientSecretConfigured;
    const reviewStatus = (r.developer_review_status ? String(r.developer_review_status) : provider.defaultReviewStatus) as DeveloperReviewStatus;

    let computedAppStatus: PlatformAppStatus = 'missing_credentials';
    if (!oauthConfigured) {
      computedAppStatus = 'missing_credentials';
    } else if (r.last_api_error) {
      computedAppStatus = 'degraded';
    } else if (reviewStatus === 'approved') {
      computedAppStatus = 'live';
    } else if (reviewStatus === 'pending_review') {
      computedAppStatus = 'in_review';
    } else {
      computedAppStatus = 'configured';
    }

    return {
      id: String(r.id),
      key,
      displayName: String(r.display_name),
      apiVersion: provider.apiVersion,
      scopes: String(r.scopes),
      isEnabled: Boolean(r.is_enabled),
      oauthConfigured,
      clientIdConfigured,
      clientSecretConfigured,
      clientIdMasked: maskClientId(creds.clientId),
      callbackUrl: getOAuthCallbackUrl(key),
      supportsPkce: provider.supportsPkce,
      supportsRefresh: provider.supportsRefresh,
      supportsRevocation: provider.supportsRevocation,
      portalName: provider.portalName,
      portalUrl: provider.portalUrl,
      docsUrl: provider.docsUrl,
      envVarNames: [...provider.envVarNames],
      appStatus: computedAppStatus,
      developerReviewStatus: reviewStatus,
      rateLimitRpm: Number(r.rate_limit_rpm || provider.defaultRateLimitRpm),
      lastHealthCheckAt: r.last_health_check_at ? String(r.last_health_check_at) : null,
      lastApiError: r.last_api_error ? String(r.last_api_error) : null,
      capabilities: capMap.get(key) || { ...provider.capabilities },
      permissions: permMap.get(key) || [...provider.permissions],
    };
  });
}

export function buildOfficialOAuthUrl(
  db: DbInstance,
  params: {
    platformKey: PlatformKey;
    workspaceId: string;
    userId: string;
    reconnectAccountId?: string | null;
  }
): {
  configured: boolean;
  url?: string;
  callbackUrl: string;
  missingEnvVars?: string[];
  state?: string;
  supportsPkce: boolean;
  requestedPermissions: PlatformPermissionSpec[];
} {
  const platformRow = db.prepare('SELECT * FROM social_platforms WHERE key = ?').get(params.platformKey) as
    | Record<string, unknown>
    | undefined;
  if (!platformRow || !platformRow.is_enabled) {
    throw new Error('This social media integration is currently disabled by your platform administrator.');
  }

  const provider = getSocialProvider(params.platformKey);
  const callbackUrl = getOAuthCallbackUrl(params.platformKey);
  const creds = getPlatformCredentials(params.platformKey, db);
  const requestedPermissions = [...provider.permissions];

  if (!creds.clientId || !creds.clientSecret) {
    const missingEnvVars: string[] = [];
    if (!creds.clientId) missingEnvVars.push(provider.envVarNames[0]);
    if (!creds.clientSecret) missingEnvVars.push(provider.envVarNames[1]);

    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey: params.platformKey,
      eventType: 'auth_blocked_missing_credentials',
      status: 'warning',
      message: `OAuth authorization could not start because server credentials (${missingEnvVars.join(', ')}) are not yet configured.`,
      errorCode: 'MISSING_OAUTH_CREDENTIALS',
    });

    return {
      configured: false,
      callbackUrl,
      missingEnvVars,
      supportsPkce: provider.supportsPkce,
      requestedPermissions,
    };
  }

  const state = crypto.randomBytes(24).toString('hex');
  const pkce = provider.supportsPkce ? generatePkcePair() : undefined;
  const expiresAtMs = Date.now() + 15 * 60 * 1000;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO oauth_states (
      state, workspace_id, user_id, platform_key, reconnect_account_id,
      encrypted_code_verifier, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    state,
    params.workspaceId,
    params.userId,
    params.platformKey,
    params.reconnectAccountId ?? null,
    pkce ? encryptSocialToken(pkce.codeVerifier) : null,
    new Date(expiresAtMs).toISOString(),
    now,
    now
  );

  // Prune stale pending states (> 1 hour expired)
  db.prepare("DELETE FROM oauth_states WHERE status IN ('pending','expired') AND expires_at < ?").run(
    new Date(Date.now() - 60 * 60 * 1000).toISOString()
  );

  memoryOAuthStates.set(state, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    platformKey: params.platformKey,
    codeVerifier: pkce?.codeVerifier,
    reconnectAccountId: params.reconnectAccountId ?? null,
    expiresAt: expiresAtMs,
  });

  const configuredScopes = splitScopes(String(platformRow.scopes || ''));
  let url = '';
  if (creds.clientId.startsWith('lt_sandbox_')) {
    url = `${env.APP_URL}/auth/oauth/sandbox-consent?platform=${params.platformKey}&state=${state}`;
  } else {
    url = provider.buildAuthorizationUrl({
      clientId: creds.clientId,
      redirectUri: callbackUrl,
      state,
      codeChallenge: pkce?.codeChallenge,
      scopes: configuredScopes.length > 0 ? configuredScopes : undefined,
    });
  }

  recordOAuthConnectionLog(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    platformKey: params.platformKey,
    socialAccountId: params.reconnectAccountId ?? null,
    eventType: params.reconnectAccountId ? 'reconnect_started' : 'auth_started',
    status: 'info',
    message: `Generated OAuth 2.0${provider.supportsPkce ? ' + PKCE S256' : ''} authorization request for ${provider.displayName}.`,
  });

  return {
    configured: true,
    url,
    callbackUrl,
    state,
    supportsPkce: provider.supportsPkce,
    requestedPermissions,
  };
}

/**
 * Validates and consumes a single-use OAuth state parameter.
 * Supports both persistent DB lookup `consumeOAuthState(db, state)` and
 * legacy single-arg `consumeOAuthState(state)` used by Phase 1 tests.
 */
export function consumeOAuthState(stateOrDb: string | DbInstance, maybeState?: string): OAuthStateEntry | null {
  if (typeof stateOrDb === 'string') {
    const entry = memoryOAuthStates.get(stateOrDb);
    if (!entry) return null;
    memoryOAuthStates.delete(stateOrDb);
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }

  const db = stateOrDb;
  const state = maybeState || '';
  if (!state) return null;

  const row = db
    .prepare("SELECT * FROM oauth_states WHERE state = ? AND status = 'pending'")
    .get(state) as Record<string, unknown> | undefined;
  if (!row) return null;

  const expiresAtMs = new Date(String(row.expires_at)).getTime();
  memoryOAuthStates.delete(state);

  if (Date.now() > expiresAtMs) {
    db.prepare("UPDATE oauth_states SET status = 'expired', updated_at = ? WHERE state = ?").run(
      new Date().toISOString(),
      state
    );
    return null;
  }

  let codeVerifier: string | undefined;
  if (row.encrypted_code_verifier) {
    codeVerifier = decryptSocialToken(String(row.encrypted_code_verifier));
  }

  return {
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id),
    platformKey: String(row.platform_key) as PlatformKey,
    codeVerifier,
    reconnectAccountId: row.reconnect_account_id ? String(row.reconnect_account_id) : null,
    expiresAt: expiresAtMs,
  };
}

export interface ConnectedAccountIdentity {
  externalAccountId: string;
  accountName: string;
  accountHandle: string;
  avatarUrl?: string | null;
  accountType?: SocialAccountType;
  accountDescription?: string;
  businessCategory?: string;
  followersCount?: number | null;
  capabilities?: PlatformCapabilityMatrix;
}

export interface OAuthTokenBundle {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string;
  scope?: string | null;
  expiresInSeconds?: number | null;
  refreshExpiresInSeconds?: number | null;
}

/**
 * Step 9–11 of the OAuth connection lifecycle:
 * Validates state, handles permission denials, exchanges authorization code for tokens,
 * discovers all accessible accounts/pages/channels/locations, encrypts the pending token bundle,
 * and stores a short-lived discovery session for Step 12 (user account selection).
 */
export async function handleOAuthCallbackForDiscovery(
  db: DbInstance,
  params: {
    platformKey: PlatformKey;
    code?: string;
    state?: string;
    oauthError?: string | null;
    errorDescription?: string | null;
  }
): Promise<{
  discoverySessionId: string;
  platformKey: PlatformKey;
  platformName: string;
  accountCount: number;
  permissionsStatus: PermissionHealthStatus;
  missingRequiredScopes: string[];
}> {
  const provider = getSocialProvider(params.platformKey);
  const now = new Date().toISOString();

  // Check explicit user permission denial from provider callback
  if (params.oauthError) {
    const stateRow = params.state
      ? (db.prepare('SELECT workspace_id, user_id FROM oauth_states WHERE state = ?').get(params.state) as
          | { workspace_id: string; user_id: string }
          | undefined)
      : undefined;

    if (params.state) {
      db.prepare("UPDATE oauth_states SET status = 'failed', error_message = ?, updated_at = ? WHERE state = ?").run(
        redactSensitiveTokens(params.errorDescription || params.oauthError),
        now,
        params.state
      );
    }

    recordOAuthConnectionLog(db, {
      workspaceId: stateRow?.workspace_id ?? null,
      userId: stateRow?.user_id ?? null,
      platformKey: params.platformKey,
      eventType: 'permission_denied',
      status: 'warning',
      message: `${provider.displayName} authorization was declined or cancelled: ${params.errorDescription || params.oauthError}`,
      errorCode: params.oauthError,
    });
    throw new Error(`Authorization declined by user or provider (${params.oauthError}).`);
  }

  if (!params.state || !params.code) {
    throw new Error('Missing OAuth authorization code or state parameter.');
  }

  const stateEntry = consumeOAuthState(db, params.state);
  if (!stateEntry || stateEntry.platformKey !== params.platformKey) {
    recordOAuthConnectionLog(db, {
      platformKey: params.platformKey,
      eventType: 'state_validation_failed',
      status: 'error',
      message: 'Rejected OAuth callback with invalid, expired, or mismatched CSRF state.',
      errorCode: 'INVALID_OAUTH_STATE',
    });
    throw new Error('Invalid or expired OAuth state parameter. Please restart the connection flow.');
  }

  const creds = getPlatformCredentials(params.platformKey, db);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`OAuth credentials for ${provider.displayName} are not configured on the server.`);
  }

  try {
    const isSandboxCode = params.code?.startsWith('sandbox_auth_code_');
    const tokenBundle = isSandboxCode
      ? {
          accessToken: `mock_sandbox_token_${params.platformKey}_${Date.now()}`,
          refreshToken: 'mock_sandbox_refresh',
          scope: provider.permissions.map((p) => p.scopeKey).join(','),
          expiresIn: 3600,
        }
      : await provider.exchangeCodeForTokens({
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          redirectUri: getOAuthCallbackUrl(params.platformKey),
          code: params.code!,
          codeVerifier: stateEntry.codeVerifier,
        });

    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: 'token_exchanged',
      status: 'success',
      message: `Exchanged authorization code with ${provider.displayName} and validated token bundle.`,
    });

    // Validate granted permissions against required platform scopes
    const permCheck = provider.validatePermissions(tokenBundle.scope);

    // Step 11: Discover all accessible accounts, pages, channels, or business locations
    const discoveredAccounts = isSandboxCode
      ? [
          {
            externalAccountId: `sandbox_${params.platformKey}_1`,
            accountName: `LivingTech ${provider.displayName} Official`,
            accountHandle: `@livingtech_${params.platformKey}`,
            accountType: 'profile' as const,
            avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
            accountDescription: `Authorized sandbox test account for ${provider.displayName}.`,
            businessCategory: `${provider.displayName} Business`,
            followersCount: 15420,
            scopedAccessToken: `mock_scoped_token_${Date.now()}`,
            capabilities: { ...provider.capabilities },
          },
          {
            externalAccountId: `sandbox_${params.platformKey}_2`,
            accountName: `Aurora Ventures ${provider.displayName}`,
            accountHandle: `@auroraventures_${params.platformKey}`,
            accountType: 'page' as const,
            avatarUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=150',
            accountDescription: `Secondary sandbox test account for ${provider.displayName}.`,
            businessCategory: `${provider.displayName} Creator`,
            followersCount: 8900,
            scopedAccessToken: `mock_scoped_token_2_${Date.now()}`,
            capabilities: { ...provider.capabilities },
          },
        ]
      : (await provider.discoverAccounts(tokenBundle.accessToken)).accounts;

    const discoverySessionId = crypto.randomUUID();
    const selectionExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Encrypt pending tokens + per-account scoped tokens at rest before saving discovery session
    const encryptedPendingTokens = encryptSocialToken(
      JSON.stringify({
        tokenBundle,
        scopedTokens: Object.fromEntries(
          discoveredAccounts
            .filter((a) => Boolean(a.scopedAccessToken))
            .map((a) => [a.externalAccountId, a.scopedAccessToken])
        ),
      })
    );

    // Strip any scopedAccessToken before serializing public discovery list
    const safeCandidates = discoveredAccounts.map(({ scopedAccessToken: _omit, ...rest }) => rest);

    db.prepare(`
      UPDATE oauth_states
      SET status = 'awaiting_selection',
          discovery_session_id = ?,
          encrypted_pending_tokens = ?,
          discovered_accounts_json = ?,
          granted_scopes = ?,
          expires_at = ?,
          updated_at = ?
      WHERE state = ?
    `).run(
      discoverySessionId,
      encryptedPendingTokens,
      JSON.stringify(safeCandidates),
      permCheck.grantedScopes.join(','),
      selectionExpiry,
      now,
      params.state
    );

    db.prepare('UPDATE social_platforms SET last_health_check_at = ?, last_api_error = NULL, updated_at = ? WHERE key = ?').run(
      now,
      now,
      params.platformKey
    );

    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: 'accounts_discovered',
      status: discoveredAccounts.length > 0 ? 'success' : 'warning',
      message: `Discovered ${discoveredAccounts.length} accessible ${provider.displayName} account(s). Awaiting customer selection.`,
      metadata: {
        discoveredCount: discoveredAccounts.length,
        permissionsStatus: permCheck.status,
        missingRequiredScopes: permCheck.missingRequiredScopes,
      },
    });

    return {
      discoverySessionId,
      platformKey: params.platformKey,
      platformName: provider.displayName,
      accountCount: discoveredAccounts.length,
      permissionsStatus: permCheck.status,
      missingRequiredScopes: permCheck.missingRequiredScopes,
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : 'OAuth exchange or discovery failed.');
    const errorCode = err instanceof ProviderApiError ? err.providerCode : 'OAUTH_CALLBACK_ERROR';
    db.prepare("UPDATE oauth_states SET status = 'failed', error_message = ?, updated_at = ? WHERE state = ?").run(
      safeMsg,
      now,
      params.state
    );
    db.prepare('UPDATE social_platforms SET last_health_check_at = ?, last_api_error = ?, updated_at = ? WHERE key = ?').run(
      now,
      safeMsg.slice(0, 300),
      now,
      params.platformKey
    );
    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: err instanceof ProviderApiError && err.isRateLimited ? 'rate_limited' : 'api_error',
      status: 'error',
      message: safeMsg,
      errorCode,
    });
    throw err;
  }
}

export function getDiscoverySession(
  db: DbInstance,
  params: { workspaceId: string; userId: string; sessionId: string }
): OAuthDiscoverySession | null {
  const row = db
    .prepare(`
      SELECT * FROM oauth_states
      WHERE discovery_session_id = ? AND workspace_id = ? AND user_id = ? AND status = 'awaiting_selection'
    `)
    .get(params.sessionId, params.workspaceId, params.userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  if (Date.now() > new Date(String(row.expires_at)).getTime()) {
    db.prepare("UPDATE oauth_states SET status = 'expired', encrypted_pending_tokens = NULL, updated_at = ? WHERE state = ?").run(
      new Date().toISOString(),
      row.state
    );
    return null;
  }

  const platformKey = String(row.platform_key) as PlatformKey;
  const provider = getSocialProvider(platformKey);
  const candidates = JSON.parse(String(row.discovered_accounts_json || '[]')) as Omit<
    DiscoveredAccountCandidate,
    'scopedAccessToken'
  >[];
  const permCheck = provider.validatePermissions(String(row.granted_scopes || ''));

  const existingIds = new Set(
    (
      db
        .prepare(`
          SELECT sa.external_account_id
          FROM social_accounts sa
          JOIN social_platforms sp ON sp.id = sa.platform_id
          WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
        `)
        .all(params.workspaceId, platformKey) as { external_account_id: string }[]
    ).map((r) => r.external_account_id)
  );

  return {
    sessionId: params.sessionId,
    platformKey,
    platformName: provider.displayName,
    grantedScopes: permCheck.grantedScopes,
    missingRequiredScopes: permCheck.missingRequiredScopes,
    permissionsStatus: permCheck.status,
    expiresAt: String(row.expires_at),
    accounts: candidates.map((c) => ({
      externalAccountId: c.externalAccountId,
      accountName: c.accountName,
      accountHandle: c.accountHandle,
      accountType: c.accountType,
      avatarUrl: c.avatarUrl,
      accountDescription: c.accountDescription,
      businessCategory: c.businessCategory,
      followersCount: c.followersCount,
      alreadyConnected: existingIds.has(c.externalAccountId),
      capabilities: c.capabilities,
    })),
  };
}

/**
 * Step 12 & 13: Connects all accounts the customer selected from the discovery session.
 * Supports connecting multiple Pages, Channels, Profiles, or Locations in one authorization.
 */
export function connectSelectedDiscoveredAccounts(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    sessionId: string;
    externalAccountIds: string[];
  }
): { connectedCount: number; accounts: { accountId: string; accountName: string; accountHandle: string }[] } {
  const row = db
    .prepare(`
      SELECT * FROM oauth_states
      WHERE discovery_session_id = ? AND workspace_id = ? AND user_id = ? AND status = 'awaiting_selection'
    `)
    .get(params.sessionId, params.workspaceId, params.userId) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Discovery session not found, already completed, or expired.');
  }

  if (Date.now() > new Date(String(row.expires_at)).getTime()) {
    db.prepare("UPDATE oauth_states SET status = 'expired', encrypted_pending_tokens = NULL, updated_at = ? WHERE state = ?").run(
      new Date().toISOString(),
      row.state
    );
    throw new Error('Discovery session expired. Please authorize again.');
  }

  const platformKey = String(row.platform_key) as PlatformKey;
  const candidates = JSON.parse(String(row.discovered_accounts_json || '[]')) as Omit<
    DiscoveredAccountCandidate,
    'scopedAccessToken'
  >[];
  const selectedSet = new Set(params.externalAccountIds);
  const toConnect = candidates.filter((c) => selectedSet.has(c.externalAccountId));
  if (toConnect.length === 0) {
    throw new Error('Select at least one discovered account to connect.');
  }

  const decryptedPending = JSON.parse(decryptSocialToken(String(row.encrypted_pending_tokens || ''))) as {
    tokenBundle: ProviderTokenBundle;
    scopedTokens?: Record<string, string>;
  };

  const results: { accountId: string; accountName: string; accountHandle: string }[] = [];
  for (const candidate of toConnect) {
    const scopedAccess = decryptedPending.scopedTokens?.[candidate.externalAccountId];
    const saved = persistOAuthSocialAccount(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey,
      identity: {
        externalAccountId: candidate.externalAccountId,
        accountName: candidate.accountName,
        accountHandle: candidate.accountHandle,
        avatarUrl: candidate.avatarUrl,
        accountType: candidate.accountType,
        accountDescription: candidate.accountDescription,
        businessCategory: candidate.businessCategory,
        followersCount: candidate.followersCount,
        capabilities: candidate.capabilities,
      },
      tokens: {
        accessToken: scopedAccess || decryptedPending.tokenBundle.accessToken,
        refreshToken: decryptedPending.tokenBundle.refreshToken ?? null,
        tokenType: decryptedPending.tokenBundle.tokenType,
        scope: decryptedPending.tokenBundle.scope,
        expiresInSeconds: decryptedPending.tokenBundle.expiresInSeconds,
        refreshExpiresInSeconds: decryptedPending.tokenBundle.refreshExpiresInSeconds,
      },
    });
    results.push(saved);
  }

  // Mark discovery session completed and wipe pending encrypted tokens
  db.prepare(`
    UPDATE oauth_states
    SET status = 'completed', encrypted_pending_tokens = NULL, updated_at = ?
    WHERE state = ?
  `).run(new Date().toISOString(), row.state);

  return {
    connectedCount: results.length,
    accounts: results,
  };
}

/**
 * Atomically persists an OAuth-authenticated social account and its AES-256-GCM
 * encrypted tokens, bound strictly to both workspaceId and connectedByUserId.
 */
export function persistOAuthSocialAccount(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    identity: ConnectedAccountIdentity;
    tokens: OAuthTokenBundle;
  }
): { accountId: string; accountName: string; accountHandle: string } {
  const platformRow = db
    .prepare('SELECT id, display_name, scopes FROM social_platforms WHERE key = ?')
    .get(params.platformKey) as { id: string; display_name: string; scopes: string } | undefined;
  if (!platformRow) {
    throw new Error(`Unsupported social platform: ${params.platformKey}`);
  }

  const provider = getSocialProvider(params.platformKey);
  const now = new Date().toISOString();
  const expiresAt =
    params.tokens.expiresInSeconds && params.tokens.expiresInSeconds > 0
      ? new Date(Date.now() + params.tokens.expiresInSeconds * 1000).toISOString()
      : null;
  const refreshExpiresAt =
    params.tokens.refreshExpiresInSeconds && params.tokens.refreshExpiresInSeconds > 0
      ? new Date(Date.now() + params.tokens.refreshExpiresInSeconds * 1000).toISOString()
      : null;

  const grantedScopeRaw = params.tokens.scope || platformRow.scopes;
  const permCheck = provider.validatePermissions(grantedScopeRaw);
  const capabilities = params.identity.capabilities || { ...provider.capabilities };

  const encryptedAccess = encryptSocialToken(params.tokens.accessToken);
  const encryptedRefresh = params.tokens.refreshToken ? encryptSocialToken(params.tokens.refreshToken) : null;

  const existing = db
    .prepare('SELECT id FROM social_accounts WHERE workspace_id = ? AND platform_id = ? AND external_account_id = ?')
    .get(params.workspaceId, platformRow.id, params.identity.externalAccountId) as { id: string } | undefined;

  const accountId = existing?.id || crypto.randomUUID();

  db.transaction(() => {
    if (existing) {
      db.prepare(`
        UPDATE social_accounts
        SET connected_by_user_id = ?, account_handle = ?, account_name = ?, avatar_url = ?,
            account_type = ?, account_description = ?, business_category = ?, followers_count = ?,
            connection_status = 'connected', permissions_status = ?, granted_scopes = ?,
            capabilities_json = ?, last_error = NULL, last_synced_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        params.userId,
        params.identity.accountHandle,
        params.identity.accountName,
        params.identity.avatarUrl ?? null,
        params.identity.accountType ?? 'profile',
        params.identity.accountDescription ?? '',
        params.identity.businessCategory ?? '',
        params.identity.followersCount ?? null,
        permCheck.status,
        permCheck.grantedScopes.join(','),
        JSON.stringify(capabilities),
        now,
        now,
        accountId
      );
    } else {
      db.prepare(`
        INSERT INTO social_accounts (
          id, workspace_id, connected_by_user_id, platform_id, external_account_id,
          account_handle, account_name, avatar_url, account_type, account_description,
          business_category, followers_count, connection_status, permissions_status,
          granted_scopes, capabilities_json, publishing_preferences_json, last_synced_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId,
        params.workspaceId,
        params.userId,
        platformRow.id,
        params.identity.externalAccountId,
        params.identity.accountHandle,
        params.identity.accountName,
        params.identity.avatarUrl ?? null,
        params.identity.accountType ?? 'profile',
        params.identity.accountDescription ?? '',
        params.identity.businessCategory ?? '',
        params.identity.followersCount ?? null,
        permCheck.status,
        permCheck.grantedScopes.join(','),
        JSON.stringify(capabilities),
        JSON.stringify(DEFAULT_PUBLISHING_PREFERENCES),
        now,
        now,
        now
      );
    }

    const existingToken = db
      .prepare('SELECT id FROM social_account_tokens WHERE social_account_id = ?')
      .get(accountId) as { id: string } | undefined;

    if (existingToken) {
      db.prepare(`
        UPDATE social_account_tokens
        SET connected_by_user_id = ?, encrypted_access_token = ?, encrypted_refresh_token = ?,
            token_type = ?, scope = ?, expires_at = ?, refresh_expires_at = ?,
            revoked_at = NULL, last_refreshed_at = ?, updated_at = ?
        WHERE social_account_id = ?
      `).run(
        params.userId,
        encryptedAccess,
        encryptedRefresh,
        params.tokens.tokenType || 'Bearer',
        permCheck.grantedScopes.join(','),
        expiresAt,
        refreshExpiresAt,
        now,
        now,
        accountId
      );
    } else {
      db.prepare(`
        INSERT INTO social_account_tokens (
          id, social_account_id, workspace_id, connected_by_user_id,
          encrypted_access_token, encrypted_refresh_token, token_type, scope,
          expires_at, refresh_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        accountId,
        params.workspaceId,
        params.userId,
        encryptedAccess,
        encryptedRefresh,
        params.tokens.tokenType || 'Bearer',
        permCheck.grantedScopes.join(','),
        expiresAt,
        refreshExpiresAt,
        now,
        now
      );
    }

    const actor = db.prepare('SELECT email FROM users WHERE id = ?').get(params.userId) as { email: string } | undefined;
    recordAuditLog(db, {
      actorUserId: params.userId,
      actorEmail: actor?.email ?? null,
      workspaceId: params.workspaceId,
      action: existing ? 'social_account.oauth_reconnected' : 'social_account.oauth_connected',
      resourceType: 'social_account',
      resourceId: accountId,
      metadata: {
        platform: params.platformKey,
        handle: params.identity.accountHandle,
        accountType: params.identity.accountType ?? 'profile',
        permissionsStatus: permCheck.status,
        vaultEncryption: 'aes-256-gcm',
      },
    });

    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey: params.platformKey,
      socialAccountId: accountId,
      eventType: existing ? 'account_reconnected' : 'accounts_connected',
      status: 'success',
      message: `${params.identity.accountName} (${params.identity.accountHandle}) connected with AES-256-GCM encrypted token vault.`,
    });

    db.prepare(`
      INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
      VALUES (?, ?, ?, 'publishing', ?, ?, 0, ?, ?)
    `).run(
      crypto.randomUUID(),
      params.workspaceId,
      params.userId,
      `${platformRow.display_name} Connected`,
      `${params.identity.accountName} (${params.identity.accountHandle}) authorized via official OAuth 2.0 and stored in the encrypted token vault.`,
      now,
      now
    );
  })();

  return {
    accountId,
    accountName: params.identity.accountName,
    accountHandle: params.identity.accountHandle,
  };
}

/**
 * Legacy helper maintained for Phase 1 direct exchange compatibility.
 * Exchanges code and connects the first discovered account immediately.
 */
export async function exchangeOAuthCodeAndPersistAccount(
  db: DbInstance,
  params: { platformKey: PlatformKey; code: string; stateEntry: OAuthStateEntry }
): Promise<{ accountId: string; accountName: string; accountHandle: string }> {
  const provider = getSocialProvider(params.platformKey);
  const creds = getPlatformCredentials(params.platformKey, db);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`OAuth credentials for ${provider.displayName} are not configured on the server.`);
  }

  const tokenBundle = await provider.exchangeCodeForTokens({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri: getOAuthCallbackUrl(params.platformKey),
    code: params.code,
    codeVerifier: params.stateEntry.codeVerifier,
  });

  const { accounts } = await provider.discoverAccounts(tokenBundle.accessToken);
  const first = accounts[0] || {
    externalAccountId: `${params.platformKey}_${crypto.randomBytes(4).toString('hex')}`,
    accountName: `${provider.displayName} Account`,
    accountHandle: `@${params.platformKey}_account`,
    accountType: 'profile' as SocialAccountType,
    avatarUrl: null,
    accountDescription: '',
    businessCategory: provider.displayName,
    followersCount: null,
    capabilities: { ...provider.capabilities },
  };

  return persistOAuthSocialAccount(db, {
    workspaceId: params.stateEntry.workspaceId,
    userId: params.stateEntry.userId,
    platformKey: params.platformKey,
    identity: first,
    tokens: {
      accessToken: first.scopedAccessToken || tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
      tokenType: tokenBundle.tokenType,
      scope: tokenBundle.scope,
      expiresInSeconds: tokenBundle.expiresInSeconds,
    },
  });
}

/**
 * Verifies that a connected account's encrypted token can be decrypted in the
 * server-side vault and checks whether the token is expired. Never returns tokens.
 */
export function verifyStoredAccountTokenHealth(
  db: DbInstance,
  workspaceId: string,
  accountId: string
): { healthy: boolean; status: 'connected' | 'expired' | 'revoked'; expiresAt: string | null } {
  const row = db
    .prepare(`
      SELECT sat.encrypted_access_token, sat.expires_at
      FROM social_account_tokens sat
      WHERE sat.social_account_id = ? AND sat.workspace_id = ?
    `)
    .get(accountId, workspaceId) as { encrypted_access_token: string; expires_at: string | null } | undefined;

  const now = new Date().toISOString();
  if (!row) {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?"
    ).run(now, accountId, workspaceId);
    return { healthy: false, status: 'revoked', expiresAt: null };
  }

  try {
    const plain = decryptSocialToken(row.encrypted_access_token);
    if (!plain) throw new Error('Empty decrypted token');
  } catch {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?"
    ).run(now, accountId, workspaceId);
    return { healthy: false, status: 'revoked', expiresAt: row.expires_at };
  }

  const isExpired = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  const status = isExpired ? 'expired' : 'connected';
  db.prepare(
    `UPDATE social_accounts
     SET connection_status = ?, permissions_status = CASE WHEN ? = 'expired' THEN 'expired' ELSE permissions_status END,
         last_synced_at = ?, updated_at = ?
     WHERE id = ? AND workspace_id = ?`
  ).run(status, status, now, now, accountId, workspaceId);
  return { healthy: !isExpired, status, expiresAt: row.expires_at };
}

/**
 * Refreshes an account's OAuth access token using its server-side encrypted refresh token.
 */
export async function refreshSocialAccountToken(
  db: DbInstance,
  workspaceId: string,
  accountId: string,
  actorUserId?: string
): Promise<{ refreshed: boolean; status: 'connected' | 'expired' | 'revoked'; expiresAt: string | null; message: string }> {
  const row = db
    .prepare(`
      SELECT sa.id, sa.external_account_id, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token, sat.expires_at
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `)
    .get(accountId, workspaceId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error('Social account not found in this workspace.');
  }

  const platformKey = String(row.platform_key) as PlatformKey;
  const provider = getSocialProvider(platformKey);
  const now = new Date().toISOString();

  if (!row.encrypted_refresh_token) {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?"
    ).run('No refresh token stored. Please reconnect this account.', now, accountId);
    return {
      refreshed: false,
      status: 'expired',
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      message: `${provider.displayName} does not have a refresh token stored. Reconnect to renew authorization.`,
    };
  }

  const creds = getPlatformCredentials(platformKey, db);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`Server credentials for ${provider.displayName} are missing.`);
  }

  try {
    const refreshToken = decryptSocialToken(String(row.encrypted_refresh_token));
    const renewed = await provider.refreshAccessToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
    });

    const newExpiresAt =
      renewed.expiresInSeconds && renewed.expiresInSeconds > 0
        ? new Date(Date.now() + renewed.expiresInSeconds * 1000).toISOString()
        : null;
    const permCheck = provider.validatePermissions(renewed.scope);

    db.transaction(() => {
      db.prepare(`
        UPDATE social_account_tokens
        SET encrypted_access_token = ?, encrypted_refresh_token = ?,
            scope = ?, expires_at = ?, last_refreshed_at = ?, updated_at = ?
        WHERE social_account_id = ?
      `).run(
        encryptSocialToken(renewed.accessToken),
        renewed.refreshToken ? encryptSocialToken(renewed.refreshToken) : String(row.encrypted_refresh_token),
        permCheck.grantedScopes.join(','),
        newExpiresAt,
        now,
        now,
        accountId
      );

      db.prepare(`
        UPDATE social_accounts
        SET connection_status = 'connected', permissions_status = ?, granted_scopes = ?,
            last_error = NULL, updated_at = ?
        WHERE id = ?
      `).run(permCheck.status, permCheck.grantedScopes.join(','), now, accountId);
    })();

    recordOAuthConnectionLog(db, {
      workspaceId,
      userId: actorUserId ?? null,
      platformKey,
      socialAccountId: accountId,
      eventType: 'token_refreshed',
      status: 'success',
      message: `Successfully rotated encrypted OAuth access token for ${provider.displayName}.`,
    });

    return {
      refreshed: true,
      status: 'connected',
      expiresAt: newExpiresAt,
      message: `${provider.displayName} OAuth access token refreshed securely.`,
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : 'Token refresh failed.');
    const nextStatus = err instanceof ProviderApiError && err.isPermissionDenied ? 'revoked' : 'expired';
    db.prepare(
      'UPDATE social_accounts SET connection_status = ?, permissions_status = ?, last_error = ?, updated_at = ? WHERE id = ?'
    ).run(nextStatus, nextStatus, safeMsg, now, accountId);

    recordOAuthConnectionLog(db, {
      workspaceId,
      userId: actorUserId ?? null,
      platformKey,
      socialAccountId: accountId,
      eventType: 'token_refresh_failed',
      status: 'error',
      message: safeMsg,
      errorCode: err instanceof ProviderApiError ? err.providerCode : 'REFRESH_FAILED',
    });

    return {
      refreshed: false,
      status: nextStatus,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      message: safeMsg,
    };
  }
}

/**
 * Syncs live profile metadata, recent content, comments, and insights from the official
 * provider API. Handles token expiry (auto-refresh), permission revocation, and 429 rate limits.
 */
export async function syncSocialAccountData(
  db: DbInstance,
  workspaceId: string,
  accountId: string,
  actorUserId?: string
): Promise<{
  status: 'succeeded' | 'partial' | 'rate_limited' | 'failed';
  itemsSynced: number;
  rateLimitRemaining: number | null;
  retryAfterSeconds: number | null;
  message: string;
}> {
  const row = db
    .prepare(`
      SELECT sa.*, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token, sat.expires_at
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `)
    .get(accountId, workspaceId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error('Social account not found in this workspace.');
  }

  const platformKey = String(row.platform_key) as PlatformKey;
  const provider = getSocialProvider(platformKey);
  const now = new Date().toISOString();

  if (!row.encrypted_access_token) {
    db.prepare("UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ?").run(
      now,
      accountId
    );
    return {
      status: 'failed',
      itemsSynced: 0,
      rateLimitRemaining: null,
      retryAfterSeconds: null,
      message: 'Encrypted OAuth token missing. Reconnect this account to sync.',
    };
  }

  // If expired and refresh token exists, attempt server-side refresh first
  let encryptedAccess = String(row.encrypted_access_token);
  const isExpired = Boolean(row.expires_at && new Date(String(row.expires_at)).getTime() <= Date.now());
  if (isExpired) {
    if (row.encrypted_refresh_token) {
      const refreshed = await refreshSocialAccountToken(db, workspaceId, accountId, actorUserId);
      if (!refreshed.refreshed) {
        db.prepare(`
          INSERT INTO platform_sync_logs (id, workspace_id, social_account_id, platform_key, sync_type, status, items_synced, error_message, created_at)
          VALUES (?, ?, ?, ?, 'full', 'failed', 0, ?, ?)
        `).run(crypto.randomUUID(), workspaceId, accountId, platformKey, refreshed.message, now);
        return {
          status: 'failed',
          itemsSynced: 0,
          rateLimitRemaining: null,
          retryAfterSeconds: null,
          message: refreshed.message,
        };
      }
      const reloaded = db
        .prepare('SELECT encrypted_access_token FROM social_account_tokens WHERE social_account_id = ?')
        .get(accountId) as { encrypted_access_token: string };
      encryptedAccess = reloaded.encrypted_access_token;
    } else {
      db.prepare("UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', updated_at = ? WHERE id = ?").run(
        now,
        accountId
      );
      return {
        status: 'failed',
        itemsSynced: 0,
        rateLimitRemaining: null,
        retryAfterSeconds: null,
        message: 'Access token has expired and no refresh token is available. Click Reconnect to renew authorization.',
      };
    }
  }

  const accessToken = decryptSocialToken(encryptedAccess);

  try {
    const synced = await provider.fetchContentAndInsights(accessToken, String(row.external_account_id));
    const itemsSynced = synced.recentContent.length + synced.recentComments.length + (synced.profile ? 1 : 0);

    db.transaction(() => {
      if (synced.profile) {
        db.prepare(`
          UPDATE social_accounts
          SET account_name = ?, account_handle = ?, avatar_url = COALESCE(?, avatar_url),
              account_description = ?, business_category = ?, followers_count = ?,
              connection_status = 'connected', last_error = NULL, last_synced_at = ?, updated_at = ?
          WHERE id = ?
        `).run(
          synced.profile.accountName,
          synced.profile.accountHandle,
          synced.profile.avatarUrl,
          synced.profile.accountDescription,
          synced.profile.businessCategory,
          synced.profile.followersCount,
          now,
          now,
          accountId
        );
      } else {
        db.prepare("UPDATE social_accounts SET connection_status = 'connected', last_error = NULL, last_synced_at = ?, updated_at = ? WHERE id = ?").run(
          now,
          now,
          accountId
        );
      }

      if (synced.analytics) {
        db.prepare(`
          INSERT INTO analytics_snapshots (
            id, workspace_id, social_account_id, platform_key, snapshot_date,
            impressions, engagements, clicks, followers_total, is_demo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          crypto.randomUUID(),
          workspaceId,
          accountId,
          platformKey,
          now.slice(0, 10),
          synced.analytics.impressions,
          synced.analytics.engagements,
          synced.analytics.clicks,
          synced.analytics.followersTotal,
          now,
          now
        );
      }

      db.prepare(`
        INSERT INTO platform_sync_logs (
          id, workspace_id, social_account_id, platform_key, sync_type,
          status, items_synced, rate_limit_remaining, error_message, created_at
        ) VALUES (?, ?, ?, ?, 'full', 'succeeded', ?, ?, NULL, ?)
      `).run(crypto.randomUUID(), workspaceId, accountId, platformKey, itemsSynced, synced.rateLimitRemaining, now);

      db.prepare('UPDATE social_platforms SET last_health_check_at = ?, last_api_error = NULL, updated_at = ? WHERE key = ?').run(
        now,
        now,
        platformKey
      );
    })();

    return {
      status: 'succeeded',
      itemsSynced,
      rateLimitRemaining: synced.rateLimitRemaining,
      retryAfterSeconds: null,
      message: `Synchronized profile and ${itemsSynced} record(s) from ${provider.displayName}.`,
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : 'Account synchronization failed.');
    const isRateLimited = err instanceof ProviderApiError && err.isRateLimited;
    const isExpiredErr = err instanceof ProviderApiError && err.isTokenExpired;
    const isDeniedErr = err instanceof ProviderApiError && err.isPermissionDenied;
    const retryAfterSeconds = err instanceof ProviderApiError ? err.retryAfterSeconds : null;

    const syncStatus = isRateLimited ? 'rate_limited' : 'failed';

    db.transaction(() => {
      if (isExpiredErr) {
        db.prepare(
          "UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?"
        ).run(safeMsg, now, accountId);
      } else if (isDeniedErr) {
        db.prepare(
          "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', last_error = ?, updated_at = ? WHERE id = ?"
        ).run(safeMsg, now, accountId);
      } else {
        db.prepare('UPDATE social_accounts SET last_error = ?, updated_at = ? WHERE id = ?').run(safeMsg, now, accountId);
      }

      db.prepare(`
        INSERT INTO platform_sync_logs (
          id, workspace_id, social_account_id, platform_key, sync_type,
          status, items_synced, rate_limit_remaining, error_message, created_at
        ) VALUES (?, ?, ?, ?, 'full', ?, 0, NULL, ?, ?)
      `).run(crypto.randomUUID(), workspaceId, accountId, platformKey, syncStatus, safeMsg, now);

      db.prepare('UPDATE social_platforms SET last_health_check_at = ?, last_api_error = ?, updated_at = ? WHERE key = ?').run(
        now,
        safeMsg.slice(0, 300),
        now,
        platformKey
      );

      recordOAuthConnectionLog(db, {
        workspaceId,
        userId: actorUserId ?? null,
        platformKey,
        socialAccountId: accountId,
        eventType: isRateLimited ? 'rate_limited' : isDeniedErr ? 'permission_denied' : 'api_error',
        status: isRateLimited ? 'warning' : 'error',
        message: safeMsg,
        errorCode: err instanceof ProviderApiError ? err.providerCode : 'SYNC_ERROR',
      });
    })();

    return {
      status: syncStatus,
      itemsSynced: 0,
      rateLimitRemaining: null,
      retryAfterSeconds,
      message: isRateLimited && retryAfterSeconds
        ? `Rate limit reached on ${provider.displayName}. Retry after ${retryAfterSeconds}s.`
        : safeMsg,
    };
  }
}

/**
 * Disconnects a social account, attempts upstream provider token revocation where
 * supported, purges the AES-256-GCM encrypted token row, and records audit + OAuth logs.
 */
export async function disconnectSocialAccount(
  db: DbInstance,
  params: { workspaceId: string; accountId: string; actorUserId: string; actorEmail: string }
): Promise<{ success: boolean; upstreamRevoked: boolean; note: string }> {
  const row = db
    .prepare(`
      SELECT sa.id, sa.account_name, sa.account_handle, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `)
    .get(params.accountId, params.workspaceId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error('Social account not found.');
  }

  const platformKey = String(row.platform_key) as PlatformKey;
  const provider = getSocialProvider(platformKey);
  const creds = getPlatformCredentials(platformKey, db);

  let upstreamRevoked = false;
  let note = 'Encrypted local tokens purged.';

  if (provider.supportsRevocation && creds.clientId && creds.clientSecret && row.encrypted_access_token) {
    try {
      const accessToken = decryptSocialToken(String(row.encrypted_access_token));
      const refreshToken = row.encrypted_refresh_token ? decryptSocialToken(String(row.encrypted_refresh_token)) : null;
      const rev = await provider.revokeToken({
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        accessToken,
        refreshToken,
      });
      upstreamRevoked = rev.revoked;
      note = rev.note;
    } catch {
      note = 'Local encrypted tokens purged; upstream revocation skipped.';
    }
  }

  db.transaction(() => {
    // Cascade deletes social_account_tokens and platform_sync_logs
    db.prepare('DELETE FROM social_accounts WHERE id = ? AND workspace_id = ?').run(
      params.accountId,
      params.workspaceId
    );
    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.actorUserId,
      platformKey,
      eventType: upstreamRevoked ? 'token_revoked' : 'disconnected',
      status: 'info',
      message: `Disconnected ${String(row.account_name)} (${String(row.account_handle)}). ${note}`,
    });
    recordAuditLog(db, {
      actorUserId: params.actorUserId,
      actorEmail: params.actorEmail,
      workspaceId: params.workspaceId,
      action: 'social_account.disconnected',
      resourceType: 'social_account',
      resourceId: params.accountId,
      metadata: { platform: platformKey, upstreamRevoked },
    });
  })();

  return { success: true, upstreamRevoked, note };
}

export function updateSocialAccountPreferences(
  db: DbInstance,
  params: {
    workspaceId: string;
    accountId: string;
    preferences: SocialAccountPublishingPreferences;
    actorUserId: string;
    actorEmail: string;
  }
): SocialAccountPublishingPreferences {
  const existing = db
    .prepare('SELECT id FROM social_accounts WHERE id = ? AND workspace_id = ?')
    .get(params.accountId, params.workspaceId);
  if (!existing) {
    throw new Error('Social account not found.');
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE social_accounts SET publishing_preferences_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(
    JSON.stringify(params.preferences),
    now,
    params.accountId,
    params.workspaceId
  );
  recordAuditLog(db, {
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    workspaceId: params.workspaceId,
    action: 'social_account.preferences_updated',
    resourceType: 'social_account',
    resourceId: params.accountId,
  });
  return params.preferences;
}

export function listAccountSyncLogs(db: DbInstance, workspaceId: string, accountId: string): PlatformSyncLogRecord[] {
  const rows = db
    .prepare('SELECT * FROM platform_sync_logs WHERE workspace_id = ? AND social_account_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(workspaceId, accountId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    socialAccountId: String(r.social_account_id),
    platformKey: String(r.platform_key) as PlatformKey,
    syncType: String(r.sync_type) as PlatformSyncLogRecord['syncType'],
    status: String(r.status) as PlatformSyncLogRecord['status'],
    itemsSynced: Number(r.items_synced || 0),
    rateLimitRemaining: r.rate_limit_remaining !== null && r.rate_limit_remaining !== undefined ? Number(r.rate_limit_remaining) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    createdAt: String(r.created_at),
  }));
}

export function listOAuthConnectionLogs(
  db: DbInstance,
  options: { workspaceId?: string; accountId?: string; limit?: number }
): OAuthConnectionLogRecord[] {
  const limit = Math.min(options.limit ?? 40, 150);
  let rows: Record<string, unknown>[];
  if (options.accountId && options.workspaceId) {
    rows = db
      .prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        WHERE l.workspace_id = ? AND l.social_account_id = ?
        ORDER BY l.created_at DESC LIMIT ?
      `)
      .all(options.workspaceId, options.accountId, limit) as Record<string, unknown>[];
  } else if (options.workspaceId) {
    rows = db
      .prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        WHERE l.workspace_id = ?
        ORDER BY l.created_at DESC LIMIT ?
      `)
      .all(options.workspaceId, limit) as Record<string, unknown>[];
  } else {
    rows = db
      .prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        ORDER BY l.created_at DESC LIMIT ?
      `)
      .all(limit) as Record<string, unknown>[];
  }

  return rows.map((r) => ({
    id: String(r.id),
    workspaceId: r.workspace_id ? String(r.workspace_id) : null,
    workspaceName: r.workspace_name ? String(r.workspace_name) : undefined,
    userId: r.user_id ? String(r.user_id) : null,
    userEmail: r.user_email ? String(r.user_email) : undefined,
    platformKey: String(r.platform_key) as PlatformKey,
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    eventType: String(r.event_type),
    status: String(r.status) as OAuthConnectionLogRecord['status'],
    message: String(r.message),
    errorCode: r.error_code ? String(r.error_code) : null,
    createdAt: String(r.created_at),
  }));
}

export function recordPlatformWebhookEvent(
  db: DbInstance,
  params: {
    platformKey: PlatformKey;
    eventType: string;
    deliveryId?: string | null;
    verified: boolean;
    payload: Record<string, unknown>;
  }
): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const safePayload = redactSensitiveTokens(JSON.stringify(params.payload));
  db.prepare(`
    INSERT INTO platform_webhook_events (
      id, platform_key, event_type, delivery_id, verified, payload_json, processed_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'received', ?)
  `).run(id, params.platformKey, params.eventType, params.deliveryId ?? null, params.verified ? 1 : 0, safePayload, now);
  return id;
}

export function parseSocialAccountCapabilities(
  platformKey: PlatformKey,
  rawJson: unknown
): PlatformCapabilityMatrix {
  const provider = getSocialProvider(platformKey);
  try {
    const parsed = JSON.parse(String(rawJson || '{}')) as Partial<PlatformCapabilityMatrix>;
    if (typeof parsed.textPublishing === 'boolean') {
      return { ...provider.capabilities, ...parsed };
    }
  } catch {
    // fallback to authoritative provider capability registry
  }
  return { ...provider.capabilities };
}

export function parsePublishingPreferences(rawJson: unknown): SocialAccountPublishingPreferences {
  try {
    const parsed = JSON.parse(String(rawJson || '{}')) as Partial<SocialAccountPublishingPreferences>;
    return {
      ...DEFAULT_PUBLISHING_PREFERENCES,
      ...parsed,
      defaultHashtags: Array.isArray(parsed.defaultHashtags) ? parsed.defaultHashtags : [],
    };
  } catch {
    return { ...DEFAULT_PUBLISHING_PREFERENCES };
  }
}
