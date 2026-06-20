CREATE TABLE IF NOT EXISTS public.tenant_trust_scores (
  aadhar text PRIMARY KEY,
  name text,
  score integer NOT NULL DEFAULT 1000,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.trust_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_aadhar text REFERENCES public.tenant_trust_scores(aadhar) ON DELETE CASCADE,
  landlord_id uuid REFERENCES auth.users(id),
  building_id uuid REFERENCES public.buildings(id),
  incident_type text NOT NULL,
  score_change integer NOT NULL,
  description text,
  created_at timestamp with time zone default now()
);

-- Function to update the score and ensure it doesn't go above 1000
CREATE OR REPLACE FUNCTION update_tenant_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the tenant exists in tenant_trust_scores
  INSERT INTO public.tenant_trust_scores (aadhar, score)
  VALUES (NEW.tenant_aadhar, 1000)
  ON CONFLICT (aadhar) DO NOTHING;

  -- Update the score, bounding it to a maximum of 1000
  UPDATE public.tenant_trust_scores
  SET score = LEAST(1000, score + NEW.score_change),
      updated_at = now()
  WHERE aadhar = NEW.tenant_aadhar;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trust_incident_insert ON public.trust_incidents;
CREATE TRIGGER on_trust_incident_insert
AFTER INSERT ON public.trust_incidents
FOR EACH ROW
EXECUTE FUNCTION update_tenant_trust_score();

-- RLS Policies
ALTER TABLE public.tenant_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_incidents ENABLE ROW LEVEL SECURITY;

-- tenant_trust_scores: allow any authenticated user to read
CREATE POLICY "Allow read access to authenticated users" 
ON public.tenant_trust_scores FOR SELECT 
TO authenticated 
USING (true);

-- We need a way for anyone to 'touch' the tenant_trust_scores table if it doesn't exist
CREATE POLICY "Allow insert to authenticated users" 
ON public.tenant_trust_scores FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update to authenticated users" 
ON public.tenant_trust_scores FOR UPDATE
TO authenticated 
USING (true);


-- trust_incidents: allow any authenticated user to read all incidents (network effect)
CREATE POLICY "Allow read access to all incidents" 
ON public.trust_incidents FOR SELECT 
TO authenticated 
USING (true);

-- trust_incidents: allow landlords to insert their own incidents
CREATE POLICY "Allow landlords to insert incidents" 
ON public.trust_incidents FOR INSERT 
TO authenticated 
WITH CHECK (landlord_id = auth.uid());
