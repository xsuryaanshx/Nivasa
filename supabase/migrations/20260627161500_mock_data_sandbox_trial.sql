-- 1. Alter tables to add is_mock indicator
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;

-- 2. Modify handle_new_user_setup function to default to a 7-day trial
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

  -- Get chosen plan from user metadata (defaulting to gold for a premium sandbox trial)
  chosen_plan := lower(coalesce(NEW.raw_user_meta_data ->> 'selected_plan', 'gold'));

  IF chosen_plan = 'platinum' THEN
    target_plan_id := 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f';
  ELSIF chosen_plan = 'gold' THEN
    target_plan_id := 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
  ELSE
    target_plan_id := 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
  END IF;

  -- Insert default subscription with status = 'trial' and a 7-day expiration date
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
    'trial',
    'monthly',
    now(),
    now() + interval '7 days', -- Trial expires in exactly 7 days
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
    jsonb_build_object('plan_id', target_plan_id, 'status', 'trial', 'reason', 'sandbox_signup_trial')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to seed mock/sandbox data for a given user
CREATE OR REPLACE FUNCTION public.seed_mock_data(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  mock_building_id UUID;
  room_101_id UUID;
  room_102_id UUID;
  room_103_id UUID;
  tenant_rahul_id UUID;
  tenant_priya_id UUID;
BEGIN
  -- Prevent double seeding if mock data already exists
  IF EXISTS (SELECT 1 FROM public.buildings WHERE user_id = target_user_id AND is_mock = true) THEN
    RETURN;
  END IF;

  -- A. Insert Building
  INSERT INTO public.buildings (name, address, user_id, upi_id, landlord_name, is_mock)
  VALUES ('Greenwood Heights', 'Sector 62, Noida, UP', target_user_id, 'landlord@upi', 'Nivasa Host', true)
  RETURNING id INTO mock_building_id;

  -- B. Insert Rooms (Units)
  -- Room 101 (Occupied)
  INSERT INTO public.units (building_id, name, rent_amount, status, user_id, rate_per_unit, prev_reading, curr_reading, is_mock)
  VALUES (mock_building_id, 'Room 101', 12000, 'occupied', target_user_id, 8.0, 100, 145, true)
  RETURNING id INTO room_101_id;

  -- Room 102 (Occupied)
  INSERT INTO public.units (building_id, name, rent_amount, status, user_id, rate_per_unit, prev_reading, curr_reading, is_mock)
  VALUES (mock_building_id, 'Room 102', 15000, 'occupied', target_user_id, 8.0, 240, 310, true)
  RETURNING id INTO room_102_id;

  -- Room 103 (Vacant)
  INSERT INTO public.units (building_id, name, rent_amount, status, user_id, rate_per_unit, prev_reading, curr_reading, is_mock)
  VALUES (mock_building_id, 'Room 103', 10000, 'vacant', target_user_id, 8.0, 0, 0, true)
  RETURNING id INTO room_103_id;

  -- C. Insert Tenants
  -- Rahul Sharma
  INSERT INTO public.tenants (name, phone, whatsapp_number, room_id, building_id, joined_at, occupancy_count, user_id, is_mock)
  VALUES ('Rahul Sharma', '+919999999991', '+919999999991', room_101_id, mock_building_id, now() - interval '90 days', 1, target_user_id, true)
  RETURNING id INTO tenant_rahul_id;

  -- Priya Patel
  INSERT INTO public.tenants (name, phone, whatsapp_number, room_id, building_id, joined_at, occupancy_count, user_id, is_mock)
  VALUES ('Priya Patel', '+919999999992', '+919999999992', room_102_id, mock_building_id, now() - interval '60 days', 1, target_user_id, true)
  RETURNING id INTO tenant_priya_id;

  -- D. Insert Payments
  -- Rahul paid rent
  INSERT INTO public.payments (building_id, unit_id, tenant_id, amount, status, method, paid_date, user_id, is_mock)
  VALUES (mock_building_id, room_101_id, tenant_rahul_id, 12000, 'paid', 'upi', now() - interval '4 days', target_user_id, true);

  -- Priya payment is pending
  INSERT INTO public.payments (building_id, unit_id, tenant_id, amount, status, method, paid_date, user_id, is_mock)
  VALUES (mock_building_id, room_102_id, tenant_priya_id, 15000, 'pending', 'cash', NULL, target_user_id, true);

  -- E. Insert Maintenance Requests (Expenses)
  -- Plumbing Repair Expense (resolved)
  INSERT INTO public.maintenance_requests (user_id, property_id, unit_id, title, description, status, priority, cost, category, is_mock)
  VALUES (target_user_id, mock_building_id, room_101_id, 'Leaking Kitchen Tap', 'Kitchen tap is dripping slowly.', 'resolved', 'medium', 1200, 'maintenance', true);

  -- Electrical Upgrade Expense (resolved)
  INSERT INTO public.maintenance_requests (user_id, property_id, unit_id, title, description, status, priority, cost, category, is_mock)
  VALUES (target_user_id, mock_building_id, NULL, 'Common Corridor Tube Lights', 'Installed new LED tube lights in common hallway.', 'resolved', 'low', 850, 'utility', true);

  -- F. Update user usage counters
  PERFORM public.sync_user_usage(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to clear mock/sandbox data for a given user
CREATE OR REPLACE FUNCTION public.clear_mock_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.maintenance_requests WHERE user_id = target_user_id AND is_mock = true;
  DELETE FROM public.payments WHERE user_id = target_user_id AND is_mock = true;
  DELETE FROM public.tenants WHERE user_id = target_user_id AND is_mock = true;
  DELETE FROM public.units WHERE user_id = target_user_id AND is_mock = true;
  DELETE FROM public.buildings WHERE user_id = target_user_id AND is_mock = true;
  
  -- Recalculate usage statistics
  PERFORM public.sync_user_usage(target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
