import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ToggleLeft,
  ToggleRight,
  Save,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Activity,
  Webhook,
  RefreshCw,
  ExternalLink,
  Minus,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import type {
  DeveloperReviewStatus,
  OAuthConnectionLogRecord,
  PlatformKey,
  PlatformSyncLogRecord,
  PlatformWebhookEventRecord,
  SocialPlatformInfo,
} from '../../shared/api-contracts';
import { CAPABILITY_ITEMS, PlatformLogo } from '../social/PlatformLogo';

interface AdminSocialPlatformsPanelProps {
  data: {
    platforms: SocialPlatformInfo[];
    stats: {
      platformKey: PlatformKey;
      displayName: string;
      isEnabled: boolean;
      totalAccounts: number;
      connectedAccounts: number;
      degradedAccounts: number;
    }[];
    recentConnectionLogs: OAuthConnectionLogRecord[];
    recentSyncLogs: PlatformSyncLogRecord[];
    recentWebhookEvents: PlatformWebhookEventRecord[];
  };
  onRefresh: () => Promise<void>;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}

interface PlatformDraft {
  clientIdOverride: string;
  developerReviewStatus: DeveloperReviewStatus;
  rateLimitRpm: number;
  scopes: string;
}

const PLATFORM_ORDER: PlatformKey[] = [
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'x',
  'pinterest',
  'google_business',
];

export const AdminSocialPlatformsPanel: React.FC<AdminSocialPlatformsPanelProps> = ({
  data,
  onRefresh,
  onNotice,
  onError,
}) => {
  const [drafts, setDrafts] = useState<Record<string, PlatformDraft>>({});
  const [savingKey, setSavingKey] = useState<PlatformKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<'oauth' | 'sync' | 'webhooks'>('oauth');
  const [expandedPermsKey, setExpandedPermsKey] = useState<PlatformKey | null>(null);

  const sortedPlatforms = [...data.platforms].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.key) - PLATFORM_ORDER.indexOf(b.key)
  );

  useEffect(() => {
    const next: Record<string, PlatformDraft> = {};
    for (const p of data.platforms) {
      next[p.key] = {
        clientIdOverride: '',
        developerReviewStatus: p.developerReviewStatus,
        rateLimitRpm: p.rateLimitRpm,
        scopes: p.scopes,
      };
    }
    setDrafts(next);
  }, [data.platforms]);

  const handleToggleEnabled = async (platform: SocialPlatformInfo) => {
    setSavingKey(platform.key);
    try {
      await apiClient.updateAdminPlatformConfig(platform.key, {
        isEnabled: !platform.isEnabled,
      });
      onNotice(`${platform.displayName} ${!platform.isEnabled ? 'enabled' : 'disabled'} globally.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to toggle platform.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSavePlatform = async (platform: SocialPlatformInfo) => {
    const draft = drafts[platform.key];
    if (!draft) return;
    setSavingKey(platform.key);
    try {
      const payload: Parameters<typeof apiClient.updateAdminPlatformConfig>[1] = {
        developerReviewStatus: draft.developerReviewStatus,
        rateLimitRpm: Math.max(10, Math.min(10000, Number(draft.rateLimitRpm) || 60)),
        scopes: draft.scopes,
      };
      if (draft.clientIdOverride.trim()) {
        payload.clientIdOverride = draft.clientIdOverride.trim();
      }
      await apiClient.updateAdminPlatformConfig(platform.key, payload);
      onNotice(`Saved configuration for ${platform.displayName}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save platform configuration.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleClearError = async (platform: SocialPlatformInfo) => {
    setSavingKey(platform.key);
    try {
      await apiClient.updateAdminPlatformConfig(platform.key, { clearLastError: true });
      onNotice(`Cleared last API error for ${platform.displayName}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to clear error.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleScopeApprovalChange = async (
    platformKey: PlatformKey,
    scopeKey: string,
    status: DeveloperReviewStatus
  ) => {
    setSavingKey(platformKey);
    try {
      await apiClient.updateAdminPlatformConfig(platformKey, {
        permissionApprovals: { [scopeKey]: status },
      });
      onNotice(`Updated review status for ${scopeKey} on ${platformKey}.`);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update permission status.');
    } finally {
      setSavingKey(null);
    }
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const totalConnected = data.stats.reduce((sum, s) => sum + s.connectedAccounts, 0);
  const totalDegraded = data.stats.reduce((sum, s) => sum + s.degradedAccounts, 0);
  const configuredCount = sortedPlatforms.filter((p) => p.oauthConfigured).length;
  const approvedCount = sortedPlatforms.filter((p) => p.developerReviewStatus === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Top Health KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Configured Providers</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-slate-900">
            {configuredCount} / {sortedPlatforms.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Secrets stored strictly in server env</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">App Review Approved</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-slate-900">
            {approvedCount} / {sortedPlatforms.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Production developer review status</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Connected Tenant Accounts</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-slate-900">{totalConnected}</p>
          <p className="mt-0.5 text-xs text-slate-500">Across all customer workspaces</p>
        </div>
        <div className="lt-neon-card rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Degraded / Expired Tokens</p>
          <p
            className={`mt-1.5 font-mono-tabular text-2xl font-bold ${
              totalDegraded > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {totalDegraded}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Requiring refresh or re-authorization</p>
        </div>
      </div>

      {/* Platform OAuth Configuration Cards */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Platform OAuth Configuration & Developer Review Governance
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage non-secret Client IDs, OAuth scopes, callback URLs, rate limits, and developer review tracking. Client Secrets are strictly read from server environment variables and never persisted in plaintext or sent to browsers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedPlatforms.map((platform) => {
            const stat = data.stats.find((s) => s.platformKey === platform.key);
            const draft = drafts[platform.key] || {
              clientIdOverride: '',
              developerReviewStatus: platform.developerReviewStatus,
              rateLimitRpm: platform.rateLimitRpm,
              scopes: platform.scopes,
            };
            const permsOpen = expandedPermsKey === platform.key;

            return (
              <div
                key={platform.id}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <PlatformLogo platformKey={platform.key} size="md" />
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-slate-900 leading-snug">
                        {platform.displayName}
                      </h3>
                      <p className="mt-0.5 truncate font-mono-tabular text-[10px] text-slate-500">
                        {platform.apiVersion}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {stat?.connectedAccounts ?? 0} active · {stat?.degradedAccounts ?? 0} degraded ·{' '}
                        <a
                          href={platform.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-blue-700 hover:underline"
                        >
                          API Docs <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={savingKey === platform.key}
                    onClick={() => void handleToggleEnabled(platform)}
                    aria-label={`Toggle ${platform.displayName} integration`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap"
                  >
                    {platform.isEnabled ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-emerald-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                {/* Credential & Health Badges */}
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[11px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-slate-500">Client ID:</span>
                    <span
                      className={`font-mono-tabular font-semibold ${
                        platform.clientIdConfigured ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {platform.clientIdConfigured ? platform.clientIdMasked || 'Set' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-slate-500">Env Secret:</span>
                    <span
                      className={`font-semibold ${
                        platform.clientSecretConfigured ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {platform.clientSecretConfigured ? 'Loaded (Server)' : 'Missing Env Var'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="text-slate-500">Required Env Keys:</span>
                    <span className="font-mono-tabular text-slate-800">{platform.envVarNames.join(', ')}</span>
                  </div>
                </div>

                {/* Callback URL */}
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Registered Callback URI
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(platform.key, platform.callbackUrl)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      {copiedKey === platform.key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedKey === platform.key ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-1 break-all font-mono-tabular text-[11px] text-slate-700">
                    {platform.callbackUrl}
                  </p>
                </div>

                {/* Editable Admin Configuration Fields */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`admin-review-${platform.key}`}
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      Developer Review Status
                    </label>
                    <select
                      id={`admin-review-${platform.key}`}
                      value={draft.developerReviewStatus}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [platform.key]: {
                            ...draft,
                            developerReviewStatus: e.target.value as DeveloperReviewStatus,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="not_submitted">Not Submitted (Sandbox)</option>
                      <option value="pending_review">Pending App Review</option>
                      <option value="approved">Approved (Production)</option>
                      <option value="action_required">Action Required</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`admin-rpm-${platform.key}`}
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      Rate Limit Guard (RPM)
                    </label>
                    <input
                      id={`admin-rpm-${platform.key}`}
                      type="number"
                      min={10}
                      max={10000}
                      value={draft.rateLimitRpm}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [platform.key]: {
                            ...draft,
                            rateLimitRpm: Number(e.target.value) || 60,
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-tabular text-xs text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`admin-clientid-${platform.key}`}
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      Public Client ID Override (optional — non-secret only)
                    </label>
                    <input
                      id={`admin-clientid-${platform.key}`}
                      type="text"
                      value={draft.clientIdOverride}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [platform.key]: {
                            ...draft,
                            clientIdOverride: e.target.value,
                          },
                        }))
                      }
                      placeholder={
                        platform.clientIdMasked
                          ? `Active: ${platform.clientIdMasked} (leave blank to keep)`
                          : 'Enter public Client ID / App ID...'
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono-tabular text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Last API Error Banner */}
                {platform.lastApiError && (
                  <div className="flex items-start justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{platform.lastApiError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleClearError(platform)}
                      className="shrink-0 font-semibold text-rose-900 underline"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Permissions Approval Accordion */}
                <div className="border-t border-slate-200/80 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedPermsKey(permsOpen ? null : platform.key)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-blue-700" />
                      {permsOpen ? 'Hide' : 'Manage'} Permissions ({platform.permissions.length})
                    </button>
                    <button
                      type="button"
                      disabled={savingKey === platform.key}
                      onClick={() => void handleSavePlatform(platform)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingKey === platform.key ? 'Saving...' : 'Save Config'}
                    </button>
                  </div>

                  {permsOpen && (
                    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      {platform.permissions.map((perm) => (
                        <div
                          key={perm.scopeKey}
                          className="flex flex-col gap-1.5 border-b border-slate-100 pb-2 last:border-none last:pb-0 sm:flex-row sm:items-center sm:justify-between text-[11px]"
                        >
                          <div className="min-w-0">
                            <p className="font-mono-tabular font-semibold text-slate-900">
                              {perm.scopeKey}
                              {perm.requiresAppReview && (
                                <span className="ml-1.5 font-sans text-[10px] font-medium text-amber-700">
                                  (App Review)
                                </span>
                              )}
                            </p>
                            <p className="text-slate-500">{perm.description}</p>
                          </div>
                          <select
                            aria-label={`Approval status for ${perm.scopeKey}`}
                            value={perm.approvalStatus}
                            onChange={(e) =>
                              void handleScopeApprovalChange(
                                platform.key,
                                perm.scopeKey,
                                e.target.value as DeveloperReviewStatus
                              )
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 shrink-0"
                          >
                            <option value="not_submitted">Not Submitted</option>
                            <option value="pending_review">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="action_required">Action Required</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Authoritative 8x10 Platform Capability Registry Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Authoritative Platform Capability Registry (8 Platforms × 10 Capabilities)
          </h2>
          <p className="text-xs text-slate-500">
            Enforced across AI Content Studio, Content Calendar, Auto Publisher, Engagement Manager, and Analytics. Unsupported formats are strictly blocked per official platform API rules.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Platform</th>
                {CAPABILITY_ITEMS.map((c) => (
                  <th key={c.key} className="px-2 py-2.5 text-center font-semibold whitespace-nowrap">
                    {c.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPlatforms.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <PlatformLogo platformKey={p.key} size="sm" />
                      <span>{p.displayName}</span>
                    </div>
                  </td>
                  {CAPABILITY_ITEMS.map((c) => {
                    const supported = p.capabilities[c.key];
                    return (
                      <td key={c.key} className="px-2 py-2.5 text-center">
                        {supported ? (
                          <span
                            title={`${p.displayName}: ${c.label} supported`}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span
                            title={`${p.displayName}: ${c.label} unsupported`}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                          >
                            <Minus className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Telemetry: OAuth Logs, Sync Logs, Webhook Events */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Integration Health, OAuth Audit & Webhook Telemetry
            </h2>
            <p className="text-xs text-slate-500">
              Live server-side logs across all workspaces. Tokens and secrets are automatically redacted.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveLogTab('oauth')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeLogTab === 'oauth' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              OAuth Logs ({data.recentConnectionLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLogTab('sync')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeLogTab === 'sync' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Logs ({data.recentSyncLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLogTab('webhooks')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                activeLogTab === 'webhooks' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Webhook className="h-3.5 w-3.5" />
              Webhooks ({data.recentWebhookEvents.length})
            </button>
          </div>
        </div>

        {activeLogTab === 'oauth' && (
          data.recentConnectionLogs.length === 0 ? (
            <p className="py-4 text-xs text-slate-500">No OAuth connection events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Platform</th>
                    <th className="py-2 px-3 font-semibold">Event</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3 font-semibold">Details</th>
                    <th className="py-2 pl-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentConnectionLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-3 font-mono-tabular font-semibold uppercase text-slate-800">
                        {log.platformKey}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-blue-800">{log.eventType}</td>
                      <td className="py-2.5 px-3 font-semibold capitalize">
                        <span
                          className={
                            log.status === 'success'
                              ? 'text-emerald-700'
                              : log.status === 'error'
                              ? 'text-rose-700'
                              : log.status === 'warning'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">{log.message}</td>
                      <td className="py-2.5 pl-3 text-right font-mono-tabular text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeLogTab === 'sync' && (
          data.recentSyncLogs.length === 0 ? (
            <p className="py-4 text-xs text-slate-500">No account synchronization runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Platform</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3 font-semibold">Items</th>
                    <th className="py-2 px-3 font-semibold">Error</th>
                    <th className="py-2 pl-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentSyncLogs.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3 font-mono-tabular font-semibold uppercase">{s.platformKey}</td>
                      <td className="py-2.5 px-3 capitalize">{s.syncType}</td>
                      <td className="py-2.5 px-3 font-semibold capitalize">{s.status}</td>
                      <td className="py-2.5 px-3 font-mono-tabular">{s.itemsSynced}</td>
                      <td className="py-2.5 px-3 text-rose-700 max-w-xs truncate">{s.errorMessage || '—'}</td>
                      <td className="py-2.5 pl-3 text-right font-mono-tabular text-slate-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeLogTab === 'webhooks' && (
          data.recentWebhookEvents.length === 0 ? (
            <div className="py-4 text-xs text-slate-500 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <span>
                No webhook deliveries received yet. Endpoint ready at{' '}
                <span className="font-mono-tabular text-slate-800">/api/webhooks/social/:platform</span>.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Platform</th>
                    <th className="py-2 px-3 font-semibold">Event Type</th>
                    <th className="py-2 px-3 font-semibold">Verified</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 pl-3 font-semibold text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentWebhookEvents.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2.5 pr-3 font-mono-tabular font-semibold uppercase">{w.platformKey}</td>
                      <td className="py-2.5 px-3 font-mono-tabular">{w.eventType}</td>
                      <td className="py-2.5 px-3">{w.verified ? 'Verified' : 'Unverified'}</td>
                      <td className="py-2.5 px-3 capitalize">{w.processedStatus}</td>
                      <td className="py-2.5 pl-3 text-right font-mono-tabular text-slate-400">
                        {new Date(w.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
