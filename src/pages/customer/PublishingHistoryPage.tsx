import React, { useCallback, useEffect, useState } from 'react';
import {
  History,
  RefreshCw,
  RotateCcw,
  Send,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { formatUtcInTimezone } from '../../utils/domain';
import type {
  PublishingAttemptRecord,
  PublishingQueueRecord,
  QueueJobStatus,
  WorkerHealthSummary,
} from '../../shared/api-contracts';

const STATUS_FILTERS: { id: 'all' | QueueJobStatus; label: string }[] = [
  { id: 'all', label: 'All Jobs' },
  { id: 'published', label: 'Published' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'queued', label: 'Queued' },
  { id: 'awaiting_approval', label: 'Awaiting Approval' },
  { id: 'failed', label: 'Failed / Dead-Letter' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const PublishingHistoryPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [jobs, setJobs] = useState<PublishingQueueRecord[]>([]);
  const [attempts, setAttempts] = useState<PublishingAttemptRecord[]>([]);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealthSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | QueueJobStatus>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await apiClient.getPublishingHistory(activeWorkspace.id);
      setJobs(res.jobs);
      setAttempts(res.attempts);
      setWorkerHealth(res.workerHealth);
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Unable to load publishing history.' });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleAction = async (jobId: string, action: 'retry' | 'cancel' | 'dispatch') => {
    if (!activeWorkspace) return;
    setBusyId(jobId);
    setBanner(null);
    try {
      if (action === 'retry') {
        await apiClient.retryPublishingQueueJob(activeWorkspace.id, jobId);
        setBanner({ type: 'success', text: 'Failed job reset and re-queued for the background publishing worker.' });
      } else if (action === 'cancel') {
        await apiClient.cancelPublishingQueueJob(activeWorkspace.id, jobId);
        setBanner({ type: 'success', text: 'Scheduled publishing job cancelled.' });
      } else {
        const res = await apiClient.dispatchPublishingQueueJobNow(activeWorkspace.id, jobId);
        setBanner({
          type: res.job.status === 'published' ? 'success' : 'error',
          text:
            res.job.status === 'published'
              ? `Published! Platform confirmation ID: ${res.job.platformPostId}`
              : `Dispatch result (${res.job.status}): ${res.job.lastError || 'Check attempt logs below.'}`,
        });
      }
      await loadHistory();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleWorkerTick = async () => {
    if (!activeWorkspace) return;
    setBusyId('worker-tick');
    setBanner(null);
    try {
      const res = await apiClient.triggerWorkerTick(activeWorkspace.id);
      setBanner({
        type: 'success',
        text: `Worker poll complete: ${res.processedCount} due job(s) processed (${res.publishedCount} published, ${res.failedCount} failed).`,
      });
      await loadHistory();
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Worker poll failed.' });
    } finally {
      setBusyId(null);
    }
  };

  const filteredJobs = statusFilter === 'all' ? jobs : jobs.filter((j) => j.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Publishing History & Worker Ledger</h2>
          <p className="mt-1 text-xs text-slate-500">
            Audit every automatic and approved publish attempt, inspect real platform API confirmations, and recover dead-letter or failed posts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busyId === 'worker-tick'}
            onClick={() => void handleWorkerTick()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
          >
            <Server className="h-3.5 w-3.5" />
            {busyId === 'worker-tick' ? 'Running Worker...' : 'Poll Due Jobs Now'}
          </button>
          <button
            type="button"
            onClick={() => void loadHistory()}
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

      {/* KPI Strip */}
      {workerHealth && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Published</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-700">{workerHealth.counts.published}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Scheduled / Queued</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-blue-700">
              {workerHealth.counts.scheduled + workerHealth.counts.queued}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Awaiting Approval</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-amber-600">
              {workerHealth.counts.awaiting_approval}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Failed / DLQ</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-rose-600">{workerHealth.deadLetterCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Total Attempts</p>
            <p className="mt-1 font-mono-tabular text-2xl font-bold text-slate-900">{attempts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-medium text-slate-500">Worker Engine</p>
            <p className="mt-1 text-xs font-bold text-slate-900">
              {workerHealth.embeddedWorkerRunning ? 'Autonomous Active' : 'Standalone Mode'}
            </p>
            <p className="text-[10px] text-slate-500">{workerHealth.queueBackend}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === f.id
                ? 'bg-blue-700 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Job & Attempt Ledger */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading publishing history...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-10 text-center">
            <History className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-800">No publishing records match this filter</p>
            <p className="mt-1 text-xs text-slate-500">
              Schedule posts from AI Content Studio, Graphic Designer, or Content Calendar to track real dispatch attempts here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredJobs.map((job) => {
              const jobAttempts = attempts.filter((a) => a.queueId === job.id);
              const isExpanded = expandedJobId === job.id;
              return (
                <div key={job.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {job.platformKey}
                        </span>
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {job.publishingMode === 'automatic' ? 'Auto-Publish' : 'Approval Mode'}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            job.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : job.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : job.status === 'awaiting_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                        {job.isDeadLetter && (
                          <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            DEAD-LETTER
                          </span>
                        )}
                        {job.recurrenceType !== 'none' && (
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Recurring: {job.recurrenceType}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-slate-900">{job.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{job.bodyText}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Scheduled: {formatUtcInTimezone(job.scheduledAt, job.timezone)}
                        </span>
                        <span>Attempts: {job.attemptCount}/{job.maxAttempts}</span>
                        {job.platformPostId && (
                          <span className="font-mono-tabular font-semibold text-emerald-700">
                            Platform ID: {job.platformPostId}
                          </span>
                        )}
                      </div>
                      {job.lastError && (
                        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                          {job.lastError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(job.status === 'scheduled' || job.status === 'queued') && (
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() => void handleAction(job.id, 'dispatch')}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          <Send className="h-3 w-3" />
                          Dispatch Now
                        </button>
                      )}
                      {(job.status === 'failed' || job.status === 'cancelled') && (
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() => void handleAction(job.id, 'retry')}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Recover & Retry
                        </button>
                      )}
                      {job.status !== 'published' && job.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() => void handleAction(job.id, 'cancel')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <XCircle className="h-3 w-3" />
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Logs ({jobAttempts.length})
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <p className="text-[11px] font-bold text-slate-700">
                        Attempt Execution Ledger · Idempotency Key: <code className="font-mono">{job.idempotencyKey}</code>
                      </p>
                      {jobAttempts.length === 0 ? (
                        <p className="text-xs text-slate-500">No worker execution attempts recorded yet.</p>
                      ) : (
                        jobAttempts.map((a) => (
                          <div key={a.id} className="rounded border border-slate-200 bg-white p-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">
                                Attempt #{a.attemptNumber} · {a.status} {a.httpStatus ? `(HTTP ${a.httpStatus})` : ''}
                              </span>
                              <span className="font-mono-tabular text-[11px] text-slate-500">
                                {new Date(a.startedAt).toLocaleString()} · {a.workerId}
                              </span>
                            </div>
                            {a.errorMessage && <p className="mt-1 text-rose-700">{a.errorMessage}</p>}
                            {a.apiResponse && (
                              <pre className="mt-1.5 overflow-x-auto rounded bg-slate-900 p-2 text-[10px] text-emerald-300">
                                {JSON.stringify(a.apiResponse, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
