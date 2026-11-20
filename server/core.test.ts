import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { initDatabase } from './db/database';
import { createExpressApp } from './app';
import {
  decryptSocialToken,
  encryptSocialToken,
  generatePkcePair,
  persistOAuthSocialAccount,
} from './services/oauthService';

async function startTestServer() {
  const db = initDatabase(':memory:');
  const app = createExpressApp(db);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    db,
    baseUrl,
    close: () => new Promise<void>((resolve) => server.close(() => { db.close(); resolve(); })),
  };
}

async function reqJson(baseUrl: string, path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('Full Phase 1 security & lifecycle: registration, login, logout, password reset, tenant isolation, and super-admin RBAC', async () => {
  const srv = await startTestServer();
  try {
    // 1. Unauthenticated protected route must return 401
    const unauth = await reqJson(srv.baseUrl, '/api/auth/me');
    assert.equal(unauth.status, 401);

    // 2. Register Customer A
    const regA = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        email: 'alpha@brandco.com',
        password: 'AlphaUser2026',
        fullName: 'Alpha Founder',
        workspaceName: 'Alpha Studio',
      },
    });
    assert.equal(regA.status, 201);
    assert.equal(regA.data.user.role, 'customer');
    assert.equal(regA.data.workspaces.length, 1);
    const tokenA = regA.data.token as string;
    const wsA = regA.data.workspaces[0].id as string;
    const verifyTokenA = regA.data.verificationToken as string;

    // 3. Verify Email for Customer A
    const verifyRes = await reqJson(srv.baseUrl, '/api/auth/verify-email', {
      method: 'POST',
      body: { token: verifyTokenA },
    });
    assert.equal(verifyRes.status, 200);

    // 4. Register Customer B
    const regB = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        email: 'beta@brandco.com',
        password: 'BetaUser2026',
        fullName: 'Beta Director',
        workspaceName: 'Beta Media',
      },
    });
    assert.equal(regB.status, 201);
    const tokenB = regB.data.token as string;

    // 5. Customer A creates a private post in Workspace A
    const postA = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/posts`, {
      method: 'POST',
      token: tokenA,
      body: {
        title: 'Confidential Product Reveal',
        caption: 'Top secret launch copy for Alpha Studio.',
        platformKey: 'linkedin',
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 86400 * 1000).toISOString(),
      },
    });
    assert.equal(postA.status, 201);

    // 6. TENANT ISOLATION: Customer B MUST NOT access Workspace A dashboard or posts (403 Forbidden)
    const crossRead = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/posts`, { token: tokenB });
    assert.equal(crossRead.status, 403);
    const crossDash = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/dashboard`, { token: tokenB });
    assert.equal(crossDash.status, 403);

    // 7. RBAC: Customer A MUST NOT access Super-Admin Console (403 Forbidden)
    const custAdmin = await reqJson(srv.baseUrl, '/api/admin/overview', { token: tokenA });
    assert.equal(custAdmin.status, 403);

    // 8. Super-Admin Login & Protected Console Access (200 OK)
    const adminLogin = await reqJson(srv.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'livingstoneedu64@gmail.com', password: 'Admin@LivingTech2026' },
    });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.data.user.role, 'super_admin');
    const adminToken = adminLogin.data.token as string;

    const adminOverview = await reqJson(srv.baseUrl, '/api/admin/overview', { token: adminToken });
    assert.equal(adminOverview.status, 200);
    assert.ok(adminOverview.data.metrics.totalRegisteredUsers >= 4);
    assert.equal(adminOverview.data.metrics.totalConnectedSocialAccounts, 0); // Zero fake social accounts!

    // 9. Password Reset Flow for Customer A
    const forgot = await reqJson(srv.baseUrl, '/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'alpha@brandco.com' },
    });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.data.previewResetToken);

    const reset = await reqJson(srv.baseUrl, '/api/auth/reset-password', {
      method: 'POST',
      body: { token: forgot.data.previewResetToken, newPassword: 'NewAlphaPass2026' },
    });
    assert.equal(reset.status, 200);

    // Old session should be invalidated after password reset
    const oldSession = await reqJson(srv.baseUrl, '/api/auth/me', { token: tokenA });
    assert.equal(oldSession.status, 401);

    // Login with new password succeeds
    const reLogin = await reqJson(srv.baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'alpha@brandco.com', password: 'NewAlphaPass2026' },
    });
    assert.equal(reLogin.status, 200);

    // 10. Logout invalidates session
    const logout = await reqJson(srv.baseUrl, '/api/auth/logout', { method: 'POST', token: reLogin.data.token });
    assert.equal(logout.status, 200);
    const afterLogout = await reqJson(srv.baseUrl, '/api/auth/me', { token: reLogin.data.token });
    assert.equal(afterLogout.status, 401);
  } finally {
    await srv.close();
  }
});

test('OAuth 2.0 AES-256-GCM encryption, PKCE, workspace+user binding, zero token leakage, and cascade disconnect', async () => {
  // Pure cryptographic round-trip + tamper check
  const secretToken = 'oauth_live_access_token_987654321';
  const encrypted = encryptSocialToken(secretToken);
  assert.notEqual(encrypted, secretToken);
  assert.ok(!encrypted.includes(secretToken));
  assert.equal(decryptSocialToken(encrypted), secretToken);
  assert.throws(() => decryptSocialToken(`${encrypted.slice(0, -2)}ff`));

  const pkce = generatePkcePair();
  assert.ok(pkce.codeVerifier.length >= 43);
  assert.ok(pkce.codeChallenge.length >= 43);
  assert.notEqual(pkce.codeVerifier, pkce.codeChallenge);

  const srv = await startTestServer();
  try {
    const regA = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'oauth-a@brand.io', password: 'OAuthUser2026', fullName: 'OAuth Owner', workspaceName: 'OAuth Brand' },
    });
    const regB = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'oauth-b@brand.io', password: 'OAuthUser2026', fullName: 'Other Tenant', workspaceName: 'Other Brand' },
    });
    const tokenA = regA.data.token as string;
    const tokenB = regB.data.token as string;
    const wsA = regA.data.workspaces[0].id as string;
    const userAId = regA.data.user.id as string;

    // Persist an OAuth-authorized X (Twitter) account bound to wsA + userAId
    const persisted = persistOAuthSocialAccount(srv.db, {
      workspaceId: wsA,
      userId: userAId,
      platformKey: 'x',
      identity: {
        externalAccountId: 'x_ext_42001',
        accountName: 'OAuth Brand Official',
        accountHandle: '@oauthbrand',
      },
      tokens: {
        accessToken: 'super_secret_x_access_token',
        refreshToken: 'super_secret_x_refresh_token',
        expiresInSeconds: 7200,
        scope: 'tweet.read tweet.write users.read offline.access',
      },
    });

    // Verify encrypted DB storage & user association
    const tokenRow = srv.db
      .prepare('SELECT * FROM social_account_tokens WHERE social_account_id = ?')
      .get(persisted.accountId) as Record<string, unknown>;
    assert.equal(tokenRow.workspace_id, wsA);
    assert.equal(tokenRow.connected_by_user_id, userAId);
    assert.ok(!String(tokenRow.encrypted_access_token).includes('super_secret_x_access_token'));
    assert.equal(decryptSocialToken(String(tokenRow.encrypted_access_token)), 'super_secret_x_access_token');

    // Verify HTTP response exposes safe metadata only and NEVER leaks tokens
    const listRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/social-accounts`, { token: tokenA });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.data.accounts.length, 1);
    const acc = listRes.data.accounts[0];
    assert.equal(acc.connectedByEmail, 'oauth-a@brand.io');
    assert.equal(acc.tokenVaultStatus, 'encrypted_aes256_gcm');
    const serialized = JSON.stringify(listRes.data);
    assert.ok(!serialized.includes('super_secret_x_access_token'));
    assert.ok(!serialized.includes('super_secret_x_refresh_token'));

    // Verify token vault health endpoint
    const healthRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/social-accounts/${persisted.accountId}/verify`, {
      method: 'POST',
      token: tokenA,
    });
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.data.healthy, true);
    assert.equal(healthRes.data.status, 'connected');

    // Cross-tenant isolation: Tenant B cannot list, verify, or disconnect Workspace A's social account
    const crossList = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/social-accounts`, { token: tokenB });
    assert.equal(crossList.status, 403);
    const crossDel = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/social-accounts/${persisted.accountId}`, {
      method: 'DELETE',
      token: tokenB,
    });
    assert.equal(crossDel.status, 403);

    // Disconnect purges account AND cascades token row deletion
    const delRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/social-accounts/${persisted.accountId}`, {
      method: 'DELETE',
      token: tokenA,
    });
    assert.equal(delRes.status, 200);
    const afterTokenRow = srv.db
      .prepare('SELECT id FROM social_account_tokens WHERE social_account_id = ?')
      .get(persisted.accountId);
    assert.equal(afterTokenRow, undefined);
  } finally {
    await srv.close();
  }
});

test('AI Content Studio stored suggestions: list, edit & save, promote to calendar, and tenant isolation', async () => {
  const srv = await startTestServer();
  try {
    const regA = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'studio-a@brand.io', password: 'StudioUser2026', fullName: 'Studio Editor', workspaceName: 'Studio A' },
    });
    const regB = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: { email: 'studio-b@brand.io', password: 'StudioUser2026', fullName: 'Other Editor', workspaceName: 'Studio B' },
    });
    const tokenA = regA.data.token as string;
    const tokenB = regB.data.token as string;
    const wsA = regA.data.workspaces[0].id as string;
    const userAId = regA.data.user.id as string;

    const suggestionId = crypto.randomUUID();
    const now = new Date().toISOString();
    srv.db.prepare(`
      INSERT INTO ai_content_suggestions (
        id, workspace_id, user_id, platform_key, topic, keywords_json, objective, tone,
        headline, headline_options_json, post_copy, hashtags_json, call_to_action,
        best_time_note, variants_json, status, saved_post_id, created_at, updated_at
      ) VALUES (?, ?, ?, 'instagram', 'Q4 Brand Launch', '["branding","growth"]', 'Lead Gen', 'Executive',
        'Initial Headline', '["Initial Headline","Alternative Headline"]', 'Initial post copy',
        '["#BrandLaunch","#Growth"]', 'Book a strategy call', 'Tue 10:00 AM', '[]', 'generated', NULL, ?, ?)
    `).run(suggestionId, wsA, userAId, now, now);

    // 1. List stored suggestions
    const listRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions`, { token: tokenA });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.data.length, 1);
    assert.equal(listRes.data[0].headline, 'Initial Headline');

    // 2. Edit & Save suggestion
    const editRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions/${suggestionId}`, {
      method: 'PATCH',
      token: tokenA,
      body: {
        headline: 'Refined Executive Launch Headline',
        postCopy: 'Edited post copy tailored for Q4 enterprise clients.',
        hashtags: ['BrandLaunch', '#LivingTech2026'],
        callToAction: 'Schedule your executive briefing today.',
        platformKey: 'linkedin',
      },
    });
    assert.equal(editRes.status, 200);
    assert.equal(editRes.data.status, 'edited');
    assert.equal(editRes.data.headline, 'Refined Executive Launch Headline');
    assert.deepEqual(editRes.data.hashtags, ['#BrandLaunch', '#LivingTech2026']);

    // 3. Cross-tenant isolation check
    const crossRead = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions`, { token: tokenB });
    assert.equal(crossRead.status, 403);
    const crossPatch = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions/${suggestionId}`, {
      method: 'PATCH',
      token: tokenB,
      body: { headline: 'Hijack', postCopy: 'Nope', hashtags: [], callToAction: '' },
    });
    assert.equal(crossPatch.status, 403);

    // 4. Promote edited suggestion to Content Calendar
    const promoteRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions/${suggestionId}/promote`, {
      method: 'POST',
      token: tokenA,
      body: { status: 'scheduled', scheduledFor: new Date(Date.now() + 3600 * 1000).toISOString() },
    });
    assert.equal(promoteRes.status, 201);
    assert.equal(promoteRes.data.post.title, 'Refined Executive Launch Headline');
    assert.equal(promoteRes.data.post.status, 'scheduled');

    const afterList = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/ai/suggestions`, { token: tokenA });
    assert.equal(afterList.data[0].status, 'saved_to_calendar');
    assert.equal(afterList.data[0].savedPostId, promoteRes.data.post.id);
  } finally {
    await srv.close();
  }
});

