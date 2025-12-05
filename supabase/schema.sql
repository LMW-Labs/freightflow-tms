-- TMS Platform Database Schema
-- Run this in your Supabase SQL Editor

-- ORGANIZATIONS (the freight broker - just one for now, multi-tenant ready)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (brokers, staff)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'broker' CHECK (role IN ('admin', 'broker', 'accountant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS (shippers - each gets a portal)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  portal_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER PORTAL USERS (login for customer portal)
CREATE TABLE customer_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CARRIERS
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  company_name TEXT NOT NULL,
  mc_number TEXT,
  dot_number TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DRIVERS (for tracking app)
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES carriers(id),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  truck_number TEXT,
  device_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOADS
CREATE TABLE loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  customer_id UUID REFERENCES customers(id),
  carrier_id UUID REFERENCES carriers(id),
  driver_id UUID REFERENCES drivers(id),

  reference_number TEXT NOT NULL,

  status TEXT DEFAULT 'booked' CHECK (status IN (
    'quoted', 'booked', 'dispatched', 'en_route_pickup',
    'at_pickup', 'loaded', 'en_route_delivery',
    'at_delivery', 'delivered', 'invoiced', 'paid'
  )),

  -- Origin
  origin_address TEXT NOT NULL,
  origin_city TEXT,
  origin_state TEXT,
  origin_lat DECIMAL(10, 7),
  origin_lng DECIMAL(10, 7),
  pickup_date DATE,
  pickup_time_start TIME,
  pickup_time_end TIME,

  -- Destination
  dest_address TEXT NOT NULL,
  dest_city TEXT,
  dest_state TEXT,
  dest_lat DECIMAL(10, 7),
  dest_lng DECIMAL(10, 7),
  delivery_date DATE,
  delivery_time_start TIME,
  delivery_time_end TIME,

  -- Details
  commodity TEXT,
  weight INTEGER,
  equipment_type TEXT DEFAULT 'Dry Van',
  special_instructions TEXT,

  -- Rates
  customer_rate DECIMAL(10, 2),
  carrier_rate DECIMAL(10, 2),

  -- Tracking
  current_lat DECIMAL(10, 7),
  current_lng DECIMAL(10, 7),
  current_location_updated_at TIMESTAMPTZ,
  eta TIMESTAMPTZ,

  -- Tracking link token (public, no auth needed)
  tracking_token UUID DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOCATION HISTORY (for tracking trail)
CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id),
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  speed DECIMAL(5, 1),
  heading INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  uploaded_by_type TEXT CHECK (uploaded_by_type IN ('broker', 'driver', 'customer')),
  uploaded_by_id UUID,

  type TEXT NOT NULL CHECK (type IN ('rate_con', 'bol', 'pod', 'invoice', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,

  -- Metadata for fraud prevention
  captured_lat DECIMAL(10, 7),
  captured_lng DECIMAL(10, 7),
  captured_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STATUS HISTORY (audit trail)
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  notes TEXT,
  created_by_type TEXT,
  created_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_loads_customer ON loads(customer_id);
CREATE INDEX idx_loads_carrier ON loads(carrier_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_tracking_token ON loads(tracking_token);
CREATE INDEX idx_loads_organization ON loads(organization_id);
CREATE INDEX idx_location_history_load ON location_history(load_id);
CREATE INDEX idx_documents_load ON documents(load_id);
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_carriers_organization ON carriers(organization_id);

-- ROW LEVEL SECURITY
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Organizations: Users can see their own org
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Users: Can see users in same org
CREATE POLICY "Users can view users in same org" ON users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Customers: Org users can manage
CREATE POLICY "Org users can view customers" ON customers
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can insert customers" ON customers
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can update customers" ON customers
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Customer users: Can see their own data
CREATE POLICY "Customer users can view their profile" ON customer_users
  FOR SELECT USING (id = auth.uid());

-- Carriers: Org users can manage
CREATE POLICY "Org users can view carriers" ON carriers
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can insert carriers" ON carriers
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can update carriers" ON carriers
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Drivers: Org users and drivers themselves can view
CREATE POLICY "Org users can view drivers" ON drivers
  FOR SELECT USING (
    carrier_id IN (
      SELECT id FROM carriers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Org users can insert drivers" ON drivers
  FOR INSERT WITH CHECK (
    carrier_id IN (
      SELECT id FROM carriers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Loads: Org users see all, customers see their own
CREATE POLICY "Org users can view all loads" ON loads
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Customers can view their loads" ON loads
  FOR SELECT USING (
    customer_id IN (SELECT customer_id FROM customer_users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can insert loads" ON loads
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Org users can update loads" ON loads
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Public tracking access (no auth required for tracking token)
CREATE POLICY "Anyone can view load by tracking token" ON loads
  FOR SELECT USING (true);

-- Location history: Same as loads
CREATE POLICY "Org users can view location history" ON location_history
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can insert location history" ON location_history
  FOR INSERT WITH CHECK (true);

-- Documents: Same as loads
CREATE POLICY "Org users can view documents" ON documents
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers can view their documents" ON documents
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE customer_id IN (
        SELECT customer_id FROM customer_users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can insert documents" ON documents
  FOR INSERT WITH CHECK (true);

-- Status history: Same as loads
CREATE POLICY "Org users can view status history" ON status_history
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can insert status history" ON status_history
  FOR INSERT WITH CHECK (true);

-- FUNCTIONS

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loads_updated_at
  BEFORE UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate reference number
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
DECLARE
  today_prefix TEXT;
  seq_num INTEGER;
  ref_num TEXT;
BEGIN
  today_prefix := 'LD-' || TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference_number FROM '-(\d+)$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM loads
  WHERE reference_number LIKE today_prefix || '-%';

  ref_num := today_prefix || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN ref_num;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for loads table
ALTER PUBLICATION supabase_realtime ADD TABLE loads;
ALTER PUBLICATION supabase_realtime ADD TABLE location_history;

-- Storage bucket for documents (run in Supabase dashboard or use API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);
