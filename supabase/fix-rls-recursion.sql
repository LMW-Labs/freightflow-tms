-- Fix infinite recursion in RLS policies
-- The issue: users table policy queries itself, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in same org" ON users;

-- Create a new policy that doesn't cause recursion
-- Users can view their own record (no recursion)
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can view other users in same org (using a security definer function)
-- First, create a function that bypasses RLS to get the user's org
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = user_id;
$$;

-- Now create a policy that uses this function
CREATE POLICY "Users can view users in same org" ON users
  FOR SELECT USING (
    organization_id = get_user_organization_id(auth.uid())
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_organization_id(uuid) TO authenticated;
