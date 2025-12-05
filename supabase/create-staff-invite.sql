-- CREATE STAFF INVITE FOR TESTING
-- This creates an invite for dispatch@khcllogistics.com

-- First, get the organization ID (assuming you have one org)
DO $$
DECLARE
  org_id UUID;
  admin_id UUID;
BEGIN
  -- Get the organization
  SELECT id INTO org_id FROM organizations LIMIT 1;

  -- Get an admin user to be the inviter
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create one first.';
  END IF;

  -- Create the staff invite
  INSERT INTO staff_invites (
    organization_id,
    email,
    full_name,
    role,
    invited_by,
    expires_at
  ) VALUES (
    org_id,
    'dispatch@khcllogistics.com',
    'Dispatch User',
    'broker',
    admin_id,
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Staff invite created for dispatch@khcllogistics.com';
END $$;

-- Verify the invite was created
SELECT
  id,
  email,
  full_name,
  role,
  token,
  expires_at,
  accepted_at
FROM staff_invites
WHERE email = 'dispatch@khcllogistics.com';
