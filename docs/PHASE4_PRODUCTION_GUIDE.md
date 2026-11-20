# LIVINGTECH BRAND AGENCY — Phase 4 Production, Analytics, Subscriptions & Android Guide

This document outlines the architecture, setup, and deployment procedures for **Phase 4** of **LIVINGTECH BRAND AGENCY** — the enterprise multi-tenant social media management SaaS application.

---

## 1. Advanced Analytics & AI Performance Engine

### Metrics Tracked
- **Audience & Growth**: Followers, subscriber count, net follower growth across Facebook Pages, Instagram Professional, TikTok, LinkedIn, YouTube, X, Pinterest, and Google Business Profile.
- **Reach & Impressions**: Unique account reach, total timeline/feed impressions, and profile visits.
- **Engagement & Interactions**: Likes, comments, shares, video views, clicks, and engagement rates.
- **Publishing Performance**: Best-performing posts, posting frequency, platform comparison, and campaign performance.

### Reports & Exports
- **Date Ranges**: Daily, weekly, monthly, and custom date range selector.
- **Export Formats**: Instant CSV data download and professional PDF report generation with branded headers, metric summaries, and chart data tables.
- **AI Performance Assistant**: Analyzes real connected telemetry to identify successful content themes, underperforming formats, optimal posting times, and actionable recommendations without fabricating metrics or guaranteeing follower growth.

---

## 2. SaaS Subscription Billing & Tier System

### Tiers
1. **Free**: Limited connected accounts, 50 AI credits/mo, basic publishing.
2. **Starter ($29/mo)**: 5 connected accounts, 500 AI credits/mo, content calendar, basic analytics.
3. **Professional ($79/mo)**: 15 connected accounts, 2,000 AI credits/mo, AI content generation, multi-user workspace.
4. **Business ($199/mo)**: 35 connected accounts, 6,000 AI credits/mo, automated publishing, team roles & approval workflow.
5. **Agency ($499/mo)**: Unlimited connected accounts, 20,000 AI credits/mo, white-label client portals, VIP support.

### Payment & Currency Localization
- Supports **USD ($)**, **NGN (₦)**, **GBP (£)**, and **EUR (€)**.
- Integrated payment abstraction supporting test card simulation, Flutterwave webhook simulation, and manual bank transfer verification by Super-Admins.
- Automatic credit deduction on AI generation and post publishing.

---

## 3. Android Application (Capacitor) Setup

The application is fully compatible with **Capacitor 6+** for native Android deployment.

### Prerequisites
- Node.js 18+ & npm
- Android Studio (latest stable) with Android SDK API 34+ and Gradle.

### Build Steps for Android
1. **Build the Web Asset Bundle**:
   ```bash
   npm run build
   ```
2. **Initialize / Sync Capacitor Android**:
   ```bash
   npx cap add android
   npx cap sync android
   ```
3. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```
4. **Build APK / App Bundle in Android Studio**:
   - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)** (for testing on device/emulator).
   - Go to **Build > Generate Signed Bundle / APK** for Google Play Console release.

---

## 4. Super-Admin Control Centre

Super-Admins (`livingstoneedu64@gmail.com`) have access to the global control panel at `/super-admin` with:
- **Tenant Management**: View, suspend, or upgrade client workspaces.
- **Billing & Subscriptions**: Monitor active subscriptions, invoices, and manual payment verifications.
- **AI Usage Monitoring**: Track token consumption and credit balances across all tenants.
- **Failed Jobs Queue**: Inspect and retry failed publishing jobs or webhook deliveries.
- **Audit Logs & Security**: Review login attempts, OAuth revocations, and rate-limit violations.
