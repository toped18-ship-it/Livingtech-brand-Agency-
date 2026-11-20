import { providerFetchJson, ProviderApiError } from '../httpClient';
import {
  evaluatePermissionScopes,
  type AuthorizationUrlParams,
  type CodeExchangeParams,
  type DiscoveredAccountCandidate,
  type ProviderTokenBundle,
  type PublishPayload,
  type PublishResult,
  type SocialPlatformProvider,
  type TokenRefreshParams,
  type TokenRevokeParams,
} from '../types';
import { canAccountPublishFormat } from '../../../src/utils/domain';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

export const pinterestProvider: SocialPlatformProvider = {
  key: 'pinterest',
  displayName: 'Pinterest',
  apiVersion: 'Pinterest API v5',
  oauthAuthorizeUrl: 'https://www.pinterest.com/oauth/',
  oauthTokenUrl: `${PINTEREST_API_BASE}/oauth/token`,
  oauthRevokeUrl: null,
  portalName: 'Pinterest Developers',
  portalUrl: 'https://developers.pinterest.com/apps/',
  docsUrl: 'https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/',
  envVarNames: ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: false,
  defaultRateLimitRpm: 120,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ',',
  permissions: [
    {
      scopeKey: 'user_accounts:read',
      label: 'Read Pinterest Business Account',
      description: 'Read Pinterest profile metadata, business category, and follower metrics.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'boards:read',
      label: 'Read Boards',
      description: 'Discover Pinterest boards for organizing and targeting published Pins.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pins:read',
      label: 'Read Pins & Analytics',
      description: 'Retrieve published Pins, saves, outbound clicks, and account analytics.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pins:write',
      label: 'Create Pins',
      description: 'Publish image and video Pins to authorized Pinterest boards.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: false, // Pinterest requires visual media (Image or Video Pin)
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true,
    commentRetrieval: false,
    commentResponses: false,
    analyticsRetrieval: true,
    notes: 'Pinterest API v5 Standard Access approval is required for production publishing; Trial Access apps are limited to sandbox testing.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state: params.state,
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },

  async exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle> {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('pinterest', this.oauthTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'pinterest', status: 502, message: 'Pinterest API v5 did not return an access_token.' });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(',')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 2592000,
      refreshExpiresInSeconds: data.refresh_token_expires_in ? Number(data.refresh_token_expires_in) : null,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('pinterest', this.oauthTokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'pinterest', status: 401, message: 'Pinterest refresh token expired.', isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(',')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 2592000,
    };
  },

  async revokeToken(_params: TokenRevokeParams) {
    return {
      revoked: false,
      note: 'Local encrypted token purged. Users can also revoke app access in Pinterest Security Settings.',
    };
  },

  async discoverAccounts(accessToken: string) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, 'me');
    if (!profile) return { accounts: [], rateLimitRemaining };
    const accounts: DiscoveredAccountCandidate[] = [
      { ...profile, capabilities: { ...this.capabilities } },
    ];
    return { accounts, rateLimitRemaining };
  },

  async fetchAccountProfile(accessToken: string) {
    const { data, rateLimit } = await providerFetchJson<{
      id?: string;
      username?: string;
      business_name?: string;
      account_type?: string;
      about?: string;
      profile_image?: string;
      follower_count?: number;
    }>('pinterest', `${PINTEREST_API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const id = data.id || data.username;
    if (!id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: id,
        accountName: data.business_name || data.username || 'Pinterest Account',
        accountHandle: data.username ? `@${data.username}` : `@pin_${id.slice(-6)}`,
        accountType: data.account_type === 'BUSINESS' ? 'business_account' : 'profile',
        avatarUrl: data.profile_image ?? null,
        accountDescription: data.about || '',
        businessCategory: data.account_type === 'BUSINESS' ? 'Pinterest Business' : 'Pinterest Personal',
        followersCount: data.follower_count ?? null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageSize = Math.min(options?.limit ?? 20, 50);
    const bookmark = options?.cursor ? `&bookmark=${encodeURIComponent(options.cursor)}` : '';
    const { data, rateLimit } = await providerFetchJson<{
      items?: {
        id: string;
        title?: string;
        description?: string;
        created_at?: string;
        link?: string;
        pin_metrics?: { lifetime_metrics?: { impression?: number; save?: number; pin_click?: number } };
      }[];
      bookmark?: string;
    }>('pinterest', `${PINTEREST_API_BASE}/pins?page_size=${pageSize}${bookmark}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const recentContent = (data.items || []).map((pin) => ({
      externalPostId: pin.id,
      text: pin.description || pin.title || '',
      publishedAt: pin.created_at || null,
      permalink: `https://www.pinterest.com/pin/${pin.id}/`,
      likesCount: pin.pin_metrics?.lifetime_metrics?.save ?? 0,
      commentsCount: 0,
      sharesCount: 0,
      impressionsCount: pin.pin_metrics?.lifetime_metrics?.impression ?? 0,
    }));

    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, p) => s + p.impressionsCount, 0),
        engagements: recentContent.reduce((s, p) => s + p.likesCount, 0),
        clicks: (data.items || []).reduce((s, p) => s + (p.pin_metrics?.lifetime_metrics?.pin_click ?? 0), 0),
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.bookmark ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'pinterest',
        status: 422,
        message: `Pinterest API v5 requires an image or video asset—"${payload.format}" is not supported.`,
      });
    }
    const imageUrl = payload.mediaUrls?.[0];
    if (!imageUrl || !payload.boardId) {
      throw new ProviderApiError({
        platform: 'pinterest',
        status: 422,
        message: 'Pinterest Pin publishing requires both a target boardId and an image/video URL.',
      });
    }
    const { data } = await providerFetchJson<{ id?: string }>('pinterest', `${PINTEREST_API_BASE}/pins`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        board_id: payload.boardId,
        title: (payload.title || payload.text).slice(0, 100),
        description: payload.text.slice(0, 500),
        link: payload.linkUrl || undefined,
        media_source: { source_type: 'image_url', url: imageUrl },
      }),
    });
    return {
      externalPostId: data.id || `pin_${Date.now()}`,
      permalink: data.id ? `https://www.pinterest.com/pin/${data.id}/` : null,
      publishedAt: new Date().toISOString(),
    };
  },
};
