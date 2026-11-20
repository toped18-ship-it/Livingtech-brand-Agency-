import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase, type DbInstance } from './db/database';
import {
  buildOfficialOAuthUrl,
  consumeOAuthState,
  connectSelectedDiscoveredAccounts,
  decryptSocialToken,
  disconnectSocialAccount,
  encryptSocialToken,
  getDiscoverySession,
  handleOAuthCallbackForDiscovery,
  listOAuthConnectionLogs,
  listSocialPlatforms,
  refreshSocialAccountToken,
  syncSocialAccountData,
  updateSocialAccountPreferences,
  verifyStoredAccountTokenHealth,
} from './services/oauthService';
import { env } from './env';
import { parseRateLimitHeaders, ProviderApiError, redactSensitiveTokens } from './integrations/httpClient';
import { evaluatePermissionScopes } from './integrations/types';
import { SOCIAL_PROVIDER_LIST } from './integrations/registry';
import type { PlatformKey } from '../src/shared/api-contracts';

function seedTenant(db: DbInstance, email: string, workspaceName: string) {
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const workspaceId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
    VALUES (?, ?, 'test_hash', ?, 'customer', 1, 'active', 'UTC', 'en', ?, ?)
  `).run(userId, email, workspaceName, now, now);

  db.prepare(`
    INSERT INTO organisations (id, name, slug, owner_user_id, billing_email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(orgId, workspaceName, `org-${userId.slice(0, 8)}`, userId, email, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'UTC', 'en', 250, ?, ?)
  `).run(workspaceId, orgId, userId, workspaceName, `ws-${userId.slice(0, 8)}`, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?)
  `).run(crypto.randomUUID(), workspaceId, userId, email, now, now);

  return { user: { id: userId, email }, workspaceId };
}

function createTestEnv() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livingtech-phase2-'));
  const dbPath = path.join(tmpDir, 'phase2.db');
  const db = initDatabase(dbPath);
  const tenantA = seedTenant(db, 'tenant-a@agency.test', 'Tenant A Brand');
  const tenantB = seedTenant(db, 'tenant-b@agency.test', 'Tenant B Brand');
  return {
    db,
    tenantA,
    tenantB,
    cleanup: () => {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

function mockFetchSequence(
  handlers: Array<{ match: string; status?: number; headers?: Record<string, string>; body: unknown }>
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    calls.push({ url, method });

    const match = handlers.find((h) => url.includes(h.match));
    if (!match) {
      return new Response(JSON.stringify({ error: `Unexpected fetch URL in test: ${url}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(match.body), {
      status: match.status ?? 200,
      headers: { 'content-type': 'application/json', ...(match.headers || {}) },
    });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test('Phase 2 registry seeds all 8 platforms with accurate capabilities & permissions', () => {
  const { db, cleanup } = createTestEnv();
  try {
    const platforms = listSocialPlatforms(db);
    assert.equal(platforms.length, 8);
    assert.equal(SOCIAL_PROVIDER_LIST.length, 8);

    const keys = new Set(platforms.map((p) => p.key));
    for (const expected of [
      'facebook',
      'instagram',
      'tiktok',
      'linkedin',
      'youtube',
      'x',
      'pinterest',
      'google_business',
    ] as PlatformKey[]) {
      assert.equal(keys.has(expected), true, `Missing seeded platform ${expected}`);
    }

    // Verify official API capability constraints (no false capabilities)
    const ig = platforms.find((p) => p.key === 'instagram')!;
    assert.equal(ig.capabilities.textPublishing, false);
    assert.equal(ig.capabilities.reelsPublishing, true);

    const yt = platforms.find((p) => p.key === 'youtube')!;
    assert.equal(yt.capabilities.textPublishing, false);
    assert.equal(yt.capabilities.imagePublishing, false);
    assert.equal(yt.capabilities.videoPublishing, true);
    assert.equal(yt.capabilities.shortFormVideoPublishing, true);

    const gbp = platforms.find((p) => p.key === 'google_business')!;
    assert.equal(gbp.capabilities.textPublishing, true);
    assert.equal(gbp.capabilities.imagePublishing, true);
    assert.equal(gbp.capabilities.videoPublishing, false);

    const pin = platforms.find((p) => p.key === 'pinterest')!;
    assert.equal(pin.capabilities.textPublishing, false);
    assert.equal(pin.capabilities.imagePublishing, true);
    assert.equal(pin.capabilities.commentRetrieval, false);
  } finally {
    cleanup();
  }
});

test('1 & 4. OAuth state persistence, PKCE S256 generation, single-use validation, & token encryption/redaction', () => {
  const { db, tenantA, cleanup } = createTestEnv();
  const prevXId = env.X_CLIENT_ID;
  const prevXSecret = env.X_CLIENT_SECRET;
  try {
    env.X_CLIENT_ID = 'x_test_client_id_12345';
    env.X_CLIENT_SECRET = 'x_test_client_secret_98765';

    const init = buildOfficialOAuthUrl(db, {
      platformKey: 'x',
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
    });
    assert.equal(init.configured, true);
    assert.equal(init.supportsPkce, true);
    assert.ok(init.url?.includes('code_challenge_method=S256'));
    assert.ok(init.state);

    // Verify PKCE code_verifier is stored encrypted in oauth_states
    const stateRow = db
      .prepare('SELECT encrypted_code_verifier FROM oauth_states WHERE state = ?')
      .get(init.state) as { encrypted_code_verifier: string };
    assert.ok(stateRow.encrypted_code_verifier.includes(':'));

    // Valid consumption succeeds
    const consumed = consumeOAuthState(db, init.state!);
    assert.ok(consumed);
    assert.equal(consumed.workspaceId, tenantA.workspaceId);
    assert.equal(consumed.platformKey, 'x');
    assert.ok(consumed.codeVerifier && consumed.codeVerifier.length >= 32);

    // Mark completed like callback does, then replay must fail
    db.prepare("UPDATE oauth_states SET status = 'completed' WHERE state = ?").run(init.state);
    assert.equal(consumeOAuthState(db, init.state!), null);

    // Token encryption round-trip & non-plaintext storage
    const secret = 'ya29.super-secret-oauth-token-value-9999';
    const cipher = encryptSocialToken(secret);
    assert.notEqual(cipher, secret);
    assert.equal(cipher.includes(secret), false);
    assert.equal(decryptSocialToken(cipher), secret);

    // Sensitive token redaction
    const redacted = redactSensitiveTokens(
      'Authorization: Bearer sk_live_abc123 access_token=tok_secret_456 refresh_token=ref_789'
    );
    assert.equal(redacted.includes('sk_live_abc123'), false);
    assert.equal(redacted.includes('tok_secret_456'), false);
    assert.equal(redacted.includes('ref_789'), false);
  } finally {
    env.X_CLIENT_ID = prevXId;
    env.X_CLIENT_SECRET = prevXSecret;
    cleanup();
  }
});

test('2, 3, 5, 6, 7. Full Facebook Pages callback, token exchange, multi-page discovery, multi-account connect, & workspace isolation', async () => {
  const { db, tenantA, tenantB, cleanup } = createTestEnv();
  const prevMetaId = env.META_APP_ID;
  const prevMetaSecret = env.META_APP_SECRET;
  const fetcher = mockFetchSequence([
    {
      match: '/oauth/access_token',
      body: {
        access_token: 'fb_user_access_token_live_12345',
        token_type: 'bearer',
        expires_in: 5184000,
      },
    },
    {
      match: '/me/permissions',
      body: {
        data: [
          { permission: 'pages_show_list', status: 'granted' },
          { permission: 'pages_read_engagement', status: 'granted' },
          { permission: 'pages_manage_posts', status: 'granted' },
          { permission: 'pages_manage_engagement', status: 'granted' },
          { permission: 'read_insights', status: 'granted' },
        ],
      },
    },
    {
      match: '/me/accounts',
      body: {
        data: [
          {
            id: 'fb_page_101',
            name: 'Aurora Global HQ',
            username: 'auroraglobal',
            category: 'Enterprise Software',
            about: 'Official global headquarters page',
            fan_count: 48200,
            access_token: 'fb_page_token_101_secret',
            picture: { data: { url: 'https://cdn.example.test/page101.png' } },
          },
          {
            id: 'fb_page_202',
            name: 'Aurora Europe',
            username: 'auroraeurope',
            category: 'Technology Company',
            about: 'European operations',
            fan_count: 15900,
            access_token: 'fb_page_token_202_secret',
            picture: { data: { url: 'https://cdn.example.test/page202.png' } },
          },
        ],
      },
    },
  ]);

  try {
    env.META_APP_ID = 'meta_app_id_test';
    env.META_APP_SECRET = 'meta_app_secret_test';

    const authInit = buildOfficialOAuthUrl(db, {
      platformKey: 'facebook',
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
    });
    assert.equal(authInit.configured, true);
    assert.ok(authInit.state);

    // Step 9-11: Callback executes token exchange + multi-account discovery
    const discovery = await handleOAuthCallbackForDiscovery(db, {
      platformKey: 'facebook',
      code: 'fb_auth_code_xyz',
      state: authInit.state,
    });
    assert.equal(discovery.platformKey, 'facebook');
    assert.equal(discovery.accountCount, 2);
    assert.equal(discovery.permissionsStatus, 'granted');

    // Step 12: Workspace B MUST NOT access Workspace A's discovery session
    const crossTenantSession = getDiscoverySession(db, {
      workspaceId: tenantB.workspaceId,
      userId: tenantB.user.id,
      sessionId: discovery.discoverySessionId,
    });
    assert.equal(crossTenantSession, null);

    // Workspace A retrieves both discovered Facebook Pages
    const session = getDiscoverySession(db, {
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
      sessionId: discovery.discoverySessionId,
    });
    assert.ok(session);
    assert.equal(session.accounts.length, 2);

    // Step 13: Connect BOTH Facebook Pages in one workspace
    const connected = connectSelectedDiscoveredAccounts(db, {
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
      sessionId: discovery.discoverySessionId,
      externalAccountIds: ['fb_page_101', 'fb_page_202'],
    });
    assert.equal(connected.connectedCount, 2);

    // Verify per-page tokens are stored encrypted (never plaintext)
    const tokenRows = db
      .prepare('SELECT encrypted_access_token FROM social_account_tokens WHERE workspace_id = ?')
      .all(tenantA.workspaceId) as { encrypted_access_token: string }[];
    assert.equal(tokenRows.length, 2);
    for (const row of tokenRows) {
      assert.equal(row.encrypted_access_token.includes('fb_page_token_'), false);
    }

    // Verify workspace isolation on preferences
    const accountId = connected.accounts[0].accountId;
    assert.throws(() => {
      updateSocialAccountPreferences(db, {
        workspaceId: tenantB.workspaceId,
        accountId,
        preferences: {
          autoPublishEnabled: false,
          requireApprovalBeforePublish: true,
          defaultTimezone: 'UTC',
          defaultVisibility: 'public',
          appendDefaultHashtags: false,
          defaultHashtags: [],
          dailyPostLimit: 3,
        },
        actorUserId: tenantB.user.id,
        actorEmail: tenantB.user.email,
      });
    }, /not found/i);

    // Workspace A CAN update preferences on its own account
    const savedPrefs = updateSocialAccountPreferences(db, {
      workspaceId: tenantA.workspaceId,
      accountId,
      preferences: {
        autoPublishEnabled: true,
        requireApprovalBeforePublish: true,
        defaultTimezone: 'Europe/London',
        defaultVisibility: 'public',
        appendDefaultHashtags: true,
        defaultHashtags: ['#AuroraGlobal'],
        dailyPostLimit: 5,
      },
      actorUserId: tenantA.user.id,
      actorEmail: tenantA.user.email,
    });
    assert.equal(savedPrefs.dailyPostLimit, 5);
    assert.equal(savedPrefs.defaultTimezone, 'Europe/London');

    // Audit logs recorded without leaking access tokens
    const logs = listOAuthConnectionLogs(db, { workspaceId: tenantA.workspaceId });
    assert.ok(logs.length >= 3);
    assert.equal(
      logs.some((l) => l.message.includes('fb_page_token_101_secret') || l.message.includes('fb_user_access_token')),
      false
    );
  } finally {
    fetcher.restore();
    env.META_APP_ID = prevMetaId;
    env.META_APP_SECRET = prevMetaSecret;
    cleanup();
  }
});

test('8, 9, 10, 12. Expired token detection, OAuth refresh, rate-limit (429) handling, API error handling, & revocation on disconnect', async () => {
  const { db, tenantA, cleanup } = createTestEnv();
  const prevYtId = env.GOOGLE_YOUTUBE_CLIENT_ID;
  const prevYtSecret = env.GOOGLE_YOUTUBE_CLIENT_SECRET;

  let mode: 'connect' | 'rate_limit' | 'refresh' | 'revoke' = 'connect';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (mode === 'connect') {
      if (url.includes('oauth2.googleapis.com/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'yt_initial_access_token',
            refresh_token: 'yt_refresh_token_secret',
            token_type: 'Bearer',
            expires_in: 3600,
            scope:
              'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.includes('youtube/v3/channels')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'UC_LIVINGTECH_01',
                snippet: {
                  title: 'LivingTech Studio',
                  customUrl: '@livingtechstudio',
                  description: 'Official video channel',
                  thumbnails: { default: { url: 'https://cdn.example.test/yt.png' } },
                },
                statistics: { subscriberCount: '24500' },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
    }

    if (mode === 'rate_limit') {
      return new Response(
        JSON.stringify({ error: { message: 'Quota exceeded for YouTube API' } }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': '120',
            'x-rate-limit-remaining': '0',
          },
        }
      );
    }

    if (mode === 'refresh' && url.includes('oauth2.googleapis.com/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'yt_refreshed_access_token_v2',
          token_type: 'Bearer',
          expires_in: 7200,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    if (mode === 'revoke' && url.includes('oauth2.googleapis.com/revoke')) {
      return new Response('', { status: 200 });
    }

    return new Response(JSON.stringify({ error: `Unhandled test fetch: ${mode} ${url}` }), { status: 500 });
  }) as typeof fetch;

  try {
    env.GOOGLE_YOUTUBE_CLIENT_ID = 'yt_client_id_test';
    env.GOOGLE_YOUTUBE_CLIENT_SECRET = 'yt_client_secret_test';

    const init = buildOfficialOAuthUrl(db, {
      platformKey: 'youtube',
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
    });
    const disc = await handleOAuthCallbackForDiscovery(db, {
      platformKey: 'youtube',
      code: 'yt_auth_code_1',
      state: init.state,
    });
    const conn = connectSelectedDiscoveredAccounts(db, {
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
      sessionId: disc.discoverySessionId,
      externalAccountIds: ['UC_LIVINGTECH_01'],
    });
    const accountId = conn.accounts[0].accountId;

    // 12. Rate-limit handling during sync
    mode = 'rate_limit';
    const rateLimitedSync = await syncSocialAccountData(db, tenantA.workspaceId, accountId, tenantA.user.id);
    assert.equal(rateLimitedSync.status, 'rate_limited');
    assert.ok(rateLimitedSync.message.toLowerCase().includes('rate limit'));

    // Confirm rate-limit header parser works cleanly
    const parsedHeaders = parseRateLimitHeaders(
      new Headers({ 'x-rate-limit-remaining': '0', 'retry-after': '120' })
    );
    assert.equal(parsedHeaders.remaining, 0);
    assert.equal(parsedHeaders.retryAfterSeconds, 120);

    // 9. Force token expiry, verify detection, then refresh token
    db.prepare('UPDATE social_account_tokens SET expires_at = ? WHERE social_account_id = ?').run(
      new Date(Date.now() - 60_000).toISOString(),
      accountId
    );
    const expiredHealth = verifyStoredAccountTokenHealth(db, tenantA.workspaceId, accountId);
    assert.equal(expiredHealth.healthy, false);
    assert.equal(expiredHealth.status, 'expired');

    mode = 'refresh';
    const refreshed = await refreshSocialAccountToken(db, tenantA.workspaceId, accountId, tenantA.user.id);
    assert.equal(refreshed.refreshed, true);
    const healthyAfterRefresh = verifyStoredAccountTokenHealth(db, tenantA.workspaceId, accountId);
    assert.equal(healthyAfterRefresh.healthy, true);
    assert.equal(healthyAfterRefresh.status, 'connected');

    // 8. Disconnect revokes upstream token and purges local encrypted token rows
    mode = 'revoke';
    const disconnected = await disconnectSocialAccount(db, {
      workspaceId: tenantA.workspaceId,
      accountId,
      actorUserId: tenantA.user.id,
      actorEmail: tenantA.user.email,
    });
    assert.equal(disconnected.success, true);
    assert.equal(disconnected.upstreamRevoked, true);

    const remainingTokens = db
      .prepare('SELECT COUNT(*) as c FROM social_account_tokens WHERE social_account_id = ?')
      .get(accountId) as { c: number };
    assert.equal(remainingTokens.c, 0);
  } finally {
    globalThis.fetch = originalFetch;
    env.GOOGLE_YOUTUBE_CLIENT_ID = prevYtId;
    env.GOOGLE_YOUTUBE_CLIENT_SECRET = prevYtSecret;
    cleanup();
  }
});

test('11. Permission denial callback handling & partial scope evaluation', async () => {
  const { db, tenantA, cleanup } = createTestEnv();
  const prevLiId = env.LINKEDIN_CLIENT_ID;
  const prevLiSecret = env.LINKEDIN_CLIENT_SECRET;
  try {
    env.LINKEDIN_CLIENT_ID = 'li_client_id';
    env.LINKEDIN_CLIENT_SECRET = 'li_client_secret';

    const init = buildOfficialOAuthUrl(db, {
      platformKey: 'linkedin',
      workspaceId: tenantA.workspaceId,
      userId: tenantA.user.id,
    });

    // User clicks "Cancel / Deny" on provider consent page
    await assert.rejects(
      () =>
        handleOAuthCallbackForDiscovery(db, {
          platformKey: 'linkedin',
          state: init.state,
          oauthError: 'user_cancelled_authorize',
          errorDescription: 'The user declined required permissions',
        }),
      /declined/i
    );

    const logs = listOAuthConnectionLogs(db, { workspaceId: tenantA.workspaceId });
    assert.equal(
      logs.some((l) => l.eventType === 'permission_denied' && l.errorCode === 'user_cancelled_authorize'),
      true
    );

    // Partial scope evaluation detects missing required scopes
    const evalResult = evaluatePermissionScopes(
      [
        { scopeKey: 'openid', label: 'OpenID', description: '', isRequired: true, requiresAppReview: false, approvalStatus: 'approved' },
        { scopeKey: 'w_member_social', label: 'Post', description: '', isRequired: true, requiresAppReview: false, approvalStatus: 'approved' },
      ],
      ['openid', 'profile']
    );
    assert.equal(evalResult.status, 'partial');
    assert.deepEqual(evalResult.missingRequiredScopes, ['w_member_social']);

    // ProviderApiError classification
    const err403 = new ProviderApiError({
      platform: 'linkedin',
      status: 403,
      message: 'Insufficient permissions',
      providerCode: 'ACCESS_DENIED',
    });
    assert.equal(err403.isPermissionDenied, true);
    assert.equal(err403.isRateLimited, false);
  } finally {
    env.LINKEDIN_CLIENT_ID = prevLiId;
    env.LINKEDIN_CLIENT_SECRET = prevLiSecret;
    cleanup();
  }
});
