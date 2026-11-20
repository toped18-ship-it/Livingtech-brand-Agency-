-- =============================================================================
-- LIVINGTECH BRAND AGENCY — PHASE 2: SOCIAL MEDIA AUTHENTICATION & INTEGRATION ENGINE
-- Non-destructive PostgreSQL / Supabase migration preserving all Phase 1 data.
-- =============================================================================

-- 1. Expand social_platforms to support all 8 official platforms + admin config fields
ALTER TABLE public.social_platforms DROP CONSTRAINT IF EXISTS social_platforms_key_check;
ALTER TABLE public.social_platforms
  ADD CONSTRAINT social_platforms_key_check
  CHECK (key IN ('facebook','instagram','tiktok','linkedin','youtube','x','pinterest','google_business'));

ALTER TABLE public.social_platforms
  ADD COLUMN IF NOT EXISTS client_id_override TEXT,
  ADD COLUMN IF NOT EXISTS app_status TEXT NOT NULL DEFAULT 'missing_credentials',
  ADD COLUMN IF NOT EXISTS developer_review_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS rate_limit_rpm INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_api_error TEXT;

INSERT INTO public.social_platforms (key, display_name, oauth_authorize_url, oauth_token_url, scopes)
VALUES
  ('pinterest', 'Pinterest', 'https://www.pinterest.com/oauth/', 'https://api.pinterest.com/v5/oauth/token', 'user_accounts:read,boards:read,pins:read,pins:write'),
  ('google_business', 'Google Business Profile', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', 'https://www.googleapis.com/auth/business.manage')
ON CONFLICT (key) DO NOTHING;

-- 2. Extend social_accounts and social_account_tokens non-destructively
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'profile',
  ADD COLUMN IF NOT EXISTS account_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_category TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followers_count INTEGER,
  ADD COLUMN IF NOT EXISTS permissions_status TEXT NOT NULL DEFAULT 'granted',
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS capabilities_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS publishing_preferences_json JSONB NOT NULL DEFAULT '{"autoPublishEnabled":true,"requireApprovalBeforePublish":false,"defaultTimezone":"UTC","defaultVisibility":"public","appendDefaultHashtags":false,"defaultHashtags":[],"dailyPostLimit":10}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE public.social_account_tokens
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;

-- 3. Persistent OAuth state & account discovery sessions
CREATE TABLE IF NOT EXISTS public.oauth_states (
  state TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  reconnect_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  encrypted_code_verifier TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting_selection','completed','expired','failed')),
  discovery_session_id UUID UNIQUE,
  encrypted_pending_tokens TEXT,
  discovered_accounts_json JSONB,
  granted_scopes TEXT,
  error_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_ws ON public.oauth_states(workspace_id, created_at DESC);

-- 4. OAuth connection lifecycle logs (ZERO tokens stored)
CREATE TABLE IF NOT EXISTS public.oauth_connection_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  platform_key TEXT NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info' CHECK (status IN ('info','success','warning','error')),
  message TEXT NOT NULL,
  error_code TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_conn_logs_ws ON public.oauth_connection_logs(workspace_id, created_at DESC);

-- 5. Official platform permissions registry
CREATE TABLE IF NOT EXISTS public.platform_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key) ON DELETE CASCADE,
  scope_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  requires_app_review BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (approval_status IN ('not_submitted','pending_review','approved','action_required')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform_key, scope_key)
);

-- 6. Authoritative platform capability registry
CREATE TABLE IF NOT EXISTS public.platform_capabilities (
  platform_key TEXT PRIMARY KEY REFERENCES public.social_platforms(key) ON DELETE CASCADE,
  text_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  image_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  video_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  carousel_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  story_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  reels_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  short_form_video_publishing BOOLEAN NOT NULL DEFAULT FALSE,
  comment_retrieval BOOLEAN NOT NULL DEFAULT FALSE,
  comment_responses BOOLEAN NOT NULL DEFAULT FALSE,
  analytics_retrieval BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Account sync & rate-limit execution logs
CREATE TABLE IF NOT EXISTS public.platform_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'full' CHECK (sync_type IN ('profile','content','insights','comments','full')),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded','partial','rate_limited','failed')),
  items_synced INTEGER NOT NULL DEFAULT 0,
  rate_limit_remaining INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON public.platform_sync_logs(social_account_id, created_at DESC);

-- 8. Platform webhook events
CREATE TABLE IF NOT EXISTS public.platform_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  delivery_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_status TEXT NOT NULL DEFAULT 'received' CHECK (processed_status IN ('received','processed','ignored','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (strict multi-tenant isolation)
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_webhook_events ENABLE ROW LEVEL SECURITY;

-- oauth_states and platform_webhook_events are server-only (service_role bypasses RLS)
DROP POLICY IF EXISTS oauth_logs_workspace_read ON public.oauth_connection_logs;
CREATE POLICY oauth_logs_workspace_read ON public.oauth_connection_logs
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS sync_logs_workspace_read ON public.platform_sync_logs;
CREATE POLICY sync_logs_workspace_read ON public.platform_sync_logs
  FOR SELECT USING (public.is_workspace_member(workspace_id));
