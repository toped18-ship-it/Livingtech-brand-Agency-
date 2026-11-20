import type { CustomerRoute } from '../pages/customer/types';
import type { PlanCode, WorkspaceSubscriptionSummary } from '../shared/api-contracts';

export type PlanTier = 'none' | 'basic' | 'pro' | 'enterprise';

export type PaidPlanTier = Exclude<PlanTier, 'none'>;

export type FeatureKey =
  | 'social_accounts'
  | 'ai_studio'
  | 'calendar'
  | 'media'
  | 'graphic_designer'
  | 'auto_publisher'
  | 'publishing_history'
  | 'engagement'
  | 'analytics'
  | 'team'
  | 'ai_strategy';

export interface PlanQuotaLimits {
  tier: PlanTier;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxTeamMembers: number;
  monthlyAiCredits: number;
}

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  requiredTier: PaidPlanTier;
  route: CustomerRoute;
}

export const PLAN_RANK: Record<PlanTier, number> = {
  none: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export const PLAN_LIMITS: Record<PlanTier, PlanQuotaLimits> = {
  none: {
    tier: 'none',
    name: 'No Active Plan',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    maxWorkspaces: 1,
    maxSocialAccounts: 0,
    maxTeamMembers: 1,
    monthlyAiCredits: 0,
  },
  basic: {
    tier: 'basic',
    name: 'Basic',
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    maxWorkspaces: 1,
    maxSocialAccounts: 5,
    maxTeamMembers: 1,
    monthlyAiCredits: 250,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPriceCents: 7900,
    annualPriceCents: 79000,
    maxWorkspaces: 5,
    maxSocialAccounts: 20,
    maxTeamMembers: 10,
    monthlyAiCredits: 2000,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPriceCents: 29900,
    annualPriceCents: 299000,
    maxWorkspaces: 50,
    maxSocialAccounts: 250,
    maxTeamMembers: 35,
    monthlyAiCredits: 15000,
  },
};

export const FEATURE_CATALOG: Record<FeatureKey, FeatureMeta> = {
  social_accounts: {
    key: 'social_accounts',
    label: 'Social Accounts & OAuth',
    description: 'Connect and authorize official social media channels for profile sync and publishing.',
    requiredTier: 'basic',
    route: 'social-accounts',
  },
  ai_studio: {
    key: 'ai_studio',
    label: 'AI Content Studio',
    description: 'Generate brand-grounded social posts, multi-platform repurposed copy, captions, hashtags, and keywords.',
    requiredTier: 'basic',
    route: 'ai-studio',
  },
  calendar: {
    key: 'calendar',
    label: 'Content Calendar',
    description: 'Plan, organize, and schedule multi-channel campaigns across your editorial calendar.',
    requiredTier: 'basic',
    route: 'calendar',
  },
  media: {
    key: 'media',
    label: 'Media Library',
    description: 'Store, categorize, and attach approved brand images, flyers, and campaign assets.',
    requiredTier: 'basic',
    route: 'media',
  },
  graphic_designer: {
    key: 'graphic_designer',
    label: 'AI Graphic Designer',
    description: 'Design promotional flyers, banners, carousel slides, and AI-generated brand visuals.',
    requiredTier: 'pro',
    route: 'graphic-designer',
  },
  auto_publisher: {
    key: 'auto_publisher',
    label: 'Auto Publisher',
    description: 'Automated dispatch queues, recurring schedules, retries, and live publishing execution.',
    requiredTier: 'pro',
    route: 'auto-publisher',
  },
  publishing_history: {
    key: 'publishing_history',
    label: 'Publishing History & Approvals',
    description: 'Full delivery audit trail, post status history, and pre-publish approval workflows.',
    requiredTier: 'pro',
    route: 'publishing-history',
  },
  engagement: {
    key: 'engagement',
    label: 'Engagement Manager',
    description: 'Unified social inbox for comments and messages with AI-assisted reply drafting and escalation.',
    requiredTier: 'pro',
    route: 'engagement',
  },
  analytics: {
    key: 'analytics',
    label: 'Live Analytics & Attribution',
    description: 'Track impressions, reach, engagement rates, follower growth, and channel attribution.',
    requiredTier: 'pro',
    route: 'analytics',
  },
  team: {
    key: 'team',
    label: 'Team Management & RBAC',
    description: 'Invite editors, workspace admins, and reviewers with granular role-based permissions.',
    requiredTier: 'pro',
    route: 'team',
  },
  ai_strategy: {
    key: 'ai_strategy',
    label: 'AI Brand Strategy & Intelligence',
    description: 'Executive brand analysis, audience intelligence, multi-pillar strategies, and growth recommendations.',
    requiredTier: 'enterprise',
    route: 'ai-strategy',
  },
};

export const ORDERED_FEATURES: FeatureMeta[] = [
  FEATURE_CATALOG.social_accounts,
  FEATURE_CATALOG.ai_studio,
  FEATURE_CATALOG.calendar,
  FEATURE_CATALOG.media,
  FEATURE_CATALOG.graphic_designer,
  FEATURE_CATALOG.auto_publisher,
  FEATURE_CATALOG.publishing_history,
  FEATURE_CATALOG.engagement,
  FEATURE_CATALOG.analytics,
  FEATURE_CATALOG.team,
  FEATURE_CATALOG.ai_strategy,
];

export const ROUTE_TO_FEATURE: Partial<Record<CustomerRoute, FeatureKey>> = {
  'social-accounts': 'social_accounts',
  'ai-studio': 'ai_studio',
  calendar: 'calendar',
  media: 'media',
  'graphic-designer': 'graphic_designer',
  'auto-publisher': 'auto_publisher',
  'publishing-history': 'publishing_history',
  engagement: 'engagement',
  analytics: 'analytics',
  team: 'team',
  'ai-strategy': 'ai_strategy',
};

export const PLAN_FEATURE_BULLETS: Record<PaidPlanTier, string[]> = {
  basic: [
    '1 Brand Workspace · Up to 5 Social Accounts',
    '250 Monthly AI Studio Credits',
    'Social Accounts & Official OAuth Connection',
    'AI Content Studio (Posts, Repurpose, Captions & Hashtags)',
    'Content Calendar & Media Library',
  ],
  pro: [
    'Up to 5 Brand Workspaces · Up to 20 Social Accounts',
    '2,000 Monthly AI Credits · Up to 10 Team Seats',
    'Everything in Basic Plan included',
    'AI Graphic Designer & Auto Publisher Queue',
    'Publishing History, Engagement Manager, Live Analytics & Team RBAC',
  ],
  enterprise: [
    'Up to 50 Brand Workspaces · Up to 250 Social Accounts',
    '15,000 Monthly AI Credits · Up to 35 Team Seats',
    'Everything in Pro Plan included',
    'AI Brand Strategy & Executive Audience Intelligence',
    'Multi-Brand Governance, Compliance Audit Logs & Priority Support',
  ],
};

export function normalizePlanCode(code?: string | PlanCode | null): PlanTier {
  const normalized = String(code || '').trim().toLowerCase();
  if (normalized === 'basic' || normalized === 'starter') return 'basic';
  if (normalized === 'pro' || normalized === 'growth' || normalized === 'agency') return 'pro';
  if (normalized === 'enterprise') return 'enterprise';
  return 'none';
}

export function isSubscriptionActive(status?: string | null): boolean {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}

export function getEffectivePlanTier(
  subscription?: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null
): PlanTier {
  if (!subscription || !isSubscriptionActive(subscription.status)) {
    return 'none';
  }
  return normalizePlanCode(subscription.planCode);
}

export function getPlanLimits(
  subscription?: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null
): PlanQuotaLimits {
  return PLAN_LIMITS[getEffectivePlanTier(subscription)];
}

export function getRequiredPlanForFeature(feature: FeatureKey): PaidPlanTier {
  return FEATURE_CATALOG[feature].requiredTier;
}

export function getRequiredPlanForRoute(route: CustomerRoute): PaidPlanTier | null {
  const feature = ROUTE_TO_FEATURE[route];
  return feature ? FEATURE_CATALOG[feature].requiredTier : null;
}

export function canAccessFeature(
  subscription: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null | undefined,
  feature: FeatureKey
): boolean {
  const currentTier = getEffectivePlanTier(subscription);
  const requiredTier = FEATURE_CATALOG[feature].requiredTier;
  return PLAN_RANK[currentTier] >= PLAN_RANK[requiredTier];
}

export function canAccessRoute(
  subscription: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null | undefined,
  route: CustomerRoute
): boolean {
  const feature = ROUTE_TO_FEATURE[route];
  if (!feature) {
    // Always accessible account/billing/overview routes
    return true;
  }
  return canAccessFeature(subscription, feature);
}

export function canAddSocialAccount(
  subscription: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null | undefined,
  currentConnectedCount: number
): { allowed: boolean; limit: number; reason?: string } {
  const limits = getPlanLimits(subscription);
  if (limits.maxSocialAccounts <= 0) {
    return {
      allowed: false,
      limit: 0,
      reason: 'An active subscription plan is required to connect social media accounts.',
    };
  }
  if (currentConnectedCount >= limits.maxSocialAccounts) {
    return {
      allowed: false,
      limit: limits.maxSocialAccounts,
      reason: `Your ${limits.name} plan allows up to ${limits.maxSocialAccounts} connected social account${limits.maxSocialAccounts === 1 ? '' : 's'}. Upgrade your subscription to connect more channels.`,
    };
  }
  return { allowed: true, limit: limits.maxSocialAccounts };
}

export function canAddTeamMember(
  subscription: Pick<WorkspaceSubscriptionSummary, 'planCode' | 'status'> | null | undefined,
  currentMemberCount: number
): { allowed: boolean; limit: number; reason?: string } {
  if (!canAccessFeature(subscription, 'team')) {
    return {
      allowed: false,
      limit: getPlanLimits(subscription).maxTeamMembers,
      reason: 'Team Management requires a Pro or Enterprise subscription.',
    };
  }
  const limits = getPlanLimits(subscription);
  if (currentMemberCount >= limits.maxTeamMembers) {
    return {
      allowed: false,
      limit: limits.maxTeamMembers,
      reason: `Your ${limits.name} plan supports up to ${limits.maxTeamMembers} team seats. Upgrade to Enterprise for more seats.`,
    };
  }
  return { allowed: true, limit: limits.maxTeamMembers };
}

export function getTierDisplayName(tier: PlanTier): string {
  return PLAN_LIMITS[tier].name;
}

export function listIncludedFeaturesForTier(tier: PlanTier): FeatureMeta[] {
  const rank = PLAN_RANK[tier];
  return ORDERED_FEATURES.filter((f) => PLAN_RANK[f.requiredTier] <= rank);
}

export function listLockedFeaturesForTier(tier: PlanTier): FeatureMeta[] {
  const rank = PLAN_RANK[tier];
  return ORDERED_FEATURES.filter((f) => PLAN_RANK[f.requiredTier] > rank);
}
