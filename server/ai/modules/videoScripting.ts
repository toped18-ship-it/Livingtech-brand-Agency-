import { Type } from '@google/genai';
import type { DbInstance } from '../../db/database';
import type { PlatformKey, VideoScriptPayload } from '../../../src/shared/api-contracts';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export interface VideoScriptingResult {
  title: string;
  conceptSummary: string;
  script: VideoScriptPayload;
  captionIdea: string;
  hashtags: string[];
  creditsRemaining: number;
}

export async function runVideoScriptingModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    platformKey: PlatformKey;
    topic: string;
    formatStyle: 'short_form_reel' | 'product_demo' | 'explainer' | 'founder_story' | 'youtube_video';
    targetDurationSeconds: number;
    toneOfVoice?: string;
    language?: string;
  }
): Promise<VideoScriptingResult> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const prompt = `Write a production-ready video script and scene breakdown for ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry}
Format: ${params.formatStyle.replace(/_/g, ' ')}
Target Duration: ${params.targetDurationSeconds} seconds
Topic: ${params.topic}
Tone: ${params.toneOfVoice || ctx.brand.toneOfVoice}
Language: ${params.language || ctx.brand.preferredLanguage}
Banned Words: ${ctx.brand.bannedWords.join(', ') || 'None'}

Include a strong first-3-second hook, timestamped scenes (visual, voiceover, onScreenText), B-roll ideas, and a clear CTA.`;

  const result = await runStructuredGeminiModule<Omit<VideoScriptingResult, 'creditsRemaining'>>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'video_scripting',
    systemInstruction: 'You are a commercial video director crafting high-retention social video scripts.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        conceptSummary: { type: Type.STRING },
        script: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.STRING },
            durationSeconds: { type: Type.INTEGER },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING },
                  visual: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                  onScreenText: { type: Type.STRING },
                },
                required: ['timestamp', 'visual', 'voiceover', 'onScreenText'],
              },
            },
            callToAction: { type: Type.STRING },
            bRollIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['hook', 'durationSeconds', 'scenes', 'callToAction', 'bRollIdeas'],
        },
        captionIdea: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'conceptSummary', 'script', 'captionIdea', 'hashtags'],
    },
  });

  return {
    ...result.data,
    creditsRemaining: result.creditsRemaining,
  };
}
