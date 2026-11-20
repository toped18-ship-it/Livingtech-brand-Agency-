# LIVINGTECH BRAND AGENCY — Phase 2 Social Media Integration & OAuth Setup Guide

This document describes the official OAuth 2.0 integration architecture, environment variables, callback URLs, permissions, capability rules, developer review requirements, and webhook endpoints for all **8 officially supported social media platforms**.

> **Security Policy**: Never commit client secrets into git or expose access tokens / refresh tokens / client secrets in frontend browser bundles or application logs. All secrets are loaded exclusively on the server via environment variables, and all OAuth access & refresh tokens are encrypted at rest with **AES-256-GCM** using `TOKEN_ENCRYPTION_KEY`.

---

## 1. Runtime Callback URLs (Register Both in Every Developer Portal)

Register both the **Development** and **Shared / Production** callback URIs in each platform's OAuth app settings:

- **Development Base URL**: `https://ais-dev-i4wzkrqenem7hoz4vu5nxy-692808975894.europe-west1.run.app`
- **Shared / Production Base URL**: `https://ais-pre-i4wzkrqenem7hoz4vu5nxy-692808975894.europe-west1.run.app`

| Platform | Callback Path | Webhook Endpoint |
| --- | --- | --- |
| Facebook Pages (`facebook`) | `/auth/oauth/facebook/callback` | `/api/webhooks/social/facebook` |
| Instagram Professional (`instagram`) | `/auth/oauth/instagram/callback` | `/api/webhooks/social/instagram` |
| TikTok (`tiktok`) | `/auth/oauth/tiktok/callback` | `/api/webhooks/social/tiktok` |
| LinkedIn (`linkedin`) | `/auth/oauth/linkedin/callback` | `/api/webhooks/social/linkedin` |
| YouTube (`youtube`) | `/auth/oauth/youtube/callback` | `/api/webhooks/social/youtube` |
| X (`x`) | `/auth/oauth/x/callback` | `/api/webhooks/social/x` |
| Pinterest (`pinterest`) | `/auth/oauth/pinterest/callback` | `/api/webhooks/social/pinterest` |
| Google Business Profile (`google_business`) | `/auth/oauth/google_business/callback` | `/api/webhooks/social/google_business` |

---

## 2. Per-Platform Configuration & Developer Review Guide

### 1. Facebook Pages (`facebook`)
- **Developer Portal**: [Meta for Developers](https://developers.facebook.com/apps/)
- **API Version**: Meta Graph API `v21.0`
- **Server Environment Variables**: `META_APP_ID`, `META_APP_SECRET`
- **OAuth Protocol**: OAuth 2.0 Authorization Code (`https://www.facebook.com/v21.0/dialog/oauth`), token exchange + `fb_exchange_token` long-lived token refresh, upstream revocation via `DELETE /v21.0/me/permissions`.
- **Requested Scopes**: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `read_insights`
- **Account Discovery**: Paginates `/v21.0/me/accounts` to discover all manageable Facebook Pages and stores each Page's dedicated encrypted Page Access Token.
- **App Review**: Meta App Review is required to request `pages_manage_posts`, `pages_manage_engagement`, and `read_insights` from non-developer Facebook users.

### 2. Instagram Professional Accounts (`instagram`)
- **Developer Portal**: [Meta for Developers (Instagram Graph API)](https://developers.facebook.com/apps/)
- **API Version**: Instagram Graph API `v21.0`
- **Server Environment Variables**: `META_APP_ID`, `META_APP_SECRET`
- **Requested Scopes**: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`, `pages_show_list`
- **Account Discovery**: Discovers Instagram Business & Creator accounts linked to the authorizing user's Facebook Pages (`/me/accounts?fields=instagram_business_account{...}`).
- **Capability Rules**: Text-only posts are **not supported** by the Instagram Graph API (`textPublishing: false`). Supports Image, Video, Carousel, Story, Reels, Comment Retrieval/Replies, and Insights.
- **App Review**: Meta App Review is required for `instagram_content_publish`, `instagram_manage_comments`, and `instagram_manage_insights`.

### 3. TikTok (`tiktok`)
- **Developer Portal**: [TikTok for Developers](https://developers.tiktok.com/)
- **API Version**: TikTok API `v2`
- **Server Environment Variables**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`
- **OAuth Protocol**: OAuth 2.0 + **PKCE (S256)** (`https://www.tiktok.com/v2/auth/authorize/`), token exchange & refresh at `https://open.tiktokapis.com/v2/oauth/token/`, upstream revocation at `/v2/oauth/revoke/`.
- **Requested Scopes**: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.publish`, `video.upload`
- **Capability Rules**: Supports Video / Short-Form Video publishing and profile/video stats. Text-only posts and general third-party comment management APIs are disabled (`textPublishing: false`, `commentRetrieval: false`, `commentResponses: false`).
- **App Review**: TikTok Content Posting API audit is required to publish publicly (`DIRECT_POST`); unaudited apps publish to private/draft inbox only.

### 4. LinkedIn (`linkedin`)
- **Developer Portal**: [LinkedIn Developers](https://www.linkedin.com/developers/apps)
- **API Version**: LinkedIn REST API `v202501`
- **Server Environment Variables**: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- **OAuth Protocol**: OAuth 2.0 (`https://www.linkedin.com/oauth/v2/authorization`), token exchange/refresh at `/oauth/v2/accessToken`, revocation at `/oauth/v2/revoke`.
- **Requested Scopes**: `openid`, `profile`, `email`, `w_member_social`, `r_organization_social`, `w_organization_social`, `rw_organization_admin`
- **Account Discovery**: Discovers both the user's personal LinkedIn Profile (`/v2/userinfo`) and all administered Organization Pages (`/rest/organizationAcls`).
- **App Review**: LinkedIn Community Management API approval is required for organization scopes (`r_organization_social`, `w_organization_social`, `rw_organization_admin`).

### 5. YouTube (`youtube`)
- **Developer Portal**: [Google Cloud Console — YouTube Data API v3](https://console.cloud.google.com/apis/credentials)
- **API Version**: YouTube Data API `v3`
- **Server Environment Variables**: `GOOGLE_YOUTUBE_CLIENT_ID`, `GOOGLE_YOUTUBE_CLIENT_SECRET`
- **OAuth Protocol**: Google OAuth 2.0 + **PKCE (S256)** with `access_type=offline&prompt=consent` for persistent refresh tokens; revocation via `https://oauth2.googleapis.com/revoke`.
- **Requested Scopes**: `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.force-ssl`, `https://www.googleapis.com/auth/yt-analytics.readonly`
- **Account Discovery**: Lists all channels owned/managed by the authenticated Google user via `/youtube/v3/channels?part=snippet,statistics&mine=true`.
- **Capability Rules**: Video & Shorts publishing, comment retrieval/replies, and YouTube Analytics. Text, image, carousel, and story publishing are disabled.
- **App Review**: Google OAuth verification (restricted/sensitive scopes) and YouTube API Services Audit are required for public production users.

### 6. X (`x`)
- **Developer Portal**: [X Developer Portal](https://developer.x.com/en/portal/dashboard)
- **API Version**: X API `v2`
- **Server Environment Variables**: `X_CLIENT_ID`, `X_CLIENT_SECRET`
- **OAuth Protocol**: OAuth 2.0 + **PKCE (S256)** (`https://twitter.com/i/oauth2/authorize`), token exchange/refresh with HTTP Basic Auth at `https://api.twitter.com/2/oauth2/token`, revocation at `/2/oauth2/revoke`.
- **Requested Scopes**: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- **Capability Rules**: Text, image, video publishing, reply/comment retrieval and responses, and tweet public metrics. Stories and Reels are disabled.
- **Tier Note**: X API Basic/Pro tier is required for production tweet read/analytics volume.

### 7. Pinterest (`pinterest`)
- **Developer Portal**: [Pinterest Developers](https://developers.pinterest.com/apps/)
- **API Version**: Pinterest API `v5`
- **Server Environment Variables**: `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`
- **OAuth Protocol**: OAuth 2.0 (`https://www.pinterest.com/oauth/`), token exchange/refresh with HTTP Basic Auth at `https://api.pinterest.com/v5/oauth/token`.
- **Requested Scopes**: `user_accounts:read`, `boards:read`, `pins:read`, `pins:write`
- **Capability Rules**: Image and Video Pin publishing and Pin/account analytics (`textPublishing: false`, `storyPublishing: false`, `commentRetrieval: false`).
- **App Review**: Standard Access review is required in Pinterest Developer Portal for production pin publishing.

### 8. Google Business Profile (`google_business`)
- **Developer Portal**: [Google Cloud Console — Business Profile APIs](https://console.cloud.google.com/apis/credentials)
- **API Version**: Business Profile Account Management `v1` / Business Information `v1` / Local Posts `v4`
- **Server Environment Variables**: `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`
- **OAuth Protocol**: Google OAuth 2.0 + **PKCE (S256)** with offline refresh tokens; revocation via `https://oauth2.googleapis.com/revoke`.
- **Requested Scopes**: `https://www.googleapis.com/auth/business.manage`
- **Account Discovery**: Iterates Business Profile accounts (`/v1/accounts`) and enumerates all managed physical/service business locations (`/v1/{account}/locations`).
- **Capability Rules**: Text & photo Local Posts, customer review retrieval & replies, and location insights (`videoPublishing: false`, `carouselPublishing: false`, `storyPublishing: false`, `reelsPublishing: false`).
- **App Review**: Google Business Profile API access request approval is required on the Cloud Project before production API quotas are unlocked.

---

## 3. Multi-Tenant & Token Security Architecture

1. **Zero Password Collection**: Users are always redirected to the platform's official OAuth consent page via a secure popup (`window.open` + `postMessage` handshake).
2. **CSRF & PKCE Protection**: Every authorization request writes a cryptographically random `state` token and AES-256-GCM encrypted PKCE `code_verifier` into `oauth_states` with a 15-minute TTL and single-use consumption.
3. **Encrypted Server-Only Token Vault**: Access tokens, refresh tokens, and pending discovery payloads are encrypted with AES-256-GCM (`iv:authTag:ciphertext`) in `social_account_tokens`. No token column is ever selected or returned to frontend JSON responses.
4. **Log Redaction**: `redactSensitiveTokens()` automatically strips `Bearer ...`, `access_token=...`, `refresh_token=...`, and `client_secret=...` from all audit logs, sync logs, and error strings.
5. **Workspace Isolation**: Every read, verify, refresh, sync, preferences update, discovery session confirmation, and disconnect route enforces authenticated membership in `:wid` (`WHERE id = ? AND workspace_id = ?`).
