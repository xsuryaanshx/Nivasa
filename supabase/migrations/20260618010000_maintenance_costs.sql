-- Add cost and category columns to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN cost NUMERIC DEFAULT 0,
ADD COLUMN category TEXT DEFAULT 'maintenance'; -- 'maintenance', 'facility', 'utility', 'other'
