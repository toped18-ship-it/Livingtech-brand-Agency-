import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Check,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSystemSettings } from '../context/SystemSettingsContext';
import { apiClient } from '../lib/apiClient';
import { formatCurrencyCents, validatePasswordStrength } from '../utils/domain';
import type { SubscriptionPlanRecord } from '../shared/api-contracts';
import { PWAInstallButton } from './PWAControls';

export type PublicPage =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-email'
  | 'recovery'
  | 'pricing'
  | 'privacy'
  | 'terms';

interface PublicPortalProps {
  page: PublicPage;
  onNavigate: (page: PublicPage) => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({ page, onNavigate }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const { settings } = useSystemSettings();

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [industry, setIndustry] = useState('Digital Marketing & Brand Agency');
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  // Pricing states
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    setError(null);
    setNotice(null);
    if (page === 'pricing' && plans.length === 0) {
      apiClient.getPlans().then(setPlans).catch(() => {});
    }
  }, [page, plans.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      setError(pwCheck.reason || 'Weak password.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await register({
        email,
        password,
        fullName,
        workspaceName: workspaceName || undefined,
        industry,
      });
      if (res.verificationToken) {
        setPreviewToken(res.verificationToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiClient.forgotPassword(email);
      setNotice(res.message);
      if (res.previewResetToken) {
        setPreviewToken(res.previewResetToken);
        setTokenInput(res.previewResetToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiClient.resetPassword(tokenInput, newPassword);
      setNotice(res.message);
      setNewPassword('');
      setTokenInput('');
      setPreviewToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiClient.verifyEmail(tokenInput);
      setNotice(res.message);
      setTokenInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiClient.recoverAccount(email, recoveryReason);
      setNotice(res.message);
      setRecoveryReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account recovery failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAuthSplit =
    page === 'login' ||
    page === 'register' ||
    page === 'forgot-password' ||
    page === 'verify-email' ||
    page === 'recovery';

  return (
    <div className="min-h-screen flex flex-col bg-[#050e28] text-white">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <div className="lt-logo-frame h-10 w-44 overflow-hidden rounded-md bg-white flex items-center justify-center px-1">
              <img
                src={settings.app_logo_url || '/assets/aistudio/20261112_184805_8a13799e.jpg'}
                alt={settings.app_name || 'LIVINGTECH BRAND AGENCY'}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain scale-[1.22]"
              />
            </div>
          </button>

          <nav aria-label="Public navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-blue-700 ${page === 'login' ? 'text-blue-700 font-semibold' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-blue-700 ${page === 'pricing' ? 'text-blue-700 font-semibold' : ''}`}
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => onNavigate('verify-email')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-blue-700 ${page === 'verify-email' ? 'text-blue-700 font-semibold' : ''}`}
            >
              Verify Email
            </button>
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-blue-700 ${page === 'privacy' ? 'text-blue-700 font-semibold' : ''}`}
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('terms')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-blue-700 ${page === 'terms' ? 'text-blue-700 font-semibold' : ''}`}
            >
              Terms
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => onNavigate(page === 'register' ? 'login' : 'register')}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              {page === 'register' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {isAuthSplit ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
            {/* Left Executive Brand Panel */}
            <div className="lt-neon-hero flex flex-col justify-between rounded-2xl p-7 text-white lg:col-span-5 lg:p-9">
              <div>
                <div className="lt-logo-frame inline-flex h-16 w-60 items-center justify-center overflow-hidden rounded-xl bg-white px-2 shadow-sm">
                  <img
                    src={settings.app_logo_url || '/assets/aistudio/20261112_184805_8a13799e.jpg'}
                    alt={`${settings.app_name || 'LIVINGTECH BRAND AGENCY'} official brand mark`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain scale-[1.22]"
                  />
                </div>
                <h1 className="mt-7 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {settings.app_name || 'LIVINGTECH BRAND AGENCY'}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/90">
                  {settings.app_tagline || 'Manage multi-tenant client workspaces, generate brand-aligned campaigns in AI Content Studio, schedule publishing pipelines, and govern team access from one unified platform.'}
                </p>

                <div className="mt-8 space-y-4 border-t border-white/15 pt-6 text-sm text-blue-50">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-semibold text-white">Isolated Multi-Tenant Workspaces</p>
                      <p className="text-xs text-blue-200/85">Dedicated brand profiles, color systems, team RBAC, and tenant data boundaries.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                    <div>
                      <p className="font-semibold text-white">Official OAuth & Encrypted Token Vault</p>
                      <p className="text-xs text-blue-200/85">Server-side OAuth architecture for Meta, LinkedIn, X, TikTok, and YouTube. Zero browser-exposed tokens.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                    <div>
                      <p className="font-semibold text-white">PWA & Android Capacitor Ready</p>
                      <p className="text-xs text-blue-200/85">Shared REST API contracts and responsive mobile shell engineered for web and native Android builds.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/15 pt-5 text-xs text-blue-200/80">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Phase 1 Foundation</span>
                  <span aria-hidden="true">·</span>
                  <span>Multi-Tenant RBAC</span>
                  <span aria-hidden="true">·</span>
                  <span>23 Relational Tables</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Auth Card */}
            <div className="lt-neon-card flex flex-col justify-center rounded-2xl p-6 sm:p-9 lg:col-span-7">
              {error && (
                <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
              {notice && (
                <div role="status" className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{notice}</span>
                </div>
              )}

              {page === 'login' && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">Sign in to your workspace</h2>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Access your {settings.app_name || 'LIVINGTECH BRAND AGENCY'} customer dashboard or authorized super-admin console.
                  </p>

                  <form onSubmit={handleLogin} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
                        Work Email
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => onNavigate('forgot-password')}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <input
                        id="login-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
                    >
                      {submitting ? 'Authenticating...' : 'Sign In'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>

                  <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span>or continue with identity provider</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-blue-700" />
                    Continue with Google (Firebase Auth)
                  </button>

                  {/* Phase 1 Evaluation Access Bar */}
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <p className="text-xs font-semibold text-slate-700">Phase 1 Seeded Accounts for Testing</p>
                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('livingstoneedu64@gmail.com');
                          setPassword('Admin@LivingTech2026');
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="text-xs font-semibold text-slate-900">Super-Admin Account</div>
                        <div className="font-mono-tabular text-[11px] text-slate-500 truncate">livingstoneedu64@gmail.com</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('client@auroraventures.io');
                          setPassword('Client@LivingTech2026');
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="text-xs font-semibold text-slate-900">Customer Tenant Account</div>
                        <div className="font-mono-tabular text-[11px] text-slate-500 truncate">client@auroraventures.io</div>
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>
                      New to LIVINGTECH?{' '}
                      <button type="button" onClick={() => onNavigate('register')} className="font-semibold text-blue-700 hover:underline">
                        Create an account
                      </button>
                    </span>
                    <button type="button" onClick={() => onNavigate('recovery')} className="text-slate-500 hover:text-blue-700 hover:underline">
                      Account recovery
                    </button>
                  </div>
                </div>
              )}

              {page === 'register' && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">Create your brand workspace</h2>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Provision an isolated multi-tenant workspace with 250 trial AI credits and role-based team controls.
                  </p>

                  <form onSubmit={handleRegister} className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700">
                          Full Name
                        </label>
                        <input
                          id="reg-name"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jordan Adeyemi"
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="reg-ws" className="block text-xs font-semibold text-slate-700">
                          Workspace / Brand Name
                        </label>
                        <input
                          id="reg-ws"
                          type="text"
                          required
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder="Apex Global Media"
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
                          Work Email
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jordan@apexmedia.com"
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                      <div>
                        <label htmlFor="reg-industry" className="block text-xs font-semibold text-slate-700">
                          Industry
                        </label>
                        <input
                          id="reg-industry"
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="SaaS, Retail, Finance..."
                          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                        Password (8+ chars, upper/lowercase, number)
                      </label>
                      <input
                        id="reg-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
                    >
                      {submitting ? 'Provisioning Workspace...' : 'Create Account & Workspace'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>

                  <p className="mt-5 text-xs text-slate-500">
                    By registering, you agree to our{' '}
                    <button type="button" onClick={() => onNavigate('terms')} className="text-blue-700 hover:underline">
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button type="button" onClick={() => onNavigate('privacy')} className="text-blue-700 hover:underline">
                      Privacy Policy
                    </button>
                    . Already have an account?{' '}
                    <button type="button" onClick={() => onNavigate('login')} className="font-semibold text-blue-700 hover:underline">
                      Sign in
                    </button>
                  </p>
                </div>
              )}

              {page === 'forgot-password' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Reset your password</h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      Step 1: Request a cryptographic password reset token. Step 2: Confirm your new password below.
                    </p>
                  </div>

                  <form onSubmit={handleRequestReset} className="space-y-3 border-b border-slate-200 pb-6">
                    <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700">
                      Account Email Address
                    </label>
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                      >
                        <KeyRound className="h-4 w-4" />
                        Send Reset Token
                      </button>
                    </div>
                    {previewToken && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
                        <span className="font-semibold">Phase 1 Dev Token Issued: </span>
                        <code className="font-mono-tabular break-all">{previewToken}</code>
                      </div>
                    )}
                  </form>

                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <label htmlFor="reset-token" className="block text-xs font-semibold text-slate-700">
                        Reset Token
                      </label>
                      <input
                        id="reset-token"
                        type="text"
                        required
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Paste your reset token"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono-tabular text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="reset-new-pw" className="block text-xs font-semibold text-slate-700">
                        New Password
                      </label>
                      <input
                        id="reset-new-pw"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8+ chars with upper, lower, and digit"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      Confirm New Password
                    </button>
                  </form>

                  <button type="button" onClick={() => onNavigate('login')} className="text-xs font-semibold text-blue-700 hover:underline">
                    Back to Sign In
                  </button>
                </div>
              )}

              {page === 'verify-email' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Verify your email address</h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      Enter the verification token sent to your inbox (or issued in your Profile Settings) to unlock production publishing.
                    </p>
                  </div>
                  <form onSubmit={handleVerifyEmail} className="space-y-4">
                    <div>
                      <label htmlFor="verify-token" className="block text-xs font-semibold text-slate-700">
                        Verification Token
                      </label>
                      <input
                        id="verify-token"
                        type="text"
                        required
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Enter 40-character verification token"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono-tabular text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Verify Email Address
                    </button>
                  </form>
                  <button type="button" onClick={() => onNavigate('login')} className="text-xs font-semibold text-blue-700 hover:underline">
                    Return to Sign In
                  </button>
                </div>
              )}

              {page === 'recovery' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Account Recovery</h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      Restore a recently deactivated account or submit an identity recovery request to LIVINGTECH Security Operations.
                    </p>
                  </div>
                  <form onSubmit={handleRecoverAccount} className="space-y-4">
                    <div>
                      <label htmlFor="rec-email" className="block text-xs font-semibold text-slate-700">
                        Registered Email
                      </label>
                      <input
                        id="rec-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="rec-reason" className="block text-xs font-semibold text-slate-700">
                        Recovery Reason
                      </label>
                      <textarea
                        id="rec-reason"
                        required
                        rows={3}
                        value={recoveryReason}
                        onChange={(e) => setRecoveryReason(e.target.value)}
                        placeholder="Describe why you need workspace access restored..."
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Submit Account Recovery
                    </button>
                  </form>
                  <button type="button" onClick={() => onNavigate('login')} className="text-xs font-semibold text-blue-700 hover:underline">
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : page === 'pricing' ? (
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">Transparent SaaS Plans for Brands & Agencies</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Every tier includes isolated tenant workspaces, server-side OAuth security, AI Content Studio credits, and responsive PWA/mobile readiness.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/75 p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (Save 17%)
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const price = billingCycle === 'monthly' ? plan.monthlyPriceCents : Math.round(plan.annualPriceCents / 12);
                const isFeatured = plan.code === 'pro' || plan.code === 'agency';
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col justify-between rounded-2xl p-6 ${
                      isFeatured ? 'lt-neon-hero text-white' : 'lt-neon-card text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold">{plan.name}</h2>
                        {isFeatured && <span className="text-xs font-semibold text-amber-400">Most Popular</span>}
                      </div>
                      <p className={`mt-1 text-xs ${isFeatured ? 'text-blue-200' : 'text-slate-500'}`}>{plan.tagline}</p>
                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="font-mono-tabular text-3xl font-bold">{formatCurrencyCents(price)}</span>
                        <span className={`text-xs ${isFeatured ? 'text-blue-200' : 'text-slate-500'}`}>/ month</span>
                      </div>

                      <dl className={`mt-5 space-y-2 border-y py-4 text-xs ${isFeatured ? 'border-white/15 text-blue-100' : 'border-slate-200 text-slate-600'}`}>
                        <div className="flex justify-between">
                          <dt>Workspaces</dt>
                          <dd className="font-mono-tabular font-semibold">{plan.maxWorkspaces}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Social Accounts</dt>
                          <dd className="font-mono-tabular font-semibold">{plan.maxSocialAccounts}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Team Members</dt>
                          <dd className="font-mono-tabular font-semibold">{plan.maxTeamMembers}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Monthly AI Credits</dt>
                          <dd className="font-mono-tabular font-semibold">{plan.monthlyAiCredits.toLocaleString()}</dd>
                        </div>
                      </dl>

                      <ul className="mt-5 space-y-2 text-xs">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isFeatured ? 'text-sky-300' : 'text-blue-700'}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('register')}
                      className={`mt-6 w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
                        isFeatured
                          ? 'lt-btn-light bg-white text-blue-950 hover:bg-blue-50'
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      }`}
                    >
                      Start with {plan.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10">
              <p className="text-xs font-semibold text-blue-700">LIVINGTECH BRAND AGENCY Legal Governance</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">
                {page === 'privacy' ? 'Privacy Policy & Data Protection' : 'Terms of Service'}
              </h1>
              <p className="mt-2 text-xs text-slate-500">Effective Date: November 2026 · Multi-Tenant SaaS Edition</p>

              {page === 'privacy' ? (
                <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">1. Multi-Tenant Data Isolation</h2>
                    <p className="mt-1.5">
                      Every customer organisation operates inside strictly scoped workspace boundaries enforced via database Row Level Security (RLS), tenant-verified API authorization middleware, and Firestore security rules. No customer can read, list, or modify another customer&apos;s private content, media assets, analytics, or credentials.
                    </p>
                  </section>
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">2. Official OAuth & Token Protection</h2>
                    <p className="mt-1.5">
                      Social media access and refresh tokens issued by Meta, LinkedIn, X, TikTok, and YouTube are encrypted at rest on the server using AES-256-GCM and are never exposed to client browser bundles, local storage, or public API payloads.
                    </p>
                  </section>
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">3. Data Deletion & User Rights</h2>
                    <p className="mt-1.5">
                      Workspace owners may export content records or initiate full account deletion at any time from Profile Settings. Upon deletion confirmation, active sessions are revoked immediately and tenant records are queued for permanent purge.
                    </p>
                  </section>
                </div>
              ) : (
                <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">1. Platform Usage & Account Security</h2>
                    <p className="mt-1.5">
                      Customers are responsible for maintaining strong credentials, verifying account ownership, and assigning appropriate role-based permissions to invited team members within their LIVINGTECH BRAND AGENCY workspaces.
                    </p>
                  </section>
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">2. Third-Party Social Platform Compliance</h2>
                    <p className="mt-1.5">
                      Automated publishing and scheduling through official platform APIs must adhere to the respective developer policies and rate limits of Meta, LinkedIn, X, TikTok, and YouTube.
                    </p>
                  </section>
                  <section>
                    <h2 className="font-display text-base font-semibold text-slate-900">3. AI Studio Credits & Subscription Billing</h2>
                    <p className="mt-1.5">
                      AI Content Studio and AI Content Strategy operations consume workspace AI credits transparently according to plan allocations. Unused trial or monthly credits roll over only where specified in Enterprise agreements.
                    </p>
                  </section>
                </div>
              )}
            </div>
          </article>
        )}
      </main>

      {/* Quiet Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>{settings.app_footer_text || `© ${new Date().getFullYear()} LIVINGTECH BRAND AGENCY. Building Brands, Creating Possibilities.`}</span>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => onNavigate('pricing')} className="hover:text-blue-700">Pricing</button>
            <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-blue-700">Privacy Policy</button>
            <button type="button" onClick={() => onNavigate('terms')} className="hover:text-blue-700">Terms of Service</button>
            <button type="button" onClick={() => onNavigate('recovery')} className="hover:text-blue-700">Account Recovery</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
