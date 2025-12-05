-- MOCK DATA FOR FREIGHTFLOW TMS
-- Run this in Supabase SQL Editor after you have an organization and user set up

DO $$
DECLARE
  org_id UUID;
  -- Customer IDs
  cust_acme UUID;
  cust_global UUID;
  cust_swift UUID;
  cust_premier UUID;
  cust_midwest UUID;
  -- Carrier IDs
  carr_express UUID;
  carr_reliable UUID;
  carr_highway UUID;
  carr_cross UUID;
  carr_swift UUID;
  -- Driver IDs
  drv_john UUID;
  drv_maria UUID;
  drv_james UUID;
  drv_sarah UUID;
  drv_mike UUID;
BEGIN
  -- Get existing org
  SELECT id INTO org_id FROM organizations LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create one first.';
  END IF;

  RAISE NOTICE 'Using organization: %', org_id;

  -- =====================
  -- CUSTOMERS
  -- =====================
  INSERT INTO customers (id, organization_id, company_name, slug, contact_name, contact_email, contact_phone, portal_enabled)
  VALUES
    (gen_random_uuid(), org_id, 'Acme Manufacturing', 'acme-manufacturing', 'John Smith', 'john@acmemfg.com', '(555) 123-4567', true)
  RETURNING id INTO cust_acme;

  INSERT INTO customers (id, organization_id, company_name, slug, contact_name, contact_email, contact_phone, portal_enabled)
  VALUES
    (gen_random_uuid(), org_id, 'Global Foods Distribution', 'global-foods', 'Sarah Johnson', 'sarah@globalfoods.com', '(555) 234-5678', true)
  RETURNING id INTO cust_global;

  INSERT INTO customers (id, organization_id, company_name, slug, contact_name, contact_email, contact_phone, portal_enabled)
  VALUES
    (gen_random_uuid(), org_id, 'Swift Electronics', 'swift-electronics', 'Mike Chen', 'mike@swiftelec.com', '(555) 345-6789', true)
  RETURNING id INTO cust_swift;

  INSERT INTO customers (id, organization_id, company_name, slug, contact_name, contact_email, contact_phone, portal_enabled)
  VALUES
    (gen_random_uuid(), org_id, 'Premier Building Supplies', 'premier-building', 'Lisa Martinez', 'lisa@premierbldg.com', '(555) 456-7890', true)
  RETURNING id INTO cust_premier;

  INSERT INTO customers (id, organization_id, company_name, slug, contact_name, contact_email, contact_phone, portal_enabled)
  VALUES
    (gen_random_uuid(), org_id, 'Midwest Grain Co', 'midwest-grain', 'Tom Wilson', 'tom@midwestgrain.com', '(555) 567-8901', true)
  RETURNING id INTO cust_midwest;

  -- =====================
  -- CARRIERS
  -- =====================
  INSERT INTO carriers (id, organization_id, company_name, mc_number, dot_number, contact_name, contact_email, contact_phone)
  VALUES
    (gen_random_uuid(), org_id, 'Express Freight Lines', 'MC-123456', 'DOT-7891234', 'Bob Thompson', 'dispatch@expressfreight.com', '(555) 111-2222')
  RETURNING id INTO carr_express;

  INSERT INTO carriers (id, organization_id, company_name, mc_number, dot_number, contact_name, contact_email, contact_phone)
  VALUES
    (gen_random_uuid(), org_id, 'Reliable Transport Inc', 'MC-234567', 'DOT-8902345', 'Nancy White', 'ops@reliabletrans.com', '(555) 222-3333')
  RETURNING id INTO carr_reliable;

  INSERT INTO carriers (id, organization_id, company_name, mc_number, dot_number, contact_name, contact_email, contact_phone)
  VALUES
    (gen_random_uuid(), org_id, 'Highway Masters LLC', 'MC-345678', 'DOT-9013456', 'Dave Brown', 'dave@highwaymasters.com', '(555) 333-4444')
  RETURNING id INTO carr_highway;

  INSERT INTO carriers (id, organization_id, company_name, mc_number, dot_number, contact_name, contact_email, contact_phone)
  VALUES
    (gen_random_uuid(), org_id, 'CrossCountry Haulers', 'MC-456789', 'DOT-0124567', 'Maria Garcia', 'maria@crosscountry.com', '(555) 444-5555')
  RETURNING id INTO carr_cross;

  INSERT INTO carriers (id, organization_id, company_name, mc_number, dot_number, contact_name, contact_email, contact_phone)
  VALUES
    (gen_random_uuid(), org_id, 'Swift Carriers', 'MC-567890', 'DOT-1235678', 'Kevin Lee', 'kevin@swiftcarriers.com', '(555) 555-6666')
  RETURNING id INTO carr_swift;

  -- =====================
  -- DRIVERS
  -- =====================
  INSERT INTO drivers (id, carrier_id, phone, name, truck_number)
  VALUES
    (gen_random_uuid(), carr_express, '5556011111', 'John Rodriguez', 'TRK-101')
  RETURNING id INTO drv_john;

  INSERT INTO drivers (id, carrier_id, phone, name, truck_number)
  VALUES
    (gen_random_uuid(), carr_reliable, '5556022222', 'Maria Santos', 'TRK-202')
  RETURNING id INTO drv_maria;

  INSERT INTO drivers (id, carrier_id, phone, name, truck_number)
  VALUES
    (gen_random_uuid(), carr_highway, '5556033333', 'James Wilson', 'TRK-303')
  RETURNING id INTO drv_james;

  INSERT INTO drivers (id, carrier_id, phone, name, truck_number)
  VALUES
    (gen_random_uuid(), carr_cross, '5556044444', 'Sarah Mitchell', 'TRK-404')
  RETURNING id INTO drv_sarah;

  INSERT INTO drivers (id, carrier_id, phone, name, truck_number)
  VALUES
    (gen_random_uuid(), carr_swift, '5556055555', 'Mike Chang', 'TRK-505')
  RETURNING id INTO drv_mike;

  -- =====================
  -- LOADS
  -- =====================

  -- Load 1: Delivered
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_acme, carr_express, drv_john, 'KHCL-1001', 'delivered',
    '1234 Industrial Blvd', 'Chicago', 'IL', 41.8781, -87.6298,
    '5000 Auto Drive', 'Detroit', 'MI', 42.3314, -83.0458,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 42000, 'Automotive Parts', 'Dry Van',
    2850.00, 2200.00, 'Delivered on time. POD received.'
  );

  -- Load 2: In transit to delivery
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions,
    current_lat, current_lng, current_location_updated_at
  ) VALUES (
    org_id, cust_global, carr_swift, drv_mike, 'KHCL-1002', 'en_route_delivery',
    '5678 Commerce Way', 'Dallas', 'TX', 32.7767, -96.7970,
    '8900 Market St', 'Los Angeles', 'CA', 34.0522, -118.2437,
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 38000, 'Frozen Foods', 'Reefer',
    4200.00, 3400.00, 'Temperature: -10F. Check temp logs on delivery.',
    33.9425, -106.4600, NOW() - INTERVAL '30 minutes'
  );

  -- Load 3: At pickup
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_swift, carr_cross, drv_sarah, 'KHCL-1003', 'at_pickup',
    '9012 Tech Park Dr', 'San Jose', 'CA', 37.3382, -121.8863,
    '4500 Electronics Ave', 'Austin', 'TX', 30.2672, -97.7431,
    NOW(), NOW() + INTERVAL '2 days', 15000, 'Electronics - Computers', 'Dry Van',
    3600.00, 2900.00, 'High value. White glove service required.'
  );

  -- Load 4: Dispatched
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_premier, carr_highway, drv_james, 'KHCL-1004', 'dispatched',
    '3456 Construction Ave', 'Phoenix', 'AZ', 33.4484, -112.0740,
    '7800 Build Blvd', 'Denver', 'CO', 39.7392, -104.9903,
    NOW() + INTERVAL '4 hours', NOW() + INTERVAL '2 days', 44000, 'Steel Beams', 'Flatbed',
    2100.00, 1650.00, 'Oversized load. Requires tarping.'
  );

  -- Load 5: Booked (no carrier yet)
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_midwest, NULL, NULL, 'KHCL-1005', 'booked',
    '7890 Farm Road', 'Des Moines', 'IA', 41.5868, -93.6250,
    '2300 Mill Way', 'Minneapolis', 'MN', 44.9778, -93.2650,
    NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 48000, 'Bulk Grain - Corn', 'Hopper',
    1800.00, NULL, 'Need hopper trailer. 48k lbs.'
  );

  -- Load 6: Quote stage
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_acme, NULL, NULL, 'KHCL-1006', 'quoted',
    '1234 Industrial Blvd', 'Chicago', 'IL', 41.8781, -87.6298,
    '9900 Assembly Ln', 'Nashville', 'TN', 36.1627, -86.7816,
    NOW() + INTERVAL '5 days', NOW() + INTERVAL '6 days', 35000, 'Engine Components', 'Dry Van',
    2400.00, NULL, 'Customer requested quote. Waiting for approval.'
  );

  -- Load 7: En route to pickup
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions,
    current_lat, current_lng, current_location_updated_at
  ) VALUES (
    org_id, cust_global, carr_reliable, drv_maria, 'KHCL-1007', 'en_route_pickup',
    '1200 Food Court', 'Atlanta', 'GA', 33.7490, -84.3880,
    '5678 Commerce Way', 'Dallas', 'TX', 32.7767, -96.7970,
    NOW() + INTERVAL '2 hours', NOW() + INTERVAL '1 day', 41000, 'Refrigerated Produce', 'Reefer',
    3100.00, 2450.00, 'Temp: 34F. Precool trailer before loading.',
    33.5207, -86.8025, NOW() - INTERVAL '15 minutes'
  );

  -- Load 8: Delivered yesterday
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_swift, carr_express, drv_john, 'KHCL-1008', 'delivered',
    '9012 Tech Park Dr', 'San Jose', 'CA', 37.3382, -121.8863,
    '3300 Retail Rd', 'Seattle', 'WA', 47.6062, -122.3321,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 22000, 'Consumer Electronics', 'Dry Van',
    2950.00, 2300.00, 'Appointment delivery. POD signed by warehouse manager.'
  );

  -- Load 9: At delivery
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_premier, carr_cross, drv_sarah, 'KHCL-1009', 'at_delivery',
    '6700 Lumber Ln', 'Portland', 'OR', 45.5152, -122.6784,
    '3456 Construction Ave', 'Phoenix', 'AZ', 33.4484, -112.0740,
    NOW() - INTERVAL '1 day', NOW(), 43000, 'Lumber - Treated Wood', 'Flatbed',
    3400.00, 2750.00, 'Unloading in progress. Forklift on site.'
  );

  -- Load 10: Invoiced
  INSERT INTO loads (
    organization_id, customer_id, carrier_id, driver_id, reference_number, status,
    origin_address, origin_city, origin_state, origin_lat, origin_lng,
    dest_address, dest_city, dest_state, dest_lat, dest_lng,
    pickup_date, delivery_date, weight, commodity, equipment_type,
    customer_rate, carrier_rate, special_instructions
  ) VALUES (
    org_id, cust_midwest, carr_highway, drv_james, 'KHCL-1010', 'invoiced',
    '7890 Farm Road', 'Des Moines', 'IA', 41.5868, -93.6250,
    '4400 Feed Mill Rd', 'Omaha', 'NE', 41.2565, -95.9345,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 47500, 'Bulk Grain - Soybeans', 'Hopper',
    1650.00, 1280.00, 'Invoice #INV-1010 sent. Due in 45 days.'
  );

  RAISE NOTICE 'Mock data loaded successfully!';
  RAISE NOTICE 'Created: 5 customers, 5 carriers, 5 drivers, 10 loads';

END $$;

-- Show summary
SELECT 'Customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'Carriers', COUNT(*) FROM carriers
UNION ALL
SELECT 'Drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'Loads', COUNT(*) FROM loads;
