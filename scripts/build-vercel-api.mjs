import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

async function buildVercelApi() {
  const outDir = path.resolve(process.cwd(), 'api');
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, 'index.js');

  await build({
    entryPoints: ['server/vercel-entry.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    packages: 'external',
    outfile,
    sourcemap: false,
    minify: false,
    logLevel: 'info',
    banner: {
      js: '// Auto-generated Vercel Serverless Express handler (ESM). Source: server/vercel-entry.ts',
    },
  });

  console.log(`[build-vercel-api] Built ${path.relative(process.cwd(), outfile)}`);
}

buildVercelApi().catch((err) => {
  console.error('[build-vercel-api] Failed to bundle Vercel API handler:', err);
  process.exit(1);
});
