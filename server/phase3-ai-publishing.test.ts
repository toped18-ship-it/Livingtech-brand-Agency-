import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase, type DbInstance } from './db/database';
import { setGeminiTestTransport } from './ai/geminiClient';
import {
  runBrandAnalysisModule,
  runPostWritingModule,
  runCommentReplyDraftingModule,
  runImageGenerationModule,
  saveRenderedGraphicToLibrary,
  setImageGenerationTestTransport,
} from './ai';
import {
  decideContentApproval,
  enqueuePublishingJob,
  executePublishingQueueJob,
  processDuePublishingJobs,
  retryFailedQueueJob,
  setPublishExecutorForTests,
} from './queue/publishingWorker';
import { evaluateContentSafety } from './services/contentSafetyService';
import { validatePostForPlatform } from './services/publishingValidationService';
import { encryptSocialToken } from './services/oauthService';
import { ProviderApiError } from './integrations/httpClient';
import { computeNextRecurrenceIso, convertLocalDateTimeToUtcIso } from '../src/utils/domain';

function setupWorkspaceFixture() {
  const db = initDatabase(':memory:');
  const ws = db.prepare('SELECT id, owner_user_id FROM workspaces LIMIT 1').get() as {
    id: string;
    owner_user_id: string;
  };
  assert.ok(ws?.id, 'Seeded workspace must exist');
  return { db, workspaceId: ws.id, userId: ws.owner_user_id };
}

function seedConnectedAccount(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: 'facebook' | 'instagram' | 'linkedin' | 'x';
    requireApproval?: boolean;
    dailyPostLimit?: number;
    appendDefaultHashtags?: boolean;
    defaultHashtags?: string[];
    tokenExpired?: boolean;
  }
) {
  const platform = db.prepare('SELECT id FROM social_platforms WHERE key = ?').get(params.platformKey) as {
    id: string;
  };
  assert.ok(platform?.id, `Platform ${params.platformKey} must exist`);
  const accountId = crypto.randomUUID();
  const now = new Date().toISOString();

  const capabilities =
    params.platformKey === 'instagram'
      ? {
          textPublishing: false,
          imagePublishing: true,
          videoPublishing: true,
          carouselPublishing: true,
          storyPublishing: true,
          reelsPublishing: true,
          shortFormVideoPublishing: true,
          commentRetrieval: true,
          commentResponses: true,
          analyticsRetrieval: true,
        }
      : {
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
        };

  const prefs = {
    autoPublishEnabled: !params.requireApproval,
    requireApprovalBeforePublish: Boolean(params.requireApproval),
    defaultTimezone: 'America/New_York',
    defaultVisibility: 'public',
    appendDefaultHashtags: Boolean(params.appendDefaultHashtags),
    defaultHashtags: params.defaultHashtags || [],
    dailyPostLimit: params.dailyPostLimit ?? 10,
  };

  db.prepare(
    `INSERT INTO social_accounts (
      id, workspace_id, platform_id, connected_by_user_id, external_account_id,
      account_handle, account_name, account_type, account_description, business_category,
      connection_status, permissions_status, capabilities_json, publishing_preferences_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'business_account', 'Official test account', 'SaaS', 'connected', 'granted', ?, ?, ?, ?)`
  ).run(
    accountId,
    params.workspaceId,
    platform.id,
    params.userId,
    `ext_${params.platformKey}_001`,
    `@livingtech_${params.platformKey}`,
    `LivingTech ${params.platformKey.toUpperCase()}`,
    JSON.stringify(capabilities),
    JSON.stringify(prefs),
    now,
    now
  );

  const expiresAt = params.tokenExpired
    ? new Date(Date.now() - 3600 * 1000).toISOString()
    : new Date(Date.now() + 7200 * 1000).toISOString();

  db.prepare(
    `INSERT INTO social_account_tokens (
      id, social_account_id, workspace_id, encrypted_access_token, encrypted_refresh_token,
      token_type, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, 'Bearer', ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    accountId,
    params.workspaceId,
    encryptSocialToken('test-oauth-access-token-secret'),
    expiresAt,
    now,
    now
  );

  return accountId;
}

// ============================================================================
// 1. AI Content Generation, Credit Deduction & Zero-Credit Failure Safety
// ============================================================================
test('Area 1: AI Content Studio generates structured post, deducts credits on success, and deducts 0 on failure', async () => {
  const { db, workspaceId, userId } = setupWorkspaceFixture();
  const initialCredits = (
    db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(workspaceId) as { ai_credits_balance: number }
  ).ai_credits_balance;

  setGeminiTestTransport(async () => ({
    text: JSON.stringify({
      headlineOptions: ['Enterprise Brand Consistency at Scale', 'Automate Social Publishing Safely'],
      title: 'Enterprise Brand Consistency at Scale',
      bodyText: 'Build consistent brand authority across channels with verified messaging and scheduled automation.',
      captionText: 'Build consistent brand authority across channels.',
      hashtags: ['#BrandManagement', '#EnterpriseSaaS'],
      callToAction: 'Schedule a brand audit today.',
      imagePrompt: 'Minimal deep blue executive SaaS graphic with crisp white typography.',
    }),
    usageMetadata: { promptTokenCount: 220, candidatesTokenCount: 110 },
  }));

  try {
    const res = await runPostWritingModule(db, {
      workspaceId,
      userId,
      platformKey: 'linkedin',
      contentType: 'educational',
      topic: 'Multi-tenant social media governance',
      objective: 'Brand Awareness',
      keywords: ['governance', 'brand consistency'],
      toneOfVoice: 'Executive',
      language: 'English',
    });

    assert.equal(res.content.platformKey, 'linkedin');
    assert.equal(res.content.safetyStatus, 'passed');
    assert.equal(res.creditsRemaining, initialCredits - 5);

    const usageCount = (
      db
        .prepare(`SELECT COUNT(*) as c FROM ai_generation_usage WHERE workspace_id = ? AND module_key = 'post_writing' AND status = 'completed'`)
        .get(workspaceId) as { c: number }
    ).c;
    assert.equal(usageCount, 1);

    // Simulate upstream failure -> 0 credits deducted
    setGeminiTestTransport(async () => {
      throw new Error('503 UNAVAILABLE high demand');
    });
    await assert.rejects(
      () =>
        runPostWritingModule(db, {
          workspaceId,
          userId,
          platformKey: 'linkedin',
          contentType: 'social_post',
          topic: 'Failure test',
          objective: 'Awareness',
          keywords: [],
        }),
      /UNAVAILABLE|busy|high demand/i
    );
    const creditsAfterFailure = (
      db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(workspaceId) as { ai_credits_balance: number }
    ).ai_credits_balance;
    assert.equal(creditsAfterFailure, initialCredits - 5, 'Credits must NOT be deducted on Gemini failure');
  } finally {
    setGeminiTestTransport(null);
    db.close();
  }
});

// ============================================================================
// 2. Brand Profile Analysis (Verified Facts vs. Assumptions + Docs)
// ============================================================================
test('Area 2: Brand Intelligence Analysis clearly distinguishes verified facts from assumptions', async () => {
  const { db, workspaceId, userId } = setupWorkspaceFixture();

  db.prepare(`UPDATE brand_profiles SET products_services = ?, brand_documents_json = ? WHERE workspace_id = ?`).run(
    'Enterprise SaaS Social Publishing Suite',
    JSON.stringify([
      {
        id: 'doc-1',
        name: '2026 Product Fact Sheet',
        category: 'product_catalog',
        summary: 'Supports 8 official OAuth social platforms with AES-256-GCM token vault.',
        uploadedAt: new Date().toISOString(),
      },
    ]),
    workspaceId
  );

  setGeminiTestTransport(async ({ contents }) => {
    assert.match(contents, /2026 Product Fact Sheet/);
    return {
      text: JSON.stringify({
        brandSummary: 'Enterprise multi-tenant social management agency platform.',
        verifiedFacts: [
          'Supports 8 official OAuth social platforms with AES-256-GCM token vault.',
          'Core offering: Enterprise SaaS Social Publishing Suite.',
        ],
        assumptions: [
          'Primary buyer persona likely prioritizes multi-client approval workflows.',
        ],
        audienceInsights: {
          primarySegments: [
            {
              name: 'Agency Operations Directors',
              painPoints: ['Fragmented publishing tools'],
              buyingTriggers: ['Audit trails and security'],
              preferredFormats: ['LinkedIn carousels'],
            },
          ],
          evidenceStatus: 'Derived from workspace brand profile; no live synced platform audience insights yet.',
        },
        contentThemes: [
          { theme: 'Security & OAuth Governance', rationale: 'Differentiates from legacy tools', priority: 'high' },
        ],
        voiceGuidelines: ['Use verified technical terms; never promise guaranteed follower counts.'],
      }),
      usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 180 },
    };
  });

  try {
    const res = await runBrandAnalysisModule(db, { workspaceId, userId });
    assert.ok(res.analysis.verifiedFacts.length >= 2);
    assert.ok(res.analysis.assumptions.length >= 1);
    assert.ok(res.analysis.brandSummary.length > 0);
  } finally {
    setGeminiTestTransport(null);
    db.close();
  }
});

// ============================================================================
// 3. Image Generation Integration (Honest Failure + Real Persistence + Compositor)
// ============================================================================
test('Area 3: Image Generation records honest failure when unconfigured and persists real PNGs on success/compositor', async () => {
  const { db, workspaceId, userId } = setupWorkspaceFixture();
  const initialCredits = (
    db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(workspaceId) as { ai_credits_balance: number }
  ).ai_credits_balance;

  const createdFiles: string[] = [];
  try {
    // Unconfigured live image service -> must honestly fail with 0 credit deduction
    setImageGenerationTestTransport(null);
    const failedRes = await runImageGenerationModule(db, {
      workspaceId,
      userId,
      graphicType: 'promotional_flyer',
      platformKey: 'instagram',
      aspectRatio: '1:1',
      prompt: 'Clean blue enterprise flyer',
    });
    assert.equal(failedRes.image.status, 'failed');
    assert.equal(failedRes.image.imageUrl, null);
    assert.equal(failedRes.creditsRemaining, initialCredits, '0 credits deducted when image service unavailable');

    // Configured live image transport -> succeeds and saves to media_library
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setImageGenerationTestTransport(async () => ({
      mimeType: 'image/png',
      base64Data: tinyPngBase64,
    }));
    const okRes = await runImageGenerationModule(db, {
      workspaceId,
      userId,
      graphicType: 'product_announcement',
      platformKey: 'linkedin',
      aspectRatio: '16:9',
      prompt: 'Product launch banner',
    });
    assert.equal(okRes.image.status, 'generated');
    assert.ok(okRes.image.imageUrl?.startsWith(`/generated/${workspaceId}/`));
    assert.ok(okRes.image.mediaAssetId);
    assert.equal(okRes.creditsRemaining, initialCredits - 8);
    if (okRes.image.imageUrl) {
      createdFiles.push(path.resolve(process.cwd(), 'public', okRes.image.imageUrl.replace(/^\/+/, '')));
    }

    // HTML5 Canvas compositor export -> saves PNG cleanly
    const compRes = saveRenderedGraphicToLibrary(db, {
      workspaceId,
      userId,
      graphicType: 'quote_graphic',
      platformKey: 'instagram',
      aspectRatio: '1:1',
      prompt: 'Executive Quote Card',
      sourceMode: 'compositor',
      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
      fileName: 'quote-card.png',
    });
    assert.equal(compRes.image.status, 'generated');
    assert.equal(compRes.image.sourceMode, 'compositor');
    assert.ok(compRes.mediaAssetId);
    if (compRes.image.imageUrl) {
      createdFiles.push(path.resolve(process.cwd(), 'public', compRes.image.imageUrl.replace(/^\/+/, '')));
    }
  } finally {
    setImageGenerationTestTransport(null);
    for (const f of createdFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // ignore cleanup error
      }
    }
    try {
      const wsDir = path.resolve(process.cwd(), 'public', 'generated', workspaceId);
      if (fs.existsSync(wsDir) && fs.readdirSync(wsDir).length === 0) fs.rmdirSync(wsDir);
    } catch {
      // ignore
    }
    db.close();
  }
});

// ============================================================================
// 4. Platform-Specific Formatting & Capability Validation
// ============================================================================
test('Area 4: Platform capability validation blocks Instagram text-only and X > 280 characters', () => {
  const igText = validatePostForPlatform({
    platformKey: 'instagram',
    formatKey: 'text',
    title: 'Text only',
    bodyText: 'This should fail on Instagram because IG requires image/video media.',
    hashtags: [],
    mediaUrls: [],
  });
  assert.equal(igText.valid, false);
  assert.ok(igText.errors.some((e) => /instagram|text/i.test(e)));

  const xLong = validatePostForPlatform({
    platformKey: 'x',
    formatKey: 'text',
    title: 'Long X post',
    bodyText: 'A'.repeat(295),
    hashtags: [],
    mediaUrls: [],
  });
  assert.equal(xLong.valid, false);
  assert.ok(xLong.errors.some((e) => /280/i.test(e)));

  const igImageOk = validatePostForPlatform({
    platformKey: 'instagram',
    formatKey: 'image',
    title: 'Valid IG',
    bodyText: 'Visual launch post!',
    hashtags: ['#Launch'],
    mediaUrls: ['/generated/sample.png'],
  });
  assert.equal(igImageOk.valid, true);
});

// ============================================================================
// 5 & 7. Calendar Scheduling, Rescheduling, Timezone & DST Conversion
// ============================================================================
test('Areas 5 & 7: Timezone DST conversion and recurring schedule preserve exact local wall-clock hour across DST', () => {
  // America/New_York: 2026-03-07 is EST (UTC-5); 2026-03-08 switches to EDT (UTC-4)
  const beforeDstUtc = convertLocalDateTimeToUtcIso('2026-03-07T09:00', 'America/New_York');
  assert.equal(beforeDstUtc, '2026-03-07T14:00:00.000Z');

  const afterDstUtc = convertLocalDateTimeToUtcIso('2026-03-09T09:00', 'America/New_York');
  assert.equal(afterDstUtc, '2026-03-09T13:00:00.000Z');

  // Daily recurrence crossing DST spring-forward keeps 09:00 New York time (14:00Z -> 13:00Z)
  const nextDailyUtc = computeNextRecurrenceIso(beforeDstUtc, 'America/New_York', { type: 'daily' });
  assert.equal(nextDailyUtc, '2026-03-08T13:00:00.000Z');
});

// ============================================================================
// 6, 8, 9, 10, 11. Automatic Publishing, Real Confirmation Gate, Retries, DLQ, Idempotency & Notifications
// ============================================================================
test('Areas 6, 8, 9, 10 & 11: Automatic publishing requires real platform confirmation, retries transient errors, dead-letters permanent errors, deduplicates idempotency keys, and sends notifications', async () => {
  const { db, workspaceId, userId } = setupWorkspaceFixture();
  const linkedinAccountId = seedConnectedAccount(db, {
    workspaceId,
    userId,
    platformKey: 'linkedin',
    requireApproval: false,
    appendDefaultHashtags: true,
    defaultHashtags: ['#LivingTech'],
  });

  try {
    const dueIso = new Date(Date.now() - 10_000).toISOString();

    // Area 6: Default mode is AUTOMATIC
    const enq1 = enqueuePublishingJob(db, {
      workspaceId,
      userId,
      platformKey: 'linkedin',
      socialAccountId: linkedinAccountId,
      formatKey: 'text',
      title: 'Auto Publish Launch',
      bodyText: 'Launching our automated background publishing engine today.',
      hashtags: ['#SaaS'],
      scheduledAtLocalOrIso: dueIso,
      timezone: 'UTC',
      idempotencyKey: 'idem-launch-001',
    });
    assert.equal(enq1.job.publishingMode, 'automatic');
    assert.equal(enq1.job.status, 'queued');
    assert.ok(enq1.job.hashtags.includes('#LivingTech'), 'Account default hashtags must be appended');

    // Area 9: Idempotency deduplication returns identical job without creating duplicate
    const enqDup = enqueuePublishingJob(db, {
      workspaceId,
      userId,
      platformKey: 'linkedin',
      socialAccountId: linkedinAccountId,
      formatKey: 'text',
      title: 'Auto Publish Launch',
      bodyText: 'Launching our automated background publishing engine today.',
      hashtags: ['#SaaS'],
      scheduledAtLocalOrIso: dueIso,
      timezone: 'UTC',
      idempotencyKey: 'idem-launch-001',
      skipDuplicateCheck: true,
    });
    assert.equal(enqDup.job.id, enq1.job.id);

    // Integrity Gate: Platform returns empty ID -> MUST NOT mark published
    setPublishExecutorForTests(async () => ({
      externalPostId: '',
      publishedAt: new Date().toISOString(),
    }));
    const noConfirmRes = await executePublishingQueueJob(db, enq1.job.id, { baseBackoffMs: 10 });
    assert.notEqual(noConfirmRes.status, 'published');
    assert.equal(noConfirmRes.status, 'queued');
    assert.equal(noConfirmRes.attemptCount, 1);

    // Area 8: Transient 503 error triggers retry with exponential backoff (not dead-lettered yet)
    setPublishExecutorForTests(async () => {
      throw new ProviderApiError({
        platform: 'linkedin',
        status: 503,
        message: 'Upstream temporary outage',
        providerCode: 'SERVICE_UNAVAILABLE',
      });
    });
    const transientRes = await executePublishingQueueJob(db, enq1.job.id, { baseBackoffMs: 10 });
    assert.equal(transientRes.status, 'queued');
    assert.equal(transientRes.isDeadLetter, false);
    assert.equal(transientRes.attemptCount, 2);

    // Real confirmation succeeds via processDuePublishingJobs
    db.prepare('UPDATE publishing_queue SET next_run_at = ? WHERE id = ?').run(dueIso, enq1.job.id);
    setPublishExecutorForTests(async () => ({
      externalPostId: 'urn:li:share:987654321',
      permalink: 'https://www.linkedin.com/feed/update/urn:li:share:987654321',
      publishedAt: new Date().toISOString(),
    }));
    const tick = await processDuePublishingJobs(db);
    assert.equal(tick.publishedCount, 1);
    assert.equal(tick.results[0].status, 'published');
    assert.equal(tick.results[0].platformPostId, 'urn:li:share:987654321');

    // Area 11: Notification created on publish success
    const pubNotif = db
      .prepare(`SELECT title, body FROM notifications WHERE workspace_id = ? AND title LIKE 'Published to%'`)
      .get(workspaceId) as { title: string; body: string } | undefined;
    assert.ok(pubNotif, 'Publish success notification must be created');

    // Area 10: Permanent 403 error moves immediately to Dead-Letter Queue without wasteful retries, then recovers via retryFailedQueueJob
    const enqPerm = enqueuePublishingJob(db, {
      workspaceId,
      userId,
      platformKey: 'linkedin',
      socialAccountId: linkedinAccountId,
      formatKey: 'text',
      title: 'Permission Failure Test',
      bodyText: 'Testing permanent error dead-letter recovery workflow.',
      scheduledAtLocalOrIso: dueIso,
      timezone: 'UTC',
    });
    setPublishExecutorForTests(async () => {
      throw new ProviderApiError({
        platform: 'linkedin',
        status: 403,
        message: 'Missing w_member_social permission',
        providerCode: 'FORBIDDEN',
      });
    });
    const permRes = await executePublishingQueueJob(db, enqPerm.job.id);
    assert.equal(permRes.status, 'failed');
    assert.equal(permRes.isDeadLetter, true);
    assert.equal(permRes.lastErrorPermanent, true);
    assert.equal(permRes.attemptCount, 1);

    const recovered = retryFailedQueueJob(db, workspaceId, enqPerm.job.id);
    assert.equal(recovered.status, 'queued');
    assert.equal(recovered.isDeadLetter, false);
    assert.equal(recovered.attemptCount, 0);
  } finally {
    setPublishExecutorForTests(null);
    db.close();
  }
});

// ============================================================================
// 12 & 13. Approval Mode, Account Settings, Content Safety & Engagement Escalation
// ============================================================================
test('Areas 12 & 13: Account approval mode holds posts until approved, Content Safety blocks banned/misleading claims, and sensitive comments escalate', async () => {
  const { db, workspaceId, userId } = setupWorkspaceFixture();
  const fbApprovalAccountId = seedConnectedAccount(db, {
    workspaceId,
    userId,
    platformKey: 'facebook',
    requireApproval: true,
    dailyPostLimit: 2,
  });

  // Configure workspace banned words
  db.prepare(`UPDATE brand_profiles SET banned_words_json = ? WHERE workspace_id = ?`).run(
    JSON.stringify(['scamcoin', 'overnight riches']),
    workspaceId
  );

  // Content safety blocks banned word & misleading guaranteed growth claim
  const bannedCheck = evaluateContentSafety(db, {
    workspaceId,
    platformKey: 'facebook',
    bodyText: 'Try scamcoin for guaranteed viral 100k followers overnight!',
    hashtags: [],
  });
  assert.equal(bannedCheck.status, 'blocked');
  assert.ok(bannedCheck.issues.some((i) => i.code === 'BANNED_WORD'));
  assert.ok(bannedCheck.issues.some((i) => i.code === 'MISLEADING_CLAIM'));

  try {
    const dueIso = new Date(Date.now() - 5_000).toISOString();
    const held = enqueuePublishingJob(db, {
      workspaceId,
      userId,
      platformKey: 'facebook',
      socialAccountId: fbApprovalAccountId,
      formatKey: 'text',
      title: 'Approval Gated Announcement',
      bodyText: 'Our Q4 product architecture roadmap is now available for enterprise customers.',
      scheduledAtLocalOrIso: dueIso,
      timezone: 'UTC',
    });

    assert.equal(held.job.publishingMode, 'approval_required');
    assert.equal(held.job.status, 'awaiting_approval');
    assert.ok(held.approvalId, 'Approval record must be created');

    // Background worker MUST NOT execute posts awaiting approval
    setPublishExecutorForTests(async () => ({
      externalPostId: 'fb_post_555',
      publishedAt: new Date().toISOString(),
    }));
    const tickBefore = await processDuePublishingJobs(db);
    assert.equal(tickBefore.processedCount, 0);

    // Approve -> releases into queue -> worker publishes
    const decision = decideContentApproval(db, {
      workspaceId,
      approvalId: held.approvalId!,
      reviewerUserId: userId,
      decision: 'approved',
      notes: 'Verified brand alignment.',
    });
    assert.equal(decision.job.status, 'queued');

    const tickAfter = await processDuePublishingJobs(db);
    assert.equal(tickAfter.publishedCount, 1);
    assert.equal(tickAfter.results[0].platformPostId, 'fb_post_555');

    // Engagement escalation heuristic on sensitive legal/refund complaint
    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO engagement_messages (
        id, workspace_id, platform_key, message_type, author_name, author_handle, content,
        sentiment, requires_escalation, status, is_demo, created_at, updated_at
      ) VALUES (?, ?, 'facebook', 'comment', 'Jordan Lee', '@jordan', 'I demand a refund immediately or I will contact my lawyer about this fraud!', 'urgent', 0, 'open', 0, ?, ?)`
    ).run(msgId, workspaceId, now, now);

    setGeminiTestTransport(async () => ({
      text: JSON.stringify({
        suggestedReply: 'We take your billing concern seriously. Please DM your account email so our senior support team can investigate right away.',
        tone: 'Empathetic & Professional',
        confidenceNote: 'Requires human review due to refund and legal mention.',
        escalationRecommended: true,
        escalationReason: 'Customer mentioned refund demand and potential legal escalation.',
      }),
      usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 80 },
    }));

    const replyDraft = await runCommentReplyDraftingModule(db, {
      workspaceId,
      userId,
      engagementMessageId: msgId,
      platformKey: 'facebook',
      authorName: 'Jordan Lee',
      messageContent: 'I demand a refund immediately or I will contact my lawyer about this fraud!',
    });
    assert.equal(replyDraft.suggestion.escalationRecommended, true);
    const updatedMsg = db.prepare('SELECT requires_escalation, status FROM engagement_messages WHERE id = ?').get(msgId) as {
      requires_escalation: number;
      status: string;
    };
    assert.equal(updatedMsg.requires_escalation, 1);
    assert.equal(updatedMsg.status, 'escalated');
  } finally {
    setGeminiTestTransport(null);
    setPublishExecutorForTests(null);
    db.close();
  }
});
