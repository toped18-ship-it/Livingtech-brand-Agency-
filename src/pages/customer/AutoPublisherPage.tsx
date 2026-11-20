import React, { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Server,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Sliders,
  ClipboardCheck,
  Clock,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { formatUtcInTimezone } from '../../utils/domain';
import type {
  BrandIntelligenceProfile,
  ContentApprovalRecord,
  PublishingQueueRecord,
  SocialAccountRecord,
  WorkerHealthSummary,
} from '../../shared/api-contracts';

export const AutoPublisherPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<PublishingQueueRecord[]>([]);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealthSummary | null>(null);
  const [approvals, setApprovals] = useState<ContentApprovalRecord[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandIntelligenceProfile | null>(null);
  const [bannedWordsCsv, setBannedWordsCsv] = useState('');
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(8);
  const [toneRules, setToneRules] = useState('');

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const [queueRes, approvalsRes, accRes, intelRes] = await Promise.all([
        apiClient.getPublishingQueue(activeWorkspace.id),
        apiClient.getApprovals(activeWorkspace.id),
        apiClient.getSocialAccounts(activeWorkspace.id),
        apiClient.getBrandIntelligence(activeWorkspace.id),
      ]);
      setJobs(queueRes.jobs);
      setWorkerHealth(queueRes.workerHealth);
      setApprovals(approvalsRes.approvals);
      setAccounts(accRes.accounts);
      setBrandProfile(intelRes.profile);
      setBannedWordsCsv((intelRes.profile.bannedWords || []).join(', '));
      setMaxPostsPerDay(intelRes.profile.maxPostsPerDay || 8);
      setToneRules(intelRes.profile.brandToneRules || '');
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load Auto Publisher engine status.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleWorkerTick = async () => {
    if (!activeWorkspace) return;
    setBusyId('tick');
    setBanner(null);
    try {
      const res = await apiClient.triggerWorkerTick(activeWorkspace.id);
      setBanner({
        type: 'success',
        text: `Background worker processed ${res.processedCount} due job(s): ${res.publishedCount} published, ${res.failedCount} failed.`,
      });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Worker poll failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAccountMode = async (
    account: SocialAccountRecord,
    patch: Partial<SocialAccountRecord['publishingPreferences']>
  ) => {
    if (!activeWorkspace) return;
    setBusyId(`acc-${account.id}`);
    setBanner(null);
    try {
      await apiClient.updateSocialAccountPreferences(activeWorkspace.id, account.id, {
        ...account.publishingPreferences,
        ...patch,
      });
      setBanner({
        type: 'success',
        text: `Updated publishing settings for ${account.accountName}.`,
      });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to update account settings.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleApprovalDecision = async (
    approvalId: string,
    decision: 'approved' | 'rejected' | 'changes_requested'
  ) => {
    if (!activeWorkspace) return;
    setBusyId(`app-${approvalId}`);
    setBanner(null);
    try {
      await apiClient.decideApproval(activeWorkspace.id, approvalId, decision, reviewNotes[approvalId] || '');
      setBanner({
        type: 'success',
        text:
          decision === 'approved'
            ? 'Post approved and released into the Automatic Publishing Queue.'
            : `Approval marked as ${decision.replace('_', ' ')}.`,
      });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Approval action failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleJobAction = async (jobId: string, action: 'dispatch' | 'retry' | 'cancel') => {
    if (!activeWorkspace) return;
    setBusyId(jobId);
    setBanner(null);
    try {
      if (action === 'dispatch') {
        const res = await apiClient.dispatchPublishingQueueJobNow(activeWorkspace.id, jobId);
        setBanner({
          type: res.job.status === 'published' ? 'success' : 'error',
          text:
            res.job.status === 'published'
              ? `Published with real platform confirmation ID: ${res.job.platformPostId}`
              : `Dispatch ended with status "${res.job.status}": ${res.job.lastError || 'See Publishing History.'}`,
        });
      } else if (action === 'retry') {
        await apiClient.retryPublishingQueueJob(activeWorkspace.id, jobId);
        setBanner({ type: 'success', text: 'Failed job re-queued for background execution.' });
      } else {
        await apiClient.cancelPublishingQueueJob(activeWorkspace.id, jobId);
        setBanner({ type: 'success', text: 'Job cancelled.' });
      }
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Queue action failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSafetyPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !brandProfile) return;
    setBusyId('safety-save');
    setBanner(null);
    try {
      await apiClient.updateBrandIntelligence(activeWorkspace.id, {
        bannedWords: bannedWordsCsv
          .split(/[,\n]+/)
          .map((w) => w.trim())
          .filter(Boolean),
        maxPostsPerDay,
        brandToneRules: toneRules,
      });
      setBanner({ type: 'success', text: 'Workspace Content Safety & daily frequency guardrails saved.' });
      await loadAll();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update safety policy.' });
    } finally {
      setBusyId(null);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.decision === 'pending');
  const activeQueueJobs = jobs.filter((j) =>
    ['scheduled', 'queued', 'processing', 'awaiting_approval', 'failed'].includes(j.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Auto Publisher & Pre-Publishing Controls
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Default publishing mode is <strong>Automatic</strong> via the autonomous background worker. Optionally require manual approval per connected account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busyId === 'tick'}
            onClick={() => void handleWorkerTick()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            <Server className="h-3.5 w-3.5" />
            {busyId === 'tick' ? 'Polling Worker...' : 'Poll Due Jobs Now'}
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
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

      {/* Worker Health Strip */}
      {workerHealth && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Background Worker</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">
              {workerHealth.embeddedWorkerRunning ? 'Active (Autonomous)' : 'Standalone Ready'}
            </p>
            <p className="text-[10px] text-slate-400">
              Poll every {Math.round(workerHealth.pollIntervalMs / 1000)}s
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Scheduled / Queued</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-blue-700">
              {workerHealth.counts.scheduled + workerHealth.counts.queued}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Pending Approvals</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-amber-600">
              {pendingApprovals.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Published Total</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-700">
              {workerHealth.counts.published}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Dead-Letter / Failed</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-rose-600">
              {workerHealth.deadLetterCount}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Loading Auto Publisher engine...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left 7 cols: Approvals + Active Queue */}
          <div className="xl:col-span-7 space-y-6">
            {/* Pre-Publishing Approval Queue */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pre-Publishing Approval Queue ({pendingApprovals.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">Posts held before automatic dispatch</span>
              </div>

              {pendingApprovals.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  No posts are currently awaiting approval. Accounts in Automatic Mode publish directly on schedule.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((app) => (
                    <div key={app.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          {app.platformKey || 'social'} · Pending Review
                        </span>
                        {app.scheduledAt && (
                          <span className="text-[11px] text-slate-500">
                            Target: {new Date(app.scheduledAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900">{app.queueTitle || 'Scheduled Post'}</p>
                      {app.bodyText && <p className="line-clamp-3 text-xs text-slate-700">{app.bodyText}</p>}
                      <input
                        type="text"
                        value={reviewNotes[app.id] || ''}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [app.id]: e.target.value })}
                        placeholder="Optional reviewer note..."
                        className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === `app-${app.id}`}
                          onClick={() => void handleApprovalDecision(app.id, 'approved')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve & Release to Queue
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `app-${app.id}`}
                          onClick={() => void handleApprovalDecision(app.id, 'changes_requested')}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
                        >
                          Request Changes
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `app-${app.id}`}
                          onClick={() => void handleApprovalDecision(app.id, 'rejected')}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Queue & Recurring Jobs */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Active Publishing Queue ({activeQueueJobs.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">Durable SQLite/Redis-Ready Queue</span>
              </div>

              {activeQueueJobs.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No active scheduled or failed publishing jobs right now.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeQueueJobs.map((job) => (
                    <div key={job.id} className="py-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {job.platformKey}
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {job.publishingMode === 'automatic' ? 'Automatic' : 'Approval Mode'}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              job.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : job.status === 'awaiting_approval'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {job.status.replace('_', ' ')}
                          </span>
                          {job.recurrenceType !== 'none' && (
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              Recurring: {job.recurrenceType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(job.status === 'scheduled' || job.status === 'queued') && (
                            <button
                              type="button"
                              disabled={busyId === job.id}
                              onClick={() => void handleJobAction(job.id, 'dispatch')}
                              className="rounded bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-800"
                            >
                              Dispatch Now
                            </button>
                          )}
                          {job.status === 'failed' && (
                            <button
                              type="button"
                              disabled={busyId === job.id}
                              onClick={() => void handleJobAction(job.id, 'retry')}
                              className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Retry
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === job.id}
                            onClick={() => void handleJobAction(job.id, 'cancel')}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{job.title}</p>
                      <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        Next Run: {formatUtcInTimezone(job.nextRunAt, job.timezone)} · Attempts {job.attemptCount}/{job.maxAttempts}
                      </p>
                      {job.lastError && (
                        <p className="rounded bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-800">{job.lastError}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols: Connected Account Modes & Content Safety Policy */}
          <div className="xl:col-span-5 space-y-6">
            {/* Account-Level Publishing Settings */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Connected Account Publishing Modes ({accounts.length})
                </h3>
              </div>

              {accounts.length === 0 ? (
                <p className="py-4 text-xs text-slate-500">
                  Connect social media accounts under Social Accounts to configure per-account Automatic vs. Approval modes and daily frequency caps.
                </p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((acc) => {
                    const requireApproval = acc.publishingPreferences.requireApprovalBeforePublish;
                    return (
                      <div key={acc.id} className="rounded-lg border border-slate-200 p-3.5 space-y-2.5 overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">{acc.accountName}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {acc.platformName} · {acc.accountHandle}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${
                              requireApproval ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {requireApproval ? 'Approval Required' : 'Automatic'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
                            <input
                              type="checkbox"
                              disabled={busyId === `acc-${acc.id}`}
                              checked={requireApproval}
                              onChange={(e) =>
                                void handleToggleAccountMode(acc, {
                                  requireApprovalBeforePublish: e.target.checked,
                                  autoPublishEnabled: !e.target.checked,
                                })
                              }
                            />
                            Require manual approval before publishing
                          </label>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            Cap: {acc.publishingPreferences.dailyPostLimit}/day
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Workspace Content Safety Guardrails */}
            <form
              onSubmit={handleSaveSafetyPolicy}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">Content Safety & Anti-Spam Guardrails</h3>
              </div>
              <p className="text-[11px] text-slate-500">
                Automatically enforced prior to scheduling and dispatch: blocks banned words, guaranteed-growth misleading claims, 72-hour duplicate posts, and daily spam caps.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Banned Words (comma-separated)</label>
                <input
                  type="text"
                  value={bannedWordsCsv}
                  onChange={(e) => setBannedWordsCsv(e.target.value)}
                  placeholder="guaranteed viral, get rich quick, competitor-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Max Posts Per Day (Workspace)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxPostsPerDay}
                  onChange={(e) => setMaxPostsPerDay(Number(e.target.value) || 8)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Brand Tone Guardrails</label>
                <textarea
                  rows={2}
                  value={toneRules}
                  onChange={(e) => setToneRules(e.target.value)}
                  placeholder="Keep claims grounded in verified product capabilities."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === 'safety-save'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {busyId === 'safety-save' ? 'Saving...' : 'Save Safety Policy'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
