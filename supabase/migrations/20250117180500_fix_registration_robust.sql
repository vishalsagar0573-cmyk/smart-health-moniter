-- 1. CLEANUP: Drop existing objects to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. TABLES: Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('health_worker', 'villager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure unique constraint for user_roles to prevent duplicates
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
    ) THEN
      ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
    END IF;
  END
  $$;
COMMIT;

-- 3. PERMISSIONS: specific grants to avoid permission denied errors
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO postgres, service_role;
GRANT ALL ON public.user_roles TO postgres, service_role;
-- Allow authenticated users to view/insert (controlled by RLS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.user_roles TO authenticated;

-- 4. POLICIES: Re-define policies safely
-- Drop first to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 5. TRIGGER FUNCTION: Robust implementation with logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log for debugging (found in Database > Postgres Logs)
  RAISE LOG 'Handle new user: %', new.id;

  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

  -- Assign role from metadata
  IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, new.raw_user_meta_data->>'role')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but allowing the user creation to proceed? 
  -- No, better to fail and show error than have a broken user.
  -- But we capture detailed error for logs.
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RAISE; -- Re-throw error to abort transaction
END;
$$ LANGUAGE plpgsql;

-- 6. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
