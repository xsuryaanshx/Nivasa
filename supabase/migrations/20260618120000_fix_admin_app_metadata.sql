-- SECURITY FIX: Migrate admin checks from user_metadata to app_metadata.
-- user_metadata can be set by ANY authenticated user via supabase.auth.updateUser().
-- app_metadata can ONLY be set server-side via the service_role key (admin API).
--
-- To grant admin access, use the Supabase Dashboard or service_role key:
--   await supabaseAdmin.auth.admin.updateUserById(userId, {
--     app_metadata: { is_admin: true }
--   });

-- ── Drop ALL old user_metadata-based admin policies ──────────────────────────

-- Admin read policies (old)
DROP POLICY IF EXISTS "buildings_admin_select" ON public.buildings;
DROP POLICY IF EXISTS "units_admin_select" ON public.units;
DROP POLICY IF EXISTS "tenants_admin_select" ON public.tenants;
DROP POLICY IF EXISTS "payments_admin_select" ON public.payments;

-- Admin write policies (old)
DROP POLICY IF EXISTS "buildings_admin_all" ON public.buildings;
DROP POLICY IF EXISTS "units_admin_all" ON public.units;
DROP POLICY IF EXISTS "tenants_admin_all" ON public.tenants;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;

-- Subscription admin policies (old)
DROP POLICY IF EXISTS "subscriptions_select_user" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_all_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "user_usage_select_user" ON public.user_usage;
DROP POLICY IF EXISTS "user_usage_all_admin" ON public.user_usage;
DROP POLICY IF EXISTS "subscription_events_select_user" ON public.subscription_events;
DROP POLICY IF EXISTS "subscription_events_all_admin" ON public.subscription_events;
DROP POLICY IF EXISTS "feature_overrides_select_user" ON public.feature_overrides;
DROP POLICY IF EXISTS "feature_overrides_all_admin" ON public.feature_overrides;

-- ── Recreate using app_metadata (server-only writable) ───────────────────────

-- Buildings: admin full access
CREATE POLICY "buildings_admin_all" ON public.buildings
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Units: admin full access
CREATE POLICY "units_admin_all" ON public.units
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Tenants: admin full access
CREATE POLICY "tenants_admin_all" ON public.tenants
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Payments: admin full access
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Subscriptions: user can read own, admin can read/write all
CREATE POLICY "subscriptions_select_user" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "subscriptions_all_admin" ON public.subscriptions
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- User Usage: user can read own, admin can read/write all
CREATE POLICY "user_usage_select_user" ON public.user_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "user_usage_all_admin" ON public.user_usage
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Subscription Events: user can read own, admin can read/write all
CREATE POLICY "subscription_events_select_user" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "subscription_events_all_admin" ON public.subscription_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Feature Overrides: user can read own, admin can read/write all
CREATE POLICY "feature_overrides_select_user" ON public.feature_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "feature_overrides_all_admin" ON public.feature_overrides
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
