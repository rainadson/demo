-- Foundation only. Further operational tables are introduced with their modules.
create extension if not exists pgcrypto;
create type public.app_role as enum ('ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO','COLABORADOR','CLIENTE');
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  legal_name text, tax_id text, address text, phone text, email text,
  website text, logo_url text, iban text,
  default_vat numeric(5,2) check (default_vat between 0 and 100),
  currency text not null default 'EUR' check (length(currency)=3),
  timezone text not null default 'Europe/Lisbon',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  full_name text not null check (length(full_name) between 1 and 200),
  role public.app_role not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,id)
);
create index profiles_company_idx on public.profiles(company_id);
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.has_role(tenant uuid, allowed public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.company_id=tenant and p.active and p.role=any(allowed));
$$;
revoke all on function private.has_role(uuid,public.app_role[]) from public;
grant execute on function private.has_role(uuid,public.app_role[]) to authenticated;

create table public.clients (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 name text not null check(length(name) between 1 and 200), nif text, phone text, email text, address text,
 kind text not null default 'particular' check(kind in ('particular','empresa')), notes text,
 portal_user_id uuid references auth.users(id),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), unique(company_id,portal_user_id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 name text not null check(length(name) between 1 and 200), phone text, email text,
 source text not null default 'MANUAL' check(source in ('MANUAL','WEBSITE','INDICACAO','OUTRO')),
 service text not null, location text, estimated_value_cents bigint check(estimated_value_cents>=0),
 assigned_to uuid, status text not null default 'NOVO' check(status in ('NOVO','CONTACTADO','QUALIFICADO','VISITA_AGENDADA','VISITA_REALIZADA','ORCAMENTO','PROPOSTA_ENVIADA','NEGOCIACAO','GANHO','PERDIDO')),
 priority text not null default 'NORMAL' check(priority in ('BAIXA','NORMAL','ALTA')),
 next_action text, next_action_at timestamptz, consent_at timestamptz, consent_version text,
 details jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,assigned_to) references public.profiles(company_id,id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 client_id uuid not null, name text not null check(length(name) between 1 and 200), address text,
 manager_id uuid, status text not null default 'PLANEAMENTO' check(status in ('PLANEAMENTO','PREPARACAO','EM_EXECUCAO','PAUSADA','AGUARDANDO_CLIENTE','AGUARDANDO_MATERIAL','CONCLUIDA','ENTREGUE')),
 progress numeric(5,2) not null default 0 check(progress between 0 and 100),
 starts_on date, ends_on date, check(ends_on is null or starts_on is null or ends_on>=starts_on),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id),
 foreign key(company_id,manager_id) references public.profiles(company_id,id)
);
-- Costs are physically separate from the operational project record.
create table public.project_financials (
 id uuid primary key default gen_random_uuid(), project_id uuid not null unique,
 company_id uuid not null references public.companies(id),
 contracted_cents bigint not null default 0 check(contracted_cents>=0),
 estimated_cost_cents bigint not null default 0 check(estimated_cost_cents>=0),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(company_id,project_id) references public.projects(company_id,id)
);
create table public.project_members (
 company_id uuid not null references public.companies(id), project_id uuid not null, user_id uuid not null,
 primary key(project_id,user_id),
 foreign key(company_id,project_id) references public.projects(company_id,id),
 foreign key(company_id,user_id) references public.profiles(company_id,id)
);
create function private.is_assigned(tenant uuid, project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.project_members m join public.profiles p on p.id=m.user_id
 where m.company_id=tenant and m.project_id=project and m.user_id=auth.uid() and p.active and p.company_id=tenant);
$$;
revoke all on function private.is_assigned(uuid,uuid) from public;
grant execute on function private.is_assigned(uuid,uuid) to authenticated;
create table public.audit_log (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 actor_id uuid, entity text not null, entity_id uuid not null, action text not null,
 created_at timestamptz not null default now()
);
create function private.stamp_record() returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_OP='UPDATE' then
   if new.company_id is distinct from old.company_id then raise exception 'Company cannot be changed'; end if;
   new.created_at=old.created_at; new.created_by=old.created_by;
 else new.created_at=now(); new.created_by=auth.uid(); end if;
 new.updated_at=now(); new.updated_by=auth.uid(); return new;
end;
$$;
create function private.audit_record() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if TG_OP='DELETE' then
 insert into public.audit_log(company_id,actor_id,entity,entity_id,action) values(old.company_id,auth.uid(),TG_TABLE_NAME,old.id,TG_OP); return old;
 else
 insert into public.audit_log(company_id,actor_id,entity,entity_id,action) values(new.company_id,auth.uid(),TG_TABLE_NAME,new.id,TG_OP); return new;
 end if;
end;
$$;
revoke all on function private.audit_record() from public;
revoke all on function private.stamp_record() from public;

do $$ declare t text; begin
 foreach t in array array['leads','clients','projects','project_financials'] loop
 execute format('create trigger stamp before insert or update on public.%I for each row execute function private.stamp_record()',t);
 execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_record()',t);
 execute format('create index %I on public.%I(company_id,created_at desc)',t||'_tenant_created_idx',t);
 end loop;
 foreach t in array array['companies','profiles','leads','clients','projects','project_financials','project_members','audit_log'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 end loop;
end $$;
create index projects_client_idx on public.projects(company_id,client_id);
create index members_user_idx on public.project_members(company_id,user_id);
create index audit_tenant_created_idx on public.audit_log(company_id,created_at desc);

grant select,update on public.companies to authenticated;
grant select on public.profiles to authenticated;
-- Profile/company provisioning is intentionally restricted to trusted administration.
grant select,insert,update,delete on public.leads,public.clients,public.projects,public.project_financials,public.project_members to authenticated;
grant select on public.audit_log to authenticated;
create policy company_read on public.companies for select to authenticated using(private.has_role(id,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO','COLABORADOR']::public.app_role[]));
create policy company_admin_update on public.companies for update to authenticated using(private.has_role(id,array['ADMIN']::public.app_role[])) with check(private.has_role(id,array['ADMIN']::public.app_role[]));
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid() and active);
create policy profile_admin_read on public.profiles for select to authenticated using(private.has_role(company_id,array['ADMIN']::public.app_role[]));
create policy leads_commercial on public.leads for all to authenticated using(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[]));
create policy clients_commercial on public.clients for all to authenticated using(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[]));
create policy projects_management on public.projects for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy projects_assigned on public.projects for select to authenticated using(private.has_role(company_id,array['COLABORADOR']::public.app_role[]) and private.is_assigned(company_id,id));
create policy project_finance on public.project_financials for all to authenticated using(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[]));
create policy members_management on public.project_members for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy audit_admin on public.audit_log for select to authenticated using(private.has_role(company_id,array['ADMIN']::public.app_role[]));
-- No anonymous reads/writes, no client access to internal tables, no self-service role edits.
