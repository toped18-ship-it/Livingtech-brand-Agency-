import { Type } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../../db/database';
import type { ContentStudioType, GeneratedContentRecord, PlatformKey } from '../../../src/shared/api-contracts';
import { getPlatformCharLimit, normalizeHashtags } from '../../../src/utils/domain';
import { evaluateContentSafety } from '../../services/contentSafetyService';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export function mapGeneratedContentRow(r: Record<string, unknown>): GeneratedContentRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    userId: String(r.user_id),
    campaignId: r.campaign_id ? String(r.campaign_id) : null,
    socialAccountId: r.social_account_id ? String(r.social_account_id) : null,
    platformKey: String(r.platform_key) as PlatformKey,
    contentType: String(r.content_type) as ContentStudioType,
    objective: String(r.objective || ''),
    targetAudience: String(r.target_audience || ''),
    toneOfVoice: String(r.tone_of_voice || ''),
    language: String(r.language || 'en'),
    topic: String(r.topic),
    title: String(r.title),
    bodyText: String(r.body_text),
    captionText: String(r.caption_text || ''),
    hashtags: JSON.parse(String(r.hashtags_json || '[]')),
    keywords: JSON.parse(String(r.keywords_json || '[]')),
    callToAction: String(r.call_to_action || ''),
    imagePrompt: String(r.image_prompt || ''),
    videoScript: JSON.parse(String(r.video_script_json || '{}')),
    repurposedVariants: JSON.parse(String(r.repurposed_variants_json || '[]')),
    safetyStatus: String(r.safety_status || 'passed') as GeneratedContentRecord['safetyStatus'],
    safetyNotes: JSON.parse(String(r.safety_notes_json || '[]')),
    status: String(r.status || 'draft') as GeneratedContentRecord['status'],
    contentPostId: r.content_post_id ? String(r.content_post_id) : null,
    modelName: String(r.model_name || 'gemini-3.5-flash-lite'),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function runPostWritingModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    socialAccountId?: string | null;
    campaignId?: string | null;
    contentType: ContentStudioType;
    topic: string;
    keywords: string[];
    objective: string;
    targetAudience?: string;
    toneOfVoice?: string;
    language?: string;
  }
): Promise<{
  content: GeneratedContentRecord;
  headlineOptions: string[];
  creditsRemaining: number;
}> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const charLimit = getPlatformCharLimit(params.platformKey);
  const audience = params.targetAudience?.trim() || ctx.brand.targetAudience || 'Professionals and brand customers';
  const tone = params.toneOfVoice?.trim() || ctx.brand.toneOfVoice || 'Executive & Authoritative';
  const language = params.language?.trim() || ctx.brand.preferredLanguage || 'en';

  const prompt = `Create original, copyright-conscious ${params.contentType.replace(/_/g, ' ')} content for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || 'General Business'}
Products/Services: ${ctx.brand.productsServices || ctx.brand.businessDescription}
Target Audience: ${audience}
Tone of Voice: ${tone}
Brand Tone Rules: ${ctx.brand.brandToneRules || 'None'}
Language: ${language}
Objective: ${params.objective}
Topic / Brief: ${params.topic}
Target Keywords: ${params.keywords.join(', ') || 'None'}
Hard Platform Character Limit: ${charLimit} characters (bodyText + hashtags MUST stay comfortably under ${charLimit} chars).
Banned Words (MUST NOT APPEAR): ${ctx.brand.bannedWords.join(', ') || 'None'}

STRICT COMPLIANCE:
- Never fabricate customer quotes or fake testimonials.
- Never promise guaranteed follower growth or guaranteed revenue.
- Also provide a detailed "imagePrompt" suitable for designing a matching branded visual.`;

  const result = await runStructuredGeminiModule<{
    title: string;
    headlineOptions: string[];
    bodyText: string;
    captionText: string;
    hashtags: string[];
    callToAction: string;
    imagePrompt: string;
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'post_writing',
    systemInstruction:
      'You are a senior international brand copywriter. Write sharp, authentic, platform-native social copy that strictly follows brand guidelines and character limits.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        headlineOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        bodyText: { type: Type.STRING },
        captionText: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        callToAction: { type: Type.STRING },
        imagePrompt: { type: Type.STRING },
      },
      required: ['title', 'headlineOptions', 'bodyText', 'captionText', 'hashtags', 'callToAction', 'imagePrompt'],
    },
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
    checkFrequencyLimit: false,
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

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

  const row = db.prepare('SELECT * FROM generated_content WHERE id = ?').get(id) as Record<string, unknown>;
  return {
    content: mapGeneratedContentRow(row),
    headlineOptions: result.data.headlineOptions || [result.data.title],
    creditsRemaining: result.creditsRemaining,
  };
}

export function listGeneratedContent(db: DbInstance, workspaceId: string): GeneratedContentRecord[] {
  const rows = db
    .prepare('SELECT * FROM generated_content WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 60')
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(mapGeneratedContentRow);
}
