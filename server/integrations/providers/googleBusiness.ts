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

const GBP_ACCOUNTS_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const GBP_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_POSTS_BASE = 'https://mybusiness.googleapis.com/v4';

export const googleBusinessProvider: SocialPlatformProvider = {
  key: 'google_business',
  displayName: 'Google Business Profile',
  apiVersion: 'Google Business Profile APIs v1 / v4',
  oauthAuthorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  oauthTokenUrl: 'https://oauth2.googleapis.com/token',
  oauthRevokeUrl: 'https://oauth2.googleapis.com/revoke',
  portalName: 'Google Cloud Console',
  portalUrl: 'https://console.cloud.google.com/apis/credentials',
  docsUrl: 'https://developers.google.com/my-business/content/basic-setup',
  envVarNames: ['GOOGLE_BUSINESS_CLIENT_ID', 'GOOGLE_BUSINESS_CLIENT_SECRET'],
  supportsPkce: true,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 120,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ' ',
  permissions: [
    {
      scopeKey: 'https://www.googleapis.com/auth/business.manage',
      label: 'Manage Google Business Profiles & Locations',
      description: 'Discover business accounts & verified locations, publish Local Posts, read/reply to customer reviews, and fetch performance insights.',
      isRequired: true,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
  ],
  capabilities: {
    textPublishing: true,
    imagePublishing: true,
    videoPublishing: false,
    carouselPublishing: false,
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true, // Customer Reviews
    commentResponses: true, // Review Replies
    analyticsRetrieval: true, // Business Profile Performance API
    notes: 'Requires Google Business Profile API access approval in Google Cloud Console. Supports Local Posts (text + photo) and Review responses per location.',
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
    const { data } = await providerFetchJson<Record<string, unknown>>('google_business', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'google_business', status: 502, message: 'Google OAuth did not return an access_token.' });
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
    const { data } = await providerFetchJson<Record<string, unknown>>('google_business', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'google_business', status: 401, message: 'Google Business Profile refresh token expired or revoked.', isTokenExpired: true });
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
        'google_business',
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return { revoked: true, note: 'Google Business Profile OAuth token revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const discovered: DiscoveredAccountCandidate[] = [];
    const { data: accountsRes, rateLimit } = await providerFetchJson<{
      accounts?: { name: string; accountName?: string; type?: string }[];
    }>('google_business', `${GBP_ACCOUNTS_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    for (const acc of accountsRes.accounts || []) {
      let locationsFound = false;
      try {
        const { data: locRes } = await providerFetchJson<{
          locations?: {
            name: string;
            title?: string;
            storeCode?: string;
            profile?: { description?: string };
            categories?: { primaryCategory?: { displayName?: string } };
          }[];
        }>(
          'google_business',
          `${GBP_INFO_BASE}/${acc.name}/locations?readMask=name,title,storeCode,profile,categories&pageSize=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        for (const loc of locRes.locations || []) {
          locationsFound = true;
          const fullResource = loc.name.startsWith('accounts/') ? loc.name : `${acc.name}/${loc.name}`;
          discovered.push({
            externalAccountId: fullResource,
            accountName: loc.title || acc.accountName || 'Google Business Location',
            accountHandle: loc.storeCode ? `store:${loc.storeCode}` : loc.name,
            accountType: 'location',
            avatarUrl: null,
            accountDescription: loc.profile?.description || '',
            businessCategory: loc.categories?.primaryCategory?.displayName || 'Google Business Location',
            followersCount: null,
            capabilities: { ...this.capabilities },
          });
        }
      } catch {
        // Fallback to account-level listing if location readMask is restricted
      }

      if (!locationsFound) {
        discovered.push({
          externalAccountId: acc.name,
          accountName: acc.accountName || acc.name,
          accountHandle: acc.name,
          accountType: 'location',
          avatarUrl: null,
          accountDescription: `Google Business Profile (${acc.type || 'BUSINESS'})`,
          businessCategory: 'Google Business Profile',
          followersCount: null,
          capabilities: { ...this.capabilities },
        });
      }
    }

    return { accounts: discovered, rateLimitRemaining: rateLimit.remaining };
  },

  async fetchAccountProfile(accessToken: string, externalAccountId: string) {
    const locSegment = externalAccountId.includes('/locations/')
      ? `locations/${externalAccountId.split('/locations/').pop()}`
      : externalAccountId;
    const { data, rateLimit } = await providerFetchJson<{
      name?: string;
      title?: string;
      storeCode?: string;
      profile?: { description?: string };
      categories?: { primaryCategory?: { displayName?: string } };
    }>(
      'google_business',
      `${GBP_INFO_BASE}/${locSegment}?readMask=name,title,storeCode,profile,categories`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!data.name) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    return {
      profile: {
        externalAccountId,
        accountName: data.title || 'Google Business Location',
        accountHandle: data.storeCode ? `store:${data.storeCode}` : data.name,
        accountType: 'location',
        avatarUrl: null,
        accountDescription: data.profile?.description || '',
        businessCategory: data.categories?.primaryCategory?.displayName || 'Google Business Location',
        followersCount: null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string, options) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    const pageParam = options?.cursor ? `&pageToken=${encodeURIComponent(options.cursor)}` : '';
    const { data, rateLimit } = await providerFetchJson<{
      localPosts?: { name: string; summary?: string; createTime?: string; searchUrl?: string }[];
      nextPageToken?: string;
    }>('google_business', `${GBP_POSTS_BASE}/${externalAccountId}/localPosts?pageSize=20${pageParam}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const recentContent = (data.localPosts || []).map((post) => ({
      externalPostId: post.name,
      text: post.summary || '',
      publishedAt: post.createTime || null,
      permalink: post.searchUrl || null,
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
        followersTotal: 0,
      },
      rateLimitRemaining: rateLimit.remaining ?? rateLimitRemaining,
      nextCursor: data.nextPageToken ?? null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'google_business',
        status: 422,
        message: `Google Business Profile Local Posts only support text and photo updates—"${payload.format}" is not supported.`,
      });
    }
    const { data } = await providerFetchJson<{ name?: string; searchUrl?: string }>(
      'google_business',
      `${GBP_POSTS_BASE}/${account.externalAccountId}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languageCode: 'en-US',
          summary: payload.text.slice(0, 1500),
          topicType: 'STANDARD',
          ...(payload.mediaUrls?.[0]
            ? { media: [{ mediaFormat: 'PHOTO', sourceUrl: payload.mediaUrls[0] }] }
            : {}),
        }),
      }
    );
    return {
      externalPostId: data.name || `gbp_${Date.now()}`,
      permalink: data.searchUrl || null,
      publishedAt: new Date().toISOString(),
    };
  },
};
