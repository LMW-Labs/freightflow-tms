-- Run this to check if organization IDs match

-- Check your organization
SELECT 'Organizations' as table_name, id, name FROM organizations;

-- Check your user's organization
SELECT 'Your User' as info, id, email, organization_id FROM users;

-- Check customers organization
SELECT 'Customers org_id' as info, id, company_name, organization_id FROM customers LIMIT 3;

-- Check loads organization
SELECT 'Loads org_id' as info, id, reference_number, organization_id FROM loads LIMIT 3;

-- If organization IDs don't match, run this to fix:
-- UPDATE customers SET organization_id = (SELECT organization_id FROM users LIMIT 1);
-- UPDATE carriers SET organization_id = (SELECT organization_id FROM users LIMIT 1);
-- UPDATE loads SET organization_id = (SELECT organization_id FROM users LIMIT 1);
