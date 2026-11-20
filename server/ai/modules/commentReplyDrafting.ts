import { Type } from '@google/genai';
import crypto from 'node:crypto';
import type { DbInstance } from '../../db/database';
import type { AiReplySuggestionRecord, PlatformKey } from '../../../src/shared/api-contracts';
import { evaluateContentSafety } from '../../services/contentSafetyService';
import { loadPermittedWorkspaceContext, runStructuredGeminiModule } from '../geminiClient';

const SENSITIVE_ESCALATION_PATTERNS = [
  /\b(lawsuit|legal|attorney|lawyer|sue|gdpr|data\s+breach|hacked|fraud|scam)\b/i,
  /\b(refund|chargeback|unauthorized\s+charge|billing\s+error|cancel\s+my\s+subscription)\b/i,
  /\b(harassment|discrimination|hate\s+speech|threat|emergency|medical\s+issue)\b/i,
];

export function detectEscalationHeuristic(messageText: string): { escalate: boolean; reason: string | null } {
  for (const rx of SENSITIVE_ESCALATION_PATTERNS) {
    if (rx.test(messageText)) {
      return {
        escalate: true,
        reason: 'Message contains sensitive legal, billing, dispute, or crisis terminology requiring human review before responding.',
      };
    }
  }
  return { escalate: false, reason: null };
}

export function mapReplySuggestionRow(r: Record<string, unknown>): AiReplySuggestionRecord {
  return {
    id: String(r.id),
    workspaceId: String(r.workspace_id),
    engagementMessageId: String(r.engagement_message_id),
    suggestedReply: String(r.suggested_reply),
    tone: String(r.tone || 'Helpful & Professional'),
    confidenceNote: String(r.confidence_note || ''),
    escalationRecommended: Boolean(r.escalation_recommended),
    escalationReason: r.escalation_reason ? String(r.escalation_reason) : null,
    safetyPassed: Boolean(r.safety_passed),
    status: String(r.status) as AiReplySuggestionRecord['status'],
    modelName: String(r.model_name || 'gemini-3.5-flash-lite'),
    createdAt: String(r.created_at),
  };
}

export async function runCommentReplyDraftingModule(
  db: DbInstance,
  params: {
    workspaceId: string;
    userId: string;
    engagementMessageId: string;
    platformKey: PlatformKey;
    authorName: string;
    messageContent: string;
    desiredTone?: string;
  }
): Promise<{ suggestion: AiReplySuggestionRecord; creditsRemaining: number }> {
  const ctx = loadPermittedWorkspaceContext(db, params.workspaceId);
  const heuristic = detectEscalationHeuristic(params.messageContent);

  const prompt = `Draft a helpful, polite, on-brand social media reply to this customer message on ${params.platformKey.toUpperCase()}.
Brand: ${ctx.brand.brandName}
Brand Voice: ${params.desiredTone || ctx.brand.toneOfVoice}
Brand Tone Rules: ${ctx.brand.brandToneRules || 'Stay concise, courteous, and factual.'}
Banned Words: ${ctx.brand.bannedWords.join(', ') || 'None'}
Customer Name: ${params.authorName}
Customer Message: "${params.messageContent}"

ESCALATION RULE:
Set escalationRecommended=true if the message involves refunds, legal threats, privacy/security complaints, angry escalations, or complex custom pricing/contract negotiations that should be verified by a human team member before sending.`;

  const result = await runStructuredGeminiModule<{
    suggestedReply: string;
    tone: string;
    confidenceNote: string;
    escalationRecommended: boolean;
    escalationReason: string;
  }>(db, {
    workspaceId: params.workspaceId,
    userId: params.userId,
    moduleKey: 'comment_reply_drafting',
    systemInstruction:
      'You are a senior community manager drafting compliant, empathetic, on-brand replies. Never make unauthorized refund or legal promises.',
    prompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        suggestedReply: { type: Type.STRING },
        tone: { type: Type.STRING },
        confidenceNote: { type: Type.STRING },
        escalationRecommended: { type: Type.BOOLEAN },
        escalationReason: { type: Type.STRING },
      },
      required: ['suggestedReply', 'tone', 'confidenceNote', 'escalationRecommended', 'escalationReason'],
    },
  });

  const shouldEscalate = heuristic.escalate || Boolean(result.data.escalationRecommended);
  const escalationReason = heuristic.reason || (result.data.escalationRecommended ? result.data.escalationReason : null);

  const safety = evaluateContentSafety(db, {
    workspaceId: params.workspaceId,
    platformKey: params.platformKey,
    bodyText: result.data.suggestedReply,
    checkDuplicate: false,
    checkFrequencyLimit: false,
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO ai_reply_suggestions (
        id, workspace_id, engagement_message_id, user_id, suggested_reply, tone, confidence_note,
        escalation_recommended, escalation_reason, safety_passed, status, model_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested', ?, ?, ?)`
    ).run(
      id,
      params.workspaceId,
      params.engagementMessageId,
      params.userId,
      result.data.suggestedReply.trim(),
      result.data.tone.trim(),
      result.data.confidenceNote.trim(),
      shouldEscalate ? 1 : 0,
      escalationReason,
      safety.status === 'blocked' ? 0 : 1,
      result.modelUsed,
      now,
      now
    );

    if (shouldEscalate) {
      db.prepare(
        `UPDATE engagement_messages
         SET requires_escalation = 1, escalation_reason = ?, status = CASE WHEN status = 'open' THEN 'escalated' ELSE status END, updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      ).run(escalationReason, now, params.engagementMessageId, params.workspaceId);
    }
  })();

  const stored = db.prepare('SELECT * FROM ai_reply_suggestions WHERE id = ?').get(id) as Record<string, unknown>;
  return {
    suggestion: mapReplySuggestionRow(stored),
    creditsRemaining: result.creditsRemaining,
  };
}
