-- Drop the policy if it exists to ensure we can recreate it with the correct permissions
DROP POLICY IF EXISTS "Authenticated users can update reports" ON health_reports;

-- Recreate the policy to allow any authenticated user to update health_reports
CREATE POLICY "Authenticated users can update reports"
ON health_reports
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
