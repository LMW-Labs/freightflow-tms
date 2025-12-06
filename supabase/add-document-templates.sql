-- Create document_templates table for storing reusable templates
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates from their org
CREATE POLICY "Users can view templates from their organization"
  ON document_templates FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow authenticated users to insert templates
CREATE POLICY "Users can create templates"
  ON document_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their org's templates
CREATE POLICY "Users can delete templates from their organization"
  ON document_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_org ON document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);

-- Create driver_document_requests table for tracking document requests sent to drivers
CREATE TABLE IF NOT EXISTS driver_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id),
  driver_id UUID REFERENCES drivers(id),
  request_type TEXT NOT NULL, -- 'pod', 'bol', 'signature', etc.
  request_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired
  requested_by_id UUID REFERENCES users(id),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for driver_document_requests
ALTER TABLE driver_document_requests ENABLE ROW LEVEL SECURITY;

-- Allow public access via request_token (for drivers)
CREATE POLICY "Public can view requests by token"
  ON driver_document_requests FOR SELECT
  USING (true);

-- Allow authenticated users to create requests
CREATE POLICY "Users can create document requests"
  ON driver_document_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow updates (for completing requests)
CREATE POLICY "Allow updates on requests"
  ON driver_document_requests FOR UPDATE
  USING (true);

-- Create digital_signatures table
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id UUID REFERENCES driver_document_requests(id),
  load_id UUID REFERENCES loads(id),
  signer_name TEXT NOT NULL,
  signer_ip TEXT,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for digital_signatures
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures"
  ON digital_signatures FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can create signatures via request"
  ON digital_signatures FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_requests_load ON driver_document_requests(load_id);
CREATE INDEX IF NOT EXISTS idx_driver_requests_token ON driver_document_requests(request_token);
CREATE INDEX IF NOT EXISTS idx_driver_requests_status ON driver_document_requests(status);
CREATE INDEX IF NOT EXISTS idx_signatures_load ON digital_signatures(load_id);
