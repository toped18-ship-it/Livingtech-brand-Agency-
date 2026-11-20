# LIVINGTECH BRAND AGENCY — Phase 3 Architecture & Operations Guide

## 1. Independent Server-Side Gemini AI Engine (`/server/ai/`)

All Gemini API calls execute strictly server-side via `@google/genai` (`server/ai/geminiClient.ts`). API keys are never sent to browser bundles.

### Resilience & Free-Tier Model Strategy
- **Primary Model**: `gemini-4-hydrogen`
- **Fallback Model**: `gemini-3.1-flash-lite`
- **Zero-Credit Failure Protection**: Workspace AI credits are deducted atomically inside a database transaction **only after** a structured JSON response succeeds. Transient `503`/`429` errors automatically fail over and record `credits_used = 0` in `ai_generation_usage` if all models fail.

### 14 Independent AI Modules (`/server/ai/modules/`)
1. `brandAnalysis.ts` — Synthesizes Brand Profile, permitted connected social accounts, and uploaded brand documents; strictly separates **Verified Facts** from **AI Assumptions**.
2. `audienceAnalysis.ts` — Segments target audiences and marks whether segments are backed by live analytics or strategic assumptions.
3. `contentStrategy.ts` — Generates and persists 30-day content pillars, weekly cadences, and KPIs (`ai_content_strategies`).
4. `calendarGeneration.ts` — Generates evidence-based schedule plans with an explicit disclaimer whenever live audience timing insights are not yet synced.
5. `postWriting.ts` — Generates all 14 Content Studio formats (`social_post`, `caption`, `promotional`, `educational`, `storytelling`, `engagement_post`, `product_showcase`, `announcement`, `business_tip`, `campaign_content`, `image_prompt`, `flyer_graphic`, `video_script`, `short_form_concept`), enforces Content Safety, and saves to `generated_content`.
6. `captionWriting.ts` — Produces Primary, Short Hook, and Storytelling captions.
7. `hashtagRecommendations.ts` — Returns balanced broad, niche, and branded hashtag tiers.
8. `keywordResearch.ts` — Generates search keywords, long-tail phrases, and question queries with honest caveat that search volumes are not live SEO telemetry.
9. `graphicDesignAssistance.ts` — Produces brand-aware art direction, color palettes, typography notes, and image prompts.
10. `imageGeneration.ts` — Connects to a live external image-generation backend (`IMAGE_GENERATION_API_URL` + `IMAGE_GENERATION_API_KEY`) or saves real exported PNG/JPEG files from the HTML5 Canvas Brand Graphic Compositor into `media_library` and `generated_images`. Never simulates or fakes generation success.
11. `videoScripting.ts` — Builds timestamped scene-by-scene scripts, opening hooks, and B-roll checklists.
12. `contentRepurposing.ts` — Converts one idea or post into native platform-sized variants across all 8 platforms.
13. `performanceRecommendations.ts` — Evaluates synced `analytics_snapshots` (`is_demo = 0`) and clearly distinguishes observed metrics from best-practice hypotheses.
14. `commentReplyDrafting.ts` — Drafts brand-safe replies and automatically flags legal, refund, fraud, or crisis complaints for human escalation.

---

## 2. Automatic Publishing Engine & Background Worker

### Default Mode & Optional Approval Mode
- **Default**: **Automatic Publishing** (`publishing_mode = 'automatic'`). Due jobs are executed autonomously by the server-side worker without requiring an open browser tab.
- **Optional Pre-Publishing Approval**: Enabled per connected social account (`requireApprovalBeforePublish: true`) or per post override. Held jobs stay in `awaiting_approval` and are skipped by the worker until explicitly approved in `Auto Publisher -> Pre-Publishing Approval Queue`.

### Durable Queue & Worker Execution
- **Embedded Worker**: Automatically started inside `server.ts` when `ENABLE_EMBEDDED_WORKER=true` (default). Polls every `WORKER_POLL_INTERVAL_MS` (default `15000` ms).
- **Standalone Worker Process**: Run `npm run worker` (`server/worker.ts`) in production containers (set `ENABLE_EMBEDDED_WORKER=false` on web pods to separate web and worker scaling).
- **Redis / BullMQ Horizontal Scaling**: Configure `REDIS_URL` in environment secrets to enable multi-replica Redis-backed worker coordination.

### Failure Handling, Idempotency & Honesty Gate
- **Real Platform Confirmation Gate**: A job is **never** marked `published` unless the platform adapter returns a non-empty `externalPostId`.
- **Transient Errors (`429`, `5xx`, network)**: Retried automatically with capped exponential backoff (`publishing_attempts` logs every attempt, HTTP status, worker ID, and delay).
- **Expired OAuth Tokens (`401` / near expiry)**: Automatically triggers `refreshSocialAccountToken` before failing.
- **Permanent Errors (`400`, `403`, `422`, missing permissions, disconnected account)**: Immediately routed to the Dead-Letter Queue (`is_dead_letter = 1`, `status = 'failed'`) with a user notification and one-click recovery via `Publishing History`.
- **Timezone & DST**: All local dates are converted via two-pass fixed-point IANA resolution (`convertLocalDateTimeToUtcIso`), and recurring schedules (`daily`, `weekdays`, `weekly`, `monthly`, `custom`) preserve exact local wall-clock time across DST shifts.

---

## 3. Database & Security Posture

### 12 New Phase 3 Tables (SQLite + Supabase PostgreSQL `0003_phase3_ai_publishing.sql`)
1. `ai_brand_analyses`
2. `ai_content_strategies`
3. `content_campaigns`
4. `generated_content`
5. `generated_images`
6. `content_calendar`
7. `publishing_queue`
8. `publishing_attempts`
9. `content_approvals`
10. `engagement_messages`
11. `ai_reply_suggestions`
12. `ai_generation_usage`

All 12 collections are modeled in `firebase-blueprint.json` and protected by multi-tenant workspace RBAC rules in `firestore.rules` (audited, ESLint-verified, tested, and deployed).

### Required Production Environment Secrets (for Live Upstream Execution)
- `GEMINI_API_KEY`: Enables live server-side Gemini AI generation across all 14 modules.
- `IMAGE_GENERATION_API_URL` & `IMAGE_GENERATION_API_KEY` (optional): Enables live neural image generation in AI Graphic Designer (Brand Graphic Compositor works out of the box without it).
- Official OAuth Client ID & Secret variables per social platform (`META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `X_CLIENT_ID`, `X_CLIENT_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`) for live social account connection and publishing.
- `REDIS_URL` (optional): Enables distributed multi-replica queue workers.
