-- Add DELETE policy for health_reports
-- Health workers can delete any health report
CREATE POLICY "Health workers can delete reports"
  ON public.health_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'health_worker'));

-- Also allow villagers to delete their own reports
CREATE POLICY "Villagers can delete their own reports"
  ON public.health_reports FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    public.has_role(auth.uid(), 'villager')
  );




