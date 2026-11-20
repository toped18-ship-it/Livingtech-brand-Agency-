import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db/database';
import { createExpressApp } from './server/app';
import { env, logger } from './server/env';
import { startEmbeddedPublishingWorker } from './server/queue/publishingWorker';

async function startServer() {
  const db = getDb();
  const app = createExpressApp(db);

  // Start durable background publishing worker (independent of browser tabs)
  startEmbeddedPublishingWorker(db);

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info('LIVINGTECH BRAND AGENCY server running', {
      port: env.PORT,
      mode: env.NODE_ENV,
      appUrl: env.APP_URL,
      embeddedWorker: env.ENABLE_EMBEDDED_WORKER,
    });
  });
}

startServer().catch((err) => {
  logger.error('Fatal server startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
