-- ============================================
-- VectrLoadAI - AI Features Database Tables
-- ============================================

-- ============================================
-- 1. ALERTS TABLE
-- ============================================
-- Proactive alerts for tracking issues, carrier problems, payment aging, etc.

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Related entities (optional)
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL,  -- 'no_movement', 'off_route', 'eta_slip', 'pickup_overdue', 'no_check_call',
                             -- 'insurance_expiring', 'authority_issue', 'invoice_aging', 'payment_due'
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Extra context (threshold values, calculated values, etc.)

  -- State
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES users(id),
  dismissed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,  -- For snoozing alerts

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_alerts_org_unread ON alerts(organization_id) WHERE is_read = false AND is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_alerts_org_severity ON alerts(organization_id, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_load ON alerts(load_id) WHERE load_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_carrier ON alerts(carrier_id) WHERE carrier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their organization"
ON alerts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update alerts for their organization"
ON alerts FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================
-- 2. AI LOGS TABLE
-- ============================================
-- Track all AI interactions for debugging, improvement, and cost tracking

CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Request details
  feature TEXT NOT NULL,  -- 'rate_quote', 'document_extraction', 'carrier_matching', 'email_drafting', 'search'
  request JSONB NOT NULL,  -- The input to the AI
  response JSONB,  -- The AI response

  -- Performance metrics
  latency_ms INTEGER,
  model TEXT,  -- 'claude-3-opus', 'claude-3-sonnet', 'gpt-4o', etc.
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd DECIMAL(10, 6),  -- Calculated cost for tracking

  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for log queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_org ON ai_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_feature ON ai_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_logs(status);

-- Enable RLS
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI logs for their organization"
ON ai_logs FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================
-- 3. DOCUMENT EXTRACTION COLUMNS
-- ============================================
-- Add AI extraction fields to existing documents table

ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending'
  CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3, 2);  -- 0.00 to 1.00
ALTER TABLE documents ADD COLUMN IF NOT EXISTS detected_type TEXT;  -- AI-detected document type
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_error TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS matched_load_id UUID REFERENCES loads(id);  -- If AI matched to a load

-- Index for extraction queries
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_detected_type ON documents(detected_type);

-- ============================================
-- 4. CARRIER EMBEDDINGS TABLE (For Phase 2 semantic search)
-- ============================================
-- Note: Requires pgvector extension. Skip if not available.

-- Check if pgvector is available and create table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE TABLE IF NOT EXISTS carrier_embeddings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      embedding vector(1536),  -- OpenAI ada-002 dimension
      embedding_model TEXT DEFAULT 'text-embedding-ada-002',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_carrier_embeddings_carrier ON carrier_embeddings(carrier_id);

    -- Enable RLS
    ALTER TABLE carrier_embeddings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view carrier embeddings for their organization" ON carrier_embeddings
    FOR SELECT USING (
      carrier_id IN (
        SELECT c.id FROM carriers c
        JOIN users u ON c.organization_id = u.organization_id
        WHERE u.id = auth.uid()
      )
    );
  END IF;
END $$;

-- ============================================
-- 5. AI RATE SUGGESTIONS LOG
-- ============================================
-- Track rate suggestions for learning and feedback

CREATE TABLE IF NOT EXISTS ai_rate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id),

  -- Request parameters
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  weight INTEGER,
  pickup_date DATE,

  -- AI suggestions
  suggested_customer_rate DECIMAL(10, 2),
  suggested_carrier_rate DECIMAL(10, 2),
  predicted_margin_pct DECIMAL(5, 2),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  reasoning TEXT,

  -- Market data used
  market_data JSONB,  -- DAT rate, Truckstop rate, etc.
  historical_data JSONB,  -- Historical loads analysis

  -- Feedback/outcome (updated when load is booked)
  actual_customer_rate DECIMAL(10, 2),
  actual_carrier_rate DECIMAL(10, 2),
  actual_margin_pct DECIMAL(5, 2),
  suggestion_used BOOLEAN,  -- Did user accept suggestion?
  feedback TEXT,  -- User feedback

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_suggestions_org ON ai_rate_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_suggestions_lane ON ai_rate_suggestions(origin_state, dest_state);
CREATE INDEX IF NOT EXISTS idx_rate_suggestions_created ON ai_rate_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE ai_rate_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate suggestions for their organization"
ON ai_rate_suggestions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create rate suggestions for their organization"
ON ai_rate_suggestions FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================
-- 6. AI EMAIL DRAFTS TABLE
-- ============================================
-- Store generated email drafts for editing and sending

CREATE TABLE IF NOT EXISTS ai_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Related entities
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Template and context
  template_type TEXT NOT NULL,  -- 'rate_con', 'dispatch', 'invoice', 'payment_reminder', etc.
  context_data JSONB,  -- Data used to generate

  -- Generated content
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  attachments JSONB DEFAULT '[]',  -- [{name, url}]

  -- State
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'discarded')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT,  -- 'resend', 'copied', 'external'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_org ON ai_email_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_user ON ai_email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON ai_email_drafts(status);

-- Enable RLS
ALTER TABLE ai_email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage email drafts for their organization"
ON ai_email_drafts FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================
-- 7. ALERT PREFERENCES TABLE
-- ============================================
-- User preferences for alert notifications

CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Alert type preferences
  alert_type TEXT NOT NULL,  -- 'no_movement', 'insurance_expiring', etc.
  enabled BOOLEAN DEFAULT true,
  severity_threshold TEXT DEFAULT 'warning' CHECK (severity_threshold IN ('critical', 'warning', 'info')),

  -- Notification channels
  notify_in_app BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,
  notify_sms BOOLEAN DEFAULT false,

  -- Custom thresholds (optional overrides)
  custom_thresholds JSONB,  -- { hours_before_expire: 14 } etc.

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alert_prefs_user ON alert_preferences(user_id);

-- Enable RLS
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alert preferences"
ON alert_preferences FOR ALL
USING (user_id = auth.uid());

-- ============================================
-- 8. UPDATE TRIGGERS
-- ============================================

-- Update timestamp trigger for alerts
CREATE OR REPLACE FUNCTION update_alert_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_timestamp
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_timestamp();

CREATE TRIGGER update_email_drafts_timestamp
  BEFORE UPDATE ON ai_email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_timestamp();

CREATE TRIGGER update_alert_prefs_timestamp
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_timestamp();

-- ============================================
-- DONE! AI feature tables created.
-- ============================================
