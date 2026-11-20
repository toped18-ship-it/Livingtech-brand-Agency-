import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey, RepurposedVariant } from '../../../src/shared/api-contracts';
import { getPlatformCharLimit, normalizeHashtags } from '../../../src/utils/domain';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export async function runContentRepurposingModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    sourceIdeaOrCopy: string;
    targetPlatforms: PlatformKey[];
    toneOfVoice?: string;
    language?: string;
  }
): Promise<{ variants: RepurposedVariant[]; creditsRemaining: number }> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const platformSpecs = params.targetPlatforms
    .map((p) => `- ${p}: max ${getPlatformCharLimit(p)} chars (${p === 'tiktok' ? 'short-form video script & caption' : p === 'youtube' ? 'video title & SEO description' : p === 'x' ? 'punchy micro-post under 250 chars' : p === 'linkedin' ? 'executive professional post' : p === 'instagram' ? 'visual caption + hook' : 'platform-native post'})`)
    .join('\n');

  const prompt = `Repurpose this single core idea into distinct, native content adapted for each target social media platform.
Brand: ${ctx.brand.brandName}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Banned Words: ${ctx.brand.bannedWords.join(', ') || 'None'}

=== CORE IDEA / SOURCE COPY ===
${params.sourceIdeaOrCopy}

=== TARGET PLATFORMS & STRICT LIMITS ===
${platformSpecs}

Return one tailored variant for every requested target platform. Respect every character limit strictly.`;

  const result = await runStructuredGeminiModule<{
    variants: {
      platformKey: PlatformKey;
      format: string;
      headline: string;
      body: string;
      hashtags: string[];
      callToAction: string;
    }[];
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'content_repurposing',
    systemInstruction:
      'You are an omnichannel brand editor transforming a single message into native, high-performing posts for each social network.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        variants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              platformKey: {
                type: Type.STRING,
                enum: ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'google_business'],
              },
              format: { type: Type.STRING },
              headline: { type: Type.STRING },
              body: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              callToAction: { type: Type.STRING },
            },
            required: ['platformKey', 'format', 'headline', 'body', 'hashtags', 'callToAction'],
          },
        },
      },
      required: ['variants'],
    },
  });

  const normalized: RepurposedVariant[] = (result.data.variants || []).map((v) => {
    const cleanTags = normalizeHashtags(v.hashtags || []);
    const limit = getPlatformCharLimit(v.platformKey);
    const body = v.body.trim();
    return {
      platformKey: v.platformKey,
      format: v.format,
      headline: v.headline.trim(),
      body,
      hashtags: cleanTags,
      characterCount: `${body}\n\n${cleanTags.join(' ')}`.trim().length,
      characterLimit: limit,
      callToAction: v.callToAction.trim(),
    };
  });

  return {
    variants: normalized,
    creditsRemaining: result.creditsRemaining,
  };
}
