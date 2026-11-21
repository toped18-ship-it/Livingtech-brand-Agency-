import type {
  AdminOverviewData,
  AiContentStrategyRecord,
  AiContentSuggestionRecord,
  AiReplySuggestionRecord,
  AIUsageRecord,
  AnalyticsSnapshotRecord,
  AuditLogRecord,
  AuthSessionResponse,
  BrandAnalysisRecord,
  BrandDocumentItem,
  BrandIntelligenceProfile,
  ContentApprovalRecord,
  ContentCalendarItemRecord,
  ContentCampaignRecord,
  ContentPostRecord,
  ContentSafetyResult,
  ContentStudioType,
  CustomerDashboardData,
  DeveloperReviewStatus,
  EngagementItemRecord,
  EngagementMessageRecord,
  GeneratedContentRecord,
  GeneratedImageRecord,
  GraphicArtDirection,
  GraphicDesignType,
  MediaAssetRecord,
  NotificationRecord,
  OAuthConnectionLogRecord,
  OAuthDiscoverySession,
  PlatformKey,
  PlatformSyncLogRecord,
  PlatformWebhookEventRecord,
  PublishingAttemptRecord,
  PublishingFormatKey,
  PublishingJobRecord,
  PublishingLogRecord,
  PublishingQueueRecord,
  RecurrenceRule,
  RepurposedVariant,
  SocialAccountDetailPayload,
  SocialAccountPublishingPreferences,
  SocialAccountRecord,
  SocialPlatformInfo,
  SubscriptionPaymentDetails,
  SubscriptionPlanRecord,
  SupportTicketRecord,
  SystemSettingRecord,
  UserProfile,
  VideoScriptPayload,
  WorkerHealthSummary,
  WorkspaceMemberRecord,
  WorkspaceSubscriptionRecord,
  WorkspaceSummary,
} from '../shared/api-contracts';
import { getFirebaseIdToken } from './firebase';

const TOKEN_STORAGE_KEY = 'lt_agency_bearer_token';

// Capacitor-ready base URL: empty string uses same-origin on Web/PWA; set VITE_API_BASE_URL for Android APK
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction in private mode
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type UnauthorizedListener = (message: string) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onSessionUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google-sync',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/recover',
  '/api/auth/me',
]);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const firebaseIdToken = await getFirebaseIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (firebaseIdToken) {
    headers['X-Firebase-Id-Token'] = firebaseIdToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`;

    if (response.status === 401 && !PUBLIC_AUTH_PATHS.has(path)) {
      setStoredToken(null);
      unauthorizedListeners.forEach((listener) => listener(errorMessage));
    }

    throw new ApiError(errorMessage, response.status);
  }
  return data as T;
}

export const apiClient = {
  // Public & Auth
  getPlans: () => request<SubscriptionPlanRecord[]>('/api/plans'),
  getMe: () => request<AuthSessionResponse>('/api/auth/me'),
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    workspaceName?: string;
    industry?: string;
  }) =>
    request<AuthSessionResponse & { verificationToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<AuthSessionResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  googleSync: (body: {
    externalUid: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    emailVerified: boolean;
  }) =>
    request<AuthSessionResponse>('/api/auth/google-sync', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ message: string; previewResetToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  resendVerification: () =>
    request<{ message: string; previewVerificationToken?: string }>('/api/auth/resend-verification', {
      method: 'POST',
    }),
  recoverAccount: (email: string, reason: string) =>
    request<{ message: string }>('/api/auth/recover-account', {
      method: 'POST',
      body: JSON.stringify({ email, reason }),
    }),

  // Profile
  updateProfile: (body: { fullName: string; timezone: string; preferredLanguage: string; avatarUrl?: string | null }) =>
    request<{ user: UserProfile }>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  deleteAccount: (confirmEmail: string) =>
    request<{ message: string }>('/api/profile/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmEmail }),
    }),

  // Workspaces & Brand Settings
  getWorkspaces: () => request<WorkspaceSummary[]>('/api/workspaces'),
  createWorkspace: (body: {
    name: string;
    brandName: string;
    industry?: string;
    businessDescription?: string;
    targetAudience?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    preferredLanguage?: string;
    timezone?: string;
    logoUrl?: string;
  }) =>
    request<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateBrandProfile: (
    wid: string,
    body: {
      name: string;
      brandName: string;
      logoUrl: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      businessDescription: string;
      industry: string;
      targetAudience: string;
      toneOfVoice: string;
      preferredLanguage: string;
      timezone: string;
    }
  ) =>
    request<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }>(
      `/api/workspaces/${wid}/brand`,
      { method: 'PATCH', body: JSON.stringify(body) }
    ),

  // Dashboard
  getDashboard: (wid: string) => request<CustomerDashboardData>(`/api/workspaces/${wid}/dashboard`),

  // Social Accounts & Phase 2 Official OAuth Engine
  getSocialAccounts: (wid: string) =>
    request<{
      accounts: SocialAccountRecord[];
      platforms: SocialPlatformInfo[];
      recentLogs: OAuthConnectionLogRecord[];
    }>(`/api/workspaces/${wid}/social-accounts`),
  getOAuthUrl: (wid: string, platform: PlatformKey, reconnectAccountId?: string) =>
    request<{
      configured: boolean;
      mode?: 'sandbox' | 'live';
      url?: string;
      callbackUrl: string;
      state?: string;
      missingEnvVars?: string[];
      portalName?: string;
      portalUrl?: string;
      docsUrl?: string;
      scopes?: string;
      supportsPkce?: boolean;
      requestedPermissions?: {
        scopeKey: string;
        label: string;
        description: string;
        isRequired: boolean;
      }[];
    }>(
      `/api/workspaces/${wid}/oauth/${platform}/url${
        reconnectAccountId ? `?reconnectAccountId=${encodeURIComponent(reconnectAccountId)}` : ''
      }`
    ),
  authorizeSandboxOAuth: (
    wid: string,
    platform: PlatformKey,
    state: string,
    ownerProfile?: {
      accountName?: string;
      accountHandle?: string;
      ownerEmail?: string;
      businessCategory?: string;
      accountDescription?: string;
      followersCount?: number;
      recentPosts?: string[];
    }
  ) =>
    request<{
      discoverySessionId: string;
      platformKey: PlatformKey;
      platformName: string;
      accountCount: number;
      permissionsStatus: string;
      missingRequiredScopes: string[];
    }>(`/api/workspaces/${wid}/oauth/${platform}/sandbox-authorize`, {
      method: 'POST',
      body: JSON.stringify({ state, ...(ownerProfile ? { ownerProfile } : {}) }),
    }),
  getOAuthDiscoverySession: (wid: string, sessionId: string) =>
    request<OAuthDiscoverySession>(`/api/workspaces/${wid}/oauth/discovery/${sessionId}`),
  connectDiscoveredAccounts: (wid: string, sessionId: string, externalAccountIds: string[]) =>
    request<{
      connectedCount: number;
      importedContentCount?: number;
      aiContextReady?: boolean;
      accounts: { accountId: string; accountName: string; accountHandle: string }[];
    }>(`/api/workspaces/${wid}/oauth/discovery/${sessionId}/connect`, {
      method: 'POST',
      body: JSON.stringify({ externalAccountIds }),
    }),
  getWorkspaceOAuthLogs: (wid: string) =>
    request<OAuthConnectionLogRecord[]>(`/api/workspaces/${wid}/oauth/logs`),
  getSocialAccountDetail: (wid: string, accountId: string) =>
    request<SocialAccountDetailPayload>(`/api/workspaces/${wid}/social-accounts/${accountId}`),
  verifySocialAccount: (wid: string, accountId: string) =>
    request<{
      healthy: boolean;
      status: 'connected' | 'expired' | 'revoked';
      permissionsStatus: 'granted' | 'partial' | 'revoked' | 'expired';
      expiresAt: string | null;
      hasRefreshToken: boolean;
      missingRequiredScopes: string[];
    }>(`/api/workspaces/${wid}/social-accounts/${accountId}/verify`, { method: 'POST' }),
  refreshSocialAccountToken: (wid: string, accountId: string) =>
    request<{ refreshed: boolean; expiresAt: string | null; message: string }>(
      `/api/workspaces/${wid}/social-accounts/${accountId}/refresh-token`,
      { method: 'POST' }
    ),
  syncSocialAccount: (wid: string, accountId: string) =>
    request<{
      status: 'succeeded' | 'partial' | 'rate_limited' | 'failed';
      itemsSynced: number;
      rateLimitRemaining: number | null;
      message: string;
    }>(`/api/workspaces/${wid}/social-accounts/${accountId}/sync`, { method: 'POST' }),
  updateSocialAccountPreferences: (
    wid: string,
    accountId: string,
    preferences: SocialAccountPublishingPreferences
  ) =>
    request<SocialAccountPublishingPreferences>(
      `/api/workspaces/${wid}/social-accounts/${accountId}/preferences`,
      {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      }
    ),
  disconnectSocialAccount: (wid: string, accountId: string) =>
    request<{ success: boolean; upstreamRevoked: boolean; note: string }>(
      `/api/workspaces/${wid}/social-accounts/${accountId}`,
      { method: 'DELETE' }
    ),

  // Posts & Calendar
  getPosts: (wid: string, status = 'all') =>
    request<ContentPostRecord[]>(`/api/workspaces/${wid}/posts?status=${encodeURIComponent(status)}`),
  createPost: (
    wid: string,
    body: {
      title: string;
      caption: string;
      platformKey: PlatformKey;
      status: 'draft' | 'pending' | 'scheduled';
      campaignTag?: string | null;
      hashtags?: string[];
      scheduledFor?: string | null;
    }
  ) =>
    request<ContentPostRecord>(`/api/workspaces/${wid}/posts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePost: (
    wid: string,
    postId: string,
    body: Partial<{
      title: string;
      caption: string;
      status: 'draft' | 'pending' | 'scheduled' | 'published' | 'failed';
      scheduledFor: string | null;
      campaignTag: string | null;
    }>
  ) =>
    request<ContentPostRecord>(`/api/workspaces/${wid}/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deletePost: (wid: string, postId: string) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/posts/${postId}`, { method: 'DELETE' }),

  // Auto Publisher
  getJobs: (wid: string) =>
    request<{ jobs: PublishingJobRecord[]; logs: PublishingLogRecord[] }>(`/api/workspaces/${wid}/jobs`),
  jobAction: (wid: string, jobId: string, action: 'dispatch' | 'retry' | 'cancel') =>
    request<{ status: string }>(`/api/workspaces/${wid}/jobs/${jobId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // AI Studio & Strategy
  generateAiPost: (
    wid: string,
    body: { platform: PlatformKey; topic: string; keywords?: string[] | string; objective: string; tone: string }
  ) =>
    request<{
      suggestion: AiContentSuggestionRecord;
      title: string;
      headlines: string[];
      caption: string;
      hashtags: string[];
      callToAction: string;
      bestTimeNote: string;
      variants: { label: string; body: string }[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/generate-post`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAiSuggestions: (wid: string) =>
    request<AiContentSuggestionRecord[]>(`/api/workspaces/${wid}/ai/suggestions`),
  updateAiSuggestion: (
    wid: string,
    suggestionId: string,
    body: {
      headline: string;
      postCopy: string;
      hashtags: string[];
      callToAction: string;
      platformKey?: PlatformKey;
    }
  ) =>
    request<AiContentSuggestionRecord>(`/api/workspaces/${wid}/ai/suggestions/${suggestionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteAiSuggestion: (wid: string, suggestionId: string) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/ai/suggestions/${suggestionId}`, {
      method: 'DELETE',
    }),
  promoteAiSuggestion: (
    wid: string,
    suggestionId: string,
    body: { status: 'draft' | 'scheduled'; scheduledFor?: string | null }
  ) =>
    request<{ post: ContentPostRecord; suggestionId: string }>(
      `/api/workspaces/${wid}/ai/suggestions/${suggestionId}/promote`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),
  generateAiStrategy: (wid: string, body: { goals: string; platforms: PlatformKey[] }) =>
    request<{
      executiveSummary: string;
      pillars: { name: string; sharePercent: number; objective: string; sampleHooks: string[] }[];
      weeklyCadence: { day: string; platform: string; format: string; focus: string }[];
      kpis: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/generate-strategy`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAiUsage: (wid: string) => request<AIUsageRecord[]>(`/api/workspaces/${wid}/ai/usage`),

  // Engagement, Analytics, Media, Notifications, Billing, Team, Tickets
  getEngagements: (wid: string) => request<EngagementItemRecord[]>(`/api/workspaces/${wid}/engagements`),
  replyEngagement: (wid: string, itemId: string, body: { replyText?: string; status: 'open' | 'replied' | 'archived' }) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/engagements/${itemId}/reply`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAnalytics: (wid: string, includeDemo = true) =>
    request<{ isDemo: boolean; snapshots: AnalyticsSnapshotRecord[] }>(
      `/api/workspaces/${wid}/analytics?demo=${includeDemo ? 'true' : 'false'}`
    ),
  getMedia: (wid: string) => request<MediaAssetRecord[]>(`/api/workspaces/${wid}/media`),
  addMedia: (
    wid: string,
    body: {
      fileName: string;
      assetType: 'image' | 'video' | 'document' | 'template';
      mimeType: string;
      publicUrl: string;
      fileSizeBytes: number;
      folder: string;
    }
  ) =>
    request<MediaAssetRecord>(`/api/workspaces/${wid}/media`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteMedia: (wid: string, mediaId: string) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/media/${mediaId}`, { method: 'DELETE' }),
  getNotifications: (wid: string) => request<NotificationRecord[]>(`/api/workspaces/${wid}/notifications`),
  markNotificationRead: (wid: string, notificationId?: string) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/notifications/mark-read`, {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
    }),
  getSubscription: (wid: string) =>
    request<WorkspaceSubscriptionRecord>(`/api/workspaces/${wid}/subscription`),
  changeSubscription: (
    wid: string,
    planCode: string,
    billingCycle: 'monthly' | 'annual',
    payment?: SubscriptionPaymentDetails
  ) =>
    request<{
      success: boolean;
      transactionId?: string;
      planCode: string;
      billingCycle: 'monthly' | 'annual';
      subscription?: WorkspaceSubscriptionRecord;
      workspaces?: WorkspaceSummary[];
    }>(`/api/workspaces/${wid}/subscription/change`, {
      method: 'POST',
      body: JSON.stringify({ planCode, billingCycle, payment }),
    }),
  cancelSubscription: (wid: string) =>
    request<{ success: boolean; workspaces?: WorkspaceSummary[] }>(`/api/workspaces/${wid}/subscription/cancel`, {
      method: 'POST',
    }),
  getBillingHistory: (wid: string) =>
    request<
      {
        id: string;
        action: string;
        planCode: string;
        billingCycle: string;
        amountCents: number;
        transactionId?: string;
        paymentMethod?: string;
        cardLast4?: string;
        createdAt: string;
      }[]
    >(`/api/workspaces/${wid}/billing-history`),
  getMembers: (wid: string) => request<WorkspaceMemberRecord[]>(`/api/workspaces/${wid}/members`),
  inviteMember: (wid: string, email: string, role: 'workspace_admin' | 'editor' | 'viewer') =>
    request<{ id: string }>(`/api/workspaces/${wid}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  revokeMember: (wid: string, memberId: string) =>
    request<{ success: boolean }>(`/api/workspaces/${wid}/members/${memberId}`, { method: 'DELETE' }),
  getTickets: (wid: string) => request<SupportTicketRecord[]>(`/api/workspaces/${wid}/tickets`),
  createTicket: (wid: string, body: { subject: string; message: string; priority: string }) =>
    request<SupportTicketRecord>(`/api/workspaces/${wid}/tickets`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Super Admin
  getAdminOverview: () => request<AdminOverviewData>('/api/admin/overview'),
  getAdminUsers: () => request<UserProfile[]>('/api/admin/users'),
  updateAdminUser: (userId: string, body: Partial<{ status: string; role: string; emailVerified: boolean }>) =>
    request<UserProfile>(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAdminSubscriptions: () => request<WorkspaceSubscriptionRecord[]>('/api/admin/subscriptions'),
  updateAdminSubscription: (subId: string, body: Partial<{ status: string; planCode: string }>) =>
    request<{ success: boolean }>(`/api/admin/subscriptions/${subId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getAdminAiUsage: () => request<AIUsageRecord[]>('/api/admin/ai-usage'),
  getAdminSocialStats: () =>
    request<{
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
    }>('/api/admin/social-accounts'),
  toggleAdminPlatform: (platformKey: PlatformKey, isEnabled: boolean) =>
    request<{ success: boolean; platforms: SocialPlatformInfo[] }>(`/api/admin/platforms/${platformKey}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled }),
    }),
  updateAdminPlatformConfig: (
    platformKey: PlatformKey,
    body: {
      isEnabled?: boolean;
      clientIdOverride?: string | null;
      clientSecretOverride?: string | null;
      developerReviewStatus?: DeveloperReviewStatus;
      rateLimitRpm?: number;
      scopes?: string;
      clearLastError?: boolean;
      permissionApprovals?: Record<string, DeveloperReviewStatus>;
    }
  ) =>
    request<{ success: boolean; platforms: SocialPlatformInfo[] }>(`/api/admin/platforms/${platformKey}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getAdminJobs: (onlyFailed = false) =>
    request<PublishingJobRecord[]>(`/api/admin/jobs${onlyFailed ? '?status=failed' : ''}`),
  retryAdminJob: (jobId: string) =>
    request<{ success: boolean }>(`/api/admin/jobs/${jobId}/retry`, { method: 'POST' }),
  getSettings: () => request<Record<string, string>>('/api/settings'),
  getAdminSettings: () => request<SystemSettingRecord[]>('/api/admin/settings'),
  updateAdminSetting: (key: string, value: string) =>
    request<{ success: boolean }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    }),
  getAdminAuditLogs: () => request<AuditLogRecord[]>('/api/admin/audit-logs'),
  getAdminTickets: () => request<SupportTicketRecord[]>('/api/admin/tickets'),
  updateAdminTicket: (ticketId: string, body: { status: string; adminNotes?: string }) =>
    request<{ success: boolean }>(`/api/admin/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // =========================================================================
  // PHASE 3: BRAND INTELLIGENCE, 14 AI MODULES, GRAPHIC DESIGNER, CALENDAR,
  // AUTO-PUBLISHING QUEUE, APPROVALS, HISTORY & ENGAGEMENT MANAGER
  // =========================================================================
  getBrandIntelligence: (wid: string) =>
    request<{ profile: BrandIntelligenceProfile; analyses: BrandAnalysisRecord[] }>(
      `/api/workspaces/${wid}/brand-intelligence`
    ),
  updateBrandIntelligence: (wid: string, body: Partial<BrandIntelligenceProfile>) =>
    request<{ profile: BrandIntelligenceProfile }>(`/api/workspaces/${wid}/brand-intelligence`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  addBrandDocument: (
    wid: string,
    body: {
      name: string;
      category: BrandDocumentItem['category'];
      summary: string;
      url?: string;
    }
  ) =>
    request<{ document: BrandDocumentItem; brandDocuments: BrandDocumentItem[] }>(
      `/api/workspaces/${wid}/brand-intelligence/documents`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  deleteBrandDocument: (wid: string, docId: string) =>
    request<{ brandDocuments: BrandDocumentItem[] }>(
      `/api/workspaces/${wid}/brand-intelligence/documents/${docId}`,
      { method: 'DELETE' }
    ),
  runBrandAnalysis: (wid: string, additionalNotes?: string) =>
    request<{ analysis: BrandAnalysisRecord; creditsRemaining: number }>(
      `/api/workspaces/${wid}/ai/brand-analysis`,
      { method: 'POST', body: JSON.stringify({ additionalNotes }) }
    ),
  runAudienceAnalysis: (wid: string, focusMarket?: string) =>
    request<{
      evidenceStatus: string;
      segments: {
        name: string;
        demographicsAndRole: string;
        corePainPoints: string[];
        desiredOutcomes: string[];
        contentAngles: string[];
        recommendedPlatforms: string[];
        isAssumption: boolean;
      }[];
      messagingDo: string[];
      messagingDont: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/audience-analysis`, {
      method: 'POST',
      body: JSON.stringify({ focusMarket }),
    }),
  getStrategiesV3: (wid: string) =>
    request<{ strategies: AiContentStrategyRecord[] }>(`/api/workspaces/${wid}/ai/strategies`),
  generateStrategyV3: (wid: string, body: { title?: string; goals: string; platforms: PlatformKey[] }) =>
    request<{ strategy: AiContentStrategyRecord; creditsRemaining: number }>(
      `/api/workspaces/${wid}/ai/strategy-v3`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  runPerformanceRecommendations: (wid: string) =>
    request<{
      hasLiveData: boolean;
      dataBasisSummary: string;
      keyObservations: string[];
      actionableRecommendations: {
        title: string;
        rationale: string;
        priority: 'high' | 'medium' | 'low';
        evidenceType: 'observed_metric' | 'best_practice_hypothesis';
      }[];
      nextExperiments: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/performance-recommendations`, { method: 'POST', body: '{}' }),

  // Content Studio (Phase 3)
  getGeneratedContent: (wid: string) =>
    request<{ items: GeneratedContentRecord[] }>(`/api/workspaces/${wid}/ai/generated-content`),
  studioGeneratePost: (
    wid: string,
    body: {
      platformKey: PlatformKey;
      socialAccountId?: string | null;
      campaignId?: string | null;
      contentType: ContentStudioType;
      topic: string;
      keywords?: string[] | string;
      objective: string;
      targetAudience?: string;
      toneOfVoice?: string;
      language?: string;
    }
  ) =>
    request<{
      content: GeneratedContentRecord;
      headlineOptions: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/studio-generate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateGeneratedContent: (
    wid: string,
    id: string,
    body: Partial<{
      title: string;
      bodyText: string;
      captionText: string;
      hashtags: string[];
      callToAction: string;
      imagePrompt: string;
      platformKey: PlatformKey;
    }>
  ) =>
    request<{ content: GeneratedContentRecord; safety: ContentSafetyResult }>(
      `/api/workspaces/${wid}/ai/generated-content/${id}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    ),
  generateCaptions: (
    wid: string,
    body: { platformKey: PlatformKey; subject: string; visualDescription?: string; toneOfVoice?: string; language?: string }
  ) =>
    request<{
      primaryCaption: string;
      shortCaption: string;
      storytellingCaption: string;
      callToAction: string;
      hashtags: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/caption`, { method: 'POST', body: JSON.stringify(body) }),
  recommendHashtags: (wid: string, body: { platformKey: PlatformKey; topic: string; language?: string }) =>
    request<{
      broadTags: string[];
      nicheTags: string[];
      brandedTags: string[];
      recommendedSet: string[];
      platformGuidance: string;
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/hashtags`, { method: 'POST', body: JSON.stringify(body) }),
  researchKeywords: (wid: string, body: { platformKey: PlatformKey; seedTopic: string; language?: string }) =>
    request<{
      primaryKeywords: string[];
      longTailPhrases: string[];
      questionQueries: string[];
      contentAngles: { keyword: string; intent: string; suggestedHook: string }[];
      caveat: string;
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/keywords`, { method: 'POST', body: JSON.stringify(body) }),
  generateVideoScript: (
    wid: string,
    body: {
      platformKey: PlatformKey;
      topic: string;
      formatStyle: 'short_form_reel' | 'product_demo' | 'explainer' | 'founder_story' | 'youtube_video';
      targetDurationSeconds: number;
      toneOfVoice?: string;
      language?: string;
    }
  ) =>
    request<{
      title: string;
      conceptSummary: string;
      script: VideoScriptPayload;
      captionIdea: string;
      hashtags: string[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/video-script`, { method: 'POST', body: JSON.stringify(body) }),
  repurposeContent: (
    wid: string,
    body: { sourceIdeaOrCopy: string; targetPlatforms: PlatformKey[]; toneOfVoice?: string; language?: string }
  ) =>
    request<{ variants: RepurposedVariant[]; creditsRemaining: number }>(
      `/api/workspaces/${wid}/ai/repurpose`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // Graphic Designer
  getGraphics: (wid: string) =>
    request<{
      graphics: GeneratedImageRecord[];
      capabilities: {
        liveAiImageServiceAvailable: boolean;
        providerMode: string;
        compositorAvailable: boolean;
        note: string;
      };
    }>(`/api/workspaces/${wid}/ai/graphics`),
  generateGraphicDirection: (
    wid: string,
    body: { graphicType: GraphicDesignType; platformKey: PlatformKey; aspectRatio: string; brief: string; includeLogo?: boolean }
  ) =>
    request<{ artDirection: GraphicArtDirection; creditsRemaining: number }>(
      `/api/workspaces/${wid}/ai/graphic-direction`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  generateLiveImage: (
    wid: string,
    body: {
      graphicType: GraphicDesignType;
      platformKey: PlatformKey;
      aspectRatio: string;
      prompt: string;
      artDirection?: Partial<GraphicArtDirection>;
      captionText?: string;
    }
  ) =>
    request<{ image: GeneratedImageRecord; creditsRemaining: number }>(
      `/api/workspaces/${wid}/ai/generate-image`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  saveRenderedGraphic: (
    wid: string,
    body: {
      graphicType: GraphicDesignType;
      platformKey: PlatformKey;
      aspectRatio: string;
      prompt: string;
      artDirection?: Partial<GraphicArtDirection>;
      captionText?: string;
      sourceMode: 'compositor' | 'uploaded';
      dataUrl: string;
      fileName?: string;
    }
  ) =>
    request<{ image: GeneratedImageRecord; mediaAssetId: string }>(
      `/api/workspaces/${wid}/ai/graphics/save-rendered`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // Safety, Campaigns & Calendar
  checkContentSafety: (
    wid: string,
    body: {
      platformKey: PlatformKey;
      socialAccountId?: string | null;
      title?: string;
      bodyText: string;
      hashtags?: string[];
      scheduledAt?: string | null;
    }
  ) =>
    request<ContentSafetyResult>(`/api/workspaces/${wid}/safety/check`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getCampaigns: (wid: string) =>
    request<{ campaigns: ContentCampaignRecord[] }>(`/api/workspaces/${wid}/campaigns`),
  createCampaign: (
    wid: string,
    body: {
      name: string;
      objective?: string;
      description?: string;
      colorHex?: string;
      platforms?: PlatformKey[];
      startDate?: string | null;
      endDate?: string | null;
    }
  ) =>
    request<{ campaign: ContentCampaignRecord }>(`/api/workspaces/${wid}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteCampaign: (wid: string, campaignId: string) =>
    request<{ deleted: boolean }>(`/api/workspaces/${wid}/campaigns/${campaignId}`, { method: 'DELETE' }),
  getCalendarItems: (wid: string) =>
    request<{ items: ContentCalendarItemRecord[] }>(`/api/workspaces/${wid}/calendar`),
  rescheduleCalendarItem: (wid: string, itemId: string, scheduledAt: string, timezone?: string) =>
    request<{ item: ContentCalendarItemRecord }>(`/api/workspaces/${wid}/calendar/${itemId}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt, timezone }),
    }),
  generateCalendarPlan: (
    wid: string,
    body: {
      platforms: PlatformKey[];
      daysCount: number;
      campaignObjective: string;
      preferredPostingWindow?: string;
      timezone: string;
    }
  ) =>
    request<{
      evidenceDisclaimer: string;
      hasLiveAudienceInsights: boolean;
      items: {
        dayOffset: number;
        suggestedLocalTime: string;
        platformKey: PlatformKey;
        formatKey: PublishingFormatKey;
        title: string;
        bodyText: string;
        hashtags: string[];
        rationale: string;
        timeEvidenceBasis: string;
      }[];
      creditsRemaining: number;
    }>(`/api/workspaces/${wid}/ai/calendar-plan`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Publishing Queue, Approvals, Worker & History
  getPublishingQueue: (wid: string, status?: string) =>
    request<{ jobs: PublishingQueueRecord[]; workerHealth: WorkerHealthSummary }>(
      `/api/workspaces/${wid}/publishing-queue${status ? `?status=${encodeURIComponent(status)}` : ''}`
    ),
  enqueuePublishingJob: (
    wid: string,
    body: {
      platformKey: PlatformKey;
      socialAccountId?: string | null;
      campaignId?: string | null;
      generatedContentId?: string | null;
      formatKey?: PublishingFormatKey;
      title: string;
      bodyText: string;
      hashtags?: string[];
      mediaUrls?: string[];
      linkUrl?: string | null;
      scheduledAt: string;
      timezone?: string;
      recurrenceRule?: RecurrenceRule;
      publishingModeOverride?: 'automatic' | 'approval_required';
      saveAsDraft?: boolean;
    }
  ) =>
    request<{ job: PublishingQueueRecord; calendarItemId: string; approvalId: string | null }>(
      `/api/workspaces/${wid}/publishing-queue`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  retryPublishingQueueJob: (wid: string, queueId: string, scheduledAt?: string) =>
    request<{ job: PublishingQueueRecord }>(`/api/workspaces/${wid}/publishing-queue/${queueId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    }),
  cancelPublishingQueueJob: (wid: string, queueId: string) =>
    request<{ job: PublishingQueueRecord }>(`/api/workspaces/${wid}/publishing-queue/${queueId}/cancel`, {
      method: 'POST',
      body: '{}',
    }),
  dispatchPublishingQueueJobNow: (wid: string, queueId: string) =>
    request<{ job: PublishingQueueRecord }>(`/api/workspaces/${wid}/publishing-queue/${queueId}/dispatch-now`, {
      method: 'POST',
      body: '{}',
    }),
  triggerWorkerTick: (wid: string) =>
    request<{ processedCount: number; publishedCount: number; failedCount: number }>(
      `/api/workspaces/${wid}/publishing-queue/worker/tick`,
      { method: 'POST', body: '{}' }
    ),
  getPublishingHistory: (wid: string) =>
    request<{
      jobs: PublishingQueueRecord[];
      attempts: PublishingAttemptRecord[];
      workerHealth: WorkerHealthSummary;
    }>(`/api/workspaces/${wid}/publishing-history`),
  getApprovals: (wid: string) =>
    request<{ approvals: ContentApprovalRecord[] }>(`/api/workspaces/${wid}/approvals`),
  decideApproval: (
    wid: string,
    approvalId: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    notes?: string
  ) =>
    request<{ approval: ContentApprovalRecord; job: PublishingQueueRecord }>(
      `/api/workspaces/${wid}/approvals/${approvalId}/decide`,
      { method: 'POST', body: JSON.stringify({ decision, notes }) }
    ),

  // Engagement Manager V3
  getEngagementMessages: (wid: string) =>
    request<{ messages: EngagementMessageRecord[]; autoReplyEnabled: boolean }>(
      `/api/workspaces/${wid}/engagement-messages`
    ),
  addEngagementMessage: (
    wid: string,
    body: {
      platformKey: PlatformKey;
      socialAccountId?: string | null;
      messageType: 'comment' | 'direct_message' | 'mention' | 'review';
      authorName: string;
      authorHandle: string;
      content: string;
    }
  ) =>
    request<{ id: string }>(`/api/workspaces/${wid}/engagement-messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  suggestEngagementReply: (wid: string, msgId: string, desiredTone?: string) =>
    request<{ suggestion: AiReplySuggestionRecord; creditsRemaining: number }>(
      `/api/workspaces/${wid}/engagement-messages/${msgId}/suggest-reply`,
      { method: 'POST', body: JSON.stringify({ desiredTone }) }
    ),
  sendEngagementReply: (
    wid: string,
    msgId: string,
    body: { replyText: string; mode: 'manual' | 'ai_approved' | 'ai_auto'; suggestionId?: string }
  ) =>
    request<{ replied: boolean; repliedAt: string; mode: string }>(
      `/api/workspaces/${wid}/engagement-messages/${msgId}/reply`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  escalateEngagementMessage: (wid: string, msgId: string, reason: string) =>
    request<{ escalated: boolean }>(`/api/workspaces/${wid}/engagement-messages/${msgId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
