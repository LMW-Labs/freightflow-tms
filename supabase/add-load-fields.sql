-- Add new fields to loads table for comprehensive load management
-- Run this in Supabase SQL Editor

-- Add new status values
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
ALTER TABLE loads ADD CONSTRAINT loads_status_check CHECK (status IN (
  'quoted', 'booked', 'dispatched', 'en_route_pickup',
  'at_pickup', 'loaded', 'en_route_delivery',
  'at_delivery', 'delivered', 'invoiced', 'paid',
  'complete', 'customer_paid'
));

-- Add booked date
ALTER TABLE loads ADD COLUMN IF NOT EXISTS booked_date DATE;

-- Pickup details
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_contact TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

-- Delivery details
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_name TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_contact TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Equipment type codes (FH=Flatbed w/ Hotshot, F=Flatbed, V=Van, STLG=Step Deck Lowboy, etc)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS equipment_code TEXT;

-- Hauler info
ALTER TABLE loads ADD COLUMN IF NOT EXISTS hauler_name TEXT;

-- Reference numbers
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pro_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS bol_number TEXT;

-- Document tracking (received/processed flags)
ALTER TABLE loads ADD COLUMN IF NOT EXISTS rate_con_received BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pod_received BOOLEAN DEFAULT false;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS carrier_invoice_received BOOLEAN DEFAULT false;

-- Sales tracking
ALTER TABLE loads ADD COLUMN IF NOT EXISTS sales_rep_1 TEXT;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS sales_rep_2 TEXT;

-- Load type
ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_type TEXT DEFAULT 'TL' CHECK (load_type IN ('TL', 'LTL'));

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_loads_booked_date ON loads(booked_date);
CREATE INDEX IF NOT EXISTS idx_loads_pro_number ON loads(pro_number);
CREATE INDEX IF NOT EXISTS idx_loads_po_number ON loads(po_number);
CREATE INDEX IF NOT EXISTS idx_loads_sales_rep_1 ON loads(sales_rep_1);
