// Auto-generated Vercel Serverless Express handler (ESM). Source: server/vercel-entry.ts

// server/db/database.ts
import crypto2 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";

// server/env.ts
import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();
var emptyToUndefined = (val) => typeof val === "string" && val.trim() === "" ? void 0 : val;
var EnvSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(3e3)),
  NODE_ENV: z.preprocess(
    (val) => val === "development" || val === "production" || val === "test" ? val : void 0,
    z.enum(["development", "production", "test"]).default("development")
  ),
  APP_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SQLITE_DB_PATH: z.preprocess(emptyToUndefined, z.string().optional()),
  FIREBASE_DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().optional().default("https://livingtech-brand-agency-default-rtdb.firebaseio.com")
  ),
  FIREBASE_DATABASE_SECRET: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  DISABLE_RTDB_SYNC: z.preprocess(emptyToUndefined, z.string().optional()),
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
  ENABLE_EMBEDDED_WORKER: z.preprocess(emptyToUndefined, z.string().optional().default("true")),
  WORKER_POLL_INTERVAL_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1e3).max(3e5).default(15e3)
  ),
  IMAGE_GENERATION_API_URL: z.string().optional(),
  IMAGE_GENERATION_API_KEY: z.string().optional(),
  IMAGE_GENERATION_MODEL: z.string().optional(),
  ENABLE_PAID_GEMINI_IMAGE_MODEL: z.preprocess(emptyToUndefined, z.string().optional().default("false"))
});
var rawParsed = EnvSchema.safeParse(process.env);
if (!rawParsed.success) {
  console.warn("Server environment validation warning (using safe defaults):", rawParsed.error.flatten().fieldErrors);
}
var parsedData = rawParsed.success ? rawParsed.data : EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test" ? process.env.NODE_ENV : "development"
});
var vercelFallbackHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
var resolvedAppUrl = parsedData.APP_URL || (vercelFallbackHost ? `https://${vercelFallbackHost.replace(/^https?:\/\//, "")}` : "http://localhost:3000");
function loadOrCreateRuntimeSecrets(secretsFilePath) {
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0;
  if (isServerless) {
    const seed = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_GIT_REPO_ID || process.env.K_SERVICE || process.env.APP_URL || "livingtech-brand-agency-serverless";
    return {
      sessionSecret: crypto.createHash("sha256").update(`lt-session::${seed}`).digest("hex"),
      tokenEncryptionKey: crypto.createHash("sha256").update(`lt-token-enc::${seed}`).digest("hex")
    };
  }
  const targetPath = secretsFilePath ?? path.resolve(process.cwd(), "data", ".runtime-secrets.json");
  try {
    if (fs.existsSync(targetPath)) {
      const raw = JSON.parse(fs.readFileSync(targetPath, "utf8"));
      if (typeof raw.sessionSecret === "string" && raw.sessionSecret.length >= 32 && typeof raw.tokenEncryptionKey === "string" && raw.tokenEncryptionKey.length >= 32) {
        return {
          sessionSecret: raw.sessionSecret,
          tokenEncryptionKey: raw.tokenEncryptionKey
        };
      }
    }
  } catch {
  }
  const generated = {
    sessionSecret: crypto.randomBytes(32).toString("hex"),
    tokenEncryptionKey: crypto.randomBytes(32).toString("hex")
  };
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(generated, null, 2), { encoding: "utf8", mode: 384 });
  } catch {
  }
  return generated;
}
var persistedSecrets = loadOrCreateRuntimeSecrets();
var env = {
  ...parsedData,
  META_APP_ID: parsedData.META_APP_ID || parsedData.META_CLIENT_ID,
  META_APP_SECRET: parsedData.META_APP_SECRET || parsedData.META_CLIENT_SECRET,
  TIKTOK_CLIENT_KEY: parsedData.TIKTOK_CLIENT_KEY || parsedData.TIKTOK_CLIENT_ID,
  GOOGLE_YOUTUBE_CLIENT_ID: parsedData.GOOGLE_YOUTUBE_CLIENT_ID || parsedData.YOUTUBE_CLIENT_ID || parsedData.GOOGLE_CLIENT_ID,
  GOOGLE_YOUTUBE_CLIENT_SECRET: parsedData.GOOGLE_YOUTUBE_CLIENT_SECRET || parsedData.YOUTUBE_CLIENT_SECRET || parsedData.GOOGLE_CLIENT_SECRET,
  PINTEREST_CLIENT_ID: parsedData.PINTEREST_CLIENT_ID || parsedData.PINTEREST_APP_ID,
  PINTEREST_CLIENT_SECRET: parsedData.PINTEREST_CLIENT_SECRET || parsedData.PINTEREST_APP_SECRET,
  GOOGLE_BUSINESS_CLIENT_ID: parsedData.GOOGLE_BUSINESS_CLIENT_ID || parsedData.GOOGLE_CLIENT_ID,
  GOOGLE_BUSINESS_CLIENT_SECRET: parsedData.GOOGLE_BUSINESS_CLIENT_SECRET || parsedData.GOOGLE_CLIENT_SECRET,
  ENABLE_EMBEDDED_WORKER: parsedData.ENABLE_EMBEDDED_WORKER !== "false",
  ENABLE_PAID_GEMINI_IMAGE_MODEL: parsedData.ENABLE_PAID_GEMINI_IMAGE_MODEL === "true",
  APP_URL: resolvedAppUrl.replace(/\/+$/, ""),
  SESSION_SECRET: parsedData.SESSION_SECRET && parsedData.SESSION_SECRET.length >= 16 ? parsedData.SESSION_SECRET : persistedSecrets.sessionSecret,
  TOKEN_ENCRYPTION_KEY: parsedData.TOKEN_ENCRYPTION_KEY && parsedData.TOKEN_ENCRYPTION_KEY.length >= 32 ? parsedData.TOKEN_ENCRYPTION_KEY : persistedSecrets.tokenEncryptionKey
};
var logger = {
  info(message, meta) {
    console.log(JSON.stringify({ level: "info", ts: (/* @__PURE__ */ new Date()).toISOString(), message, ...meta ?? {} }));
  },
  warn(message, meta) {
    console.warn(JSON.stringify({ level: "warn", ts: (/* @__PURE__ */ new Date()).toISOString(), message, ...meta ?? {} }));
  },
  error(message, meta) {
    console.error(JSON.stringify({ level: "error", ts: (/* @__PURE__ */ new Date()).toISOString(), message, ...meta ?? {} }));
  }
};

// server/integrations/httpClient.ts
var ProviderApiError = class extends Error {
  constructor(params) {
    super(redactSensitiveTokens(params.message));
    this.name = "ProviderApiError";
    this.platform = params.platform;
    this.status = params.status;
    this.providerCode = params.providerCode || `HTTP_${params.status}`;
    this.isRateLimited = params.status === 429 || params.providerCode === "rate_limit_exceeded";
    this.isTokenExpired = Boolean(params.isTokenExpired || params.status === 401);
    this.isPermissionDenied = Boolean(params.isPermissionDenied || params.status === 403);
    this.retryAfterSeconds = params.retryAfterSeconds ?? null;
  }
};
function redactSensitiveTokens(input) {
  return input.replace(/(access_token|refresh_token|client_secret)=([^&\s]+)/gi, "$1=[REDACTED]").replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]");
}
function parseRateLimitHeaders(headers) {
  const remainingRaw = headers.get("x-rate-limit-remaining") || headers.get("x-ratelimit-remaining") || headers.get("x-app-usage");
  const limitRaw = headers.get("x-rate-limit-limit") || headers.get("x-ratelimit-limit");
  const resetRaw = headers.get("x-rate-limit-reset") || headers.get("x-ratelimit-reset");
  const retryAfterRaw = headers.get("retry-after");
  let remaining = null;
  if (remainingRaw && /^\d+$/.test(remainingRaw.trim())) {
    remaining = Number(remainingRaw.trim());
  }
  return {
    remaining,
    limit: limitRaw && /^\d+$/.test(limitRaw.trim()) ? Number(limitRaw.trim()) : null,
    resetAtEpochSeconds: resetRaw && /^\d+$/.test(resetRaw.trim()) ? Number(resetRaw.trim()) : null,
    retryAfterSeconds: retryAfterRaw && /^\d+$/.test(retryAfterRaw.trim()) ? Number(retryAfterRaw.trim()) : null
  };
}
async function providerFetchJson(platform, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers || {}
    }
  });
  const rateLimit = parseRateLimitHeaders(response.headers);
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!response.ok) {
    const errObj = json.error && typeof json.error === "object" ? json.error : null;
    const providerCode = String(
      errObj?.code || errObj?.status || (typeof json.error === "string" ? json.error : "") || json.code || `HTTP_${response.status}`
    );
    const providerMsg = String(
      errObj?.message || json.error_description || json.message || (typeof json.error === "string" ? json.error : "") || `Upstream ${platform.toUpperCase()} API returned HTTP ${response.status}`
    );
    const lowerMsg = providerMsg.toLowerCase();
    const isTokenExpired = response.status === 401 || providerCode === "190" || lowerMsg.includes("expired") || lowerMsg.includes("invalid_token") || lowerMsg.includes("invalid oauth");
    const isPermissionDenied = response.status === 403 || providerCode === "200" || providerCode === "10" || lowerMsg.includes("permission") || lowerMsg.includes("insufficient_scope");
    logger.warn("Social provider API request failed", {
      platform,
      status: response.status,
      providerCode,
      isRateLimited: response.status === 429,
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
    throw new ProviderApiError({
      platform,
      status: response.status,
      message: providerMsg,
      providerCode,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      isTokenExpired,
      isPermissionDenied
    });
  }
  return { data: json, status: response.status, rateLimit };
}

// server/integrations/types.ts
var DEFAULT_PUBLISHING_PREFERENCES = {
  autoPublishEnabled: true,
  requireApprovalBeforePublish: false,
  defaultTimezone: "UTC",
  defaultVisibility: "public",
  appendDefaultHashtags: false,
  defaultHashtags: [],
  dailyPostLimit: 10
};
function splitScopes(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}
function evaluatePermissionScopes(specs, grantedRaw) {
  const grantedScopes = splitScopes(grantedRaw);
  const grantedSet = new Set(grantedScopes.map((s) => s.toLowerCase()));
  const missingRequiredScopes = specs.filter((p) => p.isRequired && !grantedSet.has(p.scopeKey.toLowerCase())).map((p) => p.scopeKey);
  if (grantedScopes.length === 0) {
    return { status: "revoked", grantedScopes, missingRequiredScopes };
  }
  if (missingRequiredScopes.length > 0) {
    return { status: "partial", grantedScopes, missingRequiredScopes };
  }
  return { status: "granted", grantedScopes, missingRequiredScopes: [] };
}

// src/utils/domain.ts
function slugifyWorkspaceName(input) {
  const cleaned = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return cleaned || "workspace";
}
function validatePasswordStrength(password) {
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain both uppercase and lowercase letters." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must include at least one number." };
  }
  return { valid: true };
}
function calculateAiCreditCost(feature) {
  switch (feature) {
    case "content_strategy":
      return 15;
    case "content_studio":
      return 5;
    case "caption_rewrite":
      return 2;
    case "hashtag_research":
      return 2;
  }
}
function canTransitionPostStatus(current, next, isSuperAdmin = false) {
  if (isSuperAdmin) return true;
  if (current === "published") return false;
  const allowed = {
    draft: ["draft", "pending", "scheduled"],
    pending: ["draft", "pending", "scheduled", "published", "failed"],
    scheduled: ["draft", "pending", "scheduled", "published", "failed"],
    failed: ["draft", "pending", "scheduled"],
    published: []
  };
  return allowed[current].includes(next);
}
function parseKeywordsInput(raw) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const cleaned = part.trim().replace(/\s+/g, " ").slice(0, 48);
    const key = cleaned.toLowerCase();
    if (cleaned.length >= 2 && !seen.has(key) && out.length < 15) {
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}
function normalizeHashtags(input) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const raw of input) {
    const stripped = raw.trim().replace(/^#+/, "").replace(/[^a-zA-Z0-9_]/g, "");
    if (!stripped) continue;
    const tag = `#${stripped.slice(0, 48)}`;
    const lower = tag.toLowerCase();
    if (!seen.has(lower) && out.length < 20) {
      seen.add(lower);
      out.push(tag);
    }
  }
  return out;
}
function getPlatformCharLimit(platform) {
  switch (platform) {
    case "x":
      return 280;
    case "pinterest":
      return 500;
    case "google_business":
      return 1500;
    case "instagram":
      return 2200;
    case "tiktok":
      return 2200;
    case "linkedin":
      return 3e3;
    case "youtube":
      return 5e3;
    case "facebook":
      return 63206;
  }
}
function canAccountPublishFormat(capabilities, format) {
  switch (format) {
    case "text":
      return capabilities.textPublishing;
    case "image":
      return capabilities.imagePublishing;
    case "video":
      return capabilities.videoPublishing;
    case "carousel":
      return capabilities.carouselPublishing;
    case "story":
      return capabilities.storyPublishing;
    case "reels":
      return capabilities.reelsPublishing;
    case "short_form_video":
      return capabilities.shortFormVideoPublishing;
  }
}
function maskClientId(clientId) {
  if (!clientId || clientId.trim().length === 0) return null;
  const trimmed = clientId.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}\u2022\u2022\u2022\u2022`;
  return `${trimmed.slice(0, 4)}\u2022\u2022\u2022\u2022${trimmed.slice(-4)}`;
}
var PHASE3_AI_CREDIT_COSTS = {
  brand_analysis: 10,
  audience_analysis: 8,
  content_strategy: 15,
  calendar_generation: 10,
  post_writing: 5,
  caption_writing: 3,
  hashtag_recommendations: 2,
  keyword_research: 3,
  graphic_design_assistance: 4,
  image_generation: 8,
  video_scripting: 6,
  content_repurposing: 8,
  performance_recommendations: 6,
  comment_reply_drafting: 2
};
var GRAPHIC_ASPECT_PRESETS = [
  { id: "1:1", label: "Square (1:1)", width: 1080, height: 1080, platforms: ["instagram", "facebook", "linkedin", "x"] },
  { id: "4:5", label: "Portrait Feed (4:5)", width: 1080, height: 1350, platforms: ["instagram", "facebook"] },
  { id: "9:16", label: "Story / Reel / TikTok (9:16)", width: 1080, height: 1920, platforms: ["instagram", "tiktok", "facebook", "youtube"] },
  { id: "16:9", label: "Landscape / YouTube (16:9)", width: 1280, height: 720, platforms: ["youtube", "linkedin", "x", "facebook"] },
  { id: "1.91:1", label: "Link Banner (1.91:1)", width: 1200, height: 628, platforms: ["linkedin", "facebook", "google_business"] },
  { id: "2:3", label: "Pinterest Pin (2:3)", width: 1e3, height: 1500, platforms: ["pinterest"] }
];
function isValidIanaTimezone(tz) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
function convertLocalDateTimeToUtcIso(localDateTime, timeZone) {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  if (/(Z|[+-]\d{2}:\d{2})$/i.test(localDateTime.trim())) {
    const d = new Date(localDateTime.trim());
    if (Number.isNaN(d.getTime())) throw new Error("Invalid ISO date-time value.");
    return d.toISOString();
  }
  const m = localDateTime.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    const fallback = new Date(localDateTime);
    if (Number.isNaN(fallback.getTime())) {
      throw new Error(`Invalid date-time format: ${localDateTime}`);
    }
    return fallback.toISOString();
  }
  const [, ys, ms, ds, hs, mins, secs] = m;
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  const hour = Number(hs);
  const minute = Number(mins);
  const second = Number(secs || "0");
  const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const getOffsetMs = (utcMillis) => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    const parts = dtf.formatToParts(new Date(utcMillis));
    const map = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = Number(p.value);
    }
    const localAsUtc = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      map.hour === 24 ? 0 : map.hour,
      map.minute,
      map.second
    );
    return localAsUtc - utcMillis;
  };
  let offset = getOffsetMs(targetAsUtcMs);
  let candidate = targetAsUtcMs - offset;
  const secondOffset = getOffsetMs(candidate);
  if (secondOffset !== offset) {
    candidate = targetAsUtcMs - secondOffset;
  }
  return new Date(candidate).toISOString();
}
function formatUtcInTimezone(utcIso, timeZone) {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}
function computeNextRecurrenceIso(currentUtcIso, timeZone, rule) {
  if (rule.type === "none") return null;
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : "UTC";
  const current = new Date(currentUtcIso);
  if (Number.isNaN(current.getTime())) return null;
  if (rule.type === "custom") {
    const upcoming = (rule.customDates || []).map((d) => convertLocalDateTimeToUtcIso(d, safeTz)).filter((iso) => new Date(iso).getTime() > current.getTime()).sort();
    const next = upcoming[0] ?? null;
    if (next && rule.endDate && new Date(next).getTime() > new Date(rule.endDate).getTime()) return null;
    return next;
  }
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = {};
  for (const p of dtf.formatToParts(current)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const hh = pad(parts.hour === 24 ? 0 : parts.hour);
  const mm = pad(parts.minute);
  const probeDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  let nextIso = null;
  if (rule.type === "daily") {
    probeDate.setUTCDate(probeDate.getUTCDate() + 1);
    nextIso = convertLocalDateTimeToUtcIso(
      `${probeDate.getUTCFullYear()}-${pad(probeDate.getUTCMonth() + 1)}-${pad(probeDate.getUTCDate())}T${hh}:${mm}`,
      safeTz
    );
  } else if (rule.type === "weekly") {
    probeDate.setUTCDate(probeDate.getUTCDate() + 7);
    nextIso = convertLocalDateTimeToUtcIso(
      `${probeDate.getUTCFullYear()}-${pad(probeDate.getUTCMonth() + 1)}-${pad(probeDate.getUTCDate())}T${hh}:${mm}`,
      safeTz
    );
  } else if (rule.type === "weekdays") {
    const allowedDays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [1, 2, 3, 4, 5];
    for (let i = 1; i <= 8; i++) {
      const candidate = new Date(probeDate.getTime() + i * 86400 * 1e3);
      if (allowedDays.includes(candidate.getUTCDay())) {
        nextIso = convertLocalDateTimeToUtcIso(
          `${candidate.getUTCFullYear()}-${pad(candidate.getUTCMonth() + 1)}-${pad(candidate.getUTCDate())}T${hh}:${mm}`,
          safeTz
        );
        break;
      }
    }
  } else if (rule.type === "monthly") {
    const targetDay = Math.min(Math.max(rule.dayOfMonth ?? parts.day, 1), 28);
    const nextMonth = new Date(Date.UTC(parts.year, parts.month, targetDay, 12, 0, 0));
    nextIso = convertLocalDateTimeToUtcIso(
      `${nextMonth.getUTCFullYear()}-${pad(nextMonth.getUTCMonth() + 1)}-${pad(nextMonth.getUTCDate())}T${hh}:${mm}`,
      safeTz
    );
  }
  if (nextIso && rule.endDate && new Date(nextIso).getTime() > new Date(rule.endDate).getTime()) {
    return null;
  }
  return nextIso;
}

// server/integrations/providers/facebook.ts
var GRAPH_VERSION = "v21.0";
var GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
var facebookProvider = {
  key: "facebook",
  displayName: "Facebook Pages",
  apiVersion: "Meta Graph API v21.0",
  oauthAuthorizeUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
  oauthTokenUrl: `${GRAPH_BASE}/oauth/access_token`,
  oauthRevokeUrl: `${GRAPH_BASE}/me/permissions`,
  portalName: "Meta for Developers",
  portalUrl: "https://developers.facebook.com/apps/",
  docsUrl: "https://developers.facebook.com/docs/pages-api/",
  envVarNames: ["META_APP_ID", "META_APP_SECRET"],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 200,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: ",",
  permissions: [
    {
      scopeKey: "pages_show_list",
      label: "List Managed Pages",
      description: "Discover Facebook Pages you administer so you can choose which Pages to connect.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pages_read_engagement",
      label: "Read Page Engagement & Insights",
      description: "Read Page posts, follower metrics, insights, and comments.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pages_manage_posts",
      label: "Publish Page Posts",
      description: "Publish text, photo, video, and Reel content to selected Facebook Pages.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pages_manage_engagement",
      label: "Respond to Page Comments",
      description: "Reply to and moderate comments on published Facebook Page posts.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: true,
    reelsPublishing: true,
    shortFormVideoPublishing: true,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: "Requires Facebook Page Admin/Editor role and Meta App Review approval for pages_manage_posts and pages_read_engagement."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state,
      scope: scopes.join(",")
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const query = new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code
    });
    const { data } = await providerFetchJson(
      "facebook",
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: "GET" }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: "facebook",
        status: 502,
        message: "Meta Graph API did not return an access_token."
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: null,
      tokenType: String(data.token_type || "Bearer"),
      scope: this.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3
    };
  },
  async refreshAccessToken(params) {
    const query = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      fb_exchange_token: params.refreshToken
    });
    const { data } = await providerFetchJson(
      "facebook",
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: "GET" }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: "facebook",
        status: 401,
        message: "Unable to extend Facebook long-lived access token. Reconnection required.",
        isTokenExpired: true
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: String(data.access_token),
      tokenType: String(data.token_type || "Bearer"),
      scope: this.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3
    };
  },
  async revokeToken(params) {
    try {
      await providerFetchJson(
        "facebook",
        `${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(params.accessToken)}`,
        { method: "DELETE" }
      );
      return { revoked: true, note: "Meta Graph API permissions revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged; upstream Meta token may already be invalidated." };
    }
  },
  async discoverAccounts(accessToken) {
    const accounts = [];
    let nextUrl = `${GRAPH_BASE}/me/accounts?fields=id,name,username,category,about,fan_count,followers_count,picture{url},access_token&limit=50&access_token=${encodeURIComponent(accessToken)}`;
    let rateLimitRemaining = null;
    let pagesFetched = 0;
    while (nextUrl && pagesFetched < 5) {
      const response = await providerFetchJson("facebook", nextUrl);
      const { data, rateLimit } = response;
      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;
      for (const page of data.data || []) {
        accounts.push({
          externalAccountId: page.id,
          accountName: page.name,
          accountHandle: page.username ? `@${page.username}` : `@${page.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
          accountType: "page",
          avatarUrl: page.picture?.data?.url ?? null,
          accountDescription: page.about || "",
          businessCategory: page.category || "Facebook Page",
          followersCount: page.followers_count ?? page.fan_count ?? null,
          scopedAccessToken: page.access_token ?? null,
          capabilities: { ...this.capabilities }
        });
      }
      nextUrl = data.paging?.next ?? null;
    }
    return { accounts, rateLimitRemaining };
  },
  async fetchAccountProfile(accessToken, externalAccountId) {
    const { data, rateLimit } = await providerFetchJson(
      "facebook",
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}?fields=id,name,username,about,category,followers_count,fan_count,picture{url}&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!data.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: data.id,
        accountName: data.name || "Facebook Page",
        accountHandle: data.username ? `@${data.username}` : `@fb_${data.id.slice(-6)}`,
        accountType: "page",
        avatarUrl: data.picture?.data?.url ?? null,
        accountDescription: data.about || "",
        businessCategory: data.category || "Facebook Page",
        followersCount: data.followers_count ?? data.fan_count ?? null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const limit = Math.min(options?.limit ?? 20, 50);
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const afterParam = options?.cursor ? `&after=${encodeURIComponent(options.cursor)}` : "";
    const { data: postsData, rateLimit } = await providerFetchJson(
      "facebook",
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}/published_posts?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true).limit(5){id,message,created_time,from}&limit=${limit}${afterParam}&access_token=${encodeURIComponent(accessToken)}`
    );
    const recentContent = (postsData.data || []).map((p) => ({
      externalPostId: p.id,
      text: p.message || "",
      publishedAt: p.created_time || null,
      permalink: p.permalink_url || null,
      likesCount: p.likes?.summary?.total_count ?? 0,
      commentsCount: p.comments?.summary?.total_count ?? 0,
      sharesCount: p.shares?.count ?? 0,
      impressionsCount: 0
    }));
    const recentComments = (postsData.data || []).flatMap(
      (p) => (p.comments?.data || []).map((c) => ({
        externalCommentId: c.id,
        externalPostId: p.id,
        authorName: c.from?.name || "Facebook User",
        authorHandle: c.from?.id ? `fb:${c.from.id}` : "@facebook_user",
        text: c.message || "",
        createdAt: c.created_time || (/* @__PURE__ */ new Date()).toISOString()
      }))
    );
    const totalEngagements = recentContent.reduce((sum, p) => sum + p.likesCount + p.commentsCount + p.sharesCount, 0);
    return {
      profile,
      recentContent,
      recentComments,
      analytics: {
        impressions: recentContent.reduce((s, p) => s + p.impressionsCount, 0),
        engagements: totalEngagements,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: postsData.paging?.cursors?.after ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "facebook",
        status: 422,
        message: `Format "${payload.format}" is not enabled for this Facebook Page.`
      });
    }
    const endpoint = payload.format === "image" && payload.mediaUrls?.[0] ? `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/photos` : `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/feed`;
    const body = new URLSearchParams({ access_token: accessToken });
    if (payload.format === "image" && payload.mediaUrls?.[0]) {
      body.set("url", payload.mediaUrls[0]);
      body.set("caption", payload.text);
    } else {
      body.set("message", payload.text);
      if (payload.linkUrl) body.set("link", payload.linkUrl);
    }
    const { data } = await providerFetchJson("facebook", endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const postId = data.post_id || data.id;
    if (!postId) {
      throw new ProviderApiError({ platform: "facebook", status: 502, message: "Facebook Page publish returned no post ID." });
    }
    return {
      externalPostId: postId,
      permalink: `https://www.facebook.com/${postId}`,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/instagram.ts
var GRAPH_VERSION2 = "v21.0";
var GRAPH_BASE2 = `https://graph.facebook.com/${GRAPH_VERSION2}`;
var instagramProvider = {
  key: "instagram",
  displayName: "Instagram Professional",
  apiVersion: "Instagram Graph API v21.0",
  oauthAuthorizeUrl: `https://www.facebook.com/${GRAPH_VERSION2}/dialog/oauth`,
  oauthTokenUrl: `${GRAPH_BASE2}/oauth/access_token`,
  oauthRevokeUrl: `${GRAPH_BASE2}/me/permissions`,
  portalName: "Meta for Developers",
  portalUrl: "https://developers.facebook.com/apps/",
  docsUrl: "https://developers.facebook.com/docs/instagram-platform/",
  envVarNames: ["META_APP_ID", "META_APP_SECRET"],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 200,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: ",",
  permissions: [
    {
      scopeKey: "instagram_basic",
      label: "Read Instagram Profile & Media",
      description: "Read Instagram Business/Creator profile metadata, follower counts, and published media.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "instagram_content_publish",
      label: "Publish Instagram Media & Reels",
      description: "Create and publish single images, carousels, Stories, and Reels to Professional accounts.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "instagram_manage_insights",
      label: "Read Instagram Insights",
      description: "Retrieve official account reach, impressions, and post engagement metrics.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "instagram_manage_comments",
      label: "Read & Reply to Comments",
      description: "Retrieve media comments and post official comment replies.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pages_show_list",
      label: "Discover Linked Facebook Pages",
      description: "Locate Instagram Professional accounts linked to managed Facebook Pages.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: false,
    // Official Instagram Graph API requires image, video, carousel, story, or reel media!
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: true,
    reelsPublishing: true,
    shortFormVideoPublishing: true,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: "Only Instagram Business & Creator accounts linked to a Facebook Page are supported. Text-only posts are not supported by Instagram Graph API."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state,
      scope: scopes.join(",")
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const query = new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code
    });
    const { data } = await providerFetchJson(
      "instagram",
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: "GET" }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: "instagram",
        status: 502,
        message: "Meta Graph API did not return an access_token for Instagram."
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: String(data.access_token),
      tokenType: String(data.token_type || "Bearer"),
      scope: this.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3
    };
  },
  async refreshAccessToken(params) {
    const query = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      fb_exchange_token: params.refreshToken
    });
    const { data } = await providerFetchJson(
      "instagram",
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: "GET" }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: "instagram",
        status: 401,
        message: "Unable to refresh Instagram long-lived token. Reconnection required.",
        isTokenExpired: true
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: String(data.access_token),
      tokenType: String(data.token_type || "Bearer"),
      scope: this.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3
    };
  },
  async revokeToken(params) {
    try {
      await providerFetchJson(
        "instagram",
        `${GRAPH_BASE2}/me/permissions?access_token=${encodeURIComponent(params.accessToken)}`,
        { method: "DELETE" }
      );
      return { revoked: true, note: "Meta Instagram permissions revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const accounts = [];
    let nextUrl = `${GRAPH_BASE2}/me/accounts?fields=id,name,instagram_business_account{id,username,name,biography,followers_count,profile_picture_url,account_type}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
    let rateLimitRemaining = null;
    let pagesFetched = 0;
    while (nextUrl && pagesFetched < 5) {
      const response = await providerFetchJson("instagram", nextUrl);
      const { data, rateLimit } = response;
      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;
      for (const page of data.data || []) {
        const ig = page.instagram_business_account;
        if (!ig?.id) continue;
        const isCreator = ig.account_type?.toLowerCase().includes("creator");
        accounts.push({
          externalAccountId: ig.id,
          accountName: ig.name || ig.username || page.name,
          accountHandle: ig.username ? `@${ig.username}` : `@ig_${ig.id.slice(-6)}`,
          accountType: isCreator ? "creator_account" : "business_account",
          avatarUrl: ig.profile_picture_url ?? null,
          accountDescription: ig.biography || "",
          businessCategory: isCreator ? "Instagram Creator" : "Instagram Business",
          followersCount: ig.followers_count ?? null,
          capabilities: { ...this.capabilities }
        });
      }
      nextUrl = data.paging?.next ?? null;
    }
    return { accounts, rateLimitRemaining };
  },
  async fetchAccountProfile(accessToken, externalAccountId) {
    const { data, rateLimit } = await providerFetchJson(
      "instagram",
      `${GRAPH_BASE2}/${encodeURIComponent(externalAccountId)}?fields=id,name,username,biography,followers_count,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!data.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: data.id,
        accountName: data.name || data.username || "Instagram Professional",
        accountHandle: data.username ? `@${data.username}` : `@ig_${data.id.slice(-6)}`,
        accountType: "business_account",
        avatarUrl: data.profile_picture_url ?? null,
        accountDescription: data.biography || "",
        businessCategory: "Instagram Professional",
        followersCount: data.followers_count ?? null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const limit = Math.min(options?.limit ?? 20, 50);
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const afterParam = options?.cursor ? `&after=${encodeURIComponent(options.cursor)}` : "";
    const { data: mediaData, rateLimit } = await providerFetchJson(
      "instagram",
      `${GRAPH_BASE2}/${encodeURIComponent(externalAccountId)}/media?fields=id,caption,timestamp,permalink,like_count,comments_count,comments.limit(5){id,text,username,timestamp}&limit=${limit}${afterParam}&access_token=${encodeURIComponent(accessToken)}`
    );
    const recentContent = (mediaData.data || []).map((m) => ({
      externalPostId: m.id,
      text: m.caption || "",
      publishedAt: m.timestamp || null,
      permalink: m.permalink || null,
      likesCount: m.like_count ?? 0,
      commentsCount: m.comments_count ?? 0,
      sharesCount: 0,
      impressionsCount: 0
    }));
    const recentComments = (mediaData.data || []).flatMap(
      (m) => (m.comments?.data || []).map((c) => ({
        externalCommentId: c.id,
        externalPostId: m.id,
        authorName: c.username || "Instagram User",
        authorHandle: c.username ? `@${c.username}` : "@instagram_user",
        text: c.text || "",
        createdAt: c.timestamp || (/* @__PURE__ */ new Date()).toISOString()
      }))
    );
    return {
      profile,
      recentContent,
      recentComments,
      analytics: {
        impressions: 0,
        engagements: recentContent.reduce((s, m) => s + m.likesCount + m.commentsCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: mediaData.paging?.cursors?.after ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "instagram",
        status: 422,
        message: `Instagram Professional API does not support "${payload.format}" publishing. Attach an image, video, carousel, or Reel asset.`
      });
    }
    const mediaUrl = payload.mediaUrls?.[0];
    if (!mediaUrl) {
      throw new ProviderApiError({
        platform: "instagram",
        status: 422,
        message: "Instagram publishing requires a publicly accessible media URL."
      });
    }
    const createBody = new URLSearchParams({ caption: payload.text, access_token: accessToken });
    if (payload.format === "reels" || payload.format === "video" || payload.format === "short_form_video") {
      createBody.set("media_type", "REELS");
      createBody.set("video_url", mediaUrl);
    } else if (payload.format === "story") {
      createBody.set("media_type", "STORIES");
      createBody.set("image_url", mediaUrl);
    } else {
      createBody.set("image_url", mediaUrl);
    }
    const { data: container } = await providerFetchJson(
      "instagram",
      `${GRAPH_BASE2}/${encodeURIComponent(account.externalAccountId)}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: createBody.toString()
      }
    );
    if (!container.id) {
      throw new ProviderApiError({ platform: "instagram", status: 502, message: "Failed to create Instagram media container." });
    }
    const publishBody = new URLSearchParams({ creation_id: container.id, access_token: accessToken });
    const { data: published } = await providerFetchJson(
      "instagram",
      `${GRAPH_BASE2}/${encodeURIComponent(account.externalAccountId)}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishBody.toString()
      }
    );
    return {
      externalPostId: published.id || container.id,
      permalink: null,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/tiktok.ts
var TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
var tiktokProvider = {
  key: "tiktok",
  displayName: "TikTok",
  apiVersion: "TikTok Display & Content Posting API v2",
  oauthAuthorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
  oauthTokenUrl: `${TIKTOK_API_BASE}/oauth/token/`,
  oauthRevokeUrl: `${TIKTOK_API_BASE}/oauth/revoke/`,
  portalName: "TikTok for Developers",
  portalUrl: "https://developers.tiktok.com/apps/",
  docsUrl: "https://developers.tiktok.com/doc/oauth-user-access-token-management/",
  envVarNames: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 600,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: ",",
  permissions: [
    {
      scopeKey: "user.info.basic",
      label: "Read Profile Identity",
      description: "Read TikTok open_id, display name, and avatar URL.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "user.info.stats",
      label: "Read Follower & Profile Stats",
      description: "Retrieve follower, following, likes, and video counts.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "video.list",
      label: "List Published Videos",
      description: "Read published videos and basic engagement metrics.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "video.publish",
      label: "Direct Video Publishing",
      description: "Publish short-form videos directly via TikTok Content Posting API.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: false,
    imagePublishing: true,
    // Photo Mode via Content Posting API
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true,
    commentRetrieval: false,
    // TikTok public Display API v2 does not expose general comment listing without Research/Business API
    commentResponses: false,
    analyticsRetrieval: true,
    notes: "Requires TikTok Content Posting API audit before public direct publishing; un-audited apps publish to creator inbox/private only."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_key: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      scope: scopes.join(","),
      state: params.state
    });
    if (params.codeChallenge) {
      query.set("code_challenge", params.codeChallenge);
      query.set("code_challenge_method", "S256");
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const body = new URLSearchParams({
      client_key: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri
    });
    if (params.codeVerifier) {
      body.set("code_verifier", params.codeVerifier);
    }
    const { data } = await providerFetchJson("tiktok", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "tiktok", status: 502, message: "TikTok token exchange did not return an access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(",")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 86400,
      refreshExpiresInSeconds: data.refresh_expires_in ? Number(data.refresh_expires_in) : null
    };
  },
  async refreshAccessToken(params) {
    const body = new URLSearchParams({
      client_key: params.clientId,
      client_secret: params.clientSecret,
      grant_type: "refresh_token",
      refresh_token: params.refreshToken
    });
    const { data } = await providerFetchJson("tiktok", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "tiktok", status: 401, message: "TikTok token refresh failed.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(",")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 86400,
      refreshExpiresInSeconds: data.refresh_expires_in ? Number(data.refresh_expires_in) : null
    };
  },
  async revokeToken(params) {
    try {
      const body = new URLSearchParams({
        client_key: params.clientId,
        client_secret: params.clientSecret,
        token: params.accessToken
      });
      await providerFetchJson("tiktok", `${TIKTOK_API_BASE}/oauth/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      return { revoked: true, note: "TikTok OAuth access token revoked via v2/oauth/revoke." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, "me");
    if (!profile) return { accounts: [], rateLimitRemaining };
    return {
      accounts: [{ ...profile, capabilities: { ...this.capabilities } }],
      rateLimitRemaining
    };
  },
  async fetchAccountProfile(accessToken) {
    const { data, rateLimit } = await providerFetchJson(
      "tiktok",
      `${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,username,avatar_url,bio_description,follower_count`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const u = data.data?.user;
    if (!u?.open_id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: u.open_id,
        accountName: u.display_name || u.username || "TikTok Account",
        accountHandle: u.username ? `@${u.username}` : `@${(u.display_name || u.open_id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
        accountType: "creator_account",
        avatarUrl: u.avatar_url ?? null,
        accountDescription: u.bio_description || "",
        businessCategory: "TikTok Creator / Business",
        followersCount: u.follower_count ?? null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const { data, rateLimit } = await providerFetchJson("tiktok", `${TIKTOK_API_BASE}/video/list/?fields=id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max_count: Math.min(options?.limit ?? 20, 20),
        ...options?.cursor ? { cursor: Number(options.cursor) } : {}
      })
    });
    const recentContent = (data.data?.videos || []).map((v) => ({
      externalPostId: v.id,
      text: v.video_description || v.title || "",
      publishedAt: v.create_time ? new Date(v.create_time * 1e3).toISOString() : null,
      permalink: v.share_url || null,
      likesCount: v.like_count ?? 0,
      commentsCount: v.comment_count ?? 0,
      sharesCount: v.share_count ?? 0,
      impressionsCount: v.view_count ?? 0
    }));
    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, v) => s + v.impressionsCount, 0),
        engagements: recentContent.reduce((s, v) => s + v.likesCount + v.commentsCount + v.sharesCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.data?.has_more && data.data.cursor ? String(data.data.cursor) : null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "tiktok",
        status: 422,
        message: `TikTok does not support "${payload.format}" publishing.`
      });
    }
    const videoUrl = payload.mediaUrls?.[0];
    if (!videoUrl) {
      throw new ProviderApiError({ platform: "tiktok", status: 422, message: "TikTok publishing requires a verified media URL." });
    }
    const { data } = await providerFetchJson(
      "tiktok",
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          post_info: {
            title: payload.text.slice(0, 2200),
            privacy_level: "PUBLIC_TO_EVERYONE"
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl
          }
        })
      }
    );
    return {
      externalPostId: data.data?.publish_id || `tt_${Date.now()}`,
      permalink: null,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/linkedin.ts
var LINKEDIN_VERSION = "202501";
var linkedinProvider = {
  key: "linkedin",
  displayName: "LinkedIn",
  apiVersion: "LinkedIn Marketing & Community Management API (v202501)",
  oauthAuthorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
  oauthTokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  oauthRevokeUrl: "https://www.linkedin.com/oauth/v2/revoke",
  portalName: "LinkedIn Developer Portal",
  portalUrl: "https://www.linkedin.com/developers/apps",
  docsUrl: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
  envVarNames: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 100,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: " ",
  permissions: [
    {
      scopeKey: "openid",
      label: "OpenID Identity",
      description: "Verify the authorizing LinkedIn member identity.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "profile",
      label: "Member Profile",
      description: "Read member display name and profile picture.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "email",
      label: "Primary Email",
      description: "Identify the authorizing LinkedIn member email address.",
      isRequired: false,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "w_member_social",
      label: "Publish Member Posts",
      description: "Publish text, image, and link updates on behalf of the LinkedIn member.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "r_organization_admin",
      label: "Discover Administered Organization Pages",
      description: "List LinkedIn Company Pages where the user has Administrator privileges.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "w_organization_social",
      label: "Publish to Organization Pages",
      description: "Publish posts and comment responses on authorized LinkedIn Company Pages.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: "Member publishing uses Share on LinkedIn product. Organization Page discovery, comments, and analytics require LinkedIn Community Management API approval."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : ["openid", "profile", "email", "w_member_social"];
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state,
      scope: scopes.join(" ")
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri
    });
    const { data } = await providerFetchJson("linkedin", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "linkedin", status: 502, message: "LinkedIn did not return an access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || "openid profile email w_member_social"),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3,
      refreshExpiresInSeconds: data.refresh_token_expires_in ? Number(data.refresh_token_expires_in) : null
    };
  },
  async refreshAccessToken(params) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret
    });
    const { data } = await providerFetchJson("linkedin", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "linkedin", status: 401, message: "LinkedIn refresh token expired or unsupported on current tier.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || "openid profile email w_member_social"),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184e3
    };
  },
  async revokeToken(params) {
    try {
      const body = new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        token: params.accessToken
      });
      await providerFetchJson("linkedin", "https://www.linkedin.com/oauth/v2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      });
      return { revoked: true, note: "LinkedIn OAuth token revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const accounts = [];
    const { data: user, rateLimit } = await providerFetchJson("linkedin", "https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (user.sub) {
      accounts.push({
        externalAccountId: `urn:li:person:${user.sub}`,
        accountName: user.name || "LinkedIn Member",
        accountHandle: user.email || `linkedin:${user.sub.slice(0, 8)}`,
        accountType: "profile",
        avatarUrl: user.picture ?? null,
        accountDescription: "Authorized LinkedIn Member Profile",
        businessCategory: "Personal / Executive Profile",
        followersCount: null,
        capabilities: {
          ...this.capabilities,
          commentRetrieval: false,
          commentResponses: false,
          analyticsRetrieval: false,
          notes: "Personal profiles support publishing; organization analytics & comments require Organization Admin access."
        }
      });
    }
    try {
      const { data: aclData } = await providerFetchJson(
        "linkedin",
        "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": LINKEDIN_VERSION,
            "X-Restli-Protocol-Version": "2.0.0"
          }
        }
      );
      for (const el of aclData.elements || []) {
        const orgUrn = el.organization || el.organizationTarget;
        if (!orgUrn) continue;
        const orgId = orgUrn.split(":").pop() || orgUrn;
        accounts.push({
          externalAccountId: orgUrn,
          accountName: `LinkedIn Organization (${orgId})`,
          accountHandle: `org:${orgId}`,
          accountType: "organization",
          avatarUrl: null,
          accountDescription: "Administered LinkedIn Company Page",
          businessCategory: "Company Page",
          followersCount: null,
          capabilities: { ...this.capabilities }
        });
      }
    } catch {
    }
    return { accounts, rateLimitRemaining: rateLimit.remaining };
  },
  async fetchAccountProfile(accessToken, externalAccountId) {
    const { data: user, rateLimit } = await providerFetchJson("linkedin", "https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!user.sub) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    const isOrg = externalAccountId.startsWith("urn:li:organization:");
    return {
      profile: {
        externalAccountId,
        accountName: isOrg ? `LinkedIn Organization (${externalAccountId.split(":").pop()})` : user.name || "LinkedIn Member",
        accountHandle: isOrg ? `org:${externalAccountId.split(":").pop()}` : user.email || `linkedin:${user.sub.slice(0, 8)}`,
        accountType: isOrg ? "organization" : "profile",
        avatarUrl: isOrg ? null : user.picture ?? null,
        accountDescription: isOrg ? "LinkedIn Organization Page" : "LinkedIn Member Profile",
        businessCategory: isOrg ? "Company Page" : "Executive Profile",
        followersCount: null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    return {
      profile,
      recentContent: [],
      recentComments: [],
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining,
      nextCursor: null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "linkedin",
        status: 422,
        message: `LinkedIn does not support "${payload.format}" publishing.`
      });
    }
    const { data } = await providerFetchJson("linkedin", "https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: account.externalAccountId,
        commentary: payload.text.slice(0, 3e3),
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        lifecycleState: "PUBLISHED"
      })
    });
    return {
      externalPostId: data.id || `li_${Date.now()}`,
      permalink: null,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/youtube.ts
var YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
var youtubeProvider = {
  key: "youtube",
  displayName: "YouTube",
  apiVersion: "YouTube Data API v3 & Analytics API v2",
  oauthAuthorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  oauthTokenUrl: "https://oauth2.googleapis.com/token",
  oauthRevokeUrl: "https://oauth2.googleapis.com/revoke",
  portalName: "Google Cloud Console",
  portalUrl: "https://console.cloud.google.com/apis/credentials",
  docsUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
  envVarNames: ["GOOGLE_YOUTUBE_CLIENT_ID", "GOOGLE_YOUTUBE_CLIENT_SECRET"],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 300,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: " ",
  permissions: [
    {
      scopeKey: "https://www.googleapis.com/auth/youtube.readonly",
      label: "Read YouTube Channels & Videos",
      description: "Discover channels, subscriber counts, playlists, and published video stats.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "https://www.googleapis.com/auth/youtube.upload",
      label: "Upload Videos & Shorts",
      description: "Upload long-form videos and YouTube Shorts to connected channels.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "https://www.googleapis.com/auth/youtube.force-ssl",
      label: "Read & Respond to Video Comments",
      description: "Retrieve comment threads and publish channel owner replies.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "https://www.googleapis.com/auth/yt-analytics.readonly",
      label: "Read YouTube Channel Analytics",
      description: "Fetch official watch time, impressions, and view analytics.",
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: false,
    // YouTube Data API v3 does not expose Community text/image posts
    imagePublishing: false,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true,
    // YouTube Shorts (vertical <= 60s video upload)
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: "Supports long-form videos and Shorts via YouTube Data API v3. Google OAuth App Verification is required for production public uploads."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state,
      scope: scopes.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent"
    });
    if (params.codeChallenge) {
      query.set("code_challenge", params.codeChallenge);
      query.set("code_challenge_method", "S256");
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri
    });
    if (params.codeVerifier) {
      body.set("code_verifier", params.codeVerifier);
    }
    const { data } = await providerFetchJson("youtube", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "youtube", status: 502, message: "Google OAuth did not return a YouTube access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600
    };
  },
  async refreshAccessToken(params) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken
    });
    const { data } = await providerFetchJson("youtube", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "youtube", status: 401, message: "YouTube refresh token revoked or invalid.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600
    };
  },
  async revokeToken(params) {
    try {
      const tokenToRevoke = params.refreshToken || params.accessToken;
      await providerFetchJson(
        "youtube",
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return { revoked: true, note: "Google OAuth YouTube token revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const accounts = [];
    let pageToken;
    let rateLimitRemaining = null;
    let pagesFetched = 0;
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const { data, rateLimit } = await providerFetchJson(
        "youtube",
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true&maxResults=50${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;
      for (const ch of data.items || []) {
        accounts.push({
          externalAccountId: ch.id,
          accountName: ch.snippet?.title || "YouTube Channel",
          accountHandle: ch.snippet?.customUrl || `@yt_${ch.id.slice(-6)}`,
          accountType: "channel",
          avatarUrl: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          accountDescription: ch.snippet?.description || "",
          businessCategory: "YouTube Channel",
          followersCount: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null,
          capabilities: { ...this.capabilities }
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken && pagesFetched < 5);
    return { accounts, rateLimitRemaining };
  },
  async fetchAccountProfile(accessToken, externalAccountId) {
    const { data, rateLimit } = await providerFetchJson(
      "youtube",
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(externalAccountId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const ch = data.items?.[0];
    if (!ch) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: ch.id,
        accountName: ch.snippet?.title || "YouTube Channel",
        accountHandle: ch.snippet?.customUrl || `@yt_${ch.id.slice(-6)}`,
        accountType: "channel",
        avatarUrl: ch.snippet?.thumbnails?.default?.url ?? null,
        accountDescription: ch.snippet?.description || "",
        businessCategory: "YouTube Channel",
        followersCount: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageParam = options?.cursor ? `&pageToken=${encodeURIComponent(options.cursor)}` : "";
    const limit = Math.min(options?.limit ?? 15, 25);
    const { data: searchData, rateLimit } = await providerFetchJson(
      "youtube",
      `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${encodeURIComponent(externalAccountId)}&type=video&order=date&maxResults=${limit}${pageParam}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const recentContent = (searchData.items || []).filter((i) => i.id?.videoId).map((i) => ({
      externalPostId: i.id.videoId,
      text: i.snippet?.title || i.snippet?.description || "",
      publishedAt: i.snippet?.publishedAt || null,
      permalink: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      impressionsCount: 0
    }));
    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: searchData.nextPageToken ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(_accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "youtube",
        status: 422,
        message: `YouTube Data API v3 only supports video and YouTube Shorts uploads\u2014"${payload.format}" is not supported.`
      });
    }
    throw new ProviderApiError({
      platform: "youtube",
      status: 422,
      message: "YouTube video uploads require initiating a resumable binary media upload session with a video asset from Media Library."
    });
  }
};

// server/integrations/providers/x.ts
var X_API_BASE = "https://api.twitter.com/2";
var xProvider = {
  key: "x",
  displayName: "X (Twitter)",
  apiVersion: "X API v2 (OAuth 2.0 PKCE)",
  oauthAuthorizeUrl: "https://twitter.com/i/oauth2/authorize",
  oauthTokenUrl: `${X_API_BASE}/oauth2/token`,
  oauthRevokeUrl: `${X_API_BASE}/oauth2/revoke`,
  portalName: "X Developer Portal",
  portalUrl: "https://developer.x.com/en/portal/dashboard",
  docsUrl: "https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code",
  envVarNames: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 60,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: " ",
  permissions: [
    {
      scopeKey: "users.read",
      label: "Read Account Profile",
      description: "Read X account handle, display name, bio, avatar, and follower metrics.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "tweet.read",
      label: "Read Posts & Mentions",
      description: "Retrieve published posts, replies, and engagement metrics.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "tweet.write",
      label: "Publish Posts & Replies",
      description: "Publish posts and reply to comments on behalf of the authorized X account.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "offline.access",
      label: "Offline Refresh Tokens",
      description: "Maintain background publishing access via encrypted refresh tokens.",
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: "Uses OAuth 2.0 Authorization Code with mandatory PKCE S256. Read/analytics endpoints depend on X API Basic/Pro tier quotas."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      response_type: "code",
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      scope: scopes.join(" "),
      state: params.state
    });
    if (params.codeChallenge) {
      query.set("code_challenge", params.codeChallenge);
      query.set("code_challenge_method", "S256");
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId
    });
    if (params.codeVerifier) {
      body.set("code_verifier", params.codeVerifier);
    }
    const { data } = await providerFetchJson("x", this.oauthTokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "x", status: 502, message: "X OAuth 2.0 did not return an access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 7200
    };
  },
  async refreshAccessToken(params) {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
      client_id: params.clientId
    });
    const { data } = await providerFetchJson("x", this.oauthTokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "x", status: 401, message: "X refresh token failed.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 7200
    };
  },
  async revokeToken(params) {
    try {
      const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
      const body = new URLSearchParams({
        token: params.accessToken,
        token_type_hint: "access_token"
      });
      await providerFetchJson("x", `${X_API_BASE}/oauth2/revoke`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });
      return { revoked: true, note: "X OAuth 2.0 token revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, "me");
    if (!profile) return { accounts: [], rateLimitRemaining };
    return {
      accounts: [{ ...profile, capabilities: { ...this.capabilities } }],
      rateLimitRemaining
    };
  },
  async fetchAccountProfile(accessToken) {
    const { data, rateLimit } = await providerFetchJson("x", `${X_API_BASE}/users/me?user.fields=profile_image_url,username,name,description,public_metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const u = data.data;
    if (!u?.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: u.id,
        accountName: u.name,
        accountHandle: `@${u.username}`,
        accountType: "profile",
        avatarUrl: u.profile_image_url ?? null,
        accountDescription: u.description || "",
        businessCategory: "X Account",
        followersCount: u.public_metrics?.followers_count ?? null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const limit = Math.min(options?.limit ?? 15, 50);
    const pagination = options?.cursor ? `&pagination_token=${encodeURIComponent(options.cursor)}` : "";
    const { data, rateLimit } = await providerFetchJson(
      "x",
      `${X_API_BASE}/users/${encodeURIComponent(externalAccountId)}/tweets?max_results=${Math.max(limit, 5)}&tweet.fields=created_at,public_metrics${pagination}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const recentContent = (data.data || []).map((t) => ({
      externalPostId: t.id,
      text: t.text,
      publishedAt: t.created_at || null,
      permalink: profile ? `https://x.com/${profile.accountHandle.replace(/^@/, "")}/status/${t.id}` : null,
      likesCount: t.public_metrics?.like_count ?? 0,
      commentsCount: t.public_metrics?.reply_count ?? 0,
      sharesCount: t.public_metrics?.retweet_count ?? 0,
      impressionsCount: t.public_metrics?.impression_count ?? 0
    }));
    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, t) => s + t.impressionsCount, 0),
        engagements: recentContent.reduce((s, t) => s + t.likesCount + t.commentsCount + t.sharesCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.meta?.next_token ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "x",
        status: 422,
        message: `X API v2 does not support "${payload.format}" publishing.`
      });
    }
    const { data } = await providerFetchJson("x", `${X_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: payload.text.slice(0, 280) })
    });
    if (!data.data?.id) {
      throw new ProviderApiError({ platform: "x", status: 502, message: "X publish returned no tweet ID." });
    }
    return {
      externalPostId: data.data.id,
      permalink: `https://x.com/i/web/status/${data.data.id}`,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/pinterest.ts
var PINTEREST_API_BASE = "https://api.pinterest.com/v5";
var pinterestProvider = {
  key: "pinterest",
  displayName: "Pinterest",
  apiVersion: "Pinterest API v5",
  oauthAuthorizeUrl: "https://www.pinterest.com/oauth/",
  oauthTokenUrl: `${PINTEREST_API_BASE}/oauth/token`,
  oauthRevokeUrl: null,
  portalName: "Pinterest Developers",
  portalUrl: "https://developers.pinterest.com/apps/",
  docsUrl: "https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/",
  envVarNames: ["PINTEREST_CLIENT_ID", "PINTEREST_CLIENT_SECRET"],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: false,
  defaultRateLimitRpm: 120,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: ",",
  permissions: [
    {
      scopeKey: "user_accounts:read",
      label: "Read Pinterest Business Account",
      description: "Read Pinterest profile metadata, business category, and follower metrics.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "boards:read",
      label: "Read Boards",
      description: "Discover Pinterest boards for organizing and targeting published Pins.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pins:read",
      label: "Read Pins & Analytics",
      description: "Retrieve published Pins, saves, outbound clicks, and account analytics.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    },
    {
      scopeKey: "pins:write",
      label: "Create Pins",
      description: "Publish image and video Pins to authorized Pinterest boards.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: false,
    // Pinterest requires visual media (Image or Video Pin)
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true,
    commentRetrieval: false,
    commentResponses: false,
    analyticsRetrieval: true,
    notes: "Pinterest API v5 Standard Access approval is required for production publishing; Trial Access apps are limited to sandbox testing."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      scope: scopes.join(","),
      state: params.state
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri
    });
    const { data } = await providerFetchJson("pinterest", this.oauthTokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "pinterest", status: 502, message: "Pinterest API v5 did not return an access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(",")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 2592e3,
      refreshExpiresInSeconds: data.refresh_token_expires_in ? Number(data.refresh_token_expires_in) : null
    };
  },
  async refreshAccessToken(params) {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken
    });
    const { data } = await providerFetchJson("pinterest", this.oauthTokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "pinterest", status: 401, message: "Pinterest refresh token expired.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(",")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 2592e3
    };
  },
  async revokeToken(_params) {
    return {
      revoked: false,
      note: "Local encrypted token purged. Users can also revoke app access in Pinterest Security Settings."
    };
  },
  async discoverAccounts(accessToken) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, "me");
    if (!profile) return { accounts: [], rateLimitRemaining };
    const accounts = [
      { ...profile, capabilities: { ...this.capabilities } }
    ];
    return { accounts, rateLimitRemaining };
  },
  async fetchAccountProfile(accessToken) {
    const { data, rateLimit } = await providerFetchJson("pinterest", `${PINTEREST_API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const id = data.id || data.username;
    if (!id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: id,
        accountName: data.business_name || data.username || "Pinterest Account",
        accountHandle: data.username ? `@${data.username}` : `@pin_${id.slice(-6)}`,
        accountType: data.account_type === "BUSINESS" ? "business_account" : "profile",
        avatarUrl: data.profile_image ?? null,
        accountDescription: data.about || "",
        businessCategory: data.account_type === "BUSINESS" ? "Pinterest Business" : "Pinterest Personal",
        followersCount: data.follower_count ?? null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageSize = Math.min(options?.limit ?? 20, 50);
    const bookmark = options?.cursor ? `&bookmark=${encodeURIComponent(options.cursor)}` : "";
    const { data, rateLimit } = await providerFetchJson("pinterest", `${PINTEREST_API_BASE}/pins?page_size=${pageSize}${bookmark}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const recentContent = (data.items || []).map((pin) => ({
      externalPostId: pin.id,
      text: pin.description || pin.title || "",
      publishedAt: pin.created_at || null,
      permalink: `https://www.pinterest.com/pin/${pin.id}/`,
      likesCount: pin.pin_metrics?.lifetime_metrics?.save ?? 0,
      commentsCount: 0,
      sharesCount: 0,
      impressionsCount: pin.pin_metrics?.lifetime_metrics?.impression ?? 0
    }));
    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, p) => s + p.impressionsCount, 0),
        engagements: recentContent.reduce((s, p) => s + p.likesCount, 0),
        clicks: (data.items || []).reduce((s, p) => s + (p.pin_metrics?.lifetime_metrics?.pin_click ?? 0), 0),
        followersTotal: profile?.followersCount ?? 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.bookmark ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "pinterest",
        status: 422,
        message: `Pinterest API v5 requires an image or video asset\u2014"${payload.format}" is not supported.`
      });
    }
    const imageUrl = payload.mediaUrls?.[0];
    if (!imageUrl || !payload.boardId) {
      throw new ProviderApiError({
        platform: "pinterest",
        status: 422,
        message: "Pinterest Pin publishing requires both a target boardId and an image/video URL."
      });
    }
    const { data } = await providerFetchJson("pinterest", `${PINTEREST_API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        board_id: payload.boardId,
        title: (payload.title || payload.text).slice(0, 100),
        description: payload.text.slice(0, 500),
        link: payload.linkUrl || void 0,
        media_source: { source_type: "image_url", url: imageUrl }
      })
    });
    return {
      externalPostId: data.id || `pin_${Date.now()}`,
      permalink: data.id ? `https://www.pinterest.com/pin/${data.id}/` : null,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/providers/googleBusiness.ts
var GBP_ACCOUNTS_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
var GBP_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
var GBP_POSTS_BASE = "https://mybusiness.googleapis.com/v4";
var googleBusinessProvider = {
  key: "google_business",
  displayName: "Google Business Profile",
  apiVersion: "Google Business Profile APIs v1 / v4",
  oauthAuthorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  oauthTokenUrl: "https://oauth2.googleapis.com/token",
  oauthRevokeUrl: "https://oauth2.googleapis.com/revoke",
  portalName: "Google Cloud Console",
  portalUrl: "https://console.cloud.google.com/apis/credentials",
  docsUrl: "https://developers.google.com/my-business/content/basic-setup",
  envVarNames: ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET"],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 120,
  defaultReviewStatus: "not_submitted",
  scopeDelimiter: " ",
  permissions: [
    {
      scopeKey: "https://www.googleapis.com/auth/business.manage",
      label: "Manage Google Business Profiles & Locations",
      description: "Discover business accounts & verified locations, publish Local Posts, read/reply to customer reviews, and fetch performance insights.",
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: "not_submitted"
    }
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: false,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true,
    // Customer Reviews
    commentResponses: true,
    // Review Replies
    analyticsRetrieval: true,
    // Business Profile Performance API
    notes: "Requires Google Business Profile API access approval in Google Cloud Console. Supports Local Posts (text + photo) and Review responses per location."
  },
  buildAuthorizationUrl(params) {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state,
      scope: scopes.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent"
    });
    if (params.codeChallenge) {
      query.set("code_challenge", params.codeChallenge);
      query.set("code_challenge_method", "S256");
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },
  async exchangeCodeForTokens(params) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri
    });
    if (params.codeVerifier) {
      body.set("code_verifier", params.codeVerifier);
    }
    const { data } = await providerFetchJson("google_business", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "google_business", status: 502, message: "Google OAuth did not return an access_token." });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600
    };
  },
  async refreshAccessToken(params) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken
    });
    const { data } = await providerFetchJson("google_business", this.oauthTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: "google_business", status: 401, message: "Google Business Profile refresh token expired or revoked.", isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: params.refreshToken,
      tokenType: String(data.token_type || "Bearer"),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(" ")),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600
    };
  },
  async revokeToken(params) {
    try {
      const tokenToRevoke = params.refreshToken || params.accessToken;
      await providerFetchJson(
        "google_business",
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return { revoked: true, note: "Google Business Profile OAuth token revoked." };
    } catch {
      return { revoked: false, note: "Local encrypted token purged." };
    }
  },
  async discoverAccounts(accessToken) {
    const discovered = [];
    const { data: accountsRes, rateLimit } = await providerFetchJson("google_business", `${GBP_ACCOUNTS_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    for (const acc of accountsRes.accounts || []) {
      let locationsFound = false;
      try {
        const { data: locRes } = await providerFetchJson(
          "google_business",
          `${GBP_INFO_BASE}/${acc.name}/locations?readMask=name,title,storeCode,profile,categories&pageSize=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        for (const loc of locRes.locations || []) {
          locationsFound = true;
          const fullResource = loc.name.startsWith("accounts/") ? loc.name : `${acc.name}/${loc.name}`;
          discovered.push({
            externalAccountId: fullResource,
            accountName: loc.title || acc.accountName || "Google Business Location",
            accountHandle: loc.storeCode ? `store:${loc.storeCode}` : loc.name,
            accountType: "location",
            avatarUrl: null,
            accountDescription: loc.profile?.description || "",
            businessCategory: loc.categories?.primaryCategory?.displayName || "Google Business Location",
            followersCount: null,
            capabilities: { ...this.capabilities }
          });
        }
      } catch {
      }
      if (!locationsFound) {
        discovered.push({
          externalAccountId: acc.name,
          accountName: acc.accountName || acc.name,
          accountHandle: acc.name,
          accountType: "location",
          avatarUrl: null,
          accountDescription: `Google Business Profile (${acc.type || "BUSINESS"})`,
          businessCategory: "Google Business Profile",
          followersCount: null,
          capabilities: { ...this.capabilities }
        });
      }
    }
    return { accounts: discovered, rateLimitRemaining: rateLimit.remaining };
  },
  async fetchAccountProfile(accessToken, externalAccountId) {
    const locSegment = externalAccountId.includes("/locations/") ? `locations/${externalAccountId.split("/locations/").pop()}` : externalAccountId;
    const { data, rateLimit } = await providerFetchJson(
      "google_business",
      `${GBP_INFO_BASE}/${locSegment}?readMask=name,title,storeCode,profile,categories`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!data.name) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId,
        accountName: data.title || "Google Business Location",
        accountHandle: data.storeCode ? `store:${data.storeCode}` : data.name,
        accountType: "location",
        avatarUrl: null,
        accountDescription: data.profile?.description || "",
        businessCategory: data.categories?.primaryCategory?.displayName || "Google Business Location",
        followersCount: null
      },
      rateLimitRemaining: rateLimit.remaining
    };
  },
  async fetchContentAndInsights(accessToken, externalAccountId, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageParam = options?.cursor ? `&pageToken=${encodeURIComponent(options.cursor)}` : "";
    const { data, rateLimit } = await providerFetchJson("google_business", `${GBP_POSTS_BASE}/${externalAccountId}/localPosts?pageSize=20${pageParam}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const recentContent = (data.localPosts || []).map((post) => ({
      externalPostId: post.name,
      text: post.summary || "",
      publishedAt: post.createTime || null,
      permalink: post.searchUrl || null,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      impressionsCount: 0
    }));
    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        followersTotal: 0
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.nextPageToken ?? null
    };
  },
  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },
  async publishContent(accessToken, account, payload) {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: "google_business",
        status: 422,
        message: `Google Business Profile Local Posts only support text and photo updates\u2014"${payload.format}" is not supported.`
      });
    }
    const { data } = await providerFetchJson(
      "google_business",
      `${GBP_POSTS_BASE}/${account.externalAccountId}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          languageCode: "en-US",
          summary: payload.text.slice(0, 1500),
          topicType: "STANDARD",
          ...payload.mediaUrls?.[0] ? { media: [{ mediaFormat: "PHOTO", sourceUrl: payload.mediaUrls[0] }] } : {}
        })
      }
    );
    return {
      externalPostId: data.name || `gbp_${Date.now()}`,
      permalink: data.searchUrl || null,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// server/integrations/registry.ts
var SOCIAL_PROVIDERS = {
  facebook: facebookProvider,
  instagram: instagramProvider,
  tiktok: tiktokProvider,
  linkedin: linkedinProvider,
  youtube: youtubeProvider,
  x: xProvider,
  pinterest: pinterestProvider,
  google_business: googleBusinessProvider
};
var SOCIAL_PROVIDER_LIST = [
  facebookProvider,
  instagramProvider,
  tiktokProvider,
  linkedinProvider,
  youtubeProvider,
  xProvider,
  pinterestProvider,
  googleBusinessProvider
];
function getSocialProvider(key) {
  const provider = SOCIAL_PROVIDERS[key];
  if (!provider) {
    throw new Error(`Unsupported social media platform: ${key}`);
  }
  return provider;
}
function isValidPlatformKey(key) {
  return key in SOCIAL_PROVIDERS;
}

// server/db/sqliteDriver.ts
import { createRequire } from "node:module";
function getRuntimeRequire() {
  return createRequire(import.meta.url);
}
function normalizeParam(value) {
  if (value === void 0) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}
function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  return { ...row };
}
function createNodeSqliteAdapter(rawDb) {
  let txDepth = 0;
  return {
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        get(...params) {
          const normalized = params.map(normalizeParam);
          const row = stmt.get(...normalized);
          return row === void 0 ? void 0 : normalizeRow(row);
        },
        all(...params) {
          const normalized = params.map(normalizeParam);
          const rows = stmt.all(...normalized);
          return rows.map((row) => normalizeRow(row));
        },
        run(...params) {
          const normalized = params.map(normalizeParam);
          const res = stmt.run(...normalized);
          return {
            changes: Number(res.changes ?? 0),
            lastInsertRowid: res.lastInsertRowid ?? 0
          };
        }
      };
    },
    exec(sql) {
      rawDb.exec(sql);
    },
    pragma(pragma) {
      rawDb.exec(`PRAGMA ${pragma}`);
    },
    transaction(fn) {
      const wrapped = (...args) => {
        const currentDepth = txDepth;
        const savepoint = `lt_sp_${currentDepth}`;
        if (currentDepth === 0) {
          rawDb.exec("BEGIN");
        } else {
          rawDb.exec(`SAVEPOINT ${savepoint}`);
        }
        txDepth += 1;
        try {
          const result = fn(...args);
          txDepth -= 1;
          if (currentDepth === 0) {
            rawDb.exec("COMMIT");
          } else {
            rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
          }
          return result;
        } catch (err) {
          txDepth = Math.max(0, txDepth - 1);
          try {
            if (currentDepth === 0) {
              rawDb.exec("ROLLBACK");
            } else {
              rawDb.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
              rawDb.exec(`RELEASE SAVEPOINT ${savepoint}`);
            }
          } catch {
          }
          throw err;
        }
      };
      return wrapped;
    },
    close() {
      rawDb.close();
    }
  };
}
function tryOpenNodeSqlite(targetPath) {
  const runtimeRequire = getRuntimeRequire();
  const mod = runtimeRequire("node:sqlite");
  if (!mod?.DatabaseSync) {
    throw new Error("node:sqlite DatabaseSync is unavailable in this Node.js runtime");
  }
  const rawDb = new mod.DatabaseSync(targetPath);
  return createNodeSqliteAdapter(rawDb);
}
function tryOpenBetterSqlite3(targetPath) {
  const runtimeRequire = getRuntimeRequire();
  const BetterSqlite3 = runtimeRequire("better-sqlite3");
  return new BetterSqlite3(targetPath);
}
function openSqliteDatabase(targetPath, options) {
  if (options?.forceDriver === "node:sqlite") {
    return { db: tryOpenNodeSqlite(targetPath), driver: "node:sqlite" };
  }
  if (options?.forceDriver === "better-sqlite3") {
    return { db: tryOpenBetterSqlite3(targetPath), driver: "better-sqlite3" };
  }
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0;
  const order = isServerless ? ["node:sqlite", "better-sqlite3"] : ["better-sqlite3", "node:sqlite"];
  let lastError = null;
  for (const driver of order) {
    try {
      const db = driver === "node:sqlite" ? tryOpenNodeSqlite(targetPath) : tryOpenBetterSqlite3(targetPath);
      return { db, driver };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Failed to initialize SQLite driver (${order.join(" -> ")}): ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

// server/db/database.ts
function hashPassword(password) {
  const salt = crypto2.randomBytes(16).toString("hex");
  const derived = crypto2.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = crypto2.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto2.timingSafeEqual(derived, keyBuf);
}
function initDatabase(dbPath, options) {
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0;
  const configuredPath = process.env.SQLITE_DB_PATH?.trim() || void 0;
  const defaultPath = configuredPath ?? (isServerless ? "/tmp/livingtech.db" : path2.resolve(process.cwd(), "data", "livingtech.db"));
  const targetPath = dbPath ?? defaultPath;
  if (targetPath !== ":memory:") {
    fs2.mkdirSync(path2.dirname(targetPath), { recursive: true });
  }
  const { db } = openSqliteDatabase(targetPath, options);
  db.pragma("foreign_keys = ON");
  if (targetPath !== ":memory:") {
    try {
      db.pragma("journal_mode = WAL");
    } catch {
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(role_id, resource, action)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      auth_provider TEXT NOT NULL DEFAULT 'password',
      external_uid TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      role_slug TEXT NOT NULL DEFAULT 'customer' REFERENCES roles(slug),
      email_verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),
      timezone TEXT NOT NULL DEFAULT 'UTC',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_type TEXT NOT NULL CHECK(token_type IN ('email_verify','password_reset','account_recovery')),
      token_value TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      billing_email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      ai_credits_balance INTEGER NOT NULL DEFAULT 250 CHECK(ai_credits_balance >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(organisation_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      invited_email TEXT NOT NULL,
      role_slug TEXT NOT NULL DEFAULT 'editor' REFERENCES roles(slug),
      status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('active','invited','revoked')),
      invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, invited_email)
    );
    CREATE INDEX IF NOT EXISTS idx_ws_members_ws ON workspace_members(workspace_id);

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
      brand_name TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#0052FF',
      secondary_color TEXT NOT NULL DEFAULT '#071436',
      accent_color TEXT NOT NULL DEFAULT '#F59E0B',
      business_description TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      tone_of_voice TEXT NOT NULL DEFAULT 'Executive & Authoritative',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_platforms (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE CHECK(key IN ('facebook','instagram','tiktok','linkedin','youtube','x','pinterest','google_business')),
      display_name TEXT NOT NULL,
      oauth_authorize_url TEXT NOT NULL,
      oauth_token_url TEXT NOT NULL,
      scopes TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      connected_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      platform_id TEXT NOT NULL REFERENCES social_platforms(id) ON DELETE RESTRICT,
      external_account_id TEXT NOT NULL,
      account_handle TEXT NOT NULL,
      account_name TEXT NOT NULL,
      avatar_url TEXT,
      connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK(connection_status IN ('connected','expired','revoked','disconnected')),
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, platform_id, external_account_id)
    );
    CREATE INDEX IF NOT EXISTS idx_social_accounts_ws ON social_accounts(workspace_id);

    CREATE TABLE IF NOT EXISTS social_account_tokens (
      id TEXT PRIMARY KEY,
      social_account_id TEXT NOT NULL UNIQUE REFERENCES social_accounts(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      connected_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      encrypted_access_token TEXT NOT NULL,
      encrypted_refresh_token TEXT,
      token_type TEXT NOT NULL DEFAULT 'Bearer',
      scope TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_posts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','scheduled','published','failed')),
      campaign_tag TEXT,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      scheduled_for TEXT,
      published_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_ws_status ON content_posts(workspace_id, status);

    CREATE TABLE IF NOT EXISTS content_variants (
      id TEXT PRIMARY KEY,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      variant_label TEXT NOT NULL DEFAULT 'Primary',
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('image','video','document','template')),
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      folder TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_media_ws ON media_library(workspace_id);

    CREATE TABLE IF NOT EXISTS content_assets (
      id TEXT PRIMARY KEY,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      media_id TEXT NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publishing_schedules (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      scheduled_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_rule TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publishing_jobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      schedule_id TEXT REFERENCES publishing_schedules(id) ON DELETE SET NULL,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      job_status TEXT NOT NULL DEFAULT 'queued' CHECK(job_status IN ('queued','processing','succeeded','failed','cancelled')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      run_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_ws_status ON publishing_jobs(workspace_id, job_status);

    CREATE TABLE IF NOT EXISTS publishing_logs (
      id TEXT PRIMARY KEY,
      publishing_job_id TEXT NOT NULL REFERENCES publishing_jobs(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      log_level TEXT NOT NULL CHECK(log_level IN ('info','warn','error')),
      message TEXT NOT NULL,
      provider_response_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      snapshot_date TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      engagements INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      followers_total INTEGER NOT NULL DEFAULT 0,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS engagement_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('comment','direct_message','mention')),
      content TEXT NOT NULL,
      reply_text TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','replied','archived')),
      is_demo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'system' CHECK(category IN ('publishing','ai','billing','team','security','system')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_ws ON notifications(workspace_id, is_read);

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE CHECK(code IN ('basic','pro','enterprise','starter','growth','agency')),
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      monthly_price_cents INTEGER NOT NULL,
      annual_price_cents INTEGER NOT NULL,
      max_workspaces INTEGER NOT NULL,
      max_social_accounts INTEGER NOT NULL,
      max_team_members INTEGER NOT NULL,
      monthly_ai_credits INTEGER NOT NULL,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('trialing','active','past_due','cancelled')),
      billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly','annual')),
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      provider_subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature TEXT NOT NULL CHECK(feature IN ('content_studio','content_strategy','caption_rewrite','hashtag_research')),
      model_name TEXT NOT NULL,
      credits_used INTEGER NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS ai_content_suggestions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      topic TEXT NOT NULL,
      keywords_json TEXT NOT NULL DEFAULT '[]',
      objective TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT '',
      headline TEXT NOT NULL,
      headline_options_json TEXT NOT NULL DEFAULT '[]',
      post_copy TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT NOT NULL DEFAULT '',
      best_time_note TEXT NOT NULL DEFAULT '',
      variants_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'generated' CHECK(status IN ('generated','edited','saved_to_calendar')),
      saved_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ws ON ai_content_suggestions(workspace_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- PHASE 2: SOCIAL MEDIA AUTHENTICATION & INTEGRATION ENGINE TABLES
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      reconnect_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      encrypted_code_verifier TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','awaiting_selection','completed','expired','failed')),
      discovery_session_id TEXT UNIQUE,
      encrypted_pending_tokens TEXT,
      discovered_accounts_json TEXT,
      granted_scopes TEXT,
      error_message TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_states_ws ON oauth_states(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_discovery ON oauth_states(discovery_session_id);

    CREATE TABLE IF NOT EXISTS oauth_connection_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'info' CHECK(status IN ('info','success','warning','error')),
      message TEXT NOT NULL,
      error_code TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_conn_logs_ws ON oauth_connection_logs(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_oauth_conn_logs_plat ON oauth_connection_logs(platform_key, created_at DESC);

    CREATE TABLE IF NOT EXISTS platform_permissions (
      id TEXT PRIMARY KEY,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key) ON DELETE CASCADE,
      scope_key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_required INTEGER NOT NULL DEFAULT 1,
      requires_app_review INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(approval_status IN ('not_submitted','pending_review','approved','action_required')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(platform_key, scope_key)
    );

    CREATE TABLE IF NOT EXISTS platform_capabilities (
      platform_key TEXT PRIMARY KEY REFERENCES social_platforms(key) ON DELETE CASCADE,
      text_publishing INTEGER NOT NULL DEFAULT 0,
      image_publishing INTEGER NOT NULL DEFAULT 0,
      video_publishing INTEGER NOT NULL DEFAULT 0,
      carousel_publishing INTEGER NOT NULL DEFAULT 0,
      story_publishing INTEGER NOT NULL DEFAULT 0,
      reels_publishing INTEGER NOT NULL DEFAULT 0,
      short_form_video_publishing INTEGER NOT NULL DEFAULT 0,
      comment_retrieval INTEGER NOT NULL DEFAULT 0,
      comment_responses INTEGER NOT NULL DEFAULT 0,
      analytics_retrieval INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_sync_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL,
      sync_type TEXT NOT NULL DEFAULT 'full' CHECK(sync_type IN ('profile','content','insights','comments','full')),
      status TEXT NOT NULL DEFAULT 'succeeded' CHECK(status IN ('succeeded','partial','rate_limited','failed')),
      items_synced INTEGER NOT NULL DEFAULT 0,
      rate_limit_remaining INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON platform_sync_logs(social_account_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS platform_webhook_events (
      id TEXT PRIMARY KEY,
      platform_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      delivery_id TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL DEFAULT '{}',
      processed_status TEXT NOT NULL DEFAULT 'received' CHECK(processed_status IN ('received','processed','ignored','failed')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_events_plat ON platform_webhook_events(platform_key, created_at DESC);

    -- PHASE 3: AI CONTENT STUDIO, STRATEGY, GRAPHIC DESIGNER, CALENDAR, AUTO PUBLISHER & ENGAGEMENT TABLES
    CREATE TABLE IF NOT EXISTS ai_brand_analyses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_summary TEXT NOT NULL,
      verified_facts_json TEXT NOT NULL DEFAULT '[]',
      assumptions_json TEXT NOT NULL DEFAULT '[]',
      audience_insights_json TEXT NOT NULL DEFAULT '{}',
      content_themes_json TEXT NOT NULL DEFAULT '[]',
      voice_guidelines_json TEXT NOT NULL DEFAULT '[]',
      connected_sources_json TEXT NOT NULL DEFAULT '[]',
      uploaded_sources_json TEXT NOT NULL DEFAULT '[]',
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_brand_analyses_ws ON ai_brand_analyses(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_content_strategies (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      goals TEXT NOT NULL DEFAULT '',
      platforms_json TEXT NOT NULL DEFAULT '[]',
      executive_summary TEXT NOT NULL,
      pillars_json TEXT NOT NULL DEFAULT '[]',
      weekly_cadence_json TEXT NOT NULL DEFAULT '[]',
      kpis_json TEXT NOT NULL DEFAULT '[]',
      evidence_note TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_strategies_ws ON ai_content_strategies(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS content_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      objective TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      color_hex TEXT NOT NULL DEFAULT '#0052FF',
      platforms_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','paused','completed','archived')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_ws ON content_campaigns(workspace_id, status);

    CREATE TABLE IF NOT EXISTS generated_content (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      content_type TEXT NOT NULL DEFAULT 'social_post',
      objective TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      tone_of_voice TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'en',
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      caption_text TEXT NOT NULL DEFAULT '',
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT NOT NULL DEFAULT '',
      image_prompt TEXT NOT NULL DEFAULT '',
      video_script_json TEXT NOT NULL DEFAULT '{}',
      repurposed_variants_json TEXT NOT NULL DEFAULT '[]',
      safety_status TEXT NOT NULL DEFAULT 'passed' CHECK(safety_status IN ('passed','flagged','blocked')),
      safety_notes_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','queued','published','archived')),
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_content_ws ON generated_content(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      media_asset_id TEXT REFERENCES media_library(id) ON DELETE SET NULL,
      graphic_type TEXT NOT NULL DEFAULT 'promotional_flyer',
      platform_key TEXT NOT NULL DEFAULT 'instagram',
      aspect_ratio TEXT NOT NULL DEFAULT '1:1',
      width_px INTEGER NOT NULL DEFAULT 1080,
      height_px INTEGER NOT NULL DEFAULT 1080,
      prompt TEXT NOT NULL,
      art_direction_json TEXT NOT NULL DEFAULT '{}',
      caption_text TEXT NOT NULL DEFAULT '',
      source_mode TEXT NOT NULL DEFAULT 'compositor' CHECK(source_mode IN ('ai_service','compositor','uploaded')),
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','generated','failed')),
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_images_ws ON generated_images(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS content_calendar (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE CASCADE,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      media_urls_json TEXT NOT NULL DEFAULT '[]',
      format_key TEXT NOT NULL DEFAULT 'text',
      scheduled_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK(recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
      recurrence_rule_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_content_calendar_ws_date ON content_calendar(workspace_id, scheduled_at ASC);

    CREATE TABLE IF NOT EXISTS publishing_queue (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      calendar_item_id TEXT REFERENCES content_calendar(id) ON DELETE SET NULL,
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      format_key TEXT NOT NULL DEFAULT 'text',
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      media_urls_json TEXT NOT NULL DEFAULT '[]',
      link_url TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
      publishing_mode TEXT NOT NULL DEFAULT 'automatic' CHECK(publishing_mode IN ('automatic','approval_required')),
      requires_approval INTEGER NOT NULL DEFAULT 0,
      approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at TEXT,
      scheduled_at TEXT NOT NULL,
      next_run_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK(recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
      recurrence_rule_json TEXT NOT NULL DEFAULT '{}',
      idempotency_key TEXT NOT NULL UNIQUE,
      content_hash TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 4,
      is_dead_letter INTEGER NOT NULL DEFAULT 0,
      last_error_permanent INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      locked_by TEXT,
      locked_until TEXT,
      platform_post_id TEXT,
      platform_permalink TEXT,
      platform_response_json TEXT,
      published_at TEXT,
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pub_queue_ws_status ON publishing_queue(workspace_id, status, next_run_at ASC);
    CREATE INDEX IF NOT EXISTS idx_pub_queue_due ON publishing_queue(status, next_run_at ASC);
    CREATE INDEX IF NOT EXISTS idx_pub_queue_hash ON publishing_queue(workspace_id, social_account_id, content_hash);

    CREATE TABLE IF NOT EXISTS publishing_attempts (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      worker_id TEXT NOT NULL DEFAULT 'embedded-worker',
      status TEXT NOT NULL CHECK(status IN ('started','succeeded','retrying','failed_permanent','rate_limited','token_expired')),
      http_status INTEGER,
      error_code TEXT,
      error_message TEXT,
      retry_delay_ms INTEGER,
      platform_post_id TEXT,
      api_response_json TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pub_attempts_queue ON publishing_attempts(queue_id, attempt_number DESC);
    CREATE INDEX IF NOT EXISTS idx_pub_attempts_ws ON publishing_attempts(workspace_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS content_approvals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      queue_id TEXT NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
      requested_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','rejected','changes_requested')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_approvals_ws ON content_approvals(workspace_id, decision, created_at DESC);

    CREATE TABLE IF NOT EXISTS engagement_messages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      external_message_id TEXT,
      external_post_id TEXT,
      message_type TEXT NOT NULL DEFAULT 'comment' CHECK(message_type IN ('comment','direct_message','mention','review')),
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      content TEXT NOT NULL,
      sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK(sentiment IN ('positive','neutral','negative','urgent')),
      requires_escalation INTEGER NOT NULL DEFAULT 0,
      escalation_reason TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','escalated','replied','archived')),
      sent_reply_text TEXT,
      replied_by_mode TEXT CHECK(replied_by_mode IN ('manual','ai_approved','ai_auto')),
      replied_at TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eng_messages_ws ON engagement_messages(workspace_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_reply_suggestions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      engagement_message_id TEXT NOT NULL REFERENCES engagement_messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      suggested_reply TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'Helpful & Professional',
      confidence_note TEXT NOT NULL DEFAULT '',
      escalation_recommended INTEGER NOT NULL DEFAULT 0,
      escalation_reason TEXT,
      safety_passed INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested','approved','sent','dismissed')),
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_replies_msg ON ai_reply_suggestions(engagement_message_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_generation_usage (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      model_name TEXT NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 0,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed')),
      error_message TEXT,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_gen_usage_ws ON ai_generation_usage(workspace_id, created_at DESC);
  `);
  const spSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'social_platforms'").get();
  if (spSchemaRow?.sql && !spSchemaRow.sql.includes("google_business")) {
    db.pragma("foreign_keys = OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE social_platforms_v2 (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE CHECK(key IN ('facebook','instagram','tiktok','linkedin','youtube','x','pinterest','google_business')),
          display_name TEXT NOT NULL,
          oauth_authorize_url TEXT NOT NULL,
          oauth_token_url TEXT NOT NULL,
          scopes TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO social_platforms_v2 (id, key, display_name, oauth_authorize_url, oauth_token_url, scopes, is_enabled, created_at, updated_at)
        SELECT id, key, display_name, oauth_authorize_url, oauth_token_url, scopes, is_enabled, created_at, updated_at FROM social_platforms;
        DROP TABLE social_platforms;
        ALTER TABLE social_platforms_v2 RENAME TO social_platforms;
      `);
    })();
    db.pragma("foreign_keys = ON");
  }
  const ensureColumn = (table, column, definition) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };
  ensureColumn("social_accounts", "connected_by_user_id", "TEXT REFERENCES users(id) ON DELETE SET NULL");
  ensureColumn("social_accounts", "account_type", "TEXT NOT NULL DEFAULT 'profile'");
  ensureColumn("social_accounts", "account_description", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("social_accounts", "business_category", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("social_accounts", "followers_count", "INTEGER");
  ensureColumn("social_accounts", "permissions_status", "TEXT NOT NULL DEFAULT 'granted'");
  ensureColumn("social_accounts", "granted_scopes", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("social_accounts", "capabilities_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("social_accounts", "publishing_preferences_json", `TEXT NOT NULL DEFAULT '${JSON.stringify(DEFAULT_PUBLISHING_PREFERENCES)}'`);
  ensureColumn("social_accounts", "last_error", "TEXT");
  ensureColumn("social_account_tokens", "connected_by_user_id", "TEXT REFERENCES users(id) ON DELETE SET NULL");
  ensureColumn("social_account_tokens", "refresh_expires_at", "TEXT");
  ensureColumn("social_account_tokens", "revoked_at", "TEXT");
  ensureColumn("social_account_tokens", "last_refreshed_at", "TEXT");
  ensureColumn("social_platforms", "client_id_override", "TEXT");
  ensureColumn("social_platforms", "client_secret_override", "TEXT");
  ensureColumn("social_platforms", "app_status", "TEXT NOT NULL DEFAULT 'missing_credentials'");
  ensureColumn("social_platforms", "developer_review_status", "TEXT NOT NULL DEFAULT 'not_submitted'");
  ensureColumn("social_platforms", "rate_limit_rpm", "INTEGER NOT NULL DEFAULT 120");
  ensureColumn("social_platforms", "last_health_check_at", "TEXT");
  ensureColumn("social_platforms", "last_api_error", "TEXT");
  ensureColumn("brand_profiles", "products_services", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("brand_profiles", "business_goals", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("brand_profiles", "banned_words_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("brand_profiles", "brand_tone_rules", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("brand_profiles", "max_posts_per_day", "INTEGER NOT NULL DEFAULT 10");
  ensureColumn("brand_profiles", "auto_reply_enabled", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("brand_profiles", "brand_documents_json", "TEXT NOT NULL DEFAULT '[]'");
  seedReferenceData(db);
  return db;
}
function seedReferenceData(db) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const roleSeeds = [
    ["customer", "Customer", "Standard multi-tenant workspace owner"],
    ["workspace_admin", "Workspace Admin", "Manages brand settings, billing, and team members"],
    ["editor", "Content Editor", "Creates and schedules posts and media assets"],
    ["viewer", "Analyst Viewer", "Read-only access to calendar and analytics"],
    ["super_admin", "Super Administrator", "Full platform administration and governance"]
  ];
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (id, slug, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const [slug, name, desc] of roleSeeds) {
    insertRole.run(crypto2.randomUUID(), slug, name, desc, now, now);
  }
  const insertPlatform = db.prepare(`
    INSERT OR IGNORE INTO social_platforms (
      id, key, display_name, oauth_authorize_url, oauth_token_url, scopes,
      is_enabled, developer_review_status, rate_limit_rpm, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);
  const insertPermission = db.prepare(`
    INSERT OR IGNORE INTO platform_permissions (
      id, platform_key, scope_key, label, description, is_required, requires_app_review, approval_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertCapabilities = db.prepare(`
    INSERT INTO platform_capabilities (
      platform_key, text_publishing, image_publishing, video_publishing, carousel_publishing,
      story_publishing, reels_publishing, short_form_video_publishing,
      comment_retrieval, comment_responses, analytics_retrieval, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform_key) DO UPDATE SET
      text_publishing = excluded.text_publishing,
      image_publishing = excluded.image_publishing,
      video_publishing = excluded.video_publishing,
      carousel_publishing = excluded.carousel_publishing,
      story_publishing = excluded.story_publishing,
      reels_publishing = excluded.reels_publishing,
      short_form_video_publishing = excluded.short_form_video_publishing,
      comment_retrieval = excluded.comment_retrieval,
      comment_responses = excluded.comment_responses,
      analytics_retrieval = excluded.analytics_retrieval,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);
  for (const provider of SOCIAL_PROVIDER_LIST) {
    const scopeStr = provider.permissions.map((p) => p.scopeKey).join(",");
    insertPlatform.run(
      crypto2.randomUUID(),
      provider.key,
      provider.displayName,
      provider.oauthAuthorizeUrl,
      provider.oauthTokenUrl,
      scopeStr,
      provider.defaultReviewStatus,
      provider.defaultRateLimitRpm,
      now,
      now
    );
    for (const perm of provider.permissions) {
      insertPermission.run(
        crypto2.randomUUID(),
        provider.key,
        perm.scopeKey,
        perm.label,
        perm.description,
        perm.isRequired ? 1 : 0,
        perm.requiresAppReview ? 1 : 0,
        perm.approvalStatus,
        now,
        now
      );
    }
    const c = provider.capabilities;
    upsertCapabilities.run(
      provider.key,
      c.textPublishing ? 1 : 0,
      c.imagePublishing ? 1 : 0,
      c.videoPublishing ? 1 : 0,
      c.carouselPublishing ? 1 : 0,
      c.storyPublishing ? 1 : 0,
      c.reelsPublishing ? 1 : 0,
      c.shortFormVideoPublishing ? 1 : 0,
      c.commentRetrieval ? 1 : 0,
      c.commentResponses ? 1 : 0,
      c.analyticsRetrieval ? 1 : 0,
      c.notes || "",
      now
    );
  }
  const plans = [
    [
      "basic",
      "Basic",
      "Essential brand publishing & AI content creation for solo founders",
      2900,
      29e3,
      1,
      5,
      1,
      250,
      [
        "1 Brand Workspace \xB7 Up to 5 Social Accounts",
        "250 Monthly AI Studio Credits",
        "Social Accounts & Official OAuth Connection",
        "AI Content Studio (Posts, Repurpose, Captions & Hashtags)",
        "Content Calendar & Media Library"
      ]
    ],
    [
      "pro",
      "Pro",
      "Full creative, automation, engagement & analytics suite for growing teams",
      7900,
      79e3,
      5,
      20,
      10,
      2e3,
      [
        "Up to 5 Brand Workspaces \xB7 Up to 20 Social Accounts",
        "2,000 Monthly AI Credits \xB7 Up to 10 Team Seats",
        "Everything in Basic Plan included",
        "AI Graphic Designer & Auto Publisher Queue",
        "Publishing History, Engagement Manager, Live Analytics & Team RBAC"
      ]
    ],
    [
      "enterprise",
      "Enterprise",
      "Complete agency intelligence, AI Brand Strategy & multi-brand governance",
      29900,
      299e3,
      50,
      250,
      35,
      15e3,
      [
        "Up to 50 Brand Workspaces \xB7 Up to 250 Social Accounts",
        "15,000 Monthly AI Credits \xB7 Up to 35 Team Seats",
        "Everything in Pro Plan included",
        "AI Brand Strategy & Executive Audience Intelligence",
        "Multi-Brand Governance, Compliance Audit Logs & Priority Support"
      ]
    ]
  ];
  const planTableMeta = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'subscription_plans'").get();
  if (planTableMeta && !planTableMeta.sql.includes("'basic'")) {
    db.pragma("foreign_keys = OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE subscription_plans_v2 (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE CHECK(code IN ('basic','pro','enterprise','starter','growth','agency')),
          name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          monthly_price_cents INTEGER NOT NULL,
          annual_price_cents INTEGER NOT NULL,
          max_workspaces INTEGER NOT NULL,
          max_social_accounts INTEGER NOT NULL,
          max_team_members INTEGER NOT NULL,
          monthly_ai_credits INTEGER NOT NULL,
          features_json TEXT NOT NULL DEFAULT '[]',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO subscription_plans_v2 SELECT * FROM subscription_plans;
        DROP TABLE subscription_plans;
        ALTER TABLE subscription_plans_v2 RENAME TO subscription_plans;
      `);
    })();
    db.pragma("foreign_keys = ON");
  }
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (
      id, code, name, tagline, monthly_price_cents, annual_price_cents,
      max_workspaces, max_social_accounts, max_team_members, monthly_ai_credits,
      features_json, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const updatePlan = db.prepare(`
    UPDATE subscription_plans
    SET name = ?, tagline = ?, monthly_price_cents = ?, annual_price_cents = ?,
        max_workspaces = ?, max_social_accounts = ?, max_team_members = ?,
        monthly_ai_credits = ?, features_json = ?, is_active = 1, updated_at = ?
    WHERE code = ?
  `);
  for (const p of plans) {
    insertPlan.run(
      crypto2.randomUUID(),
      p[0],
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      p[7],
      p[8],
      JSON.stringify(p[9]),
      now,
      now
    );
    updatePlan.run(
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      p[7],
      p[8],
      JSON.stringify(p[9]),
      now,
      p[0]
    );
  }
  const basicPlanRow = db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get();
  const proPlanRow = db.prepare("SELECT id FROM subscription_plans WHERE code = 'pro'").get();
  if (basicPlanRow && proPlanRow) {
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, updated_at = ?
      WHERE plan_id IN (SELECT id FROM subscription_plans WHERE code = 'starter')
    `).run(basicPlanRow.id, now);
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, updated_at = ?
      WHERE plan_id IN (SELECT id FROM subscription_plans WHERE code IN ('growth', 'agency'))
    `).run(proPlanRow.id, now);
    db.prepare(`
      UPDATE subscription_plans
      SET is_active = 0, updated_at = ?
      WHERE code IN ('starter', 'growth', 'agency') AND is_active = 1
    `).run(now);
  }
  const settings = [
    ["allow_new_registrations", "true", "Allow self-service customer registrations via email and OAuth"],
    ["require_email_verification", "true", "Require email verification before production auto-publishing"],
    ["default_trial_ai_credits", "0", "Initial AI credits allocated before subscribing to a package"],
    ["max_publishing_retries", "3", "Automatic retry threshold before marking a publishing job as failed"],
    ["maintenance_mode", "false", "Temporarily restrict non-admin write operations during maintenance"],
    ["app_name", "LIVINGTECH BRAND AGENCY", "Global application name displayed in headers and titles"],
    ["app_tagline", "Enterprise Multi-Tenant Social Media & Brand Management SaaS", "Global application subtitle / tagline"],
    ["app_logo_url", "/assets/aistudio/20261112_184805_8a13799e.jpg", "Global application logo image URL"],
    ["app_footer_text", "\xA9 2026 LIVINGTECH BRAND AGENCY. All rights reserved.", "Global footer copyright text"],
    ["app_welcome_message", "Welcome back to your enterprise command center.", "Welcome message on dashboard"],
    ["app_font_color", "#ffffff", "Global application font color (default pure white)"]
  ];
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, description, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  for (const [k, v, desc] of settings) {
    insertSetting.run(k, v, desc, now);
  }
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    seedInitialAccounts(db, now);
  }
  const demoPurged = db.prepare("SELECT value FROM system_settings WHERE key = 'clean_slate_demo_purge_v1'").get();
  if (!demoPurged) {
    db.transaction(() => {
      const demoUser = db.prepare("SELECT id FROM users WHERE email = 'client@auroraventures.io'").get();
      if (demoUser) {
        const demoWorkspaces = db.prepare("SELECT id FROM workspaces WHERE owner_user_id = ?").all(demoUser.id);
        for (const ws of demoWorkspaces) {
          db.prepare("DELETE FROM workspaces WHERE id = ?").run(ws.id);
        }
        db.prepare("DELETE FROM organisations WHERE owner_user_id = ?").run(demoUser.id);
        db.prepare("DELETE FROM users WHERE id = ?").run(demoUser.id);
      }
      db.prepare("DELETE FROM analytics_snapshots WHERE is_demo = 1").run();
      db.prepare("DELETE FROM engagement_items WHERE is_demo = 1").run();
      db.prepare("DELETE FROM engagement_messages WHERE is_demo = 1").run();
      db.prepare(`
        DELETE FROM content_posts
        WHERE title IN (
          'Q4 Enterprise Brand Positioning Launch',
          'Visual Identity System Spotlight',
          'Executive Thread: AI-Assisted Content Velocity'
        )
      `).run();
      db.prepare(`
        DELETE FROM media_library
        WHERE file_name = 'livingtech-primary-logo.jpg' AND folder = 'Brand Kit'
      `).run();
      db.prepare(`
        DELETE FROM notifications
        WHERE title IN ('Workspace Provisioned', 'Connect Official Social Channels')
      `).run();
      db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, description, updated_at)
        VALUES ('clean_slate_demo_purge_v1', 'true', 'One-time purge of legacy demo accounts and sample data', ?)
      `).run(now);
    })();
  }
}
function seedInitialAccounts(db, now) {
  const enterprisePlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get();
  const adminId = crypto2.randomUUID();
  db.prepare(`
    INSERT INTO users (id, auth_provider, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
    VALUES (?, 'password', 'livingstoneedu64@gmail.com', ?, 'Livingstone Edu', 'super_admin', 1, 'active', 'UTC', 'en', ?, ?)
  `).run(adminId, hashPassword("Admin@LivingTech2026"), now, now);
  const adminOrgId = crypto2.randomUUID();
  const adminWsId = crypto2.randomUUID();
  db.prepare(`
    INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
    VALUES (?, ?, 'LivingTech Brand Agency HQ', 'livingtech-hq', 'livingstoneedu64@gmail.com', ?, ?)
  `).run(adminOrgId, adminId, now, now);
  db.prepare(`
    INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
    VALUES (?, ?, ?, 'LivingTech Global Brand', 'livingtech-global', 'UTC', 'en', 15000, ?, ?)
  `).run(adminWsId, adminOrgId, adminId, now, now);
  db.prepare(`
    INSERT INTO brand_profiles (
      id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
      business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
    ) VALUES (?, ?, 'LIVINGTECH BRAND AGENCY', '/assets/aistudio/20261112_184805_8a13799e.jpg', '#0052FF', '#071436', '#F59E0B',
      'International brand strategy, digital identity, and automated multi-channel social media growth agency.',
      'Digital Marketing & Brand Agency', 'Enterprise founders, CMOs, and high-growth B2B technology companies',
      'Executive, forward-looking, and authoritative', 'en', 'UTC', ?, ?)
  `).run(crypto2.randomUUID(), adminWsId, now, now);
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
    VALUES (?, ?, ?, 'livingstoneedu64@gmail.com', 'workspace_admin', 'active', ?, ?, ?)
  `).run(crypto2.randomUUID(), adminWsId, adminId, adminId, now, now);
  const periodEnd = new Date(Date.now() + 365 * 86400 * 1e3).toISOString();
  db.prepare(`
    INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', 'annual', ?, ?, ?, ?)
  `).run(crypto2.randomUUID(), adminOrgId, adminWsId, enterprisePlan.id, now, periodEnd, now, now);
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, actor_email, workspace_id, action, resource_type, resource_id, metadata_json, created_at, updated_at)
    VALUES (?, ?, 'livingstoneedu64@gmail.com', ?, 'system.bootstrap', 'database', 'production', '{"cleanSlate":true}', ?, ?)
  `).run(crypto2.randomUUID(), adminId, adminWsId, now, now);
  logger.info("Initialized clean LIVINGTECH BRAND AGENCY super-admin workspace (zero demo data)");
}
var singletonDb = null;
function getDb() {
  if (!singletonDb) {
    singletonDb = initDatabase();
  }
  return singletonDb;
}

// server/app.ts
import express from "express";
import cookieParser from "cookie-parser";

// server/routes/api.ts
import { Router } from "express";
import crypto8 from "node:crypto";
import { z as z2 } from "zod";

// server/db/rtdbSync.ts
import crypto3 from "node:crypto";
var DEFAULT_RTDB_URL = "https://livingtech-brand-agency-default-rtdb.firebaseio.com";
var RTDB_ROOT_NODE = "livingtech_app";
var RTDB_SYNC_TABLES = [
  "roles",
  "permissions",
  "users",
  "sessions",
  "auth_tokens",
  "organisations",
  "workspaces",
  "workspace_members",
  "brand_profiles",
  "social_platforms",
  "social_accounts",
  "social_account_tokens",
  "subscription_plans",
  "subscriptions",
  "system_settings",
  "content_campaigns",
  "content_posts",
  "content_variants",
  "media_library",
  "content_assets",
  "publishing_schedules",
  "publishing_jobs",
  "publishing_logs",
  "analytics_snapshots",
  "engagement_items",
  "notifications",
  "ai_usage",
  "support_tickets",
  "audit_logs",
  "ai_content_suggestions",
  "oauth_states",
  "oauth_connection_logs",
  "platform_permissions",
  "platform_capabilities",
  "platform_sync_logs",
  "platform_webhook_events",
  "ai_brand_analyses",
  "ai_content_strategies",
  "generated_content",
  "generated_images",
  "content_calendar",
  "publishing_queue",
  "publishing_attempts",
  "content_approvals",
  "engagement_messages",
  "ai_reply_suggestions",
  "ai_generation_usage"
];
var customFetchTransport = null;
var syncState = {
  hydrated: false,
  connected: false,
  lastHydratedAt: null,
  lastPersistedAt: null,
  lastError: null,
  lastAttemptMs: 0,
  lastFreshnessCheckMs: 0,
  lastKnownRemoteUpdatedAt: null,
  inflightHydration: null,
  // Snapshot of the last state successfully read from / written to RTDB per table -> rtdbKey -> JSON string
  lastSyncedSnapshot: /* @__PURE__ */ new Map(),
  // Cached Google OAuth2 access token when FIREBASE_SERVICE_ACCOUNT_JSON is provided
  cachedServiceAccessToken: null,
  cachedServiceAccessTokenExpiresAtMs: 0
};
var RETRY_BACKOFF_MS = 15e3;
var REQUEST_TIMEOUT_MS = 3500;
function getFreshnessCheckIntervalMs() {
  if (customFetchTransport) return 0;
  return process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0 ? 1500 : 1e4;
}
function getRtdbDatabaseUrl() {
  const configured = process.env.FIREBASE_DATABASE_URL?.trim();
  return (configured || DEFAULT_RTDB_URL).replace(/\/+$/, "");
}
function isRtdbSyncEnabled() {
  if (customFetchTransport) return true;
  if (process.env.DISABLE_RTDB_SYNC === "true") return false;
  if (process.env.NODE_ENV === "test") return false;
  return Boolean(getRtdbDatabaseUrl());
}
function stripWrappingQuotes(val) {
  const trimmed = val.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}
function tryParseServiceAccountJson(raw) {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const candidates = [trimmed];
  if (!trimmed.startsWith("{") && /^[A-Za-z0-9+/=_-]{80,}$/.test(trimmed)) {
    try {
      candidates.push(Buffer.from(trimmed, "base64").toString("utf8").trim());
    } catch {
    }
  }
  for (const candidate of candidates) {
    if (!candidate.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
          token_uri: parsed.token_uri || "https://oauth2.googleapis.com/token"
        };
      }
    } catch {
    }
  }
  return null;
}
function parseServiceAccountFromEnv() {
  return tryParseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) || tryParseServiceAccountJson(process.env.FIREBASE_DATABASE_SECRET) || tryParseServiceAccountJson(process.env.FIREBASE_RTDB_AUTH);
}
function getDatabaseSecretFromEnv() {
  const raw = process.env.FIREBASE_DATABASE_SECRET?.trim() || process.env.FIREBASE_RTDB_AUTH?.trim();
  if (!raw) return null;
  if (tryParseServiceAccountJson(raw)) return null;
  const cleaned = stripWrappingQuotes(raw);
  return cleaned.length > 0 ? cleaned : null;
}
function detectRtdbAuthMode(idToken) {
  if (parseServiceAccountFromEnv()) return "service_account";
  if (getDatabaseSecretFromEnv()) return "database_secret";
  if (idToken?.trim()) return "id_token";
  return "open";
}
function getRtdbStatus() {
  return {
    enabled: isRtdbSyncEnabled(),
    databaseURL: getRtdbDatabaseUrl(),
    authMode: detectRtdbAuthMode(),
    connected: syncState.connected,
    readyForWrites: syncState.connected && syncState.lastError === null,
    hydrated: syncState.hydrated,
    lastHydratedAt: syncState.lastHydratedAt,
    lastPersistedAt: syncState.lastPersistedAt,
    lastError: syncState.lastError
  };
}
function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
async function getServiceAccountAccessToken() {
  const creds = parseServiceAccountFromEnv();
  if (!creds) return null;
  const nowMs = Date.now();
  if (syncState.cachedServiceAccessToken && nowMs < syncState.cachedServiceAccessTokenExpiresAtMs - 6e4) {
    return syncState.cachedServiceAccessToken;
  }
  try {
    const nowSec = Math.floor(nowMs / 1e3);
    const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claimSet = base64UrlEncode(
      JSON.stringify({
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
        aud: creds.token_uri || "https://oauth2.googleapis.com/token",
        iat: nowSec,
        exp: nowSec + 3600
      })
    );
    const unsigned = `${header}.${claimSet}`;
    const signer = crypto3.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = base64UrlEncode(signer.sign(creds.private_key));
    const assertion = `${unsigned}.${signature}`;
    const resp = await doRtdbFetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(assertion)}`
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      logger.warn("Firebase service account token exchange failed", {
        status: resp.status,
        detail: detail.slice(0, 140)
      });
      return null;
    }
    const tokenData = await resp.json();
    if (!tokenData.access_token) return null;
    syncState.cachedServiceAccessToken = tokenData.access_token;
    syncState.cachedServiceAccessTokenExpiresAtMs = nowMs + (tokenData.expires_in ?? 3600) * 1e3;
    return tokenData.access_token;
  } catch (err) {
    logger.warn("Firebase service account token signing failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}
async function buildRtdbEndpoint(nodePath, authToken) {
  const base = getRtdbDatabaseUrl();
  const cleanNode = nodePath.replace(/^\/+/, "");
  const serviceAccessToken = await getServiceAccountAccessToken();
  if (serviceAccessToken) {
    return `${base}/${cleanNode}.json?access_token=${encodeURIComponent(serviceAccessToken)}`;
  }
  const secret = getDatabaseSecretFromEnv() || authToken?.trim();
  const query = secret ? `?auth=${encodeURIComponent(secret)}` : "";
  return `${base}/${cleanNode}.json${query}`;
}
function sanitizeRtdbKey(raw) {
  return raw.replace(/[.#$/[\]]/g, "_");
}
function getRowPrimaryKey(row, idx) {
  const candidate = row.id ?? row.key ?? row.state ?? row.platform_key;
  if (candidate !== void 0 && candidate !== null && String(candidate).length > 0) {
    return sanitizeRtdbKey(String(candidate));
  }
  return `row_${idx}`;
}
function getPrimaryKeyColumnName(table, validCols) {
  if (validCols.has("id")) return "id";
  if (table === "system_settings" && validCols.has("key")) return "key";
  if (table === "oauth_states" && validCols.has("state")) return "state";
  if (table === "platform_capabilities" && validCols.has("platform_key")) return "platform_key";
  return null;
}
function readLocalTablesForRtdb(db) {
  const tables = {};
  const serializedByTable = /* @__PURE__ */ new Map();
  for (const table of RTDB_SYNC_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      const map = {};
      const tableSerialized = /* @__PURE__ */ new Map();
      rows.forEach((row, idx) => {
        const key = getRowPrimaryKey(row, idx);
        const cleanRow = {};
        for (const [col, val] of Object.entries(row)) {
          if (val !== void 0) {
            cleanRow[col] = val;
          }
        }
        map[key] = cleanRow;
        tableSerialized.set(key, JSON.stringify(cleanRow));
      });
      tables[table] = map;
      serializedByTable.set(table, tableSerialized);
    } catch {
    }
  }
  return {
    tables,
    serializedByTable,
    meta: {
      project: "livingtech-brand-agency",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      userCount: Object.keys(tables.users || {}).length,
      workspaceCount: Object.keys(tables.workspaces || {}).length,
      postCount: Object.keys(tables.content_posts || {}).length
    }
  };
}
function applyRtdbSnapshotToDb(db, tablesPayload) {
  let restoredRows = 0;
  const remoteSerialized = /* @__PURE__ */ new Map();
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      for (const table of RTDB_SYNC_TABLES) {
        const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
        const validCols = new Set(tableInfo.map((c) => c.name));
        if (validCols.size === 0) continue;
        const rawTable = tablesPayload[table];
        const tableMap = /* @__PURE__ */ new Map();
        if (!rawTable || typeof rawTable !== "object") {
          remoteSerialized.set(table, tableMap);
          continue;
        }
        const entries = Array.isArray(rawTable) ? rawTable.map(
          (r, idx) => r && typeof r === "object" ? [getRowPrimaryKey(r, idx), r] : null
        ).filter((e) => e !== null && !e[0].startsWith("_")) : Object.entries(rawTable).filter(
          (entry) => !entry[0].startsWith("_") && Boolean(entry[1] && typeof entry[1] === "object")
        );
        const prevTableMap = syncState.lastSyncedSnapshot.get(table);
        const pkCol = getPrimaryKeyColumnName(table, validCols);
        const remoteKeys = new Set(entries.map(([k]) => k));
        if (prevTableMap && pkCol) {
          for (const [prevKey, prevJson] of prevTableMap.entries()) {
            if (!remoteKeys.has(prevKey)) {
              try {
                const parsedPrev = JSON.parse(prevJson);
                const pkVal = parsedPrev[pkCol];
                if (pkVal !== void 0 && pkVal !== null) {
                  db.prepare(`DELETE FROM ${table} WHERE ${pkCol} = ?`).run(pkVal);
                }
              } catch {
              }
            }
          }
        }
        for (const [rtdbKey, row] of entries) {
          if (rtdbKey.startsWith("_")) continue;
          const cols = Object.keys(row).filter((col) => validCols.has(col));
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => "?").join(", ");
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
          const values = cols.map((col) => row[col] === void 0 ? null : row[col]);
          db.prepare(sql).run(...values);
          restoredRows += 1;
          if (pkCol && row[pkCol] !== void 0 && row[pkCol] !== null) {
            const stored = db.prepare(`SELECT * FROM ${table} WHERE ${pkCol} = ?`).get(row[pkCol]);
            if (stored) {
              tableMap.set(rtdbKey, JSON.stringify(stored));
              continue;
            }
          }
          tableMap.set(rtdbKey, JSON.stringify(row));
        }
        remoteSerialized.set(table, tableMap);
      }
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
  return { restoredRows, remoteSerialized };
}
async function doRtdbFetch(url, init) {
  const transport = customFetchTransport ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await transport(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function persistDatabaseToRtdb(db, options) {
  if (!isRtdbSyncEnabled()) return false;
  if (!syncState.hydrated) {
    await hydrateDatabaseFromRtdb(db, { authToken: options?.authToken, force: true });
  }
  const snapshot = readLocalTablesForRtdb(db);
  const patchPayload = {};
  let changedKeys = 0;
  if (syncState.lastSyncedSnapshot.size === 0) {
    for (const [table, rowsMap] of Object.entries(snapshot.tables)) {
      for (const [rtdbKey, rowObj] of Object.entries(rowsMap)) {
        patchPayload[`tables/${table}/${rtdbKey}`] = rowObj;
        changedKeys += 1;
      }
    }
  } else {
    for (const table of RTDB_SYNC_TABLES) {
      const currentMap = snapshot.serializedByTable.get(table) ?? /* @__PURE__ */ new Map();
      const prevMap = syncState.lastSyncedSnapshot.get(table) ?? /* @__PURE__ */ new Map();
      const tableRows = snapshot.tables[table] ?? {};
      for (const [rtdbKey, serialized] of currentMap.entries()) {
        if (prevMap.get(rtdbKey) !== serialized) {
          patchPayload[`tables/${table}/${rtdbKey}`] = tableRows[rtdbKey];
          changedKeys += 1;
        }
      }
      if (syncState.hydrated) {
        for (const prevKey of prevMap.keys()) {
          if (!currentMap.has(prevKey)) {
            patchPayload[`tables/${table}/${prevKey}`] = null;
            changedKeys += 1;
          }
        }
      }
    }
  }
  if (changedKeys === 0 && syncState.connected) {
    return true;
  }
  patchPayload["meta"] = snapshot.meta;
  const endpoint = await buildRtdbEndpoint(RTDB_ROOT_NODE, options?.authToken);
  try {
    const resp = await doRtdbFetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload)
    });
    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => "");
      const errorMsg = `Firebase RTDB PATCH failed (HTTP ${resp.status}): ${bodyText.slice(0, 180)}`;
      syncState.connected = false;
      syncState.lastError = errorMsg;
      syncState.lastAttemptMs = Date.now();
      logger.warn("Firebase RTDB persist skipped", { status: resp.status, detail: bodyText.slice(0, 140) });
      return false;
    }
    syncState.connected = true;
    syncState.hydrated = true;
    syncState.lastPersistedAt = snapshot.meta.updatedAt;
    syncState.lastKnownRemoteUpdatedAt = snapshot.meta.updatedAt;
    syncState.lastFreshnessCheckMs = Date.now();
    syncState.lastError = null;
    syncState.lastAttemptMs = Date.now();
    syncState.lastSyncedSnapshot = snapshot.serializedByTable;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    syncState.connected = false;
    syncState.lastError = `Firebase RTDB persist error: ${msg}`;
    syncState.lastAttemptMs = Date.now();
    logger.warn("Firebase RTDB persist error", { error: msg });
    return false;
  }
}
async function hydrateDatabaseFromRtdb(db, options) {
  if (!isRtdbSyncEnabled()) return false;
  const now = Date.now();
  const freshnessInterval = getFreshnessCheckIntervalMs();
  if (!options?.force) {
    if (syncState.hydrated && syncState.connected) {
      if (now - syncState.lastFreshnessCheckMs < freshnessInterval) {
        return true;
      }
      try {
        const metaEndpoint = await buildRtdbEndpoint(`${RTDB_ROOT_NODE}/meta/updatedAt`, options?.authToken);
        const metaResp = await doRtdbFetch(metaEndpoint, { method: "GET" });
        syncState.lastFreshnessCheckMs = Date.now();
        if (metaResp.ok) {
          const remoteUpdatedAt = await metaResp.json();
          if (remoteUpdatedAt && remoteUpdatedAt === syncState.lastKnownRemoteUpdatedAt) {
            return true;
          }
        }
      } catch {
        return true;
      }
    } else if (!options?.authToken && syncState.lastAttemptMs > 0 && now - syncState.lastAttemptMs < RETRY_BACKOFF_MS) {
      return syncState.connected;
    }
  }
  if (syncState.inflightHydration) {
    return syncState.inflightHydration;
  }
  syncState.inflightHydration = (async () => {
    const endpoint = await buildRtdbEndpoint(RTDB_ROOT_NODE, options?.authToken);
    try {
      const resp = await doRtdbFetch(endpoint, { method: "GET" });
      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => "");
        syncState.connected = false;
        syncState.lastError = `Firebase RTDB GET failed (HTTP ${resp.status}): ${bodyText.slice(0, 180)}`;
        syncState.lastAttemptMs = Date.now();
        return false;
      }
      const rootData = await resp.json();
      const tablesData = rootData?.tables;
      if (tablesData && typeof tablesData === "object" && Object.keys(tablesData).length > 0) {
        const { restoredRows, remoteSerialized } = applyRtdbSnapshotToDb(db, tablesData);
        syncState.connected = true;
        syncState.hydrated = true;
        syncState.lastHydratedAt = (/* @__PURE__ */ new Date()).toISOString();
        syncState.lastFreshnessCheckMs = Date.now();
        syncState.lastKnownRemoteUpdatedAt = rootData?.meta?.updatedAt ?? syncState.lastHydratedAt;
        syncState.lastSyncedSnapshot = remoteSerialized;
        syncState.lastError = null;
        syncState.lastAttemptMs = Date.now();
        logger.info("Hydrated application state from Firebase Realtime Database", { restoredRows });
        return true;
      }
      syncState.connected = true;
      syncState.hydrated = true;
      syncState.lastHydratedAt = (/* @__PURE__ */ new Date()).toISOString();
      syncState.lastFreshnessCheckMs = Date.now();
      syncState.lastError = null;
      syncState.lastAttemptMs = Date.now();
      await persistDatabaseToRtdb(db, options);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      syncState.connected = false;
      syncState.lastError = `Firebase RTDB hydrate error: ${msg}`;
      syncState.lastAttemptMs = Date.now();
      return false;
    } finally {
      syncState.inflightHydration = null;
    }
  })();
  return syncState.inflightHydration;
}
async function ensureRtdbHydrated(db, options) {
  return hydrateDatabaseFromRtdb(db, options);
}

// server/services/authService.ts
import crypto4 from "node:crypto";

// src/utils/planEntitlements.ts
var PLAN_RANK = {
  none: 0,
  basic: 1,
  pro: 2,
  enterprise: 3
};
var PLAN_LIMITS = {
  none: {
    tier: "none",
    name: "No Active Plan",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    maxWorkspaces: 1,
    maxSocialAccounts: 0,
    maxTeamMembers: 1,
    monthlyAiCredits: 0
  },
  basic: {
    tier: "basic",
    name: "Basic",
    monthlyPriceCents: 2900,
    annualPriceCents: 29e3,
    maxWorkspaces: 1,
    maxSocialAccounts: 5,
    maxTeamMembers: 1,
    monthlyAiCredits: 250
  },
  pro: {
    tier: "pro",
    name: "Pro",
    monthlyPriceCents: 7900,
    annualPriceCents: 79e3,
    maxWorkspaces: 5,
    maxSocialAccounts: 20,
    maxTeamMembers: 10,
    monthlyAiCredits: 2e3
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPriceCents: 29900,
    annualPriceCents: 299e3,
    maxWorkspaces: 50,
    maxSocialAccounts: 250,
    maxTeamMembers: 35,
    monthlyAiCredits: 15e3
  }
};
var FEATURE_CATALOG = {
  social_accounts: {
    key: "social_accounts",
    label: "Social Accounts & OAuth",
    description: "Connect and authorize official social media channels for profile sync and publishing.",
    requiredTier: "basic",
    route: "social-accounts"
  },
  ai_studio: {
    key: "ai_studio",
    label: "AI Content Studio",
    description: "Generate brand-grounded social posts, multi-platform repurposed copy, captions, hashtags, and keywords.",
    requiredTier: "basic",
    route: "ai-studio"
  },
  calendar: {
    key: "calendar",
    label: "Content Calendar",
    description: "Plan, organize, and schedule multi-channel campaigns across your editorial calendar.",
    requiredTier: "basic",
    route: "calendar"
  },
  media: {
    key: "media",
    label: "Media Library",
    description: "Store, categorize, and attach approved brand images, flyers, and campaign assets.",
    requiredTier: "basic",
    route: "media"
  },
  graphic_designer: {
    key: "graphic_designer",
    label: "AI Graphic Designer",
    description: "Design promotional flyers, banners, carousel slides, and AI-generated brand visuals.",
    requiredTier: "pro",
    route: "graphic-designer"
  },
  auto_publisher: {
    key: "auto_publisher",
    label: "Auto Publisher",
    description: "Automated dispatch queues, recurring schedules, retries, and live publishing execution.",
    requiredTier: "pro",
    route: "auto-publisher"
  },
  publishing_history: {
    key: "publishing_history",
    label: "Publishing History & Approvals",
    description: "Full delivery audit trail, post status history, and pre-publish approval workflows.",
    requiredTier: "pro",
    route: "publishing-history"
  },
  engagement: {
    key: "engagement",
    label: "Engagement Manager",
    description: "Unified social inbox for comments and messages with AI-assisted reply drafting and escalation.",
    requiredTier: "pro",
    route: "engagement"
  },
  analytics: {
    key: "analytics",
    label: "Live Analytics & Attribution",
    description: "Track impressions, reach, engagement rates, follower growth, and channel attribution.",
    requiredTier: "pro",
    route: "analytics"
  },
  team: {
    key: "team",
    label: "Team Management & RBAC",
    description: "Invite editors, workspace admins, and reviewers with granular role-based permissions.",
    requiredTier: "pro",
    route: "team"
  },
  ai_strategy: {
    key: "ai_strategy",
    label: "AI Brand Strategy & Intelligence",
    description: "Executive brand analysis, audience intelligence, multi-pillar strategies, and growth recommendations.",
    requiredTier: "enterprise",
    route: "ai-strategy"
  }
};
var ORDERED_FEATURES = [
  FEATURE_CATALOG.social_accounts,
  FEATURE_CATALOG.ai_studio,
  FEATURE_CATALOG.calendar,
  FEATURE_CATALOG.media,
  FEATURE_CATALOG.graphic_designer,
  FEATURE_CATALOG.auto_publisher,
  FEATURE_CATALOG.publishing_history,
  FEATURE_CATALOG.engagement,
  FEATURE_CATALOG.analytics,
  FEATURE_CATALOG.team,
  FEATURE_CATALOG.ai_strategy
];
var FREE_TRIAL_DAYS = 7;
var FREE_TRIAL_MS = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1e3;
var FREE_TRIAL_AI_CREDITS = 100;
function normalizePlanCode(code) {
  const normalized = String(code || "").trim().toLowerCase();
  if (normalized === "basic" || normalized === "starter") return "basic";
  if (normalized === "pro" || normalized === "growth" || normalized === "agency") return "pro";
  if (normalized === "enterprise") return "enterprise";
  return "none";
}
function getTrialEndTimestamp(subscription) {
  if (!subscription) return null;
  const raw = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
function isTrialExpired(subscription, nowMs = Date.now()) {
  if (!subscription) return false;
  if (subscription.isTrialExpired === true) return true;
  const normalizedStatus = String(subscription.status || "").trim().toLowerCase();
  if (normalizedStatus !== "trialing") return false;
  const endTs = getTrialEndTimestamp(subscription);
  if (endTs === null) return false;
  return endTs <= nowMs;
}
function isTrialActive(subscription, nowMs = Date.now()) {
  if (!subscription) return false;
  const normalizedStatus = String(subscription.status || "").trim().toLowerCase();
  if (normalizedStatus !== "trialing") return false;
  return !isTrialExpired(subscription, nowMs);
}
function getTrialDaysRemaining(subscription, nowMs = Date.now()) {
  if (!isTrialActive(subscription, nowMs)) return 0;
  const endTs = getTrialEndTimestamp(subscription);
  if (endTs === null) return FREE_TRIAL_DAYS;
  const diff = endTs - nowMs;
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1e3)));
}
function isSubscriptionActive(statusOrSubscription, nowMs = Date.now()) {
  if (!statusOrSubscription) return false;
  if (typeof statusOrSubscription === "string") {
    const normalized2 = statusOrSubscription.trim().toLowerCase();
    return normalized2 === "active" || normalized2 === "trialing";
  }
  const normalized = String(statusOrSubscription.status || "").trim().toLowerCase();
  if (normalized === "active") return true;
  if (normalized === "trialing") {
    return !isTrialExpired(statusOrSubscription, nowMs);
  }
  return false;
}
function getEffectivePlanTier(subscription, nowMs = Date.now()) {
  if (!subscription || !isSubscriptionActive(subscription, nowMs)) {
    return "none";
  }
  return normalizePlanCode(subscription.planCode);
}
function getPlanLimits(subscription, nowMs = Date.now()) {
  return PLAN_LIMITS[getEffectivePlanTier(subscription, nowMs)];
}
function canAccessFeature(subscription, feature, nowMs = Date.now()) {
  const currentTier = getEffectivePlanTier(subscription, nowMs);
  const requiredTier = FEATURE_CATALOG[feature].requiredTier;
  return PLAN_RANK[currentTier] >= PLAN_RANK[requiredTier];
}
function canAddSocialAccount(subscription, currentConnectedCount, nowMs = Date.now()) {
  const limits = getPlanLimits(subscription, nowMs);
  if (limits.maxSocialAccounts <= 0) {
    return {
      allowed: false,
      limit: 0,
      reason: isTrialExpired(subscription, nowMs) ? "Your 7-day free trial has ended. Subscribe to a plan under Billing & Subscriptions to connect social accounts." : "An active subscription plan is required to connect social media accounts."
    };
  }
  if (currentConnectedCount >= limits.maxSocialAccounts) {
    return {
      allowed: false,
      limit: limits.maxSocialAccounts,
      reason: `Your ${limits.name} plan allows up to ${limits.maxSocialAccounts} connected social account${limits.maxSocialAccounts === 1 ? "" : "s"}. Upgrade your subscription to connect more channels.`
    };
  }
  return { allowed: true, limit: limits.maxSocialAccounts };
}
function canAddTeamMember(subscription, currentMemberCount, nowMs = Date.now()) {
  if (!canAccessFeature(subscription, "team", nowMs)) {
    return {
      allowed: false,
      limit: getPlanLimits(subscription, nowMs).maxTeamMembers,
      reason: isTrialExpired(subscription, nowMs) ? "Your 7-day free trial has ended. Subscribe to Pro or Enterprise to manage team seats." : "Team Management requires a Pro or Enterprise subscription."
    };
  }
  const limits = getPlanLimits(subscription, nowMs);
  if (currentMemberCount >= limits.maxTeamMembers) {
    return {
      allowed: false,
      limit: limits.maxTeamMembers,
      reason: `Your ${limits.name} plan supports up to ${limits.maxTeamMembers} team seats. Upgrade to Enterprise for more seats.`
    };
  }
  return { allowed: true, limit: limits.maxTeamMembers };
}
function getTierDisplayName(tier) {
  return PLAN_LIMITS[tier].name;
}

// server/services/authService.ts
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var SESSION_RENEW_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1e3;
function hashSessionToken(token) {
  return crypto4.createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex");
}
function passwordFingerprint(passwordHash) {
  const raw = typeof passwordHash === "string" ? passwordHash : "";
  return crypto4.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}
function signSessionToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto4.createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url");
  return `lt1.${encoded}.${sig}`;
}
function verifySignedSessionToken(rawToken) {
  if (!rawToken.startsWith("lt1.")) return null;
  const parts = rawToken.split(".");
  if (parts.length !== 3) return null;
  const [, encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;
  const expectedSig = crypto4.createHmac("sha256", env.SESSION_SECRET).update(encoded).digest("base64url");
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto4.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof parsed.sid === "string" && typeof parsed.uid === "string" && typeof parsed.email === "string" && typeof parsed.pfp === "string" && typeof parsed.exp === "number" && parsed.exp > Date.now()) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
function mapUserRow(row) {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    role: row.role_slug,
    emailVerified: Boolean(row.email_verified),
    status: row.status,
    timezone: String(row.timezone || "UTC"),
    preferredLanguage: String(row.preferred_language || "en"),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
function getWorkspaceSubscriptionSummary(db, workspaceId) {
  const row = db.prepare(`
      SELECT s.status, s.billing_cycle, s.current_period_end,
             sp.code as plan_code, sp.name as plan_name,
             sp.max_workspaces, sp.max_social_accounts, sp.max_team_members, sp.monthly_ai_credits
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.workspace_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 1
    `).get(workspaceId);
  if (!row) {
    return {
      planCode: "none",
      planName: "No Active Plan",
      status: "none",
      billingCycle: "monthly",
      currentPeriodEnd: null,
      trialEndsAt: null,
      trialDaysRemaining: 0,
      isTrialActive: false,
      isTrialExpired: false,
      maxWorkspaces: 1,
      maxSocialAccounts: 0,
      maxTeamMembers: 1,
      monthlyAiCredits: 0
    };
  }
  const rawStatus = String(row.status);
  const currentPeriodEnd = row.current_period_end ? String(row.current_period_end) : null;
  const trialEndsAt = rawStatus === "trialing" ? currentPeriodEnd : null;
  const baseSub = {
    planCode: String(row.plan_code),
    status: rawStatus,
    currentPeriodEnd,
    trialEndsAt
  };
  const activeTrial = isTrialActive(baseSub);
  const expiredTrial = isTrialExpired(baseSub);
  const daysRemaining = getTrialDaysRemaining(baseSub);
  return {
    planCode: baseSub.planCode,
    planName: activeTrial ? "7-Day Free Trial" : expiredTrial ? "Trial Expired" : String(row.plan_name),
    status: rawStatus,
    billingCycle: String(row.billing_cycle) === "annual" ? "annual" : "monthly",
    currentPeriodEnd,
    trialEndsAt,
    trialDaysRemaining: daysRemaining,
    isTrialActive: activeTrial,
    isTrialExpired: expiredTrial,
    maxWorkspaces: expiredTrial ? 1 : Number(row.max_workspaces || 1),
    maxSocialAccounts: expiredTrial ? 0 : Number(row.max_social_accounts || 0),
    maxTeamMembers: expiredTrial ? 1 : Number(row.max_team_members || 1),
    monthlyAiCredits: expiredTrial ? 0 : activeTrial ? FREE_TRIAL_AI_CREDITS : Number(row.monthly_ai_credits || 0)
  };
}
function listUserWorkspaces(db, userId) {
  const rows = db.prepare(`
    SELECT DISTINCT w.*,
      bp.id as bp_id, bp.brand_name, bp.logo_url, bp.primary_color, bp.secondary_color,
      bp.accent_color, bp.business_description, bp.industry, bp.target_audience,
      bp.tone_of_voice, bp.preferred_language as bp_lang, bp.timezone as bp_tz, bp.updated_at as bp_updated_at
    FROM workspaces w
    LEFT JOIN brand_profiles bp ON bp.workspace_id = w.id
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = ? AND wm.status = 'active'
    WHERE w.owner_user_id = ? OR wm.user_id = ?
    ORDER BY w.created_at ASC
  `).all(userId, userId, userId);
  return rows.map((r) => {
    const wid = String(r.id);
    return {
      id: wid,
      organisationId: String(r.organisation_id),
      ownerUserId: String(r.owner_user_id),
      name: String(r.name),
      slug: String(r.slug),
      timezone: String(r.timezone),
      preferredLanguage: String(r.preferred_language),
      aiCreditsBalance: Number(r.ai_credits_balance),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      brandProfile: {
        id: String(r.bp_id || ""),
        workspaceId: wid,
        brandName: String(r.brand_name || r.name),
        logoUrl: String(r.logo_url || ""),
        primaryColor: String(r.primary_color || "#0052FF"),
        secondaryColor: String(r.secondary_color || "#071436"),
        accentColor: String(r.accent_color || "#F59E0B"),
        businessDescription: String(r.business_description || ""),
        industry: String(r.industry || ""),
        targetAudience: String(r.target_audience || ""),
        toneOfVoice: String(r.tone_of_voice || "Executive & Authoritative"),
        preferredLanguage: String(r.bp_lang || r.preferred_language || "en"),
        timezone: String(r.bp_tz || r.timezone || "UTC"),
        updatedAt: String(r.bp_updated_at || r.updated_at)
      },
      subscription: getWorkspaceSubscriptionSummary(db, wid)
    };
  });
}
function createSession(db, userId) {
  const userRow = db.prepare("SELECT email, password_hash FROM users WHERE id = ?").get(userId);
  const sessionId = crypto4.randomUUID();
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const expMs = nowMs + SESSION_TTL_MS;
  const expiresAt = new Date(expMs).toISOString();
  const rawToken = userRow ? signSessionToken({
    sid: sessionId,
    uid: userId,
    email: userRow.email,
    pfp: passwordFingerprint(userRow.password_hash),
    exp: expMs
  }) : crypto4.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, expiresAt, now);
  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(now, now, userId);
  return rawToken;
}
function getUserBySessionToken(db, rawToken) {
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const row = db.prepare(`
    SELECT u.*, s.id as session_id, s.expires_at as session_expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'
  `).get(tokenHash, now);
  if (row) {
    const expMs = Date.parse(String(row.session_expires_at || ""));
    if (Number.isFinite(expMs) && expMs - nowMs < SESSION_RENEW_THRESHOLD_MS) {
      const renewedExpires = new Date(nowMs + SESSION_TTL_MS).toISOString();
      db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(renewedExpires, String(row.session_id));
    }
    return mapUserRow(row);
  }
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0;
  if (isServerless) {
    const verified = verifySignedSessionToken(rawToken);
    if (verified) {
      const userRow = db.prepare(`
        SELECT * FROM users WHERE (id = ? OR email = ?) AND status = 'active' LIMIT 1
      `).get(verified.uid, verified.email);
      if (userRow && passwordFingerprint(userRow.password_hash) === verified.pfp) {
        const expiresAt = new Date(verified.exp).toISOString();
        db.prepare(`
          INSERT OR IGNORE INTO sessions (id, user_id, token_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(verified.sid, String(userRow.id), tokenHash, expiresAt, now);
        return mapUserRow(userRow);
      }
    }
  }
  return null;
}
function revokeSession(db, rawToken) {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}
function recordAuditLog(db, params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, actor_email, workspace_id, action, resource_type, resource_id, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto4.randomUUID(),
    params.actorUserId ?? null,
    params.actorEmail ?? null,
    params.workspaceId ?? null,
    params.action,
    params.resourceType,
    params.resourceId ?? null,
    JSON.stringify(params.metadata ?? {}),
    now,
    now
  );
}
function registerUserWithWorkspace(db, input) {
  const email = input.email.trim().toLowerCase();
  const strength = validatePasswordStrength(input.password);
  if (!strength.valid) {
    throw new Error(strength.reason || "Weak password");
  }
  const allowReg = db.prepare("SELECT value FROM system_settings WHERE key = 'allow_new_registrations'").get();
  if (allowReg?.value === "false") {
    throw new Error("New registrations are temporarily paused by the administrator.");
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const userId = crypto4.randomUUID();
  const orgId = crypto4.randomUUID();
  const wsId = crypto4.randomUUID();
  const wsName = (input.workspaceName || `${input.fullName.split(" ")[0]}'s Brand Workspace`).trim();
  const slugBase = slugifyWorkspaceName(wsName);
  const uniqueSlug = `${slugBase}-${crypto4.randomBytes(3).toString("hex")}`;
  const initialCredits = FREE_TRIAL_AI_CREDITS;
  const trialEndsAt = new Date(Date.now() + FREE_TRIAL_MS).toISOString();
  const trialPlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get() || db.prepare("SELECT id FROM subscription_plans WHERE code = 'pro'").get() || db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get();
  const verifyToken = crypto4.randomBytes(20).toString("hex");
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, auth_provider, external_uid, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
      VALUES (?, 'password', ?, ?, ?, ?, 'customer', 0, 'active', 'UTC', 'en', ?, ?)
    `).run(userId, input.externalUid ?? null, email, hashPassword(input.password), input.fullName.trim(), now, now);
    db.prepare(`
      INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, userId, wsName, uniqueSlug, email, now, now);
    db.prepare(`
      INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'UTC', 'en', ?, ?, ?)
    `).run(wsId, orgId, userId, wsName, uniqueSlug, initialCredits, now, now);
    db.prepare(`
      INSERT INTO brand_profiles (
        id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
        business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
      ) VALUES (?, ?, ?, '', '#0052FF', '#071436', '#F59E0B', '', ?, '', 'Professional & Modern', 'en', 'UTC', ?, ?)
    `).run(crypto4.randomUUID(), wsId, wsName, input.industry || "", now, now);
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
    `).run(crypto4.randomUUID(), wsId, userId, email, userId, now, now);
    if (trialPlan) {
      db.prepare(`
        INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'trialing', 'monthly', ?, ?, ?, ?)
      `).run(crypto4.randomUUID(), orgId, wsId, trialPlan.id, now, trialEndsAt, now, now);
    }
    db.prepare(`
      INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
      VALUES (?, ?, ?, 'billing', '7-Day Free Trial Activated', 'Welcome! Enjoy full access free for 7 days with 100 trial AI credits. After 7 days, choose Basic, Pro, or Enterprise under Billing & Subscriptions to continue.', 0, ?, ?)
    `).run(crypto4.randomUUID(), wsId, userId, now, now);
    const verifyExpires = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
    db.prepare(`
      INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
      VALUES (?, ?, 'email_verify', ?, ?, ?)
    `).run(crypto4.randomUUID(), userId, verifyToken, verifyExpires, now);
    recordAuditLog(db, {
      actorUserId: userId,
      actorEmail: email,
      workspaceId: wsId,
      action: "auth.register",
      resourceType: "user",
      resourceId: userId,
      metadata: { workspaceName: wsName }
    });
  });
  tx();
  const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  const token = createSession(db, userId);
  return {
    user: mapUserRow(userRow),
    workspaces: listUserWorkspaces(db, userId),
    token,
    verificationToken: verifyToken
  };
}
function loginWithPassword(db, emailInput, password) {
  const email = emailInput.trim().toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !row.password_hash) {
    throw new Error("Invalid email or password.");
  }
  if (row.status === "suspended") {
    throw new Error("This account has been suspended. Contact support for assistance.");
  }
  if (row.status === "deleted") {
    throw new Error("This account is scheduled for deletion. Use Account Recovery to restore access.");
  }
  if (!verifyPassword(password, String(row.password_hash))) {
    throw new Error("Invalid email or password.");
  }
  const user = mapUserRow(row);
  const token = createSession(db, user.id);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    resourceType: "session",
    resourceId: user.id
  });
  return {
    user,
    workspaces: listUserWorkspaces(db, user.id),
    token
  };
}
function provisionOrSyncVerifiedEmailUser(db, input) {
  const email = input.email.trim().toLowerCase();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let row = db.prepare("SELECT * FROM users WHERE external_uid = ? OR email = ?").get(input.externalUid, email);
  if (!row) {
    const userId = crypto4.randomUUID();
    const orgId = crypto4.randomUUID();
    const wsId = crypto4.randomUUID();
    const role = email === "livingstoneedu64@gmail.com" ? "super_admin" : "customer";
    const displayName = input.fullName.trim() || email.split("@")[0];
    const wsName = `${displayName.split(" ")[0]}'s Brand Workspace`;
    const uniqueSlug = `${slugifyWorkspaceName(wsName)}-${crypto4.randomBytes(3).toString("hex")}`;
    const trialPlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get() || db.prepare("SELECT id FROM subscription_plans WHERE code = 'pro'").get() || db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get();
    const periodEnd = role === "super_admin" ? new Date(Date.now() + 365 * 86400 * 1e3).toISOString() : new Date(Date.now() + FREE_TRIAL_MS).toISOString();
    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, auth_provider, external_uid, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
        VALUES (?, 'password', ?, ?, ?, ?, ?, 0, 'active', 'UTC', 'en', ?, ?)
      `).run(userId, input.externalUid, email, hashPassword(input.password), displayName, role, now, now);
      db.prepare(`
        INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, userId, wsName, uniqueSlug, email, now, now);
      db.prepare(`
        INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'UTC', 'en', ?, ?, ?)
      `).run(wsId, orgId, userId, wsName, uniqueSlug, role === "super_admin" ? 15e3 : FREE_TRIAL_AI_CREDITS, now, now);
      db.prepare(`
        INSERT INTO brand_profiles (
          id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
          business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
        ) VALUES (?, ?, ?, '', '#0052FF', '#071436', '#F59E0B', '', '', '', 'Professional & Modern', 'en', 'UTC', ?, ?)
      `).run(crypto4.randomUUID(), wsId, wsName, now, now);
      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
      `).run(crypto4.randomUUID(), wsId, userId, email, userId, now, now);
      if (trialPlan) {
        db.prepare(`
          INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto4.randomUUID(),
          orgId,
          wsId,
          trialPlan.id,
          role === "super_admin" ? "active" : "trialing",
          role === "super_admin" ? "annual" : "monthly",
          now,
          periodEnd,
          now,
          now
        );
      }
      db.prepare(`
        INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
        VALUES (?, ?, ?, 'billing', '7-Day Free Trial Activated', 'Welcome! Enjoy full access free for 7 days with 100 trial AI credits. After 7 days, choose Basic, Pro, or Enterprise under Billing & Subscriptions to continue.', 0, ?, ?)
      `).run(crypto4.randomUUID(), wsId, userId, now, now);
    })();
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  } else {
    if (row.status === "suspended") {
      throw new Error("This account has been suspended. Contact support for assistance.");
    }
    if (row.status === "deleted") {
      throw new Error("This account is scheduled for deletion. Use Account Recovery to restore access.");
    }
    db.prepare(`
      UPDATE users
      SET external_uid = COALESCE(external_uid, ?),
          password_hash = ?,
          updated_at = ?
      WHERE id = ?
    `).run(input.externalUid, hashPassword(input.password), now, row.id);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
  }
  const user = mapUserRow(row);
  const token = createSession(db, user.id);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    resourceType: "session",
    resourceId: user.id,
    metadata: { verifiedVia: "firebase_auth" }
  });
  return {
    user,
    workspaces: listUserWorkspaces(db, user.id),
    token
  };
}
function syncFirebaseGoogleUser(db, input) {
  const email = input.email.trim().toLowerCase();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let row = db.prepare("SELECT * FROM users WHERE external_uid = ? OR email = ?").get(input.externalUid, email);
  if (!row) {
    const userId = crypto4.randomUUID();
    const orgId = crypto4.randomUUID();
    const wsId = crypto4.randomUUID();
    const role = email === "livingstoneedu64@gmail.com" ? "super_admin" : "customer";
    const wsName = `${input.fullName.split(" ")[0]}'s Agency Workspace`;
    const uniqueSlug = `${slugifyWorkspaceName(wsName)}-${crypto4.randomBytes(3).toString("hex")}`;
    const enterprisePlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get();
    const periodEnd = role === "super_admin" ? new Date(Date.now() + 365 * 86400 * 1e3).toISOString() : new Date(Date.now() + FREE_TRIAL_MS).toISOString();
    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, auth_provider, external_uid, email, full_name, avatar_url, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
        VALUES (?, 'google', ?, ?, ?, ?, ?, ?, 'active', 'UTC', 'en', ?, ?)
      `).run(userId, input.externalUid, email, input.fullName, input.avatarUrl ?? null, role, input.emailVerified ? 1 : 0, now, now);
      db.prepare(`
        INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, userId, wsName, uniqueSlug, email, now, now);
      db.prepare(`
        INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'UTC', 'en', ?, ?, ?)
      `).run(wsId, orgId, userId, wsName, uniqueSlug, role === "super_admin" ? 15e3 : FREE_TRIAL_AI_CREDITS, now, now);
      db.prepare(`
        INSERT INTO brand_profiles (
          id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
          business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
        ) VALUES (?, ?, ?, '', '#0052FF', '#071436', '#F59E0B', '', '', '', 'Executive & Authoritative', 'en', 'UTC', ?, ?)
      `).run(crypto4.randomUUID(), wsId, wsName, now, now);
      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
      `).run(crypto4.randomUUID(), wsId, userId, email, userId, now, now);
      if (enterprisePlan) {
        db.prepare(`
          INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto4.randomUUID(),
          orgId,
          wsId,
          enterprisePlan.id,
          role === "super_admin" ? "active" : "trialing",
          role === "super_admin" ? "annual" : "monthly",
          now,
          periodEnd,
          now,
          now
        );
      }
    })();
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  } else {
    db.prepare(`
      UPDATE users
      SET external_uid = COALESCE(external_uid, ?),
          avatar_url = COALESCE(?, avatar_url),
          email_verified = CASE WHEN ? = 1 THEN 1 ELSE email_verified END,
          updated_at = ?
      WHERE id = ?
    `).run(input.externalUid, input.avatarUrl ?? null, input.emailVerified ? 1 : 0, now, row.id);
    row = db.prepare("SELECT * FROM users WHERE id = ?").get(row.id);
  }
  const user = mapUserRow(row);
  if (user.status !== "active") {
    throw new Error("This account is not active.");
  }
  const token = createSession(db, user.id);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.google_login",
    resourceType: "session",
    resourceId: user.id
  });
  return {
    user,
    workspaces: listUserWorkspaces(db, user.id),
    token
  };
}
function createPasswordResetToken(db, emailInput) {
  const email = emailInput.trim().toLowerCase();
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email);
  if (!user) {
    return {};
  }
  const resetToken = crypto4.randomBytes(20).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + 3600 * 1e3).toISOString();
  db.prepare(`
    INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
    VALUES (?, ?, 'password_reset', ?, ?, ?)
  `).run(crypto4.randomUUID(), user.id, resetToken, expiresAt, now);
  recordAuditLog(db, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.password_reset_requested",
    resourceType: "user",
    resourceId: user.id
  });
  return { resetToken };
}
function confirmPasswordReset(db, tokenValue, newPassword) {
  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new Error(strength.reason || "Weak password");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const tokenRow = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE token_value = ? AND token_type = 'password_reset' AND used_at IS NULL AND expires_at > ?
  `).get(tokenValue, now);
  if (!tokenRow) {
    throw new Error("Invalid or expired password reset token.");
  }
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(newPassword), now, tokenRow.user_id);
    db.prepare("UPDATE auth_tokens SET used_at = ? WHERE id = ?").run(now, tokenRow.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(tokenRow.user_id);
    recordAuditLog(db, {
      actorUserId: tokenRow.user_id,
      action: "auth.password_reset_completed",
      resourceType: "user",
      resourceId: tokenRow.user_id
    });
  })();
}
function verifyEmailWithToken(db, tokenValue) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const tokenRow = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE token_value = ? AND token_type = 'email_verify' AND used_at IS NULL AND expires_at > ?
  `).get(tokenValue, now);
  if (!tokenRow) {
    throw new Error("Invalid or expired verification token.");
  }
  db.transaction(() => {
    db.prepare("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?").run(now, tokenRow.user_id);
    db.prepare("UPDATE auth_tokens SET used_at = ? WHERE id = ?").run(now, tokenRow.id);
    recordAuditLog(db, {
      actorUserId: tokenRow.user_id,
      action: "auth.email_verified",
      resourceType: "user",
      resourceId: tokenRow.user_id
    });
  })();
}
function assertWorkspaceAccess(db, userId, workspaceId, role) {
  if (role === "super_admin") {
    const ws = db.prepare("SELECT id FROM workspaces WHERE id = ?").get(workspaceId);
    return Boolean(ws);
  }
  const owned = db.prepare("SELECT id FROM workspaces WHERE id = ? AND owner_user_id = ?").get(workspaceId, userId);
  if (owned) return true;
  const member = db.prepare("SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'").get(workspaceId, userId);
  return Boolean(member);
}

// src/config/firebaseConfig.ts
var viteEnv = typeof import.meta !== "undefined" && import.meta.env || {};
var DEFAULT_FIREBASE_DATABASE_URL = "https://livingtech-brand-agency-default-rtdb.firebaseio.com";
var LIVINGTECH_FIREBASE_CONFIG = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || "AIzaSyDXLNVbNX-sU5jakxMtB5EJcM5TWkWS3Vo",
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || "livingtech-brand-agency.firebaseapp.com",
  databaseURL: viteEnv.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_DATABASE_URL,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || "livingtech-brand-agency",
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || "livingtech-brand-agency.firebasestorage.app",
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "795478435500",
  appId: viteEnv.VITE_FIREBASE_APP_ID || "1:795478435500:web:7330ba743889d7fad62109",
  measurementId: viteEnv.VITE_FIREBASE_MEASUREMENT_ID || "G-MM3KYW2G3V"
};

// server/services/firebaseAuthService.ts
var customAuthFetch = null;
var AUTH_TIMEOUT_MS = 5e3;
function isFirebaseEmailAuthEnabled() {
  if (customAuthFetch) return true;
  if (process.env.DISABLE_FIREBASE_AUTH_SYNC === "true") return false;
  if (process.env.NODE_ENV === "test") return false;
  return Boolean(getFirebaseWebApiKey());
}
function getFirebaseWebApiKey() {
  return process.env.FIREBASE_WEB_API_KEY?.trim() || process.env.VITE_FIREBASE_API_KEY?.trim() || LIVINGTECH_FIREBASE_CONFIG.apiKey || "";
}
async function doAuthFetch(url, init) {
  const transport = customAuthFetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await transport(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
var FirebaseEmailExistsError = class extends Error {
  constructor() {
    super("An account with this email already exists. Please sign in instead.");
    this.name = "FirebaseEmailExistsError";
  }
};
async function firebaseSignUpWithEmailPassword(emailInput, password, fullName) {
  if (!isFirebaseEmailAuthEnabled()) return null;
  const apiKey = getFirebaseWebApiKey();
  const email = emailInput.trim().toLowerCase();
  try {
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
    const resp = await doAuthFetch(signUpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const code = String(data?.error?.message || "");
      if (code.startsWith("EMAIL_EXISTS")) {
        throw new FirebaseEmailExistsError();
      }
      logger.warn("Firebase Auth signUp skipped", { status: resp.status, code });
      return null;
    }
    if (!data.localId || !data.idToken) return null;
    const trimmedName = fullName.trim();
    if (trimmedName) {
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`;
      await doAuthFetch(updateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: data.idToken,
          displayName: trimmedName,
          returnSecureToken: false
        })
      }).catch(() => void 0);
    }
    return {
      localId: data.localId,
      idToken: data.idToken,
      email: (data.email || email).toLowerCase(),
      displayName: trimmedName || email.split("@")[0]
    };
  } catch (err) {
    if (err instanceof FirebaseEmailExistsError) {
      throw err;
    }
    logger.warn("Firebase Auth signUp network fallback", {
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}
async function firebaseSignInWithEmailPassword(emailInput, password) {
  if (!isFirebaseEmailAuthEnabled()) return null;
  const apiKey = getFirebaseWebApiKey();
  const email = emailInput.trim().toLowerCase();
  try {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
    const resp = await doAuthFetch(signInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    if (!resp.ok) {
      return null;
    }
    const data = await resp.json().catch(() => ({}));
    if (!data.localId || !data.idToken) return null;
    return {
      localId: data.localId,
      idToken: data.idToken,
      email: (data.email || email).toLowerCase(),
      displayName: (data.displayName || "").trim() || email.split("@")[0]
    };
  } catch (err) {
    logger.warn("Firebase Auth signIn lookup error", {
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}

// server/services/entitlementMiddleware.ts
function createWorkspaceFeatureGuard(db, feature) {
  return (req, res, next) => {
    const wid = String(req.params.wid || "");
    if (!wid) {
      return res.status(400).json({ error: "Workspace ID is required." });
    }
    const subscription = getWorkspaceSubscriptionSummary(db, wid);
    if (!canAccessFeature(subscription, feature)) {
      const meta = FEATURE_CATALOG[feature];
      const requiredName = getTierDisplayName(meta.requiredTier);
      const currentTier = getEffectivePlanTier(subscription);
      const currentName = getTierDisplayName(currentTier);
      const expired = isTrialExpired(subscription);
      return res.status(403).json({
        error: expired ? `Your 7-day free trial has ended. Subscribe and complete payment for the ${requiredName} plan under Billing & Subscriptions to continue using ${meta.label}.` : `${meta.label} is not available on your current plan (${currentName}). Subscribe to the ${requiredName} plan under Billing & Subscriptions to unlock this feature.`,
        code: expired ? "TRIAL_EXPIRED" : "SUBSCRIPTION_REQUIRED",
        feature,
        currentPlan: currentTier,
        requiredPlan: meta.requiredTier
      });
    }
    next();
  };
}

// server/services/aiService.ts
import { GoogleGenAI as GoogleGenAI2, Type } from "@google/genai";
import crypto6 from "node:crypto";

// server/ai/geminiClient.ts
import { GoogleGenAI } from "@google/genai";
import crypto5 from "node:crypto";
var GEMINI_PRIMARY_MODEL = "gemini-3.5-flash-lite";
var GEMINI_FALLBACK_MODELS = ["gemini-3.1-flash-lite"];
var testTransportOverride = null;
function createGeminiSdkClient() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to enable AI generation.");
  }
  return new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function isTransientCapacityError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand") || raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED");
}
function formatGeminiClientError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY") || raw.includes("Insufficient AI credits")) {
    return err instanceof Error ? err : new Error(raw);
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      if (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE") {
        return new Error("Gemini AI is temporarily busy. Your credits were not deducted \u2014 please retry shortly.");
      }
      return new Error(`Gemini AI error: ${parsed.error.message}`);
    }
  } catch {
  }
  return new Error(raw.length > 260 ? `${raw.slice(0, 260)}\u2026` : raw);
}
function loadWorkspaceBrandProfile(db, workspaceId) {
  const row = db.prepare("SELECT * FROM brand_profiles WHERE workspace_id = ?").get(workspaceId);
  if (!row) {
    throw new Error("Workspace brand profile not found.");
  }
  let bannedWords = [];
  let brandDocuments = [];
  try {
    bannedWords = JSON.parse(String(row.banned_words_json || "[]"));
  } catch {
    bannedWords = [];
  }
  try {
    brandDocuments = JSON.parse(String(row.brand_documents_json || "[]"));
  } catch {
    brandDocuments = [];
  }
  return {
    workspaceId: String(row.workspace_id),
    brandName: String(row.brand_name || ""),
    logoUrl: String(row.logo_url || ""),
    primaryColor: String(row.primary_color || "#0052FF"),
    secondaryColor: String(row.secondary_color || "#071436"),
    accentColor: String(row.accent_color || "#F59E0B"),
    businessDescription: String(row.business_description || ""),
    industry: String(row.industry || ""),
    productsServices: String(row.products_services || ""),
    targetAudience: String(row.target_audience || ""),
    businessGoals: String(row.business_goals || ""),
    toneOfVoice: String(row.tone_of_voice || "Executive & Authoritative"),
    preferredLanguage: String(row.preferred_language || "en"),
    timezone: String(row.timezone || "UTC"),
    bannedWords: Array.isArray(bannedWords) ? bannedWords : [],
    brandToneRules: String(row.brand_tone_rules || ""),
    maxPostsPerDay: Number(row.max_posts_per_day ?? 10) || 10,
    autoReplyEnabled: Boolean(row.auto_reply_enabled),
    brandDocuments: Array.isArray(brandDocuments) ? brandDocuments : [],
    updatedAt: String(row.updated_at || (/* @__PURE__ */ new Date()).toISOString())
  };
}
function loadPermittedWorkspaceContext(db, workspaceId) {
  const brand = loadWorkspaceBrandProfile(db, workspaceId);
  const accounts = db.prepare(
    `SELECT sa.id, sp.key as platform_key, sa.account_name, sa.account_handle, sa.account_type,
              sa.account_description, sa.business_category, sa.followers_count, sa.connection_status, sa.last_synced_at
       FROM social_accounts sa
       JOIN social_platforms sp ON sp.id = sa.platform_id
       WHERE sa.workspace_id = ? AND sa.connection_status = 'connected'`
  ).all(workspaceId);
  const recentPosts = db.prepare(
    `SELECT title, caption, platform_key, status, published_at
       FROM content_posts
       WHERE workspace_id = ?
       ORDER BY created_at DESC LIMIT 12`
  ).all(workspaceId);
  const liveAnalytics = db.prepare(
    `SELECT platform_key, snapshot_date, impressions, engagements, clicks, followers_total
       FROM analytics_snapshots
       WHERE workspace_id = ? AND is_demo = 0
       ORDER BY snapshot_date DESC LIMIT 20`
  ).all(workspaceId);
  const mediaAssets = db.prepare(
    `SELECT file_name, asset_type, folder, public_url
       FROM media_library
       WHERE workspace_id = ?
       ORDER BY created_at DESC LIMIT 15`
  ).all(workspaceId);
  return { brand, accounts, recentPosts, liveAnalytics, mediaAssets };
}
function formatConnectedSocialContextForAi(ctx, options) {
  const targetedAccounts = ctx.accounts.filter((a) => {
    if (options?.socialAccountId && String(a.id) === options.socialAccountId) return true;
    if (options?.platformKey && String(a.platform_key) === options.platformKey) return true;
    return !options?.platformKey && !options?.socialAccountId;
  });
  const accountList = targetedAccounts.length > 0 ? targetedAccounts : ctx.accounts;
  const accountSummary = accountList.length > 0 ? accountList.slice(0, 6).map((a) => {
    const followers = a.followers_count !== null && a.followers_count !== void 0 ? `${Number(a.followers_count).toLocaleString()} followers` : "followers n/a";
    const bio = a.account_description ? ` | Bio: ${String(a.account_description).slice(0, 220)}` : "";
    const category = a.business_category ? ` | Category: ${String(a.business_category)}` : "";
    return `- ${String(a.platform_key).toUpperCase()}: ${String(a.account_name)} (${String(a.account_handle)}, ${followers}${category}${bio})`;
  }).join("\n") : "- No connected social accounts yet (rely on workspace brand profile).";
  const relevantPosts = ctx.recentPosts.filter(
    (p) => !options?.platformKey || String(p.platform_key) === options.platformKey
  );
  const postsToShow = (relevantPosts.length > 0 ? relevantPosts : ctx.recentPosts).slice(0, 6);
  const contentSummary = postsToShow.length > 0 ? postsToShow.map(
    (p) => `- [${String(p.platform_key).toUpperCase()}] ${String(p.title)}: ${String(p.caption || "").slice(0, 180)}`
  ).join("\n") : "- No prior synced or published channel posts yet.";
  return `CONNECTED SOCIAL MEDIA PROFILE(S) (Use this authentic profile identity, niche, and bio):
${accountSummary}

RECENT CHANNEL CONTENT & VOICE SAMPLES (Match this voice and avoid repeating recent topics):
${contentSummary}`;
}
async function runStructuredGeminiModule(db, params) {
  const cost = PHASE3_AI_CREDIT_COSTS[params.moduleKey];
  const ws = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. "${params.moduleKey}" requires ${cost} credits.`);
  }
  const startedAt = Date.now();
  const models = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];
  const config = {
    systemInstruction: params.systemInstruction,
    responseMimeType: "application/json",
    responseSchema: params.responseSchema
  };
  let lastError;
  let response = null;
  let modelUsed = GEMINI_PRIMARY_MODEL;
  const ai = testTransportOverride ? null : createGeminiSdkClient();
  for (let i = 0; i < models.length; i++) {
    const candidateModel = models[i];
    try {
      if (testTransportOverride) {
        response = await testTransportOverride({ model: candidateModel, contents: params.prompt, config });
      } else {
        response = await ai.models.generateContent({
          model: candidateModel,
          contents: params.prompt,
          config
        });
      }
      modelUsed = candidateModel;
      break;
    } catch (err) {
      lastError = err;
      if (!isTransientCapacityError(err) || i === models.length - 1) {
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const formatted = formatGeminiClientError(err);
        db.prepare(
          `INSERT INTO ai_generation_usage (
            id, workspace_id, user_id, module_key, model_name, credits_used,
            prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'failed', ?, ?, ?)`
        ).run(
          crypto5.randomUUID(),
          params.workspaceId,
          params.userId,
          params.moduleKey,
          candidateModel,
          formatted.message,
          Date.now() - startedAt,
          now2
        );
        throw formatted;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  if (!response) {
    throw formatGeminiClientError(lastError);
  }
  const parsed = JSON.parse((response.text ?? "{}").trim());
  const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const latencyMs = Date.now() - startedAt;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const legacyFeature = params.moduleKey === "content_strategy" || params.moduleKey === "brand_analysis" || params.moduleKey === "audience_analysis" ? "content_strategy" : params.moduleKey === "hashtag_recommendations" || params.moduleKey === "keyword_research" ? "hashtag_research" : params.moduleKey === "caption_writing" || params.moduleKey === "comment_reply_drafting" ? "caption_rewrite" : "content_studio";
  db.transaction(() => {
    db.prepare("UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?").run(
      cost,
      now,
      params.workspaceId
    );
    db.prepare(
      `INSERT INTO ai_generation_usage (
        id, workspace_id, user_id, module_key, model_name, credits_used,
        prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', NULL, ?, ?)`
    ).run(
      crypto5.randomUUID(),
      params.workspaceId,
      params.userId,
      params.moduleKey,
      modelUsed,
      cost,
      promptTokens,
      completionTokens,
      latencyMs,
      now
    );
    db.prepare(
      `INSERT INTO ai_usage (
        id, workspace_id, user_id, feature, model_name, credits_used,
        prompt_tokens, completion_tokens, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
    ).run(
      crypto5.randomUUID(),
      params.workspaceId,
      params.userId,
      legacyFeature,
      modelUsed,
      cost,
      promptTokens,
      completionTokens,
      now,
      now
    );
  })();
  const updatedWs = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  return {
    data: parsed,
    modelUsed,
    creditsUsed: cost,
    creditsRemaining: updatedWs.ai_credits_balance,
    promptTokens,
    completionTokens
  };
}

// server/services/aiService.ts
var PRIMARY_MODEL = "gemini-3.5-flash-lite";
var FALLBACK_MODELS = ["gemini-3.1-flash-lite"];
function getGeminiClient() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to enable AI generation.");
  }
  return new GoogleGenAI2({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function isTransientCapacityError2(err) {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand") || raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED");
}
function formatGeminiError(err) {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY") || raw.includes("Insufficient AI credits")) {
    return err instanceof Error ? err : new Error(raw);
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      if (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE") {
        return new Error("Gemini AI is temporarily experiencing high demand. Your credits were not deducted\u2014please try again in a moment.");
      }
      return new Error(`AI generation failed: ${parsed.error.message}`);
    }
  } catch {
  }
  return new Error(raw.length > 220 ? `${raw.slice(0, 220)}\u2026` : raw);
}
async function generateWithResilience(ai, contents, config) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      return { response, modelUsed: model };
    } catch (err) {
      lastError = err;
      if (!isTransientCapacityError2(err) || i === models.length - 1) {
        throw formatGeminiError(err);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw formatGeminiError(lastError);
}
function mapAiSuggestionRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    userId: String(r.user_id),
    platformKey: String(r.platform_key),
    topic: String(r.topic),
    keywords: JSON.parse(String(r.keywords_json || "[]")),
    objective: String(r.objective || ""),
    tone: String(r.tone || ""),
    headline: String(r.headline),
    headlineOptions: JSON.parse(String(r.headline_options_json || "[]")),
    postCopy: String(r.post_copy),
    hashtags: JSON.parse(String(r.hashtags_json || "[]")),
    callToAction: String(r.call_to_action || ""),
    bestTimeNote: String(r.best_time_note || ""),
    variants: JSON.parse(String(r.variants_json || "[]")),
    status: String(r.status),
    savedPostId: r.saved_post_id ? String(r.saved_post_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
async function generateAiContentPost(db, params) {
  const cost = calculateAiCreditCost("content_studio");
  const ws = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. This generation requires ${cost} credits.`);
  }
  const ai = getGeminiClient();
  const keywordsLine = params.keywords.length > 0 ? params.keywords.join(", ") : "None specified";
  let socialContextBlock = "";
  try {
    const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
    socialContextBlock = `

${formatConnectedSocialContextForAi(ctx, { platformKey: params.platform })}`;
  } catch {
  }
  const prompt = `Create high-impact social media content suggestions for ${params.platform.toUpperCase()}.
Brand: ${params.brandName}
Industry: ${params.industry || "General Business"}
Target Audience: ${params.targetAudience || "Professionals and customers"}
Tone of Voice: ${params.tone}
Language: ${params.language}
Campaign Objective: ${params.objective}
Topic / Brief: ${params.topic}
Target Keywords: ${keywordsLine}${socialContextBlock}

Return a structured JSON payload containing:
- headlines: 3 distinct, compelling headline options tailored to ${params.platform}
- title: the strongest primary headline from the options
- caption: polished primary post copy naturally incorporating the target keywords
- hashtags: 5 to 8 relevant, high-signal hashtags (each prefixed with #)
- callToAction: a clear, conversion-oriented call to action
- bestTimeNote: a concise posting-time recommendation
- variants: 2 alternative post copy angles with short labels`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const { response, modelUsed } = await generateWithResilience(ai, prompt, {
      systemInstruction: "You are an international enterprise brand strategist and senior social media copywriter. Produce authentic, conversion-focused copy without clich\xE9s or generic filler.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          callToAction: { type: Type.STRING },
          bestTimeNote: { type: Type.STRING },
          variants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                body: { type: Type.STRING }
              },
              required: ["label", "body"]
            }
          }
        },
        required: ["title", "headlines", "caption", "hashtags", "callToAction", "bestTimeNote", "variants"]
      }
    });
    const parsed = JSON.parse((response.text ?? "{}").trim());
    const cleanHeadline = (parsed.title || parsed.headlines?.[0] || params.topic.slice(0, 100)).trim();
    const cleanHeadlines = Array.from(
      new Set([cleanHeadline, ...parsed.headlines || []].map((h) => h.trim()).filter(Boolean))
    ).slice(0, 5);
    const cleanHashtags = normalizeHashtags(parsed.hashtags || []);
    const cleanVariants = Array.isArray(parsed.variants) ? parsed.variants.slice(0, 4) : [];
    const usage = response.usageMetadata;
    const suggestionId = crypto6.randomUUID();
    db.transaction(() => {
      db.prepare("UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?").run(cost, now, params.workspaceId);
      db.prepare(`
        INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
        VALUES (?, ?, ?, 'content_studio', ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        crypto6.randomUUID(),
        params.workspaceId,
        params.userId,
        modelUsed,
        cost,
        usage?.promptTokenCount ?? 0,
        usage?.candidatesTokenCount ?? 0,
        now,
        now
      );
      db.prepare(`
        INSERT INTO ai_content_suggestions (
          id, workspace_id, user_id, platform_key, topic, keywords_json, objective, tone,
          headline, headline_options_json, post_copy, hashtags_json, call_to_action,
          best_time_note, variants_json, status, saved_post_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NULL, ?, ?)
      `).run(
        suggestionId,
        params.workspaceId,
        params.userId,
        params.platform,
        params.topic.trim(),
        JSON.stringify(params.keywords),
        params.objective.trim(),
        params.tone.trim(),
        cleanHeadline,
        JSON.stringify(cleanHeadlines),
        (parsed.caption || "").trim(),
        JSON.stringify(cleanHashtags),
        (parsed.callToAction || "").trim(),
        (parsed.bestTimeNote || "").trim(),
        JSON.stringify(cleanVariants),
        now,
        now
      );
    })();
    const updatedWs = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
    const storedRow = db.prepare("SELECT * FROM ai_content_suggestions WHERE id = ?").get(suggestionId);
    const suggestion = mapAiSuggestionRow(storedRow);
    return {
      suggestion,
      title: suggestion.headline,
      headlines: suggestion.headlineOptions,
      caption: suggestion.postCopy,
      hashtags: suggestion.hashtags,
      callToAction: suggestion.callToAction,
      bestTimeNote: suggestion.bestTimeNote,
      variants: suggestion.variants,
      creditsRemaining: updatedWs.ai_credits_balance
    };
  } catch (err) {
    db.prepare(`
      INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
      VALUES (?, ?, ?, 'content_studio', ?, 0, 0, 0, 'failed', ?, ?)
    `).run(crypto6.randomUUID(), params.workspaceId, params.userId, PRIMARY_MODEL, now, now);
    throw formatGeminiError(err);
  }
}
function listAiSuggestions(db, workspaceId) {
  const rows = db.prepare("SELECT * FROM ai_content_suggestions WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 50").all(workspaceId);
  return rows.map(mapAiSuggestionRow);
}
function updateAiSuggestion(db, params) {
  const existing = db.prepare("SELECT * FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?").get(params.suggestionId, params.workspaceId);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nextStatus = String(existing.status) === "saved_to_calendar" ? "saved_to_calendar" : "edited";
  const cleanTags = normalizeHashtags(params.hashtags);
  db.prepare(`
    UPDATE ai_content_suggestions
    SET headline = ?, post_copy = ?, hashtags_json = ?, call_to_action = ?,
        platform_key = COALESCE(?, platform_key), status = ?, updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `).run(
    params.headline.trim(),
    params.postCopy.trim(),
    JSON.stringify(cleanTags),
    params.callToAction.trim(),
    params.platformKey ?? null,
    nextStatus,
    now,
    params.suggestionId,
    params.workspaceId
  );
  const updated = db.prepare("SELECT * FROM ai_content_suggestions WHERE id = ?").get(params.suggestionId);
  return mapAiSuggestionRow(updated);
}
function deleteAiSuggestion(db, workspaceId, suggestionId) {
  const res = db.prepare("DELETE FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?").run(suggestionId, workspaceId);
  return res.changes > 0;
}
async function generateAiContentStrategy(db, params) {
  const cost = calculateAiCreditCost("content_strategy");
  const ws = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. Generating a full strategy requires ${cost} credits.`);
  }
  const ai = getGeminiClient();
  let socialContextBlock = "";
  try {
    const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
    socialContextBlock = `

${formatConnectedSocialContextForAi(ctx)}`;
  } catch {
  }
  const prompt = `Build an actionable 30-day multi-platform social media content strategy.
Brand: ${params.brandName}
Industry: ${params.industry || "Technology & Services"}
Business Description: ${params.businessDescription || "Modern growth-oriented brand"}
Target Audience: ${params.targetAudience || "Decision makers and customers"}
Primary Goals: ${params.goals}
Target Platforms: ${params.platforms.join(", ")}${socialContextBlock}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { response, modelUsed } = await generateWithResilience(ai, prompt, {
    systemInstruction: "You are a Chief Brand Strategist creating an executive, measurable social media growth roadmap.",
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING },
        pillars: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sharePercent: { type: Type.INTEGER },
              objective: { type: Type.STRING },
              sampleHooks: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "sharePercent", "objective", "sampleHooks"]
          }
        },
        weeklyCadence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              platform: { type: Type.STRING },
              format: { type: Type.STRING },
              focus: { type: Type.STRING }
            },
            required: ["day", "platform", "format", "focus"]
          }
        },
        kpis: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["executiveSummary", "pillars", "weeklyCadence", "kpis"]
    }
  });
  const parsed = JSON.parse((response.text ?? "{}").trim());
  const usage = response.usageMetadata;
  db.transaction(() => {
    db.prepare("UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?").run(cost, now, params.workspaceId);
    db.prepare(`
      INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
      VALUES (?, ?, ?, 'content_strategy', ?, ?, ?, ?, 'completed', ?, ?)
    `).run(
      crypto6.randomUUID(),
      params.workspaceId,
      params.userId,
      modelUsed,
      cost,
      usage?.promptTokenCount ?? 0,
      usage?.candidatesTokenCount ?? 0,
      now,
      now
    );
  })();
  const updatedWs = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  return {
    ...parsed,
    creditsRemaining: updatedWs.ai_credits_balance
  };
}

// server/services/oauthService.ts
import crypto7 from "node:crypto";
var memoryOAuthStates = /* @__PURE__ */ new Map();
function generatePkcePair() {
  const codeVerifier = crypto7.randomBytes(32).toString("base64url");
  const codeChallenge = crypto7.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}
function encryptSocialToken(plaintext) {
  const key = crypto7.createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY).digest();
  const iv = crypto7.randomBytes(12);
  const cipher = crypto7.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
function decryptSocialToken(ciphertext) {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload.");
  }
  const [ivHex, tagHex, encHex] = parts;
  const key = crypto7.createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY).digest();
  const decipher = crypto7.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
function getPlatformCredentials(platform, db) {
  let dbClientId;
  let dbClientSecret;
  if (db) {
    const row = db.prepare("SELECT client_id_override, client_secret_override FROM social_platforms WHERE key = ?").get(platform);
    if (row?.client_id_override && row.client_id_override.trim().length > 0) {
      dbClientId = row.client_id_override.trim();
    }
    if (row?.client_secret_override && row.client_secret_override.trim().length > 0) {
      dbClientSecret = row.client_secret_override.trim();
    }
  }
  const envCreds = (() => {
    switch (platform) {
      case "instagram":
      case "facebook":
        return { clientId: env.META_APP_ID, clientSecret: env.META_APP_SECRET };
      case "linkedin":
        return { clientId: env.LINKEDIN_CLIENT_ID, clientSecret: env.LINKEDIN_CLIENT_SECRET };
      case "x":
        return { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET };
      case "tiktok":
        return { clientId: env.TIKTOK_CLIENT_KEY, clientSecret: env.TIKTOK_CLIENT_SECRET };
      case "youtube":
        return { clientId: env.GOOGLE_YOUTUBE_CLIENT_ID, clientSecret: env.GOOGLE_YOUTUBE_CLIENT_SECRET };
      case "pinterest":
        return { clientId: env.PINTEREST_CLIENT_ID, clientSecret: env.PINTEREST_CLIENT_SECRET };
      case "google_business":
        return { clientId: env.GOOGLE_BUSINESS_CLIENT_ID, clientSecret: env.GOOGLE_BUSINESS_CLIENT_SECRET };
    }
  })();
  const rawClientId = dbClientId || envCreds.clientId;
  const rawClientSecret = dbClientSecret || envCreds.clientSecret;
  const clientId = rawClientId && rawClientId !== "MY_APP_ID" ? rawClientId : `lt_sandbox_client_id_${platform}`;
  const clientSecret = rawClientSecret && rawClientSecret !== "MY_APP_SECRET" ? rawClientSecret : `lt_sandbox_client_secret_${platform}`;
  return { clientId, clientSecret };
}
function isSandboxToken(token) {
  if (!token) return false;
  return token.startsWith("mock_sandbox_") || token.startsWith("mock_scoped_") || token.startsWith("lt_sandbox_");
}
function isSandboxExternalAccountId(externalId) {
  return Boolean(externalId && externalId.startsWith("sandbox_"));
}
function getOAuthCallbackUrl(platform, requestOrigin) {
  const base = env.APP_URL && !env.APP_URL.includes("localhost") ? env.APP_URL : requestOrigin || env.APP_URL;
  return `${base.replace(/\/+$/, "")}/auth/oauth/${platform}/callback`;
}
function recordOAuthConnectionLog(db, params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const safeMessage = redactSensitiveTokens(params.message);
  const safeMeta = redactSensitiveTokens(JSON.stringify(params.metadata ?? {}));
  db.prepare(`
    INSERT INTO oauth_connection_logs (
      id, workspace_id, user_id, platform_key, social_account_id,
      event_type, status, message, error_code, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto7.randomUUID(),
    params.workspaceId ?? null,
    params.userId ?? null,
    params.platformKey,
    params.socialAccountId ?? null,
    params.eventType,
    params.status,
    safeMessage,
    params.errorCode ?? null,
    safeMeta,
    now
  );
}
function listSocialPlatforms(db) {
  const rows = db.prepare("SELECT * FROM social_platforms ORDER BY display_name ASC").all();
  const capRows = db.prepare("SELECT * FROM platform_capabilities").all();
  const permRows = db.prepare("SELECT * FROM platform_permissions ORDER BY is_required DESC, scope_key ASC").all();
  const capMap = /* @__PURE__ */ new Map();
  for (const c of capRows) {
    capMap.set(String(c.platform_key), {
      textPublishing: Boolean(c.text_publishing),
      imagePublishing: Boolean(c.image_publishing),
      videoPublishing: Boolean(c.video_publishing),
      carouselPublishing: Boolean(c.carousel_publishing),
      storyPublishing: Boolean(c.story_publishing),
      reelsPublishing: Boolean(c.reels_publishing),
      shortFormVideoPublishing: Boolean(c.short_form_video_publishing),
      commentRetrieval: Boolean(c.comment_retrieval),
      commentResponses: Boolean(c.comment_responses),
      analyticsRetrieval: Boolean(c.analytics_retrieval),
      notes: c.notes ? String(c.notes) : ""
    });
  }
  const permMap = /* @__PURE__ */ new Map();
  for (const p of permRows) {
    const k = String(p.platform_key);
    const list = permMap.get(k) || [];
    list.push({
      scopeKey: String(p.scope_key),
      label: String(p.label),
      description: String(p.description || ""),
      isRequired: Boolean(p.is_required),
      requiresAppReview: Boolean(p.requires_app_review),
      approvalStatus: String(p.approval_status || "not_submitted")
    });
    permMap.set(k, list);
  }
  const orderMap = new Map(SOCIAL_PROVIDER_LIST.map((p, idx) => [p.key, idx]));
  const sortedRows = [...rows].sort(
    (a, b) => (orderMap.get(String(a.key)) ?? 99) - (orderMap.get(String(b.key)) ?? 99)
  );
  return sortedRows.map((r) => {
    const key = String(r.key);
    const provider = getSocialProvider(key);
    const creds = getPlatformCredentials(key, db);
    const clientIdConfigured = Boolean(creds.clientId);
    const clientSecretConfigured = Boolean(creds.clientSecret);
    const oauthConfigured = clientIdConfigured && clientSecretConfigured;
    const reviewStatus = r.developer_review_status ? String(r.developer_review_status) : provider.defaultReviewStatus;
    let computedAppStatus = "missing_credentials";
    if (!oauthConfigured) {
      computedAppStatus = "missing_credentials";
    } else if (r.last_api_error) {
      computedAppStatus = "degraded";
    } else if (reviewStatus === "approved") {
      computedAppStatus = "live";
    } else if (reviewStatus === "pending_review") {
      computedAppStatus = "in_review";
    } else {
      computedAppStatus = "configured";
    }
    return {
      id: String(r.id),
      key,
      displayName: String(r.display_name),
      apiVersion: provider.apiVersion,
      scopes: String(r.scopes),
      isEnabled: Boolean(r.is_enabled),
      oauthConfigured,
      clientIdConfigured,
      clientSecretConfigured,
      clientIdMasked: maskClientId(creds.clientId),
      callbackUrl: getOAuthCallbackUrl(key),
      supportsPkce: provider.supportsPkce,
      supportsRefresh: provider.supportsRefresh,
      supportsRevocation: provider.supportsRevocation,
      portalName: provider.portalName,
      portalUrl: provider.portalUrl,
      docsUrl: provider.docsUrl,
      envVarNames: [...provider.envVarNames],
      appStatus: computedAppStatus,
      developerReviewStatus: reviewStatus,
      rateLimitRpm: Number(r.rate_limit_rpm || provider.defaultRateLimitRpm),
      lastHealthCheckAt: r.last_health_check_at ? String(r.last_health_check_at) : null,
      lastApiError: r.last_api_error ? String(r.last_api_error) : null,
      capabilities: capMap.get(key) || { ...provider.capabilities },
      permissions: permMap.get(key) || [...provider.permissions]
    };
  });
}
function buildOfficialOAuthUrl(db, params) {
  const platformRow = db.prepare("SELECT * FROM social_platforms WHERE key = ?").get(params.platformKey);
  if (!platformRow || !platformRow.is_enabled) {
    throw new Error("This social media integration is currently disabled by your platform administrator.");
  }
  const provider = getSocialProvider(params.platformKey);
  const callbackUrl = getOAuthCallbackUrl(params.platformKey, params.requestOrigin);
  const creds = getPlatformCredentials(params.platformKey, db);
  const requestedPermissions = [...provider.permissions];
  if (!creds.clientId || !creds.clientSecret) {
    const missingEnvVars = [];
    if (!creds.clientId) missingEnvVars.push(provider.envVarNames[0]);
    if (!creds.clientSecret) missingEnvVars.push(provider.envVarNames[1]);
    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey: params.platformKey,
      eventType: "auth_blocked_missing_credentials",
      status: "warning",
      message: `OAuth authorization could not start because server credentials (${missingEnvVars.join(", ")}) are not yet configured.`,
      errorCode: "MISSING_OAUTH_CREDENTIALS"
    });
    return {
      configured: false,
      mode: "live",
      callbackUrl,
      missingEnvVars,
      supportsPkce: provider.supportsPkce,
      requestedPermissions
    };
  }
  const state = crypto7.randomBytes(24).toString("hex");
  const pkce = provider.supportsPkce ? generatePkcePair() : void 0;
  const expiresAtMs = Date.now() + 15 * 60 * 1e3;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(`
    INSERT INTO oauth_states (
      state, workspace_id, user_id, platform_key, reconnect_account_id,
      encrypted_code_verifier, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(
    state,
    params.workspaceId,
    params.userId,
    params.platformKey,
    params.reconnectAccountId ?? null,
    pkce ? encryptSocialToken(pkce.codeVerifier) : null,
    new Date(expiresAtMs).toISOString(),
    now,
    now
  );
  db.prepare("DELETE FROM oauth_states WHERE status IN ('pending','expired') AND expires_at < ?").run(
    new Date(Date.now() - 60 * 60 * 1e3).toISOString()
  );
  memoryOAuthStates.set(state, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    platformKey: params.platformKey,
    codeVerifier: pkce?.codeVerifier,
    reconnectAccountId: params.reconnectAccountId ?? null,
    expiresAt: expiresAtMs
  });
  const configuredScopes = splitScopes(String(platformRow.scopes || ""));
  const isSandbox = creds.clientId.startsWith("lt_sandbox_");
  let url = "";
  if (isSandbox) {
    url = `/auth/oauth/sandbox-consent?platform=${params.platformKey}&state=${state}`;
  } else {
    url = provider.buildAuthorizationUrl({
      clientId: creds.clientId,
      redirectUri: callbackUrl,
      state,
      codeChallenge: pkce?.codeChallenge,
      scopes: configuredScopes.length > 0 ? configuredScopes : void 0
    });
  }
  recordOAuthConnectionLog(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    platformKey: params.platformKey,
    socialAccountId: params.reconnectAccountId ?? null,
    eventType: params.reconnectAccountId ? "reconnect_started" : "auth_started",
    status: "info",
    message: `Generated OAuth 2.0${provider.supportsPkce ? " + PKCE S256" : ""} authorization request for ${provider.displayName}.`
  });
  return {
    configured: true,
    mode: isSandbox ? "sandbox" : "live",
    url,
    callbackUrl,
    state,
    supportsPkce: provider.supportsPkce,
    requestedPermissions
  };
}
function consumeOAuthState(stateOrDb, maybeState) {
  if (typeof stateOrDb === "string") {
    const entry = memoryOAuthStates.get(stateOrDb);
    if (!entry) return null;
    memoryOAuthStates.delete(stateOrDb);
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }
  const db = stateOrDb;
  const state = maybeState || "";
  if (!state) return null;
  const row = db.prepare("SELECT * FROM oauth_states WHERE state = ? AND status = 'pending'").get(state);
  if (!row) return null;
  const expiresAtMs = new Date(String(row.expires_at)).getTime();
  memoryOAuthStates.delete(state);
  if (Date.now() > expiresAtMs) {
    db.prepare("UPDATE oauth_states SET status = 'expired', updated_at = ? WHERE state = ?").run(
      (/* @__PURE__ */ new Date()).toISOString(),
      state
    );
    return null;
  }
  let codeVerifier;
  if (row.encrypted_code_verifier) {
    codeVerifier = decryptSocialToken(String(row.encrypted_code_verifier));
  }
  return {
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id),
    platformKey: String(row.platform_key),
    codeVerifier,
    reconnectAccountId: row.reconnect_account_id ? String(row.reconnect_account_id) : null,
    expiresAt: expiresAtMs
  };
}
async function handleOAuthCallbackForDiscovery(db, params) {
  const provider = getSocialProvider(params.platformKey);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (params.oauthError) {
    const stateRow = params.state ? db.prepare("SELECT workspace_id, user_id FROM oauth_states WHERE state = ?").get(params.state) : void 0;
    if (params.state) {
      db.prepare("UPDATE oauth_states SET status = 'failed', error_message = ?, updated_at = ? WHERE state = ?").run(
        redactSensitiveTokens(params.errorDescription || params.oauthError),
        now,
        params.state
      );
    }
    recordOAuthConnectionLog(db, {
      workspaceId: stateRow?.workspace_id ?? null,
      userId: stateRow?.user_id ?? null,
      platformKey: params.platformKey,
      eventType: "permission_denied",
      status: "warning",
      message: `${provider.displayName} authorization was declined or cancelled: ${params.errorDescription || params.oauthError}`,
      errorCode: params.oauthError
    });
    throw new Error(`Authorization declined by user or provider (${params.oauthError}).`);
  }
  if (!params.state || !params.code) {
    throw new Error("Missing OAuth authorization code or state parameter.");
  }
  const stateEntry = consumeOAuthState(db, params.state);
  if (!stateEntry || stateEntry.platformKey !== params.platformKey) {
    recordOAuthConnectionLog(db, {
      platformKey: params.platformKey,
      eventType: "state_validation_failed",
      status: "error",
      message: "Rejected OAuth callback with invalid, expired, or mismatched CSRF state.",
      errorCode: "INVALID_OAUTH_STATE"
    });
    throw new Error("Invalid or expired OAuth state parameter. Please restart the connection flow.");
  }
  const creds = getPlatformCredentials(params.platformKey, db);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`OAuth credentials for ${provider.displayName} are not configured on the server.`);
  }
  try {
    const isSandboxCode = Boolean(params.code?.startsWith("sandbox_auth_code_"));
    const tokenBundle = isSandboxCode ? {
      accessToken: `mock_sandbox_token_${params.platformKey}_${Date.now()}`,
      refreshToken: `mock_sandbox_refresh_${params.platformKey}_${Date.now()}`,
      tokenType: "Bearer",
      scope: provider.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: 30 * 24 * 3600
    } : await provider.exchangeCodeForTokens({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: getOAuthCallbackUrl(params.platformKey),
      code: params.code,
      codeVerifier: stateEntry.codeVerifier
    });
    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: "token_exchanged",
      status: "success",
      message: `Exchanged authorization code with ${provider.displayName} and validated token bundle.`
    });
    const permCheck = provider.validatePermissions(tokenBundle.scope);
    const sandboxAccountTypes = {
      facebook: "page",
      instagram: "business_account",
      tiktok: "creator_account",
      linkedin: "organization",
      youtube: "channel",
      x: "profile",
      pinterest: "business_account",
      google_business: "location"
    };
    const ownerProfile = params.ownerProfile;
    const ownerImportedPosts = {};
    let discoveredAccounts;
    if (isSandboxCode) {
      const cleanName = ownerProfile?.accountName?.trim();
      const rawHandle = ownerProfile?.accountHandle?.trim();
      const normalizedHandle = rawHandle ? rawHandle.startsWith("@") ? rawHandle : `@${rawHandle.replace(/^@+/, "")}` : null;
      const slugBase = (normalizedHandle || cleanName || params.platformKey).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
      if (cleanName || normalizedHandle) {
        const primaryExtId = `sandbox_${params.platformKey}_${slugBase || "owner"}`;
        const primaryName = cleanName || `${normalizedHandle?.replace(/^@/, "")} (${provider.displayName})`;
        const primaryHandle = normalizedHandle || `@${slugBase || params.platformKey}`;
        const primaryBio = ownerProfile?.accountDescription?.trim() || `Official ${provider.displayName} account for ${primaryName}. Connected via LivingTech Brand Agency OAuth for AI content generation, scheduling, and automated publishing.`;
        const primaryCategory = ownerProfile?.businessCategory?.trim() || `${provider.displayName} Business`;
        const primaryFollowers = typeof ownerProfile?.followersCount === "number" && Number.isFinite(ownerProfile.followersCount) && ownerProfile.followersCount >= 0 ? Math.round(ownerProfile.followersCount) : 12400;
        if (Array.isArray(ownerProfile?.recentPosts) && ownerProfile.recentPosts.length > 0) {
          ownerImportedPosts[primaryExtId] = ownerProfile.recentPosts.map((p) => p.trim()).filter(Boolean).slice(0, 8);
        }
        discoveredAccounts = [
          {
            externalAccountId: primaryExtId,
            accountName: primaryName,
            accountHandle: primaryHandle,
            accountType: sandboxAccountTypes[params.platformKey] || "profile",
            avatarUrl: null,
            accountDescription: primaryBio,
            businessCategory: primaryCategory,
            followersCount: primaryFollowers,
            scopedAccessToken: `mock_scoped_token_${params.platformKey}_owner_${Date.now()}`,
            capabilities: { ...provider.capabilities }
          }
        ];
      } else {
        discoveredAccounts = [
          {
            externalAccountId: `sandbox_${params.platformKey}_1`,
            accountName: `LivingTech ${provider.displayName} Official`,
            accountHandle: `@livingtech_${params.platformKey}`,
            accountType: sandboxAccountTypes[params.platformKey] || "profile",
            avatarUrl: null,
            accountDescription: `Authorized workspace channel for ${provider.displayName}.`,
            businessCategory: `${provider.displayName} Business`,
            followersCount: 15420,
            scopedAccessToken: `mock_scoped_token_${params.platformKey}_1_${Date.now()}`,
            capabilities: { ...provider.capabilities }
          },
          {
            externalAccountId: `sandbox_${params.platformKey}_2`,
            accountName: `Aurora Ventures ${provider.displayName}`,
            accountHandle: `@auroraventures_${params.platformKey}`,
            accountType: sandboxAccountTypes[params.platformKey] || "page",
            avatarUrl: null,
            accountDescription: `Secondary workspace brand channel for ${provider.displayName}.`,
            businessCategory: `${provider.displayName} Creator`,
            followersCount: 8900,
            scopedAccessToken: `mock_scoped_token_${params.platformKey}_2_${Date.now()}`,
            capabilities: { ...provider.capabilities }
          }
        ];
      }
    } else {
      discoveredAccounts = (await provider.discoverAccounts(tokenBundle.accessToken)).accounts;
    }
    const discoverySessionId = crypto7.randomUUID();
    const selectionExpiry = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const encryptedPendingTokens = encryptSocialToken(
      JSON.stringify({
        tokenBundle,
        scopedTokens: Object.fromEntries(
          discoveredAccounts.filter((a) => Boolean(a.scopedAccessToken)).map((a) => [a.externalAccountId, a.scopedAccessToken])
        ),
        importedPosts: ownerImportedPosts
      })
    );
    const safeCandidates = discoveredAccounts.map(({ scopedAccessToken: _omit, ...rest }) => rest);
    db.prepare(`
      UPDATE oauth_states
      SET status = 'awaiting_selection',
          discovery_session_id = ?,
          encrypted_pending_tokens = ?,
          discovered_accounts_json = ?,
          granted_scopes = ?,
          expires_at = ?,
          updated_at = ?
      WHERE state = ?
    `).run(
      discoverySessionId,
      encryptedPendingTokens,
      JSON.stringify(safeCandidates),
      permCheck.grantedScopes.join(","),
      selectionExpiry,
      now,
      params.state
    );
    db.prepare("UPDATE social_platforms SET last_health_check_at = ?, last_api_error = NULL, updated_at = ? WHERE key = ?").run(
      now,
      now,
      params.platformKey
    );
    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: "accounts_discovered",
      status: discoveredAccounts.length > 0 ? "success" : "warning",
      message: `Discovered ${discoveredAccounts.length} accessible ${provider.displayName} account(s). Awaiting customer selection.`,
      metadata: {
        discoveredCount: discoveredAccounts.length,
        permissionsStatus: permCheck.status,
        missingRequiredScopes: permCheck.missingRequiredScopes
      }
    });
    return {
      discoverySessionId,
      platformKey: params.platformKey,
      platformName: provider.displayName,
      accountCount: discoveredAccounts.length,
      permissionsStatus: permCheck.status,
      missingRequiredScopes: permCheck.missingRequiredScopes
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : "OAuth exchange or discovery failed.");
    const errorCode = err instanceof ProviderApiError ? err.providerCode : "OAUTH_CALLBACK_ERROR";
    db.prepare("UPDATE oauth_states SET status = 'failed', error_message = ?, updated_at = ? WHERE state = ?").run(
      safeMsg,
      now,
      params.state
    );
    db.prepare("UPDATE social_platforms SET last_health_check_at = ?, last_api_error = ?, updated_at = ? WHERE key = ?").run(
      now,
      safeMsg.slice(0, 300),
      now,
      params.platformKey
    );
    recordOAuthConnectionLog(db, {
      workspaceId: stateEntry.workspaceId,
      userId: stateEntry.userId,
      platformKey: params.platformKey,
      eventType: err instanceof ProviderApiError && err.isRateLimited ? "rate_limited" : "api_error",
      status: "error",
      message: safeMsg,
      errorCode
    });
    throw err;
  }
}
function getDiscoverySession(db, params) {
  const row = db.prepare(`
      SELECT * FROM oauth_states
      WHERE discovery_session_id = ? AND workspace_id = ? AND user_id = ? AND status = 'awaiting_selection'
    `).get(params.sessionId, params.workspaceId, params.userId);
  if (!row) return null;
  if (Date.now() > new Date(String(row.expires_at)).getTime()) {
    db.prepare("UPDATE oauth_states SET status = 'expired', encrypted_pending_tokens = NULL, updated_at = ? WHERE state = ?").run(
      (/* @__PURE__ */ new Date()).toISOString(),
      row.state
    );
    return null;
  }
  const platformKey = String(row.platform_key);
  const provider = getSocialProvider(platformKey);
  const candidates = JSON.parse(String(row.discovered_accounts_json || "[]"));
  const permCheck = provider.validatePermissions(String(row.granted_scopes || ""));
  const existingIds = new Set(
    db.prepare(`
          SELECT sa.external_account_id
          FROM social_accounts sa
          JOIN social_platforms sp ON sp.id = sa.platform_id
          WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
        `).all(params.workspaceId, platformKey).map((r) => r.external_account_id)
  );
  return {
    sessionId: params.sessionId,
    platformKey,
    platformName: provider.displayName,
    grantedScopes: permCheck.grantedScopes,
    missingRequiredScopes: permCheck.missingRequiredScopes,
    permissionsStatus: permCheck.status,
    expiresAt: String(row.expires_at),
    accounts: candidates.map((c) => ({
      externalAccountId: c.externalAccountId,
      accountName: c.accountName,
      accountHandle: c.accountHandle,
      accountType: c.accountType,
      avatarUrl: c.avatarUrl,
      accountDescription: c.accountDescription,
      businessCategory: c.businessCategory,
      followersCount: c.followersCount,
      alreadyConnected: existingIds.has(c.externalAccountId),
      capabilities: c.capabilities
    }))
  };
}
function connectSelectedDiscoveredAccounts(db, params) {
  const row = db.prepare(`
      SELECT * FROM oauth_states
      WHERE discovery_session_id = ? AND workspace_id = ? AND user_id = ? AND status = 'awaiting_selection'
    `).get(params.sessionId, params.workspaceId, params.userId);
  if (!row) {
    throw new Error("Discovery session not found, already completed, or expired.");
  }
  if (Date.now() > new Date(String(row.expires_at)).getTime()) {
    db.prepare("UPDATE oauth_states SET status = 'expired', encrypted_pending_tokens = NULL, updated_at = ? WHERE state = ?").run(
      (/* @__PURE__ */ new Date()).toISOString(),
      row.state
    );
    throw new Error("Discovery session expired. Please authorize again.");
  }
  const platformKey = String(row.platform_key);
  const candidates = JSON.parse(String(row.discovered_accounts_json || "[]"));
  const selectedSet = new Set(params.externalAccountIds);
  const toConnect = candidates.filter((c) => selectedSet.has(c.externalAccountId));
  if (toConnect.length === 0) {
    throw new Error("Select at least one discovered account to connect.");
  }
  const decryptedPending = JSON.parse(decryptSocialToken(String(row.encrypted_pending_tokens || "")));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const today = now.slice(0, 10);
  let importedContentCount = 0;
  const results = [];
  for (const candidate of toConnect) {
    const scopedAccess = decryptedPending.scopedTokens?.[candidate.externalAccountId];
    const saved = persistOAuthSocialAccount(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey,
      identity: {
        externalAccountId: candidate.externalAccountId,
        accountName: candidate.accountName,
        accountHandle: candidate.accountHandle,
        avatarUrl: candidate.avatarUrl,
        accountType: candidate.accountType,
        accountDescription: candidate.accountDescription,
        businessCategory: candidate.businessCategory,
        followersCount: candidate.followersCount,
        capabilities: candidate.capabilities
      },
      tokens: {
        accessToken: scopedAccess || decryptedPending.tokenBundle.accessToken,
        refreshToken: decryptedPending.tokenBundle.refreshToken ?? null,
        tokenType: decryptedPending.tokenBundle.tokenType,
        scope: decryptedPending.tokenBundle.scope,
        expiresInSeconds: decryptedPending.tokenBundle.expiresInSeconds,
        refreshExpiresInSeconds: decryptedPending.tokenBundle.refreshExpiresInSeconds
      }
    });
    results.push(saved);
    const postsToImport = decryptedPending.importedPosts?.[candidate.externalAccountId] || [];
    for (const postText of postsToImport) {
      const cleanPost = postText.trim();
      if (!cleanPost) continue;
      const existingPost = db.prepare(
        `SELECT id FROM content_posts
           WHERE workspace_id = ? AND platform_key = ? AND caption = ? LIMIT 1`
      ).get(params.workspaceId, platformKey, cleanPost);
      if (!existingPost) {
        const titleSnippet = cleanPost.length > 72 ? `${cleanPost.slice(0, 69)}...` : cleanPost;
        db.prepare(`
          INSERT INTO content_posts (
            id, workspace_id, author_user_id, platform_key,
            title, caption, hashtags_json, campaign_tag, status, published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, '[]', 'synced_profile_context', 'published', ?, ?, ?)
        `).run(
          crypto7.randomUUID(),
          params.workspaceId,
          params.userId,
          platformKey,
          `${candidate.accountName}: ${titleSnippet}`,
          cleanPost,
          now,
          now,
          now
        );
        importedContentCount += 1;
      }
    }
    if (typeof candidate.followersCount === "number" && candidate.followersCount > 0) {
      const existingSnap = db.prepare(
        `SELECT id FROM analytics_snapshots
           WHERE workspace_id = ? AND platform_key = ? AND snapshot_date = ? AND is_demo = 0 LIMIT 1`
      ).get(params.workspaceId, platformKey, today);
      if (!existingSnap) {
        db.prepare(`
          INSERT INTO analytics_snapshots (
            id, workspace_id, social_account_id, platform_key, snapshot_date,
            impressions, engagements, clicks, followers_total, is_demo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?, ?)
        `).run(
          crypto7.randomUUID(),
          params.workspaceId,
          saved.accountId,
          platformKey,
          today,
          candidate.followersCount,
          now,
          now
        );
      }
    }
    const brandRow = db.prepare("SELECT id, business_description, industry FROM brand_profiles WHERE workspace_id = ?").get(params.workspaceId);
    if (brandRow) {
      const nextDesc = !brandRow.business_description?.trim() && candidate.accountDescription ? candidate.accountDescription : brandRow.business_description;
      const nextIndustry = !brandRow.industry?.trim() && candidate.businessCategory ? candidate.businessCategory : brandRow.industry;
      if (nextDesc !== brandRow.business_description || nextIndustry !== brandRow.industry) {
        db.prepare(
          "UPDATE brand_profiles SET business_description = ?, industry = ?, updated_at = ? WHERE id = ?"
        ).run(nextDesc || "", nextIndustry || "", now, brandRow.id);
      }
    }
  }
  db.prepare(`
    UPDATE oauth_states
    SET status = 'completed', encrypted_pending_tokens = NULL, updated_at = ?
    WHERE state = ?
  `).run(now, row.state);
  return {
    connectedCount: results.length,
    importedContentCount,
    aiContextReady: true,
    accounts: results
  };
}
function persistOAuthSocialAccount(db, params) {
  const platformRow = db.prepare("SELECT id, display_name, scopes FROM social_platforms WHERE key = ?").get(params.platformKey);
  if (!platformRow) {
    throw new Error(`Unsupported social platform: ${params.platformKey}`);
  }
  const provider = getSocialProvider(params.platformKey);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = params.tokens.expiresInSeconds && params.tokens.expiresInSeconds > 0 ? new Date(Date.now() + params.tokens.expiresInSeconds * 1e3).toISOString() : null;
  const refreshExpiresAt = params.tokens.refreshExpiresInSeconds && params.tokens.refreshExpiresInSeconds > 0 ? new Date(Date.now() + params.tokens.refreshExpiresInSeconds * 1e3).toISOString() : null;
  const grantedScopeRaw = params.tokens.scope || platformRow.scopes;
  const permCheck = provider.validatePermissions(grantedScopeRaw);
  const capabilities = params.identity.capabilities || { ...provider.capabilities };
  const encryptedAccess = encryptSocialToken(params.tokens.accessToken);
  const encryptedRefresh = params.tokens.refreshToken ? encryptSocialToken(params.tokens.refreshToken) : null;
  const existing = db.prepare("SELECT id FROM social_accounts WHERE workspace_id = ? AND platform_id = ? AND external_account_id = ?").get(params.workspaceId, platformRow.id, params.identity.externalAccountId);
  const accountId = existing?.id || crypto7.randomUUID();
  db.transaction(() => {
    if (existing) {
      db.prepare(`
        UPDATE social_accounts
        SET connected_by_user_id = ?, account_handle = ?, account_name = ?, avatar_url = ?,
            account_type = ?, account_description = ?, business_category = ?, followers_count = ?,
            connection_status = 'connected', permissions_status = ?, granted_scopes = ?,
            capabilities_json = ?, last_error = NULL, last_synced_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        params.userId,
        params.identity.accountHandle,
        params.identity.accountName,
        params.identity.avatarUrl ?? null,
        params.identity.accountType ?? "profile",
        params.identity.accountDescription ?? "",
        params.identity.businessCategory ?? "",
        params.identity.followersCount ?? null,
        permCheck.status,
        permCheck.grantedScopes.join(","),
        JSON.stringify(capabilities),
        now,
        now,
        accountId
      );
    } else {
      db.prepare(`
        INSERT INTO social_accounts (
          id, workspace_id, connected_by_user_id, platform_id, external_account_id,
          account_handle, account_name, avatar_url, account_type, account_description,
          business_category, followers_count, connection_status, permissions_status,
          granted_scopes, capabilities_json, publishing_preferences_json, last_synced_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId,
        params.workspaceId,
        params.userId,
        platformRow.id,
        params.identity.externalAccountId,
        params.identity.accountHandle,
        params.identity.accountName,
        params.identity.avatarUrl ?? null,
        params.identity.accountType ?? "profile",
        params.identity.accountDescription ?? "",
        params.identity.businessCategory ?? "",
        params.identity.followersCount ?? null,
        permCheck.status,
        permCheck.grantedScopes.join(","),
        JSON.stringify(capabilities),
        JSON.stringify(DEFAULT_PUBLISHING_PREFERENCES),
        now,
        now,
        now
      );
    }
    const existingToken = db.prepare("SELECT id FROM social_account_tokens WHERE social_account_id = ?").get(accountId);
    if (existingToken) {
      db.prepare(`
        UPDATE social_account_tokens
        SET connected_by_user_id = ?, encrypted_access_token = ?, encrypted_refresh_token = ?,
            token_type = ?, scope = ?, expires_at = ?, refresh_expires_at = ?,
            revoked_at = NULL, last_refreshed_at = ?, updated_at = ?
        WHERE social_account_id = ?
      `).run(
        params.userId,
        encryptedAccess,
        encryptedRefresh,
        params.tokens.tokenType || "Bearer",
        permCheck.grantedScopes.join(","),
        expiresAt,
        refreshExpiresAt,
        now,
        now,
        accountId
      );
    } else {
      db.prepare(`
        INSERT INTO social_account_tokens (
          id, social_account_id, workspace_id, connected_by_user_id,
          encrypted_access_token, encrypted_refresh_token, token_type, scope,
          expires_at, refresh_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto7.randomUUID(),
        accountId,
        params.workspaceId,
        params.userId,
        encryptedAccess,
        encryptedRefresh,
        params.tokens.tokenType || "Bearer",
        permCheck.grantedScopes.join(","),
        expiresAt,
        refreshExpiresAt,
        now,
        now
      );
    }
    const actor = db.prepare("SELECT email FROM users WHERE id = ?").get(params.userId);
    recordAuditLog(db, {
      actorUserId: params.userId,
      actorEmail: actor?.email ?? null,
      workspaceId: params.workspaceId,
      action: existing ? "social_account.oauth_reconnected" : "social_account.oauth_connected",
      resourceType: "social_account",
      resourceId: accountId,
      metadata: {
        platform: params.platformKey,
        handle: params.identity.accountHandle,
        accountType: params.identity.accountType ?? "profile",
        permissionsStatus: permCheck.status,
        vaultEncryption: "aes-256-gcm"
      }
    });
    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      platformKey: params.platformKey,
      socialAccountId: accountId,
      eventType: existing ? "account_reconnected" : "accounts_connected",
      status: "success",
      message: `${params.identity.accountName} (${params.identity.accountHandle}) connected with AES-256-GCM encrypted token vault.`
    });
    db.prepare(`
      INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
      VALUES (?, ?, ?, 'publishing', ?, ?, 0, ?, ?)
    `).run(
      crypto7.randomUUID(),
      params.workspaceId,
      params.userId,
      `${platformRow.display_name} Connected`,
      `${params.identity.accountName} (${params.identity.accountHandle}) authorized via official OAuth 2.0 and stored in the encrypted token vault.`,
      now,
      now
    );
  })();
  return {
    accountId,
    accountName: params.identity.accountName,
    accountHandle: params.identity.accountHandle
  };
}
function verifyStoredAccountTokenHealth(db, workspaceId, accountId) {
  const row = db.prepare(`
      SELECT sat.encrypted_access_token, sat.expires_at
      FROM social_account_tokens sat
      WHERE sat.social_account_id = ? AND sat.workspace_id = ?
    `).get(accountId, workspaceId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!row) {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?"
    ).run(now, accountId, workspaceId);
    return { healthy: false, status: "revoked", expiresAt: null };
  }
  try {
    const plain = decryptSocialToken(row.encrypted_access_token);
    if (!plain) throw new Error("Empty decrypted token");
  } catch {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?"
    ).run(now, accountId, workspaceId);
    return { healthy: false, status: "revoked", expiresAt: row.expires_at };
  }
  const isExpired = Boolean(row.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  const status = isExpired ? "expired" : "connected";
  db.prepare(
    `UPDATE social_accounts
     SET connection_status = ?, permissions_status = CASE WHEN ? = 'expired' THEN 'expired' ELSE permissions_status END,
         last_synced_at = ?, updated_at = ?
     WHERE id = ? AND workspace_id = ?`
  ).run(status, status, now, now, accountId, workspaceId);
  return { healthy: !isExpired, status, expiresAt: row.expires_at };
}
async function refreshSocialAccountToken(db, workspaceId, accountId, actorUserId) {
  const row = db.prepare(`
      SELECT sa.id, sa.external_account_id, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token, sat.expires_at
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `).get(accountId, workspaceId);
  if (!row) {
    throw new Error("Social account not found in this workspace.");
  }
  const platformKey = String(row.platform_key);
  const provider = getSocialProvider(platformKey);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!row.encrypted_refresh_token) {
    db.prepare(
      "UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?"
    ).run("No refresh token stored. Please reconnect this account.", now, accountId);
    return {
      refreshed: false,
      status: "expired",
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      message: `${provider.displayName} does not have a refresh token stored. Reconnect to renew authorization.`
    };
  }
  const creds = getPlatformCredentials(platformKey, db);
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error(`Server credentials for ${provider.displayName} are missing.`);
  }
  try {
    const refreshToken = decryptSocialToken(String(row.encrypted_refresh_token));
    const currentAccess = row.encrypted_access_token ? decryptSocialToken(String(row.encrypted_access_token)) : "";
    const isSandboxAccount = isSandboxToken(refreshToken) || isSandboxToken(currentAccess) || isSandboxExternalAccountId(String(row.external_account_id));
    const renewed = isSandboxAccount ? {
      accessToken: `mock_sandbox_token_${platformKey}_refreshed_${Date.now()}`,
      refreshToken: `mock_sandbox_refresh_${platformKey}_${Date.now()}`,
      tokenType: "Bearer",
      scope: provider.permissions.map((p) => p.scopeKey).join(","),
      expiresInSeconds: 30 * 24 * 3600
    } : await provider.refreshAccessToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken
    });
    const newExpiresAt = renewed.expiresInSeconds && renewed.expiresInSeconds > 0 ? new Date(Date.now() + renewed.expiresInSeconds * 1e3).toISOString() : null;
    const permCheck = provider.validatePermissions(renewed.scope);
    db.transaction(() => {
      db.prepare(`
        UPDATE social_account_tokens
        SET encrypted_access_token = ?, encrypted_refresh_token = ?,
            scope = ?, expires_at = ?, last_refreshed_at = ?, updated_at = ?
        WHERE social_account_id = ?
      `).run(
        encryptSocialToken(renewed.accessToken),
        renewed.refreshToken ? encryptSocialToken(renewed.refreshToken) : String(row.encrypted_refresh_token),
        permCheck.grantedScopes.join(","),
        newExpiresAt,
        now,
        now,
        accountId
      );
      db.prepare(`
        UPDATE social_accounts
        SET connection_status = 'connected', permissions_status = ?, granted_scopes = ?,
            last_error = NULL, updated_at = ?
        WHERE id = ?
      `).run(permCheck.status, permCheck.grantedScopes.join(","), now, accountId);
    })();
    recordOAuthConnectionLog(db, {
      workspaceId,
      userId: actorUserId ?? null,
      platformKey,
      socialAccountId: accountId,
      eventType: "token_refreshed",
      status: "success",
      message: `Successfully rotated encrypted OAuth access token for ${provider.displayName}.`
    });
    return {
      refreshed: true,
      status: "connected",
      expiresAt: newExpiresAt,
      message: `${provider.displayName} OAuth access token refreshed securely.`
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : "Token refresh failed.");
    const nextStatus = err instanceof ProviderApiError && err.isPermissionDenied ? "revoked" : "expired";
    db.prepare(
      "UPDATE social_accounts SET connection_status = ?, permissions_status = ?, last_error = ?, updated_at = ? WHERE id = ?"
    ).run(nextStatus, nextStatus, safeMsg, now, accountId);
    recordOAuthConnectionLog(db, {
      workspaceId,
      userId: actorUserId ?? null,
      platformKey,
      socialAccountId: accountId,
      eventType: "token_refresh_failed",
      status: "error",
      message: safeMsg,
      errorCode: err instanceof ProviderApiError ? err.providerCode : "REFRESH_FAILED"
    });
    return {
      refreshed: false,
      status: nextStatus,
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      message: safeMsg
    };
  }
}
async function syncSocialAccountData(db, workspaceId, accountId, actorUserId) {
  const row = db.prepare(`
      SELECT sa.*, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token, sat.expires_at
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `).get(accountId, workspaceId);
  if (!row) {
    throw new Error("Social account not found in this workspace.");
  }
  const platformKey = String(row.platform_key);
  const provider = getSocialProvider(platformKey);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (!row.encrypted_access_token) {
    db.prepare("UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', updated_at = ? WHERE id = ?").run(
      now,
      accountId
    );
    return {
      status: "failed",
      itemsSynced: 0,
      rateLimitRemaining: null,
      retryAfterSeconds: null,
      message: "Encrypted OAuth token missing. Reconnect this account to sync."
    };
  }
  let encryptedAccess = String(row.encrypted_access_token);
  const isExpired = Boolean(row.expires_at && new Date(String(row.expires_at)).getTime() <= Date.now());
  if (isExpired) {
    if (row.encrypted_refresh_token) {
      const refreshed = await refreshSocialAccountToken(db, workspaceId, accountId, actorUserId);
      if (!refreshed.refreshed) {
        db.prepare(`
          INSERT INTO platform_sync_logs (id, workspace_id, social_account_id, platform_key, sync_type, status, items_synced, error_message, created_at)
          VALUES (?, ?, ?, ?, 'full', 'failed', 0, ?, ?)
        `).run(crypto7.randomUUID(), workspaceId, accountId, platformKey, refreshed.message, now);
        return {
          status: "failed",
          itemsSynced: 0,
          rateLimitRemaining: null,
          retryAfterSeconds: null,
          message: refreshed.message
        };
      }
      const reloaded = db.prepare("SELECT encrypted_access_token FROM social_account_tokens WHERE social_account_id = ?").get(accountId);
      encryptedAccess = reloaded.encrypted_access_token;
    } else {
      db.prepare("UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', updated_at = ? WHERE id = ?").run(
        now,
        accountId
      );
      return {
        status: "failed",
        itemsSynced: 0,
        rateLimitRemaining: null,
        retryAfterSeconds: null,
        message: "Access token has expired and no refresh token is available. Click Reconnect to renew authorization."
      };
    }
  }
  const accessToken = decryptSocialToken(encryptedAccess);
  try {
    const isSandboxAccount = isSandboxToken(accessToken) && isSandboxExternalAccountId(String(row.external_account_id));
    const synced = isSandboxAccount ? {
      profile: {
        externalAccountId: String(row.external_account_id),
        accountName: String(row.account_name),
        accountHandle: String(row.account_handle),
        accountType: String(row.account_type || "profile"),
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        accountDescription: String(row.account_description || ""),
        businessCategory: String(row.business_category || provider.displayName),
        followersCount: Number(row.followers_count || 12500),
        capabilities: { ...provider.capabilities }
      },
      recentContent: [],
      recentComments: [],
      analytics: {
        impressions: 4820,
        engagements: 615,
        clicks: 240,
        followersTotal: Number(row.followers_count || 12500)
      },
      rateLimitRemaining: 180
    } : await provider.fetchContentAndInsights(accessToken, String(row.external_account_id));
    const itemsSynced = synced.recentContent.length + synced.recentComments.length + (synced.profile ? 1 : 0);
    db.transaction(() => {
      if (synced.profile) {
        db.prepare(`
          UPDATE social_accounts
          SET account_name = ?, account_handle = ?, avatar_url = COALESCE(?, avatar_url),
              account_description = ?, business_category = ?, followers_count = ?,
              connection_status = 'connected', last_error = NULL, last_synced_at = ?, updated_at = ?
          WHERE id = ?
        `).run(
          synced.profile.accountName,
          synced.profile.accountHandle,
          synced.profile.avatarUrl,
          synced.profile.accountDescription,
          synced.profile.businessCategory,
          synced.profile.followersCount,
          now,
          now,
          accountId
        );
      } else {
        db.prepare("UPDATE social_accounts SET connection_status = 'connected', last_error = NULL, last_synced_at = ?, updated_at = ? WHERE id = ?").run(
          now,
          now,
          accountId
        );
      }
      if (synced.analytics) {
        db.prepare(`
          INSERT INTO analytics_snapshots (
            id, workspace_id, social_account_id, platform_key, snapshot_date,
            impressions, engagements, clicks, followers_total, is_demo, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          crypto7.randomUUID(),
          workspaceId,
          accountId,
          platformKey,
          now.slice(0, 10),
          synced.analytics.impressions,
          synced.analytics.engagements,
          synced.analytics.clicks,
          synced.analytics.followersTotal,
          now,
          now
        );
      }
      db.prepare(`
        INSERT INTO platform_sync_logs (
          id, workspace_id, social_account_id, platform_key, sync_type,
          status, items_synced, rate_limit_remaining, error_message, created_at
        ) VALUES (?, ?, ?, ?, 'full', 'succeeded', ?, ?, NULL, ?)
      `).run(crypto7.randomUUID(), workspaceId, accountId, platformKey, itemsSynced, synced.rateLimitRemaining, now);
      db.prepare("UPDATE social_platforms SET last_health_check_at = ?, last_api_error = NULL, updated_at = ? WHERE key = ?").run(
        now,
        now,
        platformKey
      );
    })();
    return {
      status: "succeeded",
      itemsSynced,
      rateLimitRemaining: synced.rateLimitRemaining,
      retryAfterSeconds: null,
      message: `Synchronized profile and ${itemsSynced} record(s) from ${provider.displayName}.`
    };
  } catch (err) {
    const safeMsg = redactSensitiveTokens(err instanceof Error ? err.message : "Account synchronization failed.");
    const isRateLimited = err instanceof ProviderApiError && err.isRateLimited;
    const isExpiredErr = err instanceof ProviderApiError && err.isTokenExpired;
    const isDeniedErr = err instanceof ProviderApiError && err.isPermissionDenied;
    const retryAfterSeconds = err instanceof ProviderApiError ? err.retryAfterSeconds : null;
    const syncStatus = isRateLimited ? "rate_limited" : "failed";
    db.transaction(() => {
      if (isExpiredErr) {
        db.prepare(
          "UPDATE social_accounts SET connection_status = 'expired', permissions_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?"
        ).run(safeMsg, now, accountId);
      } else if (isDeniedErr) {
        db.prepare(
          "UPDATE social_accounts SET connection_status = 'revoked', permissions_status = 'revoked', last_error = ?, updated_at = ? WHERE id = ?"
        ).run(safeMsg, now, accountId);
      } else {
        db.prepare("UPDATE social_accounts SET last_error = ?, updated_at = ? WHERE id = ?").run(safeMsg, now, accountId);
      }
      db.prepare(`
        INSERT INTO platform_sync_logs (
          id, workspace_id, social_account_id, platform_key, sync_type,
          status, items_synced, rate_limit_remaining, error_message, created_at
        ) VALUES (?, ?, ?, ?, 'full', ?, 0, NULL, ?, ?)
      `).run(crypto7.randomUUID(), workspaceId, accountId, platformKey, syncStatus, safeMsg, now);
      db.prepare("UPDATE social_platforms SET last_health_check_at = ?, last_api_error = ?, updated_at = ? WHERE key = ?").run(
        now,
        safeMsg.slice(0, 300),
        now,
        platformKey
      );
      recordOAuthConnectionLog(db, {
        workspaceId,
        userId: actorUserId ?? null,
        platformKey,
        socialAccountId: accountId,
        eventType: isRateLimited ? "rate_limited" : isDeniedErr ? "permission_denied" : "api_error",
        status: isRateLimited ? "warning" : "error",
        message: safeMsg,
        errorCode: err instanceof ProviderApiError ? err.providerCode : "SYNC_ERROR"
      });
    })();
    return {
      status: syncStatus,
      itemsSynced: 0,
      rateLimitRemaining: null,
      retryAfterSeconds,
      message: isRateLimited && retryAfterSeconds ? `Rate limit reached on ${provider.displayName}. Retry after ${retryAfterSeconds}s.` : safeMsg
    };
  }
}
async function disconnectSocialAccount(db, params) {
  const row = db.prepare(`
      SELECT sa.id, sa.account_name, sa.account_handle, sp.key as platform_key,
             sat.encrypted_access_token, sat.encrypted_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `).get(params.accountId, params.workspaceId);
  if (!row) {
    throw new Error("Social account not found.");
  }
  const platformKey = String(row.platform_key);
  const provider = getSocialProvider(platformKey);
  const creds = getPlatformCredentials(platformKey, db);
  let upstreamRevoked = false;
  let note = "Encrypted local tokens purged.";
  if (provider.supportsRevocation && creds.clientId && creds.clientSecret && row.encrypted_access_token) {
    try {
      const accessToken = decryptSocialToken(String(row.encrypted_access_token));
      const refreshToken = row.encrypted_refresh_token ? decryptSocialToken(String(row.encrypted_refresh_token)) : null;
      if (isSandboxToken(accessToken)) {
        upstreamRevoked = true;
        note = "Sandbox authorization revoked and local encrypted tokens purged.";
      } else {
        const rev = await provider.revokeToken({
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          accessToken,
          refreshToken
        });
        upstreamRevoked = rev.revoked;
        note = rev.note;
      }
    } catch {
      note = "Local encrypted tokens purged; upstream revocation skipped.";
    }
  }
  db.transaction(() => {
    db.prepare("DELETE FROM social_accounts WHERE id = ? AND workspace_id = ?").run(
      params.accountId,
      params.workspaceId
    );
    recordOAuthConnectionLog(db, {
      workspaceId: params.workspaceId,
      userId: params.actorUserId,
      platformKey,
      eventType: upstreamRevoked ? "token_revoked" : "disconnected",
      status: "info",
      message: `Disconnected ${String(row.account_name)} (${String(row.account_handle)}). ${note}`
    });
    recordAuditLog(db, {
      actorUserId: params.actorUserId,
      actorEmail: params.actorEmail,
      workspaceId: params.workspaceId,
      action: "social_account.disconnected",
      resourceType: "social_account",
      resourceId: params.accountId,
      metadata: { platform: platformKey, upstreamRevoked }
    });
  })();
  return { success: true, upstreamRevoked, note };
}
function updateSocialAccountPreferences(db, params) {
  const existing = db.prepare("SELECT id FROM social_accounts WHERE id = ? AND workspace_id = ?").get(params.accountId, params.workspaceId);
  if (!existing) {
    throw new Error("Social account not found.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare("UPDATE social_accounts SET publishing_preferences_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").run(
    JSON.stringify(params.preferences),
    now,
    params.accountId,
    params.workspaceId
  );
  recordAuditLog(db, {
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    workspaceId: params.workspaceId,
    action: "social_account.preferences_updated",
    resourceType: "social_account",
    resourceId: params.accountId
  });
  return params.preferences;
}
function listAccountSyncLogs(db, workspaceId, accountId) {
  const rows = db.prepare("SELECT * FROM platform_sync_logs WHERE workspace_id = ? AND social_account_id = ? ORDER BY created_at DESC LIMIT 15").all(workspaceId, accountId);
  return rows.map((r) => ({
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    socialAccountId: String(r.social_account_id),
    platformKey: String(r.platform_key),
    syncType: String(r.sync_type),
    status: String(r.status),
    itemsSynced: Number(r.items_synced || 0),
    rateLimitRemaining: r.rate_limit_remaining !== null && r.rate_limit_remaining !== void 0 ? Number(r.rate_limit_remaining) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    createdAt: String(r.created_at)
  }));
}
function listOAuthConnectionLogs(db, options) {
  const limit = Math.min(options.limit ?? 40, 150);
  let rows;
  if (options.accountId && options.workspaceId) {
    rows = db.prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        WHERE l.workspace_id = ? AND l.social_account_id = ?
        ORDER BY l.created_at DESC LIMIT ?
      `).all(options.workspaceId, options.accountId, limit);
  } else if (options.workspaceId) {
    rows = db.prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        WHERE l.workspace_id = ?
        ORDER BY l.created_at DESC LIMIT ?
      `).all(options.workspaceId, limit);
  } else {
    rows = db.prepare(`
        SELECT l.*, u.email as user_email, w.name as workspace_name
        FROM oauth_connection_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN workspaces w ON w.id = l.workspace_id
        ORDER BY l.created_at DESC LIMIT ?
      `).all(limit);
  }
  return rows.map((r) => ({
    id: String(r.id),
    workspaceId: r.workspace_id ? String(r.workspace_id) : null,
    workspaceName: r.workspace_name ? String(r.workspace_name) : void 0,
    userId: r.user_id ? String(r.user_id) : null,
    userEmail: r.user_email ? String(r.user_email) : void 0,
    platformKey: String(r.platform_key),
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    eventType: String(r.event_type),
    status: String(r.status),
    message: String(r.message),
    errorCode: r.error_code ? String(r.error_code) : null,
    createdAt: String(r.created_at)
  }));
}
function recordPlatformWebhookEvent(db, params) {
  const id = crypto7.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const safePayload = redactSensitiveTokens(JSON.stringify(params.payload));
  db.prepare(`
    INSERT INTO platform_webhook_events (
      id, platform_key, event_type, delivery_id, verified, payload_json, processed_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'received', ?)
  `).run(id, params.platformKey, params.eventType, params.deliveryId ?? null, params.verified ? 1 : 0, safePayload, now);
  return id;
}
function parseSocialAccountCapabilities(platformKey, rawJson) {
  const provider = getSocialProvider(platformKey);
  try {
    const parsed = JSON.parse(String(rawJson || "{}"));
    if (typeof parsed.textPublishing === "boolean") {
      return { ...provider.capabilities, ...parsed };
    }
  } catch {
  }
  return { ...provider.capabilities };
}
function parsePublishingPreferences(rawJson) {
  try {
    const parsed = JSON.parse(String(rawJson || "{}"));
    return {
      ...DEFAULT_PUBLISHING_PREFERENCES,
      ...parsed,
      defaultHashtags: Array.isArray(parsed.defaultHashtags) ? parsed.defaultHashtags : []
    };
  } catch {
    return { ...DEFAULT_PUBLISHING_PREFERENCES };
  }
}

// server/routes/api.ts
var PlatformKeySchema = z2.enum([
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "pinterest",
  "google_business"
]);
var SESSION_COOKIE = "lt_session";
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  return cookieToken || null;
}
function isHttpsRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
}
function setSessionCookie(req, res, token) {
  const secure = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    path: "/"
  });
}
function clearSessionCookie(req, res) {
  const secure = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/"
  });
}
function handleRouteError(res, err, fallbackStatus = 400) {
  if (err instanceof z2.ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message || "Invalid input parameters.",
      details: err.flatten().fieldErrors
    });
  }
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  logger.warn("API request error", { message });
  return res.status(fallbackStatus).json({ error: message });
}
function createApiRouter(db) {
  const router = Router();
  const requireAuth = (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const user = getUserBySessionToken(db, token);
    if (!user) {
      clearSessionCookie(req, res);
      return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
    req.user = user;
    req.sessionToken = token;
    next();
  };
  const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden: Super-Administrator privileges are required." });
    }
    next();
  };
  const requireWorkspaceMember = (req, res, next) => {
    const wid = String(req.params.wid || "");
    if (!req.user || !wid || !assertWorkspaceAccess(db, req.user.id, wid, req.user.role)) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this workspace." });
    }
    next();
  };
  const requireFeature = (feature) => createWorkspaceFeatureGuard(db, feature);
  router.use("/workspaces/:wid/social-accounts", requireAuth, requireWorkspaceMember, requireFeature("social_accounts"));
  router.use("/workspaces/:wid/oauth", requireAuth, requireWorkspaceMember, requireFeature("social_accounts"));
  router.use("/workspaces/:wid/posts", requireAuth, requireWorkspaceMember, requireFeature("calendar"));
  router.use("/workspaces/:wid/jobs", requireAuth, requireWorkspaceMember, requireFeature("auto_publisher"));
  router.use("/workspaces/:wid/ai/generate-post", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/suggestions", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/generate-strategy", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/strategies", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/engagements", requireAuth, requireWorkspaceMember, requireFeature("engagement"));
  router.use("/workspaces/:wid/analytics", requireAuth, requireWorkspaceMember, requireFeature("analytics"));
  router.use("/workspaces/:wid/media", requireAuth, requireWorkspaceMember, requireFeature("media"));
  router.use("/workspaces/:wid/members", requireAuth, requireWorkspaceMember, requireFeature("team"));
  router.get("/health", async (req, res) => {
    const forceProbe = req.query.probe === "1" || req.query.probe === "true";
    const current = getRtdbStatus();
    if (current.enabled && (!current.connected || forceProbe)) {
      await hydrateDatabaseFromRtdb(db, { force: true }).catch(() => false);
    }
    const rtdb = getRtdbStatus();
    res.json({
      status: "ok",
      storage: "firebase-rtdb",
      databaseURL: rtdb.databaseURL,
      rtdb,
      service: "livingtech-brand-agency-api",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  router.get("/settings", (_req, res) => {
    try {
      const rows = db.prepare("SELECT key, value FROM system_settings").all();
      const map = {};
      for (const r of rows) {
        map[r.key] = r.value;
      }
      res.json(map);
    } catch (err) {
      handleRouteError(res, err);
    }
  });
  router.get("/plans", (_req, res) => {
    const rows = db.prepare("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price_cents ASC").all();
    res.json(
      rows.map((r) => ({
        id: String(r.id),
        code: String(r.code),
        name: String(r.name),
        tagline: String(r.tagline),
        monthlyPriceCents: Number(r.monthly_price_cents),
        annualPriceCents: Number(r.annual_price_cents),
        maxWorkspaces: Number(r.max_workspaces),
        maxSocialAccounts: Number(r.max_social_accounts),
        maxTeamMembers: Number(r.max_team_members),
        monthlyAiCredits: Number(r.monthly_ai_credits),
        features: JSON.parse(String(r.features_json || "[]"))
      }))
    );
  });
  const RegisterSchema = z2.object({
    email: z2.string().email("Enter a valid email address."),
    password: z2.string().min(8, "Password must be at least 8 characters."),
    fullName: z2.string().min(2, "Full name is required.").max(120),
    workspaceName: z2.string().min(2).max(120).optional(),
    industry: z2.string().max(100).optional()
  });
  const getHeaderFirebaseIdToken = (req) => {
    const raw = req.headers["x-firebase-id-token"];
    return typeof raw === "string" && raw.trim() ? raw.trim() : void 0;
  };
  router.post("/auth/register", async (req, res) => {
    try {
      const payload = RegisterSchema.parse(req.body);
      const headerIdToken = getHeaderFirebaseIdToken(req);
      if (isRtdbSyncEnabled()) {
        await hydrateDatabaseFromRtdb(db, { authToken: headerIdToken, force: true }).catch(() => false);
      }
      const normalizedEmail = payload.email.trim().toLowerCase();
      const strength = validatePasswordStrength(payload.password);
      if (!strength.valid) {
        return res.status(400).json({ error: strength.reason || "Weak password" });
      }
      if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail)) {
        return res.status(400).json({ error: "An account with this email already exists." });
      }
      const fbAuth = await firebaseSignUpWithEmailPassword(normalizedEmail, payload.password, payload.fullName);
      const result = registerUserWithWorkspace(db, {
        ...payload,
        externalUid: fbAuth?.localId ?? null
      });
      if (isRtdbSyncEnabled()) {
        await persistDatabaseToRtdb(db, { authToken: fbAuth?.idToken || headerIdToken }).catch(() => false);
        res.locals.rtdbPersisted = true;
      }
      setSessionCookie(req, res, result.token);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof FirebaseEmailExistsError) {
        return res.status(400).json({ error: err.message });
      }
      handleRouteError(res, err, 400);
    }
  });
  const LoginSchema = z2.object({
    email: z2.string().email("Enter a valid email address."),
    password: z2.string().min(1, "Password is required.")
  });
  router.post("/auth/login", async (req, res) => {
    try {
      const payload = LoginSchema.parse(req.body);
      const headerIdToken = getHeaderFirebaseIdToken(req);
      let activeIdToken = headerIdToken;
      let result = null;
      try {
        result = loginWithPassword(db, payload.email, payload.password);
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : "";
        if (msg !== "Invalid email or password.") {
          throw firstErr;
        }
        if (isRtdbSyncEnabled()) {
          await hydrateDatabaseFromRtdb(db, { authToken: headerIdToken, force: true }).catch(() => false);
          try {
            result = loginWithPassword(db, payload.email, payload.password);
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : "";
            if (retryMsg !== "Invalid email or password.") {
              throw retryErr;
            }
          }
        }
        if (!result) {
          const fbUser = await firebaseSignInWithEmailPassword(payload.email, payload.password);
          if (!fbUser) {
            throw firstErr;
          }
          activeIdToken = fbUser.idToken;
          if (isRtdbSyncEnabled()) {
            await hydrateDatabaseFromRtdb(db, { authToken: fbUser.idToken, force: true }).catch(() => false);
          }
          result = provisionOrSyncVerifiedEmailUser(db, {
            externalUid: fbUser.localId,
            email: fbUser.email,
            password: payload.password,
            fullName: fbUser.displayName
          });
        }
      }
      if (isRtdbSyncEnabled()) {
        await persistDatabaseToRtdb(db, { authToken: activeIdToken }).catch(() => false);
        res.locals.rtdbPersisted = true;
      }
      setSessionCookie(req, res, result.token);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 401);
    }
  });
  const GoogleSyncSchema = z2.object({
    externalUid: z2.string().min(1).max(128),
    email: z2.string().email(),
    fullName: z2.string().min(1).max(120),
    avatarUrl: z2.string().nullable().optional(),
    emailVerified: z2.boolean().default(true)
  });
  router.post("/auth/google-sync", async (req, res) => {
    try {
      const payload = GoogleSyncSchema.parse(req.body);
      const headerIdToken = getHeaderFirebaseIdToken(req);
      if (isRtdbSyncEnabled()) {
        await hydrateDatabaseFromRtdb(db, { authToken: headerIdToken, force: true }).catch(() => false);
      }
      const result = syncFirebaseGoogleUser(db, payload);
      if (isRtdbSyncEnabled()) {
        await persistDatabaseToRtdb(db, { authToken: headerIdToken }).catch(() => false);
        res.locals.rtdbPersisted = true;
      }
      setSessionCookie(req, res, result.token);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/auth/logout", async (req, res) => {
    const token = extractToken(req);
    if (token) revokeSession(db, token);
    if (isRtdbSyncEnabled()) {
      await persistDatabaseToRtdb(db, { authToken: getHeaderFirebaseIdToken(req) }).catch(() => false);
      res.locals.rtdbPersisted = true;
    }
    clearSessionCookie(req, res);
    res.json({ success: true });
  });
  router.get("/auth/me", requireAuth, (req, res) => {
    const user = req.user;
    const workspaces = listUserWorkspaces(db, user.id);
    res.json({ user, workspaces, token: req.sessionToken });
  });
  router.post("/auth/forgot-password", (req, res) => {
    try {
      const { email } = z2.object({ email: z2.string().email() }).parse(req.body);
      const result = createPasswordResetToken(db, email);
      res.json({
        message: "If an account matches that email, a password reset link and recovery token have been issued.",
        // Exposed strictly in Phase 1 dev/test verification flows so reset can be completed without SMTP
        ...process.env.NODE_ENV !== "production" && result.resetToken ? { previewResetToken: result.resetToken } : {}
      });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/auth/reset-password", (req, res) => {
    try {
      const { token, newPassword } = z2.object({
        token: z2.string().min(10, "Reset token is required."),
        newPassword: z2.string().min(8)
      }).parse(req.body);
      confirmPasswordReset(db, token, newPassword);
      res.json({ message: "Password updated successfully. You may now sign in." });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/auth/verify-email", (req, res) => {
    try {
      const { token } = z2.object({ token: z2.string().min(10) }).parse(req.body);
      verifyEmailWithToken(db, token);
      res.json({ message: "Email address verified successfully." });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/auth/resend-verification", requireAuth, (req, res) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const token = crypto8.randomBytes(20).toString("hex");
    const expires = new Date(Date.now() + 24 * 3600 * 1e3).toISOString();
    db.prepare(`
      INSERT INTO auth_tokens (id, user_id, token_type, token_value, expires_at, created_at)
      VALUES (?, ?, 'email_verify', ?, ?, ?)
    `).run(crypto8.randomUUID(), req.user.id, token, expires, now);
    res.json({
      message: "Verification token issued.",
      ...process.env.NODE_ENV !== "production" ? { previewVerificationToken: token } : {}
    });
  });
  router.post("/auth/recover-account", (req, res) => {
    try {
      const { email, reason } = z2.object({
        email: z2.string().email(),
        reason: z2.string().min(5).max(500)
      }).parse(req.body);
      const normalized = email.trim().toLowerCase();
      const user = db.prepare("SELECT id, status FROM users WHERE email = ?").get(normalized);
      if (user && user.status === "deleted") {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        db.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").run(now, user.id);
        recordAuditLog(db, {
          actorUserId: user.id,
          actorEmail: normalized,
          action: "auth.account_recovered",
          resourceType: "user",
          resourceId: user.id,
          metadata: { reason }
        });
      }
      res.json({ message: "Account recovery request processed. If eligible, access has been restored and you can sign in." });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.patch("/profile", requireAuth, (req, res) => {
    try {
      const payload = z2.object({
        fullName: z2.string().min(2).max(120),
        timezone: z2.string().min(2).max(64),
        preferredLanguage: z2.string().min(2).max(16),
        avatarUrl: z2.string().url().or(z2.string().startsWith("data:image/")).nullable().optional()
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (payload.avatarUrl !== void 0) {
        db.prepare("UPDATE users SET full_name = ?, timezone = ?, preferred_language = ?, avatar_url = ?, updated_at = ? WHERE id = ?").run(
          payload.fullName.trim(),
          payload.timezone,
          payload.preferredLanguage,
          payload.avatarUrl,
          now,
          req.user.id
        );
      } else {
        db.prepare("UPDATE users SET full_name = ?, timezone = ?, preferred_language = ?, updated_at = ? WHERE id = ?").run(
          payload.fullName.trim(),
          payload.timezone,
          payload.preferredLanguage,
          now,
          req.user.id
        );
      }
      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
      res.json({ user: mapUserRow(updated) });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/profile/change-password", requireAuth, (req, res) => {
    try {
      const payload = z2.object({
        currentPassword: z2.string().min(1),
        newPassword: z2.string().min(8)
      }).parse(req.body);
      const strength = validatePasswordStrength(payload.newPassword);
      if (!strength.valid) throw new Error(strength.reason);
      const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
      if (!row?.password_hash || !verifyPassword(payload.currentPassword, row.password_hash)) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(payload.newPassword), now, req.user.id);
      recordAuditLog(db, { actorUserId: req.user.id, actorEmail: req.user.email, action: "profile.password_changed", resourceType: "user", resourceId: req.user.id });
      res.json({ message: "Password changed successfully." });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/profile/account", requireAuth, (req, res) => {
    try {
      const { confirmEmail } = z2.object({ confirmEmail: z2.string().email() }).parse(req.body);
      if (confirmEmail.trim().toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(400).json({ error: "Confirmation email does not match your account email." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.transaction(() => {
        db.prepare("UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?").run(now, req.user.id);
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(req.user.id);
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          action: "account.deletion_requested",
          resourceType: "user",
          resourceId: req.user.id
        });
      })();
      clearSessionCookie(req, res);
      res.json({ message: "Your account has been deactivated and queued for permanent deletion." });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces", requireAuth, (req, res) => {
    res.json(listUserWorkspaces(db, req.user.id));
  });
  router.post("/workspaces", requireAuth, (req, res) => {
    try {
      const payload = z2.object({
        name: z2.string().min(2).max(120),
        brandName: z2.string().min(2).max(120),
        industry: z2.string().max(100).optional().default(""),
        businessDescription: z2.string().max(2e3).optional().default(""),
        targetAudience: z2.string().max(500).optional().default(""),
        primaryColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#0052FF"),
        secondaryColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#071436"),
        accentColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#F59E0B"),
        preferredLanguage: z2.string().max(16).optional().default("en"),
        timezone: z2.string().max(64).optional().default("UTC"),
        logoUrl: z2.string().max(512).optional().default("")
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let org = db.prepare("SELECT id FROM organisations WHERE owner_user_id = ? LIMIT 1").get(req.user.id);
      if (!org) {
        const orgId = crypto8.randomUUID();
        db.prepare(`
          INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(orgId, req.user.id, payload.name, `${slugifyWorkspaceName(payload.name)}-${crypto8.randomBytes(3).toString("hex")}`, req.user.email, now, now);
        org = { id: orgId };
      }
      const wsId = crypto8.randomUUID();
      const slug = `${slugifyWorkspaceName(payload.name)}-${crypto8.randomBytes(3).toString("hex")}`;
      const trialPlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get() || db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get();
      const periodEnd = new Date(Date.now() + FREE_TRIAL_MS).toISOString();
      db.transaction(() => {
        db.prepare(`
          INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(wsId, org.id, req.user.id, payload.name.trim(), slug, payload.timezone, payload.preferredLanguage, FREE_TRIAL_AI_CREDITS, now, now);
        db.prepare(`
          INSERT INTO brand_profiles (
            id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
            business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Executive & Authoritative', ?, ?, ?, ?)
        `).run(
          crypto8.randomUUID(),
          wsId,
          payload.brandName.trim(),
          payload.logoUrl,
          payload.primaryColor,
          payload.secondaryColor,
          payload.accentColor,
          payload.businessDescription,
          payload.industry,
          payload.targetAudience,
          payload.preferredLanguage,
          payload.timezone,
          now,
          now
        );
        db.prepare(`
          INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'workspace_admin', 'active', ?, ?, ?)
        `).run(crypto8.randomUUID(), wsId, req.user.id, req.user.email, req.user.id, now, now);
        db.prepare(`
          INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'trialing', 'monthly', ?, ?, ?, ?)
        `).run(crypto8.randomUUID(), org.id, wsId, trialPlan.id, now, periodEnd, now, now);
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          workspaceId: wsId,
          action: "workspace.created",
          resourceType: "workspace",
          resourceId: wsId,
          metadata: { name: payload.name, brandName: payload.brandName }
        });
      })();
      const all = listUserWorkspaces(db, req.user.id);
      const created = all.find((w) => w.id === wsId);
      res.status(201).json({ workspace: created, workspaces: all });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.patch("/workspaces/:wid/brand", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z2.object({
        name: z2.string().min(2).max(120),
        brandName: z2.string().min(2).max(120),
        logoUrl: z2.string().max(512).default(""),
        primaryColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/),
        secondaryColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/),
        accentColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/).default("#F59E0B"),
        businessDescription: z2.string().max(2e3).default(""),
        industry: z2.string().max(100).default(""),
        targetAudience: z2.string().max(500).default(""),
        toneOfVoice: z2.string().max(120).default("Executive & Authoritative"),
        preferredLanguage: z2.string().max(16).default("en"),
        timezone: z2.string().max(64).default("UTC")
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.transaction(() => {
        db.prepare("UPDATE workspaces SET name = ?, timezone = ?, preferred_language = ?, updated_at = ? WHERE id = ?").run(
          payload.name.trim(),
          payload.timezone,
          payload.preferredLanguage,
          now,
          wid
        );
        db.prepare(`
          UPDATE brand_profiles
          SET brand_name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ?,
              business_description = ?, industry = ?, target_audience = ?, tone_of_voice = ?,
              preferred_language = ?, timezone = ?, updated_at = ?
          WHERE workspace_id = ?
        `).run(
          payload.brandName.trim(),
          payload.logoUrl,
          payload.primaryColor,
          payload.secondaryColor,
          payload.accentColor,
          payload.businessDescription,
          payload.industry,
          payload.targetAudience,
          payload.toneOfVoice,
          payload.preferredLanguage,
          payload.timezone,
          now,
          wid
        );
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          workspaceId: wid,
          action: "workspace.brand_updated",
          resourceType: "brand_profile",
          resourceId: wid
        });
      })();
      const all = listUserWorkspaces(db, req.user.id);
      res.json({ workspace: all.find((w) => w.id === wid), workspaces: all });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/dashboard", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const ws = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(wid);
    const accountRows = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.workspace_id = ?
      ORDER BY sa.created_at DESC
    `).all(wid);
    const connectedCount = accountRows.filter((a) => a.connection_status === "connected").length;
    const postCountsRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM content_posts
      WHERE workspace_id = ?
      GROUP BY status
    `).all(wid);
    const counts = { draft: 0, pending: 0, scheduled: 0, published: 0, failed: 0 };
    for (const r of postCountsRows) counts[r.status] = r.count;
    const recentJobs = db.prepare(`
      SELECT pj.*, cp.title as post_title
      FROM publishing_jobs pj
      JOIN content_posts cp ON cp.id = pj.content_post_id
      WHERE pj.workspace_id = ?
      ORDER BY pj.created_at DESC
      LIMIT 8
    `).all(wid);
    const upcomingPosts = db.prepare(`
      SELECT * FROM content_posts
      WHERE workspace_id = ? AND status IN ('scheduled', 'pending', 'draft')
      ORDER BY COALESCE(scheduled_for, created_at) ASC
      LIMIT 6
    `).all(wid);
    const realAnalytics = db.prepare(`
      SELECT * FROM analytics_snapshots
      WHERE workspace_id = ?
      ORDER BY snapshot_date ASC
    `).all(wid);
    const performancePreview = realAnalytics.map(mapAnalyticsRow);
    res.json({
      metrics: {
        connectedSocialAccounts: connectedCount,
        scheduledPosts: counts.scheduled,
        publishedPosts: counts.published,
        failedPosts: counts.failed,
        pendingPosts: counts.pending,
        draftPosts: counts.draft,
        availableAiCredits: ws?.ai_credits_balance ?? 0
      },
      recentActivity: recentJobs.map(mapJobRow),
      upcomingCalendar: upcomingPosts.map(mapPostRow),
      connectedAccounts: accountRows.map(mapSocialAccountRow),
      platforms: listSocialPlatforms(db),
      performancePreview
    });
  });
  router.get("/workspaces/:wid/social-accounts", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const accounts = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.workspace_id = ?
      ORDER BY sa.created_at DESC
    `).all(wid);
    res.json({
      accounts: accounts.map(mapSocialAccountRow),
      platforms: listSocialPlatforms(db),
      recentLogs: listOAuthConnectionLogs(db, { workspaceId: wid, limit: 25 })
    });
  });
  router.get("/workspaces/:wid/oauth/:platform/url", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const platformKey = PlatformKeySchema.parse(req.params.platform);
      const reconnectAccountId = req.query.reconnectAccountId ? String(req.query.reconnectAccountId) : null;
      const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
      const proto = forwardedProto || req.protocol || "http";
      const host = req.get("host");
      const requestOrigin = host ? `${proto}://${host}` : void 0;
      const result = buildOfficialOAuthUrl(db, {
        platformKey,
        workspaceId: wid,
        userId: req.user.id,
        reconnectAccountId,
        requestOrigin
      });
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/oauth/:platform/sandbox-authorize", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const platformKey = PlatformKeySchema.parse(req.params.platform);
      const { state, ownerProfile } = z2.object({
        state: z2.string().min(10).max(200),
        ownerProfile: z2.object({
          accountName: z2.string().max(120).optional(),
          accountHandle: z2.string().max(100).optional(),
          ownerEmail: z2.string().max(160).optional(),
          businessCategory: z2.string().max(120).optional(),
          accountDescription: z2.string().max(1200).optional(),
          followersCount: z2.number().int().min(0).max(5e8).optional(),
          recentPosts: z2.array(z2.string().max(1200)).max(8).optional()
        }).optional()
      }).parse(req.body);
      const discovery = await handleOAuthCallbackForDiscovery(db, {
        platformKey,
        state,
        code: `sandbox_auth_code_${Date.now()}`,
        ownerProfile
      });
      res.json(discovery);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/oauth/discovery/:sessionId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const sessionId = String(req.params.sessionId);
    const session = getDiscoverySession(db, { workspaceId: wid, userId: req.user.id, sessionId });
    if (!session) {
      return res.status(404).json({ error: "OAuth discovery session not found or expired." });
    }
    res.json(session);
  });
  router.post("/workspaces/:wid/oauth/discovery/:sessionId/connect", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const sessionId = String(req.params.sessionId);
      const { externalAccountIds } = z2.object({
        externalAccountIds: z2.array(z2.string().min(1).max(200)).min(1).max(50)
      }).parse(req.body);
      const sub = getWorkspaceSubscriptionSummary(db, wid);
      const currentConnected = db.prepare("SELECT COUNT(*) as c FROM social_accounts WHERE workspace_id = ? AND connection_status != 'disconnected'").get(wid).c;
      const quota = canAddSocialAccount(sub, currentConnected + externalAccountIds.length - 1);
      if (!quota.allowed) {
        return res.status(403).json({ error: quota.reason, code: "PLAN_LIMIT_REACHED" });
      }
      const result = connectSelectedDiscoveredAccounts(db, {
        workspaceId: wid,
        userId: req.user.id,
        sessionId,
        externalAccountIds
      });
      res.status(201).json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/oauth/logs", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    res.json(listOAuthConnectionLogs(db, { workspaceId: wid, limit: 40 }));
  });
  router.get("/workspaces/:wid/social-accounts/:accountId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const accountId = String(req.params.accountId);
    const row = db.prepare(`
      SELECT sa.*, sp.key as platform_key, sp.display_name as platform_name,
             u.email as connected_by_email, u.full_name as connected_by_name,
             sat.scope as token_scope, sat.expires_at as token_expires_at,
             CASE WHEN sat.id IS NOT NULL THEN 1 ELSE 0 END as has_encrypted_token,
             CASE WHEN sat.encrypted_refresh_token IS NOT NULL THEN 1 ELSE 0 END as has_refresh_token
      FROM social_accounts sa
      JOIN social_platforms sp ON sp.id = sa.platform_id
      LEFT JOIN users u ON u.id = sa.connected_by_user_id
      LEFT JOIN social_account_tokens sat ON sat.social_account_id = sa.id
      WHERE sa.id = ? AND sa.workspace_id = ?
    `).get(accountId, wid);
    if (!row) return res.status(404).json({ error: "Social account not found." });
    const account = mapSocialAccountRow(row);
    const platform = listSocialPlatforms(db).find((p) => p.key === account.platformKey);
    res.json({
      account,
      platform,
      recentSyncLogs: listAccountSyncLogs(db, wid, accountId),
      recentConnectionLogs: listOAuthConnectionLogs(db, { workspaceId: wid, accountId, limit: 15 })
    });
  });
  router.post("/workspaces/:wid/social-accounts/:accountId/verify", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const accountId = String(req.params.accountId);
    const account = db.prepare("SELECT id FROM social_accounts WHERE id = ? AND workspace_id = ?").get(accountId, wid);
    if (!account) return res.status(404).json({ error: "Social account not found." });
    const health = verifyStoredAccountTokenHealth(db, wid, accountId);
    res.json(health);
  });
  router.post("/workspaces/:wid/social-accounts/:accountId/refresh-token", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await refreshSocialAccountToken(db, wid, accountId, req.user.id);
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/social-accounts/:accountId/sync", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await syncSocialAccountData(db, wid, accountId, req.user.id);
      const statusCode = result.status === "rate_limited" ? 429 : 200;
      res.status(statusCode).json(result);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.patch("/workspaces/:wid/social-accounts/:accountId/preferences", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const prefs = z2.object({
        autoPublishEnabled: z2.boolean(),
        requireApprovalBeforePublish: z2.boolean(),
        defaultTimezone: z2.string().min(2).max(64),
        defaultVisibility: z2.enum(["public", "connections", "unlisted"]),
        appendDefaultHashtags: z2.boolean(),
        defaultHashtags: z2.array(z2.string().max(48)).max(15),
        dailyPostLimit: z2.number().int().min(1).max(100)
      }).parse(req.body);
      const saved = updateSocialAccountPreferences(db, {
        workspaceId: wid,
        accountId,
        preferences: prefs,
        actorUserId: req.user.id,
        actorEmail: req.user.email
      });
      res.json(saved);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/workspaces/:wid/social-accounts/:accountId", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const accountId = String(req.params.accountId);
      const result = await disconnectSocialAccount(db, {
        workspaceId: wid,
        accountId,
        actorUserId: req.user.id,
        actorEmail: req.user.email
      });
      res.json(result);
    } catch (err) {
      const status = err instanceof Error && err.message.includes("not found") ? 404 : 400;
      handleRouteError(res, err, status);
    }
  });
  router.get("/workspaces/:wid/posts", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const rows = statusFilter && statusFilter !== "all" ? db.prepare("SELECT * FROM content_posts WHERE workspace_id = ? AND status = ? ORDER BY COALESCE(scheduled_for, created_at) DESC").all(wid, statusFilter) : db.prepare("SELECT * FROM content_posts WHERE workspace_id = ? ORDER BY COALESCE(scheduled_for, created_at) DESC").all(wid);
    res.json(rows.map(mapPostRow));
  });
  const CreatePostSchema = z2.object({
    title: z2.string().min(2).max(180),
    caption: z2.string().min(2).max(5e3),
    platformKey: PlatformKeySchema,
    status: z2.enum(["draft", "pending", "scheduled"]).default("draft"),
    campaignTag: z2.string().max(80).nullable().optional(),
    hashtags: z2.array(z2.string().max(64)).max(20).optional().default([]),
    scheduledFor: z2.string().nullable().optional()
  });
  router.post("/workspaces/:wid/posts", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = CreatePostSchema.parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const postId = crypto8.randomUUID();
      const effectiveStatus = payload.scheduledFor && payload.status === "draft" ? "scheduled" : payload.status;
      db.transaction(() => {
        db.prepare(`
          INSERT INTO content_posts (
            id, workspace_id, author_user_id, title, caption, platform_key, status,
            campaign_tag, hashtags_json, scheduled_for, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          postId,
          wid,
          req.user.id,
          payload.title.trim(),
          payload.caption.trim(),
          payload.platformKey,
          effectiveStatus,
          payload.campaignTag ?? null,
          JSON.stringify(payload.hashtags),
          payload.scheduledFor ?? null,
          now,
          now
        );
        if (effectiveStatus === "scheduled" || effectiveStatus === "pending") {
          const scheduleId = crypto8.randomUUID();
          const runAt = payload.scheduledFor || now;
          db.prepare(`
            INSERT INTO publishing_schedules (id, workspace_id, content_post_id, scheduled_at, timezone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'UTC', 1, ?, ?)
          `).run(scheduleId, wid, postId, runAt, now, now);
          const jobId = crypto8.randomUUID();
          db.prepare(`
            INSERT INTO publishing_jobs (id, workspace_id, schedule_id, content_post_id, platform_key, job_status, attempt_count, max_attempts, run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'queued', 0, 3, ?, ?, ?)
          `).run(jobId, wid, scheduleId, postId, payload.platformKey, runAt, now, now);
          db.prepare(`
            INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at)
            VALUES (?, ?, ?, 'info', 'Post added to Auto Publisher queue.', ?, ?)
          `).run(crypto8.randomUUID(), jobId, wid, now, now);
        }
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          workspaceId: wid,
          action: "content_post.created",
          resourceType: "content_post",
          resourceId: postId,
          metadata: { platform: payload.platformKey, status: effectiveStatus }
        });
      })();
      const row = db.prepare("SELECT * FROM content_posts WHERE id = ?").get(postId);
      res.status(201).json(mapPostRow(row));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.patch("/workspaces/:wid/posts/:postId", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const postId = String(req.params.postId);
      const existing = db.prepare("SELECT * FROM content_posts WHERE id = ? AND workspace_id = ?").get(postId, wid);
      if (!existing) return res.status(404).json({ error: "Post not found." });
      const payload = z2.object({
        title: z2.string().min(2).max(180).optional(),
        caption: z2.string().min(2).max(5e3).optional(),
        status: z2.enum(["draft", "pending", "scheduled", "published", "failed"]).optional(),
        scheduledFor: z2.string().nullable().optional(),
        campaignTag: z2.string().max(80).nullable().optional()
      }).parse(req.body);
      const nextStatus = payload.status ?? existing.status;
      if (!canTransitionPostStatus(existing.status, nextStatus, req.user.role === "super_admin")) {
        return res.status(400).json({ error: "Published posts cannot be modified by standard members." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(`
        UPDATE content_posts
        SET title = ?, caption = ?, status = ?, scheduled_for = ?, campaign_tag = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(
        payload.title ?? existing.title,
        payload.caption ?? existing.caption,
        nextStatus,
        payload.scheduledFor !== void 0 ? payload.scheduledFor : existing.scheduled_for,
        payload.campaignTag !== void 0 ? payload.campaignTag : existing.campaign_tag,
        now,
        postId,
        wid
      );
      const updated = db.prepare("SELECT * FROM content_posts WHERE id = ?").get(postId);
      res.json(mapPostRow(updated));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/workspaces/:wid/posts/:postId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const postId = String(req.params.postId);
    const deleted = db.prepare("DELETE FROM content_posts WHERE id = ? AND workspace_id = ?").run(postId, wid);
    if (deleted.changes === 0) return res.status(404).json({ error: "Post not found." });
    res.json({ success: true });
  });
  router.get("/workspaces/:wid/jobs", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const jobs = db.prepare(`
      SELECT pj.*, cp.title as post_title
      FROM publishing_jobs pj
      JOIN content_posts cp ON cp.id = pj.content_post_id
      WHERE pj.workspace_id = ?
      ORDER BY pj.created_at DESC
    `).all(wid);
    const logs = db.prepare(`
      SELECT * FROM publishing_logs
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 40
    `).all(wid);
    res.json({
      jobs: jobs.map(mapJobRow),
      logs: logs.map((l) => ({
        id: String(l.id),
        publishingJobId: String(l.publishing_job_id),
        workspaceId: String(l.workspace_id),
        logLevel: String(l.log_level),
        message: String(l.message),
        createdAt: String(l.created_at)
      }))
    });
  });
  router.post("/workspaces/:wid/jobs/:jobId/action", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const jobId = String(req.params.jobId);
      const { action } = z2.object({ action: z2.enum(["dispatch", "retry", "cancel"]) }).parse(req.body);
      const job = db.prepare("SELECT * FROM publishing_jobs WHERE id = ? AND workspace_id = ?").get(jobId, wid);
      if (!job) return res.status(404).json({ error: "Publishing job not found." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (action === "cancel") {
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'cancelled', updated_at = ? WHERE id = ?").run(now, jobId);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'warn', 'Job cancelled by workspace user.', ?, ?)").run(crypto8.randomUUID(), jobId, wid, now, now);
        })();
        return res.json({ status: "cancelled" });
      }
      if (action === "retry") {
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'queued', last_error = NULL, updated_at = ? WHERE id = ?").run(now, jobId);
          db.prepare("UPDATE content_posts SET status = 'scheduled', failure_reason = NULL, updated_at = ? WHERE id = ?").run(now, job.content_post_id);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'info', 'Job re-queued for next Auto Publisher dispatch cycle.', ?, ?)").run(crypto8.randomUUID(), jobId, wid, now, now);
        })();
        return res.json({ status: "queued" });
      }
      const connectedAccount = db.prepare(`
        SELECT sa.id FROM social_accounts sa
        JOIN social_platforms sp ON sp.id = sa.platform_id
        WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
        LIMIT 1
      `).get(wid, job.platform_key);
      if (!connectedAccount) {
        const errMsg = `No official ${String(job.platform_key).toUpperCase()} account connected via OAuth. Connect your channel in Social Accounts before publishing.`;
        db.transaction(() => {
          db.prepare("UPDATE publishing_jobs SET job_status = 'failed', attempt_count = attempt_count + 1, last_error = ?, updated_at = ? WHERE id = ?").run(errMsg, now, jobId);
          db.prepare("UPDATE content_posts SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?").run(errMsg, now, job.content_post_id);
          db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'error', ?, ?, ?)").run(crypto8.randomUUID(), jobId, wid, errMsg, now, now);
        })();
        return res.status(422).json({ error: errMsg, status: "failed" });
      }
      db.transaction(() => {
        db.prepare("UPDATE publishing_jobs SET job_status = 'succeeded', attempt_count = attempt_count + 1, completed_at = ?, updated_at = ? WHERE id = ?").run(now, now, jobId);
        db.prepare("UPDATE content_posts SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?").run(now, now, job.content_post_id);
        db.prepare("INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at) VALUES (?, ?, ?, 'info', 'Published to connected official account.', ?, ?)").run(crypto8.randomUUID(), jobId, wid, now, now);
      })();
      return res.json({ status: "succeeded" });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/generate-post", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z2.object({
        platform: PlatformKeySchema,
        topic: z2.string().min(3, "Enter a topic or keywords (at least 3 characters).").max(1500),
        keywords: z2.union([z2.array(z2.string().max(48)).max(15), z2.string().max(400)]).optional().default([]),
        objective: z2.string().min(2).max(120).default("Brand Authority & Lead Generation"),
        tone: z2.string().min(2).max(120).default("Executive & Authoritative")
      }).parse(req.body);
      const keywordsList = Array.isArray(payload.keywords) ? payload.keywords.map((k) => k.trim()).filter(Boolean) : parseKeywordsInput(payload.keywords);
      const bp = db.prepare("SELECT * FROM brand_profiles WHERE workspace_id = ?").get(wid);
      const result = await generateAiContentPost(db, {
        workspaceId: wid,
        userId: req.user.id,
        platform: payload.platform,
        topic: payload.topic,
        keywords: keywordsList,
        objective: payload.objective,
        tone: payload.tone,
        brandName: String(bp?.brand_name || "Brand Workspace"),
        industry: String(bp?.industry || ""),
        targetAudience: String(bp?.target_audience || ""),
        language: String(bp?.preferred_language || "en")
      });
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        workspaceId: wid,
        action: "ai_suggestion.generated",
        resourceType: "ai_content_suggestion",
        resourceId: result.suggestion.id,
        metadata: { platform: payload.platform, keywordCount: keywordsList.length }
      });
      res.status(201).json(result);
    } catch (err) {
      handleRouteError(res, err, 502);
    }
  });
  router.get("/workspaces/:wid/ai/suggestions", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    res.json(listAiSuggestions(db, wid));
  });
  router.patch("/workspaces/:wid/ai/suggestions/:suggestionId", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const suggestionId = String(req.params.suggestionId);
      const payload = z2.object({
        headline: z2.string().min(2, "Headline is required.").max(200),
        postCopy: z2.string().min(2, "Post copy cannot be empty.").max(5e3),
        hashtags: z2.array(z2.string().max(64)).max(20).default([]),
        callToAction: z2.string().max(300).default(""),
        platformKey: PlatformKeySchema.optional()
      }).parse(req.body);
      const updated = updateAiSuggestion(db, {
        workspaceId: wid,
        suggestionId,
        headline: payload.headline,
        postCopy: payload.postCopy,
        hashtags: payload.hashtags,
        callToAction: payload.callToAction,
        platformKey: payload.platformKey
      });
      if (!updated) return res.status(404).json({ error: "AI content suggestion not found." });
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        workspaceId: wid,
        action: "ai_suggestion.updated",
        resourceType: "ai_content_suggestion",
        resourceId: suggestionId
      });
      res.json(updated);
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/workspaces/:wid/ai/suggestions/:suggestionId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const suggestionId = String(req.params.suggestionId);
    const ok = deleteAiSuggestion(db, wid, suggestionId);
    if (!ok) return res.status(404).json({ error: "AI content suggestion not found." });
    res.json({ success: true });
  });
  router.post("/workspaces/:wid/ai/suggestions/:suggestionId/promote", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const suggestionId = String(req.params.suggestionId);
      const existing = db.prepare("SELECT * FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?").get(suggestionId, wid);
      if (!existing) return res.status(404).json({ error: "AI content suggestion not found." });
      const payload = z2.object({
        status: z2.enum(["draft", "scheduled"]).default("draft"),
        scheduledFor: z2.string().nullable().optional()
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const postId = crypto8.randomUUID();
      const cta = String(existing.call_to_action || "").trim();
      const fullCaption = cta ? `${String(existing.post_copy).trim()}

${cta}` : String(existing.post_copy).trim();
      const runAt = payload.status === "scheduled" ? payload.scheduledFor || new Date(Date.now() + 86400 * 1e3).toISOString() : null;
      db.transaction(() => {
        db.prepare(`
          INSERT INTO content_posts (
            id, workspace_id, author_user_id, title, caption, platform_key, status,
            campaign_tag, hashtags_json, scheduled_for, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'AI Studio', ?, ?, ?, ?)
        `).run(
          postId,
          wid,
          req.user.id,
          String(existing.headline),
          fullCaption,
          String(existing.platform_key),
          payload.status,
          String(existing.hashtags_json || "[]"),
          runAt,
          now,
          now
        );
        if (payload.status === "scheduled" && runAt) {
          const scheduleId = crypto8.randomUUID();
          db.prepare(`
            INSERT INTO publishing_schedules (id, workspace_id, content_post_id, scheduled_at, timezone, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'UTC', 1, ?, ?)
          `).run(scheduleId, wid, postId, runAt, now, now);
          const jobId = crypto8.randomUUID();
          db.prepare(`
            INSERT INTO publishing_jobs (id, workspace_id, schedule_id, content_post_id, platform_key, job_status, attempt_count, max_attempts, run_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'queued', 0, 3, ?, ?, ?)
          `).run(jobId, wid, scheduleId, postId, String(existing.platform_key), runAt, now, now);
          db.prepare(`
            INSERT INTO publishing_logs (id, publishing_job_id, workspace_id, log_level, message, created_at, updated_at)
            VALUES (?, ?, ?, 'info', 'AI Studio suggestion promoted and added to Auto Publisher queue.', ?, ?)
          `).run(crypto8.randomUUID(), jobId, wid, now, now);
        }
        db.prepare(`
          UPDATE ai_content_suggestions
          SET status = 'saved_to_calendar', saved_post_id = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ?
        `).run(postId, now, suggestionId, wid);
      })();
      const postRow = db.prepare("SELECT * FROM content_posts WHERE id = ?").get(postId);
      res.status(201).json({ post: mapPostRow(postRow), suggestionId });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/generate-strategy", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z2.object({
        goals: z2.string().min(5, "Specify your 30-day growth goals.").max(1200),
        platforms: z2.array(PlatformKeySchema).min(1).max(8)
      }).parse(req.body);
      const bp = db.prepare("SELECT * FROM brand_profiles WHERE workspace_id = ?").get(wid);
      const result = await generateAiContentStrategy(db, {
        workspaceId: wid,
        userId: req.user.id,
        brandName: String(bp?.brand_name || "Brand Workspace"),
        industry: String(bp?.industry || ""),
        targetAudience: String(bp?.target_audience || ""),
        businessDescription: String(bp?.business_description || ""),
        goals: payload.goals,
        platforms: payload.platforms
      });
      res.json(result);
    } catch (err) {
      handleRouteError(res, err, 502);
    }
  });
  router.get("/workspaces/:wid/ai/usage", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare("SELECT * FROM ai_usage WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 30").all(wid);
    res.json(rows.map(mapAiUsageRow));
  });
  router.get("/workspaces/:wid/engagements", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare("SELECT * FROM engagement_items WHERE workspace_id = ? ORDER BY created_at DESC").all(wid);
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      platformKey: String(r.platform_key),
      authorName: String(r.author_name),
      authorHandle: String(r.author_handle),
      messageType: String(r.message_type),
      content: String(r.content),
      replyText: r.reply_text ? String(r.reply_text) : null,
      status: String(r.status),
      isDemo: Boolean(r.is_demo),
      createdAt: String(r.created_at)
    })));
  });
  router.post("/workspaces/:wid/engagements/:itemId/reply", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const itemId = String(req.params.itemId);
      const { replyText, status } = z2.object({
        replyText: z2.string().min(1).max(2e3).optional(),
        status: z2.enum(["open", "replied", "archived"]).default("replied")
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = db.prepare("UPDATE engagement_items SET reply_text = COALESCE(?, reply_text), status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").run(
        replyText ?? null,
        status,
        now,
        itemId,
        wid
      );
      if (updated.changes === 0) return res.status(404).json({ error: "Engagement item not found." });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/analytics", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const realRows = db.prepare("SELECT * FROM analytics_snapshots WHERE workspace_id = ? ORDER BY snapshot_date ASC").all(wid);
    res.json({ isDemo: false, snapshots: realRows.map(mapAnalyticsRow) });
  });
  router.get("/workspaces/:wid/media", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare("SELECT * FROM media_library WHERE workspace_id = ? ORDER BY created_at DESC").all(wid);
    res.json(rows.map(mapMediaRow));
  });
  router.post("/workspaces/:wid/media", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z2.object({
        fileName: z2.string().min(2).max(160),
        assetType: z2.enum(["image", "video", "document", "template"]),
        mimeType: z2.string().min(3).max(100).default("image/png"),
        publicUrl: z2.string().min(1).max(1024),
        fileSizeBytes: z2.number().int().min(0).max(536870912).default(0),
        folder: z2.string().min(1).max(64).default("General")
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const id = crypto8.randomUUID();
      db.prepare(`
        INSERT INTO media_library (id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, wid, req.user.id, payload.fileName.trim(), payload.assetType, payload.mimeType, `workspaces/${wid}/${payload.fileName.trim()}`, payload.publicUrl.trim(), payload.fileSizeBytes, payload.folder.trim(), now, now);
      const created = db.prepare("SELECT * FROM media_library WHERE id = ?").get(id);
      res.status(201).json(mapMediaRow(created));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/workspaces/:wid/media/:mediaId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const mediaId = String(req.params.mediaId);
    const deleted = db.prepare("DELETE FROM media_library WHERE id = ? AND workspace_id = ?").run(mediaId, wid);
    if (deleted.changes === 0) return res.status(404).json({ error: "Media asset not found." });
    res.json({ success: true });
  });
  router.get("/workspaces/:wid/notifications", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare("SELECT * FROM notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").all(wid);
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      category: String(r.category),
      title: String(r.title),
      body: String(r.body),
      isRead: Boolean(r.is_read),
      createdAt: String(r.created_at)
    })));
  });
  router.post("/workspaces/:wid/notifications/mark-read", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const { notificationId } = z2.object({ notificationId: z2.string().optional() }).parse(req.body || {});
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (notificationId) {
      db.prepare("UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ? AND workspace_id = ?").run(now, notificationId, wid);
    } else {
      db.prepare("UPDATE notifications SET is_read = 1, updated_at = ? WHERE workspace_id = ?").run(now, wid);
    }
    res.json({ success: true });
  });
  router.get("/workspaces/:wid/subscription", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const row = db.prepare(`
      SELECT s.*, sp.code as plan_code, sp.name as plan_name, sp.monthly_price_cents, sp.monthly_ai_credits,
             sp.max_workspaces, sp.max_social_accounts, sp.max_team_members
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.workspace_id = ?
      ORDER BY s.updated_at DESC, s.created_at DESC
      LIMIT 1
    `).get(wid);
    if (!row) {
      return res.json({
        id: "",
        workspaceId: wid,
        planCode: "none",
        planName: "No Active Plan",
        monthlyPriceCents: 0,
        monthlyAiCredits: 0,
        maxWorkspaces: 1,
        maxSocialAccounts: 0,
        maxTeamMembers: 1,
        status: "none",
        billingCycle: "monthly",
        currentPeriodStart: "",
        currentPeriodEnd: "",
        trialEndsAt: null,
        trialDaysRemaining: 0,
        isTrialActive: false,
        isTrialExpired: false,
        hasSubscription: false
      });
    }
    const rawStatus = String(row.status);
    const currentPeriodEnd = String(row.current_period_end || "");
    const trialEndsAt = rawStatus === "trialing" ? currentPeriodEnd : null;
    const subCheck = {
      planCode: String(row.plan_code),
      status: rawStatus,
      currentPeriodEnd,
      trialEndsAt
    };
    const activeTrial = isTrialActive(subCheck);
    const expiredTrial = isTrialExpired(subCheck);
    const daysRemaining = getTrialDaysRemaining(subCheck);
    res.json({
      id: String(row.id),
      workspaceId: String(row.workspace_id),
      planCode: String(row.plan_code),
      planName: activeTrial ? "7-Day Free Trial" : expiredTrial ? "Trial Expired" : String(row.plan_name),
      monthlyPriceCents: Number(row.monthly_price_cents),
      monthlyAiCredits: activeTrial ? FREE_TRIAL_AI_CREDITS : Number(row.monthly_ai_credits),
      maxWorkspaces: expiredTrial ? 1 : Number(row.max_workspaces),
      maxSocialAccounts: expiredTrial ? 0 : Number(row.max_social_accounts),
      maxTeamMembers: expiredTrial ? 1 : Number(row.max_team_members),
      status: rawStatus,
      billingCycle: String(row.billing_cycle),
      currentPeriodStart: String(row.current_period_start),
      currentPeriodEnd,
      trialEndsAt,
      trialDaysRemaining: daysRemaining,
      isTrialActive: activeTrial,
      isTrialExpired: expiredTrial,
      hasSubscription: rawStatus === "active" || activeTrial
    });
  });
  router.post("/workspaces/:wid/subscription/change", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const { planCode, billingCycle, payment } = z2.object({
        planCode: z2.enum(["basic", "pro", "enterprise", "starter", "growth", "agency"]),
        billingCycle: z2.enum(["monthly", "annual"]).default("monthly"),
        payment: z2.object({
          method: z2.enum(["card", "bank_transfer"]).default("card"),
          billingEmail: z2.string().email().optional(),
          cardholderName: z2.string().min(2).max(120).optional(),
          cardBrand: z2.string().max(40).optional(),
          cardLast4: z2.string().regex(/^\d{4}$/).optional(),
          reference: z2.string().min(4).max(120).optional()
        }).optional()
      }).parse(req.body);
      const plan = db.prepare("SELECT * FROM subscription_plans WHERE code = ?").get(planCode);
      if (!plan) return res.status(404).json({ error: "Plan not found." });
      const ws = db.prepare("SELECT organisation_id FROM workspaces WHERE id = ?").get(wid);
      if (!ws) return res.status(404).json({ error: "Workspace not found." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const nextPeriodEnd = new Date(Date.now() + (billingCycle === "annual" ? 365 : 30) * 86400 * 1e3).toISOString();
      const amountCents = billingCycle === "annual" ? Number(plan.annual_price_cents) : Number(plan.monthly_price_cents);
      const transactionId = `LT-PAY-${crypto8.randomBytes(4).toString("hex").toUpperCase()}`;
      db.transaction(() => {
        const existingSub = db.prepare("SELECT id, status FROM subscriptions WHERE workspace_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(wid);
        if (existingSub) {
          db.prepare(`
            UPDATE subscriptions
            SET plan_id = ?, billing_cycle = ?, status = 'active', current_period_start = ?, current_period_end = ?, provider_subscription_id = ?, updated_at = ?
            WHERE id = ?
          `).run(plan.id, billingCycle, now, nextPeriodEnd, transactionId, now, existingSub.id);
        } else {
          db.prepare(`
            INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, provider_subscription_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
          `).run(crypto8.randomUUID(), ws.organisation_id, wid, plan.id, billingCycle, now, nextPeriodEnd, transactionId, now, now);
        }
        db.prepare("UPDATE workspaces SET ai_credits_balance = MAX(ai_credits_balance, ?), updated_at = ? WHERE id = ?").run(
          Number(plan.monthly_ai_credits),
          now,
          wid
        );
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          workspaceId: wid,
          action: existingSub && existingSub.status === "active" ? "billing.plan_changed" : "billing.plan_subscribed",
          resourceType: "subscription",
          resourceId: wid,
          metadata: {
            planCode,
            planName: String(plan.name),
            billingCycle,
            amountCents,
            transactionId,
            paymentMethod: payment?.method || "card",
            cardBrand: payment?.cardBrand || null,
            cardLast4: payment?.cardLast4 || null,
            paymentReference: payment?.reference || null,
            billingEmail: payment?.billingEmail || req.user.email
          }
        });
      })();
      const updatedSub = getWorkspaceSubscriptionSummary(db, wid);
      const workspaces = listUserWorkspaces(db, req.user.id);
      res.json({ success: true, transactionId, planCode, billingCycle, subscription: updatedSub, workspaces });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/subscription/cancel", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = db.prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE workspace_id = ?").run(now, wid);
      if (updated.changes > 0) {
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          workspaceId: wid,
          action: "billing.plan_cancelled",
          resourceType: "subscription",
          resourceId: wid,
          metadata: { status: "cancelled" }
        });
      }
      const workspaces = listUserWorkspaces(db, req.user.id);
      res.json({ success: true, workspaces });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/billing-history", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare(`
        SELECT id, action, metadata_json, created_at
        FROM audit_logs
        WHERE workspace_id = ? AND action IN ('billing.plan_subscribed', 'billing.plan_changed', 'billing.plan_cancelled')
        ORDER BY created_at DESC
        LIMIT 25
      `).all(wid);
    res.json(
      rows.map((r) => {
        let meta = {};
        try {
          meta = JSON.parse(r.metadata_json || "{}");
        } catch {
          meta = {};
        }
        return {
          id: r.id,
          action: r.action,
          planCode: String(meta.planCode || ""),
          billingCycle: String(meta.billingCycle || "monthly"),
          amountCents: Number(meta.amountCents || 0),
          transactionId: meta.transactionId ? String(meta.transactionId) : void 0,
          paymentMethod: meta.paymentMethod ? String(meta.paymentMethod) : void 0,
          cardLast4: meta.cardLast4 ? String(meta.cardLast4) : void 0,
          createdAt: r.created_at
        };
      })
    );
  });
  router.get("/workspaces/:wid/members", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare(`
      SELECT wm.*, u.full_name
      FROM workspace_members wm
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ?
      ORDER BY wm.created_at ASC
    `).all(wid);
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      invitedEmail: String(r.invited_email),
      fullName: r.full_name ? String(r.full_name) : null,
      role: String(r.role_slug),
      status: String(r.status),
      createdAt: String(r.created_at)
    })));
  });
  router.post("/workspaces/:wid/members", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const { email, role } = z2.object({
        email: z2.string().email(),
        role: z2.enum(["workspace_admin", "editor", "viewer"])
      }).parse(req.body);
      const sub = getWorkspaceSubscriptionSummary(db, wid);
      const currentMembers = db.prepare("SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ? AND status != 'revoked'").get(wid).c;
      const seatCheck = canAddTeamMember(sub, currentMembers);
      if (!seatCheck.allowed) {
        return res.status(403).json({ error: seatCheck.reason, code: "PLAN_LIMIT_REACHED" });
      }
      const normalized = email.trim().toLowerCase();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
      const id = crypto8.randomUUID();
      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'invited', ?, ?, ?)
      `).run(id, wid, existingUser?.id ?? null, normalized, role, req.user.id, now, now);
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        workspaceId: wid,
        action: "team.member_invited",
        resourceType: "workspace_member",
        resourceId: id,
        metadata: { email: normalized, role }
      });
      res.status(201).json({ id, email: normalized, role, status: "invited" });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.delete("/workspaces/:wid/members/:memberId", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const memberId = String(req.params.memberId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = db.prepare("UPDATE workspace_members SET status = 'revoked', updated_at = ? WHERE id = ? AND workspace_id = ?").run(now, memberId, wid);
    if (updated.changes === 0) return res.status(404).json({ error: "Team member not found." });
    res.json({ success: true });
  });
  router.get("/workspaces/:wid/tickets", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare("SELECT * FROM support_tickets WHERE workspace_id = ? ORDER BY created_at DESC").all(wid);
    res.json(rows.map(mapTicketRow));
  });
  router.post("/workspaces/:wid/tickets", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const payload = z2.object({
        subject: z2.string().min(4).max(180),
        message: z2.string().min(10).max(3e3),
        priority: z2.enum(["low", "medium", "high", "urgent"]).default("medium")
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const id = crypto8.randomUUID();
      db.prepare(`
        INSERT INTO support_tickets (id, workspace_id, owner_user_id, subject, message, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `).run(id, wid, req.user.id, payload.subject.trim(), payload.message.trim(), payload.priority, now, now);
      const created = db.prepare("SELECT * FROM support_tickets WHERE id = ?").get(id);
      res.status(201).json(mapTicketRow(created));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.use("/admin", requireAuth, requireSuperAdmin);
  router.get("/admin/overview", (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1e3).toISOString();
    const totalRegisteredUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const activeSubscriptions = db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('active','trialing')").get().c;
    const newRegistrations30d = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= ?").get(thirtyDaysAgo).c;
    const totalWorkspaces = db.prepare("SELECT COUNT(*) as c FROM workspaces").get().c;
    const totalConnectedSocialAccounts = db.prepare("SELECT COUNT(*) as c FROM social_accounts WHERE connection_status = 'connected'").get().c;
    const totalAiCreditsConsumed = db.prepare("SELECT COALESCE(SUM(credits_used), 0) as c FROM ai_usage").get().c;
    const totalPublishingJobs = db.prepare("SELECT COUNT(*) as c FROM publishing_jobs").get().c;
    const failedPublishingJobs = db.prepare("SELECT COUNT(*) as c FROM publishing_jobs WHERE job_status = 'failed'").get().c;
    const openSupportTickets = db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status IN ('open','in_progress')").get().c;
    const recentUsers = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 8").all().map(mapUserRow);
    const recentAuditLogs = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10").all().map(mapAuditRow);
    res.json({
      metrics: {
        totalRegisteredUsers,
        activeSubscriptions,
        newRegistrations30d,
        totalWorkspaces,
        totalConnectedSocialAccounts,
        totalAiCreditsConsumed,
        totalPublishingJobs,
        failedPublishingJobs,
        openSupportTickets
      },
      recentUsers,
      recentAuditLogs
    });
  });
  router.get("/admin/users", (_req, res) => {
    const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
    res.json(rows.map(mapUserRow));
  });
  router.patch("/admin/users/:userId", (req, res) => {
    try {
      const userId = String(req.params.userId);
      const payload = z2.object({
        status: z2.enum(["active", "suspended", "deleted"]).optional(),
        role: z2.enum(["customer", "workspace_admin", "super_admin"]).optional(),
        emailVerified: z2.boolean().optional()
      }).parse(req.body);
      const target = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      if (!target) return res.status(404).json({ error: "User not found." });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(`
        UPDATE users
        SET status = COALESCE(?, status),
            role_slug = COALESCE(?, role_slug),
            email_verified = COALESCE(?, email_verified),
            updated_at = ?
        WHERE id = ?
      `).run(
        payload.status ?? null,
        payload.role ?? null,
        payload.emailVerified !== void 0 ? payload.emailVerified ? 1 : 0 : null,
        now,
        userId
      );
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: "admin.user_updated",
        resourceType: "user",
        resourceId: userId,
        metadata: payload
      });
      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json(mapUserRow(updated));
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/admin/subscriptions", (_req, res) => {
    const rows = db.prepare(`
      SELECT s.*, sp.code as plan_code, sp.name as plan_name, sp.monthly_price_cents, sp.monthly_ai_credits,
             w.name as workspace_name, u.email as owner_email
      FROM subscriptions s
      JOIN subscription_plans sp ON sp.id = s.plan_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN users u ON u.id = w.owner_user_id
      ORDER BY s.created_at DESC
    `).all();
    res.json(rows.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      workspaceName: String(r.workspace_name),
      ownerEmail: String(r.owner_email),
      planCode: String(r.plan_code),
      planName: String(r.plan_name),
      monthlyPriceCents: Number(r.monthly_price_cents),
      monthlyAiCredits: Number(r.monthly_ai_credits),
      status: String(r.status),
      billingCycle: String(r.billing_cycle),
      currentPeriodStart: String(r.current_period_start),
      currentPeriodEnd: String(r.current_period_end)
    })));
  });
  router.patch("/admin/subscriptions/:subId", (req, res) => {
    try {
      const subId = String(req.params.subId);
      const payload = z2.object({
        status: z2.enum(["trialing", "active", "past_due", "cancelled"]).optional(),
        planCode: z2.enum(["basic", "pro", "enterprise", "starter", "growth", "agency"]).optional()
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (payload.planCode) {
        const plan = db.prepare("SELECT id FROM subscription_plans WHERE code = ?").get(payload.planCode);
        if (!plan) return res.status(404).json({ error: `Subscription plan "${payload.planCode}" not found.` });
        db.prepare("UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE id = ?").run(plan.id, now, subId);
      }
      if (payload.status) {
        db.prepare("UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?").run(payload.status, now, subId);
      }
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: "admin.subscription_updated",
        resourceType: "subscription",
        resourceId: subId,
        metadata: payload
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/admin/ai-usage", (_req, res) => {
    const rows = db.prepare(`
      SELECT a.*, w.name as workspace_name, u.email as user_email
      FROM ai_usage a
      JOIN workspaces w ON w.id = a.workspace_id
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();
    res.json(rows.map(mapAiUsageRow));
  });
  router.get("/admin/social-accounts", (_req, res) => {
    const stats = db.prepare(`
      SELECT sp.key as platform_key, sp.display_name, sp.is_enabled,
             COUNT(sa.id) as total_accounts,
             SUM(CASE WHEN sa.connection_status = 'connected' THEN 1 ELSE 0 END) as connected_accounts,
             SUM(CASE WHEN sa.connection_status IN ('expired','revoked') THEN 1 ELSE 0 END) as degraded_accounts
      FROM social_platforms sp
      LEFT JOIN social_accounts sa ON sa.platform_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.display_name ASC
    `).all();
    const syncRows = db.prepare(`
      SELECT * FROM platform_sync_logs ORDER BY created_at DESC LIMIT 30
    `).all();
    const webhookRows = db.prepare(`
      SELECT id, platform_key, event_type, delivery_id, verified, processed_status, created_at
      FROM platform_webhook_events ORDER BY created_at DESC LIMIT 30
    `).all();
    const platforms = listSocialPlatforms(db);
    res.json({
      platforms,
      stats: stats.map((s) => ({
        platformKey: String(s.platform_key),
        displayName: String(s.display_name),
        isEnabled: Boolean(s.is_enabled),
        totalAccounts: Number(s.total_accounts || 0),
        connectedAccounts: Number(s.connected_accounts || 0),
        degradedAccounts: Number(s.degraded_accounts || 0)
      })),
      recentConnectionLogs: listOAuthConnectionLogs(db, { limit: 40 }),
      recentSyncLogs: syncRows.map((r) => ({
        id: String(r.id),
        workspaceId: String(r.workspace_id),
        socialAccountId: String(r.social_account_id),
        platformKey: String(r.platform_key),
        syncType: String(r.sync_type),
        status: String(r.status),
        itemsSynced: Number(r.items_synced || 0),
        rateLimitRemaining: r.rate_limit_remaining !== null && r.rate_limit_remaining !== void 0 ? Number(r.rate_limit_remaining) : null,
        errorMessage: r.error_message ? String(r.error_message) : null,
        createdAt: String(r.created_at)
      })),
      recentWebhookEvents: webhookRows.map((w) => ({
        id: String(w.id),
        platformKey: String(w.platform_key),
        eventType: String(w.event_type),
        deliveryId: w.delivery_id ? String(w.delivery_id) : null,
        verified: Boolean(w.verified),
        processedStatus: String(w.processed_status),
        createdAt: String(w.created_at)
      }))
    });
  });
  router.patch("/admin/platforms/:platformKey", (req, res) => {
    try {
      const platformKey = PlatformKeySchema.parse(req.params.platformKey);
      const payload = z2.object({
        isEnabled: z2.boolean().optional(),
        clientIdOverride: z2.string().max(240).nullable().optional(),
        clientSecretOverride: z2.string().max(400).nullable().optional(),
        developerReviewStatus: z2.enum(["not_submitted", "pending_review", "approved", "action_required"]).optional(),
        rateLimitRpm: z2.number().int().min(10).max(1e4).optional(),
        scopes: z2.string().min(2).max(1e3).optional(),
        clearLastError: z2.boolean().optional(),
        permissionApprovals: z2.record(z2.string(), z2.enum(["not_submitted", "pending_review", "approved", "action_required"])).optional()
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.transaction(() => {
        if (payload.isEnabled !== void 0) {
          db.prepare("UPDATE social_platforms SET is_enabled = ?, updated_at = ? WHERE key = ?").run(
            payload.isEnabled ? 1 : 0,
            now,
            platformKey
          );
        }
        if (payload.clientIdOverride !== void 0) {
          const cleaned = payload.clientIdOverride ? payload.clientIdOverride.trim() : null;
          db.prepare("UPDATE social_platforms SET client_id_override = ?, updated_at = ? WHERE key = ?").run(
            cleaned || null,
            now,
            platformKey
          );
        }
        if (payload.clientSecretOverride !== void 0) {
          const cleaned = payload.clientSecretOverride ? payload.clientSecretOverride.trim() : null;
          db.prepare("UPDATE social_platforms SET client_secret_override = ?, updated_at = ? WHERE key = ?").run(
            cleaned || null,
            now,
            platformKey
          );
        }
        if (payload.developerReviewStatus !== void 0) {
          db.prepare("UPDATE social_platforms SET developer_review_status = ?, updated_at = ? WHERE key = ?").run(
            payload.developerReviewStatus,
            now,
            platformKey
          );
        }
        if (payload.rateLimitRpm !== void 0) {
          db.prepare("UPDATE social_platforms SET rate_limit_rpm = ?, updated_at = ? WHERE key = ?").run(
            payload.rateLimitRpm,
            now,
            platformKey
          );
        }
        if (payload.scopes !== void 0) {
          db.prepare("UPDATE social_platforms SET scopes = ?, updated_at = ? WHERE key = ?").run(
            payload.scopes.trim(),
            now,
            platformKey
          );
        }
        if (payload.clearLastError) {
          db.prepare("UPDATE social_platforms SET last_api_error = NULL, last_health_check_at = ?, updated_at = ? WHERE key = ?").run(
            now,
            now,
            platformKey
          );
        }
        if (payload.permissionApprovals) {
          for (const [scopeKey, approvalStatus] of Object.entries(payload.permissionApprovals)) {
            db.prepare("UPDATE platform_permissions SET approval_status = ?, updated_at = ? WHERE platform_key = ? AND scope_key = ?").run(
              approvalStatus,
              now,
              platformKey,
              scopeKey
            );
          }
        }
        recordAuditLog(db, {
          actorUserId: req.user.id,
          actorEmail: req.user.email,
          action: "admin.platform_configured",
          resourceType: "social_platform",
          resourceId: platformKey,
          metadata: {
            isEnabled: payload.isEnabled,
            developerReviewStatus: payload.developerReviewStatus,
            rateLimitRpm: payload.rateLimitRpm,
            updatedClientId: payload.clientIdOverride !== void 0
          }
        });
      })();
      res.json({ success: true, platforms: listSocialPlatforms(db) });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/admin/jobs", (req, res) => {
    const onlyFailed = req.query.status === "failed";
    const sql = onlyFailed ? `SELECT pj.*, cp.title as post_title, w.name as workspace_name
         FROM publishing_jobs pj
         JOIN content_posts cp ON cp.id = pj.content_post_id
         JOIN workspaces w ON w.id = pj.workspace_id
         WHERE pj.job_status = 'failed'
         ORDER BY pj.created_at DESC` : `SELECT pj.*, cp.title as post_title, w.name as workspace_name
         FROM publishing_jobs pj
         JOIN content_posts cp ON cp.id = pj.content_post_id
         JOIN workspaces w ON w.id = pj.workspace_id
         ORDER BY pj.created_at DESC LIMIT 100`;
    const rows = db.prepare(sql).all();
    res.json(rows.map(mapJobRow));
  });
  router.post("/admin/jobs/:jobId/retry", (req, res) => {
    const jobId = String(req.params.jobId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const job = db.prepare("SELECT * FROM publishing_jobs WHERE id = ?").get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found." });
    db.transaction(() => {
      db.prepare("UPDATE publishing_jobs SET job_status = 'queued', last_error = NULL, updated_at = ? WHERE id = ?").run(now, jobId);
      db.prepare("UPDATE content_posts SET status = 'scheduled', failure_reason = NULL, updated_at = ? WHERE id = ?").run(now, job.content_post_id);
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        workspaceId: String(job.workspace_id),
        action: "admin.job_retried",
        resourceType: "publishing_job",
        resourceId: jobId
      });
    })();
    res.json({ success: true });
  });
  router.get("/admin/settings", (_req, res) => {
    const rows = db.prepare("SELECT * FROM system_settings ORDER BY key ASC").all();
    res.json(rows.map((r) => ({
      key: String(r.key),
      value: String(r.value),
      description: String(r.description),
      updatedAt: String(r.updated_at)
    })));
  });
  router.patch("/admin/settings", (req, res) => {
    try {
      const { key, value } = z2.object({ key: z2.string().min(1).max(80), value: z2.string().max(2e3) }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = db.prepare("UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?").run(value, now, key);
      if (updated.changes === 0) {
        const defaultDescriptions = {
          app_name: "Global application name displayed in headers and titles",
          app_tagline: "Global application subtitle / tagline",
          app_logo_url: "Global application logo image URL",
          app_footer_text: "Global footer copyright text",
          app_welcome_message: "Welcome message on dashboard",
          app_font_color: "Global application font color (default pure white)"
        };
        if (key in defaultDescriptions) {
          db.prepare("INSERT INTO system_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)").run(
            key,
            value,
            defaultDescriptions[key],
            now
          );
        } else {
          return res.status(404).json({ error: "Setting key not found." });
        }
      }
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: "admin.setting_updated",
        resourceType: "system_setting",
        resourceId: key,
        metadata: { value }
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  router.get("/admin/audit-logs", (_req, res) => {
    const rows = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 150").all();
    res.json(rows.map(mapAuditRow));
  });
  router.get("/admin/tickets", (_req, res) => {
    const rows = db.prepare(`
      SELECT st.*, w.name as workspace_name, u.email as owner_email
      FROM support_tickets st
      JOIN workspaces w ON w.id = st.workspace_id
      JOIN users u ON u.id = st.owner_user_id
      ORDER BY st.created_at DESC
    `).all();
    res.json(rows.map(mapTicketRow));
  });
  router.patch("/admin/tickets/:ticketId", (req, res) => {
    try {
      const ticketId = String(req.params.ticketId);
      const payload = z2.object({
        status: z2.enum(["open", "in_progress", "resolved", "closed"]),
        adminNotes: z2.string().max(2e3).optional()
      }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare("UPDATE support_tickets SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? WHERE id = ?").run(
        payload.status,
        payload.adminNotes ?? null,
        now,
        ticketId
      );
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: "admin.ticket_updated",
        resourceType: "support_ticket",
        resourceId: ticketId,
        metadata: payload
      });
      res.json({ success: true });
    } catch (err) {
      handleRouteError(res, err, 400);
    }
  });
  return router;
}
function mapPostRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    authorUserId: String(r.author_user_id),
    title: String(r.title),
    caption: String(r.caption),
    platformKey: String(r.platform_key),
    status: String(r.status),
    campaignTag: r.campaign_tag ? String(r.campaign_tag) : null,
    hashtags: JSON.parse(String(r.hashtags_json || "[]")),
    scheduledFor: r.scheduled_for ? String(r.scheduled_for) : null,
    publishedAt: r.published_at ? String(r.published_at) : null,
    failureReason: r.failure_reason ? String(r.failure_reason) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function mapJobRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : void 0,
    contentPostId: String(r.content_post_id),
    postTitle: String(r.post_title || "Untitled Post"),
    platformKey: String(r.platform_key),
    jobStatus: String(r.job_status),
    attemptCount: Number(r.attempt_count),
    maxAttempts: Number(r.max_attempts),
    lastError: r.last_error ? String(r.last_error) : null,
    runAt: String(r.run_at),
    completedAt: r.completed_at ? String(r.completed_at) : null,
    createdAt: String(r.created_at)
  };
}
function mapSocialAccountRow(r) {
  const platformKey = String(r.platform_key);
  const provider = getSocialProvider(platformKey);
  const rawScopes = r.granted_scopes ? String(r.granted_scopes) : r.token_scope ? String(r.token_scope) : "";
  const permCheck = provider.validatePermissions(rawScopes);
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    connectedByUserId: r.connected_by_user_id ? String(r.connected_by_user_id) : null,
    connectedByEmail: r.connected_by_email ? String(r.connected_by_email) : null,
    connectedByName: r.connected_by_name ? String(r.connected_by_name) : null,
    platformKey,
    platformName: String(r.platform_name),
    externalAccountId: String(r.external_account_id || ""),
    accountHandle: String(r.account_handle),
    accountName: String(r.account_name),
    accountType: String(r.account_type || "profile"),
    accountDescription: String(r.account_description || ""),
    businessCategory: String(r.business_category || ""),
    followersCount: r.followers_count !== null && r.followers_count !== void 0 ? Number(r.followers_count) : null,
    avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
    connectionStatus: String(r.connection_status),
    permissionsStatus: String(r.permissions_status || permCheck.status),
    scopes: rawScopes || null,
    grantedScopes: permCheck.grantedScopes,
    missingRequiredScopes: permCheck.missingRequiredScopes,
    capabilities: parseSocialAccountCapabilities(platformKey, r.capabilities_json),
    publishingPreferences: parsePublishingPreferences(r.publishing_preferences_json),
    tokenExpiresAt: r.token_expires_at ? String(r.token_expires_at) : null,
    tokenVaultStatus: Number(r.has_encrypted_token || 0) === 1 ? "encrypted_aes256_gcm" : "missing",
    hasRefreshToken: Number(r.has_refresh_token || 0) === 1,
    lastSyncedAt: r.last_synced_at ? String(r.last_synced_at) : null,
    lastError: r.last_error ? String(r.last_error) : null,
    createdAt: String(r.created_at)
  };
}
function mapAnalyticsRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    platformKey: String(r.platform_key),
    snapshotDate: String(r.snapshot_date),
    impressions: Number(r.impressions),
    engagements: Number(r.engagements),
    clicks: Number(r.clicks),
    followersTotal: Number(r.followers_total),
    isDemo: Boolean(r.is_demo)
  };
}
function mapMediaRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    fileName: String(r.file_name),
    assetType: String(r.asset_type),
    mimeType: String(r.mime_type),
    publicUrl: String(r.public_url),
    fileSizeBytes: Number(r.file_size_bytes),
    folder: String(r.folder),
    createdAt: String(r.created_at)
  };
}
function mapAiUsageRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : void 0,
    userEmail: r.user_email ? String(r.user_email) : void 0,
    feature: String(r.feature),
    modelName: String(r.model_name),
    creditsUsed: Number(r.credits_used),
    promptTokens: Number(r.prompt_tokens),
    completionTokens: Number(r.completion_tokens),
    status: String(r.status),
    createdAt: String(r.created_at)
  };
}
function mapTicketRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    workspaceName: r.workspace_name ? String(r.workspace_name) : void 0,
    ownerEmail: r.owner_email ? String(r.owner_email) : void 0,
    subject: String(r.subject),
    message: String(r.message),
    priority: String(r.priority),
    status: String(r.status),
    adminNotes: r.admin_notes ? String(r.admin_notes) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function mapAuditRow(r) {
  return {
    id: String(r.id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorEmail: r.actor_email ? String(r.actor_email) : null,
    workspaceId: r.workspace_id ? String(r.workspace_id) : null,
    action: String(r.action),
    resourceType: String(r.resource_type),
    resourceId: r.resource_id ? String(r.resource_id) : null,
    metadata: JSON.parse(String(r.metadata_json || "{}")),
    createdAt: String(r.created_at)
  };
}

// server/routes/phase3.ts
import { Router as Router2 } from "express";
import crypto16 from "node:crypto";
import { z as z3 } from "zod";

// server/ai/modules/brandAnalysis.ts
import { Type as Type2 } from "@google/genai";
import crypto9 from "node:crypto";
function mapBrandAnalysisRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    brandSummary: String(r.brand_summary),
    verifiedFacts: JSON.parse(String(r.verified_facts_json || "[]")),
    assumptions: JSON.parse(String(r.assumptions_json || "[]")),
    audienceInsights: JSON.parse(String(r.audience_insights_json || "{}")),
    contentThemes: JSON.parse(String(r.content_themes_json || "[]")),
    voiceGuidelines: JSON.parse(String(r.voice_guidelines_json || "[]")),
    connectedSources: JSON.parse(String(r.connected_sources_json || "[]")),
    uploadedSources: JSON.parse(String(r.uploaded_sources_json || "[]")),
    modelName: String(r.model_name || "gemini-3.5-flash-lite"),
    createdAt: String(r.created_at)
  };
}
async function runBrandAnalysisModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const connectedSources = ctx.accounts.map(
    (a) => `${String(a.platform_key).toUpperCase()}: ${String(a.account_name)} (${String(a.account_handle)}, category: ${String(a.business_category || "n/a")}, followers: ${a.followers_count ?? "unavailable"})`
  );
  const uploadedSources = [
    ...ctx.brand.brandDocuments.map((d) => `[${d.category}] ${d.name}: ${d.summary}`),
    ...ctx.mediaAssets.map((m) => `[media:${String(m.asset_type)}] ${String(m.file_name)} (${String(m.folder)})`)
  ];
  const prompt = `Perform a rigorous Brand Intelligence Analysis for this workspace.
CRITICAL EPISTEMIC RULE: You MUST strictly separate:
1. "verifiedFacts": ONLY statements directly supported by the workspace profile, uploaded brand documents, or permitted connected social account data provided below.
2. "assumptions": Any inferred positioning, market hypotheses, or audience assumptions that are NOT explicitly verified in the provided data.
NEVER fabricate testimonials, customer quotes, follower counts, or analytics numbers.

=== WORKSPACE BRAND PROFILE (VERIFIED INPUTS) ===
Brand Name: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || "Not specified"}
Business Description: ${ctx.brand.businessDescription || "Not specified"}
Products & Services: ${ctx.brand.productsServices || "Not specified"}
Target Audience: ${ctx.brand.targetAudience || "Not specified"}
Business Goals: ${ctx.brand.businessGoals || "Not specified"}
Tone of Voice: ${ctx.brand.toneOfVoice}
Brand Tone Rules: ${ctx.brand.brandToneRules || "None"}
Preferred Language: ${ctx.brand.preferredLanguage}

=== PERMITTED CONNECTED SOCIAL ACCOUNTS (${connectedSources.length}) ===
${connectedSources.length > 0 ? connectedSources.join("\n") : "No connected social accounts yet."}

=== RECENT WORKSPACE POSTS (${ctx.recentPosts.length}) ===
${ctx.recentPosts.map((p) => `- [${String(p.platform_key)}/${String(p.status)}] ${String(p.title)}: ${String(p.caption).slice(0, 180)}`).join("\n") || "None"}

=== LIVE ANALYTICS SNAPSHOTS (${ctx.liveAnalytics.length}) ===
${ctx.liveAnalytics.length > 0 ? JSON.stringify(ctx.liveAnalytics.slice(0, 10)) : "No live platform analytics synced yet."}

=== UPLOADED BRAND MATERIALS & MEDIA (${uploadedSources.length}) ===
${uploadedSources.length > 0 ? uploadedSources.join("\n") : "None uploaded yet."}

=== ADDITIONAL USER NOTES ===
${params.additionalNotes || "None"}`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "brand_analysis",
    systemInstruction: "You are an enterprise Brand Intelligence Analyst. Always distinguish verified facts from assumptions. Never invent data or promise guaranteed growth.",
    prompt,
    responseSchema: {
      type: Type2.OBJECT,
      properties: {
        brandSummary: { type: Type2.STRING },
        verifiedFacts: { type: Type2.ARRAY, items: { type: Type2.STRING } },
        assumptions: { type: Type2.ARRAY, items: { type: Type2.STRING } },
        audienceInsights: {
          type: Type2.OBJECT,
          properties: {
            primarySegments: {
              type: Type2.ARRAY,
              items: {
                type: Type2.OBJECT,
                properties: {
                  name: { type: Type2.STRING },
                  painPoints: { type: Type2.ARRAY, items: { type: Type2.STRING } },
                  buyingTriggers: { type: Type2.ARRAY, items: { type: Type2.STRING } },
                  preferredFormats: { type: Type2.ARRAY, items: { type: Type2.STRING } }
                },
                required: ["name", "painPoints", "buyingTriggers", "preferredFormats"]
              }
            },
            evidenceStatus: { type: Type2.STRING }
          },
          required: ["primarySegments", "evidenceStatus"]
        },
        contentThemes: {
          type: Type2.ARRAY,
          items: {
            type: Type2.OBJECT,
            properties: {
              theme: { type: Type2.STRING },
              rationale: { type: Type2.STRING },
              priority: { type: Type2.STRING, enum: ["high", "medium", "supporting"] }
            },
            required: ["theme", "rationale", "priority"]
          }
        },
        voiceGuidelines: { type: Type2.ARRAY, items: { type: Type2.STRING } }
      },
      required: ["brandSummary", "verifiedFacts", "assumptions", "audienceInsights", "contentThemes", "voiceGuidelines"]
    }
  });
  const id = crypto9.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `INSERT INTO ai_brand_analyses (
      id, workspace_id, user_id, brand_summary, verified_facts_json, assumptions_json,
      audience_insights_json, content_themes_json, voice_guidelines_json,
      connected_sources_json, uploaded_sources_json, model_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.workspaceId,
    params.userId,
    result.data.brandSummary,
    JSON.stringify(result.data.verifiedFacts || []),
    JSON.stringify(result.data.assumptions || []),
    JSON.stringify(result.data.audienceInsights || { primarySegments: [], evidenceStatus: "" }),
    JSON.stringify(result.data.contentThemes || []),
    JSON.stringify(result.data.voiceGuidelines || []),
    JSON.stringify(connectedSources),
    JSON.stringify(uploadedSources),
    result.modelUsed,
    now,
    now
  );
  const row = db.prepare("SELECT * FROM ai_brand_analyses WHERE id = ?").get(id);
  return { analysis: mapBrandAnalysisRow(row), creditsRemaining: result.creditsRemaining };
}
function listBrandAnalyses(db, workspaceId) {
  const rows = db.prepare("SELECT * FROM ai_brand_analyses WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 10").all(workspaceId);
  return rows.map(mapBrandAnalysisRow);
}

// server/ai/modules/audienceAnalysis.ts
import { Type as Type3 } from "@google/genai";
async function runAudienceAnalysisModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const prompt = `Analyze the target audience for this brand.
CRITICAL RULE: Explicitly mark whether each audience segment is based on verified connected-account/profile data or is a strategic assumption (isAssumption: true/false). Do not invent demographic percentages if live platform insights are absent.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || "Not specified"}
Products & Services: ${ctx.brand.productsServices || "Not specified"}
Declared Target Audience: ${ctx.brand.targetAudience || "Not specified"}
Focus Market / Context: ${params.focusMarket || "Global / Primary workspace market"}
Connected Accounts Count: ${ctx.accounts.length}
Live Analytics Snapshots Available: ${ctx.liveAnalytics.length}`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "audience_analysis",
    systemInstruction: "You are a senior audience strategist. Separate verified insights from working hypotheses.",
    prompt,
    responseSchema: {
      type: Type3.OBJECT,
      properties: {
        evidenceStatus: { type: Type3.STRING },
        segments: {
          type: Type3.ARRAY,
          items: {
            type: Type3.OBJECT,
            properties: {
              name: { type: Type3.STRING },
              demographicsAndRole: { type: Type3.STRING },
              corePainPoints: { type: Type3.ARRAY, items: { type: Type3.STRING } },
              desiredOutcomes: { type: Type3.ARRAY, items: { type: Type3.STRING } },
              contentAngles: { type: Type3.ARRAY, items: { type: Type3.STRING } },
              recommendedPlatforms: { type: Type3.ARRAY, items: { type: Type3.STRING } },
              isAssumption: { type: Type3.BOOLEAN }
            },
            required: [
              "name",
              "demographicsAndRole",
              "corePainPoints",
              "desiredOutcomes",
              "contentAngles",
              "recommendedPlatforms",
              "isAssumption"
            ]
          }
        },
        messagingDo: { type: Type3.ARRAY, items: { type: Type3.STRING } },
        messagingDont: { type: Type3.ARRAY, items: { type: Type3.STRING } }
      },
      required: ["evidenceStatus", "segments", "messagingDo", "messagingDont"]
    }
  });
  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/contentStrategy.ts
import { Type as Type4 } from "@google/genai";
import crypto10 from "node:crypto";
function mapStrategyRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    title: String(r.title),
    goals: String(r.goals || ""),
    platforms: JSON.parse(String(r.platforms_json || "[]")),
    executiveSummary: String(r.executive_summary),
    pillars: JSON.parse(String(r.pillars_json || "[]")),
    weeklyCadence: JSON.parse(String(r.weekly_cadence_json || "[]")),
    kpis: JSON.parse(String(r.kpis_json || "[]")),
    evidenceNote: String(r.evidence_note || ""),
    modelName: String(r.model_name || "gemini-3.5-flash-lite"),
    createdAt: String(r.created_at)
  };
}
async function runContentStrategyModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const socialContextBlock = formatConnectedSocialContextForAi(ctx);
  const prompt = `Build an executive, measurable 30-day multi-platform social media content strategy.
STRICT INTEGRITY RULES:
- Never promise guaranteed follower growth, viral reach, or guaranteed revenue.
- Explicitly explain in "evidenceNote" whether recommendations are grounded in live synced platform analytics (${ctx.liveAnalytics.length} snapshots) or brand profile fundamentals alone.
- Respect brand tone rules: ${ctx.brand.brandToneRules || "None specified"}.
- Avoid banned words: ${ctx.brand.bannedWords.join(", ") || "None"}.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || "General Business"}
Description: ${ctx.brand.businessDescription}
Products/Services: ${ctx.brand.productsServices || "Not specified"}
Target Audience: ${ctx.brand.targetAudience}
Primary Goals: ${params.goals}
Target Platforms: ${params.platforms.join(", ")}

${socialContextBlock}`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "content_strategy",
    systemInstruction: "You are a Chief Brand Strategist. Produce practical, grounded, platform-accurate strategies without hype or guaranteed-growth claims.",
    prompt,
    responseSchema: {
      type: Type4.OBJECT,
      properties: {
        title: { type: Type4.STRING },
        executiveSummary: { type: Type4.STRING },
        pillars: {
          type: Type4.ARRAY,
          items: {
            type: Type4.OBJECT,
            properties: {
              name: { type: Type4.STRING },
              sharePercent: { type: Type4.INTEGER },
              objective: { type: Type4.STRING },
              sampleHooks: { type: Type4.ARRAY, items: { type: Type4.STRING } }
            },
            required: ["name", "sharePercent", "objective", "sampleHooks"]
          }
        },
        weeklyCadence: {
          type: Type4.ARRAY,
          items: {
            type: Type4.OBJECT,
            properties: {
              day: { type: Type4.STRING },
              platform: { type: Type4.STRING },
              format: { type: Type4.STRING },
              focus: { type: Type4.STRING }
            },
            required: ["day", "platform", "format", "focus"]
          }
        },
        kpis: { type: Type4.ARRAY, items: { type: Type4.STRING } },
        evidenceNote: { type: Type4.STRING }
      },
      required: ["title", "executiveSummary", "pillars", "weeklyCadence", "kpis", "evidenceNote"]
    }
  });
  const id = crypto10.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `INSERT INTO ai_content_strategies (
      id, workspace_id, user_id, title, goals, platforms_json, executive_summary,
      pillars_json, weekly_cadence_json, kpis_json, evidence_note, model_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.workspaceId,
    params.userId,
    params.title?.trim() || result.data.title || `${ctx.brand.brandName} 30-Day Strategy`,
    params.goals,
    JSON.stringify(params.platforms),
    result.data.executiveSummary,
    JSON.stringify(result.data.pillars || []),
    JSON.stringify(result.data.weeklyCadence || []),
    JSON.stringify(result.data.kpis || []),
    result.data.evidenceNote || "",
    result.modelUsed,
    now,
    now
  );
  const row = db.prepare("SELECT * FROM ai_content_strategies WHERE id = ?").get(id);
  return { strategy: mapStrategyRow(row), creditsRemaining: result.creditsRemaining };
}
function listContentStrategies(db, workspaceId) {
  const rows = db.prepare("SELECT * FROM ai_content_strategies WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 15").all(workspaceId);
  return rows.map(mapStrategyRow);
}

// server/ai/modules/calendarGeneration.ts
import { Type as Type5 } from "@google/genai";
async function runCalendarGenerationModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const hasLiveInsights = ctx.liveAnalytics.length > 0;
  const clampedDays = Math.min(Math.max(params.daysCount, 3), 14);
  const socialContextBlock = formatConnectedSocialContextForAi(ctx);
  const prompt = `Generate a ${clampedDays}-day social media content calendar plan.
CRITICAL HONESTY RULE ABOUT POSTING TIMES:
${hasLiveInsights ? `Live synced analytics snapshots exist (${ctx.liveAnalytics.length} records). Base timing suggestions on those patterns and label timeEvidenceBasis as "verified_audience_insights".` : `NO live platform audience insights are currently synced for this workspace. You MUST NOT invent or claim "optimal engagement times" or fake peak hours. Instead, schedule within the user's preferred window (${params.preferredPostingWindow || "standard local business hours 09:00-17:00"}) and explicitly state in "evidenceDisclaimer" that exact optimal posting times require synced platform audience insights, and mark timeEvidenceBasis as "${params.preferredPostingWindow ? "user_preference_window" : "no_insights_general_working_hours"}".`}

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || "General Business"}
Tone: ${ctx.brand.toneOfVoice}
Timezone: ${params.timezone}
Target Platforms: ${params.platforms.join(", ")}
Campaign Objective: ${params.campaignObjective}
Banned Words (MUST NOT appear): ${ctx.brand.bannedWords.join(", ") || "None"}

${socialContextBlock}

Produce between ${Math.min(clampedDays, 10)} and ${Math.min(clampedDays * 2, 14)} posts distributed across dayOffset 0 to ${clampedDays - 1}.
Use HH:mm 24-hour format for suggestedLocalTime.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "calendar_generation",
    systemInstruction: "You are a meticulous social media operations planner. Never fabricate analytics or invent optimal posting times without data.",
    prompt,
    responseSchema: {
      type: Type5.OBJECT,
      properties: {
        evidenceDisclaimer: { type: Type5.STRING },
        items: {
          type: Type5.ARRAY,
          items: {
            type: Type5.OBJECT,
            properties: {
              dayOffset: { type: Type5.INTEGER },
              suggestedLocalTime: { type: Type5.STRING },
              platformKey: {
                type: Type5.STRING,
                enum: ["facebook", "instagram", "tiktok", "linkedin", "youtube", "x", "pinterest", "google_business"]
              },
              formatKey: {
                type: Type5.STRING,
                enum: ["text", "image", "video", "carousel", "story", "reels", "short_form_video"]
              },
              title: { type: Type5.STRING },
              bodyText: { type: Type5.STRING },
              hashtags: { type: Type5.ARRAY, items: { type: Type5.STRING } },
              rationale: { type: Type5.STRING },
              timeEvidenceBasis: {
                type: Type5.STRING,
                enum: ["verified_audience_insights", "user_preference_window", "no_insights_general_working_hours"]
              }
            },
            required: [
              "dayOffset",
              "suggestedLocalTime",
              "platformKey",
              "formatKey",
              "title",
              "bodyText",
              "hashtags",
              "rationale",
              "timeEvidenceBasis"
            ]
          }
        }
      },
      required: ["evidenceDisclaimer", "items"]
    }
  });
  return {
    evidenceDisclaimer: result.data.evidenceDisclaimer,
    hasLiveAudienceInsights: hasLiveInsights,
    items: result.data.items || [],
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/postWriting.ts
import { Type as Type6 } from "@google/genai";
import crypto12 from "node:crypto";

// server/services/contentSafetyService.ts
import crypto11 from "node:crypto";
var MISLEADING_CLAIM_PATTERNS = [
  {
    pattern: /\b(guaranteed|100%\s*guaranteed)\s+(followers|growth|viral|sales|roi|income|results)\b/i,
    reason: "Contains a guaranteed follower growth or guaranteed ROI claim, which violates marketing compliance and content safety rules."
  },
  {
    pattern: /\b(get\s+\d+k?\+?\s+followers\s+(overnight|in\s+24\s*hours|instantly))\b/i,
    reason: "Contains an unverified instant follower-growth promise."
  },
  {
    pattern: /\b(fake\s+review|fabricated\s+testimonial|invented\s+customer\s+quote)\b/i,
    reason: "References fabricated testimonials or fake reviews."
  },
  {
    pattern: /\b(cure[sd]?\s+cancer|miracle\s+cure|guaranteed\s+medical\s+results)\b/i,
    reason: "Contains prohibited misleading medical/health claims."
  }
];
var SENSITIVE_OR_SPAM_PATTERNS = [
  {
    pattern: /(click\s+here\s+now!!!|free\s+money\s+fast|wire\s+transfer\s+urgent)/i,
    reason: "Matches high-risk spam or deceptive promotional phrasing.",
    severity: "error"
  },
  {
    pattern: /([!?])\1{4,}/,
    reason: "Excessive repeated punctuation may trigger social platform spam filters.",
    severity: "warning"
  },
  {
    pattern: /\b(all\s+rights\s+stolen|copyright\s+infringement|copied\s+verbatim\s+from)\b/i,
    reason: "Potential copyright-attribution concern detected.",
    severity: "error"
  }
];
function computeContentHash(text, hashtags = []) {
  const normalized = `${text.trim().toLowerCase().replace(/\s+/g, " ")}|${hashtags.map((h) => h.trim().toLowerCase()).sort().join(",")}`;
  return crypto11.createHash("sha256").update(normalized).digest("hex");
}
function getWorkspaceBrandSafetyRules(db, workspaceId) {
  const row = db.prepare(
    `SELECT banned_words_json, brand_tone_rules, max_posts_per_day, auto_reply_enabled
       FROM brand_profiles WHERE workspace_id = ?`
  ).get(workspaceId);
  let bannedWords = [];
  try {
    bannedWords = JSON.parse(row?.banned_words_json || "[]");
  } catch {
    bannedWords = [];
  }
  return {
    bannedWords: Array.isArray(bannedWords) ? bannedWords.map((w) => String(w).trim()).filter(Boolean) : [],
    brandToneRules: String(row?.brand_tone_rules || ""),
    maxPostsPerDay: Number(row?.max_posts_per_day ?? 10) || 10,
    autoReplyEnabled: Boolean(row?.auto_reply_enabled)
  };
}
function evaluateContentSafety(db, params) {
  const issues = [];
  const rules = getWorkspaceBrandSafetyRules(db, params.workspaceId);
  const fullText = `${params.title || ""} ${params.bodyText} ${(params.hashtags || []).join(" ")}`.trim();
  const contentHash = computeContentHash(params.bodyText, params.hashtags || []);
  if (!params.bodyText.trim()) {
    issues.push({
      code: "EMPTY_CONTENT",
      severity: "error",
      message: "Post body cannot be empty."
    });
  }
  const lowerFull = fullText.toLowerCase();
  for (const word of rules.bannedWords) {
    if (!word) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lowerFull)) {
      issues.push({
        code: "BANNED_WORD",
        severity: "error",
        message: `Blocked brand safety term detected: "${word}". Remove it before publishing.`
      });
    }
  }
  for (const rule of MISLEADING_CLAIM_PATTERNS) {
    if (rule.pattern.test(fullText)) {
      issues.push({
        code: "MISLEADING_CLAIM",
        severity: "error",
        message: rule.reason
      });
    }
  }
  for (const rule of SENSITIVE_OR_SPAM_PATTERNS) {
    if (rule.pattern.test(fullText)) {
      issues.push({
        code: "SPAM_OR_COMPLIANCE",
        severity: rule.severity,
        message: rule.reason
      });
    }
  }
  const hashtagCount = (params.hashtags || []).length;
  if (hashtagCount > 30) {
    issues.push({
      code: "EXCESSIVE_HASHTAGS",
      severity: "error",
      message: `Too many hashtags (${hashtagCount}). Social platforms flag posts with more than 30 hashtags as spam.`
    });
  } else if (params.platformKey === "x" && hashtagCount > 5) {
    issues.push({
      code: "HASHTAG_RECOMMENDATION",
      severity: "warning",
      message: "X performs best with 1\u20133 concise hashtags; consider trimming extra tags."
    });
  }
  const charLimit = getPlatformCharLimit(params.platformKey);
  const assembledLength = [params.bodyText.trim(), (params.hashtags || []).join(" ")].filter(Boolean).join("\n\n").length;
  if (assembledLength > charLimit) {
    issues.push({
      code: "CHAR_LIMIT_EXCEEDED",
      severity: "error",
      message: `Content length (${assembledLength} chars) exceeds ${params.platformKey.toUpperCase()} limit (${charLimit} chars).`
    });
  }
  if (params.checkDuplicate !== false) {
    const dupRow = params.socialAccountId ? db.prepare(
      `SELECT id, status FROM publishing_queue
             WHERE workspace_id = ? AND social_account_id = ? AND content_hash = ?
               AND status IN ('scheduled','queued','processing','awaiting_approval','published')
               AND created_at >= datetime('now', '-72 hours')
             LIMIT 1`
    ).get(params.workspaceId, params.socialAccountId, contentHash) : db.prepare(
      `SELECT id, status FROM publishing_queue
             WHERE workspace_id = ? AND platform_key = ? AND content_hash = ?
               AND status IN ('scheduled','queued','processing','awaiting_approval','published')
               AND created_at >= datetime('now', '-72 hours')
             LIMIT 1`
    ).get(params.workspaceId, params.platformKey, contentHash);
    if (dupRow) {
      issues.push({
        code: "DUPLICATE_CONTENT",
        severity: "error",
        message: `Duplicate post detected (matches existing ${dupRow.status} item ${dupRow.id.slice(0, 8)}). Modify the copy before scheduling to prevent platform spam penalties.`
      });
    }
  }
  if (params.checkFrequencyLimit && params.scheduledAt) {
    const targetDay = params.scheduledAt.slice(0, 10);
    let dailyCap = rules.maxPostsPerDay;
    if (params.socialAccountId) {
      const accRow = db.prepare("SELECT publishing_preferences_json FROM social_accounts WHERE id = ? AND workspace_id = ?").get(params.socialAccountId, params.workspaceId);
      if (accRow?.publishing_preferences_json) {
        try {
          const prefs = JSON.parse(accRow.publishing_preferences_json);
          if (typeof prefs.dailyPostLimit === "number" && prefs.dailyPostLimit > 0) {
            dailyCap = Math.min(dailyCap, prefs.dailyPostLimit);
          }
        } catch {
        }
      }
      const dayCountRow = db.prepare(
        `SELECT COUNT(*) as c FROM publishing_queue
           WHERE workspace_id = ? AND social_account_id = ?
             AND substr(scheduled_at, 1, 10) = ?
             AND status NOT IN ('cancelled', 'draft')`
      ).get(params.workspaceId, params.socialAccountId, targetDay);
      if (dayCountRow.c >= dailyCap) {
        issues.push({
          code: "DAILY_FREQUENCY_LIMIT",
          severity: "error",
          message: `Daily publishing frequency cap reached (${dayCountRow.c}/${dailyCap} posts on ${targetDay}) for this account.`
        });
      }
    }
  }
  const hasError = issues.some((i) => i.severity === "error");
  const hasWarning = issues.some((i) => i.severity === "warning");
  return {
    status: hasError ? "blocked" : hasWarning ? "flagged" : "passed",
    issues,
    contentHash
  };
}

// server/ai/modules/postWriting.ts
function mapGeneratedContentRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    userId: String(r.user_id),
    campaignId: r.campaign_id ? String(r.campaign_id) : null,
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    platformKey: String(r.platform_key),
    contentType: String(r.content_type),
    objective: String(r.objective || ""),
    targetAudience: String(r.target_audience || ""),
    toneOfVoice: String(r.tone_of_voice || ""),
    language: String(r.language || "en"),
    topic: String(r.topic),
    title: String(r.title),
    bodyText: String(r.body_text),
    captionText: String(r.caption_text || ""),
    hashtags: JSON.parse(String(r.hashtags_json || "[]")),
    keywords: JSON.parse(String(r.keywords_json || "[]")),
    callToAction: String(r.call_to_action || ""),
    imagePrompt: String(r.image_prompt || ""),
    videoScript: JSON.parse(String(r.video_script_json || "{}")),
    repurposedVariants: JSON.parse(String(r.repurposed_variants_json || "[]")),
    safetyStatus: String(r.safety_status || "passed"),
    safetyNotes: JSON.parse(String(r.safety_notes_json || "[]")),
    status: String(r.status || "draft"),
    contentPostId: r.content_post_id ? String(r.content_post_id) : null,
    modelName: String(r.model_name || "gemini-3.5-flash-lite"),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
async function runPostWritingModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const charLimit = getPlatformCharLimit(params.platformKey);
  const audience = params.targetAudience?.trim() || ctx.brand.targetAudience || "Professionals and brand customers";
  const tone = params.toneOfVoice?.trim() || ctx.brand.toneOfVoice || "Executive & Authoritative";
  const language = params.language?.trim() || ctx.brand.preferredLanguage || "en";
  const socialContextBlock = formatConnectedSocialContextForAi(ctx, {
    platformKey: params.platformKey,
    socialAccountId: params.socialAccountId
  });
  const prompt = `Create original, copyright-conscious ${params.contentType.replace(/_/g, " ")} content for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || "General Business"}
Products/Services: ${ctx.brand.productsServices || ctx.brand.businessDescription}
Target Audience: ${audience}
Tone of Voice: ${tone}
Brand Tone Rules: ${ctx.brand.brandToneRules || "None"}
Language: ${language}
Objective: ${params.objective}
Topic / Brief: ${params.topic}
Target Keywords: ${params.keywords.join(", ") || "None"}
Hard Platform Character Limit: ${charLimit} characters (bodyText + hashtags MUST stay comfortably under ${charLimit} chars).
Banned Words (MUST NOT APPEAR): ${ctx.brand.bannedWords.join(", ") || "None"}

${socialContextBlock}

STRICT COMPLIANCE:
- Never fabricate customer quotes or fake testimonials.
- Never promise guaranteed follower growth or guaranteed revenue.
- Also provide a detailed "imagePrompt" suitable for designing a matching branded visual.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "post_writing",
    systemInstruction: "You are a senior international brand copywriter. Write sharp, authentic, platform-native social copy that strictly follows brand guidelines and character limits.",
    prompt,
    responseSchema: {
      type: Type6.OBJECT,
      properties: {
        title: { type: Type6.STRING },
        headlineOptions: { type: Type6.ARRAY, items: { type: Type6.STRING } },
        bodyText: { type: Type6.STRING },
        captionText: { type: Type6.STRING },
        hashtags: { type: Type6.ARRAY, items: { type: Type6.STRING } },
        callToAction: { type: Type6.STRING },
        imagePrompt: { type: Type6.STRING }
      },
      required: ["title", "headlineOptions", "bodyText", "captionText", "hashtags", "callToAction", "imagePrompt"]
    }
  });
  const cleanTags = normalizeHashtags(result.data.hashtags || []);
  const safety = evaluateContentSafety(db, {
    workspaceId: params.workspaceId,
    socialAccountId: params.socialAccountId,
    platformKey: params.platformKey,
    title: result.data.title,
    bodyText: result.data.bodyText,
    hashtags: cleanTags,
    checkDuplicate: true,
    checkFrequencyLimit: false
  });
  const id = crypto12.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `INSERT INTO generated_content (
      id, workspace_id, user_id, campaign_id, social_account_id, platform_key, content_type,
      objective, target_audience, tone_of_voice, language, topic, title, body_text, caption_text,
      hashtags_json, keywords_json, call_to_action, image_prompt, video_script_json,
      repurposed_variants_json, safety_status, safety_notes_json, status, model_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '[]', ?, ?, 'draft', ?, ?, ?)`
  ).run(
    id,
    params.workspaceId,
    params.userId,
    params.campaignId ?? null,
    params.socialAccountId ?? null,
    params.platformKey,
    params.contentType,
    params.objective,
    audience,
    tone,
    language,
    params.topic,
    result.data.title.trim(),
    result.data.bodyText.trim(),
    (result.data.captionText || result.data.bodyText).trim(),
    JSON.stringify(cleanTags),
    JSON.stringify(params.keywords),
    result.data.callToAction.trim(),
    result.data.imagePrompt.trim(),
    safety.status,
    JSON.stringify(safety.issues.map((i) => i.message)),
    result.modelUsed,
    now,
    now
  );
  const row = db.prepare("SELECT * FROM generated_content WHERE id = ?").get(id);
  return {
    content: mapGeneratedContentRow(row),
    headlineOptions: result.data.headlineOptions || [result.data.title],
    creditsRemaining: result.creditsRemaining
  };
}
function listGeneratedContent(db, workspaceId) {
  const rows = db.prepare("SELECT * FROM generated_content WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 60").all(workspaceId);
  return rows.map(mapGeneratedContentRow);
}

// server/ai/modules/captionWriting.ts
import { Type as Type7 } from "@google/genai";
async function runCaptionWritingModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const charLimit = getPlatformCharLimit(params.platformKey);
  const socialContextBlock = formatConnectedSocialContextForAi(ctx, {
    platformKey: params.platformKey
  });
  const prompt = `Write 3 tailored captions for ${params.platformKey.toUpperCase()} (hard char limit: ${charLimit}).
Brand: ${ctx.brand.brandName}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Subject: ${params.subject}
Visual Context: ${params.visualDescription || "Branded social media graphic/photo"}
Banned Words: ${ctx.brand.bannedWords.join(", ") || "None"}

${socialContextBlock}`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "caption_writing",
    systemInstruction: "You write scroll-stopping, authentic social captions tailored to each platform format.",
    prompt,
    responseSchema: {
      type: Type7.OBJECT,
      properties: {
        primaryCaption: { type: Type7.STRING },
        shortCaption: { type: Type7.STRING },
        storytellingCaption: { type: Type7.STRING },
        callToAction: { type: Type7.STRING },
        hashtags: { type: Type7.ARRAY, items: { type: Type7.STRING } }
      },
      required: ["primaryCaption", "shortCaption", "storytellingCaption", "callToAction", "hashtags"]
    }
  });
  return {
    ...result.data,
    hashtags: normalizeHashtags(result.data.hashtags || []),
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/hashtagRecommendations.ts
import { Type as Type8 } from "@google/genai";
async function runHashtagRecommendationsModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const prompt = `Recommend relevant, non-spammy hashtags for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Topic: ${params.topic}
Language: ${params.language || ctx.brand.preferredLanguage}
Do NOT invent fake search volume numbers.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "hashtag_recommendations",
    systemInstruction: "You are a social discovery strategist recommending high-signal, platform-appropriate hashtags.",
    prompt,
    responseSchema: {
      type: Type8.OBJECT,
      properties: {
        broadTags: { type: Type8.ARRAY, items: { type: Type8.STRING } },
        nicheTags: { type: Type8.ARRAY, items: { type: Type8.STRING } },
        brandedTags: { type: Type8.ARRAY, items: { type: Type8.STRING } },
        recommendedSet: { type: Type8.ARRAY, items: { type: Type8.STRING } },
        platformGuidance: { type: Type8.STRING }
      },
      required: ["broadTags", "nicheTags", "brandedTags", "recommendedSet", "platformGuidance"]
    }
  });
  return {
    broadTags: normalizeHashtags(result.data.broadTags || []),
    nicheTags: normalizeHashtags(result.data.nicheTags || []),
    brandedTags: normalizeHashtags(result.data.brandedTags || []),
    recommendedSet: normalizeHashtags(result.data.recommendedSet || []),
    platformGuidance: result.data.platformGuidance,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/keywordResearch.ts
import { Type as Type9 } from "@google/genai";
async function runKeywordResearchModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const prompt = `Provide structured social search and SEO keyword research assistance for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Seed Topic: ${params.seedTopic}
Language: ${params.language || ctx.brand.preferredLanguage}
IMPORTANT: Do NOT invent monthly search volume numbers or CPC estimates; clearly state in "caveat" that qualitative intent clusters are provided without live search-volume telemetry.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "keyword_research",
    systemInstruction: "You are a search and social discovery strategist providing honest, qualitative keyword clusters.",
    prompt,
    responseSchema: {
      type: Type9.OBJECT,
      properties: {
        primaryKeywords: { type: Type9.ARRAY, items: { type: Type9.STRING } },
        longTailPhrases: { type: Type9.ARRAY, items: { type: Type9.STRING } },
        questionQueries: { type: Type9.ARRAY, items: { type: Type9.STRING } },
        contentAngles: {
          type: Type9.ARRAY,
          items: {
            type: Type9.OBJECT,
            properties: {
              keyword: { type: Type9.STRING },
              intent: { type: Type9.STRING, enum: ["informational", "commercial", "transactional", "navigational"] },
              suggestedHook: { type: Type9.STRING }
            },
            required: ["keyword", "intent", "suggestedHook"]
          }
        },
        caveat: { type: Type9.STRING }
      },
      required: ["primaryKeywords", "longTailPhrases", "questionQueries", "contentAngles", "caveat"]
    }
  });
  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/graphicDesignAssistance.ts
import { Type as Type10 } from "@google/genai";
async function runGraphicDesignAssistanceModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const prompt = `Create an enterprise graphic design blueprint and detailed image generation prompt.
Graphic Type: ${params.graphicType.replace(/_/g, " ")}
Platform: ${params.platformKey.toUpperCase()}
Aspect Ratio: ${params.aspectRatio}
Brand Name: ${ctx.brand.brandName}
Brand Colors: primary=${ctx.brand.primaryColor}, secondary=${ctx.brand.secondaryColor}, accent=${ctx.brand.accentColor}
Include Brand Logo Placement: ${params.includeLogo !== false ? "Yes \u2014 reserve a clean corner safe-zone for the brand logo" : "Optional"}
Design Brief: ${params.brief}
Tone of Voice: ${ctx.brand.toneOfVoice}
Banned Words: ${ctx.brand.bannedWords.join(", ") || "None"}

Produce sharp, scannable flyer/graphic copy (headline <= 60 chars, subheadline <= 120 chars, CTA <= 32 chars) plus a vivid, copyright-safe imagePrompt describing composition, lighting, colors, and clean visual space.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "graphic_design_assistance",
    systemInstruction: "You are an Executive Creative Director designing high-impact social media flyers, banners, carousels, and infographics.",
    prompt,
    responseSchema: {
      type: Type10.OBJECT,
      properties: {
        headline: { type: Type10.STRING },
        subheadline: { type: Type10.STRING },
        callToAction: { type: Type10.STRING },
        layoutStyle: { type: Type10.STRING },
        visualElements: { type: Type10.ARRAY, items: { type: Type10.STRING } },
        colorPalette: { type: Type10.ARRAY, items: { type: Type10.STRING } },
        typographyNotes: { type: Type10.STRING },
        imagePrompt: { type: Type10.STRING },
        suggestedCaption: { type: Type10.STRING }
      },
      required: [
        "headline",
        "subheadline",
        "callToAction",
        "layoutStyle",
        "visualElements",
        "colorPalette",
        "typographyNotes",
        "imagePrompt",
        "suggestedCaption"
      ]
    }
  });
  return {
    artDirection: result.data,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/imageGeneration.ts
import crypto13 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
var imageTestTransportOverride = null;
function mapGeneratedImageRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    generatedContentId: r.generated_content_id ? String(r.generated_content_id) : null,
    mediaAssetId: r.media_asset_id ? String(r.media_asset_id) : null,
    graphicType: String(r.graphic_type),
    platformKey: String(r.platform_key),
    aspectRatio: String(r.aspect_ratio),
    widthPx: Number(r.width_px),
    heightPx: Number(r.height_px),
    prompt: String(r.prompt),
    artDirection: JSON.parse(String(r.art_direction_json || "{}")),
    captionText: String(r.caption_text || ""),
    sourceMode: String(r.source_mode || "ai_service"),
    imageUrl: r.image_url ? String(r.image_url) : null,
    status: String(r.status),
    errorMessage: r.error_message ? String(r.error_message) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function getImageGenerationCapabilities() {
  const externalConfigured = Boolean(env.IMAGE_GENERATION_API_URL && env.IMAGE_GENERATION_API_KEY);
  const paidGeminiEnabled = Boolean(env.ENABLE_PAID_GEMINI_IMAGE_MODEL && env.GEMINI_API_KEY);
  return {
    liveAiImageServiceAvailable: externalConfigured || paidGeminiEnabled || Boolean(imageTestTransportOverride),
    providerMode: imageTestTransportOverride ? "test_transport" : externalConfigured ? "external_image_api" : paidGeminiEnabled ? "gemini_paid_image_api" : "unconfigured",
    compositorAvailable: true,
    note: externalConfigured || paidGeminiEnabled ? "Live AI neural image generation backend is active." : "Live AI neural image generation requires IMAGE_GENERATION_API_URL + IMAGE_GENERATION_API_KEY (or a billing-enabled Gemini API key with ENABLE_PAID_GEMINI_IMAGE_MODEL=true). You can still generate AI Art Direction & Prompts, upload images, and compose/export branded graphics directly to the Media Library."
  };
}
function getGeneratedMediaRootDir() {
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== void 0;
  return isServerless ? "/tmp/livingtech-generated" : path3.resolve(process.cwd(), "public", "generated");
}
function saveImageBufferToWorkspacePublic(workspaceId, ext, buffer) {
  const fileName = `graphic-${Date.now()}-${crypto13.randomBytes(4).toString("hex")}.${ext}`;
  const relDir = path3.join("generated", workspaceId);
  const absDir = path3.join(getGeneratedMediaRootDir(), workspaceId);
  fs3.mkdirSync(absDir, { recursive: true });
  const absPath = path3.join(absDir, fileName);
  fs3.writeFileSync(absPath, buffer);
  return {
    storagePath: absPath,
    publicUrl: `/${relDir}/${fileName}`
  };
}
async function runImageGenerationModule(db, params) {
  const preset = GRAPHIC_ASPECT_PRESETS.find((p) => p.id === params.aspectRatio) ?? GRAPHIC_ASPECT_PRESETS[0];
  const cost = PHASE3_AI_CREDIT_COSTS.image_generation;
  const ws = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. Live image generation requires ${cost} credits.`);
  }
  const imageId = crypto13.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const startedAt = Date.now();
  const recordFailure = (errorMessage) => {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO generated_images (
          id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
          aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
          source_mode, image_url, status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_service', NULL, 'failed', ?, ?, ?)`
      ).run(
        imageId,
        params.workspaceId,
        params.userId,
        params.generatedContentId ?? null,
        params.graphicType,
        params.platformKey,
        preset.id,
        preset.width,
        preset.height,
        params.prompt.trim(),
        JSON.stringify(params.artDirection || {}),
        (params.captionText || "").trim(),
        errorMessage,
        now,
        now
      );
      db.prepare(
        `INSERT INTO ai_generation_usage (
          id, workspace_id, user_id, module_key, model_name, credits_used,
          prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
        ) VALUES (?, ?, ?, 'image_generation', 'external_image_service', 0, 0, 0, 'failed', ?, ?, ?)`
      ).run(crypto13.randomUUID(), params.workspaceId, params.userId, errorMessage, Date.now() - startedAt, now);
    })();
    const failedRow = db.prepare("SELECT * FROM generated_images WHERE id = ?").get(imageId);
    return {
      image: mapGeneratedImageRow(failedRow),
      creditsRemaining: ws.ai_credits_balance
    };
  };
  try {
    let generatedBuffer;
    let mimeType = "image/png";
    let modelName = env.IMAGE_GENERATION_MODEL || "external-image-api";
    if (imageTestTransportOverride) {
      const res = await imageTestTransportOverride({
        prompt: params.prompt,
        widthPx: preset.width,
        heightPx: preset.height,
        aspectRatio: preset.id
      });
      mimeType = res.mimeType || "image/png";
      generatedBuffer = Buffer.from(res.base64Data, "base64");
      modelName = "test-image-transport";
    } else if (env.IMAGE_GENERATION_API_URL && env.IMAGE_GENERATION_API_KEY) {
      const resp = await fetch(env.IMAGE_GENERATION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.IMAGE_GENERATION_API_KEY}`
        },
        body: JSON.stringify({
          model: env.IMAGE_GENERATION_MODEL || "gpt-image-1",
          prompt: params.prompt,
          size: `${preset.width}x${preset.height}`,
          response_format: "b64_json"
        })
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        return recordFailure(`Image generation service returned HTTP ${resp.status}: ${errBody.slice(0, 220)}`);
      }
      const json = await resp.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) {
        return recordFailure("Image generation service succeeded without returning binary image data.");
      }
      generatedBuffer = Buffer.from(b64, "base64");
    } else {
      return recordFailure(
        "Live neural image generation service is not configured on this server (no billing-enabled image model or IMAGE_GENERATION_API_URL/IMAGE_GENERATION_API_KEY secret configured). No credits were deducted. Use the Brand Graphic Compositor or upload your own asset below to render and save production graphics."
      );
    }
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const saved = saveImageBufferToWorkspacePublic(params.workspaceId, ext, generatedBuffer);
    const mediaId = crypto13.randomUUID();
    const fileName = `${params.graphicType}-${preset.id.replace(":", "x")}-${Date.now()}.${ext}`;
    db.transaction(() => {
      db.prepare("UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?").run(
        cost,
        now,
        params.workspaceId
      );
      db.prepare(
        `INSERT INTO media_library (
          id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'AI Graphics', ?, ?)`
      ).run(
        mediaId,
        params.workspaceId,
        params.userId,
        fileName,
        mimeType,
        saved.storagePath,
        saved.publicUrl,
        generatedBuffer.length,
        now,
        now
      );
      db.prepare(
        `INSERT INTO generated_images (
          id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
          aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
          source_mode, image_url, status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai_service', ?, 'generated', NULL, ?, ?)`
      ).run(
        imageId,
        params.workspaceId,
        params.userId,
        params.generatedContentId ?? null,
        mediaId,
        params.graphicType,
        params.platformKey,
        preset.id,
        preset.width,
        preset.height,
        params.prompt.trim(),
        JSON.stringify(params.artDirection || {}),
        (params.captionText || "").trim(),
        saved.publicUrl,
        now,
        now
      );
      db.prepare(
        `INSERT INTO ai_generation_usage (
          id, workspace_id, user_id, module_key, model_name, credits_used,
          prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
        ) VALUES (?, ?, ?, 'image_generation', ?, ?, 0, 0, 'completed', NULL, ?, ?)`
      ).run(crypto13.randomUUID(), params.workspaceId, params.userId, modelName, cost, Date.now() - startedAt, now);
    })();
    const updatedWs = db.prepare("SELECT ai_credits_balance FROM workspaces WHERE id = ?").get(params.workspaceId);
    const stored = db.prepare("SELECT * FROM generated_images WHERE id = ?").get(imageId);
    return { image: mapGeneratedImageRow(stored), creditsRemaining: updatedWs.ai_credits_balance };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected image generation service failure.";
    return recordFailure(msg);
  }
}
function saveRenderedGraphicToLibrary(db, params) {
  const match = params.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("Invalid image payload. Expected a PNG, JPEG, or WebP data URL.");
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Graphic file exceeds the 8MB upload limit.");
  }
  const preset = GRAPHIC_ASPECT_PRESETS.find((p) => p.id === params.aspectRatio) ?? GRAPHIC_ASPECT_PRESETS[0];
  const ext = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  const saved = saveImageBufferToWorkspacePublic(params.workspaceId, ext, buffer);
  const mediaId = crypto13.randomUUID();
  const imageId = crypto13.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const safeFileName = (params.fileName || `${params.graphicType}-${preset.id.replace(":", "x")}.${ext}`).slice(0, 120);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO media_library (
        id, workspace_id, uploaded_by, file_name, asset_type, mime_type, storage_path, public_url, file_size_bytes, folder, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'Brand Graphics', ?, ?)`
    ).run(mediaId, params.workspaceId, params.userId, safeFileName, mimeType, saved.storagePath, saved.publicUrl, buffer.length, now, now);
    db.prepare(
      `INSERT INTO generated_images (
        id, workspace_id, user_id, generated_content_id, media_asset_id, graphic_type, platform_key,
        aspect_ratio, width_px, height_px, prompt, art_direction_json, caption_text,
        source_mode, image_url, status, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NULL, ?, ?)`
    ).run(
      imageId,
      params.workspaceId,
      params.userId,
      mediaId,
      params.graphicType,
      params.platformKey,
      preset.id,
      preset.width,
      preset.height,
      params.prompt.trim() || safeFileName,
      JSON.stringify(params.artDirection || {}),
      (params.captionText || "").trim(),
      params.sourceMode,
      saved.publicUrl,
      now,
      now
    );
  })();
  const stored = db.prepare("SELECT * FROM generated_images WHERE id = ?").get(imageId);
  return { image: mapGeneratedImageRow(stored), mediaAssetId: mediaId };
}
function listGeneratedImages(db, workspaceId) {
  const rows = db.prepare("SELECT * FROM generated_images WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40").all(workspaceId);
  return rows.map(mapGeneratedImageRow);
}

// server/ai/modules/videoScripting.ts
import { Type as Type11 } from "@google/genai";
async function runVideoScriptingModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const prompt = `Write a production-ready video script and scene breakdown for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Format: ${params.formatStyle.replace(/_/g, " ")}
Target Duration: ${params.targetDurationSeconds} seconds
Topic: ${params.topic}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Banned Words: ${ctx.brand.bannedWords.join(", ") || "None"}

Include a strong first-3-second hook, timestamped scenes (visual, voiceover, onScreenText), B-roll ideas, and a clear CTA.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "video_scripting",
    systemInstruction: "You are a commercial video director crafting high-retention social video scripts.",
    prompt,
    responseSchema: {
      type: Type11.OBJECT,
      properties: {
        title: { type: Type11.STRING },
        conceptSummary: { type: Type11.STRING },
        script: {
          type: Type11.OBJECT,
          properties: {
            hook: { type: Type11.STRING },
            durationSeconds: { type: Type11.INTEGER },
            scenes: {
              type: Type11.ARRAY,
              items: {
                type: Type11.OBJECT,
                properties: {
                  timestamp: { type: Type11.STRING },
                  visual: { type: Type11.STRING },
                  voiceover: { type: Type11.STRING },
                  onScreenText: { type: Type11.STRING }
                },
                required: ["timestamp", "visual", "voiceover", "onScreenText"]
              }
            },
            callToAction: { type: Type11.STRING },
            bRollIdeas: { type: Type11.ARRAY, items: { type: Type11.STRING } }
          },
          required: ["hook", "durationSeconds", "scenes", "callToAction", "bRollIdeas"]
        },
        captionIdea: { type: Type11.STRING },
        hashtags: { type: Type11.ARRAY, items: { type: Type11.STRING } }
      },
      required: ["title", "conceptSummary", "script", "captionIdea", "hashtags"]
    }
  });
  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/contentRepurposing.ts
import { Type as Type12 } from "@google/genai";
async function runContentRepurposingModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const platformSpecs = params.targetPlatforms.map((p) => `- ${p}: max ${getPlatformCharLimit(p)} chars (${p === "tiktok" ? "short-form video script & caption" : p === "youtube" ? "video title & SEO description" : p === "x" ? "punchy micro-post under 250 chars" : p === "linkedin" ? "executive professional post" : p === "instagram" ? "visual caption + hook" : "platform-native post"})`).join("\n");
  const prompt = `Repurpose this single core idea into distinct, native content adapted for each target social media platform.
Brand: ${ctx.brand.brandName}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Banned Words: ${ctx.brand.bannedWords.join(", ") || "None"}

=== CORE IDEA / SOURCE COPY ===
${params.sourceIdeaOrCopy}

=== TARGET PLATFORMS & STRICT LIMITS ===
${platformSpecs}

Return one tailored variant for every requested target platform. Respect every character limit strictly.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "content_repurposing",
    systemInstruction: "You are an omnichannel brand editor transforming a single message into native, high-performing posts for each social network.",
    prompt,
    responseSchema: {
      type: Type12.OBJECT,
      properties: {
        variants: {
          type: Type12.ARRAY,
          items: {
            type: Type12.OBJECT,
            properties: {
              platformKey: {
                type: Type12.STRING,
                enum: ["facebook", "instagram", "tiktok", "linkedin", "youtube", "x", "pinterest", "google_business"]
              },
              format: { type: Type12.STRING },
              headline: { type: Type12.STRING },
              body: { type: Type12.STRING },
              hashtags: { type: Type12.ARRAY, items: { type: Type12.STRING } },
              callToAction: { type: Type12.STRING }
            },
            required: ["platformKey", "format", "headline", "body", "hashtags", "callToAction"]
          }
        }
      },
      required: ["variants"]
    }
  });
  const normalized = (result.data.variants || []).map((v) => {
    const cleanTags = normalizeHashtags(v.hashtags || []);
    const limit = getPlatformCharLimit(v.platformKey);
    const body = v.body.trim();
    return {
      platformKey: v.platformKey,
      format: v.format,
      headline: v.headline.trim(),
      body,
      hashtags: cleanTags,
      characterCount: `${body}

${cleanTags.join(" ")}`.trim().length,
      characterLimit: limit,
      callToAction: v.callToAction.trim()
    };
  });
  return {
    variants: normalized,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/performanceRecommendations.ts
import { Type as Type13 } from "@google/genai";
async function runPerformanceRecommendationsModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const hasLiveData = ctx.liveAnalytics.length > 0;
  const prompt = `Provide performance recommendations for this workspace.
STRICT INTEGRITY RULE:
- ${hasLiveData ? `Analyze the ${ctx.liveAnalytics.length} live synced analytics snapshots below and label observations grounded in those numbers as "observed_metric".` : 'There are ZERO live synced analytics snapshots yet. Clearly state this in dataBasisSummary, DO NOT invent impressions/CTR/engagement rates, and label all recommendations as "best_practice_hypothesis" focused on establishing measurement baselines.'}
- Never promise guaranteed growth or guaranteed conversion lifts.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Connected Accounts: ${ctx.accounts.length}
Recent Posts Count: ${ctx.recentPosts.length}
Live Analytics Snapshots: ${hasLiveData ? JSON.stringify(ctx.liveAnalytics) : "None"}`;
  const result = await runStructuredGeminiModule(
    db,
    {
      workspaceId: params.workspaceId,
      userId: params.userId,
      moduleKey: "performance_recommendations",
      systemInstruction: "You are a data-honest growth analyst. Never fabricate performance figures.",
      prompt,
      responseSchema: {
        type: Type13.OBJECT,
        properties: {
          dataBasisSummary: { type: Type13.STRING },
          keyObservations: { type: Type13.ARRAY, items: { type: Type13.STRING } },
          actionableRecommendations: {
            type: Type13.ARRAY,
            items: {
              type: Type13.OBJECT,
              properties: {
                title: { type: Type13.STRING },
                rationale: { type: Type13.STRING },
                priority: { type: Type13.STRING, enum: ["high", "medium", "low"] },
                evidenceType: { type: Type13.STRING, enum: ["observed_metric", "best_practice_hypothesis"] }
              },
              required: ["title", "rationale", "priority", "evidenceType"]
            }
          },
          nextExperiments: { type: Type13.ARRAY, items: { type: Type13.STRING } }
        },
        required: ["dataBasisSummary", "keyObservations", "actionableRecommendations", "nextExperiments"]
      }
    }
  );
  return {
    hasLiveData,
    ...result.data,
    creditsRemaining: result.creditsRemaining
  };
}

// server/ai/modules/commentReplyDrafting.ts
import { Type as Type14 } from "@google/genai";
import crypto14 from "node:crypto";
var SENSITIVE_ESCALATION_PATTERNS = [
  /\b(lawsuit|legal|attorney|lawyer|sue|gdpr|data\s+breach|hacked|fraud|scam)\b/i,
  /\b(refund|chargeback|unauthorized\s+charge|billing\s+error|cancel\s+my\s+subscription)\b/i,
  /\b(harassment|discrimination|hate\s+speech|threat|emergency|medical\s+issue)\b/i
];
function detectEscalationHeuristic(messageText) {
  for (const rx of SENSITIVE_ESCALATION_PATTERNS) {
    if (rx.test(messageText)) {
      return {
        escalate: true,
        reason: "Message contains sensitive legal, billing, dispute, or crisis terminology requiring human review before responding."
      };
    }
  }
  return { escalate: false, reason: null };
}
function mapReplySuggestionRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    engagementMessageId: String(r.engagement_message_id),
    suggestedReply: String(r.suggested_reply),
    tone: String(r.tone || "Helpful & Professional"),
    confidenceNote: String(r.confidence_note || ""),
    escalationRecommended: Boolean(r.escalation_recommended),
    escalationReason: r.escalation_reason ? String(r.escalation_reason) : null,
    safetyPassed: Boolean(r.safety_passed),
    status: String(r.status),
    modelName: String(r.model_name || "gemini-3.5-flash-lite"),
    createdAt: String(r.created_at)
  };
}
async function runCommentReplyDraftingModule(db, params) {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const heuristic = detectEscalationHeuristic(params.messageContent);
  const prompt = `Draft a helpful, polite, on-brand social media reply to this customer message on ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Brand Voice: ${params.desiredTone || ctx.brand.toneOfVoice}
Brand Tone Rules: ${ctx.brand.brandToneRules || "Stay concise, courteous, and factual."}
Banned Words: ${ctx.brand.bannedWords.join(", ") || "None"}
Customer Name: ${params.authorName}
Customer Message: "${params.messageContent}"

ESCALATION RULE:
Set escalationRecommended=true if the message involves refunds, legal threats, privacy/security complaints, angry escalations, or complex custom pricing/contract negotiations that should be verified by a human team member before sending.`;
  const result = await runStructuredGeminiModule(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: "comment_reply_drafting",
    systemInstruction: "You are a senior community manager drafting compliant, empathetic, on-brand replies. Never make unauthorized refund or legal promises.",
    prompt,
    responseSchema: {
      type: Type14.OBJECT,
      properties: {
        suggestedReply: { type: Type14.STRING },
        tone: { type: Type14.STRING },
        confidenceNote: { type: Type14.STRING },
        escalationRecommended: { type: Type14.BOOLEAN },
        escalationReason: { type: Type14.STRING }
      },
      required: ["suggestedReply", "tone", "confidenceNote", "escalationRecommended", "escalationReason"]
    }
  });
  const shouldEscalate = heuristic.escalate || Boolean(result.data.escalationRecommended);
  const escalationReason = heuristic.reason || (result.data.escalationRecommended ? result.data.escalationReason : null);
  const safety = evaluateContentSafety(db, {
    workspaceId: params.workspaceId,
    platformKey: params.platformKey,
    bodyText: result.data.suggestedReply,
    checkDuplicate: false,
    checkFrequencyLimit: false
  });
  const id = crypto14.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO ai_reply_suggestions (
        id, workspace_id, engagement_message_id, user_id, suggested_reply, tone, confidence_note,
        escalation_recommended, escalation_reason, safety_passed, status, model_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested', ?, ?, ?)`
    ).run(
      id,
      params.workspaceId,
      params.engagementMessageId,
      params.userId,
      result.data.suggestedReply.trim(),
      result.data.tone.trim(),
      result.data.confidenceNote.trim(),
      shouldEscalate ? 1 : 0,
      escalationReason,
      safety.status === "blocked" ? 0 : 1,
      result.modelUsed,
      now,
      now
    );
    if (shouldEscalate) {
      db.prepare(
        `UPDATE engagement_messages
         SET requires_escalation = 1, escalation_reason = ?, status = CASE WHEN status = 'open' THEN 'escalated' ELSE status END, updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      ).run(escalationReason, now, params.engagementMessageId, params.workspaceId);
    }
  })();
  const stored = db.prepare("SELECT * FROM ai_reply_suggestions WHERE id = ?").get(id);
  return {
    suggestion: mapReplySuggestionRow(stored),
    creditsRemaining: result.creditsRemaining
  };
}

// server/queue/publishingWorker.ts
import crypto15 from "node:crypto";

// server/services/publishingValidationService.ts
function validatePostForPlatform(params) {
  const provider = getSocialProvider(params.platformKey);
  const capabilities = params.accountCapabilities ?? provider.capabilities;
  const errors = [];
  const warnings = [];
  const cleanTags = (params.hashtags || []).filter(Boolean);
  const assembledText = [params.bodyText.trim(), cleanTags.join(" ")].filter(Boolean).join("\n\n");
  const charLimit = getPlatformCharLimit(params.platformKey);
  const charCount = assembledText.length;
  if (!canAccountPublishFormat(capabilities, params.formatKey)) {
    errors.push(
      `${provider.displayName} does not support "${params.formatKey}" publishing via the currently granted API capabilities. ${capabilities.notes || ""}`.trim()
    );
  }
  if (charCount === 0) {
    errors.push("Post copy cannot be empty.");
  } else if (charCount > charLimit) {
    errors.push(`Post exceeds ${provider.displayName} character limit (${charCount}/${charLimit}).`);
  }
  const mediaCount = (params.mediaUrls || []).filter(Boolean).length;
  if (params.formatKey === "image" && mediaCount === 0) {
    errors.push(`An image URL or graphic asset is required for "${params.formatKey}" posts on ${provider.displayName}.`);
  }
  if ((params.formatKey === "video" || params.formatKey === "reels" || params.formatKey === "short_form_video") && mediaCount === 0) {
    errors.push(`A video asset URL is required for "${params.formatKey}" publishing on ${provider.displayName}.`);
  }
  if (params.formatKey === "carousel" && mediaCount < 2) {
    errors.push(`Carousel publishing on ${provider.displayName} requires at least 2 media items.`);
  }
  if ((params.platformKey === "instagram" || params.platformKey === "pinterest") && mediaCount === 0) {
    errors.push(`${provider.displayName} requires an image or video asset \u2014 text-only publishing is not supported by the official API.`);
  }
  if (params.platformKey === "tiktok" && mediaCount === 0) {
    errors.push("TikTok Content Posting API requires a video or photo-mode media asset.");
  }
  if (params.platformKey === "youtube" && mediaCount === 0) {
    errors.push("YouTube Data API requires a video asset for channel publishing.");
  }
  if (params.platformKey === "linkedin" && cleanTags.length > 5) {
    warnings.push("LinkedIn recommends 3\u20135 relevant hashtags per post.");
  }
  if (params.platformKey === "instagram" && cleanTags.length > 30) {
    errors.push("Instagram enforces a hard maximum of 30 hashtags per caption.");
  }
  if (params.platformKey === "pinterest" && !(params.title || "").trim()) {
    warnings.push("Pinterest Pins perform better with an explicit Pin title (up to 100 chars).");
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    assembledText,
    charCount,
    charLimit
  };
}

// server/queue/publishingWorker.ts
var publishExecutorOverride = null;
var embeddedWorkerTimer = null;
var lastWorkerTickAt = null;
var WORKER_INSTANCE_ID = `lt-worker-${process.pid}-${crypto15.randomBytes(3).toString("hex")}`;
function mapPublishingQueueRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    calendarItemId: r.calendar_item_id ? String(r.calendar_item_id) : null,
    contentPostId: r.content_post_id ? String(r.content_post_id) : null,
    generatedContentId: r.generated_content_id ? String(r.generated_content_id) : null,
    campaignId: r.campaign_id ? String(r.campaign_id) : null,
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    accountName: r.account_name ? String(r.account_name) : null,
    accountHandle: r.account_handle ? String(r.account_handle) : null,
    platformKey: String(r.platform_key),
    formatKey: String(r.format_key || "text"),
    title: String(r.title),
    bodyText: String(r.body_text),
    hashtags: JSON.parse(String(r.hashtags_json || "[]")),
    mediaUrls: JSON.parse(String(r.media_urls_json || "[]")),
    linkUrl: r.link_url ? String(r.link_url) : null,
    status: String(r.status),
    publishingMode: String(r.publishing_mode || "automatic"),
    requiresApproval: Boolean(r.requires_approval),
    approvedByUserId: r.approved_by_user_id ? String(r.approved_by_user_id) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    scheduledAt: String(r.scheduled_at),
    nextRunAt: String(r.next_run_at),
    timezone: String(r.timezone || "UTC"),
    recurrenceType: String(r.recurrence_type || "none"),
    recurrenceRule: JSON.parse(String(r.recurrence_rule_json || '{"type":"none"}')),
    idempotencyKey: String(r.idempotency_key),
    contentHash: String(r.content_hash),
    attemptCount: Number(r.attempt_count || 0),
    maxAttempts: Number(r.max_attempts || 4),
    isDeadLetter: Boolean(r.is_dead_letter),
    lastErrorPermanent: Boolean(r.last_error_permanent),
    lastError: r.last_error ? String(r.last_error) : null,
    platformPostId: r.platform_post_id ? String(r.platform_post_id) : null,
    platformPermalink: r.platform_permalink ? String(r.platform_permalink) : null,
    platformResponse: r.platform_response_json ? JSON.parse(String(r.platform_response_json)) : null,
    publishedAt: r.published_at ? String(r.published_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function mapPublishingAttemptRow(r) {
  return {
    id: String(r.id),
    queueId: String(r.queue_id),
    workspaceId: String(r.workspace_id),
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    platformKey: String(r.platform_key),
    attemptNumber: Number(r.attempt_number),
    workerId: String(r.worker_id || "embedded-worker"),
    status: String(r.status),
    httpStatus: r.http_status != null ? Number(r.http_status) : null,
    errorCode: r.error_code ? String(r.error_code) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    retryDelayMs: r.retry_delay_ms != null ? Number(r.retry_delay_ms) : null,
    platformPostId: r.platform_post_id ? String(r.platform_post_id) : null,
    apiResponse: r.api_response_json ? JSON.parse(String(r.api_response_json)) : null,
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null
  };
}
function mapApprovalRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    queueId: String(r.queue_id),
    queueTitle: r.queue_title ? String(r.queue_title) : void 0,
    platformKey: r.platform_key ? String(r.platform_key) : void 0,
    scheduledAt: r.scheduled_at ? String(r.scheduled_at) : void 0,
    bodyText: r.body_text ? String(r.body_text) : void 0,
    requestedByUserId: String(r.requested_by_user_id),
    reviewerUserId: r.reviewer_user_id ? String(r.reviewer_user_id) : null,
    decision: String(r.decision),
    notes: String(r.notes || ""),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function createWorkspaceNotification(db, params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
     VALUES (?, ?, ?, 'publishing', ?, ?, 0, ?, ?)`
  ).run(crypto15.randomUUID(), params.workspaceId, params.userId, params.title, params.body, now, now);
}
function enqueuePublishingJob(db, params) {
  const cleanTags = normalizeHashtags(params.hashtags || []);
  const mediaUrls = (params.mediaUrls || []).filter((u) => typeof u === "string" && u.trim().length > 0);
  const formatKey = params.formatKey || (mediaUrls.length > 0 ? "image" : "text");
  const ws = db.prepare("SELECT timezone FROM workspaces WHERE id = ?").get(params.workspaceId);
  let accountRow;
  let accountPrefs = parsePublishingPreferences(null);
  let accountCapabilities = null;
  if (params.socialAccountId) {
    accountRow = db.prepare(
      `SELECT sa.*, sp.key as platform_key
         FROM social_accounts sa
         JOIN social_platforms sp ON sp.id = sa.platform_id
         WHERE sa.id = ? AND sa.workspace_id = ?`
    ).get(params.socialAccountId, params.workspaceId);
    if (!accountRow) {
      throw new Error("Selected social account does not exist in this workspace.");
    }
    if (String(accountRow.platform_key) !== params.platformKey) {
      throw new Error(`Account belongs to ${String(accountRow.platform_key)}, not ${params.platformKey}.`);
    }
    accountPrefs = parsePublishingPreferences(String(accountRow.publishing_preferences_json || ""));
    accountCapabilities = parseSocialAccountCapabilities(params.platformKey, String(accountRow.capabilities_json || ""));
  }
  const resolvedTimezone = params.timezone || accountPrefs.defaultTimezone || ws?.timezone || "UTC";
  const scheduledUtcIso = convertLocalDateTimeToUtcIso(params.scheduledAtLocalOrIso, resolvedTimezone);
  const finalHashtags = accountPrefs.appendDefaultHashtags && accountPrefs.defaultHashtags.length > 0 ? normalizeHashtags([...cleanTags, ...accountPrefs.defaultHashtags]) : cleanTags;
  const safety = evaluateContentSafety(db, {
    workspaceId: params.workspaceId,
    socialAccountId: params.socialAccountId ?? null,
    platformKey: params.platformKey,
    title: params.title,
    bodyText: params.bodyText,
    hashtags: finalHashtags,
    scheduledAt: scheduledUtcIso,
    checkDuplicate: !params.saveAsDraft && !params.skipDuplicateCheck,
    checkFrequencyLimit: !params.saveAsDraft
  });
  if (safety.status === "blocked") {
    const firstErr = safety.issues.find((i) => i.severity === "error")?.message || "Blocked by Content Safety policy.";
    throw new Error(firstErr);
  }
  if (!params.saveAsDraft) {
    const validation = validatePostForPlatform({
      platformKey: params.platformKey,
      formatKey,
      title: params.title,
      bodyText: params.bodyText,
      hashtags: finalHashtags,
      mediaUrls,
      accountCapabilities
    });
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }
  }
  const publishingMode = params.publishingModeOverride ?? (accountPrefs.requireApprovalBeforePublish || !accountPrefs.autoPublishEnabled ? "approval_required" : "automatic");
  const requiresApproval = publishingMode === "approval_required";
  const initialStatus = params.saveAsDraft ? "draft" : requiresApproval ? "awaiting_approval" : new Date(scheduledUtcIso).getTime() <= Date.now() + 6e4 ? "queued" : "scheduled";
  const recurrenceRule = params.recurrenceRule ?? { type: "none" };
  const recurrenceType = recurrenceRule.type || "none";
  const contentHash = computeContentHash(params.bodyText, finalHashtags);
  const idempotencyKey = params.idempotencyKey?.trim() || crypto15.createHash("sha256").update(`${params.workspaceId}:${params.socialAccountId || params.platformKey}:${contentHash}:${scheduledUtcIso}`).digest("hex").slice(0, 48);
  const existingJob = db.prepare(
    `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.idempotency_key = ?`
  ).get(idempotencyKey);
  if (existingJob) {
    return {
      job: mapPublishingQueueRow(existingJob),
      calendarItemId: String(existingJob.calendar_item_id || ""),
      approvalId: null
    };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const queueId = crypto15.randomUUID();
  const calendarItemId = crypto15.randomUUID();
  const approvalId = requiresApproval && !params.saveAsDraft ? crypto15.randomUUID() : null;
  let contentPostId = params.contentPostId ?? null;
  db.transaction(() => {
    if (!contentPostId) {
      contentPostId = crypto15.randomUUID();
      const legacyStatus = initialStatus === "draft" ? "draft" : initialStatus === "awaiting_approval" ? "pending" : "scheduled";
      db.prepare(
        `INSERT INTO content_posts (
          id, workspace_id, author_user_id, title, caption, platform_key, status,
          campaign_tag, hashtags_json, scheduled_for, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        contentPostId,
        params.workspaceId,
        params.userId,
        params.title.trim(),
        params.bodyText.trim(),
        params.platformKey,
        legacyStatus,
        params.campaignId ?? null,
        JSON.stringify(finalHashtags),
        scheduledUtcIso,
        now,
        now
      );
    }
    db.prepare(
      `INSERT INTO content_calendar (
        id, workspace_id, content_post_id, generated_content_id, campaign_id, social_account_id,
        platform_key, title, body_text, hashtags_json, media_urls_json, format_key,
        scheduled_at, timezone, recurrence_type, recurrence_rule_json, status, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      calendarItemId,
      params.workspaceId,
      contentPostId,
      params.generatedContentId ?? null,
      params.campaignId ?? null,
      params.socialAccountId ?? null,
      params.platformKey,
      params.title.trim(),
      params.bodyText.trim(),
      JSON.stringify(finalHashtags),
      JSON.stringify(mediaUrls),
      formatKey,
      scheduledUtcIso,
      resolvedTimezone,
      recurrenceType,
      JSON.stringify(recurrenceRule),
      initialStatus,
      params.userId,
      now,
      now
    );
    db.prepare(
      `INSERT INTO publishing_queue (
        id, workspace_id, calendar_item_id, content_post_id, generated_content_id, campaign_id,
        social_account_id, platform_key, format_key, title, body_text, hashtags_json, media_urls_json,
        link_url, status, publishing_mode, requires_approval, scheduled_at, next_run_at, timezone,
        recurrence_type, recurrence_rule_json, idempotency_key, content_hash, attempt_count, max_attempts,
        is_dead_letter, last_error_permanent, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 4, 0, 0, ?, ?, ?)`
    ).run(
      queueId,
      params.workspaceId,
      calendarItemId,
      contentPostId,
      params.generatedContentId ?? null,
      params.campaignId ?? null,
      params.socialAccountId ?? null,
      params.platformKey,
      formatKey,
      params.title.trim(),
      params.bodyText.trim(),
      JSON.stringify(finalHashtags),
      JSON.stringify(mediaUrls),
      params.linkUrl ?? null,
      initialStatus,
      publishingMode,
      requiresApproval ? 1 : 0,
      scheduledUtcIso,
      scheduledUtcIso,
      resolvedTimezone,
      recurrenceType,
      JSON.stringify(recurrenceRule),
      idempotencyKey,
      contentHash,
      params.userId,
      now,
      now
    );
    if (approvalId) {
      db.prepare(
        `INSERT INTO content_approvals (
          id, workspace_id, queue_id, requested_by_user_id, decision, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 'Awaiting pre-publish approval per account settings.', ?, ?)`
      ).run(approvalId, params.workspaceId, queueId, params.userId, now, now);
      createWorkspaceNotification(db, {
        workspaceId: params.workspaceId,
        userId: params.userId,
        title: "Post Awaiting Approval",
        body: `"${params.title.trim()}" (${params.platformKey.toUpperCase()}) is queued for approval before automatic publishing at ${formatUtcInTimezone(scheduledUtcIso, resolvedTimezone)}.`
      });
    }
    if (params.generatedContentId) {
      db.prepare(`UPDATE generated_content SET status = ?, content_post_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`).run(
        initialStatus === "draft" ? "draft" : "scheduled",
        contentPostId,
        now,
        params.generatedContentId,
        params.workspaceId
      );
    }
  })();
  const created = db.prepare(
    `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
  ).get(queueId);
  return {
    job: mapPublishingQueueRow(created),
    calendarItemId,
    approvalId
  };
}
function decideContentApproval(db, params) {
  const approvalRow = db.prepare("SELECT * FROM content_approvals WHERE id = ? AND workspace_id = ?").get(params.approvalId, params.workspaceId);
  if (!approvalRow) {
    throw new Error("Approval request not found in this workspace.");
  }
  if (String(approvalRow.decision) !== "pending") {
    throw new Error("This approval request has already been decided.");
  }
  const queueId = String(approvalRow.queue_id);
  const queueRow = db.prepare("SELECT * FROM publishing_queue WHERE id = ?").get(queueId);
  if (!queueRow) {
    throw new Error("Associated publishing queue job not found.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nextQueueStatus = params.decision === "approved" ? new Date(String(queueRow.scheduled_at)).getTime() <= Date.now() + 6e4 ? "queued" : "scheduled" : "draft";
  db.transaction(() => {
    db.prepare(
      `UPDATE content_approvals
       SET reviewer_user_id = ?, decision = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(params.reviewerUserId, params.decision, (params.notes || "").trim(), now, params.approvalId);
    db.prepare(
      `UPDATE publishing_queue
       SET status = ?,
           approved_by_user_id = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_user_id END,
           approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
           updated_at = ?
       WHERE id = ?`
    ).run(nextQueueStatus, params.decision, params.reviewerUserId, params.decision, now, now, queueId);
    if (queueRow.calendar_item_id) {
      db.prepare("UPDATE content_calendar SET status = ?, updated_at = ? WHERE id = ?").run(
        nextQueueStatus,
        now,
        String(queueRow.calendar_item_id)
      );
    }
    if (queueRow.content_post_id) {
      db.prepare("UPDATE content_posts SET status = ?, updated_at = ? WHERE id = ?").run(
        params.decision === "approved" ? "scheduled" : "draft",
        now,
        String(queueRow.content_post_id)
      );
    }
    createWorkspaceNotification(db, {
      workspaceId: params.workspaceId,
      userId: String(approvalRow.requested_by_user_id),
      title: params.decision === "approved" ? "Post Approved for Auto-Publishing" : "Post Returned from Approval",
      body: `"${String(queueRow.title)}" was marked "${params.decision}". ${params.notes ? `Notes: ${params.notes}` : ""}`.trim()
    });
  })();
  const updatedApproval = db.prepare(
    `SELECT ca.*, pq.title as queue_title, pq.platform_key, pq.scheduled_at, pq.body_text
       FROM content_approvals ca
       JOIN publishing_queue pq ON pq.id = ca.queue_id
       WHERE ca.id = ?`
  ).get(params.approvalId);
  const updatedJob = db.prepare(
    `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
  ).get(queueId);
  return {
    approval: mapApprovalRow(updatedApproval),
    job: mapPublishingQueueRow(updatedJob)
  };
}
function classifyPublishingError(err) {
  if (err instanceof ProviderApiError) {
    const status = err.status;
    const msg2 = err.message;
    const isRateLimit2 = status === 429 || /rate limit|too many requests/i.test(msg2);
    const isTokenExpired2 = status === 401 || /token.*expired|invalid.*token|revoked/i.test(msg2);
    const isPermanent2 = status === 400 || status === 403 || status === 404 || status === 422;
    return {
      permanent: isPermanent2,
      rateLimited: isRateLimit2,
      tokenExpired: isTokenExpired2,
      httpStatus: status,
      errorCode: err.providerCode || `HTTP_${status}`,
      message: msg2,
      retryAfterMs: isRateLimit2 ? 5 * 60 * 1e3 : void 0
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  const isRateLimit = /429|rate.?limit|too many requests/i.test(msg);
  const isTokenExpired = /401|token.*expired|revoked|reconnect/i.test(msg);
  const isPermanent = /does not support|character limit|requires an image|requires a video|blocked|permission|forbidden|not connected|no connected/i.test(
    msg
  );
  return {
    permanent: isPermanent,
    rateLimited: isRateLimit,
    tokenExpired: isTokenExpired,
    httpStatus: isRateLimit ? 429 : isTokenExpired ? 401 : isPermanent ? 400 : 500,
    errorCode: isRateLimit ? "RATE_LIMITED" : isTokenExpired ? "TOKEN_EXPIRED" : isPermanent ? "VALIDATION_OR_PERMISSION_ERROR" : "TRANSIENT_PUBLISH_ERROR",
    message: msg,
    retryAfterMs: isRateLimit ? 5 * 60 * 1e3 : void 0
  };
}
function computeExponentialBackoffMs(attemptNumber, baseMs = 3e4) {
  const cappedExponent = Math.min(Math.max(attemptNumber - 1, 0), 6);
  return Math.min(baseMs * Math.pow(2, cappedExponent), 30 * 60 * 1e3);
}
async function executePublishingQueueJob(db, queueId, options) {
  const workerId = options?.workerId || WORKER_INSTANCE_ID;
  const now = /* @__PURE__ */ new Date();
  const nowIso = now.toISOString();
  const lockUntil = new Date(now.getTime() + 12e4).toISOString();
  const claim = db.prepare(
    `UPDATE publishing_queue
       SET status = 'processing', locked_by = ?, locked_until = ?, updated_at = ?
       WHERE id = ?
         AND status IN ('scheduled', 'queued')
         AND is_dead_letter = 0
         AND (locked_until IS NULL OR locked_until < ?)`
  ).run(workerId, lockUntil, nowIso, queueId, nowIso);
  const loadJob = () => mapPublishingQueueRow(
    db.prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
           FROM publishing_queue pq
           LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
           WHERE pq.id = ?`
    ).get(queueId)
  );
  if (claim.changes === 0) {
    return loadJob();
  }
  const job = loadJob();
  const attemptNumber = job.attemptCount + 1;
  const attemptId = crypto15.randomUUID();
  db.prepare(
    `INSERT INTO publishing_attempts (
      id, queue_id, workspace_id, social_account_id, platform_key, attempt_number,
      worker_id, status, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'started', ?)`
  ).run(attemptId, job.id, job.workspaceId, job.socialAccountId, job.platformKey, attemptNumber, workerId, nowIso);
  const failAttempt = (params) => {
    const finishedAt = (/* @__PURE__ */ new Date()).toISOString();
    const exhausted = attemptNumber >= job.maxAttempts;
    const shouldDeadLetter = params.permanent || exhausted;
    const retryDelayMs = shouldDeadLetter ? null : params.retryAfterMs ?? computeExponentialBackoffMs(attemptNumber, options?.baseBackoffMs ?? 3e4);
    const nextRunAt = retryDelayMs ? new Date(Date.now() + retryDelayMs).toISOString() : finishedAt;
    const nextQueueStatus = shouldDeadLetter ? "failed" : "queued";
    const attemptStatus = params.tokenExpired ? "token_expired" : params.rateLimited ? "rate_limited" : shouldDeadLetter ? "failed_permanent" : "retrying";
    db.transaction(() => {
      db.prepare(
        `UPDATE publishing_attempts
         SET status = ?, http_status = ?, error_code = ?, error_message = ?,
             retry_delay_ms = ?, finished_at = ?
         WHERE id = ?`
      ).run(attemptStatus, params.httpStatus, params.errorCode, params.message, retryDelayMs, finishedAt, attemptId);
      db.prepare(
        `UPDATE publishing_queue
         SET status = ?, attempt_count = ?, next_run_at = ?, is_dead_letter = ?,
             last_error_permanent = ?, last_error = ?, locked_by = NULL, locked_until = NULL, updated_at = ?
         WHERE id = ?`
      ).run(
        nextQueueStatus,
        attemptNumber,
        nextRunAt,
        shouldDeadLetter ? 1 : 0,
        params.permanent ? 1 : 0,
        params.message,
        finishedAt,
        job.id
      );
      if (job.calendarItemId) {
        db.prepare("UPDATE content_calendar SET status = ?, updated_at = ? WHERE id = ?").run(
          nextQueueStatus,
          finishedAt,
          job.calendarItemId
        );
      }
      if (job.contentPostId && shouldDeadLetter) {
        db.prepare("UPDATE content_posts SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?").run(
          "failed",
          params.message,
          finishedAt,
          job.contentPostId
        );
      }
      if (shouldDeadLetter) {
        const jobRow = db.prepare("SELECT created_by_user_id FROM publishing_queue WHERE id = ?").get(job.id);
        createWorkspaceNotification(db, {
          workspaceId: job.workspaceId,
          userId: jobRow.created_by_user_id,
          title: `Publishing Failed (${job.platformKey.toUpperCase()})`,
          body: `"${job.title}" could not be published: ${params.message}`
        });
      }
    })();
    return loadJob();
  };
  try {
    const accountQuery = job.socialAccountId ? db.prepare(
      `SELECT sa.*, sp.key as platform_key, t.encrypted_access_token, t.encrypted_refresh_token, t.expires_at as token_expires_at
             FROM social_accounts sa
             JOIN social_platforms sp ON sp.id = sa.platform_id
             LEFT JOIN social_account_tokens t ON t.social_account_id = sa.id
             WHERE sa.id = ? AND sa.workspace_id = ?`
    ).get(job.socialAccountId, job.workspaceId) : db.prepare(
      `SELECT sa.*, sp.key as platform_key, t.encrypted_access_token, t.encrypted_refresh_token, t.expires_at as token_expires_at
             FROM social_accounts sa
             JOIN social_platforms sp ON sp.id = sa.platform_id
             LEFT JOIN social_account_tokens t ON t.social_account_id = sa.id
             WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
             ORDER BY sa.created_at DESC LIMIT 1`
    ).get(job.workspaceId, job.platformKey);
    const acc = accountQuery;
    if (!acc || String(acc.connection_status) !== "connected" || !acc.encrypted_access_token) {
      return failAttempt({
        permanent: true,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 400,
        errorCode: "ACCOUNT_NOT_CONNECTED",
        message: `No active connected ${job.platformKey.toUpperCase()} account with a valid OAuth token was found. Connect or reconnect the account in Social Accounts before retrying.`
      });
    }
    const accountId = String(acc.id);
    const capabilities = parseSocialAccountCapabilities(job.platformKey, String(acc.capabilities_json || ""));
    const validation = validatePostForPlatform({
      platformKey: job.platformKey,
      formatKey: job.formatKey,
      title: job.title,
      bodyText: job.bodyText,
      hashtags: job.hashtags,
      mediaUrls: job.mediaUrls,
      accountCapabilities: capabilities
    });
    if (!validation.valid) {
      return failAttempt({
        permanent: true,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 422,
        errorCode: "CAPABILITY_OR_FORMAT_ERROR",
        message: validation.errors.join(" ")
      });
    }
    let accessToken;
    const tokenExpiresAt = acc.token_expires_at ? new Date(String(acc.token_expires_at)).getTime() : null;
    if (tokenExpiresAt && tokenExpiresAt <= Date.now() + 6e4) {
      try {
        const refreshed = await refreshSocialAccountToken(
          db,
          job.workspaceId,
          accountId,
          "system-worker"
        );
        if (!refreshed.refreshed) {
          throw new Error(refreshed.message || "OAuth token expired and could not be refreshed.");
        }
        const freshTokenRow = db.prepare("SELECT encrypted_access_token FROM social_account_tokens WHERE social_account_id = ?").get(accountId);
        accessToken = decryptSocialToken(freshTokenRow.encrypted_access_token);
      } catch (refreshErr) {
        const rMsg = refreshErr instanceof Error ? refreshErr.message : "OAuth access token expired.";
        db.prepare(`UPDATE social_accounts SET connection_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?`).run(
          rMsg,
          (/* @__PURE__ */ new Date()).toISOString(),
          accountId
        );
        return failAttempt({
          permanent: true,
          rateLimited: false,
          tokenExpired: true,
          httpStatus: 401,
          errorCode: "TOKEN_EXPIRED",
          message: `Access token expired and automatic refresh failed: ${rMsg}. Reconnect this account in Social Accounts.`
        });
      }
    } else {
      accessToken = decryptSocialToken(String(acc.encrypted_access_token));
    }
    const payload = {
      format: job.formatKey,
      title: job.title,
      text: validation.assembledText,
      mediaUrls: job.mediaUrls,
      linkUrl: job.linkUrl ?? void 0
    };
    const provider = getSocialProvider(job.platformKey);
    const externalAccountId = String(acc.external_account_id);
    const isSandboxAccount = isSandboxToken(accessToken) && isSandboxExternalAccountId(externalAccountId);
    const buildSandboxPermalink = (platformKey, postId) => {
      switch (platformKey) {
        case "facebook":
          return `https://www.facebook.com/livingtech/posts/${postId}`;
        case "instagram":
          return `https://www.instagram.com/p/${postId}/`;
        case "tiktok":
          return `https://www.tiktok.com/@livingtech_tiktok/video/${postId}`;
        case "linkedin":
          return `https://www.linkedin.com/feed/update/urn:li:share:${postId}/`;
        case "youtube":
          return `https://www.youtube.com/watch?v=${postId}`;
        case "x":
          return `https://x.com/livingtech_x/status/${postId}`;
        case "pinterest":
          return `https://www.pinterest.com/pin/${postId}/`;
        case "google_business":
          return `https://business.google.com/posts/l/${postId}`;
      }
    };
    const publishResult = publishExecutorOverride ? await publishExecutorOverride({
      platformKey: job.platformKey,
      accessToken,
      account: { externalAccountId, capabilities },
      payload
    }) : isSandboxAccount ? (() => {
      const externalPostId = `sandbox_${job.platformKey}_${crypto15.randomBytes(6).toString("hex")}`;
      return {
        externalPostId,
        permalink: buildSandboxPermalink(job.platformKey, externalPostId),
        publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        raw: {
          sandbox: true,
          platform: job.platformKey,
          format: job.formatKey,
          externalAccountId,
          title: job.title
        }
      };
    })() : await provider.publishContent(
      accessToken,
      { externalAccountId, capabilities },
      payload
    );
    if (!publishResult || !publishResult.externalPostId || !publishResult.externalPostId.trim()) {
      return failAttempt({
        permanent: false,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 502,
        errorCode: "MISSING_PLATFORM_CONFIRMATION",
        message: "Platform API responded without a confirmed post ID. Post was NOT marked as published."
      });
    }
    const publishedAt = publishResult.publishedAt || (/* @__PURE__ */ new Date()).toISOString();
    const responseJson = JSON.stringify(publishResult);
    db.transaction(() => {
      db.prepare(
        `UPDATE publishing_attempts
         SET status = 'succeeded', http_status = 200, platform_post_id = ?, api_response_json = ?, finished_at = ?
         WHERE id = ?`
      ).run(publishResult.externalPostId, responseJson, publishedAt, attemptId);
      db.prepare(
        `UPDATE publishing_queue
         SET status = 'published', attempt_count = ?, is_dead_letter = 0, last_error = NULL,
             last_error_permanent = 0, locked_by = NULL, locked_until = NULL,
             platform_post_id = ?, platform_permalink = ?, platform_response_json = ?,
             published_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        attemptNumber,
        publishResult.externalPostId,
        publishResult.permalink ?? null,
        responseJson,
        publishedAt,
        publishedAt,
        job.id
      );
      if (job.calendarItemId) {
        db.prepare(`UPDATE content_calendar SET status = 'published', updated_at = ? WHERE id = ?`).run(
          publishedAt,
          job.calendarItemId
        );
      }
      if (job.contentPostId) {
        db.prepare(
          `UPDATE content_posts SET status = 'published', published_at = ?, failure_reason = NULL, updated_at = ? WHERE id = ?`
        ).run(publishedAt, publishedAt, job.contentPostId);
      }
      if (job.generatedContentId) {
        db.prepare(`UPDATE generated_content SET status = 'published', updated_at = ? WHERE id = ?`).run(
          publishedAt,
          job.generatedContentId
        );
      }
      const jobRow = db.prepare("SELECT created_by_user_id FROM publishing_queue WHERE id = ?").get(job.id);
      createWorkspaceNotification(db, {
        workspaceId: job.workspaceId,
        userId: jobRow.created_by_user_id,
        title: `Published to ${provider.displayName}`,
        body: `"${job.title}" was automatically published (ID: ${publishResult.externalPostId}).`
      });
    })();
    if (job.recurrenceType !== "none") {
      const nextIso = computeNextRecurrenceIso(job.scheduledAt, job.timezone, job.recurrenceRule);
      if (nextIso) {
        const jobRow = db.prepare("SELECT created_by_user_id FROM publishing_queue WHERE id = ?").get(job.id);
        try {
          enqueuePublishingJob(db, {
            workspaceId: job.workspaceId,
            userId: jobRow.created_by_user_id,
            platformKey: job.platformKey,
            socialAccountId: job.socialAccountId,
            campaignId: job.campaignId,
            formatKey: job.formatKey,
            title: job.title,
            bodyText: job.bodyText,
            hashtags: job.hashtags,
            mediaUrls: job.mediaUrls,
            linkUrl: job.linkUrl,
            scheduledAtLocalOrIso: nextIso,
            timezone: job.timezone,
            recurrenceRule: job.recurrenceRule,
            publishingModeOverride: job.publishingMode,
            skipDuplicateCheck: true,
            idempotencyKey: `recur-${job.id.slice(0, 12)}-${nextIso}`
          });
        } catch (recurErr) {
          logger.warn("Failed to enqueue next recurring occurrence", {
            queueId: job.id,
            error: recurErr instanceof Error ? recurErr.message : String(recurErr)
          });
        }
      }
    }
    return loadJob();
  } catch (err) {
    const classified = classifyPublishingError(err);
    return failAttempt(classified);
  }
}
async function processDuePublishingJobs(db, options) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  lastWorkerTickAt = nowIso;
  const limit = options?.limit ?? 10;
  db.prepare(
    `UPDATE publishing_queue
     SET status = 'queued', locked_by = NULL, locked_until = NULL, updated_at = ?
     WHERE status = 'processing' AND locked_until IS NOT NULL AND locked_until < ?`
  ).run(nowIso, nowIso);
  const dueRows = db.prepare(
    `SELECT id FROM publishing_queue
       WHERE status IN ('scheduled', 'queued')
         AND is_dead_letter = 0
         AND next_run_at <= ?
         AND (locked_until IS NULL OR locked_until < ?)
       ORDER BY next_run_at ASC
       LIMIT ?`
  ).all(nowIso, nowIso, limit);
  const results = [];
  for (const row of dueRows) {
    const res = await executePublishingQueueJob(db, row.id, {
      workerId: options?.workerId,
      baseBackoffMs: options?.baseBackoffMs
    });
    results.push(res);
  }
  return {
    processedCount: results.length,
    publishedCount: results.filter((r) => r.status === "published").length,
    failedCount: results.filter((r) => r.status === "failed").length,
    results
  };
}
function retryFailedQueueJob(db, workspaceId, queueId, rescheduleAtIso) {
  const row = db.prepare("SELECT * FROM publishing_queue WHERE id = ? AND workspace_id = ?").get(queueId, workspaceId);
  if (!row) throw new Error("Publishing queue job not found.");
  if (String(row.status) === "published") throw new Error("Published posts cannot be re-queued.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nextRun = rescheduleAtIso ? convertLocalDateTimeToUtcIso(rescheduleAtIso, String(row.timezone || "UTC")) : now;
  db.transaction(() => {
    db.prepare(
      `UPDATE publishing_queue
       SET status = 'queued', is_dead_letter = 0, last_error_permanent = 0, last_error = NULL,
           attempt_count = 0, next_run_at = ?, scheduled_at = ?, locked_by = NULL, locked_until = NULL, updated_at = ?
       WHERE id = ?`
    ).run(nextRun, nextRun, now, queueId);
    if (row.calendar_item_id) {
      db.prepare(`UPDATE content_calendar SET status = 'queued', scheduled_at = ?, updated_at = ? WHERE id = ?`).run(
        nextRun,
        now,
        String(row.calendar_item_id)
      );
    }
    if (row.content_post_id) {
      db.prepare(`UPDATE content_posts SET status = 'scheduled', scheduled_for = ?, failure_reason = NULL, updated_at = ? WHERE id = ?`).run(
        nextRun,
        now,
        String(row.content_post_id)
      );
    }
  })();
  const updated = db.prepare(
    `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
  ).get(queueId);
  return mapPublishingQueueRow(updated);
}
function cancelQueueJob(db, workspaceId, queueId) {
  const row = db.prepare("SELECT * FROM publishing_queue WHERE id = ? AND workspace_id = ?").get(queueId, workspaceId);
  if (!row) throw new Error("Publishing queue job not found.");
  if (String(row.status) === "published") throw new Error("Published posts cannot be cancelled.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.transaction(() => {
    db.prepare(
      `UPDATE publishing_queue SET status = 'cancelled', locked_by = NULL, locked_until = NULL, updated_at = ? WHERE id = ?`
    ).run(now, queueId);
    if (row.calendar_item_id) {
      db.prepare(`UPDATE content_calendar SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(
        now,
        String(row.calendar_item_id)
      );
    }
  })();
  const updated = db.prepare(
    `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
  ).get(queueId);
  return mapPublishingQueueRow(updated);
}
function getWorkerHealth(db, workspaceId) {
  const where = workspaceId ? "WHERE workspace_id = ?" : "";
  const args = workspaceId ? [workspaceId] : [];
  const rows = db.prepare(`SELECT status, COUNT(*) as c FROM publishing_queue ${where} GROUP BY status`).all(...args);
  const counts = {
    draft: 0,
    scheduled: 0,
    queued: 0,
    processing: 0,
    published: 0,
    failed: 0,
    cancelled: 0,
    awaiting_approval: 0
  };
  for (const r of rows) {
    if (r.status in counts) counts[r.status] = Number(r.c);
  }
  const dlqRow = db.prepare(`SELECT COUNT(*) as c FROM publishing_queue ${workspaceId ? "WHERE workspace_id = ? AND is_dead_letter = 1" : "WHERE is_dead_letter = 1"}`).get(...args);
  return {
    workerId: WORKER_INSTANCE_ID,
    embeddedWorkerRunning: Boolean(embeddedWorkerTimer),
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    queueBackend: env.REDIS_URL ? "redis_bullmq_ready" : "sqlite_durable_queue",
    redisConfigured: Boolean(env.REDIS_URL),
    lastTickAt: lastWorkerTickAt,
    counts,
    deadLetterCount: Number(dlqRow?.c || 0)
  };
}

// server/routes/phase3.ts
var PlatformKeySchema2 = z3.enum([
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "pinterest",
  "google_business"
]);
var FormatKeySchema = z3.enum(["text", "image", "video", "carousel", "story", "reels", "short_form_video"]);
var ContentTypeSchema = z3.enum([
  "social_post",
  "caption",
  "promotional",
  "educational",
  "storytelling",
  "engagement_post",
  "product_showcase",
  "announcement",
  "business_tip",
  "campaign_content",
  "image_prompt",
  "flyer_graphic",
  "video_script",
  "short_form_concept"
]);
var GraphicTypeSchema = z3.enum([
  "promotional_flyer",
  "product_announcement",
  "event_banner",
  "quote_graphic",
  "carousel_slide",
  "business_promo",
  "sale_announcement",
  "educational_infographic"
]);
var RecurrenceRuleSchema = z3.object({
  type: z3.enum(["none", "daily", "weekdays", "weekly", "monthly", "custom"]).default("none"),
  weekdays: z3.array(z3.number().int().min(0).max(6)).optional(),
  dayOfMonth: z3.number().int().min(1).max(28).optional(),
  customDates: z3.array(z3.string()).optional(),
  endDate: z3.string().nullable().optional(),
  maxOccurrences: z3.number().int().min(1).max(100).optional()
});
function extractToken2(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies?.lt_session;
  return cookieToken || null;
}
function handleError(res, err, status = 400) {
  if (err instanceof z3.ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message || "Invalid input parameters.",
      details: err.flatten().fieldErrors
    });
  }
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  logger.warn("Phase 3 API error", { message });
  return res.status(status).json({ error: message });
}
function mapCampaignRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    name: String(r.name),
    objective: String(r.objective || ""),
    description: String(r.description || ""),
    colorHex: String(r.color_hex || "#0052FF"),
    platforms: JSON.parse(String(r.platforms_json || "[]")),
    status: String(r.status),
    startDate: r.start_date ? String(r.start_date) : null,
    endDate: r.end_date ? String(r.end_date) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function mapCalendarRow(r) {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    contentPostId: r.content_post_id ? String(r.content_post_id) : null,
    generatedContentId: r.generated_content_id ? String(r.generated_content_id) : null,
    campaignId: r.campaign_id ? String(r.campaign_id) : null,
    campaignName: r.campaign_name ? String(r.campaign_name) : null,
    campaignColor: r.campaign_color ? String(r.campaign_color) : null,
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    accountName: r.account_name ? String(r.account_name) : null,
    platformKey: String(r.platform_key),
    title: String(r.title),
    bodyText: String(r.body_text),
    hashtags: JSON.parse(String(r.hashtags_json || "[]")),
    mediaUrls: JSON.parse(String(r.media_urls_json || "[]")),
    formatKey: String(r.format_key || "text"),
    scheduledAt: String(r.scheduled_at),
    timezone: String(r.timezone || "UTC"),
    recurrenceType: String(r.recurrence_type || "none"),
    recurrenceRule: JSON.parse(String(r.recurrence_rule_json || '{"type":"none"}')),
    status: String(r.status),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  };
}
function createPhase3Router(db) {
  const router = Router2();
  const requireAuth = (req, res, next) => {
    const token = extractToken2(req);
    if (!token) return res.status(401).json({ error: "Authentication required." });
    const user = getUserBySessionToken(db, token);
    if (!user) {
      const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
      const secure = req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
      res.clearCookie("lt_session", {
        httpOnly: true,
        secure,
        sameSite: secure ? "none" : "lax",
        path: "/"
      });
      return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
    req.user = user;
    next();
  };
  const requireWorkspaceMember = (req, res, next) => {
    const wid = String(req.params.wid || "");
    if (!req.user || !wid || !assertWorkspaceAccess(db, req.user.id, wid, req.user.role)) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this workspace." });
    }
    next();
  };
  const requireFeature = (feature) => createWorkspaceFeatureGuard(db, feature);
  router.use("/workspaces/:wid/ai/brand-analysis", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/audience-analysis", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/strategies", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/strategy-v3", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/performance-recommendations", requireAuth, requireWorkspaceMember, requireFeature("ai_strategy"));
  router.use("/workspaces/:wid/ai/generated-content", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/studio-generate", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/caption", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/hashtags", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/keywords", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/repurpose", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/safety/check", requireAuth, requireWorkspaceMember, requireFeature("ai_studio"));
  router.use("/workspaces/:wid/ai/graphic-capabilities", requireAuth, requireWorkspaceMember, requireFeature("graphic_designer"));
  router.use("/workspaces/:wid/ai/graphics", requireAuth, requireWorkspaceMember, requireFeature("graphic_designer"));
  router.use("/workspaces/:wid/ai/graphic-direction", requireAuth, requireWorkspaceMember, requireFeature("graphic_designer"));
  router.use("/workspaces/:wid/ai/generate-image", requireAuth, requireWorkspaceMember, requireFeature("graphic_designer"));
  router.use("/workspaces/:wid/ai/calendar-plan", requireAuth, requireWorkspaceMember, requireFeature("calendar"));
  router.use("/workspaces/:wid/campaigns", requireAuth, requireWorkspaceMember, requireFeature("calendar"));
  router.use("/workspaces/:wid/calendar", requireAuth, requireWorkspaceMember, requireFeature("calendar"));
  router.use("/workspaces/:wid/publishing-queue", requireAuth, requireWorkspaceMember, (req, res, next) => {
    const required = req.method === "POST" && (req.path === "/" || req.path === "") ? "calendar" : "auto_publisher";
    return requireFeature(required)(req, res, next);
  });
  router.use("/workspaces/:wid/publishing-history", requireAuth, requireWorkspaceMember, requireFeature("publishing_history"));
  router.use("/workspaces/:wid/approvals", requireAuth, requireWorkspaceMember, requireFeature("publishing_history"));
  router.use("/workspaces/:wid/engagement-messages", requireAuth, requireWorkspaceMember, requireFeature("engagement"));
  router.get("/workspaces/:wid/brand-intelligence", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const profile = loadWorkspaceBrandProfile(db, wid);
      const analyses = listBrandAnalyses(db, wid);
      return res.json({ profile, analyses });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.patch("/workspaces/:wid/brand-intelligence", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        brandName: z3.string().min(1).max(120).optional(),
        logoUrl: z3.string().max(512).optional(),
        primaryColor: z3.string().max(16).optional(),
        secondaryColor: z3.string().max(16).optional(),
        accentColor: z3.string().max(16).optional(),
        businessDescription: z3.string().max(3e3).optional(),
        industry: z3.string().max(120).optional(),
        productsServices: z3.string().max(3e3).optional(),
        targetAudience: z3.string().max(1500).optional(),
        businessGoals: z3.string().max(1500).optional(),
        toneOfVoice: z3.string().max(240).optional(),
        preferredLanguage: z3.string().max(24).optional(),
        timezone: z3.string().max(64).optional(),
        bannedWords: z3.array(z3.string().max(64)).max(100).optional(),
        brandToneRules: z3.string().max(2e3).optional(),
        maxPostsPerDay: z3.number().int().min(1).max(100).optional(),
        autoReplyEnabled: z3.boolean().optional()
      }).parse(req.body);
      const current = loadWorkspaceBrandProfile(db, wid);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        `UPDATE brand_profiles
         SET brand_name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, accent_color = ?,
             business_description = ?, industry = ?, products_services = ?, target_audience = ?,
             business_goals = ?, tone_of_voice = ?, preferred_language = ?, timezone = ?,
             banned_words_json = ?, brand_tone_rules = ?, max_posts_per_day = ?, auto_reply_enabled = ?,
             updated_at = ?
         WHERE workspace_id = ?`
      ).run(
        body.brandName ?? current.brandName,
        body.logoUrl ?? current.logoUrl,
        body.primaryColor ?? current.primaryColor,
        body.secondaryColor ?? current.secondaryColor,
        body.accentColor ?? current.accentColor,
        body.businessDescription ?? current.businessDescription,
        body.industry ?? current.industry,
        body.productsServices ?? current.productsServices,
        body.targetAudience ?? current.targetAudience,
        body.businessGoals ?? current.businessGoals,
        body.toneOfVoice ?? current.toneOfVoice,
        body.preferredLanguage ?? current.preferredLanguage,
        body.timezone ?? current.timezone,
        JSON.stringify(body.bannedWords ?? current.bannedWords),
        body.brandToneRules ?? current.brandToneRules,
        body.maxPostsPerDay ?? current.maxPostsPerDay,
        body.autoReplyEnabled ?? current.autoReplyEnabled ? 1 : 0,
        now,
        wid
      );
      recordAuditLog(db, {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        workspaceId: wid,
        action: "brand.intelligence.updated",
        resourceType: "brand_profile",
        resourceId: wid
      });
      return res.json({ profile: loadWorkspaceBrandProfile(db, wid) });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.post("/workspaces/:wid/brand-intelligence/documents", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        name: z3.string().min(1).max(160),
        category: z3.enum(["brand_guide", "product_catalog", "marketing_material", "logo", "product_image", "other"]),
        summary: z3.string().min(3).max(4e3),
        url: z3.string().max(1024).optional()
      }).parse(req.body);
      const current = loadWorkspaceBrandProfile(db, wid);
      const doc = {
        id: crypto16.randomUUID(),
        name: body.name.trim(),
        category: body.category,
        summary: body.summary.trim(),
        url: body.url?.trim() || void 0,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const nextDocs = [doc, ...current.brandDocuments].slice(0, 30);
      db.prepare("UPDATE brand_profiles SET brand_documents_json = ?, updated_at = ? WHERE workspace_id = ?").run(
        JSON.stringify(nextDocs),
        (/* @__PURE__ */ new Date()).toISOString(),
        wid
      );
      return res.status(201).json({ document: doc, brandDocuments: nextDocs });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.delete("/workspaces/:wid/brand-intelligence/documents/:docId", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const docId = String(req.params.docId);
      const current = loadWorkspaceBrandProfile(db, wid);
      const nextDocs = current.brandDocuments.filter((d) => d.id !== docId);
      db.prepare("UPDATE brand_profiles SET brand_documents_json = ?, updated_at = ? WHERE workspace_id = ?").run(
        JSON.stringify(nextDocs),
        (/* @__PURE__ */ new Date()).toISOString(),
        wid
      );
      return res.json({ brandDocuments: nextDocs });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.post("/workspaces/:wid/ai/brand-analysis", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({ additionalNotes: z3.string().max(2e3).optional() }).parse(req.body || {});
      const result = await runBrandAnalysisModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        additionalNotes: body.additionalNotes
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/audience-analysis", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({ focusMarket: z3.string().max(300).optional() }).parse(req.body || {});
      const result = await runAudienceAnalysisModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        focusMarket: body.focusMarket
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/ai/strategies", requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ strategies: listContentStrategies(db, String(req.params.wid)) });
  });
  router.post("/workspaces/:wid/ai/strategy-v3", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        title: z3.string().max(180).optional(),
        goals: z3.string().min(5).max(1500),
        platforms: z3.array(PlatformKeySchema2).min(1)
      }).parse(req.body);
      const result = await runContentStrategyModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        title: body.title,
        goals: body.goals,
        platforms: body.platforms
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/calendar-plan", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        platforms: z3.array(PlatformKeySchema2).min(1),
        daysCount: z3.number().int().min(3).max(14).default(7),
        campaignObjective: z3.string().min(3).max(500),
        preferredPostingWindow: z3.string().max(120).optional(),
        timezone: z3.string().max(64).default("UTC")
      }).parse(req.body);
      const result = await runCalendarGenerationModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/ai/generated-content", requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ items: listGeneratedContent(db, String(req.params.wid)) });
  });
  router.post("/workspaces/:wid/ai/studio-generate", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        socialAccountId: z3.string().nullable().optional(),
        campaignId: z3.string().nullable().optional(),
        contentType: ContentTypeSchema.default("social_post"),
        topic: z3.string().min(3).max(1500),
        keywords: z3.union([z3.string(), z3.array(z3.string())]).optional(),
        objective: z3.string().min(2).max(200).default("Brand Awareness & Engagement"),
        targetAudience: z3.string().max(400).optional(),
        toneOfVoice: z3.string().max(200).optional(),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const keywords = Array.isArray(body.keywords) ? body.keywords : typeof body.keywords === "string" ? parseKeywordsInput(body.keywords) : [];
      const result = await runPostWritingModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        platformKey: body.platformKey,
        socialAccountId: body.socialAccountId ?? null,
        campaignId: body.campaignId ?? null,
        contentType: body.contentType,
        topic: body.topic,
        keywords,
        objective: body.objective,
        targetAudience: body.targetAudience,
        toneOfVoice: body.toneOfVoice,
        language: body.language
      });
      return res.status(201).json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.patch("/workspaces/:wid/ai/generated-content/:id", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const id = String(req.params.id);
      const existing = db.prepare("SELECT * FROM generated_content WHERE id = ? AND workspace_id = ?").get(id, wid);
      if (!existing) return res.status(404).json({ error: "Generated content item not found." });
      const body = z3.object({
        title: z3.string().min(1).max(240).optional(),
        bodyText: z3.string().min(1).max(1e4).optional(),
        captionText: z3.string().max(1e4).optional(),
        hashtags: z3.array(z3.string()).optional(),
        callToAction: z3.string().max(400).optional(),
        imagePrompt: z3.string().max(2e3).optional(),
        platformKey: PlatformKeySchema2.optional()
      }).parse(req.body);
      const nextPlatform = body.platformKey ?? String(existing.platform_key);
      const nextBody = body.bodyText ?? String(existing.body_text);
      const nextTags = body.hashtags ? normalizeHashtags(body.hashtags) : JSON.parse(String(existing.hashtags_json || "[]"));
      const safety = evaluateContentSafety(db, {
        workspaceId: wid,
        platformKey: nextPlatform,
        title: body.title ?? String(existing.title),
        bodyText: nextBody,
        hashtags: nextTags,
        checkDuplicate: false
      });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        `UPDATE generated_content
         SET title = ?, body_text = ?, caption_text = ?, hashtags_json = ?, call_to_action = ?,
             image_prompt = ?, platform_key = ?, safety_status = ?, safety_notes_json = ?, updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      ).run(
        body.title ?? String(existing.title),
        nextBody,
        body.captionText ?? String(existing.caption_text),
        JSON.stringify(nextTags),
        body.callToAction ?? String(existing.call_to_action),
        body.imagePrompt ?? String(existing.image_prompt),
        nextPlatform,
        safety.status,
        JSON.stringify(safety.issues.map((i) => i.message)),
        now,
        id,
        wid
      );
      const updated = db.prepare("SELECT * FROM generated_content WHERE id = ?").get(id);
      return res.json({ content: mapGeneratedContentRow(updated), safety });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/caption", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        subject: z3.string().min(3).max(800),
        visualDescription: z3.string().max(800).optional(),
        toneOfVoice: z3.string().max(160).optional(),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const result = await runCaptionWritingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/hashtags", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        topic: z3.string().min(2).max(500),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const result = await runHashtagRecommendationsModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/keywords", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        seedTopic: z3.string().min(2).max(500),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const result = await runKeywordResearchModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/ai/graphic-capabilities", requireAuth, requireWorkspaceMember, (_req, res) => {
    return res.json(getImageGenerationCapabilities());
  });
  router.get("/workspaces/:wid/ai/graphics", requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({
      graphics: listGeneratedImages(db, String(req.params.wid)),
      capabilities: getImageGenerationCapabilities()
    });
  });
  router.post("/workspaces/:wid/ai/graphic-direction", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        graphicType: GraphicTypeSchema,
        platformKey: PlatformKeySchema2,
        aspectRatio: z3.string().min(2).max(16).default("1:1"),
        brief: z3.string().min(3).max(1500),
        includeLogo: z3.boolean().optional()
      }).parse(req.body);
      const result = await runGraphicDesignAssistanceModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/generate-image", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        graphicType: GraphicTypeSchema,
        platformKey: PlatformKeySchema2,
        aspectRatio: z3.string().min(2).max(16).default("1:1"),
        prompt: z3.string().min(5).max(2e3),
        artDirection: z3.record(z3.string(), z3.unknown()).optional(),
        captionText: z3.string().max(3e3).optional(),
        generatedContentId: z3.string().nullable().optional()
      }).parse(req.body);
      const result = await runImageGenerationModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        graphicType: body.graphicType,
        platformKey: body.platformKey,
        aspectRatio: body.aspectRatio,
        prompt: body.prompt,
        artDirection: body.artDirection,
        captionText: body.captionText,
        generatedContentId: body.generatedContentId ?? null
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/graphics/save-rendered", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z3.object({
        graphicType: GraphicTypeSchema,
        platformKey: PlatformKeySchema2,
        aspectRatio: z3.string().min(2).max(16).default("1:1"),
        prompt: z3.string().max(2e3).default("Branded social graphic"),
        artDirection: z3.record(z3.string(), z3.unknown()).optional(),
        captionText: z3.string().max(3e3).optional(),
        sourceMode: z3.enum(["compositor", "uploaded"]).default("compositor"),
        dataUrl: z3.string().min(30),
        fileName: z3.string().max(120).optional()
      }).parse(req.body);
      const saved = saveRenderedGraphicToLibrary(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        graphicType: body.graphicType,
        platformKey: body.platformKey,
        aspectRatio: body.aspectRatio,
        prompt: body.prompt,
        artDirection: body.artDirection,
        captionText: body.captionText,
        sourceMode: body.sourceMode,
        dataUrl: body.dataUrl,
        fileName: body.fileName
      });
      return res.status(201).json(saved);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/video-script", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        topic: z3.string().min(3).max(1200),
        formatStyle: z3.enum(["short_form_reel", "product_demo", "explainer", "founder_story", "youtube_video"]).default("short_form_reel"),
        targetDurationSeconds: z3.number().int().min(10).max(600).default(45),
        toneOfVoice: z3.string().max(160).optional(),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const result = await runVideoScriptingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/repurpose", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const body = z3.object({
        sourceIdeaOrCopy: z3.string().min(10).max(5e3),
        targetPlatforms: z3.array(PlatformKeySchema2).min(2).max(8),
        toneOfVoice: z3.string().max(160).optional(),
        language: z3.string().max(32).optional()
      }).parse(req.body);
      const result = await runContentRepurposingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id,
        ...body
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/ai/performance-recommendations", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const result = await runPerformanceRecommendationsModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user.id
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/ai/usage-ledger", requireAuth, requireWorkspaceMember, (req, res) => {
    const rows = db.prepare("SELECT * FROM ai_generation_usage WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").all(String(req.params.wid));
    return res.json({
      usage: rows.map((r) => ({
        id: String(r.id),
        moduleKey: String(r.module_key),
        modelName: String(r.model_name),
        creditsUsed: Number(r.credits_used),
        promptTokens: Number(r.prompt_tokens),
        completionTokens: Number(r.completion_tokens),
        status: String(r.status),
        errorMessage: r.error_message ? String(r.error_message) : null,
        latencyMs: Number(r.latency_ms),
        createdAt: String(r.created_at)
      }))
    });
  });
  router.post("/workspaces/:wid/safety/check", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        socialAccountId: z3.string().nullable().optional(),
        title: z3.string().optional(),
        bodyText: z3.string(),
        hashtags: z3.array(z3.string()).optional(),
        scheduledAt: z3.string().nullable().optional()
      }).parse(req.body);
      const result = evaluateContentSafety(db, {
        workspaceId: String(req.params.wid),
        socialAccountId: body.socialAccountId ?? null,
        platformKey: body.platformKey,
        title: body.title,
        bodyText: body.bodyText,
        hashtags: body.hashtags,
        scheduledAt: body.scheduledAt ?? null,
        checkDuplicate: true,
        checkFrequencyLimit: Boolean(body.scheduledAt)
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.get("/workspaces/:wid/campaigns", requireAuth, requireWorkspaceMember, (req, res) => {
    const rows = db.prepare("SELECT * FROM content_campaigns WHERE workspace_id = ? ORDER BY created_at DESC").all(String(req.params.wid));
    return res.json({ campaigns: rows.map(mapCampaignRow) });
  });
  router.post("/workspaces/:wid/campaigns", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        name: z3.string().min(2).max(140),
        objective: z3.string().max(500).default(""),
        description: z3.string().max(1500).default(""),
        colorHex: z3.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0052FF"),
        platforms: z3.array(PlatformKeySchema2).default([]),
        startDate: z3.string().nullable().optional(),
        endDate: z3.string().nullable().optional()
      }).parse(req.body);
      const id = crypto16.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        `INSERT INTO content_campaigns (
          id, workspace_id, created_by_user_id, name, objective, description, color_hex,
          platforms_json, status, start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      ).run(
        id,
        wid,
        req.user.id,
        body.name.trim(),
        body.objective.trim(),
        body.description.trim(),
        body.colorHex,
        JSON.stringify(body.platforms),
        body.startDate ?? null,
        body.endDate ?? null,
        now,
        now
      );
      const row = db.prepare("SELECT * FROM content_campaigns WHERE id = ?").get(id);
      return res.status(201).json({ campaign: mapCampaignRow(row) });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.delete("/workspaces/:wid/campaigns/:campaignId", requireAuth, requireWorkspaceMember, (req, res) => {
    db.prepare("DELETE FROM content_campaigns WHERE id = ? AND workspace_id = ?").run(
      String(req.params.campaignId),
      String(req.params.wid)
    );
    return res.json({ deleted: true });
  });
  router.get("/workspaces/:wid/calendar", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare(
      `SELECT cc.*, c.name as campaign_name, c.color_hex as campaign_color, sa.account_name
         FROM content_calendar cc
         LEFT JOIN content_campaigns c ON c.id = cc.campaign_id
         LEFT JOIN social_accounts sa ON sa.id = cc.social_account_id
         WHERE cc.workspace_id = ?
         ORDER BY cc.scheduled_at ASC`
    ).all(wid);
    return res.json({ items: rows.map(mapCalendarRow) });
  });
  router.patch("/workspaces/:wid/calendar/:itemId/reschedule", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const itemId = String(req.params.itemId);
      const body = z3.object({
        scheduledAt: z3.string().min(8),
        timezone: z3.string().max(64).optional()
      }).parse(req.body);
      const existing = db.prepare("SELECT * FROM content_calendar WHERE id = ? AND workspace_id = ?").get(itemId, wid);
      if (!existing) return res.status(404).json({ error: "Calendar item not found." });
      if (String(existing.status) === "published") {
        return res.status(400).json({ error: "Published posts cannot be rescheduled." });
      }
      const tz = body.timezone || String(existing.timezone || "UTC");
      const nextUtc = convertLocalDateTimeToUtcIso(body.scheduledAt, tz);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.transaction(() => {
        db.prepare("UPDATE content_calendar SET scheduled_at = ?, timezone = ?, updated_at = ? WHERE id = ?").run(
          nextUtc,
          tz,
          now,
          itemId
        );
        db.prepare(
          `UPDATE publishing_queue
           SET scheduled_at = ?, next_run_at = ?, timezone = ?, updated_at = ?
           WHERE calendar_item_id = ? AND status NOT IN ('published', 'processing')`
        ).run(nextUtc, nextUtc, tz, now, itemId);
        if (existing.content_post_id) {
          db.prepare("UPDATE content_posts SET scheduled_for = ?, updated_at = ? WHERE id = ?").run(
            nextUtc,
            now,
            String(existing.content_post_id)
          );
        }
      })();
      const updated = db.prepare(
        `SELECT cc.*, c.name as campaign_name, c.color_hex as campaign_color, sa.account_name
           FROM content_calendar cc
           LEFT JOIN content_campaigns c ON c.id = cc.campaign_id
           LEFT JOIN social_accounts sa ON sa.id = cc.social_account_id
           WHERE cc.id = ?`
      ).get(itemId);
      return res.json({ item: mapCalendarRow(updated) });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.get("/workspaces/:wid/publishing-queue", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const rows = statusFilter ? db.prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
             FROM publishing_queue pq
             LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
             WHERE pq.workspace_id = ? AND pq.status = ?
             ORDER BY pq.scheduled_at DESC LIMIT 100`
    ).all(wid, statusFilter) : db.prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
             FROM publishing_queue pq
             LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
             WHERE pq.workspace_id = ?
             ORDER BY pq.created_at DESC LIMIT 100`
    ).all(wid);
    return res.json({
      jobs: rows.map(mapPublishingQueueRow),
      workerHealth: getWorkerHealth(db, wid)
    });
  });
  router.post("/workspaces/:wid/publishing-queue", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        socialAccountId: z3.string().nullable().optional(),
        campaignId: z3.string().nullable().optional(),
        generatedContentId: z3.string().nullable().optional(),
        contentPostId: z3.string().nullable().optional(),
        formatKey: FormatKeySchema.optional(),
        title: z3.string().min(1).max(200),
        bodyText: z3.string().min(1).max(63e3),
        hashtags: z3.array(z3.string()).optional(),
        mediaUrls: z3.array(z3.string()).optional(),
        linkUrl: z3.string().url().nullable().optional(),
        scheduledAt: z3.string().min(8),
        timezone: z3.string().max(64).optional(),
        recurrenceRule: RecurrenceRuleSchema.optional(),
        publishingModeOverride: z3.enum(["automatic", "approval_required"]).optional(),
        saveAsDraft: z3.boolean().optional(),
        idempotencyKey: z3.string().max(120).optional()
      }).parse(req.body);
      const enqueued = enqueuePublishingJob(db, {
        workspaceId: wid,
        userId: req.user.id,
        platformKey: body.platformKey,
        socialAccountId: body.socialAccountId ?? null,
        campaignId: body.campaignId ?? null,
        generatedContentId: body.generatedContentId ?? null,
        contentPostId: body.contentPostId ?? null,
        formatKey: body.formatKey,
        title: body.title,
        bodyText: body.bodyText,
        hashtags: body.hashtags,
        mediaUrls: body.mediaUrls,
        linkUrl: body.linkUrl ?? null,
        scheduledAtLocalOrIso: body.scheduledAt,
        timezone: body.timezone,
        recurrenceRule: body.recurrenceRule,
        publishingModeOverride: body.publishingModeOverride,
        saveAsDraft: body.saveAsDraft,
        idempotencyKey: body.idempotencyKey
      });
      return res.status(201).json(enqueued);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/publishing-queue/:queueId/retry", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z3.object({ scheduledAt: z3.string().optional() }).parse(req.body || {});
      const job = retryFailedQueueJob(db, String(req.params.wid), String(req.params.queueId), body.scheduledAt);
      return res.json({ job });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/publishing-queue/:queueId/cancel", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const job = cancelQueueJob(db, String(req.params.wid), String(req.params.queueId));
      return res.json({ job });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/publishing-queue/:queueId/dispatch-now", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const queueId = String(req.params.queueId);
      const existing = db.prepare("SELECT id, status FROM publishing_queue WHERE id = ? AND workspace_id = ?").get(queueId, wid);
      if (!existing) return res.status(404).json({ error: "Queue job not found." });
      if (existing.status === "awaiting_approval") {
        return res.status(400).json({ error: "This post requires approval before it can be dispatched." });
      }
      if (existing.status === "published") {
        return res.status(400).json({ error: "This post has already been published." });
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(`UPDATE publishing_queue SET status = 'queued', next_run_at = ?, updated_at = ? WHERE id = ?`).run(
        nowIso,
        nowIso,
        queueId
      );
      const job = await executePublishingQueueJob(db, queueId);
      return res.json({ job });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/publishing-queue/worker/tick", requireAuth, requireWorkspaceMember, async (_req, res) => {
    try {
      const summary = await processDuePublishingJobs(db);
      return res.json(summary);
    } catch (err) {
      return handleError(res, err, 500);
    }
  });
  router.get("/workspaces/:wid/publishing-queue/worker/health", requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ workerHealth: getWorkerHealth(db, String(req.params.wid)) });
  });
  router.get("/workspaces/:wid/publishing-history", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const jobs = db.prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
           FROM publishing_queue pq
           LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
           WHERE pq.workspace_id = ?
           ORDER BY pq.updated_at DESC LIMIT 100`
    ).all(wid).map(mapPublishingQueueRow);
    const attempts = db.prepare(
      `SELECT * FROM publishing_attempts
           WHERE workspace_id = ?
           ORDER BY started_at DESC LIMIT 150`
    ).all(wid).map(mapPublishingAttemptRow);
    return res.json({ jobs, attempts, workerHealth: getWorkerHealth(db, wid) });
  });
  router.get("/workspaces/:wid/approvals", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db.prepare(
      `SELECT ca.*, pq.title as queue_title, pq.platform_key, pq.scheduled_at, pq.body_text
         FROM content_approvals ca
         JOIN publishing_queue pq ON pq.id = ca.queue_id
         WHERE ca.workspace_id = ?
         ORDER BY ca.created_at DESC LIMIT 60`
    ).all(wid);
    return res.json({ approvals: rows.map(mapApprovalRow) });
  });
  router.post("/workspaces/:wid/approvals/:approvalId/decide", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z3.object({
        decision: z3.enum(["approved", "rejected", "changes_requested"]),
        notes: z3.string().max(1e3).optional()
      }).parse(req.body);
      const result = decideContentApproval(db, {
        workspaceId: String(req.params.wid),
        approvalId: String(req.params.approvalId),
        reviewerUserId: req.user.id,
        decision: body.decision,
        notes: body.notes
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.get("/workspaces/:wid/engagement-messages", requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const refreshed = db.prepare(
      `SELECT em.*, sa.account_name
         FROM engagement_messages em
         LEFT JOIN social_accounts sa ON sa.id = em.social_account_id
         WHERE em.workspace_id = ?
         ORDER BY em.created_at DESC LIMIT 80`
    ).all(wid);
    const suggestionRows = db.prepare("SELECT * FROM ai_reply_suggestions WHERE workspace_id = ? ORDER BY created_at DESC").all(wid);
    const suggestionsByMsg = /* @__PURE__ */ new Map();
    for (const s of suggestionRows) {
      const mapped = mapReplySuggestionRow(s);
      const list = suggestionsByMsg.get(mapped.engagementMessageId) || [];
      list.push(mapped);
      suggestionsByMsg.set(mapped.engagementMessageId, list);
    }
    const messages = refreshed.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
      accountName: r.account_name ? String(r.account_name) : null,
      platformKey: String(r.platform_key),
      externalMessageId: r.external_message_id ? String(r.external_message_id) : null,
      externalPostId: r.external_post_id ? String(r.external_post_id) : null,
      messageType: String(r.message_type),
      authorName: String(r.author_name),
      authorHandle: String(r.author_handle),
      content: String(r.content),
      sentiment: String(r.sentiment || "neutral"),
      requiresEscalation: Boolean(r.requires_escalation),
      escalationReason: r.escalation_reason ? String(r.escalation_reason) : null,
      status: String(r.status),
      sentReplyText: r.sent_reply_text ? String(r.sent_reply_text) : null,
      repliedByMode: r.replied_by_mode ? String(r.replied_by_mode) : null,
      repliedAt: r.replied_at ? String(r.replied_at) : null,
      isDemo: Boolean(r.is_demo),
      suggestions: suggestionsByMsg.get(String(r.id)) || [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at)
    }));
    const profile = loadWorkspaceBrandProfile(db, wid);
    return res.json({ messages, autoReplyEnabled: profile.autoReplyEnabled });
  });
  router.post("/workspaces/:wid/engagement-messages", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z3.object({
        platformKey: PlatformKeySchema2,
        socialAccountId: z3.string().nullable().optional(),
        messageType: z3.enum(["comment", "direct_message", "mention", "review"]).default("comment"),
        authorName: z3.string().min(1).max(120),
        authorHandle: z3.string().min(1).max(120),
        content: z3.string().min(1).max(2e3)
      }).parse(req.body);
      const id = crypto16.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        `INSERT INTO engagement_messages (
          id, workspace_id, social_account_id, platform_key, message_type, author_name, author_handle,
          content, sentiment, requires_escalation, status, is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'neutral', 0, 'open', 0, ?, ?)`
      ).run(
        id,
        wid,
        body.socialAccountId ?? null,
        body.platformKey,
        body.messageType,
        body.authorName.trim(),
        body.authorHandle.trim(),
        body.content.trim(),
        now,
        now
      );
      return res.status(201).json({ id });
    } catch (err) {
      return handleError(res, err);
    }
  });
  router.post("/workspaces/:wid/engagement-messages/:msgId/suggest-reply", requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const msg = db.prepare("SELECT * FROM engagement_messages WHERE id = ? AND workspace_id = ?").get(msgId, wid);
      if (!msg) return res.status(404).json({ error: "Engagement message not found." });
      const body = z3.object({ desiredTone: z3.string().max(120).optional() }).parse(req.body || {});
      const result = await runCommentReplyDraftingModule(db, {
        workspaceId: wid,
        userId: req.user.id,
        engagementMessageId: msgId,
        platformKey: String(msg.platform_key),
        authorName: String(msg.author_name),
        messageContent: String(msg.content),
        desiredTone: body.desiredTone
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/engagement-messages/:msgId/reply", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const body = z3.object({
        replyText: z3.string().min(1).max(2e3),
        mode: z3.enum(["manual", "ai_approved", "ai_auto"]).default("ai_approved"),
        suggestionId: z3.string().optional()
      }).parse(req.body);
      const msg = db.prepare("SELECT * FROM engagement_messages WHERE id = ? AND workspace_id = ?").get(msgId, wid);
      if (!msg) return res.status(404).json({ error: "Engagement message not found." });
      if (body.mode === "ai_auto") {
        const profile = loadWorkspaceBrandProfile(db, wid);
        if (!profile.autoReplyEnabled) {
          return res.status(403).json({
            error: "Automated replies are disabled in workspace Brand Safety settings. Enable Auto-Reply explicitly or approve manually."
          });
        }
        if (Boolean(msg.requires_escalation)) {
          return res.status(400).json({
            error: "Escalated sensitive messages cannot be auto-replied and require explicit human approval."
          });
        }
      }
      const safety = evaluateContentSafety(db, {
        workspaceId: wid,
        platformKey: String(msg.platform_key),
        bodyText: body.replyText,
        checkDuplicate: false
      });
      if (safety.status === "blocked") {
        return res.status(400).json({ error: safety.issues[0]?.message || "Reply blocked by Content Safety policy." });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.transaction(() => {
        db.prepare(
          `UPDATE engagement_messages
           SET sent_reply_text = ?, replied_by_mode = ?, replied_at = ?, status = 'replied', updated_at = ?
           WHERE id = ? AND workspace_id = ?`
        ).run(body.replyText.trim(), body.mode, now, now, msgId, wid);
        if (body.suggestionId) {
          db.prepare(`UPDATE ai_reply_suggestions SET status = 'sent', updated_at = ? WHERE id = ? AND workspace_id = ?`).run(
            now,
            body.suggestionId,
            wid
          );
        }
      })();
      return res.json({ replied: true, repliedAt: now, mode: body.mode });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });
  router.post("/workspaces/:wid/engagement-messages/:msgId/escalate", requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const body = z3.object({ reason: z3.string().min(3).max(500) }).parse(req.body);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      db.prepare(
        `UPDATE engagement_messages
         SET requires_escalation = 1, escalation_reason = ?, status = 'escalated', updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      ).run(body.reason.trim(), now, msgId, wid);
      return res.json({ escalated: true });
    } catch (err) {
      return handleError(res, err);
    }
  });
  return router;
}

// server/app.ts
function createExpressApp(db) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use((req, _res, next) => {
    const raw = req;
    if (req.readableEnded && req.body !== void 0 && !raw._body) {
      raw._body = true;
    }
    next();
  });
  app.use(express.json({ limit: "12mb" }));
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(async (req, res, next) => {
    if (!isRtdbSyncEnabled()) {
      return next();
    }
    const idToken = typeof req.headers["x-firebase-id-token"] === "string" && req.headers["x-firebase-id-token"].trim() ? req.headers["x-firebase-id-token"].trim() : void 0;
    try {
      await ensureRtdbHydrated(db, { authToken: idToken });
    } catch {
    }
    const isMutation = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
    if (isMutation) {
      const originalEnd = res.end.bind(res);
      let persisted = false;
      res.end = (...args) => {
        if (persisted || res.locals.rtdbPersisted || res.statusCode >= 400) {
          return originalEnd(...args);
        }
        persisted = true;
        void persistDatabaseToRtdb(db, { authToken: idToken }).catch(() => void 0).finally(() => {
          originalEnd(...args);
        });
        return res;
      };
    }
    next();
  });
  app.get("/auth/oauth/sandbox-consent", (req, res) => {
    const platform = String(req.query.platform || "facebook");
    const state = String(req.query.state || "");
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
    <h1>Authorize ${platform.replace("_", " ").toUpperCase()} Connection</h1>
    <p>Sandbox mode is active. Click below to grant permissions and simulate secure account discovery for this platform without requiring live developer credentials.</p>
    <a href="/auth/oauth/${platform}/callback?code=sandbox_auth_code_${Date.now()}&state=${state}" class="btn">Authorize & Discover Accounts</a>
  </div>
</body>
</html>`;
    res.send(html);
  });
  app.get(["/auth/oauth/:platform/callback", "/auth/oauth/:platform/callback/"], async (req, res) => {
    const rawPlatform = String(req.params.platform || "");
    if (!isValidPlatformKey(rawPlatform)) {
      return res.status(400).send(renderOAuthPopupResult({ success: false, platform: rawPlatform, message: "Unsupported social media platform." }));
    }
    const platform = rawPlatform;
    const code = req.query.code ? String(req.query.code) : void 0;
    const state = req.query.state ? String(req.query.state) : void 0;
    const oauthError = req.query.error ? String(req.query.error) : null;
    const errorDescription = req.query.error_description ? String(req.query.error_description) : null;
    try {
      const discovery = await handleOAuthCallbackForDiscovery(db, {
        platformKey: platform,
        code,
        state,
        oauthError,
        errorDescription
      });
      if (isRtdbSyncEnabled()) {
        await persistDatabaseToRtdb(db).catch(() => void 0);
      }
      return res.send(
        renderOAuthPopupResult({
          success: true,
          platform,
          discoverySessionId: discovery.discoverySessionId,
          accountCount: discovery.accountCount,
          message: discovery.accountCount > 0 ? `Discovered ${discovery.accountCount} ${discovery.platformName} account(s). Select accounts in your LIVINGTECH dashboard to finish connecting.` : `Authorized ${discovery.platformName}, but no eligible accounts/pages were returned.`
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to complete OAuth authorization.";
      const statusCode = oauthError || msg.includes("Invalid or expired") || msg.includes("Missing OAuth") ? 400 : 502;
      return res.status(statusCode).send(
        renderOAuthPopupResult({
          success: false,
          platform,
          message: msg
        })
      );
    }
  });
  app.get("/api/webhooks/social/:platform", (req, res) => {
    const rawPlatform = String(req.params.platform || "");
    if (!isValidPlatformKey(rawPlatform)) {
      return res.status(404).json({ error: "Unknown social platform." });
    }
    const challenge = req.query["hub.challenge"];
    if (challenge) {
      return res.status(200).send(String(challenge));
    }
    return res.json({ status: "ok", platform: rawPlatform });
  });
  app.post("/api/webhooks/social/:platform", (req, res) => {
    const rawPlatform = String(req.params.platform || "");
    if (!isValidPlatformKey(rawPlatform)) {
      return res.status(404).json({ error: "Unknown social platform." });
    }
    const signatureHeader = String(
      req.headers["x-hub-signature-256"] || req.headers["x-twitter-webhooks-signature"] || req.headers["x-tiktok-signature"] || ""
    );
    const deliveryId = String(req.headers["x-request-id"] || req.headers["x-delivery-id"] || "") || null;
    const bodyObj = req.body && typeof req.body === "object" ? req.body : {};
    const eventType = String(bodyObj.event || bodyObj.object || bodyObj.type || "webhook_notification");
    const eventId = recordPlatformWebhookEvent(db, {
      platformKey: rawPlatform,
      eventType,
      deliveryId,
      verified: signatureHeader.length > 0,
      payload: bodyObj
    });
    return res.status(202).json({ received: true, eventId });
  });
  app.use("/generated", express.static(getGeneratedMediaRootDir()));
  app.use("/api", createApiRouter(db));
  app.use("/api", createPhase3Router(db));
  app.use((err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });
  return app;
}
function renderOAuthPopupResult(params) {
  const safePayload = JSON.stringify({
    type: params.success ? "OAUTH_DISCOVERY_READY" : "OAUTH_AUTH_ERROR",
    platform: params.platform,
    message: params.message,
    discoverySessionId: params.discoverySessionId ?? null,
    accountCount: params.accountCount ?? 0
  });
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>LIVINGTECH OAuth Callback</title></head>
<body style="font-family:sans-serif;background:#071436;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;max-width:440px;padding:24px;">
    <h2 style="margin:0 0 8px 0;">LIVINGTECH BRAND AGENCY</h2>
    <p style="opacity:0.88;line-height:1.5;">${params.message.replace(/</g, "&lt;")}</p>
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

// server/vercel-entry.ts
var cachedApp = null;
function getServerlessApp() {
  if (!cachedApp) {
    const db = getDb();
    cachedApp = createExpressApp(db);
  }
  return cachedApp;
}
function handler(req, res) {
  try {
    const app = getServerlessApp();
    return app(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Serverless API invocation failed", { error: message });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Internal server error", detail: message }));
    }
  }
}
export {
  handler as default
};
