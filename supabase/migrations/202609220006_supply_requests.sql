-- Public employee requests are written only by the server's service role.
-- Names and work locations are self-reported and are not linked to private projects.
create table public.supply_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  reference text not null unique check (length(reference) between 8 and 40),
  requester_name text not null check (length(requester_name) between 2 and 160),
  requester_phone text not null check (length(requester_phone) between 6 and 40),
  work_site text not null check (length(work_site) between 2 and 160),
  kind text not null check (kind in ('MATERIAL','FERRAMENTA')),
  item_name text not null check (length(item_name) between 2 and 160),
  quantity numeric(10,3) not null check (quantity > 0 and quantity <= 10000),
  unit text not null check (unit in ('unidade','caixa','metro','saco','litro','outro')),
  needed_on date not null,
  priority text not null default 'NORMAL' check (priority in ('NORMAL','URGENTE')),
  notes text not null default '' check (length(notes) <= 1000),
  status text not null default 'NOVO' check (status in ('NOVO','EM_ANALISE','APROVADO','RECUSADO','ENTREGUE')),
  manager_note text not null default '' check (length(manager_note) <= 1000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id,id)
);

create index supply_requests_tenant_status_idx on public.supply_requests(company_id,status,created_at desc);
create trigger stamp before insert or update on public.supply_requests
  for each row execute function private.stamp_record();
create trigger audit after insert or update or delete on public.supply_requests
  for each row execute function private.audit_record();

alter table public.supply_requests enable row level security;
revoke all on public.supply_requests from anon,authenticated;
grant select,update on public.supply_requests to authenticated;
grant select,insert,update on public.supply_requests to service_role;

create policy supply_requests_manager_read on public.supply_requests
  for select to authenticated
  using (private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy supply_requests_manager_update on public.supply_requests
  for update to authenticated
  using (private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]))
  with check (private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
