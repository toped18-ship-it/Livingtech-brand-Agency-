# LIVINGTECH BRAND AGENCY — Phase 1 Full-Stack SaaS Foundation

**LIVINGTECH BRAND AGENCY** is a multi-tenant social media management SaaS application engineered for Web, Progressive Web App (PWA), and Android (Capacitor) delivery.

---

## Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons, Vite PWA (`vite-plugin-pwa`), Capacitor Android configuration (`capacitor.config.ts`), shared API contracts (`src/shared/api-contracts.ts`).
- **Backend**: Node.js + Express + TypeScript (`server.ts`, `server/app.ts`, `server/routes/api.ts`) with Zod request validation, scrypt password hashing, HMAC-SHA256 sessions (HTTP-only cookies + Bearer token for mobile/Capacitor), AES-256-GCM token vault encryption, and structured JSON logging.
- **Database & Multi-Tenant Isolation**:
  - **Runtime Relational Database**: SQLite (`better-sqlite3`, stored in `data/livingtech.db`) implementing all 23 relational tables (`users`, `organisations`, `workspaces`, `workspace_members`, `roles`, `permissions`, `brand_profiles`, `social_accounts`, `social_account_tokens`, `social_platforms`, `content_posts`, `content_variants`, `content_assets`, `publishing_schedules`, `publishing_jobs`, `publishing_logs`, `analytics_snapshots`, `notifications`, `subscriptions`, `subscription_plans`, `ai_usage`, `media_library`, `audit_logs`, plus `support_tickets`, `engagement_items`, `system_settings`, and `auth_tokens`).
  - **PostgreSQL / Supabase Migrations**: Complete production SQL migrations with UUID primary keys, foreign keys, indexes, timestamps, and strict multi-tenant Row Level Security (RLS) policies in:
    - `supabase/migrations/0001_initial_schema.sql`
    - `supabase/migrations/0002_rls_policies.sql`
  - **Cloud Identity & Firestore Security**: Firebase Authentication (Google SSO ready) and Firestore with tenant-scoped rules (`firestore.rules` + `firebase-blueprint.json`). Please review and harden `firestore.rules` further before broad public deployment.
- **AI Content Studio & AI Content Strategy**: Server-side `@google/genai` integration (`server/services/aiService.ts`) with structured JSON outputs, brand-profile context injection, and atomic workspace AI credit deduction.

---

## Application Modules Included

### A. Public Portal (8 Pages)
1. Login (`/login`)
2. Register (`/register`)
3. Forgot Password (`/forgot-password`)
4. Email Verification (`/verify-email`)
5. Account Recovery (`/recovery`)
6. Pricing (`/pricing`)
7. Privacy Policy (`/privacy`)
8. Terms of Service (`/terms`)

### B. Customer Workspace Application (15 Pages)
1. Overview Dashboard (`/app/overview`)
2. Social Accounts (`/app/social-accounts`)
3. AI Content Studio (`/app/ai-studio`)
4. Content Calendar (`/app/calendar`)
5. Auto Publisher (`/app/auto-publisher`)
6. AI Content Strategy (`/app/ai-strategy`)
7. Engagement Manager (`/app/engagement`)
8. Analytics (`/app/analytics`)
9. Media Library (`/app/media`)
10. Notifications (`/app/notifications`)
11. Billing & Subscriptions (`/app/billing`)
12. Team Management (`/app/team`)
13. Brand Settings & Multi-Workspace Provisioning (`/app/brand-settings`)
14. Profile Settings & Account Deletion (`/app/profile`)
15. Help & Support (`/app/support`)

### C. Protected Super-Admin Console (`/admin/*`)
Accessible exclusively to users with the `super_admin` role (unauthorized users receive `403 Forbidden` both from the server API and the UI guard):
- Overview KPIs & Recent Registrations
- User Management (role assignment, suspension, verification)
- Subscription Management (plan & status overrides)
- AI Usage Monitor (credits & token ledger + chart)
- Connected Social Accounts & Platform Integration Controls
- Publishing Job Queue & Dedicated Failed Job Monitor
- System Settings
- Security Audit Logs
- Customer Support Desk

---

## Local Development & Automated Tests

```bash
# Install dependencies
npm install

# Run full-stack development server (Express API + Vite frontend on port 3000)
npm run dev

# Run automated unit, RBAC, tenant-isolation, and Firestore rules tests
npm test

# Type-check and build production bundle
npm run lint
npm run build
```

---

## Environment Variables & Phase 2 Credentials

Copy `.env.example` to `.env` for local or external deployments (never commit secrets).

### Required for Phase 2 External Integrations
1. **Supabase Production Migration (Optional external Postgres host)**:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
   - Apply `supabase/migrations/0001_initial_schema.sql` and `supabase/migrations/0002_rls_policies.sql`.
2. **Official Social Media OAuth Providers** (never exposed to browser code):
   - Meta (Instagram & Facebook): `META_CLIENT_ID`, `META_CLIENT_SECRET`
   - LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
   - X (Twitter): `X_CLIENT_ID`, `X_CLIENT_SECRET`
   - TikTok: `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET`
   - YouTube (Google): `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`
   - Token Vault Encryption: `TOKEN_ENCRYPTION_KEY` (32+ byte secret) and `SESSION_SECRET`.

### Official OAuth Callback Paths
Register the callback path `/auth/oauth/<platform>/callback` (where `<platform>` is `instagram`, `facebook`, `linkedin`, `x`, `tiktok`, or `youtube`) on your configured `APP_URL` domain.

---

## Android Mobile Packaging (Capacitor)

The frontend is already structured for Capacitor Android builds (`capacitor.config.ts` + `src/lib/apiClient.ts` Bearer token auth + `VITE_API_BASE_URL`):

```bash
# 1. Build web assets pointing at your hosted HTTPS API origin
VITE_API_BASE_URL="https://your-production-api-url" npm run build

# 2. Initialize & sync Capacitor Android project (on a local Android Studio machine)
npm install @capacitor/core @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
