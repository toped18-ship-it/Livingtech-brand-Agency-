import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase } from './db/database';
import { createExpressApp } from './app';
import {
  registerUserWithWorkspace,
  loginWithPassword,
  getUserBySessionToken,
  listUserWorkspaces,
} from './services/authService';

test('node:sqlite driver matches better-sqlite3 for full schema, transactions, auth, and workspaces', () => {
  for (const driver of ['better-sqlite3', 'node:sqlite'] as const) {
    const db = initDatabase(':memory:', { forceDriver: driver });
    try {
      const plans = db.prepare('SELECT code, name FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price_cents ASC').all() as {
        code: string;
        name: string;
      }[];
      assert.deepEqual(
        plans.map((p) => p.code),
        ['basic', 'pro', 'enterprise'],
        `Expected Basic/Pro/Enterprise plans under ${driver}`
      );

      // Verify transaction rollback works identically
      assert.throws(() => {
        db.transaction(() => {
          db.prepare(
            `INSERT INTO system_settings (key, value, description, updated_at) VALUES ('tx_probe', '1', 'probe', ?)`
          ).run(new Date().toISOString());
          throw new Error('force rollback');
        })();
      }, /force rollback/);

      const rolledBack = db.prepare("SELECT value FROM system_settings WHERE key = 'tx_probe'").get();
      assert.equal(rolledBack, undefined, `Transaction rollback failed under ${driver}`);

      // Verify user registration, login, session lookup, and workspace creation
      const created = registerUserWithWorkspace(db, {
        fullName: `Founder (${driver})`,
        email: `founder-${driver.replace(':', '-')}@example.com`,
        password: 'StrongPassword2026!',
        workspaceName: 'Acme Brand Workspace',
        industry: 'SaaS',
      });
      assert.equal(created.user.role, 'customer');
      assert.ok(created.token.length > 20);

      const resolved = getUserBySessionToken(db, created.token);
      assert.equal(resolved?.id, created.user.id);

      const loggedIn = loginWithPassword(db, created.user.email, 'StrongPassword2026!');
      assert.equal(loggedIn.user.id, created.user.id);

      const workspaces = listUserWorkspaces(db, created.user.id);
      assert.equal(workspaces.length, 1);
      assert.equal(workspaces[0].name, 'Acme Brand Workspace');
      assert.equal(workspaces[0].subscription?.planCode, 'none');

      const app = createExpressApp(db);
      assert.equal(typeof app, 'function');
    } finally {
      db.close();
    }
  }
});

test('compiled api/server.cjs boots and serves real HTTP requests in plain Node.js under VERCEL=1', async () => {
  const bundlePath = path.resolve(process.cwd(), 'api', 'server.cjs');
  if (!fs.existsSync(bundlePath)) {
    execFileSync(process.execPath, [path.resolve(process.cwd(), 'scripts', 'build-vercel-api.mjs')], {
      stdio: 'pipe',
    });
  }
  assert.ok(fs.existsSync(bundlePath), 'Expected api/server.cjs to be built');

  // Remove any leftover ephemeral SQLite file from earlier runs
  const tmpDbPath = '/tmp/livingtech.db';
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(`${tmpDbPath}${suffix}`, { force: true });
    } catch {
      // ignore
    }
  }

  // Launch a real plain Node.js subprocess (NOT tsx) simulating Vercel's exact runtime
  const probeScript = `
    const http = require('node:http');
    const handler = require(${JSON.stringify(bundlePath)});
    if (typeof handler !== 'function') {
      console.error('Exported handler is not a function:', typeof handler);
      process.exit(2);
    }
    const server = http.createServer((req, res) => handler(req, res));
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      console.log('READY:' + addr.port);
    });
  `;

  const child = spawn(process.execPath, ['-e', probeScript], {
    env: {
      ...process.env,
      VERCEL: '1',
      VERCEL_URL: 'livingtech-agency.vercel.app',
      NODE_ENV: 'production',
      PORT: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out booting api/server.cjs. stderr: ${stderr}`)), 10000);
    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/READY:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`api/server.cjs subprocess exited prematurely (${code}). stderr: ${stderr}`));
    });
  });

  try {
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200, `Expected 200 on /api/health, got ${healthRes.status}`);
    const healthJson = (await healthRes.json()) as { status: string };
    assert.equal(healthJson.status, 'ok');

    // 2. Public subscription plans
    const plansRes = await fetch(`${baseUrl}/api/plans`);
    assert.equal(plansRes.status, 200);
    const plansJson = (await plansRes.json()) as { code: string }[];
    assert.deepEqual(
      plansJson.map((p) => p.code),
      ['basic', 'pro', 'enterprise']
    );

    // 3. Public app settings
    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    assert.equal(settingsRes.status, 200);

    // 4. Register a brand-new user + verify session cookie on /api/auth/me
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Vercel Test Client',
        email: `vercel-client-${Date.now()}@example.com`,
        password: 'VercelPassword2026!',
        workspaceName: 'Vercel Test Brand',
        industry: 'Agency',
      }),
    });
    assert.equal(regRes.status, 201, `Expected 201 on /api/auth/register, got ${regRes.status}`);
    const setCookie = regRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('lt_session='), 'Expected lt_session cookie on register');
    const cookieHeader = setCookie.split(';')[0];

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(meRes.status, 200);
    const meJson = (await meRes.json()) as { user: { fullName: string }; workspaces: { name: string }[] };
    assert.equal(meJson.user.fullName, 'Vercel Test Client');
    assert.equal(meJson.workspaces[0].name, 'Vercel Test Brand');

    // 5. OAuth route through serverless function
    const oauthRes = await fetch(`${baseUrl}/auth/oauth/sandbox-consent?platform=instagram&state=test123`);
    assert.equal(oauthRes.status, 200);
    const oauthHtml = await oauthRes.text();
    assert.ok(oauthHtml.includes('LIVINGTECH BRAND AGENCY'));
  } finally {
    child.kill('SIGTERM');
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${tmpDbPath}${suffix}`, { force: true });
      } catch {
        // ignore
      }
    }
  }
});
