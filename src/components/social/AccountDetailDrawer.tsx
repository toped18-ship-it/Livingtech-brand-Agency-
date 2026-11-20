import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  KeyRound,
  Sliders,
  Activity,
  Check,
  Minus,
  ExternalLink,
  Save,
} from 'lucide-react';
import type {
  SocialAccountDetailPayload,
  SocialAccountPublishingPreferences,
} from '../../shared/api-contracts';
import { ACCOUNT_TYPE_LABELS, CAPABILITY_ITEMS, PlatformLogo } from './PlatformLogo';

export type AccountDrawerTab = 'overview' | 'capabilities' | 'permissions' | 'preferences' | 'logs';

interface AccountDetailDrawerProps {
  detail: SocialAccountDetailPayload;
  initialTab: AccountDrawerTab;
  busyAction: string | null;
  onClose: () => void;
  onSync: () => Promise<void>;
  onRefreshToken: () => Promise<void>;
  onVerifyToken: () => Promise<void>;
  onReconnect: () => Promise<void>;
  onSavePreferences: (prefs: SocialAccountPublishingPreferences) => Promise<void>;
}

export const AccountDetailDrawer: React.FC<AccountDetailDrawerProps> = ({
  detail,
  initialTab,
  busyAction,
  onClose,
  onSync,
  onRefreshToken,
  onVerifyToken,
  onReconnect,
  onSavePreferences,
}) => {
  const { account, platform, recentSyncLogs, recentConnectionLogs } = detail;
  const [tab, setTab] = useState<AccountDrawerTab>(initialTab);
  const [prefs, setPrefs] = useState<SocialAccountPublishingPreferences>(account.publishingPreferences);
  const [hashtagsRaw, setHashtagsRaw] = useState(account.publishingPreferences.defaultHashtags.join(', '));
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, account.id]);

  useEffect(() => {
    setPrefs(account.publishingPreferences);
    setHashtagsRaw(account.publishingPreferences.defaultHashtags.join(', '));
  }, [account]);

  const handlePrefsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const cleanedHashtags = hashtagsRaw
        .split(/[,\s]+/)
        .map((h) => h.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith('#') ? h : `#${h}`))
        .slice(0, 15);
      await onSavePreferences({
        ...prefs,
        defaultHashtags: cleanedHashtags,
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-detail-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs"
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {account.avatarUrl ? (
              <img
                src={account.avatarUrl}
                alt={account.accountName}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full border border-slate-200 object-cover shrink-0"
              />
            ) : (
              <PlatformLogo platformKey={account.platformKey} size="lg" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="account-detail-title" className="truncate font-display text-lg font-bold text-slate-900">
                  {account.accountName}
                </h2>
              </div>
              <p className="truncate text-xs text-slate-500">
                <span className="font-mono-tabular">{account.accountHandle}</span> · {account.platformName} ·{' '}
                {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account details drawer"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'capabilities', label: 'Capabilities' },
              { id: 'permissions', label: 'Permissions & Token' },
              { id: 'preferences', label: 'Publishing Preferences' },
              { id: 'logs', label: 'Sync & Audit Logs' },
            ] as { id: AccountDrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Connection Status</p>
                  <p
                    className={`mt-1 font-display text-sm font-bold capitalize ${
                      account.connectionStatus === 'connected'
                        ? 'text-emerald-700'
                        : account.connectionStatus === 'expired'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {account.connectionStatus}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Permissions</p>
                  <p
                    className={`mt-1 font-display text-sm font-bold capitalize ${
                      account.permissionsStatus === 'granted'
                        ? 'text-emerald-700'
                        : account.permissionsStatus === 'partial'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {account.permissionsStatus}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Followers / Subscribers</p>
                  <p className="mt-1 font-mono-tabular text-sm font-bold text-slate-900">
                    {account.followersCount !== null ? account.followersCount.toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <h3 className="font-display text-sm font-bold text-slate-900">Account Metadata</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                  <div>
                    <span className="text-slate-500">External Account ID:</span>{' '}
                    <span className="font-mono-tabular text-slate-800">{account.externalAccountId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>{' '}
                    <span className="text-slate-800">{account.businessCategory || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Connected By:</span>{' '}
                    <span className="text-slate-800">{account.connectedByName || account.connectedByEmail || 'Workspace Member'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Last Synchronized:</span>{' '}
                    <span className="text-slate-800">
                      {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">API Version:</span>{' '}
                    <span className="font-mono-tabular text-slate-800">{platform.apiVersion}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Token Encryption:</span>{' '}
                    <span className="font-mono-tabular text-emerald-700">AES-256-GCM (Server-side)</span>
                  </div>
                </div>
                {account.accountDescription && (
                  <p className="pt-2 border-t border-slate-100 text-slate-600">{account.accountDescription}</p>
                )}
                {account.lastError && (
                  <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                    Last API Error: {account.lastError}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void onSync()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busyAction === 'sync' ? 'animate-spin' : ''}`} />
                  {busyAction === 'sync' ? 'Synchronizing...' : 'Sync Account Information'}
                </button>
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => void onReconnect()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Reconnect via OAuth
                </button>
              </div>
            </div>
          )}

          {tab === 'capabilities' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Official API Capability Matrix ({account.platformName})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Only officially supported {account.platformName} API capabilities are enabled for publishing and analytics workflows.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CAPABILITY_ITEMS.map((item) => {
                  const enabled = account.capabilities[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs ${
                        enabled
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        {enabled ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Supported
                          </>
                        ) : (
                          <>
                            <Minus className="h-3.5 w-3.5 text-slate-400" />
                            Unsupported
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {account.capabilities.notes && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-950">
                  <span className="font-semibold">Official API Policy Note:</span> {account.capabilities.notes}
                </div>
              )}
            </div>
          )}

          {tab === 'permissions' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-700" />
                    <h3 className="font-display text-sm font-bold text-slate-900">Token Vault & Health</h3>
                  </div>
                  <span className="font-mono-tabular text-[11px] font-semibold text-emerald-700">
                    {account.tokenVaultStatus === 'encrypted_aes256_gcm' ? 'AES-256-GCM Encrypted' : 'Missing Token'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    Expires:{' '}
                    <span className="font-mono-tabular text-slate-900">
                      {account.tokenExpiresAt ? new Date(account.tokenExpiresAt).toLocaleString() : 'Long-lived / Non-expiring'}
                    </span>
                  </div>
                  <div>
                    Refresh Token:{' '}
                    <span className="font-semibold text-slate-900">
                      {account.hasRefreshToken ? 'Stored Encrypted' : platform.supportsRefresh ? 'Re-authorize to obtain' : 'Not issued by platform'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void onVerifyToken()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                    {busyAction === 'verify' ? 'Verifying...' : 'Verify Token Health'}
                  </button>
                  {platform.supportsRefresh && (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void onRefreshToken()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${busyAction === 'refresh' ? 'animate-spin' : ''}`} />
                      {busyAction === 'refresh' ? 'Refreshing...' : 'Refresh OAuth Token'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void onReconnect()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Re-authorize Permissions
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                <h3 className="font-display text-sm font-bold text-slate-900">Platform Permission Audit</h3>
                <div className="divide-y divide-slate-100">
                  {platform.permissions.map((perm) => {
                    const granted = account.grantedScopes.includes(perm.scopeKey);
                    return (
                      <div key={perm.scopeKey} className="flex items-start justify-between gap-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono-tabular font-semibold text-slate-900">{perm.scopeKey}</span>
                            {perm.isRequired && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                                Required
                              </span>
                            )}
                            {perm.requiresAppReview && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                App Review
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-slate-500">{perm.description}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                            granted ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {granted ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                          {granted ? 'Granted' : 'Missing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'preferences' && (
            <form onSubmit={(e) => void handlePrefsSubmit(e)} className="space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-700" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Account-Specific Publishing Preferences
                </h3>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="flex items-center justify-between gap-3 text-xs">
                  <span>
                    <span className="font-semibold text-slate-900 block">Enable Auto-Publishing</span>
                    <span className="text-slate-500">Allow scheduled posts to publish automatically to this account.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.autoPublishEnabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, autoPublishEnabled: e.target.checked }))}
                    className="h-4 w-4 accent-blue-700"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                  <span>
                    <span className="font-semibold text-slate-900 block">Require Approval Before Publish</span>
                    <span className="text-slate-500">Hold queued posts in Pending state until a workspace admin approves.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={prefs.requireApprovalBeforePublish}
                    onChange={(e) => setPrefs((p) => ({ ...p, requireApprovalBeforePublish: e.target.checked }))}
                    className="h-4 w-4 accent-blue-700"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pref-visibility" className="block text-xs font-semibold text-slate-700">
                      Default Visibility
                    </label>
                    <select
                      id="pref-visibility"
                      value={prefs.defaultVisibility}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          defaultVisibility: e.target.value as 'public' | 'connections' | 'unlisted',
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="public">Public</option>
                      <option value="connections">Connections / Followers Only</option>
                      <option value="unlisted">Unlisted / Private Draft</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-daily-limit" className="block text-xs font-semibold text-slate-700">
                      Daily Post Cap (1–100)
                    </label>
                    <input
                      id="pref-daily-limit"
                      type="number"
                      min={1}
                      max={100}
                      value={prefs.dailyPostLimit}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, dailyPostLimit: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-tabular"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pref-timezone" className="block text-xs font-semibold text-slate-700">
                    Account Publishing Timezone
                  </label>
                  <input
                    id="pref-timezone"
                    type="text"
                    value={prefs.defaultTimezone}
                    onChange={(e) => setPrefs((p) => ({ ...p, defaultTimezone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    placeholder="UTC or America/New_York"
                  />
                </div>

                <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={prefs.appendDefaultHashtags}
                    onChange={(e) => setPrefs((p) => ({ ...p, appendDefaultHashtags: e.target.checked }))}
                    className="h-4 w-4 accent-blue-700"
                  />
                  Automatically append brand hashtags to posts on this account
                </label>

                <div>
                  <label htmlFor="pref-hashtags" className="block text-xs font-semibold text-slate-700">
                    Default Hashtags (comma or space separated)
                  </label>
                  <input
                    id="pref-hashtags"
                    type="text"
                    value={hashtagsRaw}
                    onChange={(e) => setHashtagsRaw(e.target.value)}
                    placeholder="#LivingTech, #BrandGrowth"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPrefs}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                <Save className="h-3.5 w-3.5" />
                {savingPrefs ? 'Saving Preferences...' : 'Save Publishing Preferences'}
              </button>
            </form>
          )}

          {tab === 'logs' && (
            <div className="space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-900">
                  <Activity className="h-4 w-4 text-blue-700" />
                  Recent Data Synchronizations ({recentSyncLogs.length})
                </h3>
                {recentSyncLogs.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No synchronization runs recorded yet.</p>
                ) : (
                  <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {recentSyncLogs.map((log) => (
                      <div key={log.id} className="px-4 py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 capitalize">
                            {log.syncType} sync ·{' '}
                            <span
                              className={
                                log.status === 'succeeded'
                                  ? 'text-emerald-700'
                                  : log.status === 'rate_limited'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }
                            >
                              {log.status}
                            </span>
                          </span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600">
                          Items synced: {log.itemsSynced}
                          {log.rateLimitRemaining !== null ? ` · Rate limit remaining: ${log.rateLimitRemaining}` : ''}
                        </p>
                        {log.errorMessage && <p className="mt-0.5 text-rose-700">{log.errorMessage}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  OAuth Authorization Audit Events ({recentConnectionLogs.length})
                </h3>
                {recentConnectionLogs.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No OAuth events recorded for this account.</p>
                ) : (
                  <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {recentConnectionLogs.map((ev) => (
                      <div key={ev.id} className="px-4 py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-semibold text-slate-900">{ev.eventType}</span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {new Date(ev.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600">{ev.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
