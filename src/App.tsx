import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppErrorBoundary, OfflineIndicator } from './components/PWAControls';
import { PublicPortal, type PublicPage } from './components/PublicPortal';
import { AppShell } from './components/AppShell';
import { SuperAdminConsole, type AdminSection } from './pages/admin/SuperAdminConsole';
import type { CustomerRoute } from './pages/customer/types';

type AppRouteState =
  | { area: 'public'; page: PublicPage }
  | { area: 'customer'; page: CustomerRoute }
  | { area: 'admin'; page: AdminSection };

const PUBLIC_PAGES: PublicPage[] = [
  'login',
  'register',
  'forgot-password',
  'verify-email',
  'recovery',
  'pricing',
  'privacy',
  'terms',
];

const CUSTOMER_ROUTES: CustomerRoute[] = [
  'overview',
  'social-accounts',
  'ai-studio',
  'graphic-designer',
  'calendar',
  'auto-publisher',
  'publishing-history',
  'ai-strategy',
  'engagement',
  'analytics',
  'media',
  'notifications',
  'billing',
  'team',
  'brand-settings',
  'profile',
  'support',
];

const ADMIN_SECTIONS: AdminSection[] = [
  'overview',
  'users',
  'subscriptions',
  'ai-usage',
  'social-platforms',
  'publishing-jobs',
  'failed-jobs',
  'system-settings',
  'audit-logs',
  'support',
];

function parsePathname(pathname: string): AppRouteState {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/login') return { area: 'public', page: 'login' };

  const segments = clean.slice(1).split('/');
  if (segments[0] === 'app') {
    const sub = (segments[1] || 'overview') as CustomerRoute;
    return {
      area: 'customer',
      page: CUSTOMER_ROUTES.includes(sub) ? sub : 'overview',
    };
  }
  if (segments[0] === 'admin') {
    const sub = (segments[1] || 'overview') as AdminSection;
    return {
      area: 'admin',
      page: ADMIN_SECTIONS.includes(sub) ? sub : 'overview',
    };
  }
  if (PUBLIC_PAGES.includes(segments[0] as PublicPage)) {
    return { area: 'public', page: segments[0] as PublicPage };
  }
  return { area: 'public', page: 'login' };
}

function toPathname(state: AppRouteState): string {
  if (state.area === 'public') return `/${state.page}`;
  if (state.area === 'customer') return `/app/${state.page}`;
  return `/admin/${state.page}`;
}

const RouterView: React.FC = () => {
  const { user, loading } = useAuth();
  const [routeState, setRouteState] = useState<AppRouteState>(() =>
    parsePathname(window.location.pathname)
  );
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const navigate = useCallback((next: AppRouteState, replace = false) => {
    setRouteState(next);
    const nextPath = toPathname(next);
    if (window.location.pathname !== nextPath) {
      if (replace) {
        window.history.replaceState({}, '', nextPath);
      } else {
        window.history.pushState({}, '', nextPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPopState = () => setRouteState(parsePathname(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Inspect OAuth callback query params cleanly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const oauthPlatform = params.get('platform');
    const oauthError = params.get('oauth_error');

    if (oauthStatus === 'connected' && oauthPlatform) {
      setOauthBanner({
        type: 'success',
        text: `Official OAuth connection established for ${oauthPlatform}. Tokens stored securely server-side.`,
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      setOauthBanner({
        type: 'error',
        text: `OAuth authorization did not complete: ${oauthError}`,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth route protection & post-login redirect
  useEffect(() => {
    if (loading) return;
    if (!user && (routeState.area === 'customer' || routeState.area === 'admin')) {
      navigate({ area: 'public', page: 'login' }, true);
    } else if (
      user &&
      routeState.area === 'public' &&
      (routeState.page === 'login' || routeState.page === 'register')
    ) {
      navigate({ area: 'customer', page: 'overview' }, true);
    }
  }, [loading, user, routeState, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <img
          src="/assets/aistudio/20261112_184805_8a13799e.jpg"
          alt="LIVINGTECH BRAND AGENCY"
          referrerPolicy="no-referrer"
          className="h-12 w-auto object-contain"
        />
        <p className="mt-4 text-xs font-medium text-slate-500">
          Initializing secure multi-tenant workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    const publicPage: PublicPage = routeState.area === 'public' ? routeState.page : 'login';
    return (
      <PublicPortal
        page={publicPage}
        onNavigate={(page) => navigate({ area: 'public', page })}
      />
    );
  }

  if (routeState.area === 'admin') {
    return (
      <SuperAdminConsole
        section={routeState.page}
        onNavigateSection={(section) => navigate({ area: 'admin', page: section })}
        onReturnCustomerApp={() => navigate({ area: 'customer', page: 'overview' })}
      />
    );
  }

  if (
    routeState.area === 'public' &&
    (routeState.page === 'pricing' ||
      routeState.page === 'privacy' ||
      routeState.page === 'terms' ||
      routeState.page === 'verify-email')
  ) {
    return (
      <PublicPortal
        page={routeState.page}
        onNavigate={(page) => {
          if (page === 'login' || page === 'register') {
            navigate({ area: 'customer', page: 'overview' });
          } else {
            navigate({ area: 'public', page });
          }
        }}
      />
    );
  }

  const customerPage: CustomerRoute =
    routeState.area === 'customer' ? routeState.page : 'overview';

  return (
    <AppShell
      route={customerPage}
      onNavigate={(page) => navigate({ area: 'customer', page })}
      onOpenSuperAdmin={() => navigate({ area: 'admin', page: 'overview' })}
      oauthBanner={oauthBanner}
      onDismissOAuthBanner={() => setOauthBanner(null)}
    />
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RouterView />
        <OfflineIndicator />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
