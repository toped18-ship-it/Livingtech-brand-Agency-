-- ============================================================================
-- LIVINGTECH BRAND AGENCY - Migration 0003:
-- AI Content Suggestions persistence + OAuth user association
-- ============================================================================

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS connected_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.social_account_tokens
  ADD COLUMN IF NOT EXISTS connected_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ai_content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_key TEXT NOT NULL REFERENCES public.social_platforms(key),
  topic TEXT NOT NULL,
  keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  objective TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL,
  headline_options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  post_copy TEXT NOT NULL,
  hashtags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  call_to_action TEXT NOT NULL DEFAULT '',
  best_time_note TEXT NOT NULL DEFAULT '',
  variants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'edited', 'saved_to_calendar')),
  saved_post_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_content_suggestions_workspace
  ON public.ai_content_suggestions (workspace_id, updated_at DESC);

ALTER TABLE public.ai_content_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members access own ai_content_suggestions" ON public.ai_content_suggestions;
CREATE POLICY "Workspace members access own ai_content_suggestions"
  ON public.ai_content_suggestions
  FOR ALL
  USING (public.is_workspace_member(workspace_id) OR public.is_super_admin())
  WITH CHECK (public.is_workspace_member(workspace_id) OR public.is_super_admin());
