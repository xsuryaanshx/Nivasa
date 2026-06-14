-- Update new user setup trigger function to respect selected plan
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
DECLARE
  chosen_plan VARCHAR;
  target_plan_id UUID;
BEGIN
  -- Insert default user_usage entry
  INSERT INTO public.user_usage (user_id, rooms_count, tenants_count, properties_count, staff_count)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get chosen plan from user metadata
  chosen_plan := lower(coalesce(NEW.raw_user_meta_data ->> 'selected_plan', 'silver'));

  IF chosen_plan = 'platinum' THEN
    target_plan_id := 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f';
  ELSIF chosen_plan = 'gold' THEN
    target_plan_id := 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
  ELSE
    target_plan_id := 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  END IF;

  -- Insert default active subscription (no trials, active status)
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
    target_plan_id,
    'active',
    'monthly',
    now(),
    NULL, -- No expiry
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
    jsonb_build_object('plan_id', target_plan_id, 'status', 'active', 'reason', 'automatic_signup_selection')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
