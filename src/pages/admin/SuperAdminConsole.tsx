import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  CreditCard,
  Sparkles,
  Share2,
  Activity,
  AlertTriangle,
  Sliders,
  FileSearch,
  LifeBuoy,
  RefreshCw,
  ArrowLeft,
  Check,
  Search,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { apiClient } from '../../lib/apiClient';
import { formatCurrencyCents, hasSuperAdminAccess } from '../../utils/domain';
import { AdminSocialPlatformsPanel } from '../../components/admin/AdminSocialPlatformsPanel';
import type {
  AdminOverviewData,
  AIUsageRecord,
  AuditLogRecord,
  OAuthConnectionLogRecord,
  PlatformKey,
  PlatformSyncLogRecord,
  PlatformWebhookEventRecord,
  PublishingJobRecord,
  SocialPlatformInfo,
  SupportTicketRecord,
  SystemSettingRecord,
  UserProfile,
  WorkspaceSubscriptionRecord,
} from '../../shared/api-contracts';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'ai-usage'
  | 'social-platforms'
  | 'publishing-jobs'
  | 'failed-jobs'
  | 'system-settings'
  | 'audit-logs'
  | 'support';

interface SuperAdminConsoleProps {
  section: AdminSection;
  onNavigateSection: (section: AdminSection) => void;
  onReturnCustomerApp: () => void;
}

const ADMIN_NAV: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'ai-usage', label: 'AI Usage Monitor', icon: Sparkles },
  { id: 'social-platforms', label: 'Social & Platforms', icon: Share2 },
  { id: 'publishing-jobs', label: 'Publishing Jobs', icon: Activity },
  { id: 'failed-jobs', label: 'Failed Jobs', icon: AlertTriangle },
  { id: 'system-settings', label: 'System Settings', icon: Sliders },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileSearch },
  { id: 'support', label: 'Support Desk', icon: LifeBuoy },
];

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({
  section,
  onNavigateSection,
  onReturnCustomerApp,
}) => {
  const { user, logout } = useAuth();
  const { settings: globalSettings, refreshSettings } = useSystemSettings();
  const isAuthorized = hasSuperAdminAccess(user?.role);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Admin datasets
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [subscriptions, setSubscriptions] = useState<WorkspaceSubscriptionRecord[]>([]);
  const [aiUsage, setAiUsage] = useState<AIUsageRecord[]>([]);
  const [socialStats, setSocialStats] = useState<{
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
  } | null>(null);
  const [jobs, setJobs] = useState<PublishingJobRecord[]>([]);
  const [failedJobs, setFailedJobs] = useState<PublishingJobRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettingRecord[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [ticketNotes, setTicketNotes] = useState<Record<string, string>>({});

  const loadSectionData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      switch (section) {
        case 'overview': {
          const data = await apiClient.getAdminOverview();
          setOverview(data);
          break;
        }
        case 'users': {
          const data = await apiClient.getAdminUsers();
          setUsers(data);
          break;
        }
        case 'subscriptions': {
          const data = await apiClient.getAdminSubscriptions();
          setSubscriptions(data);
          break;
        }
        case 'ai-usage': {
          const data = await apiClient.getAdminAiUsage();
          setAiUsage(data);
          break;
        }
        case 'social-platforms': {
          const data = await apiClient.getAdminSocialStats();
          setSocialStats(data);
          break;
        }
        case 'publishing-jobs': {
          const data = await apiClient.getAdminJobs(false);
          setJobs(data);
          break;
        }
        case 'failed-jobs': {
          const data = await apiClient.getAdminJobs(true);
          setFailedJobs(data);
          break;
        }
        case 'system-settings': {
          const data = await apiClient.getAdminSettings();
          setSettings(data);
          const drafts: Record<string, string> = {};
          data.forEach((s) => {
            drafts[s.key] = s.value;
          });
          setSettingDrafts(drafts);
          break;
        }
        case 'audit-logs': {
          const data = await apiClient.getAdminAuditLogs();
          setAuditLogs(data);
          break;
        }
        case 'support': {
          const data = await apiClient.getAdminTickets();
          setTickets(data);
          const notes: Record<string, string> = {};
          data.forEach((t) => {
            notes[t.id] = t.adminNotes || '';
          });
          setTicketNotes(notes);
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administration data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, section]);

  useEffect(() => {
    setNotice(null);
    void loadSectionData();
  }, [loadSectionData]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.actorEmail || '').toLowerCase().includes(q) ||
        l.resourceType.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const aiChartData = useMemo(() => {
    const map = new Map<string, { feature: string; credits: number; calls: number }>();
    for (const row of aiUsage) {
      const prev = map.get(row.feature) || {
        feature: row.feature.replace(/_/g, ' '),
        credits: 0,
        calls: 0,
      };
      prev.credits += row.creditsUsed;
      prev.calls += 1;
      map.set(row.feature, prev);
    }
    return Array.from(map.values());
  }, [aiUsage]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400">
            <ShieldAlert className="h-6 w-6 shrink-0" />
            <h1 className="font-display text-lg font-bold">403 — Super-Admin Access Restricted</h1>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            This administration console is strictly protected by role-based access control. Your current account ({user?.email || 'unauthenticated'}) has role <span className="font-mono-tabular text-white">{user?.role || 'guest'}</span> and is not authorized to view platform-wide tenant records.
          </p>
          <button
            type="button"
            onClick={onReturnCustomerApp}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Customer Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateUser = async (userId: string, patch: Partial<{ status: string; role: string; emailVerified: boolean }>) => {
    setError(null);
    setNotice(null);
    try {
      await apiClient.updateAdminUser(userId, patch);
      setNotice('User account updated and logged to audit trail.');
      await loadSectionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user.');
    }
  };

  const handleUpdateSubscription = async (subId: string, patch: Partial<{ status: string; planCode: string }>) => {
    setError(null);
    setNotice(null);
    try {
      await apiClient.updateAdminSubscription(subId, patch);
      setNotice('Workspace subscription updated.');
      await loadSectionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update subscription.');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setError(null);
    setNotice(null);
    try {
      await apiClient.retryAdminJob(jobId);
      setNotice('Publishing job re-queued for execution.');
      await loadSectionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retry job.');
    }
  };

  const handleSaveSetting = async (key: string, overrideValue?: string) => {
    setError(null);
    setNotice(null);
    const val = overrideValue !== undefined ? overrideValue : (settingDrafts[key] ?? '');
    try {
      await apiClient.updateAdminSetting(key, val);
      setSettingDrafts((prev) => ({ ...prev, [key]: val }));
      await refreshSettings();
      setNotice(`System setting "${key}" saved and applied across the application.`);
      await loadSectionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save system setting.');
    }
  };

  const handleUpdateTicket = async (ticketId: string, status: string) => {
    setError(null);
    setNotice(null);
    try {
      await apiClient.updateAdminTicket(ticketId, {
        status,
        adminNotes: ticketNotes[ticketId] || '',
      });
      setNotice('Support ticket updated.');
      await loadSectionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update support ticket.');
    }
  };

  const activeNav = ADMIN_NAV.find((n) => n.id === section) || ADMIN_NAV[0];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Super-Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-slate-950 text-slate-100 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="lt-logo-frame flex h-9 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white px-1">
              <img
                src={globalSettings.app_logo_url || '/assets/aistudio/20261112_184805_8a13799e.jpg'}
                alt={globalSettings.app_name || 'LIVINGTECH'}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain scale-[1.22]"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-bold tracking-wide text-white">SUPER-ADMIN</p>
              <p className="truncate text-[11px] text-amber-400">Governance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Super-Admin navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigateSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-2">
          <button
            type="button"
            onClick={onReturnCustomerApp}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-950/60 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-900/70 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            Customer Workspace
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold text-slate-900">{activeNav.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-xs text-slate-500 sm:inline">
              {user?.email} · Role: super_admin
            </span>
            <button
              type="button"
              onClick={() => void loadSectionData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-6">
              <div className="lt-neon-hero rounded-2xl p-6 text-white">
                <p className="text-xs font-semibold text-amber-400">{globalSettings.app_name || 'LIVINGTECH BRAND AGENCY'} · Platform Telemetry</p>
                <h2 className="mt-1 font-display text-2xl font-bold">Multi-Tenant Operations Overview</h2>
                <p className="mt-1.5 text-xs text-blue-100/90 max-w-2xl">
                  Real-time metrics read directly from the relational database across all customer organisations, workspaces, AI usage ledgers, and publishing job queues.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Registered Users', value: overview.metrics.totalRegisteredUsers, sub: `+${overview.metrics.newRegistrations30d} in last 30d` },
                  { label: 'Active Subscriptions', value: overview.metrics.activeSubscriptions, sub: `${overview.metrics.totalWorkspaces} active workspaces` },
                  { label: 'Connected Social Accounts', value: overview.metrics.totalConnectedSocialAccounts, sub: 'Official OAuth tokens only' },
                  { label: 'AI Credits Consumed', value: overview.metrics.totalAiCreditsConsumed.toLocaleString(), sub: 'Server-side Gemini usage' },
                  { label: 'Total Publishing Jobs', value: overview.metrics.totalPublishingJobs, sub: 'Across all tenant queues' },
                  { label: 'Failed Publishing Jobs', value: overview.metrics.failedPublishingJobs, sub: 'Inspect in Failed Jobs queue' },
                  { label: 'Open Support Tickets', value: overview.metrics.openSupportTickets, sub: 'Awaiting admin resolution' },
                  { label: 'New Registrations (30d)', value: overview.metrics.newRegistrations30d, sub: 'Verified + pending signups' },
                ].map((kpi) => (
                  <div key={kpi.label} className="lt-neon-card rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                    <p className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">Recent Registrations</h3>
                    <button
                      type="button"
                      onClick={() => onNavigateSection('users')}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Manage all users
                    </button>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {overview.recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{u.fullName}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                        <div className="text-right shrink-0 text-xs text-slate-600">
                          <span className="font-mono-tabular font-medium text-slate-800">{u.role}</span>
                          <span className="mx-1.5 text-slate-300">·</span>
                          <span className={u.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}>{u.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-display text-sm font-bold text-slate-900">Latest Audit Events</h3>
                    <button
                      type="button"
                      onClick={() => onNavigateSection('audit-logs')}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Full audit log
                    </button>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {overview.recentAuditLogs.slice(0, 8).map((log) => (
                      <div key={log.id} className="py-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-semibold text-slate-900">{log.action}</span>
                          <span className="text-slate-400 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-0.5 text-slate-500">
                          {log.actorEmail || 'system'} · {log.resourceType}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS */}
          {section === 'users' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Registered Platform Users</h2>
                  <p className="text-xs text-slate-500">Manage account status, email verification, and RBAC roles.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Filter by email or role..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">User</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Verified</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-900">{u.fullName}</div>
                          <div className="text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            aria-label={`Role for ${u.email}`}
                            value={u.role}
                            onChange={(e) => void handleUpdateUser(u.id, { role: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                          >
                            <option value="customer">customer</option>
                            <option value="workspace_admin">workspace_admin</option>
                            <option value="editor">editor</option>
                            <option value="viewer">viewer</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <span className={u.status === 'active' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {u.emailVerified ? (
                            <span className="text-emerald-700 font-medium">Verified</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleUpdateUser(u.id, { emailVerified: true })}
                              className="text-blue-700 font-semibold hover:underline"
                            >
                              Mark Verified
                            </button>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          {u.email !== user?.email && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleUpdateUser(u.id, {
                                  status: u.status === 'active' ? 'suspended' : 'active',
                                })
                              }
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                u.status === 'active'
                                  ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. SUBSCRIPTIONS */}
          {section === 'subscriptions' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Workspace Subscriptions</h2>
                <p className="text-xs text-slate-500">Inspect active plans, monthly AI credit quotas, and billing states across tenants.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Workspace & Owner</th>
                      <th className="py-2.5 px-3 font-semibold">Plan</th>
                      <th className="py-2.5 px-3 font-semibold">Rate</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 pl-3 font-semibold text-right">Renewal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-900">{sub.workspaceName || sub.workspaceId}</div>
                          <div className="text-slate-500">{sub.ownerEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            aria-label={`Plan for ${sub.workspaceName}`}
                            value={sub.planCode}
                            onChange={(e) => void handleUpdateSubscription(sub.id, { planCode: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                          >
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 font-mono-tabular font-semibold text-slate-800">
                          {formatCurrencyCents(sub.monthlyPriceCents)}/mo
                        </td>
                        <td className="py-3 px-3">
                          <select
                            aria-label={`Status for ${sub.workspaceName}`}
                            value={sub.status}
                            onChange={(e) => void handleUpdateSubscription(sub.id, { status: e.target.value })}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                          >
                            <option value="trialing">trialing</option>
                            <option value="active">active</option>
                            <option value="past_due">past_due</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 pl-3 text-right font-mono-tabular text-slate-500">
                          {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. AI USAGE */}
          {section === 'ai-usage' && (
            <div className="space-y-6">
              {aiChartData.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="font-display text-sm font-bold text-slate-900">AI Credits Consumed by Feature</h2>
                  <div className="mt-4 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis dataKey="feature" tick={{ fontSize: 12, fill: '#E2E8F0' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#E2E8F0' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#071436', border: '1px solid rgba(56,189,248,0.45)', borderRadius: '10px', color: '#FFFFFF' }} />
                        <Bar dataKey="credits" fill="#38BDF8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-base font-bold text-slate-900">Server-Side AI Generation Ledger</h2>
                {aiUsage.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No AI generations recorded yet. Generate a campaign post or strategy in a customer workspace to see live credit usage telemetry here.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-4 font-semibold">Workspace</th>
                          <th className="py-2 px-3 font-semibold">Feature</th>
                          <th className="py-2 px-3 font-semibold">Model</th>
                          <th className="py-2 px-3 font-semibold">Credits</th>
                          <th className="py-2 px-3 font-semibold">Tokens</th>
                          <th className="py-2 pl-3 font-semibold text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiUsage.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2.5 pr-4">
                              <div className="font-semibold text-slate-900">{row.workspaceName}</div>
                              <div className="text-slate-500">{row.userEmail}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono-tabular">{row.feature}</td>
                            <td className="py-2.5 px-3 text-slate-600">{row.modelName}</td>
                            <td className="py-2.5 px-3 font-mono-tabular font-semibold text-blue-700">{row.creditsUsed}</td>
                            <td className="py-2.5 px-3 font-mono-tabular text-slate-600">
                              {row.promptTokens + row.completionTokens}
                            </td>
                            <td className="py-2.5 pl-3 text-right text-slate-500">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. SOCIAL & PLATFORM INTEGRATIONS */}
          {section === 'social-platforms' && socialStats && (
            <AdminSocialPlatformsPanel
              data={socialStats}
              onRefresh={loadSectionData}
              onNotice={(msg) => {
                setError(null);
                setNotice(msg);
              }}
              onError={(msg) => {
                setNotice(null);
                setError(msg);
              }}
            />
          )}

          {/* 6 & 7. PUBLISHING JOBS & FAILED JOBS */}
          {(section === 'publishing-jobs' || section === 'failed-jobs') && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  {section === 'failed-jobs' ? 'Failed Publishing Job Monitor' : 'Global Publishing Job Queue'}
                </h2>
                <p className="text-xs text-slate-500">
                  {section === 'failed-jobs'
                    ? 'Inspect failed worker dispatches and re-queue jobs once credentials or payload issues are resolved.'
                    : 'Track all scheduled, processing, succeeded, and failed jobs across every tenant workspace.'}
                </p>
              </div>

              {(section === 'failed-jobs' ? failedJobs : jobs).length === 0 ? (
                <p className="py-6 text-sm text-slate-500">
                  {section === 'failed-jobs'
                    ? 'No failed publishing jobs right now.'
                    : 'No publishing jobs queued yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 pr-4 font-semibold">Post & Workspace</th>
                        <th className="py-2.5 px-3 font-semibold">Platform</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Attempts</th>
                        <th className="py-2.5 px-3 font-semibold">Error Details</th>
                        <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(section === 'failed-jobs' ? failedJobs : jobs).map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/80">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-slate-900">{job.postTitle}</div>
                            <div className="text-slate-500">{job.workspaceName || job.workspaceId}</div>
                          </td>
                          <td className="py-3 px-3 uppercase font-mono-tabular text-slate-700">{job.platformKey}</td>
                          <td className="py-3 px-3 font-semibold">
                            <span
                              className={
                                job.jobStatus === 'failed'
                                  ? 'text-rose-700'
                                  : job.jobStatus === 'succeeded'
                                  ? 'text-emerald-700'
                                  : 'text-blue-700'
                              }
                            >
                              {job.jobStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono-tabular text-slate-700">
                            {job.attemptCount}/{job.maxAttempts}
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {job.lastError || '—'}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleRetryJob(job.id)}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                            >
                              Re-queue
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. SYSTEM SETTINGS */}
          {section === 'system-settings' && (
            <div className="space-y-6">
              {/* App Details, Contents & Font Color Editor */}
              <div className="lt-neon-card rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">App Details, Contents & Font Color</h2>
                  <p className="text-xs text-slate-500">
                    Customize global application branding, welcome copy, footer text, logo URL, and global font color. Changes apply immediately across the app.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {settings
                    .filter((s) => s.key.startsWith('app_'))
                    .map((setting) => {
                      const isColor = setting.key === 'app_font_color';
                      const draftVal = settingDrafts[setting.key] ?? '';
                      return (
                        <div key={setting.key} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="font-mono-tabular text-xs font-bold text-slate-900">{setting.key}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {isColor && (
                              <>
                                <input
                                  type="color"
                                  aria-label="Pick global font color"
                                  value={/^#[0-9a-fA-F]{6}$/.test(draftVal) ? draftVal : '#ffffff'}
                                  onChange={(e) =>
                                    setSettingDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))
                                  }
                                  className="h-9 w-11 cursor-pointer rounded-lg border border-sky-400/40 bg-[#071436] p-0.5"
                                />
                                {[
                                  { label: 'Pure White', hex: '#ffffff' },
                                  { label: 'Ice Blue', hex: '#e0f2fe' },
                                  { label: 'Warm Cream', hex: '#fef9c3' },
                                  { label: 'Soft Mint', hex: '#d1fae5' },
                                ].map((preset) => (
                                  <button
                                    key={preset.hex}
                                    type="button"
                                    title={`Apply ${preset.label} (${preset.hex})`}
                                    onClick={() => void handleSaveSetting(setting.key, preset.hex)}
                                    className="rounded-md border border-sky-400/35 bg-[#071436] px-2 py-1 text-[11px] font-semibold text-white hover:border-sky-300"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </>
                            )}
                            <input
                              type="text"
                              aria-label={setting.key}
                              value={draftVal}
                              onChange={(e) =>
                                setSettingDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))
                              }
                              className={`${isColor ? 'w-28' : 'w-full sm:w-72'} rounded-lg border border-slate-300 px-3 py-1.5 font-mono-tabular text-xs focus:border-blue-600 focus:outline-none`}
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveSetting(setting.key)}
                              className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Platform Runtime & Security Settings */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Platform Runtime & Security Settings</h2>
                  <p className="text-xs text-slate-500">Configure registration flags, default trial AI credit grants, and publishing worker safeguards.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {settings
                    .filter((s) => !s.key.startsWith('app_'))
                    .map((setting) => (
                      <div key={setting.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-mono-tabular text-xs font-bold text-slate-900">{setting.key}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="text"
                            aria-label={setting.key}
                            value={settingDrafts[setting.key] ?? ''}
                            onChange={(e) =>
                              setSettingDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))
                            }
                            className="w-44 rounded-lg border border-slate-300 px-3 py-1.5 font-mono-tabular text-xs focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveSetting(setting.key)}
                            className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. AUDIT LOGS */}
          {section === 'audit-logs' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">Security & Activity Audit Trail</h2>
                  <p className="text-xs text-slate-500">Immutable record of authentication, RBAC changes, workspace provisioning, and administrative operations.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Filter action or actor..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Actor</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-3 font-semibold">Resource</th>
                      <th className="py-2.5 pl-3 font-semibold">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 pr-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">{log.actorEmail || 'system'}</td>
                        <td className="py-2.5 px-3 font-mono-tabular font-semibold text-blue-800">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-600">{log.resourceType}</td>
                        <td className="py-2.5 pl-3 font-mono-tabular text-[11px] text-slate-500 max-w-xs truncate">
                          {JSON.stringify(log.metadata)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. SUPPORT MANAGEMENT */}
          {section === 'support' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">Customer Support Queue</h2>
                <p className="text-xs text-slate-500">Respond to tenant support requests and update ticket resolution status.</p>
              </div>
              {tickets.length === 0 ? (
                <p className="py-6 text-sm text-slate-500">No support tickets submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">{ticket.subject}</h3>
                          <p className="text-xs text-slate-500">
                            {ticket.workspaceName} · {ticket.ownerEmail} · Priority: {ticket.priority}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-xs font-semibold text-blue-700">{ticket.status}</span>
                      </div>
                      <p className="text-sm text-slate-700">{ticket.message}</p>
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={ticketNotes[ticket.id] ?? ''}
                          onChange={(e) =>
                            setTicketNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          placeholder="Add admin response or resolution note..."
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleUpdateTicket(ticket.id, 'in_progress')}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                          >
                            Mark In Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUpdateTicket(ticket.id, 'resolved')}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
