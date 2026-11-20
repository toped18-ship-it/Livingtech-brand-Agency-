import type {
  DeveloperReviewStatus,
  PermissionHealthStatus,
  PlatformCapabilityMatrix,
  PlatformKey,
  PlatformPermissionSpec,
  PublishingFormatKey,
  SocialAccountPublishingPreferences,
  SocialAccountType,
} from '../../src/shared/api-contracts';

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

export interface ProviderTokenBundle {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  scope: string;
  expiresInSeconds?: number | null;
  refreshExpiresInSeconds?: number | null;
}

export interface DiscoveredAccountCandidate {
  externalAccountId: string;
  accountName: string;
  accountHandle: string;
  accountType: SocialAccountType;
  avatarUrl: string | null;
  accountDescription: string;
  businessCategory: string;
  followersCount: number | null;
  /** Optional account-scoped token (e.g., Meta Page Access Token) encrypted at rest alongside user token. */
  scopedAccessToken?: string | null;
  capabilities: PlatformCapabilityMatrix;
}

export interface ProviderProfileSnapshot {
  externalAccountId: string;
  accountName: string;
  accountHandle: string;
  accountType: SocialAccountType;
  avatarUrl: string | null;
  accountDescription: string;
  businessCategory: string;
  followersCount: number | null;
}

export interface ProviderContentItem {
  externalPostId: string;
  text: string;
  publishedAt: string | null;
  permalink: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  impressionsCount: number;
}

export interface ProviderCommentItem {
  externalCommentId: string;
  externalPostId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  createdAt: string;
}

export interface ProviderAnalyticsSummary {
  impressions: number;
  engagements: number;
  clicks: number;
  followersTotal: number;
}

export interface ProviderSyncResult {
  profile: ProviderProfileSnapshot | null;
  recentContent: ProviderContentItem[];
  recentComments: ProviderCommentItem[];
  analytics: ProviderAnalyticsSummary | null;
  rateLimitRemaining: number | null;
  nextCursor: string | null;
}

export interface PublishPayload {
  format: PublishingFormatKey;
  title?: string;
  text: string;
  mediaUrls?: string[];
  linkUrl?: string;
  boardId?: string;
}

export interface PublishResult {
  externalPostId: string;
  permalink?: string | null;
  publishedAt: string;
}

export interface PermissionValidationResult {
  status: PermissionHealthStatus;
  grantedScopes: string[];
  missingRequiredScopes: string[];
}

export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  scopes?: string[];
}

export interface CodeExchangeParams {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier?: string;
}

export interface TokenRefreshParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface TokenRevokeParams {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string | null;
}

export interface SocialPlatformProvider {
  readonly key: PlatformKey;
  readonly displayName: string;
  readonly apiVersion: string;
  readonly oauthAuthorizeUrl: string;
  readonly oauthTokenUrl: string;
  readonly oauthRevokeUrl: string | null;
  readonly portalName: string;
  readonly portalUrl: string;
  readonly docsUrl: string;
  readonly envVarNames: readonly string[];
  readonly supportsPkce: boolean;
  readonly supportsRefresh: boolean;
  readonly supportsRevocation: boolean;
  readonly defaultRateLimitRpm: number;
  readonly defaultReviewStatus: DeveloperReviewStatus;
  readonly scopeDelimiter: ' ' | ',';
  readonly permissions: readonly PlatformPermissionSpec[];
  readonly capabilities: PlatformCapabilityMatrix;

  buildAuthorizationUrl(params: AuthorizationUrlParams): string;
  exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle>;
  refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle>;
  revokeToken(params: TokenRevokeParams): Promise<{ revoked: boolean; note: string }>;
  discoverAccounts(accessToken: string): Promise<{ accounts: DiscoveredAccountCandidate[]; rateLimitRemaining: number | null }>;
  fetchAccountProfile(accessToken: string, externalAccountId: string): Promise<{ profile: ProviderProfileSnapshot | null; rateLimitRemaining: number | null }>;
  fetchContentAndInsights(
    accessToken: string,
    externalAccountId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<ProviderSyncResult>;
  validatePermissions(grantedScopesRaw: string | string[]): PermissionValidationResult;
  publishContent(
    accessToken: string,
    account: { externalAccountId: string; capabilities: PlatformCapabilityMatrix },
    payload: PublishPayload
  ): Promise<PublishResult>;
}

export const DEFAULT_PUBLISHING_PREFERENCES: SocialAccountPublishingPreferences = {
  autoPublishEnabled: true,
  requireApprovalBeforePublish: false,
  defaultTimezone: 'UTC',
  defaultVisibility: 'public',
  appendDefaultHashtags: false,
  defaultHashtags: [],
  dailyPostLimit: 10,
};

export function splitScopes(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

export function evaluatePermissionScopes(
  specs: readonly PlatformPermissionSpec[],
  grantedRaw: string | string[]
): PermissionValidationResult {
  const grantedScopes = splitScopes(grantedRaw);
  const grantedSet = new Set(grantedScopes.map((s) => s.toLowerCase()));
  const missingRequiredScopes = specs
    .filter((p) => p.isRequired && !grantedSet.has(p.scopeKey.toLowerCase()))
    .map((p) => p.scopeKey);

  if (grantedScopes.length === 0) {
    return { status: 'revoked', grantedScopes, missingRequiredScopes };
  }
  if (missingRequiredScopes.length > 0) {
    return { status: 'partial', grantedScopes, missingRequiredScopes };
  }
  return { status: 'granted', grantedScopes, missingRequiredScopes: [] };
}
