import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey } from '../../../src/shared/api-contracts';
import { normalizeHashtags } from '../../../src/utils/domain';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface HashtagRecommendationResult {
  broadTags: string[];
  nicheTags: string[];
  brandedTags: string[];
  recommendedSet: string[];
  platformGuidance: string;
  creditsRemaining: number;
}

export async function runHashtagRecommendationsModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    topic: string;
    language?: string;
  }
): Promise<HashtagRecommendationResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const prompt = `Recommend relevant, non-spammy hashtags for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Topic: ${params.topic}
Language: ${params.language || ctx.brand.preferredLanguage}
Do NOT invent fake search volume numbers.`;

  const result = await runStructuredGeminiModule<Omit<HashtagRecommendationResult, 'creditsRemaining'>>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'hashtag_recommendations',
    systemInstruction: 'You are a social discovery strategist recommending high-signal, platform-appropriate hashtags.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        broadTags: { type: Type.ARRAY, items: { type: Type.STRING } },
        nicheTags: { type: Type.ARRAY, items: { type: Type.STRING } },
        brandedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendedSet: { type: Type.ARRAY, items: { type: Type.STRING } },
        platformGuidance: { type: Type.STRING },
      },
      required: ['broadTags', 'nicheTags', 'brandedTags', 'recommendedSet', 'platformGuidance'],
    },
  });

  return {
    broadTags: normalizeHashtags(result.data.broadTags || []),
    nicheTags: normalizeHashtags(result.data.nicheTags || []),
    brandedTags: normalizeHashtags(result.data.brandedTags || []),
    recommendedSet: normalizeHashtags(result.data.recommendedSet || []),
    platformGuidance: result.data.platformGuidance,
    creditsRemaining: result.creditsRemaining,
  };
}
