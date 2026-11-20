-- LIVINGTECH BRAND AGENCY
-- Phase 3 Migration: AI Content Studio, Strategy, Graphic Designer, Calendar, Auto-Publishing Engine & Engagement Manager
-- Non-destructive additive migration preserving all Phase 1 & Phase 2 tables and rows.

-- 1. Extend brand_profiles with Brand Intelligence & Content Safety fields
ALTER TABLE public.brand_profiles
  ADD COLUMN IF NOT EXISTS products_services TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_goals TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banned_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_tone_rules TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_posts_per_day INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS brand_documents_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. ai_brand_analyses
CREATE TABLE IF NOT EXISTS public.ai_brand_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand_summary TEXT NOT NULL,
  verified_facts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience_insights_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_themes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_guidelines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_brand_analyses_ws ON public.ai_brand_analyses(workspace_id, created_at DESC);

-- 3. ai_content_strategies
CREATE TABLE IF NOT EXISTS public.ai_content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goals TEXT NOT NULL DEFAULT '',
  platforms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  executive_summary TEXT NOT NULL,
  pillars_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_cadence_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  kpis_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_note TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_strategies_ws ON public.ai_content_strategies(workspace_id, created_at DESC);

-- 4. content_campaigns
CREATE TABLE IF NOT EXISTS public.content_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color_hex TEXT NOT NULL DEFAULT '#0052FF',
  platforms_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','completed','archived')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_ws ON public.content_campaigns(workspace_id, status);

-- 5. generated_content
CREATE TABLE IF NOT EXISTS public.generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.content_campaigns(id) ON DELETE SET NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  content_type TEXT NOT NULL DEFAULT 'social_post',
  objective TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  tone_of_voice TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  caption_text TEXT NOT NULL DEFAULT '',
  hashtags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  call_to_action TEXT NOT NULL DEFAULT '',
  image_prompt TEXT NOT NULL DEFAULT '',
  video_script_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  repurposed_variants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  safety_status TEXT NOT NULL DEFAULT 'passed' CHECK (safety_status IN ('passed','flagged','blocked')),
  safety_notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','queued','published','archived')),
  content_post_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_content_ws ON public.generated_content(workspace_id, created_at DESC);

-- 6. generated_images
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_content_id UUID REFERENCES public.generated_content(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES public.media_library(id) ON DELETE SET NULL,
  graphic_type TEXT NOT NULL DEFAULT 'promotional_flyer',
  platform_key TEXT NOT NULL DEFAULT 'instagram',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  width_px INTEGER NOT NULL DEFAULT 1080,
  height_px INTEGER NOT NULL DEFAULT 1080,
  prompt TEXT NOT NULL,
  art_direction_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  caption_text TEXT NOT NULL DEFAULT '',
  source_mode TEXT NOT NULL DEFAULT 'compositor' CHECK (source_mode IN ('ai_service','compositor','uploaded')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generated','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_generated_images_ws ON public.generated_images(workspace_id, created_at DESC);

-- 7. content_calendar
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_post_id UUID REFERENCES public.content_posts(id) ON DELETE CASCADE,
  generated_content_id UUID REFERENCES public.generated_content(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.content_campaigns(id) ON DELETE SET NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  hashtags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  format_key TEXT NOT NULL DEFAULT 'text',
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
  recurrence_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
  created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_calendar_ws_date ON public.content_calendar(workspace_id, scheduled_at ASC);

-- 8. publishing_queue
CREATE TABLE IF NOT EXISTS public.publishing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calendar_item_id UUID REFERENCES public.content_calendar(id) ON DELETE SET NULL,
  content_post_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  generated_content_id UUID REFERENCES public.generated_content(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.content_campaigns(id) ON DELETE SET NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  format_key TEXT NOT NULL DEFAULT 'text',
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  hashtags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_urls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','queued','processing','published','failed','cancelled','awaiting_approval')),
  publishing_mode TEXT NOT NULL DEFAULT 'automatic' CHECK (publishing_mode IN ('automatic','approval_required')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none','daily','weekdays','weekly','monthly','custom')),
  recurrence_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  is_dead_letter BOOLEAN NOT NULL DEFAULT FALSE,
  last_error_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  last_error TEXT,
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_permalink TEXT,
  platform_response_json JSONB,
  published_at TIMESTAMPTZ,
  created_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pub_queue_ws_status ON public.publishing_queue(workspace_id, status, next_run_at ASC);
CREATE INDEX IF NOT EXISTS idx_pub_queue_due ON public.publishing_queue(status, next_run_at ASC);

-- 9. publishing_attempts
CREATE TABLE IF NOT EXISTS public.publishing_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.publishing_queue(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  worker_id TEXT NOT NULL DEFAULT 'worker',
  status TEXT NOT NULL CHECK (status IN ('started','succeeded','retrying','failed_permanent','rate_limited','token_expired')),
  http_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  retry_delay_ms INTEGER,
  platform_post_id TEXT,
  api_response_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pub_attempts_queue ON public.publishing_attempts(queue_id, attempt_number DESC);

-- 10. content_approvals
CREATE TABLE IF NOT EXISTS public.content_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES public.publishing_queue(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected','changes_requested')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_ws ON public.content_approvals(workspace_id, decision, created_at DESC);

-- 11. engagement_messages
CREATE TABLE IF NOT EXISTS public.engagement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  external_message_id TEXT,
  external_post_id TEXT,
  message_type TEXT NOT NULL DEFAULT 'comment' CHECK (message_type IN ('comment','direct_message','mention','review')),
  author_name TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','negative','urgent')),
  requires_escalation BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','escalated','replied','archived')),
  sent_reply_text TEXT,
  replied_by_mode TEXT CHECK (replied_by_mode IN ('manual','ai_approved','ai_auto')),
  replied_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eng_messages_ws ON public.engagement_messages(workspace_id, status, created_at DESC);

-- 12. ai_reply_suggestions
CREATE TABLE IF NOT EXISTS public.ai_reply_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  engagement_message_id UUID NOT NULL REFERENCES public.engagement_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suggested_reply TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'Helpful & Professional',
  confidence_note TEXT NOT NULL DEFAULT '',
  escalation_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_reason TEXT,
  safety_passed BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','approved','sent','dismissed')),
  model_name TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_replies_msg ON public.ai_reply_suggestions(engagement_message_id, created_at DESC);

-- 13. ai_generation_usage
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  model_name TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','failed')),
  error_message TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_gen_usage_ws ON public.ai_generation_usage(workspace_id, created_at DESC);

-- Enable Row-Level Security across all 12 Phase 3 tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_brand_analyses',
    'ai_content_strategies',
    'content_campaigns',
    'generated_content',
    'generated_images',
    'content_calendar',
    'publishing_queue',
    'publishing_attempts',
    'content_approvals',
    'engagement_messages',
    'ai_reply_suggestions',
    'ai_generation_usage'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_workspace_isolation ON public.%I;', tbl, tbl);
    EXECUTE format($pol$
      CREATE POLICY %I_workspace_isolation ON public.%I
      USING (
        EXISTS (
          SELECT 1 FROM public.workspaces w
          WHERE w.id = workspace_id AND w.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.workspace_members m
          WHERE m.workspace_id = %I.workspace_id AND m.user_id = auth.uid() AND m.status = 'active'
        )
      );
    $pol$, tbl, tbl, tbl);
  END LOOP;
END $$;
