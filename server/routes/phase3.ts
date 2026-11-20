import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { DbInstance } from '../db/database';
import { assertWorkspaceAccess, getUserBySessionToken, recordAuditLog } from '../services/authService';
import { createWorkspaceFeatureGuard } from '../services/entitlementMiddleware';
import type { FeatureKey } from '../../src/utils/planEntitlements';
import {
  getImageGenerationCapabilities,
  listBrandAnalyses,
  listContentStrategies,
  listGeneratedContent,
  listGeneratedImages,
  loadWorkspaceBrandProfile,
  mapGeneratedContentRow,
  mapReplySuggestionRow,
  runAudienceAnalysisModule,
  runBrandAnalysisModule,
  runCalendarGenerationModule,
  runCaptionWritingModule,
  runCommentReplyDraftingModule,
  runContentRepurposingModule,
  runContentStrategyModule,
  runGraphicDesignAssistanceModule,
  runHashtagRecommendationsModule,
  runImageGenerationModule,
  runKeywordResearchModule,
  runPerformanceRecommendationsModule,
  runPostWritingModule,
  runVideoScriptingModule,
  saveRenderedGraphicToLibrary,
} from '../ai';
import { evaluateContentSafety } from '../services/contentSafetyService';
import {
  cancelQueueJob,
  decideContentApproval,
  enqueuePublishingJob,
  executePublishingQueueJob,
  getWorkerHealth,
  mapApprovalRow,
  mapPublishingAttemptRow,
  mapPublishingQueueRow,
  processDuePublishingJobs,
  retryFailedQueueJob,
} from '../queue/publishingWorker';
import { convertLocalDateTimeToUtcIso, normalizeHashtags, parseKeywordsInput } from '../../src/utils/domain';
import type {
  BrandDocumentItem,
  ContentCalendarItemRecord,
  ContentCampaignRecord,
  EngagementMessageRecord,
  PlatformKey,
  PublishingFormatKey,
  QueueJobStatus,
  RecurrenceType,
  UserProfile,
} from '../../src/shared/api-contracts';
import { logger } from '../env';

const PlatformKeySchema = z.enum([
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'x',
  'pinterest',
  'google_business',
]);

const FormatKeySchema = z.enum(['text', 'image', 'video', 'carousel', 'story', 'reels', 'short_form_video']);

const ContentTypeSchema = z.enum([
  'social_post',
  'caption',
  'promotional',
  'educational',
  'storytelling',
  'engagement_post',
  'product_showcase',
  'announcement',
  'business_tip',
  'campaign_content',
  'image_prompt',
  'flyer_graphic',
  'video_script',
  'short_form_concept',
]);

const GraphicTypeSchema = z.enum([
  'promotional_flyer',
  'product_announcement',
  'event_banner',
  'quote_graphic',
  'carousel_slide',
  'business_promo',
  'sale_announcement',
  'educational_infographic',
]);

const RecurrenceRuleSchema = z.object({
  type: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom']).default('none'),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  customDates: z.array(z.string()).optional(),
  endDate: z.string().nullable().optional(),
  maxOccurrences: z.number().int().min(1).max(100).optional(),
});

interface AuthedRequest extends Request {
  user?: UserProfile;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.lt_session;
  return cookieToken || null;
}

function handleError(res: Response, err: unknown, status = 400) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message || 'Invalid input parameters.',
      details: err.flatten().fieldErrors,
    });
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  logger.warn('Phase 3 API error', { message });
  return res.status(status).json({ error: message });
}

function mapCampaignRow(r: Record<string, unknown>): ContentCampaignRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    name: String(r.name),
    objective: String(r.objective || ''),
    description: String(r.description || ''),
    colorHex: String(r.color_hex || '#0052FF'),
    platforms: JSON.parse(String(r.platforms_json || '[]')),
    status: String(r.status) as ContentCampaignRecord['status'],
    startDate: r.start_date ? String(r.start_date) : null,
    endDate: r.end_date ? String(r.end_date) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapCalendarRow(r: Record<string, unknown>): ContentCalendarItemRecord {
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
    platformKey: String(r.platform_key) as PlatformKey,
    title: String(r.title),
    bodyText: String(r.body_text),
    hashtags: JSON.parse(String(r.hashtags_json || '[]')),
    mediaUrls: JSON.parse(String(r.media_urls_json || '[]')),
    formatKey: String(r.format_key || 'text') as PublishingFormatKey,
    scheduledAt: String(r.scheduled_at),
    timezone: String(r.timezone || 'UTC'),
    recurrenceType: String(r.recurrence_type || 'none') as RecurrenceType,
    recurrenceRule: JSON.parse(String(r.recurrence_rule_json || '{"type":"none"}')),
    status: String(r.status) as QueueJobStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export function createPhase3Router(db: DbInstance): Router {
  const router = Router();

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const user = getUserBySessionToken(db, token);
    if (!user) {
      const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
      const secure = req.secure || forwardedProto === 'https' || process.env.NODE_ENV === 'production';
      res.clearCookie('lt_session', {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        path: '/',
      });
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    req.user = user;
    next();
  };

  const requireWorkspaceMember = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const wid = String(req.params.wid || '');
    if (!req.user || !wid || !assertWorkspaceAccess(db, req.user.id, wid, req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this workspace.' });
    }
    next();
  };

  const requireFeature = (feature: FeatureKey) => createWorkspaceFeatureGuard(db, feature);

  // Strict subscription package enforcement across Phase 3 endpoints
  router.use('/workspaces/:wid/ai/brand-analysis', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/ai/audience-analysis', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/ai/strategies', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/ai/strategy-v3', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));
  router.use('/workspaces/:wid/ai/performance-recommendations', requireAuth, requireWorkspaceMember, requireFeature('ai_strategy'));

  router.use('/workspaces/:wid/ai/generated-content', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/studio-generate', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/caption', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/hashtags', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/keywords', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/ai/repurpose', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));
  router.use('/workspaces/:wid/safety/check', requireAuth, requireWorkspaceMember, requireFeature('ai_studio'));

  router.use('/workspaces/:wid/ai/graphic-capabilities', requireAuth, requireWorkspaceMember, requireFeature('graphic_designer'));
  router.use('/workspaces/:wid/ai/graphics', requireAuth, requireWorkspaceMember, requireFeature('graphic_designer'));
  router.use('/workspaces/:wid/ai/graphic-direction', requireAuth, requireWorkspaceMember, requireFeature('graphic_designer'));
  router.use('/workspaces/:wid/ai/generate-image', requireAuth, requireWorkspaceMember, requireFeature('graphic_designer'));

  router.use('/workspaces/:wid/ai/calendar-plan', requireAuth, requireWorkspaceMember, requireFeature('calendar'));
  router.use('/workspaces/:wid/campaigns', requireAuth, requireWorkspaceMember, requireFeature('calendar'));
  router.use('/workspaces/:wid/calendar', requireAuth, requireWorkspaceMember, requireFeature('calendar'));

  // Calendar scheduling (POST /publishing-queue) is available from Basic+; Auto Publisher queue management requires Pro+
  router.use('/workspaces/:wid/publishing-queue', requireAuth, requireWorkspaceMember, (req, res, next) => {
    const required: FeatureKey = req.method === 'POST' && (req.path === '/' || req.path === '') ? 'calendar' : 'auto_publisher';
    return requireFeature(required)(req, res, next);
  });
  router.use('/workspaces/:wid/publishing-history', requireAuth, requireWorkspaceMember, requireFeature('publishing_history'));
  router.use('/workspaces/:wid/approvals', requireAuth, requireWorkspaceMember, requireFeature('publishing_history'));
  router.use('/workspaces/:wid/engagement-messages', requireAuth, requireWorkspaceMember, requireFeature('engagement'));

  // ===========================================================================
  // 1. BRAND INTELLIGENCE PROFILE, DOCUMENTS & SAFETY POLICIES
  // ===========================================================================
  router.get('/workspaces/:wid/brand-intelligence', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const profile = loadWorkspaceBrandProfile(db, wid);
      const analyses = listBrandAnalyses(db, wid);
      return res.json({ profile, analyses });
    } catch (err) {
      return handleError(res, err);
    }
  });

  router.patch('/workspaces/:wid/brand-intelligence', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          brandName: z.string().min(1).max(120).optional(),
          logoUrl: z.string().max(512).optional(),
          primaryColor: z.string().max(16).optional(),
          secondaryColor: z.string().max(16).optional(),
          accentColor: z.string().max(16).optional(),
          businessDescription: z.string().max(3000).optional(),
          industry: z.string().max(120).optional(),
          productsServices: z.string().max(3000).optional(),
          targetAudience: z.string().max(1500).optional(),
          businessGoals: z.string().max(1500).optional(),
          toneOfVoice: z.string().max(240).optional(),
          preferredLanguage: z.string().max(24).optional(),
          timezone: z.string().max(64).optional(),
          bannedWords: z.array(z.string().max(64)).max(100).optional(),
          brandToneRules: z.string().max(2000).optional(),
          maxPostsPerDay: z.number().int().min(1).max(100).optional(),
          autoReplyEnabled: z.boolean().optional(),
        })
        .parse(req.body);

      const current = loadWorkspaceBrandProfile(db, wid);
      const now = new Date().toISOString();
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
        (body.autoReplyEnabled ?? current.autoReplyEnabled) ? 1 : 0,
        now,
        wid
      );

      recordAuditLog(db, {
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        workspaceId: wid,
        action: 'brand.intelligence.updated',
        resourceType: 'brand_profile',
        resourceId: wid,
      });

      return res.json({ profile: loadWorkspaceBrandProfile(db, wid) });
    } catch (err) {
      return handleError(res, err);
    }
  });

  router.post('/workspaces/:wid/brand-intelligence/documents', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          name: z.string().min(1).max(160),
          category: z.enum(['brand_guide', 'product_catalog', 'marketing_material', 'logo', 'product_image', 'other']),
          summary: z.string().min(3).max(4000),
          url: z.string().max(1024).optional(),
        })
        .parse(req.body);

      const current = loadWorkspaceBrandProfile(db, wid);
      const doc: BrandDocumentItem = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        category: body.category,
        summary: body.summary.trim(),
        url: body.url?.trim() || undefined,
        uploadedAt: new Date().toISOString(),
      };
      const nextDocs = [doc, ...current.brandDocuments].slice(0, 30);
      db.prepare('UPDATE brand_profiles SET brand_documents_json = ?, updated_at = ? WHERE workspace_id = ?').run(
        JSON.stringify(nextDocs),
        new Date().toISOString(),
        wid
      );

      return res.status(201).json({ document: doc, brandDocuments: nextDocs });
    } catch (err) {
      return handleError(res, err);
    }
  });

  router.delete('/workspaces/:wid/brand-intelligence/documents/:docId', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const docId = String(req.params.docId);
      const current = loadWorkspaceBrandProfile(db, wid);
      const nextDocs = current.brandDocuments.filter((d) => d.id !== docId);
      db.prepare('UPDATE brand_profiles SET brand_documents_json = ?, updated_at = ? WHERE workspace_id = ?').run(
        JSON.stringify(nextDocs),
        new Date().toISOString(),
        wid
      );
      return res.json({ brandDocuments: nextDocs });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // ===========================================================================
  // 2. ALL 14 INDEPENDENT AI ENGINE ENDPOINTS
  // ===========================================================================
  // Module 1: Brand Analysis
  router.post('/workspaces/:wid/ai/brand-analysis', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z.object({ additionalNotes: z.string().max(2000).optional() }).parse(req.body || {});
      const result = await runBrandAnalysisModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        additionalNotes: body.additionalNotes,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 2: Audience Analysis
  router.post('/workspaces/:wid/ai/audience-analysis', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z.object({ focusMarket: z.string().max(300).optional() }).parse(req.body || {});
      const result = await runAudienceAnalysisModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        focusMarket: body.focusMarket,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 3: Content Strategy
  router.get('/workspaces/:wid/ai/strategies', requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ strategies: listContentStrategies(db, String(req.params.wid)) });
  });

  router.post('/workspaces/:wid/ai/strategy-v3', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          title: z.string().max(180).optional(),
          goals: z.string().min(5).max(1500),
          platforms: z.array(PlatformKeySchema).min(1),
        })
        .parse(req.body);
      const result = await runContentStrategyModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        title: body.title,
        goals: body.goals,
        platforms: body.platforms,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 4: Evidence-Based Calendar Plan Generation
  router.post('/workspaces/:wid/ai/calendar-plan', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          platforms: z.array(PlatformKeySchema).min(1),
          daysCount: z.number().int().min(3).max(14).default(7),
          campaignObjective: z.string().min(3).max(500),
          preferredPostingWindow: z.string().max(120).optional(),
          timezone: z.string().max(64).default('UTC'),
        })
        .parse(req.body);
      const result = await runCalendarGenerationModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 5: Full Studio Post Writing + Generated Content Library
  router.get('/workspaces/:wid/ai/generated-content', requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ items: listGeneratedContent(db, String(req.params.wid)) });
  });

  router.post('/workspaces/:wid/ai/studio-generate', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          socialAccountId: z.string().nullable().optional(),
          campaignId: z.string().nullable().optional(),
          contentType: ContentTypeSchema.default('social_post'),
          topic: z.string().min(3).max(1500),
          keywords: z.union([z.string(), z.array(z.string())]).optional(),
          objective: z.string().min(2).max(200).default('Brand Awareness & Engagement'),
          targetAudience: z.string().max(400).optional(),
          toneOfVoice: z.string().max(200).optional(),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);

      const keywords = Array.isArray(body.keywords)
        ? body.keywords
        : typeof body.keywords === 'string'
        ? parseKeywordsInput(body.keywords)
        : [];

      const result = await runPostWritingModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        platformKey: body.platformKey,
        socialAccountId: body.socialAccountId ?? null,
        campaignId: body.campaignId ?? null,
        contentType: body.contentType,
        topic: body.topic,
        keywords,
        objective: body.objective,
        targetAudience: body.targetAudience,
        toneOfVoice: body.toneOfVoice,
        language: body.language,
      });
      return res.status(201).json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.patch('/workspaces/:wid/ai/generated-content/:id', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const id = String(req.params.id);
      const existing = db
        .prepare('SELECT * FROM generated_content WHERE id = ? AND workspace_id = ?')
        .get(id, wid) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: 'Generated content item not found.' });

      const body = z
        .object({
          title: z.string().min(1).max(240).optional(),
          bodyText: z.string().min(1).max(10000).optional(),
          captionText: z.string().max(10000).optional(),
          hashtags: z.array(z.string()).optional(),
          callToAction: z.string().max(400).optional(),
          imagePrompt: z.string().max(2000).optional(),
          platformKey: PlatformKeySchema.optional(),
        })
        .parse(req.body);

      const nextPlatform = (body.platformKey ?? String(existing.platform_key)) as PlatformKey;
      const nextBody = body.bodyText ?? String(existing.body_text);
      const nextTags = body.hashtags ? normalizeHashtags(body.hashtags) : JSON.parse(String(existing.hashtags_json || '[]'));

      const safety = evaluateContentSafety(db, {
        workspaceId: wid,
        platformKey: nextPlatform,
        title: body.title ?? String(existing.title),
        bodyText: nextBody,
        hashtags: nextTags,
        checkDuplicate: false,
      });

      const now = new Date().toISOString();
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

      const updated = db.prepare('SELECT * FROM generated_content WHERE id = ?').get(id) as Record<string, unknown>;
      return res.json({ content: mapGeneratedContentRow(updated), safety });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 6: Caption Writing
  router.post('/workspaces/:wid/ai/caption', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          subject: z.string().min(3).max(800),
          visualDescription: z.string().max(800).optional(),
          toneOfVoice: z.string().max(160).optional(),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);
      const result = await runCaptionWritingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 7: Hashtag Recommendations
  router.post('/workspaces/:wid/ai/hashtags', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          topic: z.string().min(2).max(500),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);
      const result = await runHashtagRecommendationsModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 8: Keyword Research Assistance
  router.post('/workspaces/:wid/ai/keywords', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          seedTopic: z.string().min(2).max(500),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);
      const result = await runKeywordResearchModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 9 & 10: Graphic Designer (Art Direction, Live Image Service, & Canvas Compositor Save)
  router.get('/workspaces/:wid/ai/graphic-capabilities', requireAuth, requireWorkspaceMember, (_req, res) => {
    return res.json(getImageGenerationCapabilities());
  });

  router.get('/workspaces/:wid/ai/graphics', requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({
      graphics: listGeneratedImages(db, String(req.params.wid)),
      capabilities: getImageGenerationCapabilities(),
    });
  });

  router.post('/workspaces/:wid/ai/graphic-direction', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          graphicType: GraphicTypeSchema,
          platformKey: PlatformKeySchema,
          aspectRatio: z.string().min(2).max(16).default('1:1'),
          brief: z.string().min(3).max(1500),
          includeLogo: z.boolean().optional(),
        })
        .parse(req.body);
      const result = await runGraphicDesignAssistanceModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/ai/generate-image', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          graphicType: GraphicTypeSchema,
          platformKey: PlatformKeySchema,
          aspectRatio: z.string().min(2).max(16).default('1:1'),
          prompt: z.string().min(5).max(2000),
          artDirection: z.record(z.string(), z.unknown()).optional(),
          captionText: z.string().max(3000).optional(),
          generatedContentId: z.string().nullable().optional(),
        })
        .parse(req.body);

      const result = await runImageGenerationModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        graphicType: body.graphicType,
        platformKey: body.platformKey,
        aspectRatio: body.aspectRatio,
        prompt: body.prompt,
        artDirection: body.artDirection as Record<string, never>,
        captionText: body.captionText,
        generatedContentId: body.generatedContentId ?? null,
      });
      // Return 200 with honest status ('generated' or 'failed') so UI displays exact service state
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/ai/graphics/save-rendered', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          graphicType: GraphicTypeSchema,
          platformKey: PlatformKeySchema,
          aspectRatio: z.string().min(2).max(16).default('1:1'),
          prompt: z.string().max(2000).default('Branded social graphic'),
          artDirection: z.record(z.string(), z.unknown()).optional(),
          captionText: z.string().max(3000).optional(),
          sourceMode: z.enum(['compositor', 'uploaded']).default('compositor'),
          dataUrl: z.string().min(30),
          fileName: z.string().max(120).optional(),
        })
        .parse(req.body);

      const saved = saveRenderedGraphicToLibrary(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        graphicType: body.graphicType,
        platformKey: body.platformKey,
        aspectRatio: body.aspectRatio,
        prompt: body.prompt,
        artDirection: body.artDirection as Record<string, never>,
        captionText: body.captionText,
        sourceMode: body.sourceMode,
        dataUrl: body.dataUrl,
        fileName: body.fileName,
      });
      return res.status(201).json(saved);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 11: Video Scripting
  router.post('/workspaces/:wid/ai/video-script', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          topic: z.string().min(3).max(1200),
          formatStyle: z.enum(['short_form_reel', 'product_demo', 'explainer', 'founder_story', 'youtube_video']).default('short_form_reel'),
          targetDurationSeconds: z.number().int().min(10).max(600).default(45),
          toneOfVoice: z.string().max(160).optional(),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);
      const result = await runVideoScriptingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 12: Multi-Platform Content Repurposing
  router.post('/workspaces/:wid/ai/repurpose', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          sourceIdeaOrCopy: z.string().min(10).max(5000),
          targetPlatforms: z.array(PlatformKeySchema).min(2).max(8),
          toneOfVoice: z.string().max(160).optional(),
          language: z.string().max(32).optional(),
        })
        .parse(req.body);
      const result = await runContentRepurposingModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
        ...body,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // Module 13: Performance Recommendations
  router.post('/workspaces/:wid/ai/performance-recommendations', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const result = await runPerformanceRecommendationsModule(db, {
        workspaceId: String(req.params.wid),
        userId: req.user!.id,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // AI Module Usage Ledger
  router.get('/workspaces/:wid/ai/usage-ledger', requireAuth, requireWorkspaceMember, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM ai_generation_usage WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(String(req.params.wid)) as Record<string, unknown>[];
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
        createdAt: String(r.created_at),
      })),
    });
  });

  // ===========================================================================
  // 3. CONTENT SAFETY PRE-CHECK & CAMPAIGNS
  // ===========================================================================
  router.post('/workspaces/:wid/safety/check', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          socialAccountId: z.string().nullable().optional(),
          title: z.string().optional(),
          bodyText: z.string(),
          hashtags: z.array(z.string()).optional(),
          scheduledAt: z.string().nullable().optional(),
        })
        .parse(req.body);
      const result = evaluateContentSafety(db, {
        workspaceId: String(req.params.wid),
        socialAccountId: body.socialAccountId ?? null,
        platformKey: body.platformKey,
        title: body.title,
        bodyText: body.bodyText,
        hashtags: body.hashtags,
        scheduledAt: body.scheduledAt ?? null,
        checkDuplicate: true,
        checkFrequencyLimit: Boolean(body.scheduledAt),
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err);
    }
  });

  router.get('/workspaces/:wid/campaigns', requireAuth, requireWorkspaceMember, (req, res) => {
    const rows = db
      .prepare('SELECT * FROM content_campaigns WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(String(req.params.wid)) as Record<string, unknown>[];
    return res.json({ campaigns: rows.map(mapCampaignRow) });
  });

  router.post('/workspaces/:wid/campaigns', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          name: z.string().min(2).max(140),
          objective: z.string().max(500).default(''),
          description: z.string().max(1500).default(''),
          colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#0052FF'),
          platforms: z.array(PlatformKeySchema).default([]),
          startDate: z.string().nullable().optional(),
          endDate: z.string().nullable().optional(),
        })
        .parse(req.body);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO content_campaigns (
          id, workspace_id, created_by_user_id, name, objective, description, color_hex,
          platforms_json, status, start_date, end_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
      ).run(
        id,
        wid,
        req.user!.id,
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
      const row = db.prepare('SELECT * FROM content_campaigns WHERE id = ?').get(id) as Record<string, unknown>;
      return res.status(201).json({ campaign: mapCampaignRow(row) });
    } catch (err) {
      return handleError(res, err);
    }
  });

  router.delete('/workspaces/:wid/campaigns/:campaignId', requireAuth, requireWorkspaceMember, (req, res) => {
    db.prepare('DELETE FROM content_campaigns WHERE id = ? AND workspace_id = ?').run(
      String(req.params.campaignId),
      String(req.params.wid)
    );
    return res.json({ deleted: true });
  });

  // ===========================================================================
  // 4. INTERACTIVE CONTENT CALENDAR (DAILY, WEEKLY, MONTHLY, DRAG-AND-DROP)
  // ===========================================================================
  router.get('/workspaces/:wid/calendar', requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db
      .prepare(
        `SELECT cc.*, c.name as campaign_name, c.color_hex as campaign_color, sa.account_name
         FROM content_calendar cc
         LEFT JOIN content_campaigns c ON c.id = cc.campaign_id
         LEFT JOIN social_accounts sa ON sa.id = cc.social_account_id
         WHERE cc.workspace_id = ?
         ORDER BY cc.scheduled_at ASC`
      )
      .all(wid) as Record<string, unknown>[];
    return res.json({ items: rows.map(mapCalendarRow) });
  });

  router.patch('/workspaces/:wid/calendar/:itemId/reschedule', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const itemId = String(req.params.itemId);
      const body = z
        .object({
          scheduledAt: z.string().min(8),
          timezone: z.string().max(64).optional(),
        })
        .parse(req.body);

      const existing = db
        .prepare('SELECT * FROM content_calendar WHERE id = ? AND workspace_id = ?')
        .get(itemId, wid) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: 'Calendar item not found.' });
      if (String(existing.status) === 'published') {
        return res.status(400).json({ error: 'Published posts cannot be rescheduled.' });
      }

      const tz = body.timezone || String(existing.timezone || 'UTC');
      const nextUtc = convertLocalDateTimeToUtcIso(body.scheduledAt, tz);
      const now = new Date().toISOString();

      db.transaction(() => {
        db.prepare('UPDATE content_calendar SET scheduled_at = ?, timezone = ?, updated_at = ? WHERE id = ?').run(
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
          db.prepare('UPDATE content_posts SET scheduled_for = ?, updated_at = ? WHERE id = ?').run(
            nextUtc,
            now,
            String(existing.content_post_id)
          );
        }
      })();

      const updated = db
        .prepare(
          `SELECT cc.*, c.name as campaign_name, c.color_hex as campaign_color, sa.account_name
           FROM content_calendar cc
           LEFT JOIN content_campaigns c ON c.id = cc.campaign_id
           LEFT JOIN social_accounts sa ON sa.id = cc.social_account_id
           WHERE cc.id = ?`
        )
        .get(itemId) as Record<string, unknown>;
      return res.json({ item: mapCalendarRow(updated) });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // ===========================================================================
  // 5. AUTOMATIC PUBLISHING QUEUE, APPROVALS, WORKER & HISTORY
  // ===========================================================================
  router.get('/workspaces/:wid/publishing-queue', requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const statusFilter = req.query.status ? String(req.query.status) : null;
    const rows = statusFilter
      ? (db
          .prepare(
            `SELECT pq.*, sa.account_name, sa.account_handle
             FROM publishing_queue pq
             LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
             WHERE pq.workspace_id = ? AND pq.status = ?
             ORDER BY pq.scheduled_at DESC LIMIT 100`
          )
          .all(wid, statusFilter) as Record<string, unknown>[])
      : (db
          .prepare(
            `SELECT pq.*, sa.account_name, sa.account_handle
             FROM publishing_queue pq
             LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
             WHERE pq.workspace_id = ?
             ORDER BY pq.created_at DESC LIMIT 100`
          )
          .all(wid) as Record<string, unknown>[]);

    return res.json({
      jobs: rows.map(mapPublishingQueueRow),
      workerHealth: getWorkerHealth(db, wid),
    });
  });

  router.post('/workspaces/:wid/publishing-queue', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          socialAccountId: z.string().nullable().optional(),
          campaignId: z.string().nullable().optional(),
          generatedContentId: z.string().nullable().optional(),
          contentPostId: z.string().nullable().optional(),
          formatKey: FormatKeySchema.optional(),
          title: z.string().min(1).max(200),
          bodyText: z.string().min(1).max(63000),
          hashtags: z.array(z.string()).optional(),
          mediaUrls: z.array(z.string()).optional(),
          linkUrl: z.string().url().nullable().optional(),
          scheduledAt: z.string().min(8),
          timezone: z.string().max(64).optional(),
          recurrenceRule: RecurrenceRuleSchema.optional(),
          publishingModeOverride: z.enum(['automatic', 'approval_required']).optional(),
          saveAsDraft: z.boolean().optional(),
          idempotencyKey: z.string().max(120).optional(),
        })
        .parse(req.body);

      const enqueued = enqueuePublishingJob(db, {
        workspaceId: wid,
        userId: req.user!.id,
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
        idempotencyKey: body.idempotencyKey,
      });

      return res.status(201).json(enqueued);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/publishing-queue/:queueId/retry', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const body = z.object({ scheduledAt: z.string().optional() }).parse(req.body || {});
      const job = retryFailedQueueJob(db, String(req.params.wid), String(req.params.queueId), body.scheduledAt);
      return res.json({ job });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/publishing-queue/:queueId/cancel', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const job = cancelQueueJob(db, String(req.params.wid), String(req.params.queueId));
      return res.json({ job });
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/publishing-queue/:queueId/dispatch-now', requireAuth, requireWorkspaceMember, async (req, res) => {
    try {
      const wid = String(req.params.wid);
      const queueId = String(req.params.queueId);
      const existing = db
        .prepare('SELECT id, status FROM publishing_queue WHERE id = ? AND workspace_id = ?')
        .get(queueId, wid) as { id: string; status: string } | undefined;
      if (!existing) return res.status(404).json({ error: 'Queue job not found.' });
      if (existing.status === 'awaiting_approval') {
        return res.status(400).json({ error: 'This post requires approval before it can be dispatched.' });
      }
      if (existing.status === 'published') {
        return res.status(400).json({ error: 'This post has already been published.' });
      }
      // Make immediately due if currently scheduled for future
      const nowIso = new Date().toISOString();
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

  router.post('/workspaces/:wid/publishing-queue/worker/tick', requireAuth, requireWorkspaceMember, async (_req, res) => {
    try {
      const summary = await processDuePublishingJobs(db);
      return res.json(summary);
    } catch (err) {
      return handleError(res, err, 500);
    }
  });

  router.get('/workspaces/:wid/publishing-queue/worker/health', requireAuth, requireWorkspaceMember, (req, res) => {
    return res.json({ workerHealth: getWorkerHealth(db, String(req.params.wid)) });
  });

  router.get('/workspaces/:wid/publishing-history', requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const jobs = (
      db
        .prepare(
          `SELECT pq.*, sa.account_name, sa.account_handle
           FROM publishing_queue pq
           LEFT JOIN social_accounts sa ON sa.id = pq.social_account_id
           WHERE pq.workspace_id = ?
           ORDER BY pq.updated_at DESC LIMIT 100`
        )
        .all(wid) as Record<string, unknown>[]
    ).map(mapPublishingQueueRow);

    const attempts = (
      db
        .prepare(
          `SELECT * FROM publishing_attempts
           WHERE workspace_id = ?
           ORDER BY started_at DESC LIMIT 150`
        )
        .all(wid) as Record<string, unknown>[]
    ).map(mapPublishingAttemptRow);

    return res.json({ jobs, attempts, workerHealth: getWorkerHealth(db, wid) });
  });

  // Approvals Workflow
  router.get('/workspaces/:wid/approvals', requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const rows = db
      .prepare(
        `SELECT ca.*, pq.title as queue_title, pq.platform_key, pq.scheduled_at, pq.body_text
         FROM content_approvals ca
         JOIN publishing_queue pq ON pq.id = ca.queue_id
         WHERE ca.workspace_id = ?
         ORDER BY ca.created_at DESC LIMIT 60`
      )
      .all(wid) as Record<string, unknown>[];
    return res.json({ approvals: rows.map(mapApprovalRow) });
  });

  router.post('/workspaces/:wid/approvals/:approvalId/decide', requireAuth, requireWorkspaceMember, (req: AuthedRequest, res) => {
    try {
      const body = z
        .object({
          decision: z.enum(['approved', 'rejected', 'changes_requested']),
          notes: z.string().max(1000).optional(),
        })
        .parse(req.body);
      const result = decideContentApproval(db, {
        workspaceId: String(req.params.wid),
        approvalId: String(req.params.approvalId),
        reviewerUserId: req.user!.id,
        decision: body.decision,
        notes: body.notes,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  // ===========================================================================
  // 6. ENGAGEMENT MANAGER (MONITORING, AI SUGGESTED REPLIES, ESCALATION, AUTO-REPLY)
  // ===========================================================================
  router.get('/workspaces/:wid/engagement-messages', requireAuth, requireWorkspaceMember, (req, res) => {
    const wid = String(req.params.wid);
    const refreshed = db
      .prepare(
        `SELECT em.*, sa.account_name
         FROM engagement_messages em
         LEFT JOIN social_accounts sa ON sa.id = em.social_account_id
         WHERE em.workspace_id = ?
         ORDER BY em.created_at DESC LIMIT 80`
      )
      .all(wid) as Record<string, unknown>[];

    const suggestionRows = db
      .prepare('SELECT * FROM ai_reply_suggestions WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(wid) as Record<string, unknown>[];
    const suggestionsByMsg = new Map<string, ReturnType<typeof mapReplySuggestionRow>[]>();
    for (const s of suggestionRows) {
      const mapped = mapReplySuggestionRow(s);
      const list = suggestionsByMsg.get(mapped.engagementMessageId) || [];
      list.push(mapped);
      suggestionsByMsg.set(mapped.engagementMessageId, list);
    }

    const messages: EngagementMessageRecord[] = refreshed.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
      accountName: r.account_name ? String(r.account_name) : null,
      platformKey: String(r.platform_key) as PlatformKey,
      externalMessageId: r.external_message_id ? String(r.external_message_id) : null,
      externalPostId: r.external_post_id ? String(r.external_post_id) : null,
      messageType: String(r.message_type) as EngagementMessageRecord['messageType'],
      authorName: String(r.author_name),
      authorHandle: String(r.author_handle),
      content: String(r.content),
      sentiment: String(r.sentiment || 'neutral') as EngagementMessageRecord['sentiment'],
      requiresEscalation: Boolean(r.requires_escalation),
      escalationReason: r.escalation_reason ? String(r.escalation_reason) : null,
      status: String(r.status) as EngagementMessageRecord['status'],
      sentReplyText: r.sent_reply_text ? String(r.sent_reply_text) : null,
      repliedByMode: r.replied_by_mode ? (String(r.replied_by_mode) as EngagementMessageRecord['repliedByMode']) : null,
      repliedAt: r.replied_at ? String(r.replied_at) : null,
      isDemo: Boolean(r.is_demo),
      suggestions: suggestionsByMsg.get(String(r.id)) || [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    const profile = loadWorkspaceBrandProfile(db, wid);
    return res.json({ messages, autoReplyEnabled: profile.autoReplyEnabled });
  });

  router.post('/workspaces/:wid/engagement-messages', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const body = z
        .object({
          platformKey: PlatformKeySchema,
          socialAccountId: z.string().nullable().optional(),
          messageType: z.enum(['comment', 'direct_message', 'mention', 'review']).default('comment'),
          authorName: z.string().min(1).max(120),
          authorHandle: z.string().min(1).max(120),
          content: z.string().min(1).max(2000),
        })
        .parse(req.body);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
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

  // Module 14: AI Reply Drafting
  router.post('/workspaces/:wid/engagement-messages/:msgId/suggest-reply', requireAuth, requireWorkspaceMember, async (req: AuthedRequest, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const msg = db
        .prepare('SELECT * FROM engagement_messages WHERE id = ? AND workspace_id = ?')
        .get(msgId, wid) as Record<string, unknown> | undefined;
      if (!msg) return res.status(404).json({ error: 'Engagement message not found.' });

      const body = z.object({ desiredTone: z.string().max(120).optional() }).parse(req.body || {});
      const result = await runCommentReplyDraftingModule(db, {
        workspaceId: wid,
        userId: req.user!.id,
        engagementMessageId: msgId,
        platformKey: String(msg.platform_key) as PlatformKey,
        authorName: String(msg.author_name),
        messageContent: String(msg.content),
        desiredTone: body.desiredTone,
      });
      return res.json(result);
    } catch (err) {
      return handleError(res, err, 400);
    }
  });

  router.post('/workspaces/:wid/engagement-messages/:msgId/reply', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const body = z
        .object({
          replyText: z.string().min(1).max(2000),
          mode: z.enum(['manual', 'ai_approved', 'ai_auto']).default('ai_approved'),
          suggestionId: z.string().optional(),
        })
        .parse(req.body);

      const msg = db
        .prepare('SELECT * FROM engagement_messages WHERE id = ? AND workspace_id = ?')
        .get(msgId, wid) as Record<string, unknown> | undefined;
      if (!msg) return res.status(404).json({ error: 'Engagement message not found.' });

      if (body.mode === 'ai_auto') {
        const profile = loadWorkspaceBrandProfile(db, wid);
        if (!profile.autoReplyEnabled) {
          return res.status(403).json({
            error: 'Automated replies are disabled in workspace Brand Safety settings. Enable Auto-Reply explicitly or approve manually.',
          });
        }
        if (Boolean(msg.requires_escalation)) {
          return res.status(400).json({
            error: 'Escalated sensitive messages cannot be auto-replied and require explicit human approval.',
          });
        }
      }

      const safety = evaluateContentSafety(db, {
        workspaceId: wid,
        platformKey: String(msg.platform_key) as PlatformKey,
        bodyText: body.replyText,
        checkDuplicate: false,
      });
      if (safety.status === 'blocked') {
        return res.status(400).json({ error: safety.issues[0]?.message || 'Reply blocked by Content Safety policy.' });
      }

      const now = new Date().toISOString();
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

  router.post('/workspaces/:wid/engagement-messages/:msgId/escalate', requireAuth, requireWorkspaceMember, (req, res) => {
    try {
      const wid = String(req.params.wid);
      const msgId = String(req.params.msgId);
      const body = z.object({ reason: z.string().min(3).max(500) }).parse(req.body);
      const now = new Date().toISOString();
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
