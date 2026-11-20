import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Bot,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import type { EngagementMessageRecord, PlatformKey } from '../../shared/api-contracts';

const PLATFORMS: PlatformKey[] = [
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'x',
  'pinterest',
  'google_business',
];

export const EngagementManagerV3Page: React.FC = () => {
  const { activeWorkspace, refreshSession } = useAuth();
  const [messages, setMessages] = useState<EngagementMessageRecord[]>([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'escalated' | 'replied'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<Record<string, string | undefined>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add message form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState<PlatformKey>('instagram');
  const [newAuthor, setNewAuthor] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newContent, setNewContent] = useState('');

  const loadMessages = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await apiClient.getEngagementMessages(activeWorkspace.id);
      setMessages(res.messages);
      setAutoReplyEnabled(res.autoReplyEnabled);
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to load engagement inbox.' });
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleToggleAutoReply = async (next: boolean) => {
    if (!activeWorkspace) return;
    try {
      await apiClient.updateBrandIntelligence(activeWorkspace.id, { autoReplyEnabled: next });
      setAutoReplyEnabled(next);
      setBanner({
        type: 'success',
        text: next
          ? 'Automated replies enabled ONLY for non-escalated messages on permitted accounts. Sensitive comments still escalate to humans.'
          : 'Automated replies disabled — all AI-drafted replies require manual approval.',
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to update auto-reply setting.' });
    }
  };

  const handleSuggestReply = async (msgId: string) => {
    if (!activeWorkspace) return;
    setBusyId(`ai-${msgId}`);
    setBanner(null);
    try {
      const res = await apiClient.suggestEngagementReply(activeWorkspace.id, msgId);
      setReplyDrafts((prev) => ({ ...prev, [msgId]: res.suggestion.suggestedReply }));
      setSelectedSuggestionId((prev) => ({ ...prev, [msgId]: res.suggestion.id }));
      await loadMessages();
      await refreshSession();
      setBanner({
        type: 'success',
        text: res.suggestion.escalationRecommended
          ? `AI drafted a reply and flagged this message for human escalation (${res.suggestion.escalationReason}).`
          : `AI drafted an on-brand reply (${res.creditsRemaining.toLocaleString()} credits remaining). Review and approve to send.`,
      });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to draft AI reply.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleSendReply = async (msgId: string, mode: 'manual' | 'ai_approved' | 'ai_auto') => {
    if (!activeWorkspace) return;
    const text = (replyDrafts[msgId] || '').trim();
    if (!text) {
      setBanner({ type: 'error', text: 'Enter or generate a reply before sending.' });
      return;
    }
    setBusyId(`send-${msgId}`);
    setBanner(null);
    try {
      await apiClient.sendEngagementReply(activeWorkspace.id, msgId, {
        replyText: text,
        mode,
        suggestionId: selectedSuggestionId[msgId],
      });
      setBanner({ type: 'success', text: `Reply dispatched (${mode.replace('_', ' ')}) and logged in reply history.` });
      await loadMessages();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send reply.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleEscalate = async (msgId: string) => {
    if (!activeWorkspace) return;
    setBusyId(`esc-${msgId}`);
    try {
      await apiClient.escalateEngagementMessage(
        activeWorkspace.id,
        msgId,
        'Flagged by operator for senior human review.'
      );
      await loadMessages();
      setBanner({ type: 'success', text: 'Message escalated for human specialist review.' });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to escalate message.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newAuthor.trim() || !newContent.trim()) return;
    try {
      await apiClient.addEngagementMessage(activeWorkspace.id, {
        platformKey: newPlatform,
        messageType: 'comment',
        authorName: newAuthor.trim(),
        authorHandle: newHandle.trim() || `@${newAuthor.trim().toLowerCase().replace(/\s+/g, '')}`,
        content: newContent.trim(),
      });
      setNewAuthor('');
      setNewHandle('');
      setNewContent('');
      setShowAddForm(false);
      await loadMessages();
      setBanner({ type: 'success', text: 'Comment added to Engagement Manager.' });
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to log message.' });
    }
  };

  const filtered = filter === 'all' ? messages : messages.filter((m) => m.status === filter);
  const escalatedCount = messages.filter((m) => m.status === 'escalated' || m.requiresEscalation).length;
  const repliedCount = messages.filter((m) => m.status === 'replied').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Engagement Manager & AI Reply Desk</h2>
          <p className="mt-1 text-xs text-slate-500">
            Monitor permitted comments and mentions, draft AI-assisted responses, approve replies, escalate sensitive issues, and audit sent reply history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <Bot className="h-3.5 w-3.5 text-blue-600" />
            <span>Auto-Reply (Non-Escalated)</span>
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => void handleToggleAutoReply(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Comment
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={(e) => void handleAddMessage(e)} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-900">Record Incoming Social Comment / Inquiry</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value as PlatformKey)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              placeholder="Author Name"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              placeholder="@handle"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
            />
          </div>
          <textarea
            rows={2}
            required
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Paste customer comment or question..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Save to Inbox
            </button>
          </div>
        </form>
      )}

      {/* Filter & Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `All (${messages.length})` },
            { id: 'open', label: `Open (${messages.filter((m) => m.status === 'open').length})` },
            { id: 'escalated', label: `Escalated (${escalatedCount})` },
            { id: 'replied', label: `Sent History (${repliedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Platform compliance guard: prohibited automation is never executed; escalated legal/refund messages require human sign-off.
        </p>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-800">No messages in this queue</p>
          </div>
        ) : (
          filtered.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl border bg-white p-5 shadow-xs space-y-3 ${
                msg.requiresEscalation || msg.status === 'escalated'
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {msg.platformKey}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{msg.authorName}</span>
                    <span className="text-xs text-slate-500">{msg.authorHandle}</span>
                    {msg.isDemo && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Sample Inbox Item
                      </span>
                    )}
                    {(msg.requiresEscalation || msg.status === 'escalated') && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        <ShieldAlert className="h-3 w-3" />
                        Escalated for Human Review
                      </span>
                    )}
                    {msg.status === 'replied' && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Replied ({msg.repliedByMode || 'approved'})
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-800">{msg.content}</p>
                  {msg.escalationReason && (
                    <p className="mt-1.5 text-xs font-medium text-amber-800">
                      Escalation Reason: {msg.escalationReason}
                    </p>
                  )}
                </div>

                {msg.status !== 'replied' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === `ai-${msg.id}`}
                      onClick={() => void handleSuggestReply(msg.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {busyId === `ai-${msg.id}` ? 'Drafting...' : 'Draft AI Reply (2 cr)'}
                    </button>
                    {!msg.requiresEscalation && (
                      <button
                        type="button"
                        disabled={busyId === `esc-${msg.id}`}
                        onClick={() => void handleEscalate(msg.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Escalate
                      </button>
                    )}
                  </div>
                )}
              </div>

              {msg.status === 'replied' && msg.sentReplyText ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                    <History className="h-3.5 w-3.5" />
                    Sent Reply ({msg.repliedAt ? new Date(msg.repliedAt).toLocaleString() : 'Recorded'})
                  </p>
                  <p className="mt-1 text-xs text-slate-800">{msg.sentReplyText}</p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {msg.suggestions.length > 0 && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5 text-xs">
                      <p className="font-semibold text-blue-900">
                        Latest AI Suggestion ({msg.suggestions[0].tone})
                      </p>
                      <p className="mt-0.5 text-slate-700">{msg.suggestions[0].confidenceNote}</p>
                    </div>
                  )}
                  <textarea
                    rows={2}
                    value={replyDrafts[msg.id] ?? msg.suggestions[0]?.suggestedReply ?? ''}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                    placeholder="Write a reply or click 'Draft AI Reply' above..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    {autoReplyEnabled && !msg.requiresEscalation && (
                      <button
                        type="button"
                        disabled={busyId === `send-${msg.id}`}
                        onClick={() => void handleSendReply(msg.id, 'ai_auto')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        Dispatch Auto-Reply
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === `send-${msg.id}`}
                      onClick={() => void handleSendReply(msg.id, selectedSuggestionId[msg.id] ? 'ai_approved' : 'manual')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Approve & Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
