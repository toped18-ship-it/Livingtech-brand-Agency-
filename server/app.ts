import express from 'express';
import cookieParser from 'cookie-parser';
import type { DbInstance } from './db/database';
import { createApiRouter } from './routes/api';
import { createPhase3Router } from './routes/phase3';
import {
  handleOAuthCallbackForDiscovery,
  recordPlatformWebhookEvent,
} from './services/oauthService';
import { isValidPlatformKey } from './integrations/registry';
import type { PlatformKey } from '../src/shared/api-contracts';

export function createExpressApp(db: DbInstance) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(express.json({ limit: '12mb' }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Sandbox OAuth Consent Simulator Route (avoids live third-party API "Invalid App ID" errors)
  app.get('/auth/oauth/sandbox-consent', (req, res) => {
    const platform = String(req.query.platform || 'facebook');
    const state = String(req.query.state || '');
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>LivingTech OAuth Sandbox Simulator</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #050e28; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); max-width: 420px; width: 100%; text-align: center; border: 1px solid #e2e8f0; }
    .logo { font-size: 20px; font-weight: 800; color: #0052ff; margin-bottom: 16px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 13px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .btn { display: block; width: 100%; background: #0052ff; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none; box-sizing: border-box; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">LIVINGTECH BRAND AGENCY</div>
    <h1>Authorize ${platform.replace('_', ' ').toUpperCase()} Connection</h1>
    <p>Sandbox mode is active. Click below to grant permissions and simulate secure account discovery for this platform without requiring live developer credentials.</p>
    <a href="/auth/oauth/${platform}/callback?code=sandbox_auth_code_${Date.now()}&state=${state}" class="btn">Authorize & Discover Accounts</a>
  </div>
</body>
</html>`;
    res.send(html);
  });

  // Official Social Media OAuth 2.0 Popup Callback Handler (iframe-safe postMessage flow)
  // Exchanges code -> discovers accessible accounts/pages/channels/locations -> opens Account Selection Modal
  app.get(['/auth/oauth/:platform/callback', '/auth/oauth/:platform/callback/'], async (req, res) => {
    const rawPlatform = String(req.params.platform || '');
    if (!isValidPlatformKey(rawPlatform)) {
      return res
        .status(400)
        .send(renderOAuthPopupResult({ success: false, platform: rawPlatform, message: 'Unsupported social media platform.' }));
    }
    const platform = rawPlatform as PlatformKey;
    const code = req.query.code ? String(req.query.code) : undefined;
    const state = req.query.state ? String(req.query.state) : undefined;
    const oauthError = req.query.error ? String(req.query.error) : null;
    const errorDescription = req.query.error_description ? String(req.query.error_description) : null;

    try {
      const discovery = await handleOAuthCallbackForDiscovery(db, {
        platformKey: platform,
        code,
        state,
        oauthError,
        errorDescription,
      });

      return res.send(
        renderOAuthPopupResult({
          success: true,
          platform,
          discoverySessionId: discovery.discoverySessionId,
          accountCount: discovery.accountCount,
          message:
            discovery.accountCount > 0
              ? `Discovered ${discovery.accountCount} ${discovery.platformName} account(s). Select accounts in your LIVINGTECH dashboard to finish connecting.`
              : `Authorized ${discovery.platformName}, but no eligible accounts/pages were returned.`,
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete OAuth authorization.';
      const statusCode = oauthError || msg.includes('Invalid or expired') || msg.includes('Missing OAuth') ? 400 : 502;
      return res.status(statusCode).send(
        renderOAuthPopupResult({
          success: false,
          platform,
          message: msg,
        })
      );
    }
  });

  // Official Platform Webhook Receiver (Meta verification challenge + signed event intake)
  app.get('/api/webhooks/social/:platform', (req, res) => {
    const rawPlatform = String(req.params.platform || '');
    if (!isValidPlatformKey(rawPlatform)) {
      return res.status(404).json({ error: 'Unknown social platform.' });
    }
    const challenge = req.query['hub.challenge'];
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.json({ status: 'ok', platform: rawPlatform });
  });

  app.post('/api/webhooks/social/:platform', (req, res) => {
    const rawPlatform = String(req.params.platform || '');
    if (!isValidPlatformKey(rawPlatform)) {
      return res.status(404).json({ error: 'Unknown social platform.' });
    }
    const signatureHeader = String(
      req.headers['x-hub-signature-256'] ||
        req.headers['x-twitter-webhooks-signature'] ||
        req.headers['x-tiktok-signature'] ||
        ''
    );
    const deliveryId = String(req.headers['x-request-id'] || req.headers['x-delivery-id'] || '') || null;
    const bodyObj = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const eventType = String(bodyObj.event || bodyObj.object || bodyObj.type || 'webhook_notification');

    const eventId = recordPlatformWebhookEvent(db, {
      platformKey: rawPlatform as PlatformKey,
      eventType,
      deliveryId,
      verified: signatureHeader.length > 0,
      payload: bodyObj,
    });
    return res.status(202).json({ received: true, eventId });
  });

  app.use('/generated', express.static('public/generated'));
  app.use('/api', createApiRouter(db));
  app.use('/api', createPhase3Router(db));

  return app;
}

function renderOAuthPopupResult(params: {
  success: boolean;
  platform: string;
  message: string;
  discoverySessionId?: string;
  accountCount?: number;
}): string {
  const safePayload = JSON.stringify({
    type: params.success ? 'OAUTH_DISCOVERY_READY' : 'OAUTH_AUTH_ERROR',
    platform: params.platform,
    message: params.message,
    discoverySessionId: params.discoverySessionId ?? null,
    accountCount: params.accountCount ?? 0,
  });
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>LIVINGTECH OAuth Callback</title></head>
<body style="font-family:sans-serif;background:#071436;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;max-width:440px;padding:24px;">
    <h2 style="margin:0 0 8px 0;">LIVINGTECH BRAND AGENCY</h2>
    <p style="opacity:0.88;line-height:1.5;">${params.message.replace(/</g, '&lt;')}</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(${safePayload}, '*');
      setTimeout(function(){ window.close(); }, 600);
    } else {
      window.location.href = '/app/social-accounts';
    }
  </script>
</body>
</html>`;
}
