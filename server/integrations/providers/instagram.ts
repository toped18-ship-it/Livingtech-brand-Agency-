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

export const instagramProvider: SocialPlatformProvider = {
  key: 'instagram',
  displayName: 'Instagram Professional',
  apiVersion: 'Instagram Graph API v21.0',
  oauthAuthorizeUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
  oauthTokenUrl: `${GRAPH_BASE}/oauth/access_token`,
  oauthRevokeUrl: `${GRAPH_BASE}/me/permissions`,
  portalName: 'Meta for Developers',
  portalUrl: 'https://developers.facebook.com/apps/',
  docsUrl: 'https://developers.facebook.com/docs/instagram-platform/',
  envVarNames: ['META_APP_ID', 'META_APP_SECRET'],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 200,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ',',
  permissions: [
    {
      scopeKey: 'instagram_basic',
      label: 'Read Instagram Profile & Media',
      description: 'Read Instagram Business/Creator profile metadata, follower counts, and published media.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'instagram_content_publish',
      label: 'Publish Instagram Media & Reels',
      description: 'Create and publish single images, carousels, Stories, and Reels to Professional accounts.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'instagram_manage_insights',
      label: 'Read Instagram Insights',
      description: 'Retrieve official account reach, impressions, and post engagement metrics.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'instagram_manage_comments',
      label: 'Read & Reply to Comments',
      description: 'Retrieve media comments and post official comment replies.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'pages_show_list',
      label: 'Discover Linked Facebook Pages',
      description: 'Locate Instagram Professional accounts linked to managed Facebook Pages.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: false, // Official Instagram Graph API requires image, video, carousel, story, or reel media!
    imagePublishing: true,
    videoPublishing: true,
    carouselPublishing: true,
    storyPublishing: true,
    reelsPublishing: true,
    shortFormVideoPublishing: true,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: 'Only Instagram Business & Creator accounts linked to a Facebook Page are supported. Text-only posts are not supported by Instagram Graph API.',
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
      'instagram',
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: 'GET' }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: 'instagram',
        status: 502,
        message: 'Meta Graph API did not return an access_token for Instagram.',
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

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const query = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      fb_exchange_token: params.refreshToken,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>(
      'instagram',
      `${this.oauthTokenUrl}?${query.toString()}`,
      { method: 'GET' }
    );
    if (!data.access_token) {
      throw new ProviderApiError({
        platform: 'instagram',
        status: 401,
        message: 'Unable to refresh Instagram long-lived token. Reconnection required.',
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
        'instagram',
        `${GRAPH_BASE}/me/permissions?access_token=${encodeURIComponent(params.accessToken)}`,
        { method: 'DELETE' }
      );
      return { revoked: true, note: 'Meta Instagram permissions revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const accounts: DiscoveredAccountCandidate[] = [];
    let nextUrl: string | null =
      `${GRAPH_BASE}/me/accounts?fields=id,name,instagram_business_account{id,username,name,biography,followers_count,profile_picture_url,account_type}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
    let rateLimitRemaining: number | null = null;
    let pagesFetched = 0;

    type IgPageListResponse = {
      data?: {
        id: string;
        name: string;
        instagram_business_account?: {
          id: string;
          username?: string;
          name?: string;
          biography?: string;
          followers_count?: number;
          profile_picture_url?: string;
          account_type?: string;
        };
      }[];
      paging?: { next?: string };
    };

    while (nextUrl && pagesFetched < 5) {
      const response: { data: IgPageListResponse; rateLimit: { remaining: number | null } } =
        await providerFetchJson<IgPageListResponse>('instagram', nextUrl);
      const { data, rateLimit } = response;

      rateLimitRemaining = rateLimit.remaining;
      pagesFetched += 1;

      for (const page of data.data || []) {
        const ig = page.instagram_business_account;
        if (!ig?.id) continue;
        const isCreator = ig.account_type?.toLowerCase().includes('creator');
        accounts.push({
          externalAccountId: ig.id,
          accountName: ig.name || ig.username || page.name,
          accountHandle: ig.username ? `@${ig.username}` : `@ig_${ig.id.slice(-6)}`,
          accountType: isCreator ? 'creator_account' : 'business_account',
          avatarUrl: ig.profile_picture_url ?? null,
          accountDescription: ig.biography || '',
          businessCategory: isCreator ? 'Instagram Creator' : 'Instagram Business',
          followersCount: ig.followers_count ?? null,
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
      biography?: string;
      followers_count?: number;
      profile_picture_url?: string;
    }>(
      'instagram',
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}?fields=id,name,username,biography,followers_count,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!data.id) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId: data.id,
        accountName: data.name || data.username || 'Instagram Professional',
        accountHandle: data.username ? `@${data.username}` : `@ig_${data.id.slice(-6)}`,
        accountType: 'business_account',
        avatarUrl: data.profile_picture_url ?? null,
        accountDescription: data.biography || '',
        businessCategory: 'Instagram Professional',
        followersCount: data.followers_count ?? null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const limit = Math.min(options?.limit ?? 20, 50);
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const afterParam = options?.cursor ? `&after=${encodeURIComponent(options.cursor)}` : '';

    const { data: mediaData, rateLimit } = await providerFetchJson<{
      data?: {
        id: string;
        caption?: string;
        timestamp?: string;
        permalink?: string;
        like_count?: number;
        comments_count?: number;
        comments?: { data?: { id: string; text?: string; username?: string; timestamp?: string }[] };
      }[];
      paging?: { cursors?: { after?: string } };
    }>(
      'instagram',
      `${GRAPH_BASE}/${encodeURIComponent(externalAccountId)}/media?fields=id,caption,timestamp,permalink,like_count,comments_count,comments.limit(5){id,text,username,timestamp}&limit=${limit}${afterParam}&access_token=${encodeURIComponent(accessToken)}`
    );

    const recentContent = (mediaData.data || []).map((m) => ({
      externalPostId: m.id,
      text: m.caption || '',
      publishedAt: m.timestamp || null,
      permalink: m.permalink || null,
      likesCount: m.like_count ?? 0,
      commentsCount: m.comments_count ?? 0,
      sharesCount: 0,
      impressionsCount: 0,
    }));

    const recentComments = (mediaData.data || []).flatMap((m) =>
      (m.comments?.data || []).map((c) => ({
        externalCommentId: c.id,
        externalPostId: m.id,
        authorName: c.username || 'Instagram User',
        authorHandle: c.username ? `@${c.username}` : '@instagram_user',
        text: c.text || '',
        createdAt: c.timestamp || new Date().toISOString(),
      }))
    );

    return {
      profile,
      recentContent,
      recentComments,
      analytics: {
        impressions: 0,
        engagements: recentContent.reduce((s, m) => s + m.likesCount + m.commentsCount, 0),
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: mediaData.paging?.cursors?.after ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'instagram',
        status: 422,
        message: `Instagram Professional API does not support "${payload.format}" publishing. Attach an image, video, carousel, or Reel asset.`,
      });
    }
    const mediaUrl = payload.mediaUrls?.[0];
    if (!mediaUrl) {
      throw new ProviderApiError({
        platform: 'instagram',
        status: 422,
        message: 'Instagram publishing requires a publicly accessible media URL.',
      });
    }

    // Step 1: Create IG media container
    const createBody = new URLSearchParams({ caption: payload.text, access_token: accessToken });
    if (payload.format === 'reels' || payload.format === 'video' || payload.format === 'short_form_video') {
      createBody.set('media_type', 'REELS');
      createBody.set('video_url', mediaUrl);
    } else if (payload.format === 'story') {
      createBody.set('media_type', 'STORIES');
      createBody.set('image_url', mediaUrl);
    } else {
      createBody.set('image_url', mediaUrl);
    }

    const { data: container } = await providerFetchJson<{ id?: string }>(
      'instagram',
      `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody.toString(),
      }
    );
    if (!container.id) {
      throw new ProviderApiError({ platform: 'instagram', status: 502, message: 'Failed to create Instagram media container.' });
    }

    // Step 2: Publish container
    const publishBody = new URLSearchParams({ creation_id: container.id, access_token: accessToken });
    const { data: published } = await providerFetchJson<{ id?: string }>(
      'instagram',
      `${GRAPH_BASE}/${encodeURIComponent(account.externalAccountId)}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString(),
      }
    );

    return {
      externalPostId: published.id || container.id,
      permalink: null,
      publishedAt: new Date().toISOString(),
    };
  },
};
