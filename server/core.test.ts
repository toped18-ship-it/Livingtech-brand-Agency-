import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from './db/database';
import { createExpressApp } from './app';
import { loadOrCreateRuntimeSecrets } from './env';
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

    // 5. Fresh Customer A starts on a 7-day free trial and can create posts immediately during trial
    assert.equal(regA.data.workspaces[0].subscription.status, 'trialing');
    assert.equal(regA.data.workspaces[0].subscription.isTrialActive, true);
    assert.equal(regA.data.workspaces[0].subscription.trialDaysRemaining, 7);

    // Customer A creates a private post in Workspace A during their 7-day trial
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
    assert.equal(adminOverview.data.metrics.totalRegisteredUsers, 3); // Super-Admin + Customer A + Customer B (zero demo users!)
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

    // Activate Basic subscription for Workspace A
    const subRes = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/subscription/change`, {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'basic', billingCycle: 'monthly' },
    });
    assert.equal(subRes.status, 200);

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

    const subA = await reqJson(srv.baseUrl, `/api/workspaces/${wsA}/subscription/change`, {
      method: 'POST',
      token: tokenA,
      body: { planCode: 'basic', billingCycle: 'monthly' },
    });
    assert.equal(subA.status, 200);

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

test('Runtime secrets persist stably across restarts and sessions survive DB reopen with strict logout revocation', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-session-test-'));
  const secretFile = path.join(tmpDir, '.runtime-secrets.json');
  const dbFile = path.join(tmpDir, 'test.db');

  try {
    // 1. Runtime secrets must remain identical across repeated server starts
    const first = loadOrCreateRuntimeSecrets(secretFile);
    const second = loadOrCreateRuntimeSecrets(secretFile);
    assert.equal(first.sessionSecret, second.sessionSecret);
    assert.equal(first.tokenEncryptionKey, second.tokenEncryptionKey);
    assert.ok(first.sessionSecret.length >= 64);

    // 2. Log in on Server Instance #1
    const db1 = initDatabase(dbFile);
    const app1 = createExpressApp(db1);
    const srv1 = http.createServer(app1);
    await new Promise<void>((resolve) => srv1.listen(0, '127.0.0.1', () => resolve()));
    const port1 = (srv1.address() as { port: number }).port;
    const baseUrl1 = `http://127.0.0.1:${port1}`;

    const regPersist = await reqJson(baseUrl1, '/api/auth/register', {
      method: 'POST',
      body: {
        email: 'persist-client@brandco.io',
        password: 'PersistUser2026',
        fullName: 'Persist Client',
        workspaceName: 'Persist Workspace',
      },
    });
    assert.equal(regPersist.status, 201);
    const token = regPersist.data.token as string;
    assert.ok(token.startsWith('lt1.'));

    await new Promise<void>((resolve) => srv1.close(() => { db1.close(); resolve(); }));

    // 3. Reopen DB on Server Instance #2 (simulating server restart) -> session MUST remain valid
    const db2 = initDatabase(dbFile);
    const app2 = createExpressApp(db2);
    const srv2 = http.createServer(app2);
    await new Promise<void>((resolve) => srv2.listen(0, '127.0.0.1', () => resolve()));
    const port2 = (srv2.address() as { port: number }).port;
    const baseUrl2 = `http://127.0.0.1:${port2}`;

    const meAfterRestart = await reqJson(baseUrl2, '/api/auth/me', { token });
    assert.equal(meAfterRestart.status, 200);
    assert.equal(meAfterRestart.data.user.email, 'persist-client@brandco.io');

    // 4. Logout still revokes session strictly
    const logoutRes = await reqJson(baseUrl2, '/api/auth/logout', { method: 'POST', token });
    assert.equal(logoutRes.status, 200);
    const afterLogout = await reqJson(baseUrl2, '/api/auth/me', { token });
    assert.equal(afterLogout.status, 401);

    await new Promise<void>((resolve) => srv2.close(() => { db2.close(); resolve(); }));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Strict Subscription Package Entitlements: Basic vs Pro vs Enterprise API enforcement and cancellation', async () => {
  const srv = await startTestServer();
  try {
    const reg = await reqJson(srv.baseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        email: 'tiers@agency.io',
        password: 'TierUser2026',
        fullName: 'Tier Owner',
        workspaceName: 'Tier Brand',
      },
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token as string;
    const wid = reg.data.workspaces[0].id as string;

    // 1. Fresh client starts with an active 7-day free trial & zero demo records
    const initialSub = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription`, { token });
    assert.equal(initialSub.status, 200);
    assert.equal(initialSub.data.status, 'trialing');
    assert.equal(initialSub.data.isTrialActive, true);
    assert.equal(initialSub.data.isTrialExpired, false);
    assert.equal(initialSub.data.trialDaysRemaining, 7);
    assert.equal(initialSub.data.monthlyAiCredits, 100);
    assert.equal(reg.data.workspaces[0].aiCreditsBalance, 100);

    // Core modules are accessible during the active 7-day free trial
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/social-accounts`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/media`, { token })).status, 200);

    // 1b. Expire the 7-day trial (simulate 8 days elapsed) -> subscription is now strictly required
    const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    srv.db
      .prepare('UPDATE subscriptions SET current_period_end = ? WHERE workspace_id = ?')
      .run(expiredAt, wid);

    const expiredSub = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription`, { token });
    assert.equal(expiredSub.status, 200);
    assert.equal(expiredSub.data.isTrialActive, false);
    assert.equal(expiredSub.data.isTrialExpired, true);
    assert.equal(expiredSub.data.trialDaysRemaining, 0);

    // All paid modules are locked once the 7-day trial ends
    const lockedAccounts = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/social-accounts`, { token });
    assert.equal(lockedAccounts.status, 403);
    assert.equal(lockedAccounts.data.code, 'TRIAL_EXPIRED');
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/media`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/analytics`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/graphics`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/strategies`, { token })).status, 403);

    // 2. Subscribe & pay for Basic -> unlocks Social Accounts, AI Studio, Calendar, Media; keeps Pro/Enterprise locked
    const basicRes = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription/change`, {
      method: 'POST',
      token,
      body: {
        planCode: 'basic',
        billingCycle: 'monthly',
        payment: {
          method: 'card',
          billingEmail: 'tiers@agency.io',
          cardholderName: 'Tier Owner',
          cardBrand: 'Visa',
          cardLast4: '4242',
        },
      },
    });
    assert.equal(basicRes.status, 200);
    assert.ok(String(basicRes.data.transactionId || '').startsWith('LT-PAY-'));
    assert.equal(basicRes.data.subscription.status, 'active');
    assert.equal(basicRes.data.subscription.planCode, 'basic');
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/social-accounts`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/media`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/calendar`, { token })).status, 200);

    // Pro & Enterprise endpoints remain blocked on Basic
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/analytics`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/graphics`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/publishing-queue`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/engagement-messages`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/members`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/strategies`, { token })).status, 403);

    // 3. Upgrade to Pro -> unlocks Analytics, Graphic Designer, Auto Publisher, Engagement, Team; keeps Enterprise locked
    const proRes = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription/change`, {
      method: 'POST',
      token,
      body: {
        planCode: 'pro',
        billingCycle: 'annual',
        payment: {
          method: 'card',
          billingEmail: 'tiers@agency.io',
          cardholderName: 'Tier Owner',
          cardBrand: 'Mastercard',
          cardLast4: '5555',
        },
      },
    });
    assert.equal(proRes.status, 200);
    assert.ok(String(proRes.data.transactionId || '').startsWith('LT-PAY-'));
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/analytics`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/graphics`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/publishing-queue`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/engagement-messages`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/members`, { token })).status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/strategies`, { token })).status, 403);

    // 4. Upgrade to Enterprise -> unlocks AI Brand Strategy
    const entRes = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription/change`, {
      method: 'POST',
      token,
      body: {
        planCode: 'enterprise',
        billingCycle: 'monthly',
        payment: {
          method: 'bank_transfer',
          billingEmail: 'tiers@agency.io',
          cardholderName: 'Tier Owner',
          reference: 'WIRE-2026-991',
        },
      },
    });
    assert.equal(entRes.status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/strategies`, { token })).status, 200);

    // 5. Cancel subscription -> immediately re-locks paid features
    const cancelRes = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/subscription/cancel`, {
      method: 'POST',
      token,
    });
    assert.equal(cancelRes.status, 200);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/social-accounts`, { token })).status, 403);
    assert.equal((await reqJson(srv.baseUrl, `/api/workspaces/${wid}/ai/strategies`, { token })).status, 403);

    // Billing history reflects real subscription changes and safe payment receipt metadata
    const historyRes = await reqJson(srv.baseUrl, `/api/workspaces/${wid}/billing-history`, { token });
    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.data.length >= 4);
    assert.ok(
      historyRes.data.some((row: { transactionId?: string; cardLast4?: string }) =>
        String(row.transactionId || '').startsWith('LT-PAY-') && row.cardLast4 === '4242'
      )
    );
  } finally {
    await srv.close();
  }
});


