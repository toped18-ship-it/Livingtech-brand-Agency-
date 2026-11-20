import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import type { ContentSafetyResult, PlatformKey } from '../../src/shared/api-contracts';
import { getPlatformCharLimit } from '../../src/utils/domain';

const MISLEADING_CLAIM_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(guaranteed|100%\s*guaranteed)\s+(followers|growth|viral|sales|roi|income|results)\b/i,
    reason: 'Contains a guaranteed follower growth or guaranteed ROI claim, which violates marketing compliance and content safety rules.',
  },
  {
    pattern: /\b(get\s+\d+k?\+?\s+followers\s+(overnight|in\s+24\s*hours|instantly))\b/i,
    reason: 'Contains an unverified instant follower-growth promise.',
  },
  {
    pattern: /\b(fake\s+review|fabricated\s+testimonial|invented\s+customer\s+quote)\b/i,
    reason: 'References fabricated testimonials or fake reviews.',
  },
  {
    pattern: /\b(cure[sd]?\s+cancer|miracle\s+cure|guaranteed\s+medical\s+results)\b/i,
    reason: 'Contains prohibited misleading medical/health claims.',
  },
];

const SENSITIVE_OR_SPAM_PATTERNS: { pattern: RegExp; reason: string; severity: 'warning' | 'error' }[] = [
  {
    pattern: /(click\s+here\s+now!!!|free\s+money\s+fast|wire\s+transfer\s+urgent)/i,
    reason: 'Matches high-risk spam or deceptive promotional phrasing.',
    severity: 'error',
  },
  {
    pattern: /([!?])\1{4,}/,
    reason: 'Excessive repeated punctuation may trigger social platform spam filters.',
    severity: 'warning',
  },
  {
    pattern: /\b(all\s+rights\s+stolen|copyright\s+infringement|copied\s+verbatim\s+from)\b/i,
    reason: 'Potential copyright-attribution concern detected.',
    severity: 'error',
  },
];

export function computeContentHash(text: string, hashtags: string[] = []): string {
  const normalized = `${text.trim().toLowerCase().replace(/\s+/g, ' ')}|${hashtags
    .map((h) => h.trim().toLowerCase())
    .sort()
    .join(',')}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function getWorkspaceBrandSafetyRules(db: DbInstance, workspaceId: string) {
  const row = db
    .prepare(
      `SELECT banned_words_json, brand_tone_rules, max_posts_per_day, auto_reply_enabled
       FROM brand_profiles WHERE workspace_id = ?`
    )
    .get(workspaceId) as
    | {
        banned_words_json?: string;
        brand_tone_rules?: string;
        max_posts_per_day?: number;
        auto_reply_enabled?: number;
      }
    | undefined;

  let bannedWords: string[] = [];
  try {
    bannedWords = JSON.parse(row?.banned_words_json || '[]');
  } catch {
    bannedWords = [];
  }
  return {
    bannedWords: Array.isArray(bannedWords) ? bannedWords.map((w) => String(w).trim()).filter(Boolean) : [],
    brandToneRules: String(row?.brand_tone_rules || ''),
    maxPostsPerDay: Number(row?.max_posts_per_day ?? 10) || 10,
    autoReplyEnabled: Boolean(row?.auto_reply_enabled),
  };
}

export function evaluateContentSafety(
  db: DbInstance,
  params: {
    workspaceId: string;
    socialAccountId?: string | null;
    platformKey: PlatformKey;
    title?: string;
    bodyText: string;
    hashtags?: string[];
    scheduledAt?: string | null;
    checkDuplicate?: boolean;
    checkFrequencyLimit?: boolean;
  }
): ContentSafetyResult {
  const issues: ContentSafetyResult['issues'] = [];
  const rules = getWorkspaceBrandSafetyRules(db, params.workspaceId);
  const fullText = `${params.title || ''} ${params.bodyText} ${(params.hashtags || []).join(' ')}`.trim();
  const contentHash = computeContentHash(params.bodyText, params.hashtags || []);

  // 1. Empty / minimal content check
  if (!params.bodyText.trim()) {
    issues.push({
      code: 'EMPTY_CONTENT',
      severity: 'error',
      message: 'Post body cannot be empty.',
    });
  }

  // 2. Banned words enforcement (workspace policy)
  const lowerFull = fullText.toLowerCase();
  for (const word of rules.bannedWords) {
    if (!word) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lowerFull)) {
      issues.push({
        code: 'BANNED_WORD',
        severity: 'error',
        message: `Blocked brand safety term detected: "${word}". Remove it before publishing.`,
      });
    }
  }

  // 3. Misleading claims / guaranteed follower growth / fabricated testimonials
  for (const rule of MISLEADING_CLAIM_PATTERNS) {
    if (rule.pattern.test(fullText)) {
      issues.push({
        code: 'MISLEADING_CLAIM',
        severity: 'error',
        message: rule.reason,
      });
    }
  }

  // 4. Sensitive / spam / copyright-conscious patterns
  for (const rule of SENSITIVE_OR_SPAM_PATTERNS) {
    if (rule.pattern.test(fullText)) {
      issues.push({
        code: 'SPAM_OR_COMPLIANCE',
        severity: rule.severity,
        message: rule.reason,
      });
    }
  }

  // 5. Hashtag spam check
  const hashtagCount = (params.hashtags || []).length;
  if (hashtagCount > 30) {
    issues.push({
      code: 'EXCESSIVE_HASHTAGS',
      severity: 'error',
      message: `Too many hashtags (${hashtagCount}). Social platforms flag posts with more than 30 hashtags as spam.`,
    });
  } else if (params.platformKey === 'x' && hashtagCount > 5) {
    issues.push({
      code: 'HASHTAG_RECOMMENDATION',
      severity: 'warning',
      message: 'X performs best with 1–3 concise hashtags; consider trimming extra tags.',
    });
  }

  // 6. Platform character limit check
  const charLimit = getPlatformCharLimit(params.platformKey);
  const assembledLength = [params.bodyText.trim(), (params.hashtags || []).join(' ')].filter(Boolean).join('\n\n').length;
  if (assembledLength > charLimit) {
    issues.push({
      code: 'CHAR_LIMIT_EXCEEDED',
      severity: 'error',
      message: `Content length (${assembledLength} chars) exceeds ${params.platformKey.toUpperCase()} limit (${charLimit} chars).`,
    });
  }

  // 7. Duplicate content detection on the same account / workspace in the last 72h or queued
  if (params.checkDuplicate !== false) {
    const dupRow = params.socialAccountId
      ? (db
          .prepare(
            `SELECT id, status FROM publishing_queue
             WHERE workspace_id = ? AND social_account_id = ? AND content_hash = ?
               AND status IN ('scheduled','queued','processing','awaiting_approval','published')
               AND created_at >= datetime('now', '-72 hours')
             LIMIT 1`
          )
          .get(params.workspaceId, params.socialAccountId, contentHash) as { id: string; status: string } | undefined)
      : (db
          .prepare(
            `SELECT id, status FROM publishing_queue
             WHERE workspace_id = ? AND platform_key = ? AND content_hash = ?
               AND status IN ('scheduled','queued','processing','awaiting_approval','published')
               AND created_at >= datetime('now', '-72 hours')
             LIMIT 1`
          )
          .get(params.workspaceId, params.platformKey, contentHash) as { id: string; status: string } | undefined);

    if (dupRow) {
      issues.push({
        code: 'DUPLICATE_CONTENT',
        severity: 'error',
        message: `Duplicate post detected (matches existing ${dupRow.status} item ${dupRow.id.slice(0, 8)}). Modify the copy before scheduling to prevent platform spam penalties.`,
      });
    }
  }

  // 8. Publishing frequency limit enforcement (workspace & account daily cap)
  if (params.checkFrequencyLimit && params.scheduledAt) {
    const targetDay = params.scheduledAt.slice(0, 10);
    let dailyCap = rules.maxPostsPerDay;

    if (params.socialAccountId) {
      const accRow = db
        .prepare('SELECT publishing_preferences_json FROM social_accounts WHERE id = ? AND workspace_id = ?')
        .get(params.socialAccountId, params.workspaceId) as { publishing_preferences_json?: string } | undefined;
      if (accRow?.publishing_preferences_json) {
        try {
          const prefs = JSON.parse(accRow.publishing_preferences_json) as { dailyPostLimit?: number };
          if (typeof prefs.dailyPostLimit === 'number' && prefs.dailyPostLimit > 0) {
            dailyCap = Math.min(dailyCap, prefs.dailyPostLimit);
          }
        } catch {
          // ignore malformed prefs
        }
      }

      const dayCountRow = db
        .prepare(
          `SELECT COUNT(*) as c FROM publishing_queue
           WHERE workspace_id = ? AND social_account_id = ?
             AND substr(scheduled_at, 1, 10) = ?
             AND status NOT IN ('cancelled', 'draft')`
        )
        .get(params.workspaceId, params.socialAccountId, targetDay) as { c: number };

      if (dayCountRow.c >= dailyCap) {
        issues.push({
          code: 'DAILY_FREQUENCY_LIMIT',
          severity: 'error',
          message: `Daily publishing frequency cap reached (${dayCountRow.c}/${dailyCap} posts on ${targetDay}) for this account.`,
        });
      }
    }
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  return {
    status: hasError ? 'blocked' : hasWarning ? 'flagged' : 'passed',
    issues,
    contentHash,
  };
}
