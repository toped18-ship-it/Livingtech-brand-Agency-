export type UserRole = 'customer' | 'workspace_admin' | 'editor' | 'viewer' | 'super_admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'x'
  | 'pinterest'
  | 'google_business';
export type PostStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'failed';
export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
export type PlanCode = 'basic' | 'pro' | 'enterprise' | 'starter' | 'growth' | 'agency';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type SocialAccountType =
  | 'page'
  | 'business_account'
  | 'creator_account'
  | 'channel'
  | 'organization'
  | 'profile'
  | 'location';

export type PermissionHealthStatus = 'granted' | 'partial' | 'revoked' | 'expired';
export type DeveloperReviewStatus = 'not_submitted' | 'pending_review' | 'approved' | 'action_required';
export type PlatformAppStatus = 'configured' | 'in_review' | 'live' | 'missing_credentials' | 'degraded';
export type PublishingFormatKey =
  | 'text'
  | 'image'
  | 'video'
  | 'carousel'
  | 'story'
  | 'reels'
  | 'short_form_video';

export interface PlatformCapabilityMatrix {
  textPublishing: boolean;
  imagePublishing: boolean;
  videoPublishing: boolean;
  carouselPublishing: boolean;
  storyPublishing: boolean;
  reelsPublishing: boolean;
  shortFormVideoPublishing: boolean;
  commentRetrieval: boolean;
  commentResponses: boolean;
  analyticsRetrieval: boolean;
  notes?: string;
}

export interface PlatformPermissionSpec {
  scopeKey: string;
  label: string;
  description: string;
  isRequired: boolean;
  requiresAppReview: boolean;
  approvalStatus: DeveloperReviewStatus;
}

export interface SocialAccountPublishingPreferences {
  autoPublishEnabled: boolean;
  requireApprovalBeforePublish: boolean;
  defaultTimezone: string;
  defaultVisibility: 'public' | 'connections' | 'unlisted';
  appendDefaultHashtags: boolean;
  defaultHashtags: string[];
  dailyPostLimit: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
  status: UserStatus;
  timezone: string;
  preferredLanguage: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfile {
  id: string;
  workspaceId: string;
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
  updatedAt: string;
}

export interface WorkspaceSummary {
  id: string;
  organisationId: string;
  ownerUserId: string;
  name: string;
  slug: string;
  timezone: string;
  preferredLanguage: string;
  aiCreditsBalance: number;
  createdAt: string;
  updatedAt: string;
  brandProfile: BrandProfile;
}

export interface SocialPlatformInfo {
  id: string;
  key: PlatformKey;
  displayName: string;
  apiVersion: string;
  scopes: string;
  isEnabled: boolean;
  oauthConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  clientIdMasked: string | null;
  callbackUrl: string;
  supportsPkce: boolean;
  supportsRefresh: boolean;
  supportsRevocation: boolean;
  portalName: string;
  portalUrl: string;
  docsUrl: string;
  envVarNames: string[];
  appStatus: PlatformAppStatus;
  developerReviewStatus: DeveloperReviewStatus;
  rateLimitRpm: number;
  lastHealthCheckAt: string | null;
  lastApiError: string | null;
  capabilities: PlatformCapabilityMatrix;
  permissions: PlatformPermissionSpec[];
}

export interface SocialAccountRecord {
  id: string;
  workspaceId: string;
  connectedByUserId: string | null;
  connectedByEmail: string | null;
  connectedByName: string | null;
  platformKey: PlatformKey;
  platformName: string;
  externalAccountId: string;
  accountHandle: string;
  accountName: string;
  accountType: SocialAccountType;
  accountDescription: string;
  businessCategory: string;
  followersCount: number | null;
  avatarUrl: string | null;
  connectionStatus: 'connected' | 'expired' | 'revoked' | 'disconnected';
  permissionsStatus: PermissionHealthStatus;
  scopes: string | null;
  grantedScopes: string[];
  missingRequiredScopes: string[];
  capabilities: PlatformCapabilityMatrix;
  publishingPreferences: SocialAccountPublishingPreferences;
  tokenExpiresAt: string | null;
  tokenVaultStatus: 'encrypted_aes256_gcm' | 'missing';
  hasRefreshToken: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface DiscoveredSocialAccount {
  externalAccountId: string;
  accountName: string;
  accountHandle: string;
  accountType: SocialAccountType;
  avatarUrl: string | null;
  accountDescription: string;
  businessCategory: string;
  followersCount: number | null;
  alreadyConnected: boolean;
  capabilities: PlatformCapabilityMatrix;
}

export interface OAuthDiscoverySession {
  sessionId: string;
  platformKey: PlatformKey;
  platformName: string;
  grantedScopes: string[];
  missingRequiredScopes: string[];
  permissionsStatus: PermissionHealthStatus;
  expiresAt: string;
  accounts: DiscoveredSocialAccount[];
}

export interface OAuthConnectionLogRecord {
  id: string;
  workspaceId: string | null;
  workspaceName?: string;
  userId: string | null;
  userEmail?: string;
  platformKey: PlatformKey;
  socialAccountId: string | null;
  eventType: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  errorCode: string | null;
  createdAt: string;
}

export interface PlatformSyncLogRecord {
  id: string;
  workspaceId: string;
  socialAccountId: string;
  platformKey: PlatformKey;
  syncType: 'profile' | 'content' | 'insights' | 'comments' | 'full';
  status: 'succeeded' | 'partial' | 'rate_limited' | 'failed';
  itemsSynced: number;
  rateLimitRemaining: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface PlatformWebhookEventRecord {
  id: string;
  platformKey: PlatformKey;
  eventType: string;
  deliveryId: string | null;
  verified: boolean;
  processedStatus: 'received' | 'processed' | 'ignored' | 'failed';
  createdAt: string;
}

export interface SocialAccountDetailPayload {
  account: SocialAccountRecord;
  platform: SocialPlatformInfo;
  recentSyncLogs: PlatformSyncLogRecord[];
  recentConnectionLogs: OAuthConnectionLogRecord[];
}

export interface AiContentSuggestionRecord {
  id: string;
  workspaceId: string;
  userId: string;
  platformKey: PlatformKey;
  topic: string;
  keywords: string[];
  objective: string;
  tone: string;
  headline: string;
  headlineOptions: string[];
  postCopy: string;
  hashtags: string[];
  callToAction: string;
  bestTimeNote: string;
  variants: { label: string; body: string }[];
  status: 'generated' | 'edited' | 'saved_to_calendar';
  savedPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPostRecord {
  id: string;
  workspaceId: string;
  authorUserId: string;
  title: string;
  caption: string;
  platformKey: PlatformKey;
  status: PostStatus;
  campaignTag: string | null;
  hashtags: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingJobRecord {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  contentPostId: string;
  postTitle: string;
  platformKey: PlatformKey;
  jobStatus: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  runAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface PublishingLogRecord {
  id: string;
  publishingJobId: string;
  workspaceId: string;
  logLevel: 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
}

export interface AnalyticsSnapshotRecord {
  id: string;
  workspaceId: string;
  platformKey: PlatformKey;
  snapshotDate: string;
  impressions: number;
  engagements: number;
  clicks: number;
  followersTotal: number;
  isDemo: boolean;
}

export interface EngagementItemRecord {
  id: string;
  workspaceId: string;
  platformKey: PlatformKey;
  authorName: string;
  authorHandle: string;
  messageType: 'comment' | 'direct_message' | 'mention';
  content: string;
  replyText: string | null;
  status: 'open' | 'replied' | 'archived';
  isDemo: boolean;
  createdAt: string;
}

export interface MediaAssetRecord {
  id: string;
  workspaceId: string;
  fileName: string;
  assetType: 'image' | 'video' | 'document' | 'template';
  mimeType: string;
  publicUrl: string;
  fileSizeBytes: number;
  folder: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  category: 'publishing' | 'ai' | 'billing' | 'team' | 'security' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface SubscriptionPlanRecord {
  id: string;
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  maxWorkspaces: number;
  maxSocialAccounts: number;
  maxTeamMembers: number;
  monthlyAiCredits: number;
  features: string[];
}

export interface WorkspaceSubscriptionRecord {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  ownerEmail?: string;
  planCode: PlanCode;
  planName: string;
  monthlyPriceCents: number;
  monthlyAiCredits: number;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  fullName: string | null;
  role: UserRole;
  status: 'active' | 'invited' | 'revoked';
  createdAt: string;
}

export interface AIUsageRecord {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  userEmail?: string;
  feature: 'content_studio' | 'content_strategy' | 'caption_rewrite' | 'hashtag_research';
  modelName: string;
  creditsUsed: number;
  promptTokens: number;
  completionTokens: number;
  status: 'completed' | 'failed';
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  ownerEmail?: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  workspaceId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CustomerDashboardData {
  metrics: {
    connectedSocialAccounts: number;
    scheduledPosts: number;
    publishedPosts: number;
    failedPosts: number;
    pendingPosts: number;
    draftPosts: number;
    availableAiCredits: number;
  };
  recentActivity: PublishingJobRecord[];
  upcomingCalendar: ContentPostRecord[];
  connectedAccounts: SocialAccountRecord[];
  platforms: SocialPlatformInfo[];
  performancePreview: AnalyticsSnapshotRecord[];
  performanceIsDemo: boolean;
}

export interface AdminOverviewData {
  metrics: {
    totalRegisteredUsers: number;
    activeSubscriptions: number;
    newRegistrations30d: number;
    totalWorkspaces: number;
    totalConnectedSocialAccounts: number;
    totalAiCreditsConsumed: number;
    totalPublishingJobs: number;
    failedPublishingJobs: number;
    openSupportTickets: number;
  };
  recentUsers: UserProfile[];
  recentAuditLogs: AuditLogRecord[];
}

export interface SystemSettingRecord {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  user: UserProfile;
  workspaces: WorkspaceSummary[];
  token: string;
}

// =============================================================================
// PHASE 3: AI CONTENT STUDIO, STRATEGY, GRAPHIC DESIGNER, CALENDAR & AUTO-PUBLISHER
// =============================================================================

export type AiModuleKey =
  | 'brand_analysis'
  | 'audience_analysis'
  | 'content_strategy'
  | 'calendar_generation'
  | 'post_writing'
  | 'caption_writing'
  | 'hashtag_recommendations'
  | 'keyword_research'
  | 'graphic_design_assistance'
  | 'image_generation'
  | 'video_scripting'
  | 'content_repurposing'
  | 'performance_recommendations'
  | 'comment_reply_drafting';

export type ContentStudioType =
  | 'social_post'
  | 'caption'
  | 'promotional'
  | 'educational'
  | 'storytelling'
  | 'engagement_post'
  | 'product_showcase'
  | 'announcement'
  | 'business_tip'
  | 'campaign_content'
  | 'image_prompt'
  | 'flyer_graphic'
  | 'video_script'
  | 'short_form_concept';

export type GraphicDesignType =
  | 'promotional_flyer'
  | 'product_announcement'
  | 'event_banner'
  | 'quote_graphic'
  | 'carousel_slide'
  | 'business_promo'
  | 'sale_announcement'
  | 'educational_infographic';

export type QueueJobStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'published'
  | 'failed'
  | 'cancelled'
  | 'awaiting_approval';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';

export interface RecurrenceRule {
  type: RecurrenceType;
  weekdays?: number[]; // 0 = Sun .. 6 = Sat
  dayOfMonth?: number; // 1..28
  customDates?: string[]; // ISO timestamps or YYYY-MM-DDTHH:mm
  endDate?: string | null;
  maxOccurrences?: number;
}

export interface BrandDocumentItem {
  id: string;
  name: string;
  category: 'brand_guide' | 'product_catalog' | 'marketing_material' | 'logo' | 'product_image' | 'other';
  summary: string;
  url?: string;
  uploadedAt: string;
}

export interface BrandIntelligenceProfile {
  workspaceId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  businessDescription: string;
  industry: string;
  productsServices: string;
  targetAudience: string;
  businessGoals: string;
  toneOfVoice: string;
  preferredLanguage: string;
  timezone: string;
  bannedWords: string[];
  brandToneRules: string;
  maxPostsPerDay: number;
  autoReplyEnabled: boolean;
  brandDocuments: BrandDocumentItem[];
  updatedAt: string;
}

export interface BrandAnalysisRecord {
  id: string;
  workspaceId: string;
  brandSummary: string;
  verifiedFacts: string[];
  assumptions: string[];
  audienceInsights: {
    primarySegments: { name: string; painPoints: string[]; buyingTriggers: string[]; preferredFormats: string[] }[];
    evidenceStatus: string;
  };
  contentThemes: { theme: string; rationale: string; priority: 'high' | 'medium' | 'supporting' }[];
  voiceGuidelines: string[];
  connectedSources: string[];
  uploadedSources: string[];
  modelName: string;
  createdAt: string;
}

export interface AiContentStrategyRecord {
  id: string;
  workspaceId: string;
  title: string;
  goals: string;
  platforms: PlatformKey[];
  executiveSummary: string;
  pillars: { name: string; sharePercent: number; objective: string; sampleHooks: string[] }[];
  weeklyCadence: { day: string; platform: string; format: string; focus: string }[];
  kpis: string[];
  evidenceNote: string;
  modelName: string;
  createdAt: string;
}

export interface ContentCampaignRecord {
  id: string;
  workspaceId: string;
  name: string;
  objective: string;
  description: string;
  colorHex: string;
  platforms: PlatformKey[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSafetyResult {
  status: 'passed' | 'flagged' | 'blocked';
  issues: { code: string; severity: 'warning' | 'error'; message: string }[];
  contentHash: string;
}

export interface RepurposedVariant {
  platformKey: PlatformKey;
  format: string;
  headline: string;
  body: string;
  hashtags: string[];
  characterCount: number;
  characterLimit: number;
  callToAction: string;
}

export interface VideoScriptPayload {
  hook?: string;
  durationSeconds?: number;
  scenes?: { timestamp: string; visual: string; voiceover: string; onScreenText: string }[];
  callToAction?: string;
  bRollIdeas?: string[];
}

export interface GeneratedContentRecord {
  id: string;
  workspaceId: string;
  userId: string;
  campaignId: string | null;
  socialAccountId: string | null;
  platformKey: PlatformKey;
  contentType: ContentStudioType;
  objective: string;
  targetAudience: string;
  toneOfVoice: string;
  language: string;
  topic: string;
  title: string;
  bodyText: string;
  captionText: string;
  hashtags: string[];
  keywords: string[];
  callToAction: string;
  imagePrompt: string;
  videoScript: VideoScriptPayload;
  repurposedVariants: RepurposedVariant[];
  safetyStatus: 'passed' | 'flagged' | 'blocked';
  safetyNotes: string[];
  status: 'draft' | 'scheduled' | 'queued' | 'published' | 'archived';
  contentPostId: string | null;
  modelName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraphicArtDirection {
  headline: string;
  subheadline: string;
  callToAction: string;
  layoutStyle: string;
  visualElements: string[];
  colorPalette: string[];
  typographyNotes: string;
  imagePrompt: string;
  suggestedCaption: string;
}

export interface GeneratedImageRecord {
  id: string;
  workspaceId: string;
  generatedContentId: string | null;
  mediaAssetId: string | null;
  graphicType: GraphicDesignType;
  platformKey: PlatformKey;
  aspectRatio: string;
  widthPx: number;
  heightPx: number;
  prompt: string;
  artDirection: GraphicArtDirection;
  captionText: string;
  sourceMode: 'ai_service' | 'compositor' | 'uploaded';
  imageUrl: string | null;
  status: 'pending' | 'generated' | 'failed';
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentCalendarItemRecord {
  id: string;
  workspaceId: string;
  contentPostId: string | null;
  generatedContentId: string | null;
  campaignId: string | null;
  campaignName?: string | null;
  campaignColor?: string | null;
  socialAccountId: string | null;
  accountName?: string | null;
  platformKey: PlatformKey;
  title: string;
  bodyText: string;
  hashtags: string[];
  mediaUrls: string[];
  formatKey: PublishingFormatKey;
  scheduledAt: string;
  timezone: string;
  recurrenceType: RecurrenceType;
  recurrenceRule: RecurrenceRule;
  status: QueueJobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingQueueRecord {
  id: string;
  workspaceId: string;
  calendarItemId: string | null;
  contentPostId: string | null;
  generatedContentId: string | null;
  campaignId: string | null;
  socialAccountId: string | null;
  accountName?: string | null;
  accountHandle?: string | null;
  platformKey: PlatformKey;
  formatKey: PublishingFormatKey;
  title: string;
  bodyText: string;
  hashtags: string[];
  mediaUrls: string[];
  linkUrl: string | null;
  status: QueueJobStatus;
  publishingMode: 'automatic' | 'approval_required';
  requiresApproval: boolean;
  approvedByUserId: string | null;
  approvedAt: string | null;
  scheduledAt: string;
  nextRunAt: string;
  timezone: string;
  recurrenceType: RecurrenceType;
  recurrenceRule: RecurrenceRule;
  idempotencyKey: string;
  contentHash: string;
  attemptCount: number;
  maxAttempts: number;
  isDeadLetter: boolean;
  lastErrorPermanent: boolean;
  lastError: string | null;
  platformPostId: string | null;
  platformPermalink: string | null;
  platformResponse: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingAttemptRecord {
  id: string;
  queueId: string;
  workspaceId: string;
  socialAccountId: string | null;
  platformKey: PlatformKey;
  attemptNumber: number;
  workerId: string;
  status: 'started' | 'succeeded' | 'retrying' | 'failed_permanent' | 'rate_limited' | 'token_expired';
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryDelayMs: number | null;
  platformPostId: string | null;
  apiResponse: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ContentApprovalRecord {
  id: string;
  workspaceId: string;
  queueId: string;
  queueTitle?: string;
  platformKey?: PlatformKey;
  scheduledAt?: string;
  bodyText?: string;
  requestedByUserId: string;
  reviewerUserId: string | null;
  decision: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementMessageRecord {
  id: string;
  workspaceId: string;
  socialAccountId: string | null;
  accountName?: string | null;
  platformKey: PlatformKey;
  externalMessageId: string | null;
  externalPostId: string | null;
  messageType: 'comment' | 'direct_message' | 'mention' | 'review';
  authorName: string;
  authorHandle: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  requiresEscalation: boolean;
  escalationReason: string | null;
  status: 'open' | 'escalated' | 'replied' | 'archived';
  sentReplyText: string | null;
  repliedByMode: 'manual' | 'ai_approved' | 'ai_auto' | null;
  repliedAt: string | null;
  isDemo: boolean;
  suggestions: AiReplySuggestionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AiReplySuggestionRecord {
  id: string;
  workspaceId: string;
  engagementMessageId: string;
  suggestedReply: string;
  tone: string;
  confidenceNote: string;
  escalationRecommended: boolean;
  escalationReason: string | null;
  safetyPassed: boolean;
  status: 'suggested' | 'approved' | 'sent' | 'dismissed';
  modelName: string;
  createdAt: string;
}

export interface WorkerHealthSummary {
  workerId: string;
  embeddedWorkerRunning: boolean;
  pollIntervalMs: number;
  queueBackend: 'sqlite_durable_queue' | 'redis_bullmq_ready';
  redisConfigured: boolean;
  lastTickAt: string | null;
  counts: Record<QueueJobStatus, number>;
  deadLetterCount: number;
}

