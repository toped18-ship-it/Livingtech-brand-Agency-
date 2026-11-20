import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey } from '../../../src/shared/api-contracts';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface KeywordResearchResult {
  primaryKeywords: string[];
  longTailPhrases: string[];
  questionQueries: string[];
  contentAngles: { keyword: string; intent: 'informational' | 'commercial' | 'transactional' | 'navigational'; suggestedHook: string }[];
  caveat: string;
  creditsRemaining: number;
}

export async function runKeywordResearchModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    seedTopic: string;
    platformKey: PlatformKey;
    language?: string;
  }
): Promise<KeywordResearchResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const prompt = `Provide structured social search and SEO keyword research assistance for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Seed Topic: ${params.seedTopic}
Language: ${params.language || ctx.brand.preferredLanguage}
IMPORTANT: Do NOT invent monthly search volume numbers or CPC estimates; clearly state in "caveat" that qualitative intent clusters are provided without live search-volume telemetry.`;

  const result = await runStructuredGeminiModule<Omit<KeywordResearchResult, 'creditsRemaining'>>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'keyword_research',
    systemInstruction: 'You are a search and social discovery strategist providing honest, qualitative keyword clusters.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        primaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        longTailPhrases: { type: Type.ARRAY, items: { type: Type.STRING } },
        questionQueries: { type: Type.ARRAY, items: { type: Type.STRING } },
        contentAngles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              keyword: { type: Type.STRING },
              intent: { type: Type.STRING, enum: ['informational', 'commercial', 'transactional', 'navigational'] },
              suggestedHook: { type: Type.STRING },
            },
            required: ['keyword', 'intent', 'suggestedHook'],
          },
        },
        caveat: { type: Type.STRING },
      },
      required: ['primaryKeywords', 'longTailPhrases', 'questionQueries', 'contentAngles', 'caveat'],
    },
  });

  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining,
  };
}
