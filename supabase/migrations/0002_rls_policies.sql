-- =============================================================================
-- LIVINGTECH BRAND AGENCY — Row Level Security (RLS) Policies
-- Migration: 0002_rls_policies.sql
-- Enforces strict multi-tenant isolation & server-only token protection.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role_slug = 'super_admin'
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.users u ON u.id = w.owner_user_id
    WHERE w.id = ws_id AND u.auth_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ws_id
      AND u.auth_user_id = auth.uid()
      AND wm.status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS across all tenant and user tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: strictly self or super_admin
CREATE POLICY users_select_self_or_admin ON public.users
  FOR SELECT USING (auth_user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid() AND role_slug = (SELECT role_slug FROM public.users WHERE auth_user_id = auth.uid()));

-- Workspaces: strictly member or super_admin
CREATE POLICY workspaces_tenant_isolation ON public.workspaces
  FOR ALL USING (public.is_workspace_member(id) OR public.is_super_admin());

-- Tenant-scoped tables: strictly workspace members or super_admin
CREATE POLICY brand_profiles_tenant ON public.brand_profiles
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY workspace_members_tenant ON public.workspace_members
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY social_accounts_tenant ON public.social_accounts
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

-- CRITICAL: social_account_tokens is NEVER accessible from browser/anon/authenticated client roles.
-- Only service_role on the backend server may read/write encrypted tokens.
CREATE POLICY social_account_tokens_deny_client ON public.social_account_tokens
  FOR ALL USING (FALSE);

CREATE POLICY content_posts_tenant ON public.content_posts
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY content_variants_tenant ON public.content_variants
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY content_assets_tenant ON public.content_assets
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY media_library_tenant ON public.media_library
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY publishing_schedules_tenant ON public.publishing_schedules
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY publishing_jobs_tenant ON public.publishing_jobs
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY publishing_logs_tenant ON public.publishing_logs
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY analytics_snapshots_tenant ON public.analytics_snapshots
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY notifications_tenant ON public.notifications
  FOR ALL USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY subscriptions_tenant ON public.subscriptions
  FOR SELECT USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY ai_usage_tenant ON public.ai_usage
  FOR SELECT USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE POLICY audit_logs_admin_or_actor ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR
    actor_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
