alter table public.supply_requests
  alter column requester_phone drop not null,
  drop constraint supply_requests_requester_phone_check;

comment on column public.supply_requests.requester_phone is
  'Legacy optional contact field; new employee requests do not collect a phone number.';
