import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../db/database';
import { env } from '../env';
import { calculateAiCreditCost, normalizeHashtags } from '../../src/utils/domain';
import type { AiContentSuggestionRecord, PlatformKey } from '../../src/shared/api-contracts';

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite'] as const;

function getGeminiClient(): GoogleGenAI {
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

function formatGeminiError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY') || raw.includes('Insufficient AI credits')) {
    return err instanceof Error ? err : new Error(raw);
  }
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; message?: string; status?: string } };
    if (parsed?.error?.message) {
      if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
        return new Error('Gemini AI is temporarily experiencing high demand. Your credits were not deducted—please try again in a moment.');
      }
      return new Error(`AI generation failed: ${parsed.error.message}`);
    }
  } catch {
    // Raw message is not JSON
  }
  return new Error(raw.length > 220 ? `${raw.slice(0, 220)}…` : raw);
}

async function generateWithResilience(
  ai: GoogleGenAI,
  contents: string,
  config: Parameters<GoogleGenAI['models']['generateContent']>[0]['config']
) {
  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: unknown;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({ model, contents, config });
      return { response, modelUsed: model };
    } catch (err) {
      lastError = err;
      if (!isTransientCapacityError(err) || i === models.length - 1) {
        throw formatGeminiError(err);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw formatGeminiError(lastError);
}

export function mapAiSuggestionRow(r: Record<string, unknown>): AiContentSuggestionRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    userId: String(r.user_id),
    platformKey: String(r.platform_key) as PlatformKey,
    topic: String(r.topic),
    keywords: JSON.parse(String(r.keywords_json || '[]')) as string[],
    objective: String(r.objective || ''),
    tone: String(r.tone || ''),
    headline: String(r.headline),
    headlineOptions: JSON.parse(String(r.headline_options_json || '[]')) as string[],
    postCopy: String(r.post_copy),
    hashtags: JSON.parse(String(r.hashtags_json || '[]')) as string[],
    callToAction: String(r.call_to_action || ''),
    bestTimeNote: String(r.best_time_note || ''),
    variants: JSON.parse(String(r.variants_json || '[]')) as { label: string; body: string }[],
    status: String(r.status) as AiContentSuggestionRecord['status'],
    savedPostId: r.saved_post_id ? String(r.saved_post_id) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export interface GeneratedPostResult {
  suggestion: AiContentSuggestionRecord;
  title: string;
  headlines: string[];
  caption: string;
  hashtags: string[];
  callToAction: string;
  bestTimeNote: string;
  variants: { label: string; body: string }[];
  creditsRemaining: number;
}

export async function generateAiContentPost(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platform: PlatformKey;
    topic: string;
    keywords: string[];
    objective: string;
    tone: string;
    brandName: string;
    industry: string;
    targetAudience: string;
    language: string;
  }
): Promise<GeneratedPostResult> {
  const cost = calculateAiCreditCost('content_studio');
  const ws = db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(params.workspaceId) as { ai_credits_balance: number } | undefined;
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. This generation requires ${cost} credits.`);
  }

  const ai = getGeminiClient();
  const keywordsLine = params.keywords.length > 0 ? params.keywords.join(', ') : 'None specified';
  const prompt = `Create high-impact social media content suggestions for ${params.platform.toUpperCase()}.
Brand: ${params.brandName}
Industry: ${params.industry || 'General Business'}
Target Audience: ${params.targetAudience || 'Professionals and customers'}
Tone of Voice: ${params.tone}
Language: ${params.language}
Campaign Objective: ${params.objective}
Topic / Brief: ${params.topic}
Target Keywords: ${keywordsLine}

Return a structured JSON payload containing:
- headlines: 3 distinct, compelling headline options tailored to ${params.platform}
- title: the strongest primary headline from the options
- caption: polished primary post copy naturally incorporating the target keywords
- hashtags: 5 to 8 relevant, high-signal hashtags (each prefixed with #)
- callToAction: a clear, conversion-oriented call to action
- bestTimeNote: a concise posting-time recommendation
- variants: 2 alternative post copy angles with short labels`;

  const now = new Date().toISOString();
  try {
    const { response, modelUsed } = await generateWithResilience(ai, prompt, {
      systemInstruction: 'You are an international enterprise brand strategist and senior social media copywriter. Produce authentic, conversion-focused copy without clichés or generic filler.',
      responseMimeType: 'application/json',
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
                body: { type: Type.STRING },
              },
              required: ['label', 'body'],
            },
          },
        },
        required: ['title', 'headlines', 'caption', 'hashtags', 'callToAction', 'bestTimeNote', 'variants'],
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      title: string;
      headlines: string[];
      caption: string;
      hashtags: string[];
      callToAction: string;
      bestTimeNote: string;
      variants: { label: string; body: string }[];
    };

    const cleanHeadline = (parsed.title || parsed.headlines?.[0] || params.topic.slice(0, 100)).trim();
    const cleanHeadlines = Array.from(
      new Set([cleanHeadline, ...(parsed.headlines || [])].map((h) => h.trim()).filter(Boolean))
    ).slice(0, 5);
    const cleanHashtags = normalizeHashtags(parsed.hashtags || []);
    const cleanVariants = Array.isArray(parsed.variants) ? parsed.variants.slice(0, 4) : [];
    const usage = response.usageMetadata;
    const suggestionId = crypto.randomUUID();

    db.transaction(() => {
      db.prepare('UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?').run(cost, now, params.workspaceId);
      db.prepare(`
        INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
        VALUES (?, ?, ?, 'content_studio', ?, ?, ?, ?, 'completed', ?, ?)
      `).run(
        crypto.randomUUID(),
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
        (parsed.caption || '').trim(),
        JSON.stringify(cleanHashtags),
        (parsed.callToAction || '').trim(),
        (parsed.bestTimeNote || '').trim(),
        JSON.stringify(cleanVariants),
        now,
        now
      );
    })();

    const updatedWs = db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(params.workspaceId) as { ai_credits_balance: number };
    const storedRow = db.prepare('SELECT * FROM ai_content_suggestions WHERE id = ?').get(suggestionId) as Record<string, unknown>;
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
      creditsRemaining: updatedWs.ai_credits_balance,
    };
  } catch (err) {
    db.prepare(`
      INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
      VALUES (?, ?, ?, 'content_studio', ?, 0, 0, 0, 'failed', ?, ?)
    `).run(crypto.randomUUID(), params.workspaceId, params.userId, PRIMARY_MODEL, now, now);
    throw formatGeminiError(err);
  }
}

export function listAiSuggestions(db: DbInstance, workspaceId: string): AiContentSuggestionRecord[] {
  const rows = db
    .prepare('SELECT * FROM ai_content_suggestions WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 50')
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(mapAiSuggestionRow);
}

export function updateAiSuggestion(
  db: DbInstance,
  params: {
    workspaceId: string;
    suggestionId: string;
    headline: string;
    postCopy: string;
    hashtags: string[];
    callToAction: string;
    platformKey?: PlatformKey;
  }
): AiContentSuggestionRecord | null {
  const existing = db
    .prepare('SELECT * FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?')
    .get(params.suggestionId, params.workspaceId) as Record<string, unknown> | undefined;
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextStatus = String(existing.status) === 'saved_to_calendar' ? 'saved_to_calendar' : 'edited';
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

  const updated = db
    .prepare('SELECT * FROM ai_content_suggestions WHERE id = ?')
    .get(params.suggestionId) as Record<string, unknown>;
  return mapAiSuggestionRow(updated);
}

export function deleteAiSuggestion(db: DbInstance, workspaceId: string, suggestionId: string): boolean {
  const res = db
    .prepare('DELETE FROM ai_content_suggestions WHERE id = ? AND workspace_id = ?')
    .run(suggestionId, workspaceId);
  return res.changes > 0;
}

export interface GeneratedStrategyResult {
  executiveSummary: string;
  pillars: { name: string; sharePercent: number; objective: string; sampleHooks: string[] }[];
  weeklyCadence: { day: string; platform: string; format: string; focus: string }[];
  kpis: string[];
  creditsRemaining: number;
}

export async function generateAiContentStrategy(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    brandName: string;
    industry: string;
    targetAudience: string;
    businessDescription: string;
    goals: string;
    platforms: PlatformKey[];
  }
): Promise<GeneratedStrategyResult> {
  const cost = calculateAiCreditCost('content_strategy');
  const ws = db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(params.workspaceId) as { ai_credits_balance: number } | undefined;
  if (!ws || ws.ai_credits_balance < cost) {
    throw new Error(`Insufficient AI credits. Generating a full strategy requires ${cost} credits.`);
  }

  const ai = getGeminiClient();
  const prompt = `Build an actionable 30-day multi-platform social media content strategy.
Brand: ${params.brandName}
Industry: ${params.industry || 'Technology & Services'}
Business Description: ${params.businessDescription || 'Modern growth-oriented brand'}
Target Audience: ${params.targetAudience || 'Decision makers and customers'}
Primary Goals: ${params.goals}
Target Platforms: ${params.platforms.join(', ')}`;

  const now = new Date().toISOString();
  const { response, modelUsed } = await generateWithResilience(ai, prompt, {
    systemInstruction: 'You are a Chief Brand Strategist creating an executive, measurable social media growth roadmap.',
    responseMimeType: 'application/json',
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
              sampleHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['name', 'sharePercent', 'objective', 'sampleHooks'],
          },
        },
        weeklyCadence: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              platform: { type: Type.STRING },
              format: { type: Type.STRING },
              focus: { type: Type.STRING },
            },
            required: ['day', 'platform', 'format', 'focus'],
          },
        },
        kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['executiveSummary', 'pillars', 'weeklyCadence', 'kpis'],
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<GeneratedStrategyResult, 'creditsRemaining'>;
  const usage = response.usageMetadata;

  db.transaction(() => {
    db.prepare('UPDATE workspaces SET ai_credits_balance = ai_credits_balance - ?, updated_at = ? WHERE id = ?').run(cost, now, params.workspaceId);
    db.prepare(`
      INSERT INTO ai_usage (id, workspace_id, user_id, feature, model_name, credits_used, prompt_tokens, completion_tokens, status, created_at, updated_at)
      VALUES (?, ?, ?, 'content_strategy', ?, ?, ?, ?, 'completed', ?, ?)
    `).run(
      crypto.randomUUID(),
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

  const updatedWs = db.prepare('SELECT ai_credits_balance FROM workspaces WHERE id = ?').get(params.workspaceId) as { ai_credits_balance: number };
  return {
    ...parsed,
    creditsRemaining: updatedWs.ai_credits_balance,
  };
}
