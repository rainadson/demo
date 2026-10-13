-- Operational, procurement and financial modules for the construction CRM.
create table public.project_phases (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null,
 name text not null check(length(name) between 1 and 160), position integer not null check(position>0), status text not null default 'PENDENTE' check(status in ('PENDENTE','EM_CURSO','CONCLUIDA','BLOQUEADA')),
 progress numeric(5,2) not null default 0 check(progress between 0 and 100), starts_on date, ends_on date,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), unique(project_id,position), foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null, phase_id uuid,
 title text not null check(length(title) between 1 and 240), description text, assigned_to uuid,
 status text not null default 'POR_FAZER' check(status in ('POR_FAZER','EM_CURSO','BLOQUEADA','CONCLUIDA')), priority text not null default 'NORMAL' check(priority in ('BAIXA','NORMAL','ALTA','URGENTE')),
 due_on date, completed_at timestamptz,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade,
 foreign key(company_id,phase_id) references public.project_phases(company_id,id), foreign key(company_id,assigned_to) references public.profiles(company_id,id)
);
create table public.task_comments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), task_id uuid not null,
 body text not null check(length(body) between 1 and 5000), created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(company_id,task_id) references public.tasks(company_id,id) on delete cascade
);
create table public.workers (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), profile_id uuid,
 name text not null check(length(name) between 1 and 200), kind text not null default 'COLABORADOR' check(kind in ('COLABORADOR','PRESTADOR','SUBEMPREITEIRO')),
 phone text, email text, specialty text, hourly_cost_cents bigint not null default 0 check(hourly_cost_cents>=0), active boolean not null default true,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,profile_id) references public.profiles(company_id,id)
);
create table public.project_workers (
 company_id uuid not null references public.companies(id), project_id uuid not null, worker_id uuid not null, starts_on date, ends_on date,
 primary key(project_id,worker_id), foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade,
 foreign key(company_id,worker_id) references public.workers(company_id,id)
);
create table public.time_entries (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null, worker_id uuid not null,
 worked_on date not null, hours numeric(6,2) not null check(hours>0 and hours<=24), activity text,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,project_id) references public.projects(company_id,id), foreign key(company_id,worker_id) references public.workers(company_id,id)
);
create table public.suppliers (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), name text not null check(length(name) between 1 and 200),
 tax_id text, phone text, email text, address text, category text, notes text, active boolean not null default true,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id)
);
create table public.materials (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), supplier_id uuid,
 name text not null check(length(name) between 1 and 200), category text, unit text not null check(unit in ('un','m','m²','m³','kg','L','cx','dia','hora')),
 last_cost_cents bigint not null default 0 check(last_cost_cents>=0), average_cost_cents bigint not null default 0 check(average_cost_cents>=0), active boolean not null default true,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,supplier_id) references public.suppliers(company_id,id)
);
create table public.purchases (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null, supplier_id uuid,
 status text not null default 'SOLICITADA' check(status in ('SOLICITADA','APROVADA','COMPRADA','RECEBIDA','CANCELADA')), requested_on date not null default current_date,
 total_cents bigint not null default 0 check(total_cents>=0), notes text,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,id), foreign key(company_id,project_id) references public.projects(company_id,id), foreign key(company_id,supplier_id) references public.suppliers(company_id,id)
);
create table public.purchase_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), purchase_id uuid not null, material_id uuid,
 description text not null, quantity numeric(12,3) not null check(quantity>0), unit text not null, unit_cost_cents bigint not null check(unit_cost_cents>=0), total_cents bigint not null check(total_cents>=0),
 foreign key(company_id,purchase_id) references public.purchases(company_id,id) on delete cascade, foreign key(company_id,material_id) references public.materials(company_id,id)
);
create table public.expenses (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid, supplier_id uuid,
 category text not null check(category in ('MATERIAIS','MAO_DE_OBRA','SUBEMPREITADA','TRANSPORTE','COMBUSTIVEL','FERRAMENTAS','EQUIPAMENTOS','LICENCAS','RESIDUOS','OUTROS')),
 description text not null check(length(description) between 1 and 500), net_cents bigint not null check(net_cents>=0), vat_cents bigint not null default 0 check(vat_cents>=0), total_cents bigint not null check(total_cents>=0),
 spent_on date not null, payment_method text, status text not null default 'PAGO' check(status in ('PENDENTE','PAGO','CANCELADO')),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id),
 foreign key(company_id,project_id) references public.projects(company_id,id), foreign key(company_id,supplier_id) references public.suppliers(company_id,id)
);
create table public.payment_schedules (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null, client_id uuid not null,
 description text not null, amount_cents bigint not null check(amount_cents>0), due_on date not null,
 status text not null default 'PENDENTE' check(status in ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id),
 foreign key(company_id,project_id) references public.projects(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), schedule_id uuid not null, amount_cents bigint not null check(amount_cents>0),
 received_on date not null, payment_method text, reference text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(company_id,schedule_id) references public.payment_schedules(company_id,id) on delete cascade
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), client_id uuid, project_id uuid, supplier_id uuid, worker_id uuid,
 kind text not null check(kind in ('ORCAMENTO','CONTRATO','PLANTA','FATURA','RECIBO','FOTOGRAFIA','LICENCA','RELATORIO','OUTRO')),
 name text not null, storage_path text not null, mime_type text not null, size_bytes bigint not null check(size_bytes>0),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(company_id,id),
 foreign key(company_id,client_id) references public.clients(company_id,id), foreign key(company_id,project_id) references public.projects(company_id,id),
 foreign key(company_id,supplier_id) references public.suppliers(company_id,id), foreign key(company_id,worker_id) references public.workers(company_id,id)
);
create table public.project_photos (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null,
 phase text not null check(phase in ('ANTES','DURANTE','DEPOIS')), description text, storage_path text not null, publicable boolean not null default false, published_at timestamptz,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table public.daily_logs (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null, logged_on date not null,
 weather text, summary text not null check(length(summary) between 1 and 5000), blockers text, workers_count integer check(workers_count>=0),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,id), unique(project_id,logged_on),
 foreign key(company_id,project_id) references public.projects(company_id,id) on delete cascade
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), project_id uuid not null unique,
 rating integer check(rating between 1 and 5), comment text, publication_consent boolean not null default false, requested_at timestamptz, received_at timestamptz,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(company_id,project_id) references public.projects(company_id,id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), user_id uuid,
 kind text not null, title text not null, body text, href text, read_at timestamptz, occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(), foreign key(company_id,user_id) references public.profiles(company_id,id)
);

create index tasks_project_status_idx on public.tasks(company_id,project_id,status);
create index tasks_due_idx on public.tasks(company_id,due_on) where status<>'CONCLUIDA';
create index time_entries_project_date_idx on public.time_entries(company_id,project_id,worked_on);
create index purchases_project_status_idx on public.purchases(company_id,project_id,status);
create index expenses_project_date_idx on public.expenses(company_id,project_id,spent_on desc);
create index schedules_due_idx on public.payment_schedules(company_id,status,due_on);
create index documents_project_idx on public.documents(company_id,project_id,created_at desc);
create index daily_logs_project_date_idx on public.daily_logs(company_id,project_id,logged_on desc);
create index notifications_user_idx on public.notifications(company_id,user_id,read_at,occurred_at desc);

do $$ declare t text; begin
 foreach t in array array['project_phases','tasks','task_comments','workers','project_workers','time_entries','suppliers','materials','purchases','purchase_items','expenses','payment_schedules','payments','documents','project_photos','daily_logs','reviews','notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
 foreach t in array array['project_phases','tasks','workers','time_entries','suppliers','materials','purchases','expenses','payment_schedules','daily_logs','reviews'] loop
  execute format('create trigger stamp before insert or update on public.%I for each row execute function private.stamp_record()',t);
  execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_record()',t);
 end loop;
end $$;

create policy operations_management on public.project_phases for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy tasks_management on public.tasks for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id)) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id));
create policy task_comments_access on public.task_comments for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or exists(select 1 from public.tasks t where t.id=task_id and private.is_assigned(company_id,t.project_id))) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or exists(select 1 from public.tasks t where t.id=task_id and private.is_assigned(company_id,t.project_id)));
create policy workers_management on public.workers for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy project_workers_management on public.project_workers for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy time_management on public.time_entries for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id)) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id));
create policy procurement_suppliers on public.suppliers for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[]));
create policy procurement_materials on public.materials for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[]));
create policy procurement_purchases on public.purchases for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[]));
create policy procurement_items on public.purchase_items for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA','FINANCEIRO']::public.app_role[]));
create policy finance_expenses on public.expenses for all to authenticated using(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[]));
create policy finance_schedules on public.payment_schedules for all to authenticated using(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[]));
create policy finance_payments on public.payments for all to authenticated using(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','FINANCEIRO']::public.app_role[]));
create policy documents_internal on public.documents for all to authenticated using(private.has_role(company_id,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','COMERCIAL','GESTOR_OBRA','FINANCEIRO']::public.app_role[]));
create policy photos_management on public.project_photos for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]));
create policy logs_management on public.daily_logs for all to authenticated using(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id)) with check(private.has_role(company_id,array['ADMIN','GESTOR_OBRA']::public.app_role[]) or private.is_assigned(company_id,project_id));
create policy reviews_management on public.reviews for all to authenticated using(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[])) with check(private.has_role(company_id,array['ADMIN','COMERCIAL']::public.app_role[]));
create policy notifications_own on public.notifications for select to authenticated using(company_id=(select p.company_id from public.profiles p where p.id=auth.uid()) and (user_id is null or user_id=auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
