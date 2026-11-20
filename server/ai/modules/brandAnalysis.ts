import { Type } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../../db/database';
import type { BrandAnalysisRecord } from '../../../src/shared/api-contracts';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

export function mapBrandAnalysisRow(r: Record<string, unknown>): BrandAnalysisRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    brandSummary: String(r.brand_summary),
    verifiedFacts: JSON.parse(String(r.verified_facts_json || '[]')),
    assumptions: JSON.parse(String(r.assumptions_json || '[]')),
    audienceInsights: JSON.parse(String(r.audience_insights_json || '{}')),
    contentThemes: JSON.parse(String(r.content_themes_json || '[]')),
    voiceGuidelines: JSON.parse(String(r.voice_guidelines_json || '[]')),
    connectedSources: JSON.parse(String(r.connected_sources_json || '[]')),
    uploadedSources: JSON.parse(String(r.uploaded_sources_json || '[]')),
    modelName: String(r.model_name || 'gemini-3.5-flash-lite'),
    createdAt: String(r.created_at),
  };
}

export async function runBrandAnalysisModule(
  db: DbInstance,
  params: { workspaceId: string; userId: string; additionalNotes?: string }
): Promise<{ analysis: BrandAnalysisRecord; creditsRemaining: number }> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);

  const connectedSources = ctx.accounts.map(
    (a) => `${String(a.platform_key).toUpperCase()}: ${String(a.account_name)} (${String(a.account_handle)}, category: ${String(a.business_category || 'n/a')}, followers: ${a.followers_count ?? 'unavailable'})`
  );
  const uploadedSources = [
    ...ctx.brand.brandDocuments.map((d) => `[${d.category}] ${d.name}: ${d.summary}`),
    ...ctx.mediaAssets.map((m) => `[media:${String(m.asset_type)}] ${String(m.file_name)} (${String(m.folder)})`),
  ];

  const prompt = `Perform a rigorous Brand Intelligence Analysis for this workspace.
CRITICAL EPISTEMIC RULE: You MUST strictly separate:
1. "verifiedFacts": ONLY statements directly supported by the workspace profile, uploaded brand documents, or permitted connected social account data provided below.
2. "assumptions": Any inferred positioning, market hypotheses, or audience assumptions that are NOT explicitly verified in the provided data.
NEVER fabricate testimonials, customer quotes, follower counts, or analytics numbers.

=== WORKSPACE BRAND PROFILE (VERIFIED INPUTS) ===
Brand Name: ${ctx.brand.brandName}
Industry: ${ctx.brand.industry || 'Not specified'}
Business Description: ${ctx.brand.businessDescription || 'Not specified'}
Products & Services: ${ctx.brand.productsServices || 'Not specified'}
Target Audience: ${ctx.brand.targetAudience || 'Not specified'}
Business Goals: ${ctx.brand.businessGoals || 'Not specified'}
Tone of Voice: ${ctx.brand.toneOfVoice}
Brand Tone Rules: ${ctx.brand.brandToneRules || 'None'}
Preferred Language: ${ctx.brand.preferredLanguage}

=== PERMITTED CONNECTED SOCIAL ACCOUNTS (${connectedSources.length}) ===
${connectedSources.length > 0 ? connectedSources.join('\n') : 'No connected social accounts yet.'}

=== RECENT WORKSPACE POSTS (${ctx.recentPosts.length}) ===
${ctx.recentPosts.map((p) => `- [${String(p.platform_key)}/${String(p.status)}] ${String(p.title)}: ${String(p.caption).slice(0, 180)}`).join('\n') || 'None'}

=== LIVE ANALYTICS SNAPSHOTS (${ctx.liveAnalytics.length}) ===
${ctx.liveAnalytics.length > 0 ? JSON.stringify(ctx.liveAnalytics.slice(0, 10)) : 'No live platform analytics synced yet.'}

=== UPLOADED BRAND MATERIALS & MEDIA (${uploadedSources.length}) ===
${uploadedSources.length > 0 ? uploadedSources.join('\n') : 'None uploaded yet.'}

=== ADDITIONAL USER NOTES ===
${params.additionalNotes || 'None'}`;

  const result = await runStructuredGeminiModule<{
    brandSummary: string;
    verifiedFacts: string[];
    assumptions: string[];
    audienceInsights: BrandAnalysisRecord['audienceInsights'];
    contentThemes: BrandAnalysisRecord['contentThemes'];
    voiceGuidelines: string[];
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'brand_analysis',
    systemInstruction:
      'You are an enterprise Brand Intelligence Analyst. Always distinguish verified facts from assumptions. Never invent data or promise guaranteed growth.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        brandSummary: { type: Type.STRING },
        verifiedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        audienceInsights: {
          type: Type.OBJECT,
          properties: {
            primarySegments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  buyingTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  preferredFormats: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['name', 'painPoints', 'buyingTriggers', 'preferredFormats'],
              },
            },
            evidenceStatus: { type: Type.STRING },
          },
          required: ['primarySegments', 'evidenceStatus'],
        },
        contentThemes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              theme: { type: Type.STRING },
              rationale: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['high', 'medium', 'supporting'] },
            },
            required: ['theme', 'rationale', 'priority'],
          },
        },
        voiceGuidelines: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['brandSummary', 'verifiedFacts', 'assumptions', 'audienceInsights', 'contentThemes', 'voiceGuidelines'],
    },
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ai_brand_analyses (
      id, workspace_id, user_id, brand_summary, verified_facts_json, assumptions_json,
      audience_insights_json, content_themes_json, voice_guidelines_json,
      connected_sources_json, uploaded_sources_json, model_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.workspaceId,
    params.userId,
    result.data.brandSummary,
    JSON.stringify(result.data.verifiedFacts || []),
    JSON.stringify(result.data.assumptions || []),
    JSON.stringify(result.data.audienceInsights || { primarySegments: [], evidenceStatus: '' }),
    JSON.stringify(result.data.contentThemes || []),
    JSON.stringify(result.data.voiceGuidelines || []),
    JSON.stringify(connectedSources),
    JSON.stringify(uploadedSources),
    result.modelUsed,
    now,
    now
  );

  const row = db.prepare('SELECT * FROM ai_brand_analyses WHERE id = ?').get(id) as Record<string, unknown>;
  return { analysis: mapBrandAnalysisRow(row), creditsRemaining: result.creditsRemaining };
}

export function listBrandAnalyses(db: DbInstance, workspaceId: string): BrandAnalysisRecord[] {
  const rows = db
    .prepare('SELECT * FROM ai_brand_analyses WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(mapBrandAnalysisRow);
}
