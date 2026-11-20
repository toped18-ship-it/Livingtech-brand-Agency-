import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Send,
  UserCheck,
  FileText,
} from 'lucide-react';
import type { PlatformKey } from '../../shared/api-contracts';
import { PlatformLogo } from './PlatformLogo';

export interface SocialAuthOwnerProfile {
  accountName: string;
  accountHandle: string;
  ownerEmail: string;
  businessCategory: string;
  accountDescription: string;
  followersCount: number;
  recentPosts: string[];
}

interface SocialAuthPageProps {
  platform: PlatformKey;
  displayName: string;
  callbackUrl: string;
  permissions: { scopeKey: string; label: string; description: string; isRequired: boolean }[];
  defaultBrandName: string;
  defaultOwnerEmail: string;
  defaultIndustry: string;
  defaultDescription: string;
  submitting: boolean;
  errorMessage?: string | null;
  onAuthorize: (profile: SocialAuthOwnerProfile) => Promise<void> | void;
  onCancel: () => void;
}

const OFFICIAL_AUTH_DOMAINS: Record<PlatformKey, { domain: string; accentBar: string; buttonClass: string }> = {
  facebook: {
    domain: 'www.facebook.com/v21.0/dialog/oauth',
    accentBar: 'from-[#1877F2] via-[#2563EB] to-[#38BDF8]',
    buttonClass: 'bg-[#1877F2] hover:bg-[#1565D8]',
  },
  instagram: {
    domain: 'www.instagram.com/oauth/authorize',
    accentBar: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    buttonClass: 'bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] hover:opacity-95',
  },
  tiktok: {
    domain: 'www.tiktok.com/v2/auth/authorize',
    accentBar: 'from-[#25F4EE] via-[#111827] to-[#FE2C55]',
    buttonClass: 'bg-[#FE2C55] hover:bg-[#E11D48]',
  },
  linkedin: {
    domain: 'www.linkedin.com/oauth/v2/authorization',
    accentBar: 'from-[#0A66C2] via-[#1D4ED8] to-[#38BDF8]',
    buttonClass: 'bg-[#0A66C2] hover:bg-[#0855A1]',
  },
  youtube: {
    domain: 'accounts.google.com/o/oauth2/v2/auth',
    accentBar: 'from-[#FF0000] via-[#DC2626] to-[#F97316]',
    buttonClass: 'bg-[#DC2626] hover:bg-[#B91C1C]',
  },
  x: {
    domain: 'x.com/i/oauth2/authorize',
    accentBar: 'from-[#38BDF8] via-[#1E293B] to-[#64748B]',
    buttonClass: 'bg-[#1D9BF0] hover:bg-[#1A8CD8]',
  },
  pinterest: {
    domain: 'www.pinterest.com/oauth',
    accentBar: 'from-[#E60023] via-[#DC2626] to-[#FB7185]',
    buttonClass: 'bg-[#E60023] hover:bg-[#C8001E]',
  },
  google_business: {
    domain: 'accounts.google.com/o/oauth2/v2/auth',
    accentBar: 'from-[#4285F4] via-[#34A853] to-[#FBBC05]',
    buttonClass: 'bg-[#1A73E8] hover:bg-[#1557B0]',
  },
};

function makeHandleSlug(brandName: string): string {
  const cleaned = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
  return `@${cleaned || 'brand_official'}`;
}

export const SocialAuthPage: React.FC<SocialAuthPageProps> = ({
  platform,
  displayName,
  callbackUrl,
  permissions,
  defaultBrandName,
  defaultOwnerEmail,
  defaultIndustry,
  defaultDescription,
  submitting,
  errorMessage,
  onAuthorize,
  onCancel,
}) => {
  const brandMeta = OFFICIAL_AUTH_DOMAINS[platform];
  const initialSlug = useMemo(() => makeHandleSlug(defaultBrandName), [defaultBrandName]);

  const [accountName, setAccountName] = useState(
    defaultBrandName ? `${defaultBrandName} Official` : `My ${displayName} Account`
  );
  const [accountHandle, setAccountHandle] = useState(initialSlug);
  const [ownerEmail, setOwnerEmail] = useState(defaultOwnerEmail || '');
  const [businessCategory, setBusinessCategory] = useState(defaultIndustry || 'Brand & Digital Media');
  const [followersCount, setFollowersCount] = useState('4850');
  const [accountDescription, setAccountDescription] = useState(
    defaultDescription ||
      `Official ${displayName} presence for ${defaultBrandName || 'our brand'}. Sharing product updates, customer stories, and industry insights.`
  );
  const [recentPostsText, setRecentPostsText] = useState(
    [
      `Behind the scenes with ${defaultBrandName || 'our team'}: how we craft solutions that help our community grow every day.`,
      `New week, new milestone! Discover our latest ${defaultIndustry || 'brand'} release and tell us what you want to see next.`,
    ].join('\n')
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [showLiveSetup, setShowLiveSetup] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedName = accountName.trim();
    const rawHandle = accountHandle.trim();
    if (!trimmedName) {
      setLocalError(`Please enter your ${displayName} account or page name.`);
      return;
    }
    if (!rawHandle) {
      setLocalError(`Please enter your ${displayName} handle (e.g. @yourbrand).`);
      return;
    }

    const normalizedHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const parsedFollowers = Math.max(0, Number.parseInt(followersCount.replace(/[^0-9]/g, ''), 10) || 0);
    const recentPosts = recentPostsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length >= 6)
      .slice(0, 6);

    void onAuthorize({
      accountName: trimmedName,
      accountHandle: normalizedHandle,
      ownerEmail: ownerEmail.trim(),
      businessCategory: businessCategory.trim() || 'Business',
      accountDescription: accountDescription.trim(),
      followersCount: parsedFollowers,
      recentPosts,
    });
  };

  const handleCopyCallback = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    } catch {
      // Clipboard blocked in iframe
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-auth-page-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#050e28] text-white"
    >
      {/* Top Platform Accent Stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${brandMeta.accentBar}`} />

      {/* Top OAuth Security Header Bar */}
      <header className="sticky top-0 z-10 border-b border-sky-400/20 bg-[#071538]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Social Accounts
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-[#04102c] px-3 py-1.5 text-xs">
            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono-tabular text-white/90 truncate max-w-[260px] sm:max-w-md">
              https://{brandMeta.domain}
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            OAuth 2.0 + PKCE · AES-256-GCM
          </div>
        </div>
      </header>

      {/* Main Authentication & Consent Workspace */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Identity Connection Banner */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-sky-400/25 bg-[#0a1b47] p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <PlatformLogo platformKey={platform} size="lg" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                {displayName} Account Owner Authorization
              </p>
              <h1
                id="social-auth-page-title"
                className="mt-0.5 font-display text-xl font-bold text-white sm:text-2xl"
              >
                Authorize {displayName} for LivingTech Brand Agency
              </h1>
              <p className="mt-1 text-xs text-white/85 sm:text-sm">
                Sign in with your {displayName} account details and approve access so our AI can read your profile, learn your content voice, schedule posts, and publish automatically.
              </p>
            </div>
          </div>
        </div>

        {(localError || errorMessage) && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-400/50 bg-rose-950/60 px-4 py-3 text-sm font-semibold text-white"
          >
            {localError || errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Social Media Owner Account Credentials & Content Profile */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 space-y-5 rounded-2xl border border-sky-400/25 bg-[#0a1b47] p-6 shadow-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-sky-400/20 pb-4">
              <UserCheck className="h-5 w-5 text-sky-300" />
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  1. Verify Your {displayName} Account & Profile
                </h2>
                <p className="text-xs text-white/80">
                  Enter the {displayName} handle and profile details you own and wish to connect.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="social-auth-account-name"
                  className="block text-xs font-bold text-white mb-1.5"
                >
                  {displayName} Account / Page Name *
                </label>
                <input
                  id="social-auth-account-name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={`e.g. ${defaultBrandName || 'Aurora Ventures'} Official`}
                  className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 text-sm font-medium text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="social-auth-account-handle"
                  className="block text-xs font-bold text-white mb-1.5"
                >
                  {displayName} Handle / Username *
                </label>
                <input
                  id="social-auth-account-handle"
                  type="text"
                  required
                  value={accountHandle}
                  onChange={(e) => setAccountHandle(e.target.value)}
                  placeholder="@yourbrand"
                  className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 font-mono-tabular text-sm font-medium text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label
                  htmlFor="social-auth-owner-email"
                  className="block text-xs font-bold text-white mb-1.5"
                >
                  Account Owner Email
                </label>
                <input
                  id="social-auth-owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@brand.com"
                  className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 text-sm font-medium text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label
                  htmlFor="social-auth-category"
                  className="block text-xs font-bold text-white mb-1.5"
                >
                  Category / Niche
                </label>
                <input
                  id="social-auth-category"
                  type="text"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  placeholder="Technology, Fashion, Retail..."
                  className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 text-sm font-medium text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <label
                  htmlFor="social-auth-followers"
                  className="block text-xs font-bold text-white mb-1.5"
                >
                  Current Followers
                </label>
                <input
                  id="social-auth-followers"
                  type="number"
                  min={0}
                  value={followersCount}
                  onChange={(e) => setFollowersCount(e.target.value)}
                  placeholder="4850"
                  className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 font-mono-tabular text-sm font-medium text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="social-auth-bio"
                className="block text-xs font-bold text-white mb-1.5"
              >
                Profile Bio / Description (Synced to AI Brand Voice)
              </label>
              <textarea
                id="social-auth-bio"
                rows={3}
                value={accountDescription}
                onChange={(e) => setAccountDescription(e.target.value)}
                placeholder={`Describe what your ${displayName} account shares and who you serve...`}
                className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 text-sm text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="social-auth-recent-posts"
                className="flex items-center gap-1.5 text-xs font-bold text-white mb-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-sky-300" />
                Recent Posts / Content Samples to Import for AI (One per line)
              </label>
              <textarea
                id="social-auth-recent-posts"
                rows={3}
                value={recentPostsText}
                onChange={(e) => setRecentPostsText(e.target.value)}
                placeholder="Paste 1–4 recent captions or content themes from your channel so AI matches your style..."
                className="w-full rounded-xl border border-sky-400/35 bg-[#05102d] px-3.5 py-2.5 text-sm text-white placeholder-white/50 focus:border-sky-300 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-white/80">
                Imported into your workspace content context so AI Content Studio, Caption Writer, and Content Calendar generate on-brand posts tailored to this account.
              </p>
            </div>

            {/* Primary Consent Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-sky-400/20 pt-5">
              <button
                type="button"
                disabled={submitting}
                onClick={onCancel}
                className="rounded-xl border border-sky-400/35 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-60 ${brandMeta.buttonClass}`}
              >
                <ShieldCheck className="h-4 w-4" />
                {submitting
                  ? `Authorizing ${displayName}...`
                  : `Authorize & Connect ${displayName}`}
              </button>
            </div>
          </form>

          {/* Right Column: Permissions Checklist & AI Automation Overview */}
          <div className="lg:col-span-5 space-y-5">
            {/* How AI Uses Connected Profile & Content */}
            <div className="rounded-2xl border border-sky-400/25 bg-[#0a1b47] p-5 space-y-3.5">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-sky-300">
                How AI Uses Your Authorized Channel
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-[#061336] p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <div>
                    <p className="text-xs font-bold text-white">AI Content Generation</p>
                    <p className="mt-0.5 text-xs text-white/80">
                      Reads your handle, niche, bio, and synced posts to write platform-native captions, hooks, and hashtags.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-[#061336] p-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <div>
                    <p className="text-xs font-bold text-white">Smart Scheduling</p>
                    <p className="mt-0.5 text-xs text-white/80">
                      Builds multi-day calendars aligned to your channel audience without repeating recent topics.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-[#061336] p-3">
                  <Send className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-xs font-bold text-white">Direct Auto-Publishing</p>
                    <p className="mt-0.5 text-xs text-white/80">
                      Dispatches approved posts straight to your {displayName} account via encrypted OAuth tokens.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requested Scopes Checklist */}
            <div className="rounded-2xl border border-sky-400/25 bg-[#0a1b47] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-sky-300">
                  Requested Permissions ({permissions.length || 3})
                </h2>
                <span className="text-[11px] font-semibold text-emerald-300">Revocable Anytime</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(permissions.length > 0
                  ? permissions
                  : [
                      {
                        scopeKey: 'profile.read',
                        label: 'Read Profile & Account Info',
                        description: 'Access account name, handle, bio, and follower metrics.',
                        isRequired: true,
                      },
                      {
                        scopeKey: 'content.read',
                        label: 'Sync Recent Content & Performance',
                        description: 'Import existing posts and engagement metrics for AI context.',
                        isRequired: true,
                      },
                      {
                        scopeKey: 'content.publish',
                        label: 'Schedule & Publish Posts',
                        description: 'Create and publish approved content on your behalf.',
                        isRequired: true,
                      },
                    ]
                ).map((perm) => (
                  <div
                    key={perm.scopeKey}
                    className="flex items-start gap-2.5 rounded-xl border border-sky-400/20 bg-[#061336] px-3 py-2.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{perm.label}</p>
                      {perm.description && (
                        <p className="mt-0.5 text-[11px] text-white/80">{perm.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collapsible Live External OAuth Configuration Info */}
            <div className="rounded-2xl border border-sky-400/20 bg-[#08163b] p-4">
              <button
                type="button"
                onClick={() => setShowLiveSetup((prev) => !prev)}
                className="flex w-full items-center justify-between text-left text-xs font-bold text-white"
              >
                <span>Live External {displayName} App Redirect Info</span>
                {showLiveSetup ? (
                  <ChevronUp className="h-4 w-4 text-sky-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-sky-300" />
                )}
              </button>
              {showLiveSetup && (
                <div className="mt-3 space-y-2 border-t border-sky-400/15 pt-3 text-xs text-white/85">
                  <p>
                    Want to redirect directly to {displayName}&apos;s external developer login? Add your {displayName} OAuth Client ID &amp; Secret in the Super-Admin Console (Social Integrations) or server secrets, and register this callback URI:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-sky-400/25 bg-[#040d26] p-2">
                    <code className="flex-1 truncate font-mono-tabular text-[11px] text-sky-200">
                      {callbackUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopyCallback()}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-400/30 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                    >
                      {copiedCallback ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedCallback ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
