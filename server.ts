import http from 'node:http';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db/database';
import { createExpressApp } from './server/app';
import { env, logger } from './server/env';
import { startEmbeddedPublishingWorker } from './server/queue/publishingWorker';

const NO_HMR_VITE_CLIENT_MODULE = `
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
    decline: noop,
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`.trim();

async function startServer() {
  const db = getDb();
  const app = createExpressApp(db);
  const httpServer = http.createServer(app);

  // Start durable background publishing worker (independent of browser tabs)
  startEmbeddedPublishingWorker(db);

  if (env.NODE_ENV !== 'production') {
    const disableHmr =
      process.env.DISABLE_HMR === 'true' ||
      env.APP_URL.includes('.run.app');

    if (disableHmr) {
      // Serve a WebSocket-free /@vite/client shim when HMR is disabled so browsers never hit unreachable WS ports
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(NO_HMR_VITE_CLIENT_MODULE);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: disableHmr ? false : undefined,
        hmr: disableHmr ? false : { server: httpServer },
      },
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

  httpServer.listen(env.PORT, '0.0.0.0', () => {
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
