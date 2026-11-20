import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface AudienceAnalysisResult {
  evidenceStatus: string;
  segments: {
    name: string;
    demographicsAndRole: string;
    corePainPoints: string[];
    desiredOutcomes: string[];
    contentAngles: string[];
    recommendedPlatforms: string[];
    isAssumption: boolean;
  }[];
  messagingDo: string[];
  messagingDont: string[];
  creditsRemaining: number;
}

export async function runAudienceAnalysisModule(
  db: DbInstance,
  params: { workspaceId: string; userId: string; focusMarket?: string }
): Promise<AudienceAnalysisResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const prompt = `Analyze the target audience for this brand.
CRITICAL RULE: Explicitly mark whether each audience segment is based on verified connected-account/profile data or is a strategic assumption (isAssumption: true/false). Do not invent demographic percentages if live platform insights are absent.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || 'Not specified'}
Products & Services: ${ctx.brand.productsServices || 'Not specified'}
Declared Target Audience: ${ctx.brand.targetAudience || 'Not specified'}
Focus Market / Context: ${params.focusMarket || 'Global / Primary workspace market'}
Connected Accounts Count: ${ctx.accounts.length}
Live Analytics Snapshots Available: ${ctx.liveAnalytics.length}`;

  const result = await runStructuredGeminiModule<Omit<AudienceAnalysisResult, 'creditsRemaining'>>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'audience_analysis',
    systemInstruction: 'You are a senior audience strategist. Separate verified insights from working hypotheses.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        evidenceStatus: { type: Type.STRING },
        segments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              demographicsAndRole: { type: Type.STRING },
              corePainPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              desiredOutcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
              contentAngles: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedPlatforms: { type: Type.ARRAY, items: { type: Type.STRING } },
              isAssumption: { type: Type.BOOLEAN },
            },
            required: [
              'name',
              'demographicsAndRole',
              'corePainPoints',
              'desiredOutcomes',
              'contentAngles',
              'recommendedPlatforms',
              'isAssumption',
            ],
          },
        },
        messagingDo: { type: Type.ARRAY, items: { type: Type.STRING } },
        messagingDont: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['evidenceStatus', 'segments', 'messagingDo', 'messagingDont'],
    },
  });

  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining,
  };
}
