import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey, PublishingFormatKey } from '../../../src/shared/api-contracts';
import { formatConnectedSocialContextForAi, loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface CalendarRecommendationItem {
  dayOffset: number;
  suggestedLocalTime: string;
  platformKey: PlatformKey;
  formatKey: PublishingFormatKey;
  title: string;
  bodyText: string;
  hashtags: string[];
  rationale: string;
  timeEvidenceBasis: 'verified_audience_insights' | 'user_preference_window' | 'no_insights_general_working_hours';
}

export interface CalendarGenerationResult {
  evidenceDisclaimer: string;
  hasLiveAudienceInsights: boolean;
  items: CalendarRecommendationItem[];
  creditsRemaining: number;
}

export async function runCalendarGenerationModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platforms: PlatformKey[];
    daysCount: number;
    campaignObjective: string;
    preferredPostingWindow?: string;
    timezone: string;
  }
): Promise<CalendarGenerationResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const hasLiveInsights = ctx.liveAnalytics.length > 0;
  const clampedDays = Math.min(Math.max(params.daysCount, 3), 14);

  const socialContextBlock = formatConnectedSocialContextForAi(ctx);

  const prompt = `Generate a ${clampedDays}-day social media content calendar plan.
CRITICAL HONESTY RULE ABOUT POSTING TIMES:
${
  hasLiveInsights
    ? `Live synced analytics snapshots exist (${ctx.liveAnalytics.length} records). Base timing suggestions on those patterns and label timeEvidenceBasis as "verified_audience_insights".`
    : `NO live platform audience insights are currently synced for this workspace. You MUST NOT invent or claim "optimal engagement times" or fake peak hours. Instead, schedule within the user's preferred window (${params.preferredPostingWindow || 'standard local business hours 09:00-17:00'}) and explicitly state in "evidenceDisclaimer" that exact optimal posting times require synced platform audience insights, and mark timeEvidenceBasis as "${params.preferredPostingWindow ? 'user_preference_window' : 'no_insights_general_working_hours'}".`
}

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || 'General Business'}
Tone: ${ctx.brand.toneOfVoice}
Timezone: ${params.timezone}
Target Platforms: ${params.platforms.join(', ')}
Campaign Objective: ${params.campaignObjective}
Banned Words (MUST NOT appear): ${ctx.brand.bannedWords.join(', ') || 'None'}

${socialContextBlock}

Produce between ${Math.min(clampedDays, 10)} and ${Math.min(clampedDays * 2, 14)} posts distributed across dayOffset 0 to ${clampedDays - 1}.
Use HH:mm 24-hour format for suggestedLocalTime.`;

  const result = await runStructuredGeminiModule<{
    evidenceDisclaimer: string;
    items: CalendarRecommendationItem[];
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'calendar_generation',
    systemInstruction:
      'You are a meticulous social media operations planner. Never fabricate analytics or invent optimal posting times without data.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        evidenceDisclaimer: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayOffset: { type: Type.INTEGER },
              suggestedLocalTime: { type: Type.STRING },
              platformKey: {
                type: Type.STRING,
                enum: ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'google_business'],
              },
              formatKey: {
                type: Type.STRING,
                enum: ['text', 'image', 'video', 'carousel', 'story', 'reels', 'short_form_video'],
              },
              title: { type: Type.STRING },
              bodyText: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING },
              timeEvidenceBasis: {
                type: Type.STRING,
                enum: ['verified_audience_insights', 'user_preference_window', 'no_insights_general_working_hours'],
              },
            },
            required: [
              'dayOffset',
              'suggestedLocalTime',
              'platformKey',
              'formatKey',
              'title',
              'bodyText',
              'hashtags',
              'rationale',
              'timeEvidenceBasis',
            ],
          },
        },
      },
      required: ['evidenceDisclaimer', 'items'],
    },
  });

  return {
    evidenceDisclaimer: result.data.evidenceDisclaimer,
    hasLiveAudienceInsights: hasLiveInsights,
    items: result.data.items || [],
    creditsRemaining: result.creditsRemaining,
  };
}
