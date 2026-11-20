import { GoogleGenAI } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import { env } from '../env';
import type { AiModuleKey, BrandDocumentItem, BrandIntelligenceProfile } from '../../src/shared/api-contracts';
import { PHASE3_AI_CREDIT_COSTS } from '../../src/utils/domain';

// Strictly free-tier Gemini models (user declined paid API key setup)
export const GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_FALLBACK_MODELS = ['gemini-3.1-flash-lite'] as const;

export type GeminiTransportFn = (params: {
  model: string;
  contents: string;
  config: Parameters<GoogleGenAI['models']['generateContent']>[0]['config'];
}) => Promise<{
  text?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}>;

let testTransportOverride: GeminiTransportFn | null = null;

/**
 * Allows automated integration tests to inject a deterministic Gemini response transport
 * without ever exposing or altering production behavior.
 */
export function setGeminiTestTransport(fn: GeminiTransportFn | null) {
  testTransportOverride = fn;
}

function createGeminiSdkClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to enable AI generation.');
  }
  return new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientCapacityError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand') ||
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED')
  );
}

export function formatGeminiClientError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY') || raw.includes('Insufficient AI credits')) {
    return err instanceof Error ? err : new Error(raw);
  }
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; message?: string; status?: string } };
    if (parsed?.error?.message) {
      if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
        return new Error('Gemini AI is temporarily busy. Your credits were not deducted — please retry shortly.');
      }
      return new Error(`Gemini AI error: ${parsed.error.message}`);
    }
  } catch {
    // non-JSON error
  }
  return new Error(raw.length > 260 ? `${raw.slice(0, 260)}…` : raw);
}

export function loadWorkspaceBrandProfile(db: DbInstance, workspaceId: string): BrandIntelligenceProfile {
  const row = db
    .prepare('SELECT * FROM brand_profiles WHERE workspace_id = ?')
    .get(workspaceId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error('Workspace brand profile not found.');
  }

  let bannedWords: string[] = [];
  let brandDocuments: BrandDocumentItem[] = [];
  try {
    bannedWords = JSON.parse(String(row.banned_words_json || '[]'));
  } catch {
    bannedWords = [];
  }
  try {
    brandDocuments = JSON.parse(String(row.brand_documents_json || '[]'));
  } catch {
    brandDocuments = [];
  }

  return {
    workspaceId: String(row.workspace_id),
    brandName: String(row.brand_name || ''),
    logoUrl: String(row.logo_url || ''),
    primaryColor: String(row.primary_color || '#0052FF'),
    secondaryColor: String(row.secondary_color || '#071436'),
    accentColor: String(row.accent_color || '#F59E0B'),
    businessDescription: String(row.business_description || ''),
    industry: String(row.industry || ''),
    productsServices: String(row.products_services || ''),
    targetAudience: String(row.target_audience || ''),
    businessGoals: String(row.business_goals || ''),
    toneOfVoice: String(row.tone_of_voice || 'Executive & Authoritative'),
    preferredLanguage: String(row.preferred_language || 'en'),
    timezone: String(row.timezone || 'UTC'),
    bannedWords: Array.isArray(bannedWords) ? bannedWords : [],
    brandToneRules: String(row.brand_tone_rules || ''),
    maxPostsPerDay: Number(row.max_posts_per_day ?? 10) || 10,
    autoReplyEnabled: Boolean(row.auto_reply_enabled),
    brandDocuments: Array.isArray(brandDocuments) ? brandDocuments : [],
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export function loadPermittedWorkspaceContext(db: DbInstance, workspaceId: string) {
  const brand = loadWorkspaceBrandProfile(db, workspaceId);

  const accounts = db
    .prepare(
      `SELECT sa.id, sp.key as platform_key, sa.account_name, sa.account_handle, sa.account_type,
              sa.account_description, sa.business_category, sa.followers_count, sa.connection_status, sa.last_synced_at
       FROM social_accounts sa
       JOIN social_platforms sp ON sp.id = sa.platform_id
       WHERE sa.workspace_id = ? AND sa.connection_status = 'connected'`
    )
    .all(workspaceId) as Record<string, unknown>[];

  const recentPosts = db
    .prepare(
      `SELECT title, caption, platform_key, status, published_at
       FROM content_posts
       WHERE workspace_id = ?
       ORDER BY created_at DESC LIMIT 12`
    )
    .all(workspaceId) as Record<string, unknown>[];

  const liveAnalytics = db
    .prepare(
      `SELECT platform_key, snapshot_date, impressions, engagements, clicks, followers_total
       FROM analytics_snapshots
       WHERE workspace_id = ? AND is_demo = 0
       ORDER BY snapshot_date DESC LIMIT 20`
    )
    .all(workspaceId) as Record<string, unknown>[];

  const mediaAssets = db
    .prepare(
      `SELECT file_name, asset_type, folder, public_url
       FROM media_library
       WHERE workspace_id = ?
       ORDER BY created_at DESC LIMIT 15`
    )
    .all(workspaceId) as Record<string, unknown>[];

  return { brand, accounts, recentPosts, liveAnalytics, mediaAssets };
}

export function formatConnectedSocialContextForAi(
  ctx: ReturnType<typeof loadPermittedWorkspaceContext>,
  options?: { platformKey?: string; socialAccountId?: string | null }
): string {
  const targetedAccounts = ctx.accounts.filter((a) => {
    if (options?.socialAccountId && String(a.id) === options.socialAccountId) return true;
    if (options?.platformKey && String(a.platform_key) === options.platformKey) return true;
    return !options?.platformKey && !options?.socialAccountId;
  });
  const accountList = targetedAccounts.length > 0 ? targetedAccounts : ctx.accounts;

  const accountSummary =
    accountList.length > 0
      ? accountList
          .slice(0, 6)
          .map((a) => {
            const followers =
              a.followers_count !== null && a.followers_count !== undefined
                ? `${Number(a.followers_count).toLocaleString()} followers`
                : 'followers n/a';
            const bio = a.account_description ? ` | Bio: ${String(a.account_description).slice(0, 220)}` : '';
            const category = a.business_category ? ` | Category: ${String(a.business_category)}` : '';
            return `- ${String(a.platform_key).toUpperCase()}: ${String(a.account_name)} (${String(a.account_handle)}, ${followers}${category}${bio})`;
          })
          .join('\n')
      : '- No connected social accounts yet (rely on workspace brand profile).';

  const relevantPosts = ctx.recentPosts.filter(
    (p) => !options?.platformKey || String(p.platform_key) === options.platformKey
  );
  const postsToShow = (relevantPosts.length > 0 ? relevantPosts : ctx.recentPosts).slice(0, 6);
  const contentSummary =
    postsToShow.length > 0
      ? postsToShow
          .map(
            (p) =>
              `- [${String(p.platform_key).toUpperCase()}] ${String(p.title)}: ${String(p.caption || '').slice(0, 180)}`
          )
          .join('\n')
      : '- No prior synced or published channel posts yet.';

  return `CONNECTED SOCIAL MEDIA PROFILE(S) (Use this authentic profile identity, niche, and bio):
${accountSummary}

RECENT CHANNEL CONTENT & VOICE SAMPLES (Match this voice and avoid repeating recent topics):
${contentSummary}`;
}

export async function runStructuredGeminiModule<T>(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    moduleKey: AiModuleKey;
    systemInstruction: string;
    prompt: string;
    responseSchema: NonNullable<Parameters<GoogleGenAI['models']['generateContent']>[0]['config']>['responseSchema'];
  }
): Promise<{
  data: T;
  modelUsed: string;
  creditsUsed: number;
  creditsRemaining: number;
  promptTokens: number;
  completionTokens: number;
}> {
  const cost = PHASE3_AI_CREDIT_COSTS[params.moduleKey];
  const ws = db
    .prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?')
    .get(params.workspaceId) as { ai_credits_balance: number } | undefined;

  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. "${params.moduleKey}" requires ${cost} credits.`);
  }

  const startedAt = Date.now();
  const models = [GEMINI_PRIMARY_MODEL, ...GEMINI_FALLBACK_MODELS];
  const config: Parameters<GoogleGenAI['models']['generateContent']>[0]['config'] = {
    systemInstruction: params.systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: params.responseSchema,
  };

  let lastError: unknown;
  let response: { text?: string; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } } | null = null;
  let modelUsed: string = GEMINI_PRIMARY_MODEL;

  const ai = testTransportOverride ? null : createGeminiSdkClient();

  for (let i = 0; i < models.length; i++) {
    const candidateModel = models[i];
    try {
      if (testTransportOverride) {
        response = await testTransportOverride({ model: candidateModel, contents: params.prompt, config });
      } else {
        response = await ai!.models.generateContent({
          model: candidateModel,
          contents: params.prompt,
          config,
        });
      }
      modelUsed = candidateModel;
      break;
    } catch (err) {
      lastError = err;
      if (!isTransientCapacityError(err) || i === models.length - 1) {
        const now = new Date().toISOString();
        const formatted = formatGeminiClientError(err);
        db.prepare(
          `INSERT INTO ai_generation_usage (
            id, workspace_id, user_id, module_key, model_name, credits_used,
            prompt_tokens, completion_tokens, status, error_message, latency_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'failed', ?, ?, ?)`
        ).run(
          crypto.randomUUID(),
          params.workspaceId,
          params.userId,
          params.moduleKey,
          candidateModel,
          formatted.message,
          Date.now() - startedAt,
          now
        );
        throw formatted;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  if (!response) {
    throw formatGeminiClientError(lastError);
  }

  const parsed = JSON.parse((response.text ?? '{}').trim()) as T;
  const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const latencyMs = Date.now() - startedAt;
  const now = new Date().toISOString();

  // Map module to legacy ai_usage feature bucket for Phase 1/2 Admin analytics continuity
  const legacyFeature =
    params.moduleKey === 'content_strategy' || params.moduleKey === 'brand_analysis' || params.moduleKey === 'audience_analysis'
      ? 'content_strategy'
      : params.moduleKey === 'hashtag_recommendations' || params.moduleKey === 'keyword_research'
      ? 'hashtag_research'
      : params.moduleKey === 'caption_writing' || params.moduleKey === 'comment_reply_drafting'
      ? 'caption_rewrite'
      : 'content_studio';

  db.transaction(() => {
    db.prepare('UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?').run(
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
      crypto.randomUUID(),
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
      crypto.randomUUID(),
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

  const updatedWs = db
    .prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?')
    .get(params.workspaceId) as { ai_credits_balance: number };

  return {
    data: parsed,
    modelUsed,
    creditsUsed: cost,
    creditsRemaining: updatedWs.ai_credits_balance,
    promptTokens,
    completionTokens,
  };
}
