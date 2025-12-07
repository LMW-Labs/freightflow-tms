-- Migration: Add missing fields for rate confirmation generation
-- Run this in Supabase SQL Editor

-- Add new fields to loads table for rate con generation
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pay_terms TEXT DEFAULT 'Standard Net 30';
ALTER TABLE loads ADD COLUMN IF NOT EXISTS cargo_value DECIMAL(12,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_cell TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_email TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_cell TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_email TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS freight_terms TEXT DEFAULT 'PREPAID';

-- Add carrier onboarding fields
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fax TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_company TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_contact TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_phone TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS factoring_email TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_name TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_type TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_city_state_zip TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_tin TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_name TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_address TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_city TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_state TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS remit_zip TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS quickpay_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS pay_method TEXT DEFAULT 'check';
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS equipment_types TEXT[];
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS preferred_lanes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_file_url TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS w9_file_url TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS authority_file_url TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS agreement_signature_url TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add customer request load fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip TEXT;

-- Create load_requests table for customer submitted load requests
CREATE TABLE IF NOT EXISTS load_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'converted')),
  reference_number TEXT,

  -- Pickup details
  pickup_name TEXT,
  pickup_address TEXT,
  pickup_city TEXT,
  pickup_state TEXT,
  pickup_zip TEXT,
  pickup_contact TEXT,
  pickup_phone TEXT,
  pickup_email TEXT,
  pickup_date DATE,
  pickup_time_start TIME,
  pickup_time_end TIME,
  pickup_notes TEXT,

  -- Delivery details
  delivery_name TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_zip TEXT,
  delivery_contact TEXT,
  delivery_phone TEXT,
  delivery_email TEXT,
  delivery_date DATE,
  delivery_time_start TIME,
  delivery_time_end TIME,
  delivery_notes TEXT,

  -- Freight details
  commodity TEXT,
  weight DECIMAL(10,2),
  quantity INTEGER,
  package_type TEXT,
  equipment_type TEXT,
  special_instructions TEXT,

  -- Quote info
  quoted_rate DECIMAL(12,2),
  quoted_at TIMESTAMPTZ,
  quoted_by UUID,

  -- Conversion
  converted_load_id UUID REFERENCES loads(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on load_requests
ALTER TABLE load_requests ENABLE ROW LEVEL SECURITY;

-- Policies for load_requests (adjust based on your auth setup)
CREATE POLICY "Customers can view own load requests" ON load_requests
  FOR SELECT USING (
    customer_id IN (
      SELECT cu.customer_id FROM customer_users cu WHERE cu.id = auth.uid()
    )
  );

CREATE POLICY "Customers can create load requests" ON load_requests
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT cu.customer_id FROM customer_users cu WHERE cu.id = auth.uid()
    )
  );

CREATE POLICY "Brokers can view all load requests" ON load_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'broker'))
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_load_requests_customer_id ON load_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_load_requests_status ON load_requests(status);
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
