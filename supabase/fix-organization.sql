-- Fix organization linkage issue
-- Run this in your Supabase SQL Editor

-- Step 1: Create the organization if it doesn't exist
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'KHCL Logistics', 'khcl-logistics')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update all users to belong to this organization
UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 3: Verify the fix
SELECT 'Users after fix:' as info;
SELECT id, email, organization_id, role FROM users;

SELECT 'Organization:' as info;
SELECT id, name, slug FROM organizations;

-- Step 4: Check that customers are now visible
SELECT 'Customers (should show 5):' as info;
SELECT id, company_name, organization_id FROM customers LIMIT 5;
