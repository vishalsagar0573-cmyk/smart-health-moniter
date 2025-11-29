-- Ensure RLS is enabled on health_reports
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

-- Villager can delete their own reports
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'health_reports' AND policyname = 'Villager can delete own reports'
  ) THEN
    DROP POLICY "Villager can delete own reports" ON public.health_reports;
  END IF;
END$$;

CREATE POLICY "Villager can delete own reports"
  ON public.health_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Health worker can delete any report
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'health_reports' AND policyname = 'Health worker can delete any report'
  ) THEN
    DROP POLICY "Health worker can delete any report" ON public.health_reports;
  END IF;
END$$;

CREATE POLICY "Health worker can delete any report"
  ON public.health_reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'health_worker'
    )
  );

-- Optional: Allow health workers to select all reports (useful for list refresh after delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'health_reports' AND policyname = 'Health worker can view reports'
  ) THEN
    CREATE POLICY "Health worker can view reports"
      ON public.health_reports
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 
          FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'health_worker'
        ) OR user_id = auth.uid()
      );
  END IF;
END$$;






