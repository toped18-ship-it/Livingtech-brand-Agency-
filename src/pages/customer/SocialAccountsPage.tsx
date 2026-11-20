import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Unlink,
  RefreshCw,
  Eye,
  Clock,
  RotateCcw,
  Sliders,
  Share2,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { openOAuthFlow } from '../../lib/oauthPopup';
import { useAuth } from '../../context/AuthContext';
import type {
  OAuthConnectionLogRecord,
  OAuthDiscoverySession,
  PlatformKey,
  SocialAccountDetailPayload,
  SocialAccountPublishingPreferences,
  SocialAccountRecord,
  SocialPlatformInfo,
} from '../../shared/api-contracts';
import {
  ACCOUNT_TYPE_LABELS,
  PlatformLogo,
  summarizeAnalyticsCapabilities,
  summarizePublishingCapabilities,
} from '../../components/social/PlatformLogo';
import { AccountDiscoveryModal } from '../../components/social/AccountDiscoveryModal';
import {
  AccountDetailDrawer,
  type AccountDrawerTab,
} from '../../components/social/AccountDetailDrawer';

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

const PLATFORM_DESCRIPTIONS: Record<PlatformKey, string> = {
  facebook: 'Publish media updates, schedule campaigns, and monitor reach.',
  instagram: 'Publish photos, carousels, reels, and stories.',
  tiktok: 'Publish short-form video content and track engagement.',
  linkedin: 'Share professional insights and company updates.',
  youtube: 'Publish video content and track subscriber metrics.',
  x: 'Post announcements, threads, and real-time updates.',
  pinterest: 'Publish idea pins, boards, and visual content.',
  google_business: 'Publish local announcements, updates, and offers.',
};

export const SocialAccountsPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccountRecord[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatformInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingKey, setConnectingKey] = useState<PlatformKey | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [confirmDisconnectId, setConfirmDisconnectId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformKey | 'all'>('all');
  const [notice, setNotice] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);

  // Discovery session
  const [discoverySession, setDiscoverySession] = useState<OAuthDiscoverySession | null>(null);
  const [connectingSelected, setConnectingSelected] = useState(false);

  // Account details drawer
  const [activeDetail, setActiveDetail] = useState<SocialAccountDetailPayload | null>(null);
  const [drawerTab, setDrawerTab] = useState<AccountDrawerTab>('overview');
  const [drawerBusy, setDrawerBusy] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await apiClient.getSocialAccounts(activeWorkspace.id);
      setAccounts(res.accounts);
      const sorted = [...res.platforms].sort(
        (a, b) => PLATFORM_ORDER.indexOf(a.key) - PLATFORM_ORDER.indexOf(b.key)
      );
      setPlatforms(sorted);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load social accounts.',
      });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runPreFlightCheck = async (
    platform: PlatformKey,
    reconnectAccountId?: string
  ): Promise<{ configured: boolean; url?: string; error?: string }> => {
    try {
      const res = await apiClient.getOAuthUrl(activeWorkspace!.id, platform, reconnectAccountId);
      if (!res.configured || !res.url) {
        return {
          configured: false,
          error: `Platform API configuration incomplete (${res.missingEnvVars?.join(', ') || 'Missing credentials'}).`,
        };
      }
      return { configured: true, url: res.url };
    } catch (err) {
      return {
        configured: false,
        error: err instanceof Error ? err.message : 'Pre-flight check failed.',
      };
    }
  };

  const handleConnect = async (platform: PlatformKey, reconnectAccountId?: string) => {
    if (!activeWorkspace) return;
    setNotice(null);
    setConnectingKey(platform);

    // Front-end pre-flight check function querying platform API configuration status
    const preFlight = await runPreFlightCheck(platform, reconnectAccountId);
    if (!preFlight.configured || !preFlight.url) {
      setConnectingKey(null);
      setNotice({
        type: 'error',
        text: preFlight.error || `OAuth for ${platform.replace('_', ' ').toUpperCase()} is not ready to connect.`,
      });
      return;
    }

    // Use shared openOAuthFlow utility for safe window opening, OAUTH_DISCOVERY_READY listening, and immediate grid refresh
    const { windowRef } = openOAuthFlow({
      url: preFlight.url,
      platform,
      onDiscoveryReady: async (discoverySessionId) => {
        setConnectingKey(null);
        try {
          const session = await apiClient.getOAuthDiscoverySession(activeWorkspace.id, discoverySessionId);
          setDiscoverySession(session);
          setNotice({
            type: 'info',
            text: `Authorized ${session.platformName}. Select accounts to connect to this workspace.`,
          });
        } catch (err) {
          setNotice({
            type: 'error',
            text: err instanceof Error ? err.message : 'Unable to load discovered accounts.',
          });
        }
      },
      onSuccess: (msg) => {
        setConnectingKey(null);
        setNotice({
          type: 'success',
          text: msg,
        });
        void loadData();
      },
      onError: (msg) => {
        setConnectingKey(null);
        setNotice({
          type: 'error',
          text: msg,
        });
        void loadData();
      },
      onClose: () => {
        setConnectingKey(null);
      },
    });

    if (!windowRef) {
      setConnectingKey(null);
      setNotice({
        type: 'error',
        text: 'Browser blocked authorization popup. Please enable popups and try again.',
      });
    }
  };

  const handleConfirmDiscovered = async (externalAccountIds: string[]) => {
    if (!activeWorkspace || !discoverySession) return;
    setConnectingSelected(true);
    try {
      const res = await apiClient.connectDiscoveredAccounts(
        activeWorkspace.id,
        discoverySession.sessionId,
        externalAccountIds
      );
      setDiscoverySession(null);
      setNotice({
        type: 'success',
        text: `Successfully connected ${res.connectedCount} ${discoverySession.platformName} account(s).`,
      });
      await loadData();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to connect selected accounts.',
      });
    } finally {
      setConnectingSelected(false);
    }
  };

  const openAccountDrawer = async (accountId: string, initialTab: AccountDrawerTab) => {
    if (!activeWorkspace) return;
    setDrawerTab(initialTab);
    try {
      const detail = await apiClient.getSocialAccountDetail(activeWorkspace.id, accountId);
      setActiveDetail(detail);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load account details.',
      });
    }
  };

  const refreshActiveDetail = async (accountId: string) => {
    if (!activeWorkspace) return;
    const detail = await apiClient.getSocialAccountDetail(activeWorkspace.id, accountId);
    setActiveDetail(detail);
  };

  const handleSyncAccount = async (account: SocialAccountRecord) => {
    if (!activeWorkspace) return;
    setSyncingId(account.id);
    setDrawerBusy('sync');
    setNotice(null);
    try {
      const res = await apiClient.syncSocialAccount(activeWorkspace.id, account.id);
      setNotice({
        type: res.status === 'succeeded' ? 'success' : 'error',
        text: res.message,
      });
      await loadData();
      if (activeDetail?.account.id === account.id) {
        await refreshActiveDetail(account.id);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Synchronization failed.',
      });
    } finally {
      setSyncingId(null);
      setDrawerBusy(null);
    }
  };

  const handleVerifyAccount = async (account: SocialAccountRecord) => {
    if (!activeWorkspace) return;
    setDrawerBusy('verify');
    setNotice(null);
    try {
      const health = await apiClient.verifySocialAccount(activeWorkspace.id, account.id);
      setNotice({
        type: health.healthy ? 'success' : 'error',
        text: health.healthy
          ? `Verified secure connection for ${account.accountName}.`
          : `Account "${account.accountName}" requires re-authorization. Please reconnect.`,
      });
      await loadData();
      if (activeDetail?.account.id === account.id) {
        await refreshActiveDetail(account.id);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification failed.',
      });
    } finally {
      setDrawerBusy(null);
    }
  };

  const handleRefreshToken = async (account: SocialAccountRecord) => {
    if (!activeWorkspace) return;
    setDrawerBusy('refresh');
    setNotice(null);
    try {
      const res = await apiClient.refreshSocialAccountToken(activeWorkspace.id, account.id);
      setNotice({
        type: res.refreshed ? 'success' : 'error',
        text: res.message,
      });
      await loadData();
      if (activeDetail?.account.id === account.id) {
        await refreshActiveDetail(account.id);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Token refresh failed.',
      });
    } finally {
      setDrawerBusy(null);
    }
  };

  const handleSavePreferences = async (
    accountId: string,
    prefs: SocialAccountPublishingPreferences
  ) => {
    if (!activeWorkspace) return;
    await apiClient.updateSocialAccountPreferences(activeWorkspace.id, accountId, prefs);
    setNotice({
      type: 'success',
      text: 'Publishing preferences updated.',
    });
    await loadData();
    if (activeDetail?.account.id === accountId) {
      await refreshActiveDetail(accountId);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!activeWorkspace) return;
    setNotice(null);
    try {
      await apiClient.disconnectSocialAccount(activeWorkspace.id, accountId);
      setConfirmDisconnectId(null);
      if (activeDetail?.account.id === accountId) {
        setActiveDetail(null);
      }
      setNotice({
        type: 'success',
        text: 'Account successfully disconnected.',
      });
      await loadData();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Disconnection failed.',
      });
    }
  };

  const filteredAccounts = useMemo(() => {
    if (platformFilter === 'all') return accounts;
    return accounts.filter((a) => a.platformKey === platformFilter);
  }, [accounts, platformFilter]);

  const connectedCount = accounts.filter((a) => a.connectionStatus === 'connected').length;
  const reconnectionCount = accounts.filter(
    (a) => a.connectionStatus === 'expired' || a.connectionStatus === 'revoked' || a.permissionsStatus !== 'granted'
  ).length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header & Compact Account Summary */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Social Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Connect and manage your social media channels from one dashboard.
          </p>
        </div>

        {/* Compact Summary Metric Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Connected:</span>
            <span className="font-mono-tabular text-sm font-bold text-slate-900">{connectedCount}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs">
            <Share2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Platforms:</span>
            <span className="font-mono-tabular text-sm font-bold text-slate-900">{platforms.length}</span>
          </div>
          {reconnectionCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-amber-800 shadow-xs">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold">Action Required:</span>
              <span className="font-mono-tabular text-sm font-bold">{reconnectionCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connecting status notice */}
      {connectingKey && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-950 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
            <span className="font-medium">
              Authenticating with <span className="font-bold uppercase">{connectingKey.replace('_', ' ')}</span>... Please complete login in the authorization popup.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConnectingKey(null)}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xs ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-blue-200 bg-blue-50 text-blue-950'
          }`}
        >
          {notice.type === 'success' ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="break-words font-medium">{notice.text}</span>
        </div>
      )}

      {/* 2. Connected Accounts Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Connected Channels ({accounts.length})
            </h2>
            <p className="text-xs text-slate-500">
              Active accounts linked to {activeWorkspace?.brandProfile.brandName || activeWorkspace?.name}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && (
              <select
                aria-label="Filter connected accounts by platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformKey | 'all')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs"
              >
                <option value="all">All Channels ({accounts.length})</option>
                {platforms.map((p) => {
                  const count = accounts.filter((a) => a.platformKey === p.key).length;
                  if (count === 0) return null;
                  return (
                    <option key={p.key} value={p.key}>
                      {p.displayName} ({count})
                    </option>
                  );
                })}
              </select>
            )}
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-xs">
            Loading connected channels...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <Share2 className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-900">No channels connected yet</p>
            <p className="mt-1 max-w-sm mx-auto text-xs text-slate-500">
              Choose a platform from the available options below to connect your first social channel via official OAuth.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((acc) => {
              const confirming = confirmDisconnectId === acc.id;
              const needsReconnect =
                acc.connectionStatus === 'expired' ||
                acc.connectionStatus === 'revoked' ||
                acc.permissionsStatus !== 'granted';

              return (
                <div
                  key={acc.id}
                  className="lt-neon-card flex flex-col justify-between rounded-2xl p-5 shadow-xs"
                >
                  <div className="space-y-4">
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {acc.avatarUrl ? (
                            <img
                              src={acc.avatarUrl}
                              alt={acc.accountName}
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 rounded-full border border-slate-200 object-cover shadow-xs"
                            />
                          ) : (
                            <PlatformLogo platformKey={acc.platformKey} size="lg" />
                          )}
                          <span className="absolute -bottom-1 -right-1 rounded-md ring-2 ring-white">
                            <PlatformLogo platformKey={acc.platformKey} size="sm" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-sm font-bold text-slate-900">
                            {acc.accountName}
                          </h3>
                          <p className="truncate font-mono-tabular text-xs text-slate-500 font-medium">
                            {acc.accountHandle}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-blue-700 capitalize">
                            {acc.platformName}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize shrink-0 ${
                          acc.connectionStatus === 'connected'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        }`}
                      >
                        {acc.connectionStatus}
                      </span>
                    </div>

                    {/* Metadata & Capabilities */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-medium">Publishing:</span>
                        <span className="font-semibold text-slate-900">
                          {summarizePublishingCapabilities(acc.capabilities)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 border-t border-slate-200/60 pt-1.5">
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> Last Sync:
                        </span>
                        <span className="font-mono-tabular font-medium text-slate-800">
                          {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={syncingId === acc.id}
                        onClick={() => void handleSyncAccount(acc)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-blue-300 hover:text-blue-700"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncingId === acc.id ? 'animate-spin' : ''}`} />
                        Sync
                      </button>
                      <button
                        type="button"
                        onClick={() => void openAccountDrawer(acc.id, 'overview')}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-blue-300 hover:text-blue-700"
                      >
                        <Eye className="h-3 w-3" />
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleConnect(acc.platformKey, acc.id)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs ${
                          needsReconnect
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reconnect
                      </button>
                    </div>

                    {confirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleDisconnect(acc.id)}
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDisconnectId(null)}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnectId(acc.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Unlink className="h-3 w-3" />
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Available Platforms Section */}
      <section className="space-y-4 pt-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Available Platforms ({platforms.length})
          </h2>
          <p className="text-xs text-slate-500">
            Select a platform to authorize securely via official OAuth 2.0.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {platforms.map((p) => {
            const connectedOnPlatform = accounts.filter(
              (a) => a.platformKey === p.key && a.connectionStatus === 'connected'
            ).length;
            const description = PLATFORM_DESCRIPTIONS[p.key] || 'Connect your social media account.';

            return (
              <div
                key={p.id}
                className="lt-neon-card flex flex-col justify-between rounded-2xl p-5 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlatformLogo platformKey={p.key} size="md" />
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-sm font-bold text-slate-900">
                          {p.displayName}
                        </h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          {connectedOnPlatform > 0 ? `${connectedOnPlatform} linked` : p.oauthConfigured ? 'Ready' : 'Setup Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{description}</p>
                </div>

                <button
                  type="button"
                  disabled={!p.isEnabled || !p.oauthConfigured || connectingKey === p.key}
                  onClick={() => void handleConnect(p.key)}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition-colors ${
                    !p.isEnabled || !p.oauthConfigured
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : connectingKey === p.key
                      ? 'bg-blue-600 text-white opacity-80'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {!p.isEnabled
                    ? 'Disabled'
                    : !p.oauthConfigured
                    ? 'Unavailable'
                    : connectingKey === p.key
                    ? 'Connecting...'
                    : connectedOnPlatform > 0
                    ? `Connect Another`
                    : `Connect`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Account Discovery Modal */}
      {discoverySession && (
        <AccountDiscoveryModal
          session={discoverySession}
          submitting={connectingSelected}
          onConfirm={handleConfirmDiscovered}
          onClose={() => setDiscoverySession(null)}
        />
      )}

      {/* Account Detail Drawer */}
      {activeDetail && (
        <AccountDetailDrawer
          detail={activeDetail}
          initialTab={drawerTab}
          busyAction={drawerBusy}
          onClose={() => setActiveDetail(null)}
          onSync={() => handleSyncAccount(activeDetail.account)}
          onRefreshToken={() => handleRefreshToken(activeDetail.account)}
          onVerifyToken={() => handleVerifyAccount(activeDetail.account)}
          onReconnect={() => handleConnect(activeDetail.account.platformKey, activeDetail.account.id)}
          onSavePreferences={(prefs) => handleSavePreferences(activeDetail.account.id, prefs)}
        />
      )}
    </div>
  );
};
