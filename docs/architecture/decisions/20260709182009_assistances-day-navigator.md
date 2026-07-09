# Navegador de día en /assistances con ventana de 14 días

**Fecha:** 2026-07-09
**Autor:** emanuel@getlenk.com
**Rama:** feat/assistances-day-navigator

## Descripción

Hasta hoy `/assistances` mostraba únicamente las asistencias del día en curso.
El equipo pidió poder revisar el historial reciente ("qué pasó ayer / la semana
pasada") sin salir de la pantalla. Se agrega un navegador `‹ Hoy ›` sobre la
lista que permite ir hasta **14 días hacia atrás** por defecto.

La query subyacente (`getAssistancesByDate`) ya recibía un `Date` — solo hacía
falta parametrizar la lista y agregar un selector. El día seleccionado se
persiste en la URL como `?date=YYYY-MM-DD` para que refresh y deep-links
funcionen y para no tener que convertir la sección en Client Component.

Además, se agrega el índice `idx_assistance_date` sobre `public.assistance`.
Hasta ahora la tabla solo tenía PK sobre `id`, y todas las queries por rango de
fecha (`getAssistancesByDate`, `get_top_customers_current_month` y los RPC de
`upsert_customer_membership_with_payment`) resolvían con seq scan. Con el
volumen actual del gimnasio no es un problema medible, pero al abrir el
navegador de días multiplicamos las consultas por rango y conviene tener el
índice antes de crecer.

## Decisiones

### Decisiones de negocio

- **Rango máximo hacia atrás:** 14 días. Alcanza para "el equipo mira lo que
  pasó estos días" sin necesidad de un DatePicker completo.
- **Copy del selector:**
  - Hoy → "Hoy".
  - Ayer → "Ayer".
  - Resto → "lunes 7 de julio" (día de la semana + día + mes) para que el
    equipo pueda identificar rápido en qué día está.
- **URLs con `?date=YYYY-MM-DD`** para permitir deep-link/refresh y para que
  compartir un link apunte al mismo día del emisor.

### Decisiones técnicas

- **State en URL, no en cliente.** La página sigue siendo Server Component,
  usa el mismo `Suspense` con streaming y hace el fetch server-side. Al pasar
  el `date` en la `key` del `Suspense`, el skeleton reaparece al cambiar día.
- **Fail-hard con `notFound()`** si el `date` no es un `YYYY-MM-DD` válido,
  cae fuera de `[hoy - 14, hoy]`, o es una fecha calendaria inexistente
  (`2026-02-31`). El link que envía el equipo dura horas, no meses — preferimos
  romper visible antes que ocultar con "clamp a hoy" silencioso.
- **Todo el cálculo de fechas usa TZ Argentina** vía `getTodayIsoDateInAppTz`
  y `shiftIsoDateInAppTz` (nuevo helper). Reutiliza el patrón canónico
  establecido en el ADR de fechas AR. Ni la page ni el navigator tocan
  `Date` crudo en UTC.
- **`AssistancesList` acepta `date?: string` opcional.** Sin prop, mantiene el
  comportamiento previo (`getTodayAssistances`) para no tocar el consumer
  comentado en `/stats`. Con prop, resuelve con `getAssistancesByDate`.
- **Índice `idx_assistance_date` como btree DESC.** El uso mayoritario ordena
  DESC (`order by assistance_date desc` en la lista) y filtra por rango
  reciente. La migración es idempotente (`IF NOT EXISTS`) y no breaking:
  aplicarla antes o después del release funciona igual — el código no la
  requiere para funcionar, solo se beneficia.
- **Ubicación del navigator:** encima del acordeón, dentro del `<section>` de
  contenido. El header `<Card>` de la lista pasa a mostrar copy dinámico
  ("Asistencias de Hoy" / "Ayer" / "del lunes 7 de julio") reusando el `t`
  server-side para no re-render el título en el cliente.

### Alternativas descartadas

- **State en cliente con `useState`.** Menos código pero rompe deep-link,
  requiere convertir la sección en Client Component y pierde el streaming
  Suspense actual. No compensa.
- **DatePicker completo con calendario.** Overkill para 14 días. El paginador
  con flechas es suficiente y más rápido con touch.
- **Diferir el índice para más adelante.** Es una migración trivial y
  también acelera consultas ya existentes. No hay razón para posponerlo.
- **Clamp silencioso a hoy si el `date` es inválido.** Oculta bugs en clientes
  que pasan links viejos. Preferimos `notFound()` visible.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios. `/assistances` ya está detrás
  del layout autenticado y `RLS` autoriza `SELECT` sobre `assistance` para
  cualquier `authenticated`. Pasar `?date=...` no expone datos nuevos: siempre
  se accede a la misma tabla con las mismas policies.
- **Exposición de datos:** la ventana `[hoy - 14, hoy]` acota lo consultable
  desde la URL. Un valor fuera de rango dispara `notFound()`.
- **Validación de input:** el `date` de `searchParams` se valida contra un
  regex estricto `^\d{4}-\d{2}-\d{2}$`, se verifica que sea un día calendario
  real y se comparan contra `todayIso` y `todayIso - 14d` antes de tocar la DB.
- **Dependencias:** no se agregan. Solo `Intl.DateTimeFormat` estándar y
  componentes ya presentes (`lucide-react`, `Button`).
- **Infraestructura:** el nuevo índice ocupa espacio y agrega mínimo overhead
  a inserts (bien absorbido en una tabla pequeña). No cambia superficie de
  red ni permisos.

## Plan

### Pasos

1. Crear rama `feat/assistances-day-navigator` desde `develop`.
2. Migración `20260709182009_assistance_date_index.sql`: `CREATE INDEX
   IF NOT EXISTS idx_assistance_date ON public.assistance (assistance_date
   DESC)`.
3. Agregar helper `shiftIsoDateInAppTz` a `src/lib/timezone.ts` y
   `formatLongDayInAppTz` a `src/lib/format-date.ts`.
4. Parametrizar `AssistancesList` para aceptar `date?: string`. Header
   dinámico (hoy / ayer / "lunes 7 de julio").
5. Nuevo `DayNavigator` (Client Component) con `‹ [label] ›`,
   `useRouter().push` y estados `disabled` en los bordes de la ventana.
6. Reescribir `page.tsx` para leer `searchParams.date`, validar contra la
   ventana `[hoy - 14, hoy]` y pasar `date` al `Suspense` (con `key`) y a
   la lista.
7. Agregar keys de i18n (`yesterdayAssistances`, `assistancesOfDay`,
   `dayNavigator.*`) en `es.json` y `en.json`.
8. Escribir este ADR.
9. `npm run type-check` y `npm run lint`.
10. Deploy: mergear el PR y publicar el release **antes** de correr
    `db:push-prod`. El código no rompe si el índice todavía no está.

### Fuera de scope

- Paginación / infinite scroll dentro del día.
- Filtro por cliente dentro de la lista de un día.
- Contador total de asistencias en el header.
- Vista de rango (semanal / mensual) — hoy resuelto en `/stats`.
