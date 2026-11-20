import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import { env, logger } from '../env';
import { getSocialProvider } from '../integrations/registry';
import { ProviderApiError } from '../integrations/httpClient';
import type { PublishPayload, PublishResult } from '../integrations/types';
import {
  decryptSocialToken,
  isSandboxExternalAccountId,
  isSandboxToken,
  parsePublishingPreferences,
  parseSocialAccountCapabilities,
  refreshSocialAccountToken,
} from '../services/oauthService';
import { computeContentHash, evaluateContentSafety } from '../services/contentSafetyService';
import { validatePostForPlatform } from '../services/publishingValidationService';
import {
  computeNextRecurrenceIso,
  convertLocalDateTimeToUtcIso,
  formatUtcInTimezone,
  normalizeHashtags,
} from '../../src/utils/domain';
import type {
  ContentApprovalRecord,
  PlatformCapabilityMatrix,
  PlatformKey,
  PublishingAttemptRecord,
  PublishingFormatKey,
  PublishingQueueRecord,
  QueueJobStatus,
  RecurrenceRule,
  RecurrenceType,
  WorkerHealthSummary,
} from '../../src/shared/api-contracts';

export type PublishExecutorFn = (params: {
  platformKey: PlatformKey;
  accessToken: string;
  account: { externalAccountId: string; capabilities: PlatformCapabilityMatrix };
  payload: PublishPayload;
}) => Promise<PublishResult>;

let publishExecutorOverride: PublishExecutorFn | null = null;
let embeddedWorkerTimer: NodeJS.Timeout | null = null;
let lastWorkerTickAt: string | null = null;
const WORKER_INSTANCE_ID = `lt-worker-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;

export function setPublishExecutorForTests(fn: PublishExecutorFn | null) {
  publishExecutorOverride = fn;
}

export function mapPublishingQueueRow(r: Record<string, unknown>): PublishingQueueRecord {
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
    platformKey: String(r.platform_key) as PlatformKey,
    formatKey: String(r.format_key || 'text') as PublishingFormatKey,
    title: String(r.title),
    bodyText: String(r.body_text),
    hashtags: JSON.parse(String(r.hashtags_json || '[]')),
    mediaUrls: JSON.parse(String(r.media_urls_json || '[]')),
    linkUrl: r.link_url ? String(r.link_url) : null,
    status: String(r.status) as QueueJobStatus,
    publishingMode: String(r.publishing_mode || 'automatic') as 'automatic' | 'approval_required',
    requiresApproval: Boolean(r.requires_approval),
    approvedByUserId: r.approved_by_user_id ? String(r.approved_by_user_id) : null,
    approvedAt: r.approved_at ? String(r.approved_at) : null,
    scheduledAt: String(r.scheduled_at),
    nextRunAt: String(r.next_run_at),
    timezone: String(r.timezone || 'UTC'),
    recurrenceType: String(r.recurrence_type || 'none') as RecurrenceType,
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
    updatedAt: String(r.updated_at),
  };
}

export function mapPublishingAttemptRow(r: Record<string, unknown>): PublishingAttemptRecord {
  return {
    id: String(r.id),
    queueId: String(r.queue_id),
    workspaceId: String(r.workspace_id),
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    platformKey: String(r.platform_key) as PlatformKey,
    attemptNumber: Number(r.attempt_number),
    workerId: String(r.worker_id || 'embedded-worker'),
    status: String(r.status) as PublishingAttemptRecord['status'],
    httpStatus: r.http_status != null ? Number(r.http_status) : null,
    errorCode: r.error_code ? String(r.error_code) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    retryDelayMs: r.retry_delay_ms != null ? Number(r.retry_delay_ms) : null,
    platformPostId: r.platform_post_id ? String(r.platform_post_id) : null,
    apiResponse: r.api_response_json ? JSON.parse(String(r.api_response_json)) : null,
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null,
  };
}

export function mapApprovalRow(r: Record<string, unknown>): ContentApprovalRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    queueId: String(r.queue_id),
    queueTitle: r.queue_title ? String(r.queue_title) : undefined,
    platformKey: r.platform_key ? (String(r.platform_key) as PlatformKey) : undefined,
    scheduledAt: r.scheduled_at ? String(r.scheduled_at) : undefined,
    bodyText: r.body_text ? String(r.body_text) : undefined,
    requestedByUserId: String(r.requested_by_user_id),
    reviewerUserId: r.reviewer_user_id ? String(r.reviewer_user_id) : null,
    decision: String(r.decision) as ContentApprovalRecord['decision'],
    notes: String(r.notes || ''),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function createWorkspaceNotification(
  db: DbInstance,
  params: { workspaceId: string; userId: string; title: string; body: string }
) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO notifications (id, workspace_id, user_id, category, title, body, is_read, created_at, updated_at)
     VALUES (?, ?, ?, 'publishing', ?, ?, 0, ?, ?)`
  ).run(crypto.randomUUID(), params.workspaceId, params.userId, params.title, params.body, now, now);
}

export function enqueuePublishingJob(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    socialAccountId?: string | null;
    campaignId?: string | null;
    generatedContentId?: string | null;
    contentPostId?: string | null;
    formatKey?: PublishingFormatKey;
    title: string;
    bodyText: string;
    hashtags?: string[];
    mediaUrls?: string[];
    linkUrl?: string | null;
    scheduledAtLocalOrIso: string;
    timezone?: string;
    recurrenceRule?: RecurrenceRule;
    publishingModeOverride?: 'automatic' | 'approval_required';
    saveAsDraft?: boolean;
    idempotencyKey?: string;
    skipDuplicateCheck?: boolean;
  }
): { job: PublishingQueueRecord; calendarItemId: string; approvalId: string | null } {
  const cleanTags = normalizeHashtags(params.hashtags || []);
  const mediaUrls = (params.mediaUrls || []).filter((u) => typeof u === 'string' && u.trim().length > 0);
  const formatKey: PublishingFormatKey = params.formatKey || (mediaUrls.length > 0 ? 'image' : 'text');

  // Resolve workspace timezone & connected account preferences
  const ws = db.prepare('SELECT timezone FROM workspaces WHERE id = ?').get(params.workspaceId) as { timezone?: string } | undefined;
  let accountRow: Record<string, unknown> | undefined;
  let accountPrefs = parsePublishingPreferences(null);
  let accountCapabilities: PlatformCapabilityMatrix | null = null;

  if (params.socialAccountId) {
    accountRow = db
      .prepare(
        `SELECT sa.*, sp.key as platform_key
         FROM social_accounts sa
         JOIN social_platforms sp ON sp.id = sa.platform_id
         WHERE sa.id = ? AND sa.workspace_id = ?`
      )
      .get(params.socialAccountId, params.workspaceId) as Record<string, unknown> | undefined;
    if (!accountRow) {
      throw new Error('Selected social account does not exist in this workspace.');
    }
    if (String(accountRow.platform_key) !== params.platformKey) {
      throw new Error(`Account belongs to ${String(accountRow.platform_key)}, not ${params.platformKey}.`);
    }
    accountPrefs = parsePublishingPreferences(String(accountRow.publishing_preferences_json || ''));
    accountCapabilities = parseSocialAccountCapabilities(params.platformKey, String(accountRow.capabilities_json || ''));
  }

  const resolvedTimezone = params.timezone || accountPrefs.defaultTimezone || ws?.timezone || 'UTC';
  const scheduledUtcIso = convertLocalDateTimeToUtcIso(params.scheduledAtLocalOrIso, resolvedTimezone);

  // Append account default hashtags if enabled
  const finalHashtags =
    accountPrefs.appendDefaultHashtags && accountPrefs.defaultHashtags.length > 0
      ? normalizeHashtags([...cleanTags, ...accountPrefs.defaultHashtags])
      : cleanTags;

  // Content Safety Check
  const safety = evaluateContentSafety(db, {
    workspaceId: params.workspaceId,
    socialAccountId: params.socialAccountId ?? null,
    platformKey: params.platformKey,
    title: params.title,
    bodyText: params.bodyText,
    hashtags: finalHashtags,
    scheduledAt: scheduledUtcIso,
    checkDuplicate: !params.saveAsDraft && !params.skipDuplicateCheck,
    checkFrequencyLimit: !params.saveAsDraft,
  });

  if (safety.status === 'blocked') {
    const firstErr = safety.issues.find((i) => i.severity === 'error')?.message || 'Blocked by Content Safety policy.';
    throw new Error(firstErr);
  }

  // Platform Format & Character Limit Validation (unless saving a rough draft)
  if (!params.saveAsDraft) {
    const validation = validatePostForPlatform({
      platformKey: params.platformKey,
      formatKey,
      title: params.title,
      bodyText: params.bodyText,
      hashtags: finalHashtags,
      mediaUrls,
      accountCapabilities,
    });
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }
  }

  // Default mode is AUTOMATIC unless account or caller explicitly enables approval-before-publishing
  const publishingMode: 'automatic' | 'approval_required' =
    params.publishingModeOverride ??
    (accountPrefs.requireApprovalBeforePublish || !accountPrefs.autoPublishEnabled ? 'approval_required' : 'automatic');

  const requiresApproval = publishingMode === 'approval_required';
  const initialStatus: QueueJobStatus = params.saveAsDraft
    ? 'draft'
    : requiresApproval
    ? 'awaiting_approval'
    : new Date(scheduledUtcIso).getTime() <= Date.now() + 60_000
    ? 'queued'
    : 'scheduled';

  const recurrenceRule: RecurrenceRule = params.recurrenceRule ?? { type: 'none' };
  const recurrenceType: RecurrenceType = recurrenceRule.type || 'none';

  const contentHash = computeContentHash(params.bodyText, finalHashtags);
  const idempotencyKey =
    params.idempotencyKey?.trim() ||
    crypto
      .createHash('sha256')
      .update(`${params.workspaceId}:${params.socialAccountId || params.platformKey}:${contentHash}:${scheduledUtcIso}`)
      .digest('hex')
      .slice(0, 48);

  // Idempotency guard: if an identical idempotency key already exists, return it instead of duplicating
  const existingJob = db
    .prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.idempotency_key = ?`
    )
    .get(idempotencyKey) as Record<string, unknown> | undefined;

  if (existingJob) {
    return {
      job: mapPublishingQueueRow(existingJob),
      calendarItemId: String(existingJob.calendar_item_id || ''),
      approvalId: null,
    };
  }

  const now = new Date().toISOString();
  const queueId = crypto.randomUUID();
  const calendarItemId = crypto.randomUUID();
  const approvalId = requiresApproval && !params.saveAsDraft ? crypto.randomUUID() : null;
  let contentPostId = params.contentPostId ?? null;

  db.transaction(() => {
    // Sync into legacy content_posts table so Phase 1 Overview metrics stay 100% accurate
    if (!contentPostId) {
      contentPostId = crypto.randomUUID();
      const legacyStatus =
        initialStatus === 'draft'
          ? 'draft'
          : initialStatus === 'awaiting_approval'
          ? 'pending'
          : 'scheduled';
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
        title: 'Post Awaiting Approval',
        body: `"${params.title.trim()}" (${params.platformKey.toUpperCase()}) is queued for approval before automatic publishing at ${formatUtcInTimezone(scheduledUtcIso, resolvedTimezone)}.`,
      });
    }

    if (params.generatedContentId) {
      db.prepare(`UPDATE generated_content SET status = ?, content_post_id = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`).run(
        initialStatus === 'draft' ? 'draft' : 'scheduled',
        contentPostId,
        now,
        params.generatedContentId,
        params.workspaceId
      );
    }
  })();

  const created = db
    .prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
    )
    .get(queueId) as Record<string, unknown>;

  return {
    job: mapPublishingQueueRow(created),
    calendarItemId,
    approvalId,
  };
}

export function decideContentApproval(
  db: DbInstance,
  params: {
    workspaceId: string;
    approvalId: string;
    reviewerUserId: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    notes?: string;
  }
): { approval: ContentApprovalRecord; job: PublishingQueueRecord } {
  const approvalRow = db
    .prepare('SELECT * FROM content_approvals WHERE id = ? AND workspace_id = ?')
    .get(params.approvalId, params.workspaceId) as Record<string, unknown> | undefined;
  if (!approvalRow) {
    throw new Error('Approval request not found in this workspace.');
  }
  if (String(approvalRow.decision) !== 'pending') {
    throw new Error('This approval request has already been decided.');
  }

  const queueId = String(approvalRow.queue_id);
  const queueRow = db.prepare('SELECT * FROM publishing_queue WHERE id = ?').get(queueId) as Record<string, unknown> | undefined;
  if (!queueRow) {
    throw new Error('Associated publishing queue job not found.');
  }

  const now = new Date().toISOString();
  const nextQueueStatus: QueueJobStatus =
    params.decision === 'approved'
      ? new Date(String(queueRow.scheduled_at)).getTime() <= Date.now() + 60_000
        ? 'queued'
        : 'scheduled'
      : 'draft';

  db.transaction(() => {
    db.prepare(
      `UPDATE content_approvals
       SET reviewer_user_id = ?, decision = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(params.reviewerUserId, params.decision, (params.notes || '').trim(), now, params.approvalId);

    db.prepare(
      `UPDATE publishing_queue
       SET status = ?,
           approved_by_user_id = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_user_id END,
           approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
           updated_at = ?
       WHERE id = ?`
    ).run(nextQueueStatus, params.decision, params.reviewerUserId, params.decision, now, now, queueId);

    if (queueRow.calendar_item_id) {
      db.prepare('UPDATE content_calendar SET status = ?, updated_at = ? WHERE id = ?').run(
        nextQueueStatus,
        now,
        String(queueRow.calendar_item_id)
      );
    }
    if (queueRow.content_post_id) {
      db.prepare('UPDATE content_posts SET status = ?, updated_at = ? WHERE id = ?').run(
        params.decision === 'approved' ? 'scheduled' : 'draft',
        now,
        String(queueRow.content_post_id)
      );
    }

    createWorkspaceNotification(db, {
      workspaceId: params.workspaceId,
      userId: String(approvalRow.requested_by_user_id),
      title: params.decision === 'approved' ? 'Post Approved for Auto-Publishing' : 'Post Returned from Approval',
      body: `"${String(queueRow.title)}" was marked "${params.decision}". ${params.notes ? `Notes: ${params.notes}` : ''}`.trim(),
    });
  })();

  const updatedApproval = db
    .prepare(
      `SELECT ca.*, pq.title as queue_title, pq.platform_key, pq.scheduled_at, pq.body_text
       FROM content_approvals ca
       JOIN publishing_queue pq ON pq.id = ca.queue_id
       WHERE ca.id = ?`
    )
    .get(params.approvalId) as Record<string, unknown>;
  const updatedJob = db
    .prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
    )
    .get(queueId) as Record<string, unknown>;

  return {
    approval: mapApprovalRow(updatedApproval),
    job: mapPublishingQueueRow(updatedJob),
  };
}

function classifyPublishingError(err: unknown): {
  permanent: boolean;
  rateLimited: boolean;
  tokenExpired: boolean;
  httpStatus: number | null;
  errorCode: string;
  message: string;
  retryAfterMs?: number;
} {
  if (err instanceof ProviderApiError) {
    const status = err.status;
    const msg = err.message;
    const isRateLimit = status === 429 || /rate limit|too many requests/i.test(msg);
    const isTokenExpired = status === 401 || /token.*expired|invalid.*token|revoked/i.test(msg);
    const isPermanent = status === 400 || status === 403 || status === 404 || status === 422;
    return {
      permanent: isPermanent,
      rateLimited: isRateLimit,
      tokenExpired: isTokenExpired,
      httpStatus: status,
      errorCode: err.providerCode || `HTTP_${status}`,
      message: msg,
      retryAfterMs: isRateLimit ? 5 * 60 * 1000 : undefined,
    };
  }

  const msg = err instanceof Error ? err.message : String(err);
  const isRateLimit = /429|rate.?limit|too many requests/i.test(msg);
  const isTokenExpired = /401|token.*expired|revoked|reconnect/i.test(msg);
  const isPermanent =
    /does not support|character limit|requires an image|requires a video|blocked|permission|forbidden|not connected|no connected/i.test(
      msg
    );

  return {
    permanent: isPermanent,
    rateLimited: isRateLimit,
    tokenExpired: isTokenExpired,
    httpStatus: isRateLimit ? 429 : isTokenExpired ? 401 : isPermanent ? 400 : 500,
    errorCode: isRateLimit
      ? 'RATE_LIMITED'
      : isTokenExpired
      ? 'TOKEN_EXPIRED'
      : isPermanent
      ? 'VALIDATION_OR_PERMISSION_ERROR'
      : 'TRANSIENT_PUBLISH_ERROR',
    message: msg,
    retryAfterMs: isRateLimit ? 5 * 60 * 1000 : undefined,
  };
}

function computeExponentialBackoffMs(attemptNumber: number, baseMs = 30_000): number {
  const cappedExponent = Math.min(Math.max(attemptNumber - 1, 0), 6);
  return Math.min(baseMs * Math.pow(2, cappedExponent), 30 * 60 * 1000);
}

/**
 * Executes a single publishing queue job with strict durability, token refresh fallback,
 * permanent-error dead-letter handling, and recurrence spawning.
 * NEVER marks a post as published without real platform confirmation.
 */
export async function executePublishingQueueJob(
  db: DbInstance,
  queueId: string,
  options?: { workerId?: string; baseBackoffMs?: number }
): Promise<PublishingQueueRecord> {
  const workerId = options?.workerId || WORKER_INSTANCE_ID;
  const now = new Date();
  const nowIso = now.toISOString();
  const lockUntil = new Date(now.getTime() + 120_000).toISOString();

  // Atomic lock acquisition
  const claim = db
    .prepare(
      `UPDATE publishing_queue
       SET status = 'processing', locked_by = ?, locked_until = ?, updated_at = ?
       WHERE id = ?
         AND status IN ('scheduled', 'queued')
         AND is_dead_letter = 0
         AND (locked_until IS NULL OR locked_until < ?)`
    )
    .run(workerId, lockUntil, nowIso, queueId, nowIso);

  const loadJob = () =>
    mapPublishingQueueRow(
      db
        .prepare(
          `SELECT pq.*, sa.account_name, sa.account_handle
           FROM publishing_queue pq
           LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
           WHERE pq.id = ?`
        )
        .get(queueId) as Record<string, unknown>
    );

  if (claim.changes === 0) {
    return loadJob();
  }

  const job = loadJob();
  const attemptNumber = job.attemptCount + 1;
  const attemptId = crypto.randomUUID();

  db.prepare(
    `INSERT INTO publishing_attempts (
      id, queue_id, workspace_id, social_account_id, platform_key, attempt_number,
      worker_id, status, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'started', ?)`
  ).run(attemptId, job.id, job.workspaceId, job.socialAccountId, job.platformKey, attemptNumber, workerId, nowIso);

  const failAttempt = (params: {
    permanent: boolean;
    rateLimited: boolean;
    tokenExpired: boolean;
    httpStatus: number | null;
    errorCode: string;
    message: string;
    retryAfterMs?: number;
  }) => {
    const finishedAt = new Date().toISOString();
    const exhausted = attemptNumber >= job.maxAttempts;
    const shouldDeadLetter = params.permanent || exhausted;
    const retryDelayMs = shouldDeadLetter
      ? null
      : params.retryAfterMs ?? computeExponentialBackoffMs(attemptNumber, options?.baseBackoffMs ?? 30_000);
    const nextRunAt = retryDelayMs ? new Date(Date.now() + retryDelayMs).toISOString() : finishedAt;
    const nextQueueStatus: QueueJobStatus = shouldDeadLetter ? 'failed' : 'queued';
    const attemptStatus = params.tokenExpired
      ? 'token_expired'
      : params.rateLimited
      ? 'rate_limited'
      : shouldDeadLetter
      ? 'failed_permanent'
      : 'retrying';

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
        db.prepare('UPDATE content_calendar SET status = ?, updated_at = ? WHERE id = ?').run(
          nextQueueStatus,
          finishedAt,
          job.calendarItemId
        );
      }

      if (job.contentPostId && shouldDeadLetter) {
        db.prepare('UPDATE content_posts SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?').run(
          'failed',
          params.message,
          finishedAt,
          job.contentPostId
        );
      }

      if (shouldDeadLetter) {
        const jobRow = db.prepare('SELECT created_by_user_id FROM publishing_queue WHERE id = ?').get(job.id) as {
          created_by_user_id: string;
        };
        createWorkspaceNotification(db, {
          workspaceId: job.workspaceId,
          userId: jobRow.created_by_user_id,
          title: `Publishing Failed (${job.platformKey.toUpperCase()})`,
          body: `"${job.title}" could not be published: ${params.message}`,
        });
      }
    })();

    return loadJob();
  };

  try {
    // 1. Resolve connected social account & encrypted token
    const accountQuery = job.socialAccountId
      ? db
          .prepare(
            `SELECT sa.*, sp.key as platform_key, t.encrypted_access_token, t.encrypted_refresh_token, t.expires_at as token_expires_at
             FROM social_accounts sa
             JOIN social_platforms sp ON sp.id = sa.platform_id
             LEFT JOIN social_account_tokens t ON t.social_account_id = sa.id
             WHERE sa.id = ? AND sa.workspace_id = ?`
          )
          .get(job.socialAccountId, job.workspaceId)
      : db
          .prepare(
            `SELECT sa.*, sp.key as platform_key, t.encrypted_access_token, t.encrypted_refresh_token, t.expires_at as token_expires_at
             FROM social_accounts sa
             JOIN social_platforms sp ON sp.id = sa.platform_id
             LEFT JOIN social_account_tokens t ON t.social_account_id = sa.id
             WHERE sa.workspace_id = ? AND sp.key = ? AND sa.connection_status = 'connected'
             ORDER BY sa.created_at DESC LIMIT 1`
          )
          .get(job.workspaceId, job.platformKey);

    const acc = accountQuery as Record<string, unknown> | undefined;
    if (!acc || String(acc.connection_status) !== 'connected' || !acc.encrypted_access_token) {
      return failAttempt({
        permanent: true,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 400,
        errorCode: 'ACCOUNT_NOT_CONNECTED',
        message: `No active connected ${job.platformKey.toUpperCase()} account with a valid OAuth token was found. Connect or reconnect the account in Social Accounts before retrying.`,
      });
    }

    const accountId = String(acc.id);
    const capabilities = parseSocialAccountCapabilities(job.platformKey, String(acc.capabilities_json || ''));

    // 2. Validate content against official platform capabilities & limits
    const validation = validatePostForPlatform({
      platformKey: job.platformKey,
      formatKey: job.formatKey,
      title: job.title,
      bodyText: job.bodyText,
      hashtags: job.hashtags,
      mediaUrls: job.mediaUrls,
      accountCapabilities: capabilities,
    });
    if (!validation.valid) {
      return failAttempt({
        permanent: true,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 422,
        errorCode: 'CAPABILITY_OR_FORMAT_ERROR',
        message: validation.errors.join(' '),
      });
    }

    // 3. Check token expiry & attempt automatic OAuth refresh if expired
    let accessToken: string;
    const tokenExpiresAt = acc.token_expires_at ? new Date(String(acc.token_expires_at)).getTime() : null;
    if (tokenExpiresAt && tokenExpiresAt <= Date.now() + 60_000) {
      try {
        const refreshed = await refreshSocialAccountToken(
          db,
          job.workspaceId,
          accountId,
          'system-worker'
        );
        if (!refreshed.refreshed) {
          throw new Error(refreshed.message || 'OAuth token expired and could not be refreshed.');
        }
        const freshTokenRow = db
          .prepare('SELECT encrypted_access_token FROM social_account_tokens WHERE social_account_id = ?')
          .get(accountId) as { encrypted_access_token: string };
        accessToken = decryptSocialToken(freshTokenRow.encrypted_access_token);
      } catch (refreshErr) {
        const rMsg = refreshErr instanceof Error ? refreshErr.message : 'OAuth access token expired.';
        db.prepare(`UPDATE social_accounts SET connection_status = 'expired', last_error = ?, updated_at = ? WHERE id = ?`).run(
          rMsg,
          new Date().toISOString(),
          accountId
        );
        return failAttempt({
          permanent: true,
          rateLimited: false,
          tokenExpired: true,
          httpStatus: 401,
          errorCode: 'TOKEN_EXPIRED',
          message: `Access token expired and automatic refresh failed: ${rMsg}. Reconnect this account in Social Accounts.`,
        });
      }
    } else {
      accessToken = decryptSocialToken(String(acc.encrypted_access_token));
    }

    // 4. Execute REAL upstream publishing request
    const payload: PublishPayload = {
      format: job.formatKey,
      title: job.title,
      text: validation.assembledText,
      mediaUrls: job.mediaUrls,
      linkUrl: job.linkUrl ?? undefined,
    };

    const provider = getSocialProvider(job.platformKey);
    const externalAccountId = String(acc.external_account_id);
    const isSandboxAccount = isSandboxToken(accessToken) && isSandboxExternalAccountId(externalAccountId);

    const buildSandboxPermalink = (platformKey: PlatformKey, postId: string): string => {
      switch (platformKey) {
        case 'facebook':
          return `https://www.facebook.com/livingtech/posts/${postId}`;
        case 'instagram':
          return `https://www.instagram.com/p/${postId}/`;
        case 'tiktok':
          return `https://www.tiktok.com/@livingtech_tiktok/video/${postId}`;
        case 'linkedin':
          return `https://www.linkedin.com/feed/update/urn:li:share:${postId}/`;
        case 'youtube':
          return `https://www.youtube.com/watch?v=${postId}`;
        case 'x':
          return `https://x.com/livingtech_x/status/${postId}`;
        case 'pinterest':
          return `https://www.pinterest.com/pin/${postId}/`;
        case 'google_business':
          return `https://business.google.com/posts/l/${postId}`;
      }
    };

    const publishResult: PublishResult = publishExecutorOverride
      ? await publishExecutorOverride({
          platformKey: job.platformKey,
          accessToken,
          account: { externalAccountId, capabilities },
          payload,
        })
      : isSandboxAccount
      ? (() => {
          const externalPostId = `sandbox_${job.platformKey}_${crypto.randomBytes(6).toString('hex')}`;
          return {
            externalPostId,
            permalink: buildSandboxPermalink(job.platformKey, externalPostId),
            publishedAt: new Date().toISOString(),
            raw: {
              sandbox: true,
              platform: job.platformKey,
              format: job.formatKey,
              externalAccountId,
              title: job.title,
            },
          };
        })()
      : await provider.publishContent(
          accessToken,
          { externalAccountId, capabilities },
          payload
        );

    // STRICT INTEGRITY GATE: Never mark published unless platform returned a real post ID
    if (!publishResult || !publishResult.externalPostId || !publishResult.externalPostId.trim()) {
      return failAttempt({
        permanent: false,
        rateLimited: false,
        tokenExpired: false,
        httpStatus: 502,
        errorCode: 'MISSING_PLATFORM_CONFIRMATION',
        message: 'Platform API responded without a confirmed post ID. Post was NOT marked as published.',
      });
    }

    const publishedAt = publishResult.publishedAt || new Date().toISOString();
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

      const jobRow = db.prepare('SELECT created_by_user_id FROM publishing_queue WHERE id = ?').get(job.id) as {
        created_by_user_id: string;
      };
      createWorkspaceNotification(db, {
        workspaceId: job.workspaceId,
        userId: jobRow.created_by_user_id,
        title: `Published to ${provider.displayName}`,
        body: `"${job.title}" was automatically published (ID: ${publishResult.externalPostId}).`,
      });
    })();

    // 5. Spawn next occurrence if this job has a recurring schedule
    if (job.recurrenceType !== 'none') {
      const nextIso = computeNextRecurrenceIso(job.scheduledAt, job.timezone, job.recurrenceRule);
      if (nextIso) {
        const jobRow = db.prepare('SELECT created_by_user_id FROM publishing_queue WHERE id = ?').get(job.id) as {
          created_by_user_id: string;
        };
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
            idempotencyKey: `recur-${job.id.slice(0, 12)}-${nextIso}`,
          });
        } catch (recurErr) {
          logger.warn('Failed to enqueue next recurring occurrence', {
            queueId: job.id,
            error: recurErr instanceof Error ? recurErr.message : String(recurErr),
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

export async function processDuePublishingJobs(
  db: DbInstance,
  options?: { limit?: number; workerId?: string; baseBackoffMs?: number }
): Promise<{ processedCount: number; publishedCount: number; failedCount: number; results: PublishingQueueRecord[] }> {
  const nowIso = new Date().toISOString();
  lastWorkerTickAt = nowIso;
  const limit = options?.limit ?? 10;

  // Reclaim any crashed worker locks older than locked_until
  db.prepare(
    `UPDATE publishing_queue
     SET status = 'queued', locked_by = NULL, locked_until = NULL, updated_at = ?
     WHERE status = 'processing' AND locked_until IS NOT NULL AND locked_until < ?`
  ).run(nowIso, nowIso);

  const dueRows = db
    .prepare(
      `SELECT id FROM publishing_queue
       WHERE status IN ('scheduled', 'queued')
         AND is_dead_letter = 0
         AND next_run_at <= ?
         AND (locked_until IS NULL OR locked_until < ?)
       ORDER BY next_run_at ASC
       LIMIT ?`
    )
    .all(nowIso, nowIso, limit) as { id: string }[];

  const results: PublishingQueueRecord[] = [];
  for (const row of dueRows) {
    const res = await executePublishingQueueJob(db, row.id, {
      workerId: options?.workerId,
      baseBackoffMs: options?.baseBackoffMs,
    });
    results.push(res);
  }

  return {
    processedCount: results.length,
    publishedCount: results.filter((r) => r.status === 'published').length,
    failedCount: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

export function retryFailedQueueJob(
  db: DbInstance,
  workspaceId: string,
  queueId: string,
  rescheduleAtIso?: string
): PublishingQueueRecord {
  const row = db
    .prepare('SELECT * FROM publishing_queue WHERE id = ? AND workspace_id = ?')
    .get(queueId, workspaceId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Publishing queue job not found.');
  if (String(row.status) === 'published') throw new Error('Published posts cannot be re-queued.');

  const now = new Date().toISOString();
  const nextRun = rescheduleAtIso ? convertLocalDateTimeToUtcIso(rescheduleAtIso, String(row.timezone || 'UTC')) : now;

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

  const updated = db
    .prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
    )
    .get(queueId) as Record<string, unknown>;
  return mapPublishingQueueRow(updated);
}

export function cancelQueueJob(db: DbInstance, workspaceId: string, queueId: string): PublishingQueueRecord {
  const row = db
    .prepare('SELECT * FROM publishing_queue WHERE id = ? AND workspace_id = ?')
    .get(queueId, workspaceId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Publishing queue job not found.');
  if (String(row.status) === 'published') throw new Error('Published posts cannot be cancelled.');

  const now = new Date().toISOString();
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

  const updated = db
    .prepare(
      `SELECT pq.*, sa.account_name, sa.account_handle
       FROM publishing_queue pq
       LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
       WHERE pq.id = ?`
    )
    .get(queueId) as Record<string, unknown>;
  return mapPublishingQueueRow(updated);
}

export function getWorkerHealth(db: DbInstance, workspaceId?: string): WorkerHealthSummary {
  const where = workspaceId ? 'WHERE workspace_id = ?' : '';
  const args = workspaceId ? [workspaceId] : [];
  const rows = db
    .prepare(`SELECT status, COUNT(*) as c FROM publishing_queue ${where} GROUP BY status`)
    .all(...args) as { status: QueueJobStatus; c: number }[];

  const counts: Record<QueueJobStatus, number> = {
    draft: 0,
    scheduled: 0,
    queued: 0,
    processing: 0,
    published: 0,
    failed: 0,
    cancelled: 0,
    awaiting_approval: 0,
  };
  for (const r of rows) {
    if (r.status in counts) counts[r.status] = Number(r.c);
  }

  const dlqRow = db
    .prepare(`SELECT COUNT(*) as c FROM publishing_queue ${workspaceId ? 'WHERE workspace_id = ? AND is_dead_letter = 1' : 'WHERE is_dead_letter = 1'}`)
    .get(...args) as { c: number };

  return {
    workerId: WORKER_INSTANCE_ID,
    embeddedWorkerRunning: Boolean(embeddedWorkerTimer),
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
    queueBackend: env.REDIS_URL ? 'redis_bullmq_ready' : 'sqlite_durable_queue',
    redisConfigured: Boolean(env.REDIS_URL),
    lastTickAt: lastWorkerTickAt,
    counts,
    deadLetterCount: Number(dlqRow?.c || 0),
  };
}

export function startEmbeddedPublishingWorker(db: DbInstance): void {
  if (embeddedWorkerTimer || !env.ENABLE_EMBEDDED_WORKER) return;
  const interval = env.WORKER_POLL_INTERVAL_MS;
  logger.info('Starting durable background publishing worker', {
    workerId: WORKER_INSTANCE_ID,
    pollIntervalMs: interval,
    redisConfigured: Boolean(env.REDIS_URL),
  });

  embeddedWorkerTimer = setInterval(() => {
    processDuePublishingJobs(db, { workerId: WORKER_INSTANCE_ID }).catch((err) => {
      logger.error('Background publishing worker tick failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, interval);
  embeddedWorkerTimer.unref();
}

export function stopEmbeddedPublishingWorker(): void {
  if (embeddedWorkerTimer) {
    clearInterval(embeddedWorkerTimer);
    embeddedWorkerTimer = null;
  }
}
