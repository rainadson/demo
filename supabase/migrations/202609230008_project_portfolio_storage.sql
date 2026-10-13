insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-portfolio','project-portfolio',true,5000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=true,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy portfolio_images_manager_insert on storage.objects
for insert to authenticated with check(
  bucket_id='project-portfolio' and exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.active
      and p.company_id::text=(storage.foldername(name))[1]
      and p.role in ('ADMIN','GESTOR_OBRA')
  )
);

create policy portfolio_images_manager_update on storage.objects
for update to authenticated using(
  bucket_id='project-portfolio' and exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.active
      and p.company_id::text=(storage.foldername(name))[1]
      and p.role in ('ADMIN','GESTOR_OBRA')
  )
) with check(
  bucket_id='project-portfolio' and exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.active
      and p.company_id::text=(storage.foldername(name))[1]
      and p.role in ('ADMIN','GESTOR_OBRA')
  )
);

create policy portfolio_images_manager_delete on storage.objects
for delete to authenticated using(
  bucket_id='project-portfolio' and exists(
    select 1 from public.profiles p
    where p.id=auth.uid()
      and p.active
      and p.company_id::text=(storage.foldername(name))[1]
      and p.role in ('ADMIN','GESTOR_OBRA')
  )
);

create index if not exists project_photos_public_idx
on public.project_photos(company_id,project_id,phase,created_at desc)
where publicable=true;
