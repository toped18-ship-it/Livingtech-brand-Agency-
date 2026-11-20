import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey } from '../../../src/shared/api-contracts';
import { getPlatformCharLimit, normalizeHashtags } from '../../../src/utils/domain';
import { formatConnectedSocialContextForAi, loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface CaptionWritingResult {
  primaryCaption: string;
  shortCaption: string;
  storytellingCaption: string;
  callToAction: string;
  hashtags: string[];
  creditsRemaining: number;
}

export async function runCaptionWritingModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    subject: string;
    visualDescription?: string;
    toneOfVoice?: string;
    language?: string;
  }
): Promise<CaptionWritingResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const charLimit = getPlatformCharLimit(params.platformKey);

  const socialContextBlock = formatConnectedSocialContextForAi(ctx, {
    platformKey: params.platformKey,
  });

  const prompt = `Write 3 tailored captions for ${params.platformKey.toUpperCase()} (hard char limit: ${charLimit}).
Brand: ${ctx.brand.brandName}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Subject: ${params.subject}
Visual Context: ${params.visualDescription || 'Branded social media graphic/photo'}
Banned Words: ${ctx.brand.bannedWords.join(', ') || 'None'}

${socialContextBlock}`;

  const result = await runStructuredGeminiModule<Omit<CaptionWritingResult, 'creditsRemaining'>>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'caption_writing',
    systemInstruction: 'You write scroll-stopping, authentic social captions tailored to each platform format.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        primaryCaption: { type: Type.STRING },
        shortCaption: { type: Type.STRING },
        storytellingCaption: { type: Type.STRING },
        callToAction: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['primaryCaption', 'shortCaption', 'storytellingCaption', 'callToAction', 'hashtags'],
    },
  });

  return {
    ...result.data,
    hashtags: normalizeHashtags(result.data.hashtags || []),
    creditsRemaining: result.creditsRemaining,
  };
}
