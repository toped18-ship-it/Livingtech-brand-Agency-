import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface PerformanceRecommendationsResult {
  hasLiveData: boolean;
  dataBasisSummary: string;
  keyObservations: string[];
  actionableRecommendations: {
    title: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    evidenceType: 'observed_metric' | 'best_practice_hypothesis';
  }[];
  nextExperiments: string[];
  creditsRemaining: number;
}

export async function runPerformanceRecommendationsModule(
  db: DbInstance,
  params: { workspaceId: string; userId: string }
): Promise<PerformanceRecommendationsResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const hasLiveData = ctx.liveAnalytics.length > 0;

  const prompt = `Provide performance recommendations for this workspace.
STRICT INTEGRITY RULE:
- ${
    hasLiveData
      ? `Analyze the ${ctx.liveAnalytics.length} live synced analytics snapshots below and label observations grounded in those numbers as "observed_metric".`
      : 'There are ZERO live synced analytics snapshots yet. Clearly state this in dataBasisSummary, DO NOT invent impressions/CTR/engagement rates, and label all recommendations as "best_practice_hypothesis" focused on establishing measurement baselines.'
  }
- Never promise guaranteed growth or guaranteed conversion lifts.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Connected Accounts: ${ctx.accounts.length}
Recent Posts Count: ${ctx.recentPosts.length}
Live Analytics Snapshots: ${hasLiveData ? JSON.stringify(ctx.liveAnalytics) : 'None'}`;

  const result = await runStructuredGeminiModule<Omit<PerformanceRecommendationsResult, 'hasLiveData' | 'creditsRemaining'>>(
    db,
    {
      workspaceId: params.workspaceId,
      userId: params.userId,
      moduleKey: 'performance_recommendations',
      systemInstruction: 'You are a data-honest growth analyst. Never fabricate performance figures.',
      prompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dataBasisSummary: { type: Type.STRING },
          keyObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionableRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                rationale: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                evidenceType: { type: Type.STRING, enum: ['observed_metric', 'best_practice_hypothesis'] },
              },
              required: ['title', 'rationale', 'priority', 'evidenceType'],
            },
          },
          nextExperiments: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['dataBasisSummary', 'keyObservations', 'actionableRecommendations', 'nextExperiments'],
      },
    }
  );

  return {
    hasLiveData,
    ...result.data,
    creditsRemaining: result.creditsRemaining,
  };
}
