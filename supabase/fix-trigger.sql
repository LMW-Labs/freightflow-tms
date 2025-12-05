-- FIX TRIGGER - Better error handling and permissions

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION handle_staff_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check for pending staff invite
  BEGIN
    SELECT * INTO invite_record
    FROM public.staff_invites
    WHERE email = NEW.email
      AND accepted_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Create user record
      INSERT INTO public.users (id, organization_id, email, full_name, role)
      VALUES (
        NEW.id,
        invite_record.organization_id,
        NEW.email,
        COALESCE(invite_record.full_name, NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        invite_record.role
      );

      -- Mark invite as accepted
      UPDATE public.staff_invites
      SET accepted_at = NOW()
      WHERE id = invite_record.id;

      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Staff invite processing failed: %', SQLERRM;
  END;

  -- Check for pending customer user invite
  BEGIN
    SELECT * INTO invite_record
    FROM public.customer_user_invites
    WHERE email = NEW.email
      AND accepted_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Create customer user record
      INSERT INTO public.customer_users (id, customer_id, email, full_name, role)
      VALUES (
        NEW.id,
        invite_record.customer_id,
        NEW.email,
        COALESCE(invite_record.full_name, NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        invite_record.role
      );

      -- Mark invite as accepted
      UPDATE public.customer_user_invites
      SET accepted_at = NOW()
      WHERE id = invite_record.id;

      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Customer user invite processing failed: %', SQLERRM;
  END;

  -- No invite found - that's fine, just return
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_staff_invite_acceptance();

-- Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT ALL ON public.customer_users TO postgres, service_role;
GRANT ALL ON public.staff_invites TO postgres, service_role;
GRANT ALL ON public.customer_user_invites TO postgres, service_role;
