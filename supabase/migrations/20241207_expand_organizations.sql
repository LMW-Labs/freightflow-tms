-- Migration: Expand organizations table with additional business fields
-- Run this in Supabase SQL Editor

-- Add address fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add contact fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email TEXT;

-- Add business identifiers
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mc_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dot_number TEXT;

-- Add billing defaults
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_payment_terms TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invoice_notes TEXT;

-- Add status colors (JSONB for flexible color configuration)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status_colors JSONB DEFAULT '{}'::jsonb;

-- Add updated_at timestamp
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();
