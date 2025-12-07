-- Migration: Add document templates table for custom PDF generation
-- Run this in Supabase SQL Editor

-- Drop existing objects if they exist (for clean re-run)
DROP TRIGGER IF EXISTS trigger_single_default_template ON document_templates;
DROP FUNCTION IF EXISTS ensure_single_default_template();
DROP TABLE IF EXISTS document_templates;

-- Create document_templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rate_confirmation', 'bol', 'invoice', 'carrier_packet', 'custom')),
  description TEXT,

  -- Template content (HTML with variable placeholders like {{reference_number}})
  html_content TEXT NOT NULL,

  -- Styling
  css_styles TEXT,

  -- Page settings
  page_size TEXT DEFAULT 'letter' CHECK (page_size IN ('letter', 'legal', 'a4')),
  page_orientation TEXT DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
  margin_top INTEGER DEFAULT 50,
  margin_right INTEGER DEFAULT 50,
  margin_bottom INTEGER DEFAULT 50,
  margin_left INTEGER DEFAULT 50,

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Policy for brokers to manage templates
CREATE POLICY "Brokers can manage templates" ON document_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'broker'))
  );

-- Index for faster queries
CREATE INDEX idx_document_templates_type ON document_templates(type);
CREATE INDEX idx_document_templates_is_default ON document_templates(is_default);

-- Function to ensure only one default template per type
CREATE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE document_templates
    SET is_default = false
    WHERE type = NEW.type AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger after table exists
CREATE TRIGGER trigger_single_default_template
  BEFORE INSERT OR UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();
