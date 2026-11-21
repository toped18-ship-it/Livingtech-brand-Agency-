import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { getDb } from './db/database';
import { createExpressApp } from './app';
import { logger } from './env';

let cachedApp: Express | null = null;

function getServerlessApp(): Express {
  if (!cachedApp) {
    const db = getDb();
    cachedApp = createExpressApp(db);
  }
  return cachedApp;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getServerlessApp();
    return app(req as Parameters<Express>[0], res as Parameters<Express>[1]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Serverless API invocation failed', { error: message });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Internal server error', detail: message }));
    }
  }
}
