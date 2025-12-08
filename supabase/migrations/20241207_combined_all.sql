-- Combined Migration: All pending changes for Dec 7, 2024
-- Run this ONCE in Supabase SQL Editor
-- Includes: Carriers, Customers, Organizations expansions + New Roles + Status Colors

-- ============================================
-- 1. EXPAND CARRIERS TABLE
-- ============================================

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
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add updated_at timestamp
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update updated_at
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


-- ============================================
-- 2. EXPAND CUSTOMERS TABLE
-- ============================================

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

-- Create function to update updated_at
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


-- ============================================
-- 3. EXPAND ORGANIZATIONS TABLE
-- ============================================

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

-- Create function to update updated_at
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


-- ============================================
-- 4. ADD NEW USER ROLES
-- ============================================

-- Drop the existing constraint and add new one with additional roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'broker', 'dispatcher', 'salesperson_1', 'salesperson_2', 'accountant'));

-- Also update staff_invites table if it exists
ALTER TABLE staff_invites DROP CONSTRAINT IF EXISTS staff_invites_role_check;
ALTER TABLE staff_invites ADD CONSTRAINT staff_invites_role_check
  CHECK (role IN ('admin', 'broker', 'dispatcher', 'salesperson_1', 'salesperson_2', 'accountant'));


-- ============================================
-- DONE! All migrations applied.
-- ============================================
