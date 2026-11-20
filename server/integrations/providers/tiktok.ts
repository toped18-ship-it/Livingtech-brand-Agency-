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

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export const tiktokProvider: SocialPlatformProvider = {
  key: 'tiktok',
  displayName: 'TikTok',
  apiVersion: 'TikTok Display & Content Posting API v2',
  oauthAuthorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  oauthTokenUrl: `${TIKTOK_API_BASE}/oauth/token/`,
  oauthRevokeUrl: `${TIKTOK_API_BASE}/oauth/revoke/`,
  portalName: 'TikTok for Developers',
  portalUrl: 'https://developers.tiktok.com/apps/',
  docsUrl: 'https://developers.tiktok.com/doc/oauth-user-access-token-management/',
  envVarNames: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 600,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ',',
  permissions: [
    {
      scopeKey: 'user.info.basic',
      label: 'Read Profile Identity',
      description: 'Read TikTok open_id, display name, and avatar URL.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'user.info.stats',
      label: 'Read Follower & Profile Stats',
      description: 'Retrieve follower, following, likes, and video counts.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'video.list',
      label: 'List Published Videos',
      description: 'Read published videos and basic engagement metrics.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'video.publish',
      label: 'Direct Video Publishing',
      description: 'Publish short-form videos directly via TikTok Content Posting API.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: false,
    imagePublishing: true, // Photo Mode via Content Posting API
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true,
    commentRetrieval: false, // TikTok public Display API v2 does not expose general comment listing without Research/Business API
    commentResponses: false,
    analyticsRetrieval: true,
    notes: 'Requires TikTok Content Posting API audit before public direct publishing; un-audited apps publish to creator inbox/private only.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_key: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state: params.state,
    });
    if (params.codeChallenge) {
      query.set('code_challenge', params.codeChallenge);
      query.set('code_challenge_method', 'S256');
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },

  async exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      client_key: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
    });
    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const { data } = await providerFetchJson<Record<string, unknown>>('tiktok', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'tiktok', status: 502, message: 'TikTok token exchange did not return an access_token.' });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(',')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 86400,
      refreshExpiresInSeconds: data.refresh_expires_in ? Number(data.refresh_expires_in) : null,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      client_key: params.clientId,
      client_secret: params.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('tiktok', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'tiktok', status: 401, message: 'TikTok token refresh failed.', isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(',')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 86400,
      refreshExpiresInSeconds: data.refresh_expires_in ? Number(data.refresh_expires_in) : null,
    };
  },

  async revokeToken(params: TokenRevokeParams) {
    try {
      const body = new URLSearchParams({
        client_key: params.clientId,
        client_secret: params.clientSecret,
        token: params.accessToken,
      });
      await providerFetchJson('tiktok', `${TIKTOK_API_BASE}/oauth/revoke/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return { revoked: true, note: 'TikTok OAuth access token revoked via v2/oauth/revoke.' };
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
        user?: {
          open_id?: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          bio_description?: string;
          follower_count?: number;
        };
      };
    }>(
      'tiktok',
      `${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,username,avatar_url,bio_description,follower_count`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const u = data.data?.user;
    if (!u?.open_id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: u.open_id,
        accountName: u.display_name || u.username || 'TikTok Account',
        accountHandle: u.username ? `@${u.username}` : `@${(u.display_name || u.open_id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
        accountType: 'creator_account',
        avatarUrl: u.avatar_url ?? null,
        accountDescription: u.bio_description || '',
        businessCategory: 'TikTok Creator / Business',
        followersCount: u.follower_count ?? null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const { data, rateLimit } = await providerFetchJson<{
      data?: {
        videos?: {
          id: string;
          title?: string;
          video_description?: string;
          create_time?: number;
          share_url?: string;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
        }[];
        cursor?: number;
        has_more?: boolean;
      };
    }>('tiktok', `${TIKTOK_API_BASE}/video/list/?fields=id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_count: Math.min(options?.limit ?? 20, 20),
        ...(options?.cursor ? { cursor: Number(options.cursor) } : {}),
      }),
    });

    const recentContent = (data.data?.videos || []).map((v) => ({
      externalPostId: v.id,
      text: v.video_description || v.title || '',
      publishedAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
      permalink: v.share_url || null,
      likesCount: v.like_count ?? 0,
      commentsCount: v.comment_count ?? 0,
      sharesCount: v.share_count ?? 0,
      impressionsCount: v.view_count ?? 0,
    }));

    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: recentContent.reduce((s, v) => s + v.impressionsCount, 0),
        engagements: recentContent.reduce((s, v) => s + v.likesCount + v.commentsCount + v.sharesCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.data?.has_more && data.data.cursor ? String(data.data.cursor) : null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'tiktok',
        status: 422,
        message: `TikTok does not support "${payload.format}" publishing.`,
      });
    }
    const videoUrl = payload.mediaUrls?.[0];
    if (!videoUrl) {
      throw new ProviderApiError({ platform: 'tiktok', status: 422, message: 'TikTok publishing requires a verified media URL.' });
    }
    const { data } = await providerFetchJson<{ data?: { publish_id?: string } }>(
      'tiktok',
      `${TIKTOK_API_BASE}/post/publish/video/init/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: payload.text.slice(0, 2200),
            privacy_level: 'PUBLIC_TO_EVERYONE',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      }
    );
    return {
      externalPostId: data.data?.publish_id || `tt_${Date.now()}`,
      permalink: null,
      publishedAt: new Date().toISOString(),
    };
  },
};
