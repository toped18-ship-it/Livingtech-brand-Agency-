import { Type } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../../db/database';
import type { AiContentStrategyRecord, PlatformKey } from '../../../src/shared/api-contracts';
import { formatConnectedSocialContextForAi, loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export function mapStrategyRow(r: Record<string, unknown>): AiContentStrategyRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    title: String(r.title),
    goals: String(r.goals || ''),
    platforms: JSON.parse(String(r.platforms_json || '[]')),
    executiveSummary: String(r.executive_summary),
    pillars: JSON.parse(String(r.pillars_json || '[]')),
    weeklyCadence: JSON.parse(String(r.weekly_cadence_json || '[]')),
    kpis: JSON.parse(String(r.kpis_json || '[]')),
    evidenceNote: String(r.evidence_note || ''),
    modelName: String(r.model_name || 'gemini-3.5-flash-lite'),
    createdAt: String(r.created_at),
  };
}

export async function runContentStrategyModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    title?: string;
    goals: string;
    platforms: PlatformKey[];
  }
): Promise<{ strategy: AiContentStrategyRecord; creditsRemaining: number }> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const socialContextBlock = formatConnectedSocialContextForAi(ctx);

  const prompt = `Build an executive, measurable 30-day multi-platform social media content strategy.
STRICT INTEGRITY RULES:
- Never promise guaranteed follower growth, viral reach, or guaranteed revenue.
- Explicitly explain in "evidenceNote" whether recommendations are grounded in live synced platform analytics (${ctx.liveAnalytics.length} snapshots) or brand profile fundamentals alone.
- Respect brand tone rules: ${ctx.brand.brandToneRules || 'None specified'}.
- Avoid banned words: ${ctx.brand.bannedWords.join(', ') || 'None'}.

Brand: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || 'General Business'}
Description: ${ctx.brand.businessDescription}
Products/Services: ${ctx.brand.productsServices || 'Not specified'}
Target Audience: ${ctx.brand.targetAudience}
Primary Goals: ${params.goals}
Target Platforms: ${params.platforms.join(', ')}

${socialContextBlock}`;

  const result = await runStructuredGeminiModule<{
    title: string;
    executiveSummary: string;
    pillars: AiContentStrategyRecord['pillars'];
    weeklyCadence: AiContentStrategyRecord['weeklyCadence'];
    kpis: string[];
    evidenceNote: string;
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'content_strategy',
    systemInstruction:
      'You are a Chief Brand Strategist. Produce practical, grounded, platform-accurate strategies without hype or guaranteed-growth claims.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
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
        evidenceNote: { type: Type.STRING },
      },
      required: ['title', 'executiveSummary', 'pillars', 'weeklyCadence', 'kpis', 'evidenceNote'],
    },
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ai_content_strategies (
      id, workspace_id, user_id, title, goals, platforms_json, executive_summary,
      pillars_json, weekly_cadence_json, kpis_json, evidence_note, model_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.workspaceId,
    params.userId,
    params.title?.trim() || result.data.title || `${ctx.brand.brandName} 30-Day Strategy`,
    params.goals,
    JSON.stringify(params.platforms),
    result.data.executiveSummary,
    JSON.stringify(result.data.pillars || []),
    JSON.stringify(result.data.weeklyCadence || []),
    JSON.stringify(result.data.kpis || []),
    result.data.evidenceNote || '',
    result.modelUsed,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM ai_content_strategies WHERE id = ?').get(id) as Record<string, unknown>;
  return { strategy: mapStrategyRow(row), creditsRemaining: result.creditsRemaining };
}

export function listContentStrategies(db: DbInstance, workspaceId: string): AiContentStrategyRecord[] {
  const rows = db
    .prepare('SELECT * FROM ai_content_strategies WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 15')
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(mapStrategyRow);
}
