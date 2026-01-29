-- Create storage bucket for training files
insert into storage.buckets (id, name, public)
values ('training-files', 'training-files', false)
on conflict (id) do nothing;

-- Set up storage policies for training-files bucket
-- Allow authenticated users to upload files
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (bucket_id = 'training-files');

-- Allow authenticated users to download their files
create policy "Allow authenticated downloads"
on storage.objects for select
to authenticated
using (bucket_id = 'training-files');

-- Allow authenticated users to delete their files
create policy "Allow authenticated deletes"
on storage.objects for delete
to authenticated
using (bucket_id = 'training-files');

-- For public access (if your Supabase is using anon key without auth)
create policy "Allow public uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'training-files');

create policy "Allow public downloads"
on storage.objects for select
to anon
using (bucket_id = 'training-files');

create policy "Allow public deletes"
on storage.objects for delete
to anon
using (bucket_id = 'training-files');
