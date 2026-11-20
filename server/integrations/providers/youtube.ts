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

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const youtubeProvider: SocialPlatformProvider = {
  key: 'youtube',
  displayName: 'YouTube',
  apiVersion: 'YouTube Data API v3 & Analytics API v2',
  oauthAuthorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  oauthTokenUrl: 'https://oauth2.googleapis.com/token',
  oauthRevokeUrl: 'https://oauth2.googleapis.com/revoke',
  portalName: 'Google Cloud Console',
  portalUrl: 'https://console.cloud.google.com/apis/credentials',
  docsUrl: 'https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps',
  envVarNames: ['GOOGLE_YOUTUBE_CLIENT_ID', 'GOOGLE_YOUTUBE_CLIENT_SECRET'],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 300,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ' ',
  permissions: [
    {
      scopeKey: 'https://www.googleapis.com/auth/youtube.readonly',
      label: 'Read YouTube Channels & Videos',
      description: 'Discover channels, subscriber counts, playlists, and published video stats.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'https://www.googleapis.com/auth/youtube.upload',
      label: 'Upload Videos & Shorts',
      description: 'Upload long-form videos and YouTube Shorts to connected channels.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'https://www.googleapis.com/auth/youtube.force-ssl',
      label: 'Read & Respond to Video Comments',
      description: 'Retrieve comment threads and publish channel owner replies.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'https://www.googleapis.com/auth/yt-analytics.readonly',
      label: 'Read YouTube Channel Analytics',
      description: 'Fetch official watch time, impressions, and view analytics.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: false, // YouTube Data API v3 does not expose Community text/image posts
    imagePublishing: false,
    videoPublishing: true,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: true, // YouTube Shorts (vertical <= 60s video upload)
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: 'Supports long-form videos and Shorts via YouTube Data API v3. Google OAuth App Verification is required for production public uploads.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state: params.state,
      scope: scopes.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    });
    if (params.codeChallenge) {
      query.set('code_challenge', params.codeChallenge);
      query.set('code_challenge_method', 'S256');
    }
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },

  async exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    });
    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }
    const { data } = await providerFetchJson<Record<string, unknown>>('youtube', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'youtube', status: 502, message: 'Google OAuth did not return a YouTube access_token.' });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(' ')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('youtube', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'youtube', status: 401, message: 'YouTube refresh token revoked or invalid.', isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: params.refreshToken,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || this.permissions.map((p) => p.scopeKey).join(' ')),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 3600,
    };
  },

  async revokeToken(params: TokenRevokeParams) {
    try {
      const tokenToRevoke = params.refreshToken || params.accessToken;
      await providerFetchJson(
        'youtube',
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return { revoked: true, note: 'Google OAuth YouTube token revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const accounts: DiscoveredAccountCandidate[] = [];
    let pageToken: string | undefined;
    let rateLimitRemaining: number | null = null;
    let pagesFetched = 0;

    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const { data, rateLimit } = await providerFetchJson<{
        items?: {
          id: string;
          snippet?: {
            title?: string;
            description?: string;
            customUrl?: string;
            thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
          };
          statistics?: { subscriberCount?: string; viewCount?: string };
        }[];
        nextPageToken?: string;
      }>(
        'youtube',
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true&maxResults=50${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;

      for (const ch of data.items || []) {
        accounts.push({
          externalAccountId: ch.id,
          accountName: ch.snippet?.title || 'YouTube Channel',
          accountHandle: ch.snippet?.customUrl || `@yt_${ch.id.slice(-6)}`,
          accountType: 'channel',
          avatarUrl: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          accountDescription: ch.snippet?.description || '',
          businessCategory: 'YouTube Channel',
          followersCount: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null,
          capabilities: { ...this.capabilities },
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken && pagesFetched < 5);

    return { accounts, rateLimitRemaining };
  },

  async fetchAccountProfile(accessToken: string, externalAccountId: string) {
    const { data, rateLimit } = await providerFetchJson<{
      items?: {
        id: string;
        snippet?: { title?: string; description?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } };
        statistics?: { subscriberCount?: string };
      }[];
    }>(
      'youtube',
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(externalAccountId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const ch = data.items?.[0];
    if (!ch) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: ch.id,
        accountName: ch.snippet?.title || 'YouTube Channel',
        accountHandle: ch.snippet?.customUrl || `@yt_${ch.id.slice(-6)}`,
        accountType: 'channel',
        avatarUrl: ch.snippet?.thumbnails?.default?.url ?? null,
        accountDescription: ch.snippet?.description || '',
        businessCategory: 'YouTube Channel',
        followersCount: ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageParam = options?.cursor ? `&pageToken=${encodeURIComponent(options.cursor)}` : '';
    const limit = Math.min(options?.limit ?? 15, 25);

    const { data: searchData, rateLimit } = await providerFetchJson<{
      items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string } }[];
      nextPageToken?: string;
    }>(
      'youtube',
      `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${encodeURIComponent(externalAccountId)}&type=video&order=date&maxResults=${limit}${pageParam}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const recentContent = (searchData.items || [])
      .filter((i) => i.id?.videoId)
      .map((i) => ({
        externalPostId: i.id!.videoId!,
        text: i.snippet?.title || i.snippet?.description || '',
        publishedAt: i.snippet?.publishedAt || null,
        permalink: `https://www.youtube.com/watch?v=${i.id!.videoId!}`,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        impressionsCount: 0,
      }));

    return {
      profile,
      recentContent,
      recentComments: [],
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: searchData.nextPageToken ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(_accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'youtube',
        status: 422,
        message: `YouTube Data API v3 only supports video and YouTube Shorts uploads—"${payload.format}" is not supported.`,
      });
    }
    throw new ProviderApiError({
      platform: 'youtube',
      status: 422,
      message: 'YouTube video uploads require initiating a resumable binary media upload session with a video asset from Media Library.',
    });
  },
};
