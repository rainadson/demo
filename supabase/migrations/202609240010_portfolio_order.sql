alter table public.project_photos
  add column if not exists portfolio_order integer not null default 0
  check (portfolio_order >= 0);

with ranked as (
  select project_id, dense_rank() over (order by min(created_at) desc) as position
  from public.project_photos
  where phase in ('ANTES', 'DEPOIS')
  group by project_id
)
update public.project_photos photo
set portfolio_order = ranked.position
from ranked
where photo.project_id = ranked.project_id
  and photo.portfolio_order = 0;

create index if not exists project_photos_portfolio_order_idx
  on public.project_photos(company_id, portfolio_order, created_at desc)
  where publicable = true;
