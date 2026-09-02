-- Create a public bucket for water images
insert into storage.buckets (id, name, public)
values ('water_images', 'water_images', true)
on conflict (id) do nothing;

-- Set up access policies for the water_images bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'water_images' );

create policy "Authenticated Users Can Upload"
  on storage.objects for insert
  with check ( bucket_id = 'water_images' and auth.role() = 'authenticated' );
