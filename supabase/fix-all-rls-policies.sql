-- Fix ALL RLS policies that have recursion issues
-- Replace all "SELECT organization_id FROM users WHERE id = auth.uid()"
-- with "get_user_organization_id(auth.uid())"

-- Make sure the function exists first
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = user_id;
$$;

GRANT EXECUTE ON FUNCTION get_user_organization_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id(uuid) TO anon;

-- ============ ORGANIZATIONS ============
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = get_user_organization_id(auth.uid())
  );

-- ============ CUSTOMERS ============
DROP POLICY IF EXISTS "Org users can view customers" ON customers;
CREATE POLICY "Org users can view customers" ON customers
  FOR SELECT USING (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can insert customers" ON customers;
CREATE POLICY "Org users can insert customers" ON customers
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can update customers" ON customers;
CREATE POLICY "Org users can update customers" ON customers
  FOR UPDATE USING (
    organization_id = get_user_organization_id(auth.uid())
  );

-- ============ CARRIERS ============
DROP POLICY IF EXISTS "Org users can view carriers" ON carriers;
CREATE POLICY "Org users can view carriers" ON carriers
  FOR SELECT USING (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can insert carriers" ON carriers;
CREATE POLICY "Org users can insert carriers" ON carriers
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can update carriers" ON carriers;
CREATE POLICY "Org users can update carriers" ON carriers
  FOR UPDATE USING (
    organization_id = get_user_organization_id(auth.uid())
  );

-- ============ DRIVERS ============
DROP POLICY IF EXISTS "Org users can view drivers" ON drivers;
CREATE POLICY "Org users can view drivers" ON drivers
  FOR SELECT USING (
    carrier_id IN (
      SELECT id FROM carriers WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org users can insert drivers" ON drivers;
CREATE POLICY "Org users can insert drivers" ON drivers
  FOR INSERT WITH CHECK (
    carrier_id IN (
      SELECT id FROM carriers WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- ============ LOADS ============
DROP POLICY IF EXISTS "Org users can view all loads" ON loads;
CREATE POLICY "Org users can view all loads" ON loads
  FOR SELECT USING (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can insert loads" ON loads;
CREATE POLICY "Org users can insert loads" ON loads
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
  );

DROP POLICY IF EXISTS "Org users can update loads" ON loads;
CREATE POLICY "Org users can update loads" ON loads
  FOR UPDATE USING (
    organization_id = get_user_organization_id(auth.uid())
  );

-- ============ LOCATION HISTORY ============
DROP POLICY IF EXISTS "Org users can view location history" ON location_history;
CREATE POLICY "Org users can view location history" ON location_history
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- ============ DOCUMENTS ============
DROP POLICY IF EXISTS "Org users can view documents" ON documents;
CREATE POLICY "Org users can view documents" ON documents
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- ============ STATUS HISTORY ============
DROP POLICY IF EXISTS "Org users can view status history" ON status_history;
CREATE POLICY "Org users can view status history" ON status_history
  FOR SELECT USING (
    load_id IN (
      SELECT id FROM loads WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- Verify the function works
SELECT get_user_organization_id('e9043d90-b0aa-41f9-a5f4-30a9339d0fcb') as org_id;
