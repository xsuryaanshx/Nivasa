-- Create the maintenance_requests table
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on user_id for faster lookups
CREATE INDEX idx_maintenance_requests_user_id ON maintenance_requests(user_id);
-- Add index on property_id
CREATE INDEX idx_maintenance_requests_property_id ON maintenance_requests(property_id);

-- Enable Row Level Security
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policies for landlord access
CREATE POLICY "Landlords can read their own maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Landlords can insert maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Landlords can update their own maintenance requests"
  ON maintenance_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Landlords can delete their own maintenance requests"
  ON maintenance_requests FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER handle_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
