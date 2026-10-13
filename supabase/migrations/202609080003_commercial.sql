create table public.lead_activities (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), lead_id uuid not null,
 kind text not null check(kind in ('LEAD_CRIADO','CONTACTO','NOTA','VISITA','ORCAMENTO','EMAIL','WHATSAPP','MUDANCA_ETAPA')),
 body text check(body is null or length(body)<=5000), metadata jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(company_id,lead_id) references public.leads(company_id,id) on delete cascade
);
create index lead_activities_timeline_idx on public.lead_activities(company_id,lead_id,created_at desc);
create table public.visits (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), lead_id uuid, client_id uuid,
 address text not null, starts_at timestamptz not null, assigned_to uuid,
 status text not null default 'AGENDADA' check(status in ('AGENDADA','CONFIRMADA','REALIZADA','CANCELADA')),
 checklist jsonb not null default '{}'::jsonb, notes text,
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(lead_id is not null or client_id is not null), unique(company_id,id),
 foreign key(company_id,lead_id) references public.leads(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id),
 foreign key(company_id,assigned_to) references public.profiles(company_id,id)
);
create index visits_agenda_idx on public.visits(company_id,starts_at);
create table public.quotes (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), lead_id uuid, client_id uuid,
 number text not null, status text not null default 'RASCUNHO' check(status in ('RASCUNHO','ENVIADO','ACEITE','RECUSADO','EXPIRADO')),
 current_version integer not null default 1 check(current_version>0),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(lead_id is not null or client_id is not null), unique(company_id,id), unique(company_id,number),
 foreign key(company_id,lead_id) references public.leads(company_id,id), foreign key(company_id,client_id) references public.clients(company_id,id)
);
create table public.quote_versions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), quote_id uuid not null,
 version integer not null check(version>0), issued_on date not null default current_date, valid_until date not null,
 terms text, vat_summary jsonb not null default '{}'::jsonb,
 estimated_cost_cents bigint not null default 0 check(estimated_cost_cents>=0), net_cents bigint not null default 0 check(net_cents>=0), vat_cents bigint not null default 0 check(vat_cents>=0), total_cents bigint not null default 0 check(total_cents>=0),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check(valid_until>=issued_on), unique(company_id,id), unique(quote_id,version), foreign key(company_id,quote_id) references public.quotes(company_id,id) on delete cascade
);
create table public.quote_items (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), quote_version_id uuid not null,
 position integer not null check(position>0), description text not null check(length(description) between 1 and 1000), category text not null,
 quantity numeric(12,3) not null check(quantity>0), unit text not null check(unit in ('un','m','m²','m³','kg','L','cx','dia','hora')),
 material_cost_cents bigint not null default 0 check(material_cost_cents>=0), labour_cost_cents bigint not null default 0 check(labour_cost_cents>=0), other_cost_cents bigint not null default 0 check(other_cost_cents>=0),
 markup_percent numeric(8,3) not null default 0 check(markup_percent>=0), unit_price_cents bigint not null check(unit_price_cents>=0), total_cents bigint not null check(total_cents>=0), vat_percent numeric(5,2) not null check(vat_percent between 0 and 100),
 unique(quote_version_id,position), foreign key(company_id,quote_version_id) references public.quote_versions(company_id,id) on delete cascade
);

do $$ declare t text; begin
 foreach t in array array['lead_activities','visits','quotes','quote_versions','quote_items'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for all to authenticated using(private.has_role(company_id,array[''ADMIN'',''COMERCIAL'']::public.app_role[])) with check(private.has_role(company_id,array[''ADMIN'',''COMERCIAL'']::public.app_role[]))',t||'_commercial',t);
 end loop;
 foreach t in array array['visits','quotes'] loop
  execute format('create trigger stamp before insert or update on public.%I for each row execute function private.stamp_record()',t);
  execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_record()',t);
 end loop;
end $$;

create function private.log_new_lead() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.lead_activities(company_id,lead_id,kind,body,created_by) values(new.company_id,new.id,'LEAD_CRIADO','Lead criado',coalesce(new.created_by,auth.uid())); return new; end;
$$;
revoke all on function private.log_new_lead() from public;
create trigger lead_created_activity after insert on public.leads for each row execute function private.log_new_lead();
create function private.log_lead_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status is distinct from old.status then
  insert into public.lead_activities(company_id,lead_id,kind,body,metadata,created_by)
  values(new.company_id,new.id,'MUDANCA_ETAPA',old.status||' → '||new.status,jsonb_build_object('from',old.status,'to',new.status),auth.uid());
 end if;
 return new;
end;
$$;
revoke all on function private.log_lead_status() from public;
create trigger lead_status_activity after update of status on public.leads for each row execute function private.log_lead_status();
