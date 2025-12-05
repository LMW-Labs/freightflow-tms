-- INVITE SYSTEM SCHEMA
-- Run this in your Supabase SQL Editor after the main schema

-- STAFF INVITES (admin invites brokers/accountants)
CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'broker' CHECK (role IN ('admin', 'broker', 'accountant')),
  invited_by UUID REFERENCES users(id),
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER USER INVITES (broker invites customer contacts)
CREATE TABLE IF NOT EXISTS customer_user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  invited_by UUID REFERENCES users(id),
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(email);
CREATE INDEX IF NOT EXISTS idx_customer_user_invites_token ON customer_user_invites(token);
CREATE INDEX IF NOT EXISTS idx_customer_user_invites_email ON customer_user_invites(email);

-- RLS
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_user_invites ENABLE ROW LEVEL SECURITY;

-- Staff invites: Only admins can manage
CREATE POLICY "Admins can view staff invites" ON staff_invites
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create staff invites" ON staff_invites
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update staff invites" ON staff_invites
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customer user invites: Org users can manage
CREATE POLICY "Org users can view customer user invites" ON customer_user_invites
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Org users can create customer user invites" ON customer_user_invites
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Org users can update customer user invites" ON customer_user_invites
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Public access for invite acceptance (by token)
CREATE POLICY "Anyone can view invite by token" ON staff_invites
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view customer invite by token" ON customer_user_invites
  FOR SELECT USING (true);

-- FUNCTION: Handle staff invite acceptance
-- This runs when a new auth user is created and links them to the invite
CREATE OR REPLACE FUNCTION handle_staff_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check for pending staff invite
  SELECT * INTO invite_record
  FROM staff_invites
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Create user record
    INSERT INTO users (id, organization_id, email, full_name, role)
    VALUES (
      NEW.id,
      invite_record.organization_id,
      NEW.email,
      COALESCE(invite_record.full_name, NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      invite_record.role
    );

    -- Mark invite as accepted
    UPDATE staff_invites
    SET accepted_at = NOW()
    WHERE id = invite_record.id;

    RETURN NEW;
  END IF;

  -- Check for pending customer user invite
  SELECT * INTO invite_record
  FROM customer_user_invites
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Create customer user record
    INSERT INTO customer_users (id, customer_id, email, full_name, role)
    VALUES (
      NEW.id,
      invite_record.customer_id,
      NEW.email,
      COALESCE(invite_record.full_name, NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      invite_record.role
    );

    -- Mark invite as accepted
    UPDATE customer_user_invites
    SET accepted_at = NOW()
    WHERE id = invite_record.id;

    RETURN NEW;
  END IF;

  -- No invite found - don't create any user record
  -- They'll get a 404/unauthorized when trying to access the app
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Run on new auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_staff_invite_acceptance();
