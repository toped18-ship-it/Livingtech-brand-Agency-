import { providerFetchJson, ProviderApiError } from '../httpClient';
import {
  evaluatePermissionScopes,
  type AuthorizationUrlParams,
  type CodeExchangeParams,
  type ProviderTokenBundle,
  type PublishPayload,
  type PublishResult,
  type SocialPlatformProvider,
  type TokenRefreshParams,
  type TokenRevokeParams,
} from '../types';
import { canAccountPublishFormat } from '../../../src/utils/domain';

const X_API_BASE = 'https://api.twitter.com/2';

export const xProvider: SocialPlatformProvider = {
  key: 'x',
  displayName: 'X (Twitter)',
  apiVersion: 'X API v2 (OAuth 2.0 PKCE)',
  oauthAuthorizeUrl: 'https://twitter.com/i/oauth2/authorize',
  oauthTokenUrl: `${X_API_BASE}/oauth2/token`,
  oauthRevokeUrl: `${X_API_BASE}/oauth2/revoke`,
  portalName: 'X Developer Portal',
  portalUrl: 'https://developer.x.com/en/portal/dashboard',
  docsUrl: 'https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code',
  envVarNames: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 60,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ' ',
  permissions: [
    {
      scopeKey: 'users.read',
      label: 'Read Account Profile',
      description: 'Read X account handle, display name, bio, avatar, and follower metrics.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'tweet.read',
      label: 'Read Posts & Mentions',
      description: 'Retrieve published posts, replies, and engagement metrics.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'tweet.write',
      label: 'Publish Posts & Replies',
      description: 'Publish posts and reply to comments on behalf of the authorized X account.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'offline.access',
      label: 'Offline Refresh Tokens',
      description: 'Maintain background publishing access via encrypted refresh tokens.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: 'Uses OAuth 2.0 Authorization Code with mandatory PKCE S256. Read/analytics endpoints depend on X API Basic/Pro tier quotas.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      scope: scopes.join(' '),
      state: params.state,
    });
    if (params.codeChallenge) {
      query.set('code_challenge', params.codeChallenge);
      query.set('code_challenge_method', 'S256');
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },

  async exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle> {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
    });
    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const { data } = await providerFetchJson<Record<string, unknown>>('x', this.oauthTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'x', status: 502, message: 'X OAuth 2.0 did not return an access_token.' });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(' ')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 7200,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('x', this.oauthTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'x', status: 401, message: 'X refresh token failed.', isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(' ')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 7200,
    };
  },

  async revokeToken(params: TokenRevokeParams) {
    try {
      const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
      const body = new URLSearchParams({
        token: params.accessToken,
        token_type_hint: 'access_token',
      });
      await providerFetchJson('x', `${X_API_BASE}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      return { revoked: true, note: 'X OAuth 2.0 token revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, 'me');
    if (!profile) return { accounts: [], rateLimitRemaining };
    return {
      accounts: [{ ...profile, capabilities: { ...this.capabilities } }],
      rateLimitRemaining,
    };
  },

  async fetchAccountProfile(accessToken: string) {
    const { data, rateLimit } = await providerFetchJson<{
      data?: {
        id: string;
        name: string;
        username: string;
        description?: string;
        profile_image_url?: string;
        public_metrics?: { followers_count?: number };
      };
    }>('x', `${X_API_BASE}/users/me?user.fields=profile_image_url,username,name,description,public_metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const u = data.data;
    if (!u?.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: u.id,
        accountName: u.name,
        accountHandle: `@${u.username}`,
        accountType: 'profile',
        avatarUrl: u.profile_image_url ?? null,
        accountDescription: u.description || '',
        businessCategory: 'X Account',
        followersCount: u.public_metrics?.followers_count ?? null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const limit = Math.min(options?.limit ?? 15, 50);
    const pagination = options?.cursor ? `&pagination_token=${encodeURIComponent(options.cursor)}` : '';

    const { data, rateLimit } = await providerFetchJson<{
      data?: {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; impression_count?: number };
      }[];
      meta?: { next_token?: string };
    }>(
      'x',
      `${X_API_BASE}/users/${encodeURIComponent(externalAccountId)}/tweets?max_results=${Math.max(limit, 5)}&tweet.fields=created_at,public_metrics${pagination}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const recentContent = (data.data || []).map((t) => ({
      externalPostId: t.id,
      text: t.text,
      publishedAt: t.created_at || null,
      permalink: profile ? `https://x.com/${profile.accountHandle.replace(/^@/, '')}/status/${t.id}` : null,
      likesCount: t.public_metrics?.like_count ?? 0,
      commentsCount: t.public_metrics?.reply_count ?? 0,
      sharesCount: t.public_metrics?.retweet_count ?? 0,
      impressionsCount: t.public_metrics?.impression_count ?? 0,
    }));

    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, t) => s + t.impressionsCount, 0),
        engagements: recentContent.reduce((s, t) => s + t.likesCount + t.commentsCount + t.sharesCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.meta?.next_token ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'x',
        status: 422,
        message: `X API v2 does not support "${payload.format}" publishing.`,
      });
    }
    const { data } = await providerFetchJson<{ data?: { id?: string } }>('x', `${X_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: payload.text.slice(0, 280) }),
    });
    if (!data.data?.id) {
      throw new ProviderApiError({ platform: 'x', status: 502, message: 'X publish returned no tweet ID.' });
    }
    return {
      externalPostId: data.data.id,
      permalink: `https://x.com/i/web/status/${data.data.id}`,
      publishedAt: new Date().toISOString(),
    };
  },
};
