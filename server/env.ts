import { z } from 'zod';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().optional().default('http://localhost:3000'),
  SESSION_SECRET: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_CLIENT_ID: z.string().optional(),
  META_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_ID: z.string().optional(),
  GOOGLE_YOUTUBE_CLIENT_ID: z.string().optional(),
  GOOGLE_YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  PINTEREST_CLIENT_ID: z.string().optional(),
  PINTEREST_CLIENT_SECRET: z.string().optional(),
  PINTEREST_APP_ID: z.string().optional(),
  PINTEREST_APP_SECRET: z.string().optional(),
  GOOGLE_BUSINESS_CLIENT_ID: z.string().optional(),
  GOOGLE_BUSINESS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENABLE_EMBEDDED_WORKER: z.string().optional().default('true'),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(300000).default(15000),
  IMAGE_GENERATION_API_URL: z.string().optional(),
  IMAGE_GENERATION_API_KEY: z.string().optional(),
  IMAGE_GENERATION_MODEL: z.string().optional(),
  ENABLE_PAID_GEMINI_IMAGE_MODEL: z.string().optional().default('false'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid server environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

interface PersistedRuntimeSecrets {
  sessionSecret: string;
  tokenEncryptionKey: string;
}

export function loadOrCreateRuntimeSecrets(secretsFilePath?: string): PersistedRuntimeSecrets {
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;

  if (isServerless) {
    // Serverless instances have ephemeral filesystems; derive deterministic keys from deployment metadata
    const seed =
      process.env.VERCEL_PROJECT_ID ||
      process.env.VERCEL_GIT_REPO_ID ||
      process.env.K_SERVICE ||
      process.env.APP_URL ||
      'livingtech-brand-agency-serverless';
    return {
      sessionSecret: crypto.createHash('sha256').update(`lt-session::${seed}`).digest('hex'),
      tokenEncryptionKey: crypto.createHash('sha256').update(`lt-token-enc::${seed}`).digest('hex'),
    };
  }

  const targetPath = secretsFilePath ?? path.resolve(process.cwd(), 'data', '.runtime-secrets.json');
  try {
    if (fs.existsSync(targetPath)) {
      const raw = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as Partial<PersistedRuntimeSecrets>;
      if (
        typeof raw.sessionSecret === 'string' &&
        raw.sessionSecret.length >= 32 &&
        typeof raw.tokenEncryptionKey === 'string' &&
        raw.tokenEncryptionKey.length >= 32
      ) {
        return {
          sessionSecret: raw.sessionSecret,
          tokenEncryptionKey: raw.tokenEncryptionKey,
        };
      }
    }
  } catch {
    // Fall through and regenerate clean secrets file
  }

  const generated: PersistedRuntimeSecrets = {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    tokenEncryptionKey: crypto.randomBytes(32).toString('hex'),
  };

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(generated, null, 2), { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Fallback gracefully if filesystem is read-only
  }

  return generated;
}

const persistedSecrets = loadOrCreateRuntimeSecrets();

export const env = {
  ...parsed.data,
  META_APP_ID: parsed.data.META_APP_ID || parsed.data.META_CLIENT_ID,
  META_APP_SECRET: parsed.data.META_APP_SECRET || parsed.data.META_CLIENT_SECRET,
  TIKTOK_CLIENT_KEY: parsed.data.TIKTOK_CLIENT_KEY || parsed.data.TIKTOK_CLIENT_ID,
  GOOGLE_YOUTUBE_CLIENT_ID: parsed.data.GOOGLE_YOUTUBE_CLIENT_ID || parsed.data.YOUTUBE_CLIENT_ID || parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_YOUTUBE_CLIENT_SECRET: parsed.data.GOOGLE_YOUTUBE_CLIENT_SECRET || parsed.data.YOUTUBE_CLIENT_SECRET || parsed.data.GOOGLE_CLIENT_SECRET,
  PINTEREST_CLIENT_ID: parsed.data.PINTEREST_CLIENT_ID || parsed.data.PINTEREST_APP_ID,
  PINTEREST_CLIENT_SECRET: parsed.data.PINTEREST_CLIENT_SECRET || parsed.data.PINTEREST_APP_SECRET,
  GOOGLE_BUSINESS_CLIENT_ID: parsed.data.GOOGLE_BUSINESS_CLIENT_ID || parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_BUSINESS_CLIENT_SECRET: parsed.data.GOOGLE_BUSINESS_CLIENT_SECRET || parsed.data.GOOGLE_CLIENT_SECRET,
  ENABLE_EMBEDDED_WORKER: parsed.data.ENABLE_EMBEDDED_WORKER !== 'false',
  ENABLE_PAID_GEMINI_IMAGE_MODEL: parsed.data.ENABLE_PAID_GEMINI_IMAGE_MODEL === 'true',
  APP_URL: (parsed.data.APP_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  SESSION_SECRET: parsed.data.SESSION_SECRET && parsed.data.SESSION_SECRET.length >= 16
    ? parsed.data.SESSION_SECRET
    : persistedSecrets.sessionSecret,
  TOKEN_ENCRYPTION_KEY: parsed.data.TOKEN_ENCRYPTION_KEY && parsed.data.TOKEN_ENCRYPTION_KEY.length >= 32
    ? parsed.data.TOKEN_ENCRYPTION_KEY
    : persistedSecrets.tokenEncryptionKey,
};

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', ts: new Date().toISOString(), message, ...(meta ?? {}) }));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', ts: new Date().toISOString(), message, ...(meta ?? {}) }));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', ts: new Date().toISOString(), message, ...(meta ?? {}) }));
  },
};
