-- Accounting Migration: Invoices and Invoice Packages
-- Run this in Supabase SQL Editor after the combined migration

-- ============================================
-- 1. CREATE INVOICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('customer', 'carrier')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_audit', 'audited', 'sent', 'paid', 'void')),

  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  adjustments DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Dates
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Audit trail
  audited_by UUID REFERENCES users(id),
  audited_at TIMESTAMPTZ,
  audit_notes TEXT,

  -- Document package
  package_url TEXT, -- Combined PDF URL

  -- Destination for sending
  send_to_email TEXT,
  send_to_type TEXT CHECK (send_to_type IN ('customer', 'factoring', 'carrier', 'other')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- 2. CREATE INVOICE DOCUMENTS TABLE
-- ============================================
-- Links documents to invoice packages

CREATE TABLE IF NOT EXISTS invoice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('broker_invoice', 'carrier_invoice', 'pod', 'bol', 'rate_con', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  included_in_package BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INVOICE LINE ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CREATE INVOICE HISTORY TABLE
-- ============================================
-- Track all changes to invoices

CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_load_id ON invoices(load_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_carrier_id ON invoices(carrier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_documents_invoice_id ON invoice_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice_id ON invoice_history(invoice_id);

-- ============================================
-- 6. ADD UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Users can view invoices in their organization"
ON invoices FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert invoices in their organization"
ON invoices FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update invoices in their organization"
ON invoices FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete invoices in their organization"
ON invoices FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Policies for invoice_documents (follow invoice access)
CREATE POLICY "Users can manage invoice documents"
ON invoice_documents FOR ALL
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Policies for invoice_line_items (follow invoice access)
CREATE POLICY "Users can manage invoice line items"
ON invoice_line_items FOR ALL
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Policies for invoice_history (follow invoice access)
CREATE POLICY "Users can view invoice history"
ON invoice_history FOR SELECT
USING (
  invoice_id IN (
    SELECT id FROM invoices WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert invoice history"
ON invoice_history FOR INSERT
WITH CHECK (
  invoice_id IN (
    SELECT id FROM invoices WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- DONE! Accounting tables created.
-- ============================================
