import type { PlatformKey } from '../../src/shared/api-contracts';
import { logger } from '../env';

export interface RateLimitInfo {
  remaining: number | null;
  limit: number | null;
  resetAtEpochSeconds: number | null;
  retryAfterSeconds: number | null;
}

export class ProviderApiError extends Error {
  readonly platform: PlatformKey;
  readonly status: number;
  readonly providerCode: string;
  readonly isRateLimited: boolean;
  readonly isTokenExpired: boolean;
  readonly isPermissionDenied: boolean;
  readonly retryAfterSeconds: number | null;

  constructor(params: {
    platform: PlatformKey;
    status: number;
    message: string;
    providerCode?: string;
    retryAfterSeconds?: number | null;
    isTokenExpired?: boolean;
    isPermissionDenied?: boolean;
  }) {
    super(redactSensitiveTokens(params.message));
    this.name = 'ProviderApiError';
    this.platform = params.platform;
    this.status = params.status;
    this.providerCode = params.providerCode || `HTTP_${params.status}`;
    this.isRateLimited = params.status === 429 || params.providerCode === 'rate_limit_exceeded';
    this.isTokenExpired = Boolean(params.isTokenExpired || params.status === 401);
    this.isPermissionDenied = Boolean(params.isPermissionDenied || params.status === 403);
    this.retryAfterSeconds = params.retryAfterSeconds ?? null;
  }
}

/**
 * Ensures OAuth bearer tokens, access_token query params, and client secrets
 * are stripped before error messages or logs are persisted or emitted.
 */
export function redactSensitiveTokens(input: string): string {
  return input
    .replace(/(access_token|refresh_token|client_secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]');
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const remainingRaw =
    headers.get('x-rate-limit-remaining') ||
    headers.get('x-ratelimit-remaining') ||
    headers.get('x-app-usage');
  const limitRaw = headers.get('x-rate-limit-limit') || headers.get('x-ratelimit-limit');
  const resetRaw = headers.get('x-rate-limit-reset') || headers.get('x-ratelimit-reset');
  const retryAfterRaw = headers.get('retry-after');

  let remaining: number | null = null;
  if (remainingRaw && /^\d+$/.test(remainingRaw.trim())) {
    remaining = Number(remainingRaw.trim());
  }

  return {
    remaining,
    limit: limitRaw && /^\d+$/.test(limitRaw.trim()) ? Number(limitRaw.trim()) : null,
    resetAtEpochSeconds: resetRaw && /^\d+$/.test(resetRaw.trim()) ? Number(resetRaw.trim()) : null,
    retryAfterSeconds: retryAfterRaw && /^\d+$/.test(retryAfterRaw.trim()) ? Number(retryAfterRaw.trim()) : null,
  };
}

export async function providerFetchJson<T = Record<string, unknown>>(
  platform: PlatformKey,
  url: string,
  init: RequestInit = {}
): Promise<{ data: T; status: number; rateLimit: RateLimitInfo }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    },
  });

  const rateLimit = parseRateLimitHeaders(response.headers);
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  if (!response.ok) {
    const errObj = (json.error && typeof json.error === 'object' ? json.error : null) as Record<string, unknown> | null;
    const providerCode = String(
      errObj?.code ||
        errObj?.status ||
        (typeof json.error === 'string' ? json.error : '') ||
        json.code ||
        `HTTP_${response.status}`
    );
    const providerMsg = String(
      errObj?.message ||
        json.error_description ||
        json.message ||
        (typeof json.error === 'string' ? json.error : '') ||
        `Upstream ${platform.toUpperCase()} API returned HTTP ${response.status}`
    );

    const lowerMsg = providerMsg.toLowerCase();
    const isTokenExpired =
      response.status === 401 ||
      providerCode === '190' ||
      lowerMsg.includes('expired') ||
      lowerMsg.includes('invalid_token') ||
      lowerMsg.includes('invalid oauth');
    const isPermissionDenied =
      response.status === 403 ||
      providerCode === '200' ||
      providerCode === '10' ||
      lowerMsg.includes('permission') ||
      lowerMsg.includes('insufficient_scope');

    logger.warn('Social provider API request failed', {
      platform,
      status: response.status,
      providerCode,
      isRateLimited: response.status === 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });

    throw new ProviderApiError({
      platform,
      status: response.status,
      message: providerMsg,
      providerCode,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      isTokenExpired,
      isPermissionDenied,
    });
  }

  return { data: json as T, status: response.status, rateLimit };
}
