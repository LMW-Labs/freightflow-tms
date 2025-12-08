-- Migration: Add new user roles (dispatcher, salesperson_1, salesperson_2)
-- Run this in Supabase SQL Editor

-- Drop the existing constraint and add new one with additional roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'broker', 'dispatcher', 'salesperson_1', 'salesperson_2', 'accountant'));

-- Also update staff_invites table if it exists
ALTER TABLE staff_invites DROP CONSTRAINT IF EXISTS staff_invites_role_check;
ALTER TABLE staff_invites ADD CONSTRAINT staff_invites_role_check
  CHECK (role IN ('admin', 'broker', 'dispatcher', 'salesperson_1', 'salesperson_2', 'accountant'));
