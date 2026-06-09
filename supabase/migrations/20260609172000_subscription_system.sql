-- 1. Create tables

-- plans
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- plan_features
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key VARCHAR NOT NULL,
  feature_value VARCHAR NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(plan_id, feature_key)
);

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status VARCHAR NOT NULL DEFAULT 'trial',
  billing_cycle VARCHAR NOT NULL DEFAULT 'monthly',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  expiry_date TIMESTAMP WITH TIME ZONE,
  payment_provider VARCHAR NOT NULL DEFAULT 'manual',
  subscription_source VARCHAR NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- user_usage
CREATE TABLE IF NOT EXISTS public.user_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rooms_count INT NOT NULL DEFAULT 0,
  tenants_count INT NOT NULL DEFAULT 0,
  properties_count INT NOT NULL DEFAULT 0,
  staff_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- subscription_events
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id UUID,
  event_type VARCHAR NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- feature_overrides
CREATE TABLE IF NOT EXISTS public.feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key VARCHAR NOT NULL,
  feature_value VARCHAR NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, feature_key)
);

-- 2. Seed default plans and features
INSERT INTO public.plans (id, plan_name, display_name, monthly_price, yearly_price, is_active, sort_order)
VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'silver', 'Silver', 499, 4990, true, 1),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'gold', 'Gold', 899, 8990, true, 2),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'platinum', 'Platinum', 1199, 11990, true, 3)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price;

-- Silver features
INSERT INTO public.plan_features (plan_id, feature_key, feature_value, enabled) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'room_limit', '10', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'tenant_limit', '50', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'rent_management', 'true', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'payment_tracking', 'true', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'basic_analytics', 'true', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'whatsapp_reminders', 'true', true),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'email_support', 'true', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  feature_value = EXCLUDED.feature_value,
  enabled = EXCLUDED.enabled;

-- Gold features
INSERT INTO public.plan_features (plan_id, feature_key, feature_value, enabled) VALUES
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'room_limit', '50', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'tenant_limit', '300', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'rent_management', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'payment_tracking', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'basic_analytics', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'whatsapp_reminders', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'email_support', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'expense_management', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'maintenance_tracking', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'advanced_analytics', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'tenant_notes', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'pdf_exports', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'excel_exports', 'true', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'priority_support', 'true', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  feature_value = EXCLUDED.feature_value,
  enabled = EXCLUDED.enabled;

-- Platinum features
INSERT INTO public.plan_features (plan_id, feature_key, feature_value, enabled) VALUES
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'room_limit', 'unlimited', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'tenant_limit', 'unlimited', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'rent_management', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'payment_tracking', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'basic_analytics', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'whatsapp_reminders', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'email_support', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'expense_management', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'maintenance_tracking', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'advanced_analytics', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'tenant_notes', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'pdf_exports', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'excel_exports', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'priority_support', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'multi_property', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'staff_management', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'advanced_reports', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'automated_reminders', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'custom_branding', 'true', true),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'dedicated_support', 'true', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE SET
  feature_value = EXCLUDED.feature_value,
  enabled = EXCLUDED.enabled;

-- 3. Functions and Triggers for Usage Sync

CREATE OR REPLACE FUNCTION public.sync_user_usage(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_usage (user_id, rooms_count, tenants_count, properties_count, staff_count)
  VALUES (
    target_user_id,
    (SELECT COALESCE(COUNT(*), 0) FROM public.units WHERE user_id = target_user_id),
    (SELECT COALESCE(COUNT(*), 0) FROM public.tenants WHERE user_id = target_user_id AND status != 'vacated'),
    (SELECT COALESCE(COUNT(*), 0) FROM public.buildings WHERE user_id = target_user_id),
    0
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rooms_count = EXCLUDED.rooms_count,
    tenants_count = EXCLUDED.tenants_count,
    properties_count = EXCLUDED.properties_count,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_sync_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM public.sync_user_usage(OLD.user_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM public.sync_user_usage(OLD.user_id);
    END IF;
    IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      PERFORM public.sync_user_usage(NEW.user_id);
    END IF;
  ELSE
    IF NEW.user_id IS NOT NULL THEN
      PERFORM public.sync_user_usage(NEW.user_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER sync_units_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_user_usage();

CREATE OR REPLACE TRIGGER sync_tenants_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_user_usage();

CREATE OR REPLACE TRIGGER sync_buildings_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_user_usage();

-- 4. New User Setup Trigger

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
DECLARE
  silver_plan_id UUID := 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
BEGIN
  -- Insert default user_usage entry
  INSERT INTO public.user_usage (user_id, rooms_count, tenants_count, properties_count, staff_count)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert default Silver trial subscription (14 days)
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    billing_cycle,
    start_date,
    expiry_date,
    payment_provider,
    subscription_source
  ) VALUES (
    NEW.id,
    silver_plan_id,
    'trial',
    'monthly',
    now(),
    now() + interval '14 days',
    'manual',
    'web'
  );

  -- Log the event
  INSERT INTO public.subscription_events (
    user_id,
    subscription_id,
    event_type,
    metadata
  ) VALUES (
    NEW.id,
    NULL,
    'subscription_created',
    jsonb_build_object('plan_id', silver_plan_id, 'status', 'trial', 'reason', 'automatic_signup_trial')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 5. Backfill existing users (if any)
INSERT INTO public.user_usage (user_id, rooms_count, tenants_count, properties_count, staff_count)
SELECT 
  id,
  (SELECT COALESCE(COUNT(*), 0) FROM public.units WHERE user_id = id),
  (SELECT COALESCE(COUNT(*), 0) FROM public.tenants WHERE user_id = id AND status != 'vacated'),
  (SELECT COALESCE(COUNT(*), 0) FROM public.buildings WHERE user_id = id),
  0
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  billing_cycle,
  start_date,
  expiry_date,
  payment_provider,
  subscription_source
)
SELECT 
  id,
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'trial',
  'monthly',
  now(),
  now() + interval '14 days',
  'manual',
  'web'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions);

-- 6. Row Level Security (RLS) Policies

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_overrides ENABLE ROW LEVEL SECURITY;

-- Plans & Features are read-only for authenticated users
CREATE POLICY "plans_select_authenticated" ON public.plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "plan_features_select_authenticated" ON public.plan_features
  FOR SELECT TO authenticated USING (true);

-- Subscriptions RLS
CREATE POLICY "subscriptions_select_user" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "subscriptions_all_admin" ON public.subscriptions
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- User Usage RLS
CREATE POLICY "user_usage_select_user" ON public.user_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "user_usage_all_admin" ON public.user_usage
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Subscription Events RLS
CREATE POLICY "subscription_events_select_user" ON public.subscription_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "subscription_events_all_admin" ON public.subscription_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Feature Overrides RLS
CREATE POLICY "feature_overrides_select_user" ON public.feature_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "feature_overrides_all_admin" ON public.feature_overrides
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
