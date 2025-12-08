-- Integrations Migration: Third-party service connections
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ORGANIZATION INTEGRATIONS TABLE
-- ============================================
-- Stores OAuth tokens and API credentials per organization

CREATE TABLE IF NOT EXISTS organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider identification
  provider TEXT NOT NULL CHECK (provider IN (
    'quickbooks', 'dat', 'truckstop', 'highway', 'macropoint', 'denim'
  )),

  -- Connection status
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'disconnected', 'connecting', 'connected', 'error', 'expired'
  )),

  -- Encrypted credentials (OAuth tokens, API keys, etc.)
  -- Store as encrypted JSON blob
  credentials_encrypted TEXT,

  -- OAuth specific fields
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Provider-specific account identifiers
  external_account_id TEXT,  -- e.g., QBO realm_id, DAT account ID
  external_account_name TEXT,

  -- Configuration options (provider-specific settings as JSON)
  config JSONB DEFAULT '{}'::jsonb,

  -- Sync tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'error')),
  last_sync_message TEXT,

  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  error_count INT DEFAULT 0,

  -- Metadata
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one integration per provider per organization
  UNIQUE(organization_id, provider)
);

-- ============================================
-- 2. INTEGRATION SYNC LOGS TABLE
-- ============================================
-- Detailed log of all sync operations

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES organization_integrations(id) ON DELETE CASCADE,

  -- Sync operation details
  operation TEXT NOT NULL,  -- e.g., 'sync_customers', 'push_invoice', 'verify_carrier'
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull', 'webhook')),

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error')),

  -- Related records
  related_table TEXT,  -- e.g., 'customers', 'invoices', 'carriers'
  related_id UUID,     -- ID in our table
  external_id TEXT,    -- ID in external system

  -- Request/Response logging (sanitized - no secrets)
  request_summary JSONB,
  response_summary JSONB,

  -- Error details
  error_code TEXT,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,

  -- Metadata
  triggered_by UUID REFERENCES users(id),
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'auto', 'webhook', 'schedule'))
);

-- ============================================
-- 3. RATE LOOKUPS TABLE
-- ============================================
-- Store rate lookups from DAT/Truckstop for analytics and margin calculations

CREATE TABLE IF NOT EXISTS rate_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source
  provider TEXT NOT NULL CHECK (provider IN ('dat', 'truckstop')),

  -- Lane information
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  origin_zip TEXT,
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  dest_zip TEXT,

  -- Equipment
  equipment_type TEXT NOT NULL,

  -- Rate data
  rate_per_mile DECIMAL(10, 2),
  total_rate DECIMAL(10, 2),
  mileage INT,

  -- Market context
  market_low DECIMAL(10, 2),
  market_high DECIMAL(10, 2),
  market_avg DECIMAL(10, 2),
  fuel_surcharge DECIMAL(10, 2),

  -- Validity
  rate_date DATE NOT NULL,
  valid_until DATE,

  -- Related load (if looked up for specific load)
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,

  -- Metadata
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  looked_up_by UUID REFERENCES users(id)
);

-- ============================================
-- 4. CARRIER VERIFICATIONS TABLE
-- ============================================
-- Store Highway verification results

CREATE TABLE IF NOT EXISTS carrier_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,

  -- Provider
  provider TEXT NOT NULL DEFAULT 'highway',

  -- Verification status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'verified', 'failed', 'expired', 'flagged'
  )),

  -- Authority verification
  authority_status TEXT,  -- 'active', 'inactive', 'revoked'
  authority_verified_at TIMESTAMPTZ,

  -- Insurance verification
  insurance_status TEXT,  -- 'valid', 'expired', 'insufficient'
  insurance_expires_at DATE,
  insurance_verified_at TIMESTAMPTZ,
  cargo_coverage DECIMAL(12, 2),
  liability_coverage DECIMAL(12, 2),

  -- Safety score
  safety_score DECIMAL(5, 2),
  safety_rating TEXT,  -- 'satisfactory', 'conditional', 'unsatisfactory'
  out_of_service_percentage DECIMAL(5, 2),

  -- Flags and alerts
  flags JSONB DEFAULT '[]'::jsonb,  -- Array of warning flags
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,

  -- Raw data from provider
  raw_response JSONB,

  -- Verification timing
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  next_verification_at TIMESTAMPTZ,

  -- Metadata
  verified_by UUID REFERENCES users(id),
  verification_type TEXT CHECK (verification_type IN ('initial', 'scheduled', 'manual')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TRACKING SESSIONS TABLE
-- ============================================
-- Store Macropoint tracking sessions

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,

  -- Provider
  provider TEXT NOT NULL DEFAULT 'macropoint',
  external_tracking_id TEXT,  -- Macropoint's tracking ID

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'active', 'paused', 'completed', 'cancelled', 'error'
  )),

  -- Tracking details
  driver_phone TEXT,
  tracking_method TEXT,  -- 'eld', 'mobile', 'satellite'

  -- Location data
  last_lat DECIMAL(10, 7),
  last_lng DECIMAL(10, 7),
  last_location_at TIMESTAMPTZ,
  last_city TEXT,
  last_state TEXT,

  -- ETA
  current_eta TIMESTAMPTZ,
  original_eta TIMESTAMPTZ,

  -- Timing
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  raw_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 6. CARRIER PAYMENTS TABLE
-- ============================================
-- Store Denim payment records

CREATE TABLE IF NOT EXISTS carrier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE SET NULL,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Provider
  provider TEXT NOT NULL DEFAULT 'denim',
  external_payment_id TEXT,  -- Denim's payment ID

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  fee_amount DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2),  -- Amount carrier receives

  -- Payment type
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'standard', 'quickpay', 'factoring'
  )),
  quickpay_fee_percentage DECIMAL(5, 2),

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),

  -- Payment method
  payment_method TEXT,  -- 'ach', 'check', 'wire'

  -- Dates
  scheduled_date DATE,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Bank/Remit info (encrypted reference, not actual data)
  remit_to TEXT,  -- 'carrier' or 'factoring'

  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,

  -- Metadata
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 7. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_org_integrations_org_id ON organization_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_integrations_provider ON organization_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_org_integrations_status ON organization_integrations(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org_id ON integration_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON integration_sync_logs(started_at);

CREATE INDEX IF NOT EXISTS idx_rate_lookups_org_id ON rate_lookups(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_lookups_lane ON rate_lookups(origin_state, dest_state);
CREATE INDEX IF NOT EXISTS idx_rate_lookups_load_id ON rate_lookups(load_id);

CREATE INDEX IF NOT EXISTS idx_carrier_verifications_org_id ON carrier_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_carrier_id ON carrier_verifications(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_status ON carrier_verifications(status);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_org_id ON tracking_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_load_id ON tracking_sessions(load_id);
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_status ON tracking_sessions(status);

CREATE INDEX IF NOT EXISTS idx_carrier_payments_org_id ON carrier_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_carrier_payments_load_id ON carrier_payments(load_id);
CREATE INDEX IF NOT EXISTS idx_carrier_payments_carrier_id ON carrier_payments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_payments_status ON carrier_payments(status);

-- ============================================
-- 8. UPDATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_integrations_updated_at ON organization_integrations;
CREATE TRIGGER trigger_org_integrations_updated_at
  BEFORE UPDATE ON organization_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

DROP TRIGGER IF EXISTS trigger_carrier_verifications_updated_at ON carrier_verifications;
CREATE TRIGGER trigger_carrier_verifications_updated_at
  BEFORE UPDATE ON carrier_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

DROP TRIGGER IF EXISTS trigger_tracking_sessions_updated_at ON tracking_sessions;
CREATE TRIGGER trigger_tracking_sessions_updated_at
  BEFORE UPDATE ON tracking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

DROP TRIGGER IF EXISTS trigger_carrier_payments_updated_at ON carrier_payments;
CREATE TRIGGER trigger_carrier_payments_updated_at
  BEFORE UPDATE ON carrier_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_payments ENABLE ROW LEVEL SECURITY;

-- Organization Integrations policies
CREATE POLICY "Users can view integrations in their organization"
ON organization_integrations FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins and brokers can manage integrations"
ON organization_integrations FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'broker')
  )
);

-- Sync Logs policies
CREATE POLICY "Users can view sync logs in their organization"
ON integration_sync_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "System can insert sync logs"
ON integration_sync_logs FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Rate Lookups policies
CREATE POLICY "Users can view rate lookups in their organization"
ON rate_lookups FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create rate lookups"
ON rate_lookups FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Carrier Verifications policies
CREATE POLICY "Users can view carrier verifications in their organization"
ON carrier_verifications FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins and brokers can manage carrier verifications"
ON carrier_verifications FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'broker')
  )
);

-- Tracking Sessions policies
CREATE POLICY "Users can view tracking sessions in their organization"
ON tracking_sessions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage tracking sessions"
ON tracking_sessions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Carrier Payments policies
CREATE POLICY "Users can view carrier payments in their organization"
ON carrier_payments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins and accountants can manage carrier payments"
ON carrier_payments FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  )
);

-- ============================================
-- 10. ADD QUICKBOOKS ID COLUMNS TO EXISTING TABLES
-- ============================================

-- Add QBO customer ID to customers table for sync tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT;

-- Add QBO vendor ID to carriers table for sync tracking
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS qbo_vendor_id TEXT;

-- Add QBO invoice ID to invoices table for sync tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_invoice_id TEXT;

-- Add indexes for QBO lookups
CREATE INDEX IF NOT EXISTS idx_customers_qbo_id ON customers(qbo_customer_id);
CREATE INDEX IF NOT EXISTS idx_carriers_qbo_id ON carriers(qbo_vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_id ON invoices(qbo_invoice_id);

-- ============================================
-- 11. ADD MACROPOINT TRACKING COLUMNS TO LOADS
-- ============================================

-- Add Macropoint tracking fields to loads table
ALTER TABLE loads ADD COLUMN IF NOT EXISTS macropoint_order_id TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS tracking_status TEXT CHECK (tracking_status IN (
  'inactive', 'pending', 'active', 'completed', 'cancelled'
));
ALTER TABLE loads ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 7);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS current_lng DECIMAL(10, 7);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS current_city TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS current_state TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMPTZ;

-- Add index for Macropoint lookups
CREATE INDEX IF NOT EXISTS idx_loads_macropoint_id ON loads(macropoint_order_id);
CREATE INDEX IF NOT EXISTS idx_loads_tracking_status ON loads(tracking_status);

-- ============================================
-- 12. ADD DENIM PAYMENT COLUMNS
-- ============================================

-- Add Denim carrier ID to carriers table
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS denim_carrier_id TEXT;

-- Add Denim payment fields to loads table
ALTER TABLE loads ADD COLUMN IF NOT EXISTS denim_payment_id TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_payment_status TEXT CHECK (carrier_payment_status IN (
  'pending', 'processing', 'approved', 'scheduled', 'paid', 'failed', 'cancelled'
));
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_paid_date TIMESTAMPTZ;

-- Add indexes for Denim lookups
CREATE INDEX IF NOT EXISTS idx_carriers_denim_id ON carriers(denim_carrier_id);
CREATE INDEX IF NOT EXISTS idx_loads_denim_payment_id ON loads(denim_payment_id);
CREATE INDEX IF NOT EXISTS idx_loads_carrier_payment_status ON loads(carrier_payment_status);

-- ============================================
-- 13. LOAD TRACKING EVENTS TABLE
-- ============================================
-- Store detailed tracking events from Macropoint webhooks

CREATE TABLE IF NOT EXISTS load_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,  -- 'location_update', 'eta_update', 'status_change', 'geofence_event'

  -- Location data
  location JSONB,
  eta JSONB,
  status TEXT,
  geofence JSONB,

  -- Raw payload for debugging
  raw_payload JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_load_id ON load_tracking_events(load_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON load_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created_at ON load_tracking_events(created_at);

-- Enable RLS on tracking events
ALTER TABLE load_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracking events for loads in their organization"
ON load_tracking_events FOR SELECT
USING (
  load_id IN (
    SELECT l.id FROM loads l
    JOIN users u ON l.organization_id = u.organization_id
    WHERE u.id = auth.uid()
  )
);

-- ============================================
-- DONE! Integration tables created.
-- ============================================
