import type { PostStatus, UserRole } from '../shared/api-contracts';

export function slugifyWorkspaceName(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'workspace';
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain both uppercase and lowercase letters.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one number.' };
  }
  return { valid: true };
}

export function calculateAiCreditCost(feature: 'content_studio' | 'content_strategy' | 'caption_rewrite' | 'hashtag_research'): number {
  switch (feature) {
    case 'content_strategy':
      return 15;
    case 'content_studio':
      return 5;
    case 'caption_rewrite':
      return 2;
    case 'hashtag_research':
      return 2;
  }
}

export function canTransitionPostStatus(current: PostStatus, next: PostStatus, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true;
  if (current === 'published') return false; // Terminal state locked for non-admins
  const allowed: Record<PostStatus, PostStatus[]> = {
    draft: ['draft', 'pending', 'scheduled'],
    pending: ['draft', 'pending', 'scheduled', 'published', 'failed'],
    scheduled: ['draft', 'pending', 'scheduled', 'published', 'failed'],
    failed: ['draft', 'pending', 'scheduled'],
    published: [],
  };
  return allowed[current].includes(next);
}

export function hasSuperAdminAccess(role: UserRole | undefined | null): boolean {
  return role === 'super_admin';
}

export function formatCurrencyCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function summarizePostCounts(statuses: PostStatus[]) {
  const counts = {
    draft: 0,
    pending: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  };
  for (const s of statuses) {
    if (s in counts) counts[s] += 1;
  }
  return counts;
}

export function parseKeywordsInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const cleaned = part.trim().replace(/\s+/g, ' ').slice(0, 48);
    const key = cleaned.toLowerCase();
    if (cleaned.length >= 2 && !seen.has(key) && out.length < 15) {
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

export function normalizeHashtags(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const stripped = raw.trim().replace(/^#+/, '').replace(/[^a-zA-Z0-9_]/g, '');
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

export const ALL_PLATFORM_KEYS = [
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'x',
  'pinterest',
  'google_business',
] as const;

export function getPlatformCharLimit(
  platform: 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'x' | 'pinterest' | 'google_business'
): number {
  switch (platform) {
    case 'x':
      return 280;
    case 'pinterest':
      return 500;
    case 'google_business':
      return 1500;
    case 'instagram':
      return 2200;
    case 'tiktok':
      return 2200;
    case 'linkedin':
      return 3000;
    case 'youtube':
      return 5000;
    case 'facebook':
      return 63206;
  }
}

export function canAccountPublishFormat(
  capabilities: {
    textPublishing: boolean;
    imagePublishing: boolean;
    videoPublishing: boolean;
    carouselPublishing: boolean;
    storyPublishing: boolean;
    reelsPublishing: boolean;
    shortFormVideoPublishing: boolean;
  },
  format: 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reels' | 'short_form_video'
): boolean {
  switch (format) {
    case 'text':
      return capabilities.textPublishing;
    case 'image':
      return capabilities.imagePublishing;
    case 'video':
      return capabilities.videoPublishing;
    case 'carousel':
      return capabilities.carouselPublishing;
    case 'story':
      return capabilities.storyPublishing;
    case 'reels':
      return capabilities.reelsPublishing;
    case 'short_form_video':
      return capabilities.shortFormVideoPublishing;
  }
}

export function maskClientId(clientId: string | null | undefined): string | null {
  if (!clientId || clientId.trim().length === 0) return null;
  const trimmed = clientId.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}••••`;
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

// =============================================================================
// PHASE 3: TIMEZONE / DST, RECURRENCE, GRAPHIC ASPECT RATIOS & AI CREDIT COSTS
// =============================================================================

export const PHASE3_AI_CREDIT_COSTS = {
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
  comment_reply_drafting: 2,
} as const;

export const GRAPHIC_ASPECT_PRESETS = [
  { id: '1:1', label: 'Square (1:1)', width: 1080, height: 1080, platforms: ['instagram', 'facebook', 'linkedin', 'x'] },
  { id: '4:5', label: 'Portrait Feed (4:5)', width: 1080, height: 1350, platforms: ['instagram', 'facebook'] },
  { id: '9:16', label: 'Story / Reel / TikTok (9:16)', width: 1080, height: 1920, platforms: ['instagram', 'tiktok', 'facebook', 'youtube'] },
  { id: '16:9', label: 'Landscape / YouTube (16:9)', width: 1280, height: 720, platforms: ['youtube', 'linkedin', 'x', 'facebook'] },
  { id: '1.91:1', label: 'Link Banner (1.91:1)', width: 1200, height: 628, platforms: ['linkedin', 'facebook', 'google_business'] },
  { id: '2:3', label: 'Pinterest Pin (2:3)', width: 1000, height: 1500, platforms: ['pinterest'] },
] as const;

export function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a wall-clock date/time ("YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm") in a given IANA timezone
 * into an exact UTC ISO-8601 string, automatically accounting for Daylight Saving Time (DST) transitions.
 */
export function convertLocalDateTimeToUtcIso(localDateTime: string, timeZone: string): string {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : 'UTC';
  // If the string already contains an explicit offset or trailing Z, parse directly
  if (/(Z|[+-]\d{2}:\d{2})$/i.test(localDateTime.trim())) {
    const d = new Date(localDateTime.trim());
    if (Number.isNaN(d.getTime())) throw new Error('Invalid ISO date-time value.');
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
  const second = Number(secs || '0');

  const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  const getOffsetMs = (utcMillis: number): number => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = dtf.formatToParts(new Date(utcMillis));
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = Number(p.value);
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

  // Two-pass fixed-point iteration resolves DST boundary shifts accurately
  let offset = getOffsetMs(targetAsUtcMs);
  let candidate = targetAsUtcMs - offset;
  const secondOffset = getOffsetMs(candidate);
  if (secondOffset !== offset) {
    candidate = targetAsUtcMs - secondOffset;
  }
  return new Date(candidate).toISOString();
}

export function formatUtcInTimezone(utcIso: string, timeZone: string): string {
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : 'UTC';
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return utcIso;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

/**
 * Computes the next UTC occurrence for a recurring schedule while preserving local wall-clock time across DST.
 */
export function computeNextRecurrenceIso(
  currentUtcIso: string,
  timeZone: string,
  rule: {
    type: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';
    weekdays?: number[];
    dayOfMonth?: number;
    customDates?: string[];
    endDate?: string | null;
  }
): string | null {
  if (rule.type === 'none') return null;
  const safeTz = isValidIanaTimezone(timeZone) ? timeZone : 'UTC';
  const current = new Date(currentUtcIso);
  if (Number.isNaN(current.getTime())) return null;

  if (rule.type === 'custom') {
    const upcoming = (rule.customDates || [])
      .map((d) => convertLocalDateTimeToUtcIso(d, safeTz))
      .filter((iso) => new Date(iso).getTime() > current.getTime())
      .sort();
    const next = upcoming[0] ?? null;
    if (next && rule.endDate && new Date(next).getTime() > new Date(rule.endDate).getTime()) return null;
    return next;
  }

  // Extract local wall-clock components in the workspace/account timezone so DST never shifts posting hour
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(current)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = pad(parts.hour === 24 ? 0 : parts.hour);
  const mm = pad(parts.minute);

  const probeDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));

  let nextIso: string | null = null;
  if (rule.type === 'daily') {
    probeDate.setUTCDate(probeDate.getUTCDate() + 1);
    nextIso = convertLocalDateTimeToUtcIso(
      `${probeDate.getUTCFullYear()}-${pad(probeDate.getUTCMonth() + 1)}-${pad(probeDate.getUTCDate())}T${hh}:${mm}`,
      safeTz
    );
  } else if (rule.type === 'weekly') {
    probeDate.setUTCDate(probeDate.getUTCDate() + 7);
    nextIso = convertLocalDateTimeToUtcIso(
      `${probeDate.getUTCFullYear()}-${pad(probeDate.getUTCMonth() + 1)}-${pad(probeDate.getUTCDate())}T${hh}:${mm}`,
      safeTz
    );
  } else if (rule.type === 'weekdays') {
    const allowedDays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [1, 2, 3, 4, 5];
    for (let i = 1; i <= 8; i++) {
      const candidate = new Date(probeDate.getTime() + i * 86400 * 1000);
      if (allowedDays.includes(candidate.getUTCDay())) {
        nextIso = convertLocalDateTimeToUtcIso(
          `${candidate.getUTCFullYear()}-${pad(candidate.getUTCMonth() + 1)}-${pad(candidate.getUTCDate())}T${hh}:${mm}`,
          safeTz
        );
        break;
      }
    }
  } else if (rule.type === 'monthly') {
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






