insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'documents-private',
  'documents-private',
  false,
  10000000,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy documents_storage_read on storage.objects for select to authenticated
using(
  bucket_id='documents-private' and
  private.has_role((storage.foldername(name))[1]::uuid,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])
);
create policy documents_storage_insert on storage.objects for insert to authenticated
with check(
  bucket_id='documents-private' and
  private.has_role((storage.foldername(name))[1]::uuid,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])
);
create policy documents_storage_update on storage.objects for update to authenticated
using(
  bucket_id='documents-private' and
  private.has_role((storage.foldername(name))[1]::uuid,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])
)
with check(
  bucket_id='documents-private' and
  private.has_role((storage.foldername(name))[1]::uuid,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])
);
create policy documents_storage_delete on storage.objects for delete to authenticated
using(
  bucket_id='documents-private' and
  private.has_role((storage.foldername(name))[1]::uuid,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])
);
