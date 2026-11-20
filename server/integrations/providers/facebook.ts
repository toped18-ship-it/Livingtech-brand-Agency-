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

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const facebookProvider: SocialPlatformProvider = {
  key: 'facebook',
  displayName: 'Facebook Pages',
  apiVersion: 'Meta Graph API v21.0',
  oauthAuthorizeUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
  oauthTokenUrl: `${GRAPH_BASE}/oauth/access_token`,
  oauthRevokeUrl: `${GRAPH_BASE}/me/permissions`,
  portalName: 'Meta for Developers',
  portalUrl: 'https://developers.facebook.com/apps/',
  docsUrl: 'https://developers.facebook.com/docs/pages-api/',
  envVarNames: ['META_APP_ID', 'META_APP_SECRET'],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 200,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ',',
  permissions: [
    {
      scopeKey: 'pages_show_list',
      label: 'List Managed Pages',
      description: 'Discover Facebook Pages you administer so you can choose which Pages to connect.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pages_read_engagement',
      label: 'Read Page Engagement & Insights',
      description: 'Read Page posts, follower metrics, insights, and comments.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pages_manage_posts',
      label: 'Publish Page Posts',
      description: 'Publish text, photo, video, and Reel content to selected Facebook Pages.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pages_manage_engagement',
      label: 'Respond to Page Comments',
      description: 'Reply to and moderate comments on published Facebook Page posts.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: true,
    reelsPublishing: true,
    shortFormVideoPublishing: true,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: 'Requires Facebook Page Admin/Editor role and Meta App Review approval for pages_manage_posts and pages_read_engagement.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : this.permissions.map((p) => p.scopeKey);
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state: params.state,
      scope: scopes.join(','),
    });
    return `${this.oauthAuthorizeUrl}?${query.toString()}`;
  },

  async exchangeCodeForTokens(params: CodeExchangeParams): Promise<ProviderTokenBundle> {
    const query = new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>(
      'facebook',
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: 'GET' }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: 'facebook',
        status: 502,
        message: 'Meta Graph API did not return an access_token.',
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: this.permissions.map((p) => p.scopeKey).join(','),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184000,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    // Meta exchanges an existing valid user token for a refreshed long-lived 60-day token via fb_exchange_token.
    const query = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      fb_exchange_token: params.refreshToken,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>(
      'facebook',
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: 'GET' }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: 'facebook',
        status: 401,
        message: 'Unable to extend Facebook long-lived access token. Reconnection required.',
        isTokenExpired: true,
      });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: String(data.access_token),
      tokenType: String(data.token_type || 'Bearer'),
      scope: this.permissions.map((p) => p.scopeKey).join(','),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184000,
    };
  },

  async revokeToken(params: TokenRevokeParams) {
    try {
      await providerFetchJson(
        'facebook',
        `${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(params.accessToken)}`,
        { method: 'DELETE' }
      );
      return { revoked: true, note: 'Meta Graph API permissions revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged; upstream Meta token may already be invalidated.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const accounts: DiscoveredAccountCandidate[] = [];
    let nextUrl: string | null =
      `${GRAPH_BASE}/me/accounts?fields=id,name,username,category,about,fan_count,followers_count,picture{url},access_token&limit=50&access_token=${encodeURIComponent(accessToken)}`;
    let rateLimitRemaining: number | null = null;
    let pagesFetched = 0;

    type MetaPageListResponse = {
      data?: {
        id: string;
        name: string;
        username?: string;
        category?: string;
        about?: string;
        fan_count?: number;
        followers_count?: number;
        picture?: { data?: { url?: string } };
        access_token?: string;
      }[];
      paging?: { next?: string };
    };

    while (nextUrl && pagesFetched < 5) {
      const response: { data: MetaPageListResponse; rateLimit: { remaining: number | null } } =
        await providerFetchJson<MetaPageListResponse>('facebook', nextUrl);
      const { data, rateLimit } = response;

      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;

      for (const page of data.data || []) {
        accounts.push({
          externalAccountId: page.id,
          accountName: page.name,
          accountHandle: page.username ? `@${page.username}` : `@${page.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
          accountType: 'page',
          avatarUrl: page.picture?.data?.url ?? null,
          accountDescription: page.about || '',
          businessCategory: page.category || 'Facebook Page',
          followersCount: page.followers_count ?? page.fan_count ?? null,
          scopedAccessToken: page.access_token ?? null,
          capabilities: { ...this.capabilities },
        });
      }
      nextUrl = data.paging?.next ?? null;
    }

    return { accounts, rateLimitRemaining };
  },

  async fetchAccountProfile(accessToken: string, externalAccountId: string) {
    const { data, rateLimit } = await providerFetchJson<{
      id?: string;
      name?: string;
      username?: string;
      about?: string;
      category?: string;
      followers_count?: number;
      fan_count?: number;
      picture?: { data?: { url?: string } };
    }>(
      'facebook',
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}?fields=id,name,username,about,category,followers_count,fan_count,picture{url}&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!data.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: data.id,
        accountName: data.name || 'Facebook Page',
        accountHandle: data.username ? `@${data.username}` : `@fb_${data.id.slice(-6)}`,
        accountType: 'page',
        avatarUrl: data.picture?.data?.url ?? null,
        accountDescription: data.about || '',
        businessCategory: data.category || 'Facebook Page',
        followersCount: data.followers_count ?? data.fan_count ?? null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const limit = Math.min(options?.limit ?? 20, 50);
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const afterParam = options?.cursor ? `&after=${encodeURIComponent(options.cursor)}` : '';

    const { data: postsData, rateLimit } = await providerFetchJson<{
      data?: {
        id: string;
        message?: string;
        created_time?: string;
        permalink_url?: string;
        shares?: { count?: number };
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number }; data?: { id: string; message?: string; created_time?: string; from?: { name?: string; id?: string } }[] };
      }[];
      paging?: { cursors?: { after?: string } };
    }>(
      'facebook',
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}/published_posts?fields=id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true).limit(5){id,message,created_time,from}&limit=${limit}${afterParam}&access_token=${encodeURIComponent(accessToken)}`
    );

    const recentContent = (postsData.data || []).map((p) => ({
      externalPostId: p.id,
      text: p.message || '',
      publishedAt: p.created_time || null,
      permalink: p.permalink_url || null,
      likesCount: p.likes?.summary?.total_count ?? 0,
      commentsCount: p.comments?.summary?.total_count ?? 0,
      sharesCount: p.shares?.count ?? 0,
      impressionsCount: 0,
    }));

    const recentComments = (postsData.data || []).flatMap((p) =>
      (p.comments?.data || []).map((c) => ({
        externalCommentId: c.id,
        externalPostId: p.id,
        authorName: c.from?.name || 'Facebook User',
        authorHandle: c.from?.id ? `fb:${c.from.id}` : '@facebook_user',
        text: c.message || '',
        createdAt: c.created_time || new Date().toISOString(),
      }))
    );

    const totalEngagements = recentContent.reduce((sum, p) => sum + p.likesCount + p.commentsCount + p.sharesCount, 0);
    return {
      profile,
      recentContent,
      recentComments,
      analytics: {
        impressions: recentContent.reduce((s, p) => s + p.impressionsCount, 0),
        engagements: totalEngagements,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: postsData.paging?.cursors?.after ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'facebook',
        status: 422,
        message: `Format "${payload.format}" is not enabled for this Facebook Page.`,
      });
    }
    const endpoint =
      payload.format === 'image' && payload.mediaUrls?.[0]
        ? `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/photos`
        : `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/feed`;

    const body = new URLSearchParams({ access_token: accessToken });
    if (payload.format === 'image' && payload.mediaUrls?.[0]) {
      body.set('url', payload.mediaUrls[0]);
      body.set('caption', payload.text);
    } else {
      body.set('message', payload.text);
      if (payload.linkUrl) body.set('link', payload.linkUrl);
    }

    const { data } = await providerFetchJson<{ id?: string; post_id?: string }>('facebook', endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const postId = data.post_id || data.id;
    if (!postId) {
      throw new ProviderApiError({ platform: 'facebook', status: 502, message: 'Facebook Page publish returned no post ID.' });
    }
    return {
      externalPostId: postId,
      permalink: `https://www.facebook.com/${postId}`,
      publishedAt: new Date().toISOString(),
    };
  },
};
