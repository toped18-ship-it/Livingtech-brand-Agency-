import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Sparkles,
  Calendar,
  Share2,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Compass,
  Image as ImageIcon,
  MessageSquare,
  Lock,
  CreditCard,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import {
  canAccessRoute,
  getEffectivePlanTier,
  getRequiredPlanForRoute,
  getTierDisplayName,
  getTrialDaysRemaining,
  isTrialActive,
  isTrialExpired,
} from '../../utils/planEntitlements';
import type { CustomerDashboardData } from '../../shared/api-contracts';
import type { CustomerRoute } from './types';

interface OverviewDashboardProps {
  onNavigate: (route: CustomerRoute) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const { activeWorkspace } = useAuth();
  const { settings } = useSystemSettings();
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    apiClient
      .getDashboard(activeWorkspace.id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load dashboard.'))
      .finally(() => setLoading(false));
  }, [activeWorkspace]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 rounded-2xl bg-slate-200/70 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error || 'Workspace dashboard unavailable.'}
      </div>
    );
  }

  const m = data.metrics;
  const kpis = [
    { label: 'Connected Accounts', value: m.connectedSocialAccounts, note: m.connectedSocialAccounts === 0 ? 'Connect via OAuth' : 'Active channels', route: 'social-accounts' as CustomerRoute },
    { label: 'Scheduled Posts', value: m.scheduledPosts, note: 'Queued in calendar', route: 'calendar' as CustomerRoute },
    { label: 'Published Posts', value: m.publishedPosts, note: 'Live deliveries', route: 'auto-publisher' as CustomerRoute },
    { label: 'Pending Review', value: m.pendingPosts, note: `${m.draftPosts} drafts saved`, route: 'calendar' as CustomerRoute },
    { label: 'Failed Posts', value: m.failedPosts, note: m.failedPosts > 0 ? 'Requires retry' : 'Zero failures', route: 'auto-publisher' as CustomerRoute },
    { label: 'Available AI Credits', value: m.availableAiCredits.toLocaleString(), note: 'AI Studio & Strategy', route: 'ai-studio' as CustomerRoute },
  ];

  const currentTier = getEffectivePlanTier(activeWorkspace?.subscription);
  const trialActive = isTrialActive(activeWorkspace?.subscription);
  const trialExpired = isTrialExpired(activeWorkspace?.subscription);
  const trialDaysLeft = getTrialDaysRemaining(activeWorkspace?.subscription);

  return (
    <div className="space-y-7">
      {(currentTier === 'none' || trialExpired) && (
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-400/50 bg-amber-500/15 p-5 text-white sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/25 text-amber-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                {trialExpired
                  ? 'Your 7-Day Free Trial Has Ended — Subscription Required'
                  : 'Activate a Subscription Package to Begin'}
              </h2>
              <p className="mt-0.5 text-xs text-white/90">
                {trialExpired
                  ? 'Your 7-day free trial period is complete. Choose Basic, Pro, or Enterprise and complete payment to unlock your workspace modules.'
                  : 'Your workspace does not have an active subscription yet. Choose Basic, Pro, or Enterprise under Billing & Subscriptions to unlock your included tools.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            Open Subscription &amp; Payment
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </section>
      )}
      {trialActive && (
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-400/40 bg-sky-500/10 p-5 text-white sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/25 text-sky-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">
                7-Day Free Trial Active · {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining
              </h2>
              <p className="mt-0.5 text-xs text-white/90">
                Explore all workspace tools free for 7 days. After 7 days, a paid subscription is required to continue.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            Choose Plan &amp; Pay
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </section>
      )}

      {/* Executive Workspace Hero + Quick Actions */}
      <section className="lt-neon-hero rounded-2xl p-6 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-medium text-sky-300">
              {activeWorkspace?.brandProfile.brandName} · {activeWorkspace?.brandProfile.industry || 'Multi-Channel Workspace'}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Brand Command Overview
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-blue-100/90">
              {settings.app_welcome_message || 'Real-time database snapshot of your connected channels, publishing pipeline, AI Studio credits, and upcoming campaign schedule.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('ai-studio')}
              className="lt-btn-light inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-blue-950 hover:bg-blue-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-700" />
              New AI Post
            </button>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule Content
            </button>
            <button
              type="button"
              onClick={() => onNavigate('social-accounts')}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="h-3.5 w-3.5" />
              Connect Channels
            </button>
          </div>
        </div>
      </section>

      {/* 6-Metric Real Database KPI Strip */}
      <section aria-label="Workspace metrics" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => onNavigate(kpi.route)}
            className="lt-neon-card group rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span className="truncate">{kpi.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-700 transition-colors shrink-0" />
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="mt-1 text-xs text-slate-500 truncate">{kpi.note}</div>
          </button>
        ))}
      </section>

      {/* OPay-Inspired Quick Services Grid */}
      <section aria-label="Quick Services" className="space-y-3">
        <h2 className="font-display text-base font-bold text-slate-900">Brand Services & Tools</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: 'AI Studio', icon: Sparkles, route: 'ai-studio' as CustomerRoute, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Social', icon: Share2, route: 'social-accounts' as CustomerRoute, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { label: 'Calendar', icon: Calendar, route: 'calendar' as CustomerRoute, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Publisher', icon: Send, route: 'auto-publisher' as CustomerRoute, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
            { label: 'Analytics', icon: BarChart3, route: 'analytics' as CustomerRoute, color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Strategy', icon: Compass, route: 'ai-strategy' as CustomerRoute, color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { label: 'Designer', icon: ImageIcon, route: 'graphic-designer' as CustomerRoute, color: 'bg-rose-50 text-rose-700 border-rose-200' },
            { label: 'Inbox', icon: MessageSquare, route: 'engagement' as CustomerRoute, color: 'bg-teal-50 text-teal-700 border-teal-200' },
          ].map((svc) => {
            const Icon = svc.icon;
            const unlocked = canAccessRoute(activeWorkspace?.subscription, svc.route);
            const requiredTier = getRequiredPlanForRoute(svc.route);
            return (
              <button
                key={svc.label}
                type="button"
                onClick={() => onNavigate(svc.route)}
                className={`lt-neon-card group relative flex flex-col items-center justify-center gap-2.5 rounded-2xl p-4 text-center min-h-[96px] hover:scale-105 transition-all ${
                  unlocked ? '' : 'opacity-75'
                }`}
              >
                {!unlocked && (
                  <span
                    title={`Requires ${requiredTier ? getTierDisplayName(requiredTier) : 'Subscription'} Plan`}
                    className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-300"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    {requiredTier === 'enterprise' ? 'Ent' : requiredTier === 'pro' ? 'Pro' : 'Basic'}
                  </span>
                )}
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${svc.color} shadow-xs group-hover:bg-blue-700 group-hover:text-white transition-colors`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">{svc.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main 2-Column Operational Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Social Media Performance Overview Chart */}
        <section className="lt-neon-card rounded-2xl p-6 xl:col-span-8">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Social Media Performance Overview</h2>
              <p className="text-xs text-slate-500">
                Live multi-channel performance snapshots from connected accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Open Full Analytics
            </button>
          </div>

          <div className="mt-5 h-64 w-full">
            {data.performancePreview.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-sky-400/20 bg-[#071436]/60 p-6 text-center">
                <BarChart3 className="h-8 w-8 text-sky-300" />
                <p className="mt-3 text-sm font-bold text-white">No live performance snapshots yet</p>
                <p className="mt-1 max-w-sm text-xs text-white/85">
                  Connect an official social channel to stream daily impressions, engagements, and click attribution here.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('social-accounts')}
                  className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  Connect Social Accounts
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.performancePreview} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ltImpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052FF" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#0052FF" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ltEngGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="snapshotDate" tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#E2E8F0' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#071436',
                      borderRadius: '10px',
                      border: '1px solid rgba(56,189,248,0.45)',
                      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.45)',
                      fontSize: '12px',
                      color: '#FFFFFF',
                    }}
                  />
                  <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#38BDF8" strokeWidth={2.4} fill="url(#ltImpGrad)" />
                  <Area type="monotone" dataKey="engagements" name="Engagements" stroke="#F59E0B" strokeWidth={2.2} fill="url(#ltEngGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Account Connection Status */}
        <section className="lt-neon-card rounded-2xl p-6 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Channel Connection Status</h2>
              <p className="text-xs text-slate-500">Official OAuth integration readiness</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('social-accounts')}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Manage
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data.platforms.map((p) => {
              const linked = data.connectedAccounts.find((a) => a.platformKey === p.key && a.connectionStatus === 'connected');
              return (
                <div key={p.key} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{p.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {linked ? linked.accountHandle : p.oauthConfigured ? 'OAuth ready · Not linked' : 'Awaiting Phase 2 OAuth credentials'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${linked ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {linked ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom 2-Column Grid: Content Calendar Preview & Recent Publishing Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Content Calendar Preview */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Content Calendar Preview</h2>
              <p className="text-xs text-slate-500">Upcoming scheduled, pending, and draft posts</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Full Calendar
            </button>
          </div>

          {data.upcomingCalendar.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No upcoming posts scheduled yet.</p>
              <p className="mt-1 text-xs text-slate-500">Create a campaign draft in AI Content Studio or schedule directly on the calendar.</p>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Schedule First Post
              </button>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {data.upcomingCalendar.map((post) => (
                <div key={post.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{post.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="uppercase font-medium text-blue-700">{post.platformKey}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="capitalize">{post.status}</span>
                      {post.scheduledFor && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono-tabular">{new Date(post.scheduledFor).toLocaleDateString()}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('calendar')}
                    className="text-xs font-medium text-slate-500 hover:text-blue-700 shrink-0"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Publishing Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Recent Publishing Activity</h2>
              <p className="text-xs text-slate-500">Auto Publisher queue executions and status</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('auto-publisher')}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Auto Publisher
            </button>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No publishing jobs executed yet.</p>
              <p className="mt-1 text-xs text-slate-500">Scheduled posts automatically generate Auto Publisher jobs tracked here.</p>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {data.recentActivity.map((job) => (
                <div key={job.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {job.jobStatus === 'succeeded' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : job.jobStatus === 'failed' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    ) : (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{job.postTitle}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="uppercase">{job.platformKey}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="capitalize font-medium">{job.jobStatus}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono-tabular">Attempts {job.attemptCount}/{job.maxAttempts}</span>
                      </p>
                      {job.lastError && <p className="mt-1 text-xs text-rose-700 line-clamp-1">{job.lastError}</p>}
                    </div>
                  </div>
                  <Send className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
