-- Búsqueda de clientes por nombre completo (nombre y/o apellido, en cualquier orden).
-- Motivación: hoy `_searchCustomer` y `_fetchCustomersPage` solo hacen ilike sobre
-- `first_name`, así que "Emanuel Villanueva" matchea con "emanuel" pero no con
-- "villanueva". Se agrega una columna generada `full_name` + índice trigram para
-- que `ilike '%<query>%'` sobre `full_name` matchee nombre, apellido, o frases
-- como "emanuel villanueva".

create extension if not exists pg_trgm;

alter table public.customers
  add column full_name text
    generated always as (
      trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    ) stored;

create index customers_full_name_trgm_idx
  on public.customers
  using gin (full_name gin_trgm_ops);
