-- Migration: Expand customers table with address and billing fields
-- Run this in Supabase SQL Editor

-- Add physical address fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add billing address fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_zip TEXT;

-- Add notes field
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at timestamp
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customers_slug ON customers(slug);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON customers(organization_id);
