-- Migration: Feature Usage Events Table
-- Allows logging client-side and server-side feature usage for landlord features.

CREATE TABLE IF NOT EXISTS public.feature_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key VARCHAR NOT NULL,
  action VARCHAR,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;

-- Landlords can insert their own events
DROP POLICY IF EXISTS "Allow authenticated insert of own feature events" ON public.feature_usage_events;
CREATE POLICY "Allow authenticated insert of own feature events" ON public.feature_usage_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Landlords can view their own events
DROP POLICY IF EXISTS "Allow authenticated select of own feature events" ON public.feature_usage_events;
CREATE POLICY "Allow authenticated select of own feature events" ON public.feature_usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can query all events (is_admin = true in JWT user_metadata)
DROP POLICY IF EXISTS "Allow admin all access to feature events" ON public.feature_usage_events;
CREATE POLICY "Allow admin all access to feature events" ON public.feature_usage_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Performance indices for filters
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON public.feature_usage_events (user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_key ON public.feature_usage_events (feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_usage_created ON public.feature_usage_events (created_at DESC);
