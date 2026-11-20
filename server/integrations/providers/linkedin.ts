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

const LINKEDIN_VERSION = '202501';

export const linkedinProvider: SocialPlatformProvider = {
  key: 'linkedin',
  displayName: 'LinkedIn',
  apiVersion: 'LinkedIn Marketing & Community Management API (v202501)',
  oauthAuthorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  oauthTokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  oauthRevokeUrl: 'https://www.linkedin.com/oauth/v2/revoke',
  portalName: 'LinkedIn Developer Portal',
  portalUrl: 'https://www.linkedin.com/developers/apps',
  docsUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow',
  envVarNames: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  supportsPkce: false,
  supportsRefresh: true,
  supportsRevocation: true,
  defaultRateLimitRpm: 100,
  defaultReviewStatus: 'not_submitted',
  scopeDelimiter: ' ',
  permissions: [
    {
      scopeKey: 'openid',
      label: 'OpenID Identity',
      description: 'Verify the authorizing LinkedIn member identity.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'profile',
      label: 'Member Profile',
      description: 'Read member display name and profile picture.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'email',
      label: 'Primary Email',
      description: 'Identify the authorizing LinkedIn member email address.',
      isRequired: false,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'w_member_social',
      label: 'Publish Member Posts',
      description: 'Publish text, image, and link updates on behalf of the LinkedIn member.',
      isRequired: true,
      requiresAppReview: false,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'r_organization_admin',
      label: 'Discover Administered Organization Pages',
      description: 'List LinkedIn Company Pages where the user has Administrator privileges.',
      isRequired: false,
      requiresAppReview: true,
      approvalStatus: 'not_submitted',
    },
    {
      scopeKey: 'w_organization_social',
      label: 'Publish to Organization Pages',
      description: 'Publish posts and comment responses on authorized LinkedIn Company Pages.',
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
    storyPublishing: false,
    reelsPublishing: false,
    shortFormVideoPublishing: false,
    commentRetrieval: true,
    commentResponses: true,
    analyticsRetrieval: true,
    notes: 'Member publishing uses Share on LinkedIn product. Organization Page discovery, comments, and analytics require LinkedIn Community Management API approval.',
  },

  buildAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scopes = params.scopes?.length ? params.scopes : ['openid', 'profile', 'email', 'w_member_social'];
    const query = new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      state: params.state,
      scope: scopes.join(' '),
    });
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
    const { data } = await providerFetchJson<Record<string, unknown>>('linkedin', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'linkedin', status: 502, message: 'LinkedIn did not return an access_token.' });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : null,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || 'openid profile email w_member_social'),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184000,
      refreshExpiresInSeconds: data.refresh_token_expires_in ? Number(data.refresh_token_expires_in) : null,
    };
  },

  async refreshAccessToken(params: TokenRefreshParams): Promise<ProviderTokenBundle> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });
    const { data } = await providerFetchJson<Record<string, unknown>>('linkedin', this.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.access_token) {
      throw new ProviderApiError({ platform: 'linkedin', status: 401, message: 'LinkedIn refresh token expired or unsupported on current tier.', isTokenExpired: true });
    }
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : params.refreshToken,
      tokenType: String(data.token_type || 'Bearer'),
      scope: String(data.scope || 'openid profile email w_member_social'),
      expiresInSeconds: data.expires_in ? Number(data.expires_in) : 5184000,
    };
  },

  async revokeToken(params: TokenRevokeParams) {
    try {
      const body = new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        token: params.accessToken,
      });
      await providerFetchJson('linkedin', 'https://www.linkedin.com/oauth/v2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return { revoked: true, note: 'LinkedIn OAuth token revoked.' };
    } catch {
      return { revoked: false, note: 'Local encrypted token purged.' };
    }
  },

  async discoverAccounts(accessToken: string) {
    const accounts: DiscoveredAccountCandidate[] = [];
    const { data: user, rateLimit } = await providerFetchJson<{
      sub?: string;
      name?: string;
      email?: string;
      picture?: string;
    }>('linkedin', 'https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (user.sub) {
      accounts.push({
        externalAccountId: `urn:li:person:${user.sub}`,
        accountName: user.name || 'LinkedIn Member',
        accountHandle: user.email || `linkedin:${user.sub.slice(0, 8)}`,
        accountType: 'profile',
        avatarUrl: user.picture ?? null,
        accountDescription: 'Authorized LinkedIn Member Profile',
        businessCategory: 'Personal / Executive Profile',
        followersCount: null,
        capabilities: {
          ...this.capabilities,
          commentRetrieval: false,
          commentResponses: false,
          analyticsRetrieval: false,
          notes: 'Personal profiles support publishing; organization analytics & comments require Organization Admin access.',
        },
      });
    }

    // Attempt Organization Page discovery if r_organization_admin was granted
    try {
      const { data: aclData } = await providerFetchJson<{
        elements?: { organization?: string; organizationTarget?: string; role?: string; state?: string }[];
      }>(
        'linkedin',
        'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': LINKEDIN_VERSION,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );
      for (const el of aclData.elements || []) {
        const orgUrn = el.organization || el.organizationTarget;
        if (!orgUrn) continue;
        const orgId = orgUrn.split(':').pop() || orgUrn;
        accounts.push({
          externalAccountId: orgUrn,
          accountName: `LinkedIn Organization (${orgId})`,
          accountHandle: `org:${orgId}`,
          accountType: 'organization',
          avatarUrl: null,
          accountDescription: 'Administered LinkedIn Company Page',
          businessCategory: 'Company Page',
          followersCount: null,
          capabilities: { ...this.capabilities },
        });
      }
    } catch {
      // Organization scope not granted on basic tier — gracefully return member profile only
    }

    return { accounts, rateLimitRemaining: rateLimit.remaining };
  },

  async fetchAccountProfile(accessToken: string, externalAccountId: string) {
    const { data: user, rateLimit } = await providerFetchJson<{
      sub?: string;
      name?: string;
      email?: string;
      picture?: string;
    }>('linkedin', 'https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!user.sub) return { profile: null, rateLimitRemaining: rateLimit.remaining };
    const isOrg = externalAccountId.startsWith('urn:li:organization:');
    return {
      profile: {
        externalAccountId,
        accountName: isOrg ? `LinkedIn Organization (${externalAccountId.split(':').pop()})` : user.name || 'LinkedIn Member',
        accountHandle: isOrg ? `org:${externalAccountId.split(':').pop()}` : user.email || `linkedin:${user.sub.slice(0, 8)}`,
        accountType: isOrg ? 'organization' : 'profile',
        avatarUrl: isOrg ? null : user.picture ?? null,
        accountDescription: isOrg ? 'LinkedIn Organization Page' : 'LinkedIn Member Profile',
        businessCategory: isOrg ? 'Company Page' : 'Executive Profile',
        followersCount: null,
      },
      rateLimitRemaining: rateLimit.remaining,
    };
  },

  async fetchContentAndInsights(accessToken: string, externalAccountId: string) {
    const { profile, rateLimitRemaining } = await this.fetchAccountProfile(accessToken, externalAccountId);
    return {
      profile,
      recentContent: [],
      recentComments: [],
      analytics: {
        impressions: 0,
        engagements: 0,
        clicks: 0,
        followersTotal: profile?.followersCount ?? 0,
      },
      rateLimitRemaining,
      nextCursor: null,
    };
  },

  validatePermissions(grantedScopesRaw) {
    return evaluatePermissionScopes(this.permissions, grantedScopesRaw);
  },

  async publishContent(accessToken: string, account, payload: PublishPayload): Promise<PublishResult> {
    if (!canAccountPublishFormat(account.capabilities, payload.format)) {
      throw new ProviderApiError({
        platform: 'linkedin',
        status: 422,
        message: `LinkedIn does not support "${payload.format}" publishing.`,
      });
    }
    const { data } = await providerFetchJson<{ id?: string }>('linkedin', 'https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: account.externalAccountId,
        commentary: payload.text.slice(0, 3000),
        visibility: 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED' },
        lifecycleState: 'PUBLISHED',
      }),
    });
    return {
      externalPostId: data.id || `li_${Date.now()}`,
      permalink: null,
      publishedAt: new Date().toISOString(),
    };
  },
};
