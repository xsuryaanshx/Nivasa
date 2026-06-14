-- Add document_url to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS document_url text;
