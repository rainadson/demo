create table public.lead_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  lead_id uuid not null,
  storage_path text not null unique check(length(storage_path) between 1 and 500),
  original_name text not null check(length(original_name) between 1 and 255),
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes bigint not null check(size_bytes between 1 and 5000000),
  created_at timestamptz not null default now(),
  unique(company_id,id),
  foreign key(company_id,lead_id) references public.leads(company_id,id) on delete cascade
);
create index lead_attachments_lead_idx on public.lead_attachments(company_id,lead_id);
alter table public.lead_attachments enable row level security;
revoke all on public.lead_attachments from anon,authenticated;
grant select,delete on public.lead_attachments to authenticated;
create policy lead_attachments_commercial on public.lead_attachments for select to authenticated
  using(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[]));
create policy lead_attachments_delete on public.lead_attachments for delete to authenticated
  using(private.has_role(company_id,array['ADMIN']::public.app_role[]));

create table private.lead_rate_limits (
  attempt_key text not null,
  attempt_day date not null default current_date,
  attempts integer not null default 0 check(attempts >= 0),
  primary key(attempt_key,attempt_day)
);
revoke all on private.lead_rate_limits from public,anon,authenticated;
create function public.register_lead_attempt(request_key text, allowed_attempts integer default 5) returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_attempts integer;
begin
  if length(request_key) <> 64 or allowed_attempts not between 1 and 20 then return false; end if;
  insert into private.lead_rate_limits(attempt_key,attempt_day,attempts)
  values(request_key,current_date,1)
  on conflict(attempt_key,attempt_day) do update set attempts=private.lead_rate_limits.attempts+1
  returning attempts into current_attempts;
  return current_attempts <= allowed_attempts;
end;
$$;
revoke all on function public.register_lead_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.register_lead_attempt(text,integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lead-attachments','lead-attachments',false,5000000,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy lead_files_internal_read on storage.objects for select to authenticated using(
  bucket_id='lead-attachments' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.company_id::text=(storage.foldername(name))[1] and p.role in ('ADMIN','COMERCIAL'))
);
create policy lead_files_admin_delete on storage.objects for delete to authenticated using(
  bucket_id='lead-attachments' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.active and p.company_id::text=(storage.foldername(name))[1] and p.role='ADMIN')
);
