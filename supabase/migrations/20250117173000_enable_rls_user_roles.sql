-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy to allow service_role (and potentially trigger/functions) to manage roles
-- Note: triggers executing as security definer bypass RLS, but explicit policies for admins are good.
-- For now, just reading own roles is sufficient for the frontend.
