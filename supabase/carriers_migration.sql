-- ============================================
-- CARRIERS TABLE MIGRATION TO SUPABASE
-- Adds new columns and imports carrier data
-- Total Records: 509
-- ============================================

-- 1. ADD NEW COLUMNS TO EXISTING CARRIERS TABLE
-- (Skip if columns already exist - errors are OK)
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS state CHAR(2);
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fleet_power_units INTEGER DEFAULT 0;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS date_entered DATE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2);
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS num_loads INTEGER DEFAULT 0;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS last_load_date DATE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS carrier_lane_count INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS lane_run_count INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS lane_last_run_date DATE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_carriers_mc_number ON carriers(mc_number);
CREATE INDEX IF NOT EXISTS idx_carriers_state ON carriers(state);
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
CREATE INDEX IF NOT EXISTS idx_carriers_company_name ON carriers(company_name);

-- 3. AUTO-UPDATE TRIGGER FOR updated_at
CREATE OR REPLACE FUNCTION update_carriers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_carriers_updated_at ON carriers;
CREATE TRIGGER update_carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_carriers_updated_at_column();

-- 4. ADD UNIQUE CONSTRAINT FOR UPSERT (run this first)
-- This allows ON CONFLICT to work properly
ALTER TABLE carriers ADD CONSTRAINT carriers_mc_number_unique UNIQUE (mc_number);

-- 5. INSERT CARRIER RECORDS (with upsert)
-- Maps: carrier_name -> company_name, phone -> contact_phone, email -> contact_email
-- mc_number is TEXT in your table

INSERT INTO carriers (company_name, mc_number, status, is_flagged, contact_name, contact_phone, contact_email, city, state, fleet_power_units, date_entered, avg_rating, num_loads, last_load_date, carrier_lane_count, lane_run_count, lane_last_run_date)
VALUES
  ('2020 HOT SHOT TRUCKING LLC', '1078974', 'Active', FALSE, 'JOEL SMITH', '(478) 550-4436', 'JOEL.SMITH@2020HOTSHOTTRUCKING.COM', 'BYRON', 'GA', 0, '2022-02-14', 5.00, 2, '2022-02-17', NULL, NULL, NULL),
  ('214 LOGISTICS LLC', '1273717', 'Active', FALSE, 'ANNA GASKINS', '(317) 847-2702', 'AGASKINS@HEARTLAND-FREIGHT.COM', 'PEARLAND', 'TX', 0, '2025-04-21', 0.00, 1, '2025-04-22', NULL, NULL, NULL),
  ('3 ARROWS TRUCKING LLC', '157984', 'Active', FALSE, 'KAIDEN HARTMAN', '(740) 586-4401', 'KAIDEN@HOTSHOT107.COM', 'ZANESVILLE', 'OH', 0, '2023-07-17', 2.00, 1, '2023-07-18', NULL, NULL, NULL),
  ('3 WAY TRANSPORTATION LLC', '1348115', 'Active', FALSE, 'GARY JOHNSON', '(662) 260-8149', 'TRANSPORT3WAY@GMAIL.COM', 'SHANNON', 'MS', 0, '2025-02-17', 0.00, 1, '2025-02-18', NULL, NULL, NULL),
  ('316 CARRIERS LLC', '1449507', 'Active', FALSE, 'ALLAN MOORE', '(662) 457-1128', 'MOORE.ALLAN1971@YAHOO.COM', 'WINONA', 'MS', 0, '2022-11-02', 0.00, 1, '2022-11-03', NULL, NULL, NULL)
ON CONFLICT (mc_number) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  status = EXCLUDED.status,
  is_flagged = EXCLUDED.is_flagged,
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  contact_email = EXCLUDED.contact_email,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  fleet_power_units = EXCLUDED.fleet_power_units,
  date_entered = EXCLUDED.date_entered,
  avg_rating = EXCLUDED.avg_rating,
  num_loads = EXCLUDED.num_loads,
  last_load_date = EXCLUDED.last_load_date,
  updated_at = NOW();

-- ADD MORE CARRIER RECORDS BELOW (paste in batches of ~50)
-- Use the same INSERT format above for remaining 504 carriers

-- 5. VERIFY ROW COUNT
SELECT COUNT(*) as total_carriers FROM carriers;
