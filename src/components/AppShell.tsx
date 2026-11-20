import React, { useState } from 'react';
import {
  LayoutDashboard,
  Share2,
  Sparkles,
  CalendarDays,
  Send,
  Compass,
  MessageSquare,
  BarChart3,
  FolderOpen,
  Bell,
  CreditCard,
  Users,
  Palette,
  UserCog,
  LifeBuoy,
  Shield,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
  Image as ImageIcon,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasSuperAdminAccess } from '../utils/domain';
import { PWAInstallButton } from './PWAControls';
import type { CustomerRoute } from '../pages/customer/types';
import { OverviewDashboard } from '../pages/customer/OverviewDashboard';
import { SocialAccountsPage } from '../pages/customer/SocialAccountsPage';
import { AiContentStudioPage } from '../pages/customer/AiContentStudioPage';
import { AiGraphicDesignerPage } from '../pages/customer/AiGraphicDesignerPage';
import { ContentCalendarPage } from '../pages/customer/ContentCalendarPage';
import { AutoPublisherPage } from '../pages/customer/AutoPublisherPage';
import { PublishingHistoryPage } from '../pages/customer/PublishingHistoryPage';
import { AiStrategyPage } from '../pages/customer/AiStrategyPage';
import { EngagementManagerV3Page } from '../pages/customer/EngagementManagerV3Page';
import {
  AnalyticsPage,
  MediaLibraryPage,
} from '../pages/customer/EngagementAnalyticsMediaPages';
import {
  BillingSubscriptionsPage,
  BrandSettingsPage,
  NotificationsPage,
  TeamManagementPage,
} from '../pages/customer/WorkspaceManagementPages';
import {
  HelpSupportPage,
  ProfileSettingsPage,
} from '../pages/customer/ProfileAndSupportPages';

interface AppShellProps {
  route: CustomerRoute;
  onNavigate: (route: CustomerRoute) => void;
  onOpenSuperAdmin: () => void;
  oauthBanner?: { type: 'success' | 'error'; text: string } | null;
  onDismissOAuthBanner?: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: { id: CustomerRoute; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: 'Command Center',
    items: [
      { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
      { id: 'social-accounts', label: 'Social Accounts', icon: Share2 },
      { id: 'ai-studio', label: 'AI Content Studio', icon: Sparkles },
      { id: 'graphic-designer', label: 'AI Graphic Designer', icon: ImageIcon },
      { id: 'calendar', label: 'Content Calendar', icon: CalendarDays },
      { id: 'auto-publisher', label: 'Auto Publisher', icon: Send },
      { id: 'publishing-history', label: 'Publishing History', icon: History },
      { id: 'ai-strategy', label: 'AI Brand Strategy', icon: Compass },
    ],
  },
  {
    label: 'Growth & Assets',
    items: [
      { id: 'engagement', label: 'Engagement Manager', icon: MessageSquare },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'media', label: 'Media Library', icon: FolderOpen },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Workspace & Account',
    items: [
      { id: 'billing', label: 'Billing & Subscriptions', icon: CreditCard },
      { id: 'team', label: 'Team Management', icon: Users },
      { id: 'brand-settings', label: 'Brand Settings', icon: Palette },
      { id: 'profile', label: 'Profile Settings', icon: UserCog },
      { id: 'support', label: 'Help & Support', icon: LifeBuoy },
    ],
  },
];

const ROUTE_TITLES: Record<CustomerRoute, string> = {
  overview: 'Overview Dashboard',
  'social-accounts': 'Social Accounts',
  'ai-studio': 'AI Content Studio',
  'graphic-designer': 'AI Graphic Designer',
  calendar: 'Content Calendar',
  'auto-publisher': 'Auto Publisher',
  'publishing-history': 'Publishing History',
  'ai-strategy': 'AI Brand Strategy',
  engagement: 'Engagement Manager',
  analytics: 'Analytics',
  media: 'Media Library',
  notifications: 'Notifications',
  billing: 'Billing & Subscriptions',
  team: 'Team Management',
  'brand-settings': 'Brand Settings',
  profile: 'Profile Settings',
  support: 'Help & Support',
};

export const AppShell: React.FC<AppShellProps> = ({
  route,
  onNavigate,
  onOpenSuperAdmin,
  oauthBanner,
  onDismissOAuthBanner,
}) => {
  const { user, workspaces, activeWorkspace, setActiveWorkspaceId, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canAccessAdmin = hasSuperAdminAccess(user?.role);

  const renderPage = () => {
    switch (route) {
      case 'overview':
        return <OverviewDashboard onNavigate={onNavigate} />;
      case 'social-accounts':
        return <SocialAccountsPage />;
      case 'ai-studio':
        return <AiContentStudioPage />;
      case 'graphic-designer':
        return <AiGraphicDesignerPage />;
      case 'calendar':
        return <ContentCalendarPage />;
      case 'auto-publisher':
        return <AutoPublisherPage />;
      case 'publishing-history':
        return <PublishingHistoryPage />;
      case 'ai-strategy':
        return <AiStrategyPage />;
      case 'engagement':
        return <EngagementManagerV3Page />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'media':
        return <MediaLibraryPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'billing':
        return <BillingSubscriptionsPage />;
      case 'team':
        return <TeamManagementPage />;
      case 'brand-settings':
        return <BrandSettingsPage />;
      case 'profile':
        return <ProfileSettingsPage />;
      case 'support':
        return <HelpSupportPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Deep Blue Enterprise Sidebar */}
      <aside
        className={`lt-sidebar-gradient fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col text-white transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Official Brand Lockup */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => {
              onNavigate('overview');
              setDrawerOpen(false);
            }}
            className="flex h-11 w-44 items-center justify-center overflow-hidden rounded-lg bg-white px-1.5 shadow-sm"
          >
            <img
              src="/assets/aistudio/20261112_184805_8a13799e.jpg"
              alt="LIVINGTECH BRAND AGENCY"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain scale-[1.22]"
            />
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-1.5 text-blue-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Multi-Tenant Workspace Switcher */}
        <div className="border-b border-white/10 p-3">
          <label htmlFor="workspace-switcher" className="block text-[11px] font-medium text-blue-200/80">
            Active Brand Workspace
          </label>
          <div className="relative mt-1.5">
            <select
              id="workspace-switcher"
              value={activeWorkspace?.id || ''}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-white/15 bg-white/10 py-2 pl-3 pr-8 text-xs font-semibold text-white focus:border-sky-400 focus:outline-none"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-slate-900 text-white">
                  {ws.brandProfile?.brandName || ws.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-blue-200" />
          </div>
          <button
            type="button"
            onClick={() => {
              onNavigate('brand-settings');
              setDrawerOpen(false);
            }}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            Create or configure workspace
          </button>
        </div>

        {/* 15 Customer Application Navigation Links */}
        <nav aria-label="Customer application navigation" className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 text-[11px] font-semibold tracking-wide text-blue-200/60">
                {group.label}
              </p>
              <div className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = route === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Governance & Session Controls */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {canAccessAdmin && (
            <button
              type="button"
              onClick={onOpenSuperAdmin}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
            >
              <Shield className="h-3.5 w-3.5 shrink-0" />
              Super-Admin Console
            </button>
          )}
          <div className="flex items-center justify-between gap-2 px-1 pt-1">
            <button
              type="button"
              onClick={() => {
                onNavigate('profile');
                setDrawerOpen(false);
              }}
              className="min-w-0 text-left hover:opacity-90"
            >
              <p className="truncate text-xs font-semibold text-white">{user?.fullName}</p>
              <p className="truncate text-[11px] text-blue-200/75">{user?.email}</p>
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              title="Sign Out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-blue-200 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Contextual Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 lg:hidden shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <h1 className="truncate font-display text-sm sm:text-base font-bold text-slate-900">
                {ROUTE_TITLES[route]}
              </h1>
              {activeWorkspace && (
                <span className="hidden text-xs text-slate-400 md:inline truncate">
                  · {activeWorkspace.brandProfile?.brandName || activeWorkspace.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeWorkspace && (
              <button
                type="button"
                onClick={() => onNavigate('billing')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {activeWorkspace.aiCreditsBalance.toLocaleString()}
                </span>
                <span>AI credits</span>
              </button>
            )}
            <PWAInstallButton variant="light" />
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Schedule Post
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-8 max-w-7xl w-full mx-auto">
          {oauthBanner && (
            <div
              role="status"
              className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-xs ${
                oauthBanner.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <span>{oauthBanner.text}</span>
              {onDismissOAuthBanner && (
                <button
                  type="button"
                  onClick={onDismissOAuthBanner}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {user && !user.emailVerified && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs font-semibold text-blue-950 shadow-xs">
              <span>
                Your email address ({user.email}) is pending verification. Verify in Profile Settings to enable production publishing pipelines.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="font-bold text-blue-700 hover:underline whitespace-nowrap"
              >
                Verify in Profile Settings
              </button>
            </div>
          )}

          {renderPage()}
        </main>

        {/* OPay-Inspired Fixed Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2.5 backdrop-blur-md shadow-lg lg:hidden"
        >
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
              route === 'overview' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="mt-1">Home</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('social-accounts')}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
              route === 'social-accounts' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 className="h-5 w-5" />
            <span className="mt-1">Social</span>
          </button>

          {/* Prominent Center Create Button */}
          <button
            type="button"
            onClick={() => onNavigate('ai-studio')}
            aria-label="Create AI Content"
            className="group -mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-xl shadow-blue-600/40 hover:scale-105 transition-transform focus:outline-none"
          >
            <Sparkles className="h-6 w-6 animate-pulse text-yellow-300" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
              route === 'calendar' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="mt-1">Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[56px] rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
              route === 'profile' || route === 'brand-settings' || route === 'billing'
                ? 'text-blue-700'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCog className="h-5 w-5" />
            <span className="mt-1">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
