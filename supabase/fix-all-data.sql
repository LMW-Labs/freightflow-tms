-- COMPLETE FIX: Link all data to organization
-- Run this in your Supabase SQL Editor

-- Step 1: Create the organization if it doesn't exist
INSERT INTO organizations (id, name, slug, primary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'KHCL Logistics', 'khcl-logistics', '#3B82F6')
ON CONFLICT (id) DO UPDATE SET name = 'KHCL Logistics';

-- Step 2: Update ALL users to this organization
UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 3: Update ALL customers to this organization
UPDATE customers
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 4: Update ALL carriers to this organization
UPDATE carriers
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: Update ALL loads to this organization
UPDATE loads
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Note: drivers table doesn't have organization_id - they're linked via carrier_id

-- Verification queries
SELECT 'Organization:' as info, id, name FROM organizations;
SELECT 'Users:' as info, COUNT(*) as count FROM users WHERE organization_id = '00000000-0000-0000-0000-000000000001';
SELECT 'Customers:' as info, COUNT(*) as count FROM customers WHERE organization_id = '00000000-0000-0000-0000-000000000001';
SELECT 'Carriers:' as info, COUNT(*) as count FROM carriers WHERE organization_id = '00000000-0000-0000-0000-000000000001';
SELECT 'Loads:' as info, COUNT(*) as count FROM loads WHERE organization_id = '00000000-0000-0000-0000-000000000001';
