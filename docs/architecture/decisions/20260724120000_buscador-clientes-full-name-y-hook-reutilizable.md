# Buscador de clientes por nombre completo y hook reutilizable

**Fecha:** 2026-07-24
**Autor:** emanuel@getlenk.com
**Rama:** feat/discounts-family-groups

## Descripción

El buscador de clientes en `/customer/groups/new` (y todos los otros buscadores
del repo: `/customer` list, `assistance/search`, `group/detail`) solo hacía
`ilike` sobre `first_name`. Consecuencia: un cliente "Emanuel Villanueva"
aparecía buscando "emanuel" pero no buscando "villanueva". Bug reportado por el
usuario mientras se testeaba la creación de grupos familiares.

Además, los 4 buscadores duplicaban estructura (state del query, debounce,
cancellable async, dropdown con estados loading/vacío/results) sin compartir
código.

Este cambio arregla el bug en el flujo de creación de grupos y estrena un
patrón reutilizable (hook + componente con render prop) para que el resto de
buscadores pueda migrarse gradualmente después de evaluar la funcionalidad.

## Decisiones

### Decisiones de negocio

- El buscador debe matchear por nombre, por apellido, y por la frase completa
  "nombre apellido". Es lo natural para el usuario final que busca a un cliente
  por lo primero que le viene a la cabeza (a veces el apellido, a veces ambos).
- Alcance acotado a `CreateGroupForm` como piloto — si funciona bien, se
  migran los otros 3 buscadores en un PR siguiente. Evita tocar de más antes
  de validar UX.

### Decisiones técnicas

- **Columna generada `full_name` + índice `gin_trgm_ops`** en `customers`:
  - `full_name` = `trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))`,
    STORED. Siempre consistente sin triggers, se recalcula automáticamente en
    cada INSERT/UPDATE.
  - Índice trigram GIN sobre `full_name` para que `ilike '%<query>%'` sea rápido
    incluso sobre miles de clientes.
- **Alternativas descartadas**:
  - `.or('first_name.ilike...,last_name.ilike...')` — arregla apellido pero no
    matchea "emanuel villanueva" como frase. Costo similar, beneficio menor.
  - `to_tsvector` / websearch — pensado para texto largo (descripciones,
    documentos), overkill para nombres cortos donde trigram es más natural.
- **`useCustomerSearch({ debounceMs, excludeIds })`** encapsula: state del
  query, debounce, cancellable async, filtrado por IDs excluidos. Vive
  aparte del componente para permitir tests unitarios y por si algún día
  aparece un consumidor que necesite renderizar el input y los resultados
  en lugares separados de la página.
- **`<CustomerSearchInput excludeIds={...} renderItem={(customer, {clear}) => ...} />`**
  encapsula la instancia del hook, el `<Input>` con icono, el popover
  flotante (`absolute z-50 max-h-60 overflow-auto`) con estados
  loading/empty/results, y el manejo de `isOpen` con click-outside listener.
  El `renderItem` es render prop para que cada consumidor decida qué hace
  cada fila (botón "Add", `<Link>` a perfil, etc.). Recibe también un
  `clear()` para que el consumidor pueda vaciar el input y cerrar el popover
  después de seleccionar. Sin variantes rígidas.
- **Popover flotante en vez de lista inline**: la lista de resultados no
  empuja el contenido de abajo — se posiciona absoluta sobre el layout con
  `max-h-60 overflow-auto` para scroll interno. Mismo patrón que ya usa
  `assistance/search.tsx`.
- **Hook instanciado dentro del componente** en vez de expuesto al
  consumidor: para los casos actuales (CreateGroupForm, y a futuro los
  otros 3 buscadores) el consumidor nunca necesita el `query`,
  `debouncedQuery`, `results` o `loading` fuera del dropdown. Exponerlos
  agregaba boilerplate en cada callsite sin beneficio. Si algún caso
  específico lo necesita después, se refactoriza el componente para
  aceptar `hook` como prop.
- **Refactor solo en `CreateGroupForm`**. `customer/list.tsx`,
  `assistance/search.tsx`, `group/components/detail.tsx` siguen con la query
  vieja de `first_name` — se migrarán en PR aparte una vez validado el hook.
- **Deploy order**: la migración es aditiva (columna generada + índice nuevos).
  El código viejo sigue funcionando contra la DB nueva. Por lo tanto: aplicar
  migración a dev primero, luego release del código. En prod, mismo orden.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. La RLS existente sobre
  `customers` se aplica igual a las queries que usan `full_name`.
- **Exposición de datos:** ninguna. La columna generada solo contiene datos
  que ya estaban en `first_name`/`last_name`.
- **Validación de input:** el query del buscador se pasa a Supabase con
  interpolación de string en `.ilike('full_name', '%${query}%')`. El client
  de Supabase parametriza correctamente el valor — no hay riesgo de SQL
  injection. Mismo patrón que ya existía con `first_name`.
- **Dependencias:** se habilita la extensión `pg_trgm` (nativa de Postgres,
  disponible en Supabase). Sin dependencias npm nuevas.
- **Infraestructura:** el índice GIN suma espacio en disco proporcional a la
  cantidad de clientes (unos pocos KB por cada 100 clientes) y algo de costo
  en INSERT/UPDATE. Insignificante para el volumen actual.

## Plan

### Pasos

1. Crear migración `20260724120000_customer_full_name_search.sql`: habilitar
   `pg_trgm`, agregar columna `full_name` generada, crear índice trigram.
2. Cambiar `_searchCustomer` en `src/customer/api/client.ts` para usar
   `.ilike('full_name', ...)`. Dejar `_fetchCustomersPage` y `searchAllCustomers`
   sin tocar (fuera del scope del piloto).
3. Crear `src/customer/hooks/use-customer-search.ts` con la lógica de
   debounce, cancellable fetch y filtrado por `excludeIds`.
4. Crear `src/customer/components/customer-search-input.tsx` con el `<Input>`,
   la `<ul>` de resultados y prop `renderItem`.
5. Refactorizar `src/group/components/create-form.tsx` para consumir el hook
   y el componente. Eliminar el `useEffect` local, el state de `results` y
   `searching`, y el bloque de dropdown inline.
6. Aplicar la migración al Supabase dev (`npm run db:push-dev`) para poder
   probar en localhost.
