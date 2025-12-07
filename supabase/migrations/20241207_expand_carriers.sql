-- Migration: Expand carriers table with additional fields
-- Run this in Supabase SQL Editor

-- Add address fields
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fax TEXT;

-- Add factoring company fields
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_company TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_contact TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_phone TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_email TEXT;

-- Add W9 information
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_name TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_type TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_city_state_zip TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_tin TEXT;

-- Add remittance information
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_name TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_city TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_state TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_zip TEXT;

-- Add payment fields
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS quickpay_enabled BOOLEAN DEFAULT false;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'check';

-- Add equipment and lanes (JSONB for flexibility)
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS equipment_types JSONB;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS preferred_lanes JSONB;

-- Add status
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive'));

-- Add updated_at timestamp
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_carriers_updated_at ON carriers;
CREATE TRIGGER trigger_carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at();

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
CREATE INDEX IF NOT EXISTS idx_carriers_mc_number ON carriers(mc_number);
CREATE INDEX IF NOT EXISTS idx_carriers_dot_number ON carriers(dot_number);
