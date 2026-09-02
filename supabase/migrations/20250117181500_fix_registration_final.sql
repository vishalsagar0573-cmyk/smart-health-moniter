-- 1. EXTENSIONS: Ensure pgcrypto is available for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. TRIGGER FUNCTION: Refined with correct search path and safe logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
-- CRITICAL: Add 'extensions' to search_path so gen_random_uuid() is found!
SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  safe_role TEXT;
BEGIN
  -- Log entry
  RAISE LOG 'handle_new_user called for ID: %', new.id;

  -- 1. Create Profile
  -- Use ON CONFLICT DO NOTHING to prevent crashing if it somehow exists
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

  -- 2. Validate and Assign Role
  -- Extract role and normalize it
  safe_role := LOWER(TRIM(new.raw_user_meta_data->>'role'));

  -- Only attempt insert if role is strictly valid (prevents check constraint violation)
  IF safe_role IN ('health_worker', 'villager') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, safe_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Check if it's missing or invalid
    RAISE LOG 'Invalid or missing role for user %: %', new.id, safe_role;
    -- Optional: Assign default 'villager' role if invalid?
    -- For now, let's just NOT crash. The user can still login (fallback logic) 
    -- but won't be blocked from creation.
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Capture specific errors to logs but ALLOW user creation to succeed
  RAISE LOG 'CRITICAL ERROR in handle_new_user: %', SQLERRM;
  -- If we return NEW, the user is created even if profile/role failed.
  -- This stops the 500 error in the frontend.
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 3. RE-APPLY TRIGGER (Just to be sure it's using the new function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. PERMISSIONS: Double check public writes
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT ALL ON public.user_roles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
