import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../env';
import { SOCIAL_PROVIDER_LIST } from '../integrations/registry';
import { DEFAULT_PUBLISHING_PREFERENCES } from '../integrations/types';
import { openSqliteDatabase, type DbInstance, type SqliteDriverName } from './sqliteDriver';

export type { DbInstance, SqliteDriverName };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function initDatabase(dbPath?: string, options?: { forceDriver?: SqliteDriverName }): DbInstance {
  const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;
  const defaultPath = isServerless ? '/tmp/livingtech.db' : path.resolve(process.cwd(), 'data', 'livingtech.db');
  const targetPath = dbPath ?? defaultPath;
  if (targetPath !== ':memory:') {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  const { db } = openSqliteDatabase(targetPath, options);
  db.pragma('foreign_keys = ON');
  if (targetPath !== ':memory:') {
    try {
      db.pragma('journal_mode = WAL');
    } catch {
      // Fallback gracefully if serverless /tmp restricts WAL mode
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(role_id, resource, action)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      auth_provider TEXT NOT NULL DEFAULT 'password',
      external_uid TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      role_slug TEXT NOT NULL DEFAULT 'customer' REFERENCES roles(slug),
      email_verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),
      timezone TEXT NOT NULL DEFAULT 'UTC',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_type TEXT NOT NULL CHECK(token_type IN ('email_verify','password_reset','account_recovery')),
      token_value TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      billing_email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      ai_credits_balance INTEGER NOT NULL DEFAULT 250 CHECK(ai_credits_balance >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(organisation_id, slug)
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      invited_email TEXT NOT NULL,
      role_slug TEXT NOT NULL DEFAULT 'editor' REFERENCES roles(slug),
      status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('active','invited','revoked')),
      invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, invited_email)
    );
    CREATE INDEX IF NOT EXISTS idx_ws_members_ws ON workspace_members(workspace_id);

    CREATE TABLE IF NOT EXISTS brand_profiles (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
      brand_name TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',
      primary_color TEXT NOT NULL DEFAULT '#0052FF',
      secondary_color TEXT NOT NULL DEFAULT '#071436',
      accent_color TEXT NOT NULL DEFAULT '#F59E0B',
      business_description TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      tone_of_voice TEXT NOT NULL DEFAULT 'Executive & Authoritative',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_platforms (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE CHECK(key IN ('facebook','instagram','tiktok','linkedin','youtube','x','pinterest','google_business')),
      display_name TEXT NOT NULL,
      oauth_authorize_url TEXT NOT NULL,
      oauth_token_url TEXT NOT NULL,
      scopes TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      connected_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      platform_id TEXT NOT NULL REFERENCES social_platforms(id) ON DELETE RESTRICT,
      external_account_id TEXT NOT NULL,
      account_handle TEXT NOT NULL,
      account_name TEXT NOT NULL,
      avatar_url TEXT,
      connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK(connection_status IN ('connected','expired','revoked','disconnected')),
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, platform_id, external_account_id)
    );
    CREATE INDEX IF NOT EXISTS idx_social_accounts_ws ON social_accounts(workspace_id);

    CREATE TABLE IF NOT EXISTS social_account_tokens (
      id TEXT PRIMARY KEY,
      social_account_id TEXT NOT NULL UNIQUE REFERENCES social_accounts(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      connected_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      encrypted_access_token TEXT NOT NULL,
      encrypted_refresh_token TEXT,
      token_type TEXT NOT NULL DEFAULT 'Bearer',
      scope TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_posts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','scheduled','published','failed')),
      campaign_tag TEXT,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      scheduled_for TEXT,
      published_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_ws_status ON content_posts(workspace_id, status);

    CREATE TABLE IF NOT EXISTS content_variants (
      id TEXT PRIMARY KEY,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      variant_label TEXT NOT NULL DEFAULT 'Primary',
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_library (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('image','video','document','template')),
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      folder TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_media_ws ON media_library(workspace_id);

    CREATE TABLE IF NOT EXISTS content_assets (
      id TEXT PRIMARY KEY,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      media_id TEXT NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publishing_schedules (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      scheduled_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_rule TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publishing_jobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      schedule_id TEXT REFERENCES publishing_schedules(id) ON DELETE SET NULL,
      content_post_id TEXT NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      job_status TEXT NOT NULL DEFAULT 'queued' CHECK(job_status IN ('queued','processing','succeeded','failed','cancelled')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      run_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_ws_status ON publishing_jobs(workspace_id, job_status);

    CREATE TABLE IF NOT EXISTS publishing_logs (
      id TEXT PRIMARY KEY,
      publishing_job_id TEXT NOT NULL REFERENCES publishing_jobs(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      log_level TEXT NOT NULL CHECK(log_level IN ('info','warn','error')),
      message TEXT NOT NULL,
      provider_response_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      snapshot_date TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      engagements INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      followers_total INTEGER NOT NULL DEFAULT 0,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS engagement_items (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('comment','direct_message','mention')),
      content TEXT NOT NULL,
      reply_text TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','replied','archived')),
      is_demo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'system' CHECK(category IN ('publishing','ai','billing','team','security','system')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_ws ON notifications(workspace_id, is_read);

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE CHECK(code IN ('basic','pro','enterprise','starter','growth','agency')),
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      monthly_price_cents INTEGER NOT NULL,
      annual_price_cents INTEGER NOT NULL,
      max_workspaces INTEGER NOT NULL,
      max_social_accounts INTEGER NOT NULL,
      max_team_members INTEGER NOT NULL,
      monthly_ai_credits INTEGER NOT NULL,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('trialing','active','past_due','cancelled')),
      billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly','annual')),
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      provider_subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature TEXT NOT NULL CHECK(feature IN ('content_studio','content_strategy','caption_rewrite','hashtag_research')),
      model_name TEXT NOT NULL,
      credits_used INTEGER NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS ai_content_suggestions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      topic TEXT NOT NULL,
      keywords_json TEXT NOT NULL DEFAULT '[]',
      objective TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT '',
      headline TEXT NOT NULL,
      headline_options_json TEXT NOT NULL DEFAULT '[]',
      post_copy TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT NOT NULL DEFAULT '',
      best_time_note TEXT NOT NULL DEFAULT '',
      variants_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'generated' CHECK(status IN ('generated','edited','saved_to_calendar')),
      saved_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ws ON ai_content_suggestions(workspace_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- PHASE 2: SOCIAL MEDIA AUTHENTICATION & INTEGRATION ENGINE TABLES
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      reconnect_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      encrypted_code_verifier TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','awaiting_selection','completed','expired','failed')),
      discovery_session_id TEXT UNIQUE,
      encrypted_pending_tokens TEXT,
      discovered_accounts_json TEXT,
      granted_scopes TEXT,
      error_message TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_states_ws ON oauth_states(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_oauth_states_discovery ON oauth_states(discovery_session_id);

    CREATE TABLE IF NOT EXISTS oauth_connection_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'info' CHECK(status IN ('info','success','warning','error')),
      message TEXT NOT NULL,
      error_code TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_conn_logs_ws ON oauth_connection_logs(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_oauth_conn_logs_plat ON oauth_connection_logs(platform_key, created_at DESC);

    CREATE TABLE IF NOT EXISTS platform_permissions (
      id TEXT PRIMARY KEY,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key) ON DELETE CASCADE,
      scope_key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_required INTEGER NOT NULL DEFAULT 1,
      requires_app_review INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK(approval_status IN ('not_submitted','pending_review','approved','action_required')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(platform_key, scope_key)
    );

    CREATE TABLE IF NOT EXISTS platform_capabilities (
      platform_key TEXT PRIMARY KEY REFERENCES social_platforms(key) ON DELETE CASCADE,
      text_publishing INTEGER NOT NULL DEFAULT 0,
      image_publishing INTEGER NOT NULL DEFAULT 0,
      video_publishing INTEGER NOT NULL DEFAULT 0,
      carousel_publishing INTEGER NOT NULL DEFAULT 0,
      story_publishing INTEGER NOT NULL DEFAULT 0,
      reels_publishing INTEGER NOT NULL DEFAULT 0,
      short_form_video_publishing INTEGER NOT NULL DEFAULT 0,
      comment_retrieval INTEGER NOT NULL DEFAULT 0,
      comment_responses INTEGER NOT NULL DEFAULT 0,
      analytics_retrieval INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_sync_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
      platform_key TEXT NOT NULL,
      sync_type TEXT NOT NULL DEFAULT 'full' CHECK(sync_type IN ('profile','content','insights','comments','full')),
      status TEXT NOT NULL DEFAULT 'succeeded' CHECK(status IN ('succeeded','partial','rate_limited','failed')),
      items_synced INTEGER NOT NULL DEFAULT 0,
      rate_limit_remaining INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON platform_sync_logs(social_account_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS platform_webhook_events (
      id TEXT PRIMARY KEY,
      platform_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      delivery_id TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL DEFAULT '{}',
      processed_status TEXT NOT NULL DEFAULT 'received' CHECK(processed_status IN ('received','processed','ignored','failed')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_events_plat ON platform_webhook_events(platform_key, created_at DESC);

    -- PHASE 3: AI CONTENT STUDIO, STRATEGY, GRAPHIC DESIGNER, CALENDAR, AUTO PUBLISHER & ENGAGEMENT TABLES
    CREATE TABLE IF NOT EXISTS ai_brand_analyses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      brand_summary TEXT NOT NULL,
      verified_facts_json TEXT NOT NULL DEFAULT '[]',
      assumptions_json TEXT NOT NULL DEFAULT '[]',
      audience_insights_json TEXT NOT NULL DEFAULT '{}',
      content_themes_json TEXT NOT NULL DEFAULT '[]',
      voice_guidelines_json TEXT NOT NULL DEFAULT '[]',
      connected_sources_json TEXT NOT NULL DEFAULT '[]',
      uploaded_sources_json TEXT NOT NULL DEFAULT '[]',
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_brand_analyses_ws ON ai_brand_analyses(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_content_strategies (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      goals TEXT NOT NULL DEFAULT '',
      platforms_json TEXT NOT NULL DEFAULT '[]',
      executive_summary TEXT NOT NULL,
      pillars_json TEXT NOT NULL DEFAULT '[]',
      weekly_cadence_json TEXT NOT NULL DEFAULT '[]',
      kpis_json TEXT NOT NULL DEFAULT '[]',
      evidence_note TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_strategies_ws ON ai_content_strategies(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS content_campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      objective TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      color_hex TEXT NOT NULL DEFAULT '#0052FF',
      platforms_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','paused','completed','archived')),
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_ws ON content_campaigns(workspace_id, status);

    CREATE TABLE IF NOT EXISTS generated_content (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      content_type TEXT NOT NULL DEFAULT 'social_post',
      objective TEXT NOT NULL DEFAULT '',
      target_audience TEXT NOT NULL DEFAULT '',
      tone_of_voice TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'en',
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      caption_text TEXT NOT NULL DEFAULT '',
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      call_to_action TEXT NOT NULL DEFAULT '',
      image_prompt TEXT NOT NULL DEFAULT '',
      video_script_json TEXT NOT NULL DEFAULT '{}',
      repurposed_variants_json TEXT NOT NULL DEFAULT '[]',
      safety_status TEXT NOT NULL DEFAULT 'passed' CHECK(safety_status IN ('passed','flagged','blocked')),
      safety_notes_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','queued','published','archived')),
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_content_ws ON generated_content(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS generated_images (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      media_asset_id TEXT REFERENCES media_library(id) ON DELETE SET NULL,
      graphic_type TEXT NOT NULL DEFAULT 'promotional_flyer',
      platform_key TEXT NOT NULL DEFAULT 'instagram',
      aspect_ratio TEXT NOT NULL DEFAULT '1:1',
      width_px INTEGER NOT NULL DEFAULT 1080,
      height_px INTEGER NOT NULL DEFAULT 1080,
      prompt TEXT NOT NULL,
      art_direction_json TEXT NOT NULL DEFAULT '{}',
      caption_text TEXT NOT NULL DEFAULT '',
      source_mode TEXT NOT NULL DEFAULT 'compositor' CHECK(source_mode IN ('ai_service','compositor','uploaded')),
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','generated','failed')),
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generated_images_ws ON generated_images(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS content_calendar (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE CASCADE,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      media_urls_json TEXT NOT NULL DEFAULT '[]',
      format_key TEXT NOT NULL DEFAULT 'text',
      scheduled_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK(recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
      recurrence_rule_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_content_calendar_ws_date ON content_calendar(workspace_id, scheduled_at ASC);

    CREATE TABLE IF NOT EXISTS publishing_queue (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      calendar_item_id TEXT REFERENCES content_calendar(id) ON DELETE SET NULL,
      content_post_id TEXT REFERENCES content_posts(id) ON DELETE SET NULL,
      generated_content_id TEXT REFERENCES generated_content(id) ON DELETE SET NULL,
      campaign_id TEXT REFERENCES content_campaigns(id) ON DELETE SET NULL,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      format_key TEXT NOT NULL DEFAULT 'text',
      title TEXT NOT NULL,
      body_text TEXT NOT NULL,
      hashtags_json TEXT NOT NULL DEFAULT '[]',
      media_urls_json TEXT NOT NULL DEFAULT '[]',
      link_url TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
      publishing_mode TEXT NOT NULL DEFAULT 'automatic' CHECK(publishing_mode IN ('automatic','approval_required')),
      requires_approval INTEGER NOT NULL DEFAULT 0,
      approved_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      approved_at TEXT,
      scheduled_at TEXT NOT NULL,
      next_run_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK(recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
      recurrence_rule_json TEXT NOT NULL DEFAULT '{}',
      idempotency_key TEXT NOT NULL UNIQUE,
      content_hash TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 4,
      is_dead_letter INTEGER NOT NULL DEFAULT 0,
      last_error_permanent INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      locked_by TEXT,
      locked_until TEXT,
      platform_post_id TEXT,
      platform_permalink TEXT,
      platform_response_json TEXT,
      published_at TEXT,
      created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pub_queue_ws_status ON publishing_queue(workspace_id, status, next_run_at ASC);
    CREATE INDEX IF NOT EXISTS idx_pub_queue_due ON publishing_queue(status, next_run_at ASC);
    CREATE INDEX IF NOT EXISTS idx_pub_queue_hash ON publishing_queue(workspace_id, social_account_id, content_hash);

    CREATE TABLE IF NOT EXISTS publishing_attempts (
      id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      worker_id TEXT NOT NULL DEFAULT 'embedded-worker',
      status TEXT NOT NULL CHECK(status IN ('started','succeeded','retrying','failed_permanent','rate_limited','token_expired')),
      http_status INTEGER,
      error_code TEXT,
      error_message TEXT,
      retry_delay_ms INTEGER,
      platform_post_id TEXT,
      api_response_json TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pub_attempts_queue ON publishing_attempts(queue_id, attempt_number DESC);
    CREATE INDEX IF NOT EXISTS idx_pub_attempts_ws ON publishing_attempts(workspace_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS content_approvals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      queue_id TEXT NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
      requested_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','approved','rejected','changes_requested')),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_approvals_ws ON content_approvals(workspace_id, decision, created_at DESC);

    CREATE TABLE IF NOT EXISTS engagement_messages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
      platform_key TEXT NOT NULL REFERENCES social_platforms(key),
      external_message_id TEXT,
      external_post_id TEXT,
      message_type TEXT NOT NULL DEFAULT 'comment' CHECK(message_type IN ('comment','direct_message','mention','review')),
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      content TEXT NOT NULL,
      sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK(sentiment IN ('positive','neutral','negative','urgent')),
      requires_escalation INTEGER NOT NULL DEFAULT 0,
      escalation_reason TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','escalated','replied','archived')),
      sent_reply_text TEXT,
      replied_by_mode TEXT CHECK(replied_by_mode IN ('manual','ai_approved','ai_auto')),
      replied_at TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eng_messages_ws ON engagement_messages(workspace_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_reply_suggestions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      engagement_message_id TEXT NOT NULL REFERENCES engagement_messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      suggested_reply TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'Helpful & Professional',
      confidence_note TEXT NOT NULL DEFAULT '',
      escalation_recommended INTEGER NOT NULL DEFAULT 0,
      escalation_reason TEXT,
      safety_passed INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'suggested' CHECK(status IN ('suggested','approved','sent','dismissed')),
      model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_replies_msg ON ai_reply_suggestions(engagement_message_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_generation_usage (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      model_name TEXT NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 0,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','failed')),
      error_message TEXT,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_gen_usage_ws ON ai_generation_usage(workspace_id, created_at DESC);
  `);

  // Non-destructive upgrade of existing social_platforms CHECK constraint if Phase 1 DB only allowed 6 keys
  const spSchemaRow = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'social_platforms'")
    .get() as { sql?: string } | undefined;
  if (spSchemaRow?.sql && !spSchemaRow.sql.includes('google_business')) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE social_platforms_v2 (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE CHECK(key IN ('facebook','instagram','tiktok','linkedin','youtube','x','pinterest','google_business')),
          display_name TEXT NOT NULL,
          oauth_authorize_url TEXT NOT NULL,
          oauth_token_url TEXT NOT NULL,
          scopes TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO social_platforms_v2 (id, key, display_name, oauth_authorize_url, oauth_token_url, scopes, is_enabled, created_at, updated_at)
        SELECT id, key, display_name, oauth_authorize_url, oauth_token_url, scopes, is_enabled, created_at, updated_at FROM social_platforms;
        DROP TABLE social_platforms;
        ALTER TABLE social_platforms_v2 RENAME TO social_platforms;
      `);
    })();
    db.pragma('foreign_keys = ON');
  }

  // Non-destructive column upgrades for existing local SQLite databases
  const ensureColumn = (table: string, column: string, definition: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };
  ensureColumn('social_accounts', 'connected_by_user_id', 'TEXT REFERENCES users(id) ON DELETE SET NULL');
  ensureColumn('social_accounts', 'account_type', "TEXT NOT NULL DEFAULT 'profile'");
  ensureColumn('social_accounts', 'account_description', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('social_accounts', 'business_category', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('social_accounts', 'followers_count', 'INTEGER');
  ensureColumn('social_accounts', 'permissions_status', "TEXT NOT NULL DEFAULT 'granted'");
  ensureColumn('social_accounts', 'granted_scopes', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('social_accounts', 'capabilities_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn('social_accounts', 'publishing_preferences_json', `TEXT NOT NULL DEFAULT '${JSON.stringify(DEFAULT_PUBLISHING_PREFERENCES)}'`);
  ensureColumn('social_accounts', 'last_error', 'TEXT');

  ensureColumn('social_account_tokens', 'connected_by_user_id', 'TEXT REFERENCES users(id) ON DELETE SET NULL');
  ensureColumn('social_account_tokens', 'refresh_expires_at', 'TEXT');
  ensureColumn('social_account_tokens', 'revoked_at', 'TEXT');
  ensureColumn('social_account_tokens', 'last_refreshed_at', 'TEXT');

  ensureColumn('social_platforms', 'client_id_override', 'TEXT');
  ensureColumn('social_platforms', 'client_secret_override', 'TEXT');
  ensureColumn('social_platforms', 'app_status', "TEXT NOT NULL DEFAULT 'missing_credentials'");
  ensureColumn('social_platforms', 'developer_review_status', "TEXT NOT NULL DEFAULT 'not_submitted'");
  ensureColumn('social_platforms', 'rate_limit_rpm', 'INTEGER NOT NULL DEFAULT 120');
  ensureColumn('social_platforms', 'last_health_check_at', 'TEXT');
  ensureColumn('social_platforms', 'last_api_error', 'TEXT');

  // Phase 3 Brand Intelligence & Content Safety Columns on brand_profiles
  ensureColumn('brand_profiles', 'products_services', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('brand_profiles', 'business_goals', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('brand_profiles', 'banned_words_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn('brand_profiles', 'brand_tone_rules', "TEXT NOT NULL DEFAULT ''");
  ensureColumn('brand_profiles', 'max_posts_per_day', 'INTEGER NOT NULL DEFAULT 10');
  ensureColumn('brand_profiles', 'auto_reply_enabled', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('brand_profiles', 'brand_documents_json', "TEXT NOT NULL DEFAULT '[]'");

  seedReferenceData(db);
  return db;
}

function seedReferenceData(db: DbInstance) {
  const now = new Date().toISOString();

  // 1. Roles
  const roleSeeds = [
    ['customer', 'Customer', 'Standard multi-tenant workspace owner'],
    ['workspace_admin', 'Workspace Admin', 'Manages brand settings, billing, and team members'],
    ['editor', 'Content Editor', 'Creates and schedules posts and media assets'],
    ['viewer', 'Analyst Viewer', 'Read-only access to calendar and analytics'],
    ['super_admin', 'Super Administrator', 'Full platform administration and governance'],
  ];
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (id, slug, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const [slug, name, desc] of roleSeeds) {
    insertRole.run(crypto.randomUUID(), slug, name, desc, now, now);
  }

  // 2. Official Social Platforms, Permissions & Capability Registry (all 8 platforms — ZERO fake connections!)
  const insertPlatform = db.prepare(`
    INSERT OR IGNORE INTO social_platforms (
      id, key, display_name, oauth_authorize_url, oauth_token_url, scopes,
      is_enabled, developer_review_status, rate_limit_rpm, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);
  const insertPermission = db.prepare(`
    INSERT OR IGNORE INTO platform_permissions (
      id, platform_key, scope_key, label, description, is_required, requires_app_review, approval_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertCapabilities = db.prepare(`
    INSERT INTO platform_capabilities (
      platform_key, text_publishing, image_publishing, video_publishing, carousel_publishing,
      story_publishing, reels_publishing, short_form_video_publishing,
      comment_retrieval, comment_responses, analytics_retrieval, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform_key) DO UPDATE SET
      text_publishing = excluded.text_publishing,
      image_publishing = excluded.image_publishing,
      video_publishing = excluded.video_publishing,
      carousel_publishing = excluded.carousel_publishing,
      story_publishing = excluded.story_publishing,
      reels_publishing = excluded.reels_publishing,
      short_form_video_publishing = excluded.short_form_video_publishing,
      comment_retrieval = excluded.comment_retrieval,
      comment_responses = excluded.comment_responses,
      analytics_retrieval = excluded.analytics_retrieval,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  for (const provider of SOCIAL_PROVIDER_LIST) {
    const scopeStr = provider.permissions.map((p) => p.scopeKey).join(',');
    insertPlatform.run(
      crypto.randomUUID(),
      provider.key,
      provider.displayName,
      provider.oauthAuthorizeUrl,
      provider.oauthTokenUrl,
      scopeStr,
      provider.defaultReviewStatus,
      provider.defaultRateLimitRpm,
      now,
      now
    );

    for (const perm of provider.permissions) {
      insertPermission.run(
        crypto.randomUUID(),
        provider.key,
        perm.scopeKey,
        perm.label,
        perm.description,
        perm.isRequired ? 1 : 0,
        perm.requiresAppReview ? 1 : 0,
        perm.approvalStatus,
        now,
        now
      );
    }

    const c = provider.capabilities;
    upsertCapabilities.run(
      provider.key,
      c.textPublishing ? 1 : 0,
      c.imagePublishing ? 1 : 0,
      c.videoPublishing ? 1 : 0,
      c.carouselPublishing ? 1 : 0,
      c.storyPublishing ? 1 : 0,
      c.reelsPublishing ? 1 : 0,
      c.shortFormVideoPublishing ? 1 : 0,
      c.commentRetrieval ? 1 : 0,
      c.commentResponses ? 1 : 0,
      c.analyticsRetrieval ? 1 : 0,
      c.notes || '',
      now
    );
  }

  // 3. Subscription Plans (aligned 1:1 with src/utils/planEntitlements.ts)
  const plans = [
    [
      'basic',
      'Basic',
      'Essential brand publishing & AI content creation for solo founders',
      2900,
      29000,
      1,
      5,
      1,
      250,
      [
        '1 Brand Workspace · Up to 5 Social Accounts',
        '250 Monthly AI Studio Credits',
        'Social Accounts & Official OAuth Connection',
        'AI Content Studio (Posts, Repurpose, Captions & Hashtags)',
        'Content Calendar & Media Library',
      ],
    ],
    [
      'pro',
      'Pro',
      'Full creative, automation, engagement & analytics suite for growing teams',
      7900,
      79000,
      5,
      20,
      10,
      2000,
      [
        'Up to 5 Brand Workspaces · Up to 20 Social Accounts',
        '2,000 Monthly AI Credits · Up to 10 Team Seats',
        'Everything in Basic Plan included',
        'AI Graphic Designer & Auto Publisher Queue',
        'Publishing History, Engagement Manager, Live Analytics & Team RBAC',
      ],
    ],
    [
      'enterprise',
      'Enterprise',
      'Complete agency intelligence, AI Brand Strategy & multi-brand governance',
      29900,
      299000,
      50,
      250,
      35,
      15000,
      [
        'Up to 50 Brand Workspaces · Up to 250 Social Accounts',
        '15,000 Monthly AI Credits · Up to 35 Team Seats',
        'Everything in Pro Plan included',
        'AI Brand Strategy & Executive Audience Intelligence',
        'Multi-Brand Governance, Compliance Audit Logs & Priority Support',
      ],
    ],
  ] as const;

  // Ensure existing databases with legacy CHECK(code IN ('starter','growth','agency','enterprise'))
  // are safely migrated to allow 'basic' and 'pro' without losing user data.
  const planTableMeta = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'subscription_plans'")
    .get() as { sql: string } | undefined;
  if (planTableMeta && !planTableMeta.sql.includes("'basic'")) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE subscription_plans_v2 (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE CHECK(code IN ('basic','pro','enterprise','starter','growth','agency')),
          name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          monthly_price_cents INTEGER NOT NULL,
          annual_price_cents INTEGER NOT NULL,
          max_workspaces INTEGER NOT NULL,
          max_social_accounts INTEGER NOT NULL,
          max_team_members INTEGER NOT NULL,
          monthly_ai_credits INTEGER NOT NULL,
          features_json TEXT NOT NULL DEFAULT '[]',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO subscription_plans_v2 SELECT * FROM subscription_plans;
        DROP TABLE subscription_plans;
        ALTER TABLE subscription_plans_v2 RENAME TO subscription_plans;
      `);
    })();
    db.pragma('foreign_keys = ON');
  }

  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (
      id, code, name, tagline, monthly_price_cents, annual_price_cents,
      max_workspaces, max_social_accounts, max_team_members, monthly_ai_credits,
      features_json, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const updatePlan = db.prepare(`
    UPDATE subscription_plans
    SET name = ?, tagline = ?, monthly_price_cents = ?, annual_price_cents = ?,
        max_workspaces = ?, max_social_accounts = ?, max_team_members = ?,
        monthly_ai_credits = ?, features_json = ?, is_active = 1, updated_at = ?
    WHERE code = ?
  `);
  for (const p of plans) {
    insertPlan.run(
      crypto.randomUUID(),
      p[0],
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      p[7],
      p[8],
      JSON.stringify(p[9]),
      now,
      now
    );
    updatePlan.run(
      p[1],
      p[2],
      p[3],
      p[4],
      p[5],
      p[6],
      p[7],
      p[8],
      JSON.stringify(p[9]),
      now,
      p[0]
    );
  }

  // Migrate any existing subscriptions referencing legacy starter/growth/agency codes to basic/pro
  const basicPlanRow = db.prepare("SELECT id FROM subscription_plans WHERE code = 'basic'").get() as { id: string } | undefined;
  const proPlanRow = db.prepare("SELECT id FROM subscription_plans WHERE code = 'pro'").get() as { id: string } | undefined;
  if (basicPlanRow && proPlanRow) {
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, updated_at = ?
      WHERE plan_id IN (SELECT id FROM subscription_plans WHERE code = 'starter')
    `).run(basicPlanRow.id, now);
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?, updated_at = ?
      WHERE plan_id IN (SELECT id FROM subscription_plans WHERE code IN ('growth', 'agency'))
    `).run(proPlanRow.id, now);
    db.prepare(`
      UPDATE subscription_plans
      SET is_active = 0, updated_at = ?
      WHERE code IN ('starter', 'growth', 'agency') AND is_active = 1
    `).run(now);
  }

  // 4. System Settings
  const settings = [
    ['allow_new_registrations', 'true', 'Allow self-service customer registrations via email and OAuth'],
    ['require_email_verification', 'true', 'Require email verification before production auto-publishing'],
    ['default_trial_ai_credits', '0', 'Initial AI credits allocated before subscribing to a package'],
    ['max_publishing_retries', '3', 'Automatic retry threshold before marking a publishing job as failed'],
    ['maintenance_mode', 'false', 'Temporarily restrict non-admin write operations during maintenance'],
    ['app_name', 'LIVINGTECH BRAND AGENCY', 'Global application name displayed in headers and titles'],
    ['app_tagline', 'Enterprise Multi-Tenant Social Media & Brand Management SaaS', 'Global application subtitle / tagline'],
    ['app_logo_url', '/assets/aistudio/20261112_184805_8a13799e.jpg', 'Global application logo image URL'],
    ['app_footer_text', '© 2026 LIVINGTECH BRAND AGENCY. All rights reserved.', 'Global footer copyright text'],
    ['app_welcome_message', 'Welcome back to your enterprise command center.', 'Welcome message on dashboard'],
    ['app_font_color', '#ffffff', 'Global application font color (default pure white)'],
  ];
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, description, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  for (const [k, v, desc] of settings) {
    insertSetting.run(k, v, desc, now);
  }

  // 5. Seed ONLY the clean Super-Admin account & workspace if users table is empty (ZERO demo accounts or sample data)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    seedInitialAccounts(db, now);
  }

  // 6. One-time migration: purge all legacy seeded demo accounts, sample posts, sample media, and demo analytics/inbox items
  const demoPurged = db
    .prepare("SELECT value FROM system_settings WHERE key = 'clean_slate_demo_purge_v1'")
    .get() as { value: string } | undefined;
  if (!demoPurged) {
    db.transaction(() => {
      // Remove legacy seeded demo customer account & its entire isolated org/workspace tree
      const demoUser = db
        .prepare("SELECT id FROM users WHERE email = 'client@auroraventures.io'")
        .get() as { id: string } | undefined;
      if (demoUser) {
        const demoWorkspaces = db
          .prepare('SELECT id FROM workspaces WHERE owner_user_id = ?')
          .all(demoUser.id) as { id: string }[];
        for (const ws of demoWorkspaces) {
          db.prepare('DELETE FROM workspaces WHERE id = ?').run(ws.id);
        }
        db.prepare('DELETE FROM organisations WHERE owner_user_id = ?').run(demoUser.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(demoUser.id);
      }

      // Remove any demo-flagged analytics & engagement rows
      db.prepare('DELETE FROM analytics_snapshots WHERE is_demo = 1').run();
      db.prepare('DELETE FROM engagement_items WHERE is_demo = 1').run();
      db.prepare('DELETE FROM engagement_messages WHERE is_demo = 1').run();

      // Remove legacy seeded sample posts, jobs, media, and notifications from the HQ workspace
      db.prepare(`
        DELETE FROM content_posts
        WHERE title IN (
          'Q4 Enterprise Brand Positioning Launch',
          'Visual Identity System Spotlight',
          'Executive Thread: AI-Assisted Content Velocity'
        )
      `).run();
      db.prepare(`
        DELETE FROM media_library
        WHERE file_name = 'livingtech-primary-logo.jpg' AND folder = 'Brand Kit'
      `).run();
      db.prepare(`
        DELETE FROM notifications
        WHERE title IN ('Workspace Provisioned', 'Connect Official Social Channels')
      `).run();

      db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, description, updated_at)
        VALUES ('clean_slate_demo_purge_v1', 'true', 'One-time purge of legacy demo accounts and sample data', ?)
      `).run(now);
    })();
  }
}

function seedInitialAccounts(db: DbInstance, now: string) {
  const enterprisePlan = db.prepare("SELECT id FROM subscription_plans WHERE code = 'enterprise'").get() as { id: string };

  // Super Admin Account only (clean workspace with zero demo posts, media, or accounts)
  const adminId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, auth_provider, email, password_hash, full_name, role_slug, email_verified, status, timezone, preferred_language, created_at, updated_at)
    VALUES (?, 'password', 'livingstoneedu64@gmail.com', ?, 'Livingstone Edu', 'super_admin', 1, 'active', 'UTC', 'en', ?, ?)
  `).run(adminId, hashPassword('Admin@LivingTech2026'), now, now);

  const adminOrgId = crypto.randomUUID();
  const adminWsId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO organisations (id, owner_user_id, name, slug, billing_email, created_at, updated_at)
    VALUES (?, ?, 'LivingTech Brand Agency HQ', 'livingtech-hq', 'livingstoneedu64@gmail.com', ?, ?)
  `).run(adminOrgId, adminId, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, organisation_id, owner_user_id, name, slug, timezone, preferred_language, ai_credits_balance, created_at, updated_at)
    VALUES (?, ?, ?, 'LivingTech Global Brand', 'livingtech-global', 'UTC', 'en', 15000, ?, ?)
  `).run(adminWsId, adminOrgId, adminId, now, now);

  db.prepare(`
    INSERT INTO brand_profiles (
      id, workspace_id, brand_name, logo_url, primary_color, secondary_color, accent_color,
      business_description, industry, target_audience, tone_of_voice, preferred_language, timezone, created_at, updated_at
    ) VALUES (?, ?, 'LIVINGTECH BRAND AGENCY', '/assets/aistudio/20261112_184805_8a13799e.jpg', '#0052FF', '#071436', '#F59E0B',
      'International brand strategy, digital identity, and automated multi-channel social media growth agency.',
      'Digital Marketing & Brand Agency', 'Enterprise founders, CMOs, and high-growth B2B technology companies',
      'Executive, forward-looking, and authoritative', 'en', 'UTC', ?, ?)
  `).run(crypto.randomUUID(), adminWsId, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, invited_email, role_slug, status, invited_by, created_at, updated_at)
    VALUES (?, ?, ?, 'livingstoneedu64@gmail.com', 'workspace_admin', 'active', ?, ?, ?)
  `).run(crypto.randomUUID(), adminWsId, adminId, adminId, now, now);

  const periodEnd = new Date(Date.now() + 365 * 86400 * 1000).toISOString();
  db.prepare(`
    INSERT INTO subscriptions (id, organisation_id, workspace_id, plan_id, status, billing_cycle, current_period_start, current_period_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', 'annual', ?, ?, ?, ?)
  `).run(crypto.randomUUID(), adminOrgId, adminWsId, enterprisePlan.id, now, periodEnd, now, now);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, actor_email, workspace_id, action, resource_type, resource_id, metadata_json, created_at, updated_at)
    VALUES (?, ?, 'livingstoneedu64@gmail.com', ?, 'system.bootstrap', 'database', 'production', '{"cleanSlate":true}', ?, ?)
  `).run(crypto.randomUUID(), adminId, adminWsId, now, now);

  logger.info('Initialized clean LIVINGTECH BRAND AGENCY super-admin workspace (zero demo data)');
}

let singletonDb: DbInstance | null = null;
export function getDb(): DbInstance {
  if (!singletonDb) {
    singletonDb = initDatabase();
  }
  return singletonDb;
}
