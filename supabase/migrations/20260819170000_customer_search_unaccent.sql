-- Búsqueda de clientes insensible a acentos.
-- Motivación: `_searchCustomer` / `_fetchCustomersPage` / `searchAllCustomers` usan
-- `ilike` sobre `full_name`, y `ilike` en Postgres NO ignora diacríticos: buscar
-- "Maiten" no matchea con "Maitén", ni "Nicolas" con "Nicolás". Los filtros
-- client-side (customer/stats/*) ya normalizaban con `normalizeText`, así que el
-- comportamiento era inconsistente entre el listado y el buscador.
--
-- Solución: una segunda columna generada `full_name_search` con el nombre completo
-- en minúsculas y sin acentos, más su índice trigram. El código normaliza el query
-- con el mismo criterio antes del `ilike`.

create extension if not exists unaccent;

-- `unaccent()` es STABLE (depende del lookup del diccionario), y las columnas
-- generadas exigen expresiones IMMUTABLE. Este wrapper — el patrón estándar para
-- este caso — fija el diccionario explícitamente y el search_path, con lo cual el
-- resultado es determinístico para un diccionario dado.
-- Consecuencia a tener en cuenta: cambiar el diccionario `unaccent` no recalcula
-- las filas existentes; habría que forzar un rewrite de la tabla.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions, pg_catalog
as $$ select unaccent('unaccent'::regdictionary, $1) $$;

-- No se puede referenciar `full_name` (Postgres no permite que una columna generada
-- dependa de otra), así que se repite la expresión.
alter table public.customers
  add column full_name_search text
    generated always as (
      public.immutable_unaccent(
        lower(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')))
      )
    ) stored;

create index customers_full_name_search_trgm_idx
  on public.customers
  using gin (full_name_search gin_trgm_ops);
