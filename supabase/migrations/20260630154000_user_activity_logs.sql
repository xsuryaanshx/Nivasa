-- Migration: User Activity Logs Table
-- Allows logging user actions such as logins, logouts, and CRUD operations on properties, tenants, etc.

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Landlords/Users can insert their own activity logs
DROP POLICY IF EXISTS "Allow authenticated insert of own activity logs" ON public.user_activity_logs;
CREATE POLICY "Allow authenticated insert of own activity logs" ON public.user_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Landlords/Users can view their own activity logs
DROP POLICY IF EXISTS "Allow authenticated select of own activity logs" ON public.user_activity_logs;
CREATE POLICY "Allow authenticated select of own activity logs" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can query all activity logs
DROP POLICY IF EXISTS "Allow admin all access to activity logs" ON public.user_activity_logs;
CREATE POLICY "Allow admin all access to activity logs" ON public.user_activity_logs
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Performance indices for filters
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON public.user_activity_logs (created_at DESC);
