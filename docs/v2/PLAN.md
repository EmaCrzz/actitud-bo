# Rediseño v2 de Actitud BO — Plan de trabajo

> **Documento vivo.** Se actualiza a medida que se avanzan fases o surgen cambios de alcance/decisión. Sirve como contexto para futuras sesiones de Claude (o de otro dev): cualquier agente que arranque debería poder leerlo y saber por dónde continuar **sin volver a explorar el Figma ni el schema desde cero**.

## Cómo usar este documento

1. **Antes de arrancar una fase** — leé la sección de esa fase + [Fuentes de verdad](#fuentes-de-verdad) + [Brechas de base de datos](#brechas-de-base-de-datos).
2. **Durante la fase** — si algo del plan no matchea la realidad (el Figma cambió, el schema no da, apareció un edge case), **editá este archivo en el mismo PR**. No dejes que el plan se desactualice: es la única memoria compartida entre sesiones.
3. **Al cerrar la fase** — actualizá la tabla de [Estado / progreso](#estado--progreso), agregá la entrada en [Cambios registrados](#cambios-registrados) y linkeá el ADR.
4. **Convención de estado:** ⬜ pendiente · 🟡 en curso · ✅ completa · ⚠️ bloqueada · 🔵 diseño incompleto en Figma.

---

## Estado / progreso

| Fase | Título | Estado | Notas |
|------|--------|--------|-------|
| 0 | Infra de feature flags + scaffold v2 | ✅ completa | PR [#43](https://github.com/EmaCrzz/actitud-bo/pull/43). ADR [20260817111834](../architecture/decisions/20260817111834_v2-scaffold-and-feature-flags.md). |
| 1 | Design system v2 (tokens + primitives shadcn + AppShell) | ✅ completa | PR [#44](https://github.com/EmaCrzz/actitud-bo/pull/44). ADR [20260817114952](../architecture/decisions/20260817114952_v2-design-system-scoped-theming.md). |
| 1.5 | Sidebar colapsable + fixes responsive del AppShell | ✅ completa | PR [#45](https://github.com/EmaCrzz/actitud-bo/pull/45). Sin ADR nuevo: extiende fase 1. |
| 1.6 | Fixes de i18n, composition patterns e hidratación | ✅ completa | PR [#46](https://github.com/EmaCrzz/actitud-bo/pull/46). ADR [20260818111458](../architecture/decisions/20260818111458_v2-i18n-y-composition-fixes.md). |
| 2 | Home v2 (primera pantalla real) | ✅ completa | PRs [#47](https://github.com/EmaCrzz/actitud-bo/pull/47) y [#48](https://github.com/EmaCrzz/actitud-bo/pull/48). Search + métricas + daily summary + weekly attendance con data real. |
| 3 | Flow "Registrar asistencia" (modal + confirmación + toast) | ✅ completa *(con pendientes)* | PR [#49](https://github.com/EmaCrzz/actitud-bo/pull/49) mergeado en `develop` el 2026-08-19. ADRs [20260819130435](../architecture/decisions/20260819130435_v2-attendance-modal.md) + [20260819163000](../architecture/decisions/20260819163000_success-tick-animation.md) + [20260819170000](../architecture/decisions/20260819170000_busqueda-de-clientes-insensible-a-acentos.md). **Quedaron pendientes** (verificación contra Figma, duplicado de asistencia, loading de búsqueda) → ver [Fase 3](#fase-3--flow-registrar-asistencia); se resuelven como fase 3.1 o dentro de la fase que los toque. |
| 4 | Navegación v2 real (sidebar alineado al Figma + rutas stub) | ✅ completa | Rama `feat/v2-navegacion-sidebar`. ADR [20260915132556](../architecture/decisions/20260915132556_v2-navegacion-real-y-rutas-stub.md). Campana de notificaciones diferida. Falta verificación visual del drawer mobile. |
| 5 | Primitivas transversales v2 (DataTable, SidePanel, ConfirmDialog, FilterBar, Stepper) | ✅ completa | Rama `feat/v2-primitivas`. ADR [20260916093140](../architecture/decisions/20260916093140_v2-primitivas-transversales.md). `FormModal` y `DetailModal` colapsaron en un solo `SidePanel`. Sandbox en `/v2/sandbox`. |
| 6a | Sección Clientes — listado | ✅ completa | Rama `feat/v2-clientes` (PR [#53](https://github.com/EmaCrzz/actitud-bo/pull/53)). ADR [20260916120738](../architecture/decisions/20260916120738_v2-listado-de-clientes.md). Query canónico compartido server/client, filtros en la URL. ~~scroll infinito~~ → **corregido a paginación en 6b**. |
| 6b | Perfil del cliente + paginación | ✅ completa | Rama `feat/v2-perfil-cliente`. ADR [20260916161500](../architecture/decisions/20260916161500_v2-perfil-de-cliente-y-paginacion.md). Panel de 4 tabs, paginador transversal, filtro de estado a 3 valores, migración B10+B11. **No hay menú de acciones de fila** (el nodo que el plan creía que era, es el filtro `Estado`). Mobile sin verificar. |
| 7 | Alta de cliente (desde Home y desde Clientes) | ✅ completa | Rama `feat/v2-alta-cliente`. ADR [20260918112629](../architecture/decisions/20260918112629_v2-alta-de-cliente.md). Un panel con dos entradas, **toda alta cobra** (excepto VIP), B12 cerrada, residuo del defecto C eliminado. **Dos migraciones con orden de deploy obligatorio** — ver [Fase 7](#fase-7--alta-de-cliente). |
| 8 | Registrar pago / renovar membresía + comprobante | ✅ completa | Fundaciones en prod con **v0.13.0/v0.13.1**. Panel de renovación: PR [#62](https://github.com/EmaCrzz/actitud-bo/pull/62), ADR [20260922173000](../architecture/decisions/20260922173000_v2-panel-de-renovacion-de-membresia.md). Comprobante + cobro desde el home: rama `feat/v2-comprobante-y-pago-desde-home`, ADR [20260923140000](../architecture/decisions/20260923140000_v2-comprobante-de-pago-y-cobro-desde-el-home.md). **Ninguno de los dos llevó migraciones.** |
| 9 | Sección Asistencias | ⬜ pendiente | |
| 10 | Sección Membresías (planes y precios) | ⬜ pendiente | |
| 11 | Sección Gastos (crear/editar/eliminar) | ⬜ pendiente | Requiere migración: `payment_method` en `expenses`. |
| 12 | Sección Ventas (productos) | ⚠️ bloqueada | **No existe modelo de datos.** Requiere diseño de schema completo. |
| 13 | Balance | ⬜ pendiente | Depende de 11 y 12. |
| 14 | Configuración (Negocio / Membresías / Promociones / Usuarios) | ⬜ pendiente | Requiere tabla de settings del negocio. |
| 15 | Promoción de v2 a default + retiro de v1 | ⬜ pendiente | Fuera del alcance actual; se planifica cuando 3–14 estén cerradas. |

---

## Por dónde seguir

> Última actualización: **2026-09-23**. Esta sección es el arranque de cualquier sesión nueva: decí en qué estado quedó todo y cuál es el siguiente movimiento, sin tener que leer el documento entero.

**Dónde estamos: la Fase 8 está cerrada.** Las fundaciones (modelo de precio, recargo explícito, número de comprobante) viajaron en **v0.13.0/v0.13.1**; el panel de renovación en el PR [#62](https://github.com/EmaCrzz/actitud-bo/pull/62); el comprobante compartible y el cobro desde el home en `feat/v2-comprobante-y-pago-desde-home`. **Ninguno de los dos PRs de UI llevó migraciones.** Ver [Fase 8](#fase-8--registrar-pago--renovar-membresía--comprobante).

**El movimiento siguiente es el issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59)**, no la Fase 9. El criterio ya está decidido —el mes contable es cuándo entró la plata— y conviene ejecutarlo ahora, con el contexto de pagos fresco y antes de que **Balance (Fase 13)** se construya sobre la atribución equivocada. Detalle completo en la deuda de abajo. Después, la **Fase 9** (Asistencias), que es mayormente port de UI y no tiene brechas de DB.

**Lo que cambió el diseño el 2026-09-22:** el paso 1 ahora tiene los **dos datepickers** (inicio y vencimiento), que antes no estaban. El panel los muestra con prefill derivado — inicio = día siguiente al vencimiento vigente, o hoy si ya venció — y con eso la renovación anticipada arranca sola en el período correcto.

**Estado de entornos — todo desplegado y sin deuda.** Producción corre **v0.13.1** con las migraciones `20260921101140` y `20260922125530` aplicadas; dev está emparejado. Prod sigue con **0 usuarios con `v2_access`**, así que toda la v2 viaja apagada. No hay migraciones pendientes en ningún entorno.

**Lo que este release cambió para los usuarios de v1:** el corte del recargo pasó del día 16 al 11, así que el dashboard de ingresos reclasifica los pagos de los días 11–15 —históricos incluidos— como "con recargo", y la barra del ciclo se pone amarilla cinco días antes. **No se migró ningún dato**: esa clasificación se calcula al leer. La auditoría de integridad antes y después del push salió byte a byte idéntica.

**Lo que el release v0.12.0 arregló en producción, además de traer la Fase 7:**

*El alta de cliente de v1 estaba rota desde el 2026-07-22.* Convivían dos overloads de `upsert_customer_membership_with_payment` (10 y 14 params); como los 4 params extra del segundo tienen DEFAULT, una llamada de 10 argumentos matcheaba a los dos y PostgREST devolvía `PGRST203`. El único caller con 10 args era el paso 2 del alta: con "pagó" tildado se creaba el cliente y la membresía pero **no el pago**.

La evidencia que lo confirmó: de los 15 clientes creados desde el 22-07 con algún pago, **cero** lo tenían registrado junto al alta — todos llegaron después por el form de renovación. Y las 2 altas de pase diario del período no tenían pago ninguna, el caso limpio porque para DAILY v1 fuerza `payment='on'`. Verificado contra el PostgREST de prod después de migrar: el payload de 10 campos ya resuelve.

*Las diarias no se contaban en las métricas el día que se vendían.* El overload de 14 había perdido la canonicalización de `expiration_date` para DAILY; `get_membership_stats` filtra con `> NOW()`, así que un pase que vence a las 00:00 AR quedaba fuera todo el día. Restaurada. Las 8 filas afectadas (desde el 2026-07-29) no se backfillearon: son pases vencidos y las stats de meses pasados van por `created_at`.

**Lo que la UI de la Fase 8 ya tiene servido:**

- `getSuggestedCharge()` / `computeChargeTotal()` en [src/membership/pricing.ts](../../src/membership/pricing.ts) — el precio propuesto, el recargo sugerido y su motivo.
- `getPeriodModeOptions()` / `getConfiguredSurcharge()` en [charge-mode.ts](../../src/membership/charge-mode.ts), sin romper el `ChargeMode` que usan v1 y el alta.
- `surcharge_amount`, `surcharge_note` y `receipt_number` en `membership_payments`, con el RPC escribiéndolos y devolviendo el número de comprobante en la respuesta.
- `customer_membership.start_date`, el `DatePicker` y el `Textarea` de v2, el `SidePanel`, el `Stepper` y el `ConfirmDialog`.
- Compartir como imagen: [use-share-image.ts](../../src/lib/hooks/use-share-image.ts) ya funciona en producción para asistencias.

**Reglas operativas vigentes**, que aplican a todo lo que venga:

1. **Todo cambio de v2 debe dejar v1 funcionando**, incluso si hay que modificar v1. El flag `v2_access` gatea la UI, **no el schema**: las migraciones y el código compartido son globales.
2. **Las migraciones se liberan a prod release a release**, no se acumulan. La brecha de 4 migraciones de septiembre casi rompe la búsqueda de clientes en producción.
3. **Antes de cada `db:push-prod`:** `./scripts/rehearse-migrations.sh prod` + `supabase/scripts/audit-integrity.sql`. Procedimiento completo en [workflow.md](../workflow.md).
4. **Pedir la captura antes de definir la pantalla**, y **mirar cada pantalla nueva con data real** antes de cerrarla. Las dos moralejas salieron de fases donde el árbol de nodos y el wireframe alcanzaban para construir algo que igual estaba mal.

**Pendiente con el diseñador:** el copy *"Aun"* sin tilde y las barras horizontales del home mobile ([decisión #16](#decisiones-abiertas--riesgos)), las **tres divergencias deliberadas** que introdujo la Fase 7 contra el Figma (no existe "Sin membresía" en el select; "Modalidad de cobro" y "Forma de pago" desaparecen con VIP; "Modalidad de cobro" desaparece con Diaria), y los **seis defectos de las capturas de renovación** del 2026-09-21 — incluido que el ícono de Compartir dice PDF y se va a implementar como imagen. Lista completa en [Fase 8](#defectos-del-diseño-detectados-en-las-capturas-del-2026-09-21).

**Deuda conocida que quedó anotada, no resuelta:**

- **B5 (DNI sin UNIQUE)** sigue abierta y sigue necesitando PR propio: 8 pares duplicados en prod que requieren criterio caso por caso — uno son dos personas distintas con un DNI mal tipeado.
- **Un no-admin puede crear un cliente VIP llamando al RPC directo.** El form lo filtra client-side, pero `upsert_customer_with_membership` no valida el rol (el RPC de pago sí, y un alta VIP no pasa por él). Ver "Consideraciones de seguridad" del ADR de la Fase 7.
- **⚠️ El cambio de tipo de membresía reescribe un pago ya comprobado.** Recalcula el monto según el plan nuevo y pone descuento y recargo en 0, conservando el `receipt_number`. Es comportamiento deliberado del ADR [20260707114541](../architecture/decisions/20260707114541_prevent-duplicate-membership-payments-and-type-changes.md), pero ahora esa fila lleva número de comprobante: **un comprobante entregado al cliente puede dejar de coincidir con la fila que lo respalda**. Hoy no afecta a nadie porque la UI que los emite todavía no existe. Decidir en la UI de la Fase 8 si un cambio de tipo **anula y reemite** o si directamente no debería tocar un pago ya comprobado. *(El caso hermano —renovar por adelantado— se cerró el 2026-09-22, ver ADR [20260922125530](../architecture/decisions/20260922125530_renovacion-anticipada-no-pisa-el-pago-anterior.md).)*
- **⚠️ `membership_payments.payment_date` recibe el inicio del período, no el momento del cobro** — issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59). Confirmado el 2026-09-21 con datos reales de dev. El RPC escribe `payment_date = p_start_date`, que es la fecha que el operador elige en el datepicker de inicio. Dos consecuencias medidas:
  - **"Últimos pagos" de `/incomes` no muestra lo último cobrado.** `getRecentPayments` ordena por `payment_date DESC LIMIT 5`. Cuatro pagos hechos el 21 de septiembre para el período que arranca el 1 quedaron en los **puestos 91 a 94 de 287**. El único de la prueba que apareció fue el pase diario, porque ahí el inicio del período *es* hoy.
  - **8 pagos están atribuidos a un mes contable distinto del que entró la plata** (de 287 en dev; 72 tienen la fecha desfasada, con un máximo de 46 días). Ej.: $78.000 cobrados en julio contados en junio.

  Es el **mismo defecto que `last_payment_date`**, que la Fase 7 resolvió a medias agregando `customer_membership.start_date`: un solo valor del datepicker alimentando dos conceptos distintos — cuándo arranca el período y cuándo se cobró.

  **Decidido el 2026-09-23 (Ema), pendiente de ejecutar:**

  - **El mes contable es cuándo entró la plata — criterio de caja.** Ingresos y Balance agrupan por el momento del cobro, no por el período al que corresponde la cuota. Es lo que cuadra contra la caja y el banco, lo que hace comparable el mes contra Gastos (que ya van por fecha de gasto), y lo que evita que un mes ya cerrado siga cambiando porque alguien pagó tarde. Hoy el dashboard hace lo contrario, por accidente.
  - **Forma:** `ADD COLUMN period_start timestamptz` en `membership_payments`, backfill `period_start = payment_date`, y después `payment_date = created_at` donde difieran. El RPC pasa a escribir `period_start = p_start_date` y `payment_date = now()`.
  - **La buena noticia (hallazgo del 2026-09-22): `created_at` ya guarda el momento real del cobro** — `NOT NULL DEFAULT now()` desde siempre. El dato nunca se perdió, está en la columna de al lado. El backfill es un `UPDATE` desde una columna existente, no una reconstrucción.
  - **Primer paso obligatorio: medir.** Cuántas filas cambian de mes contable y cuánto se mueve cada mes, en dev **y** en prod. Sin ese reporte antes/después el cambio no es auditable. Después, rehearsal + `audit-integrity.sql` como manda el [workflow](../workflow.md).
  - **Cuándo:** PR propio inmediatamente después del PR B de la Fase 8 (comprobante + entrada desde el home), antes de arrancar la Fase 9. Cierra la fase completa y desplegable, se hace con el contexto de pagos fresco, y deja a **Balance (Fase 13)** construyéndose sobre datos correctos en vez de hornear el error.

  **Toca 287 filas históricas y cambia números que alguien ya mira, así que va en PR y ADR propios.** No confundir con la reclasificación del recargo de la Fase 8, que se calcula al leer y no migra datos.
- **`POST /api/accounting/payments` está roto y nadie lo nota**, hallazgo del 2026-09-21. `CreateMembershipPaymentData` no incluye `gross_amount`, que es `NOT NULL` sin default desde la migración de descuentos (`20260722120000`), así que el insert falla siempre. No lo alcanza ninguna UI: el `createMembershipPayment` de [accounting/api/client.ts](../../src/accounting/api/client.ts) no tiene llamadores. Es un endpoint muerto que parece vivo — o se completa el tipo con el desglose (`gross_amount`, `discount_amount`, `surcharge_amount`) o se borra. **No se tocó en la rama de la Fase 8** para no mezclarlo con el cambio de precio.
- **`last_payment_date` todavía recibe la fecha de inicio** en las altas sin cobro. Con `start_date` ya escrito, la limpieza es migrar los lectores restantes a `getMembershipPeriodStart()` — entre ellos [membership-form.tsx](../../src/customer/membership-form.tsx), que lo usa como `defaultValue` del datepicker de inicio.

---

## Contexto

Actitud BO es hoy una PWA mobile-first sin diseño desktop. El rediseño completo vive en Figma y ya cubre **17 flows** en wireframes desktop de 1280×832. La v1 debe seguir disponible en producción todo el tiempo; la v2 se construye bajo `/[lang]/[tenant]/v2/*`, gateada por el feature flag `v2_access` por usuario.

**Qué introduce la v2:**

- **Layout desktop + mobile responsive.** Desktop: sidebar navegable de 255px (colapsable a 64px) + header + main como cards individuales. Mobile: shell con Sheet drawer.
- **Design system consolidado** — tokens tipo shadcn scopeados bajo `[data-v2='true']`, compatibles con el theming CSS-vars actual.
- **Cobertura funcional mayor que la v1** — la v1 no tiene Ventas, Balance ni Configuración de negocio. La v2 los introduce, y algunos requieren modelo de datos nuevo.

**Multitenant:** la app es tenant-configurable en build (env `TENANT`, temas y fuentes por tenant en [src/lib/themes/](../../src/lib/themes/)). La v2 hereda esto tal cual. Migrar la DB a multi-tenant en runtime (RLS por `tenant_id`) es una tarea aparte que no bloquea este plan.

**No hacemos ahora:** RLS por tenant en DB, i18n adicional (queda `es` como único idioma), tests automatizados (status quo del proyecto).

---

## Fuentes de verdad

### 1. Figma — índice de nodos

Archivo: `UTMwTtSd6xgjiZilI5DAbK` — página única **"Wireframes desktop"** (`2060:11533`).
Deep-link a cualquier nodo: `https://www.figma.com/design/UTMwTtSd6xgjiZilI5DAbK/?node-id=<id-con-guión>` (ej. `2060-11534`).

> **⚠️ El MCP de Figma da 6 llamadas por MES, no por sesión.** Verificado contra la documentación del propio servidor el 2026-09-18: un seat **View** en plan Professional topea en **6 tool calls mensuales**. Este plan decía "~5 llamadas antes de cortar" y montaba encima un protocolo de racionamiento por fase — que es **inaplicable**: 6 llamadas al mes no alcanzan para una fase ni para media. No planifiques contando con el MCP.
>
> **Consecuencia:** de las 73 pantallas, sólo `P/Home` (`2060:11534`) fue inspeccionada por MCP. Todo lo demás viene del árbol de nodos — fiable para *estructura*, no para *textos, estados y microcopy* — o de capturas que pasó Ema a mano, que es como se resolvieron las fases 5, 6b y 7.
>
> **Cómo desbloquearlo de verdad:** que el dueño del archivo (team "Federico", plan Pro) suba el seat de View a **Full**. Pasa de 6/mes a **200/día**. Es un cambio de seat sobre un plan que ya existe. El team propio de Ema tiene seat Full pero es tier Starter, que topea en 20/mes sin importar el seat, así que mover el archivo ahí no resuelve nada.
>
> **Mientras tanto:** capturas pegadas en la sesión, o —mejor— exportadas a PNG en el repo (ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #10).

Nota sobre la nomenclatura del Figma: casi todos los frames se llaman `Home` independientemente de qué pantalla sean. **El nombre del frame no es confiable; lo que identifica la pantalla es la sección que lo contiene y su posición en la fila** (izquierda → derecha = avance del flow). Las flechas (`Arrow N`) entre frames marcan las transiciones.

| # | Sección (flow) | Node ID | Título en Figma | Pantallas | Node IDs de las pantallas (en orden del flow) |
|---|---|---|---|---|---|
| 1 | Registrar asistencia | `2166:22896` | "Registrar asistencia" | 7 | `2060:11534` (Home) → `2064:14532` (Búsqueda) → `2065:15004` (Búsqueda/Loading) → `2065:16139` (Modal asistencias) → `2117:5939` (Registro) → `2117:8258` (Toast éxito) → `2117:8533` (Home actualizado) |
| 2 | Crear nuevo cliente (desde Home) | `2166:22897` | "Desde el home" | 7 | `2117:8757` → `2117:8942` → `2117:9198` → `2117:9868` → `2117:10128` → `2117:10405` (Toast) → `2117:12773` |
| 3 | Registrar un pago (desde Home) | `2166:22898` | "Desde el home registrar un pago" | 10 | `2117:12960` → `2117:13145` → `2117:14238` → `2117:15278` → `2118:16213` → `2118:16942` → `2118:17345` → `2118:17604` (Modal Dialog) → `2118:17883` (Payment Receipt) → `2118:18209` |
| 4 | Estado del home | `2166:22899` | "Home con datos del día" | 1 | `2118:18398` |
| 5 | Sección clientes | `2167:22900` | "Pantalla de clientes y Card de clientes del mes desde el home" | 3 | `2118:22308` → `2118:22594` (Dropdown de acciones) → `2118:22907` (Customer Detail Modal) |
| 6 | Modal perfil cliente | `2167:22901` | "Perfil de cliente" | 5 | `2118:25405` → `2118:23254` → `2118:23600` → `2118:24441` → `2118:24959` |
| 7 | Modal renovar membresía | `2167:22902` | "Renovar membresía desde Cliente/Perfil" | 7 | `2118:25691` → `2118:26041` → `2118:26479` → `2118:26919` → `2118:27273` → `2118:27698` (Modal Dialog) → `2118:28076` (Payment Receipt) |
| 8 | Crear cliente desde Clientes | `2167:22903` | "Crear nuevo cliente desde Clientes" | 4 | `2118:28450` → `2110:25665` → `2110:26658` → `2110:27462` (Toast) |
| 9 | Sección asistencias | `2167:22904` | "Asistencias desde Card del home y sección asistencias" | 2 | `2118:28921` (Tabs + Customer List) → `2118:28933` (con DateNavigation) |
| 10 | Sección membresías | `2167:22905` | "Membresías Editar/Crear" | 4 | `2118:34043` → `2125:28702` → `2125:31710` → `2125:32285` (Toast) |
| 11 | Ventas a clientes | `2167:22906` | "Venta de productos a clientes" | 5 | `2125:32778` → `2131:50779` → `2133:56520` → `2133:56989` → `2136:63491` |
| 12 | Ventas a no clientes | `2167:22907` | "Venta de productos a no clientes" | 3 | `2136:66687` → `2136:66962` → `2137:70456` |
| 13 | Exportar archivo (Ventas) | `2167:22908` | "Exportar archivo" | 2 | `2139:17650` → `2139:17917` (Modal Dialog) |
| 14 | Gastos crear/editar | `2167:22910` | "Gastos crear/editar" | 6 | `2139:18300` → `2140:31470` → `2141:34792` (Toast) → `2141:35010` → `2141:35304` → `2141:49230` (Toast) |
| 15 | Eliminar gastos | `2167:22911` | "Eliminar gastos creados" | 3 | `2141:49458` → `2141:49736` (Modal Dialog) → `2141:50232` (Toast) |
| 16 | Balance | `2167:22912` | "Balance" | 1 | `2141:50936` |
| 17 | Configuración | `2167:22913` | "Configuración" | 3 | `2141:51590` (Negocio) → `2151:58342` (tabla) → `2151:68169` (tabla) |

**Anotaciones sueltas en el canvas** (textos que el diseñador dejó al lado de los frames, revisar al abrir cada sección):
- `2118:22319` — "Ver estados de las tablas" (sección Clientes)
- `2118:22606` — "Ver estados" (sección Clientes)
- `2118:29353` — "Ver estados del historial" (sección Asistencias)

Estos tres marcan **estados de tabla/lista que el diseño todavía no cubre** (vacío, cargando, error, sin resultados). Ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #3.

### 2. Figma — índice de nodos mobile

Mismo archivo `UTMwTtSd6xgjiZilI5DAbK`, **segunda página: "Wireframes mobile"** (`2167:22916`). Viewport 390×844 (iPhone 14/15). Frames más altos que 844 son pantallas con scroll.

> Nota: al listar las páginas del archivo la API devolvió sólo "Wireframes desktop". La página mobile existe y responde bien si se la consulta por node ID directo. **Si en el futuro falta una página, consultar el node ID en vez de confiar en el listado.**

| # | Sección (flow) | Node ID | Título en Figma | Pantallas | Node IDs (en orden del flow) | Fase |
|---|---|---|---|---|---|---|
| M1 | Registrar asistencias | `2222:43033` | "Búsqueda de cliente y registrar asistencias" | 4 | `2174:24784` (Home + drawer abierto) → `2175:25752` (Home scroll) → `2175:25926` (búsqueda con resultados) → `2175:26167` (Customer Detail Modal) | 3 |
| M2 | Crear cliente | `2222:43030` | "Crear nuevo cliente desde acciones rápidas" | 3 | `2175:28527` (Home) → `2175:28633` → `2175:29398` (FormModal, 2 pasos) | 7 |
| M3 | Renovar membresía | `2222:43026` | "Renovar membresía desde acciones rápidas" | 6 | `2175:29757` (Home) → `2175:29863` → `2183:39583` → `2183:43533` → `2183:43669` (FormModal, 4 pasos) → `2183:43825` (+ Modal Dialog) | 8 |
| M4 | Sección clientes | `2222:43027` | "Pantalla de clientes y perfil" | 7 | `2201:58513` (Home + drawer) → `2201:58764` → `2222:42619` (listado) → `2222:42876` → `2222:43096` → `2228:45514` → `2228:47961` (Detail Modal, 4 vistas) | 6 |
| M5 | Sección asistencias | `2228:49268` | "Total de asistencias" | 2 | `2228:48632` → `2228:48923` | 9 |
| M6 | Sección membresías | `2265:69683` | "Membresías Editar/Crear" | 3 | `2246:49888` (tabla + CTA sticky) → `2260:65170` → `2265:69496` (FormModal) | 10 |
| M7 | Ventas a clientes | `2286:118422` | "Venta de productos a clientes" | 5 | `2265:70904` (vacío, $0) → `2277:96065` (con data) → `2286:117668` → `2286:118017` → `2286:118321` (FormModal, 3 pasos) | 12 |
| M8 | Ventas a no clientes | `2286:118789` | "Venta de productos a no clientes" | 2 | `2286:118518` → `2286:118637` | 12 |
| M9 | Exportar archivo | `2286:118889` | "Exportar archivo" | 2 | `2286:118988` → `2286:119150` (+ Modal Dialog) | 12 |
| M10 | Sección gastos | `2286:119425` | "Crear/editar y eliminar" | 5 | `2286:119862` (**Gastos/Vacío**) → `2286:119451` (Nuevo) → `2329:29053` (con data) → `2329:29377` (Editar) → `2329:29602` (Eliminar + Modal Dialog) | 11 |
| M11 | Balance | `2345:37294` | "Balance" | 1 | `2329:30598` (390×1071, scroll) | 13 |
| M12 | Configuraciones | `2345:37297` | "Negocio/Membresías/Promociones" | 3 | `2333:33003` (Negocio) → `2333:37880` (Membresías) → `2333:38036` (Promociones) | 14 |

### 2.1 Convenciones de layout mobile (derivadas del árbol de nodos)

Estas reglas se repiten en las 12 secciones y deben respetarse en toda pantalla v2 mobile:

- **Grilla:** viewport 390, `Main Container` a 390, padding lateral 16px → **contenido útil 358px**. Los frames de 1331px de alto son scroll vertical, no pantallas separadas.
- **Header:** 390×68, misma altura que desktop.
- **Sidebar = drawer, no columna.** En mobile el `Sidebar` es una instancia de **260×844 sobre un overlay** (`Rectangle 3` 390×844). Visible en `2174:24784` y `2201:58513`. Confirma la decisión de fase 1 de usar `Sheet`, con ancho 260 (no el 255 de desktop).
- **`Customer Detail Modal` y `Modal / Membership Form` son full-screen 390×844**, no bottom sheets parciales. Esto **corrige el supuesto de la Fase 5**, que asumía bottom sheet.
- **`Modal Dialog` sí es overlay centrado:** 358 de ancho, alto variable según contenido (229 en eliminar gasto, 282 en renovar membresía, 296 en exportar).
- **KPIs tienen dos tratamientos distintos:**
  - Home y Balance → `Metric Card` **apiladas** a 358 de ancho (94px c/u en Home; 106/106/92 en Balance).
  - Ventas y Gastos → **fila de 3 `Paragraph` compactos** de 93px, embebidos dentro del bloque `Search field`. No son cards.
- **Acción primaria comprimida a ícono:** lo que en desktop es un botón con texto de 177px, en mobile es el `New Client Button` de **40×36 icon-only** al lado del `Search Bar` (306px). Aplica en Clientes, Ventas y Gastos.
- **CTA sticky al fondo:** `Container` 389×85 con un botón de 341×36, anclado abajo. Aparece en Membresías (`2246:49888`) y Promociones (`2333:38036`).
- **Filtros:** los `Dropdown` bajan a 32px de alto y se reparten el ancho — 2 filtros → 159px c/u; 3 filtros → 108.67px c/u.
- **`Data Table` en mobile ocupa 358–390 de ancho y 481–544 de alto.** Existe como instancia, así que el diseñador definió alguna degradación. **Verificar visualmente en Fase 5 antes de diseñar el componente** — es la incógnita más importante que queda.

### 2.2 Diferencias mobile ↔ desktop que cambian el alcance

No son adaptaciones de layout: son **cambios de navegación y de funcionalidad**.

| Tema | Desktop | Mobile | Impacto |
|---|---|---|---|
| **Asistencias** | `Tabs` + `DateNavigation` opcional (`2118:28921`, `2118:28933`) | **Sin Tabs.** `DateNavigation` siempre presente (`2228:48632`) | Fase 9: definir si los tabs desaparecen también en desktop o si es divergencia intencional |
| **Configuración** | 4 sub-items en el sidebar (Negocio, Membresías, Promociones, **Usuarios**) | **`Tabs` dentro de la pantalla**, y **sólo 3: falta Usuarios** | Fase 14: dos patrones de navegación distintos + una pantalla sin diseñar |
| **Payment Receipt** | Presente en flows 3 y 7 (`2118:17883`, `2118:28076`) | **No aparece en ningún flow mobile** | Fase 8: ¿el comprobante no existe en mobile, o falta diseñarlo? |
| **Pago desde el Home** | "Registrar un pago", 10 pantallas (`2166:22898`) | "Renovar membresía desde acciones rápidas", 6 pantallas (`2222:43026`) | Fase 8: confirmar si son el mismo flow con menos pasos o dos flows distintos |
| **Alta de cliente** | Dos secciones separadas: desde Home (7 pantallas) y desde Clientes (4) | Una sola sección de 3 pantallas + el botón icon-only en Clientes | Fase 7: mobile sugiere que es **un** formulario con dos entradas, lo que valida el enfoque del plan |
| **Estado vacío** | Sin diseñar (3 anotaciones "ver estados") | **`Gastos/Vacío` (`2286:119862`) y Ventas en $0 (`2265:70904`) sí están diseñados** | Fase 5: usar estos dos como referencia canónica de empty state |
| **Copy de KPIs en Gastos** | "Total de gastos" (`2139:18310`) | **"Total cobrado"** (`2286:119875`, `2329:29066`) | Probable copy heredado del componente de Ventas sin ajustar. Usar "Total de gastos" y avisar al diseñador |

**Flows desktop sin equivalente mobile:** "Estado del home" (`2166:22899`) — cubierto de hecho por los Home de las otras secciones — y "Crear cliente desde Clientes" (`2167:22903`), cubierto por el botón icon-only del listado.

### 2.3 Validaciones pendientes de Ema (lista viva)

Lo que hace falta mirar en Figma para desbloquear la fase siguiente. **Se tacha cuando se responde.** Si algo se responde en una conversación, volcarlo acá — esta lista es el único lugar donde viven las preguntas abiertas de diseño.

| # | Qué hay que saber | Bloquea | Estado |
|---|---|---|---|
| 1 | Degradación del `Data Table` en mobile (358px) | Fase 5 | ✅ **Resuelto 2026-09-15** — ver [2.4](#24-presentación-de-componentes-confirmada) |
| 2 | Presentación del `Modal / Membership Form` en desktop | Fase 5 | ✅ **Resuelto** — panel lateral derecho 480×832 |
| 3 | ¿El rosa/magenta es la marca o placeholder? | Fase 5 | ✅ **Resuelto** — **es la marca de Actitud**. Ema: "hoy no es necesario que pienses en ello, podés mantener todo en escala de grises". Se construye con los tokens neutrales y la paleta se aplica en una pasada aparte |
| 4 | Ancho del drawer mobile (¿260px?) + íconos de **Gastos** y **Balance** | Nada — deuda de la Fase 4 | ⬜ |
| 5 | **¿El recargo por mora es override manual o sólo se muestra el calculado?** El form de renovación tiene Descuento y Recargo como selects, pero `billing-policy.ts` los calcula por día del mes | Fase 8 | ✅ **Resuelto 2026-09-21.** Ema: *"quiero proponer un precio y que el usuario sea libre de editarlo. En caso de tener recargo la UI debería sugerirlo porque se cumplen las condiciones, sugerir el monto pero no ser una regla 100% obligatoria."* → **sugerencia editable**, nunca regla. La premisa de la pregunta era falsa: `billing-policy.ts` **no** calculaba el recargo y el form no lo llamaba. Implementado en el ADR [20260921101140](../architecture/decisions/20260921101140_politica-de-cobro-unica-recargo-explicito-y-comprobante.md) |
| 6 | **¿"Sin membresía" es un estado real de cliente?** Aparece como opción del select de tipo en el alta | Fase 7 | ✅ **Resuelto 2026-09-18.** Ema: *"es como un estado inicial del cliente, idealmente vamos a cargar un cliente y él contendrá la relación a su membresía siempre"*. **No es un tipo del catálogo** (no se agrega `NONE` a `types_memberships`) y **no se ofrece en el alta**: toda alta crea membresía. El modelado quedó en "cliente sin fila en `customer_membership`" — que es el estado de 8 clientes en prod y el que el listado ya renderiza |
| 7 | **Las 8 pantallas de la Fase 6b** — dropdown de acciones de fila (`2118:22594`) + las 5 vistas del `Customer Detail Modal` + los 2 frames mobile (`2222:42619`, `2228:47961`) | Fase 6b | 🟡 Ema va a pasar las capturas. La cuota del MCP sigue agotada — ver [Fase 6b](#6b--qué-falta-y-qué-se-necesita-para-desbloquearlo) |

### 2.4 Presentación de componentes (confirmada)

Geometría extraída del árbol de nodos desktop (frame 1280×832) + capturas que pasó Ema el 2026-09-15. **Esto es vinculante para la Fase 5.**

| Componente | Desktop | Mobile |
|---|---|---|
| `Modal / Membership Form` | **Panel lateral derecho**, `x=800`, **480×832** (800+480=1280, anclado al borde, full-height) | **Full-screen 390×844** |
| `Customer Detail Modal` | Idéntico: panel lateral derecho 480×832 | Full-screen 390×844 |
| `Modal Dialog` | **Centrado**: `x=384`, 512×{229, 291, 322} — (1280−512)/2 = 384. Alto variable según contenido | Centrado, 358 de ancho |
| `Payment Receipt` | **Centrado**: `x=445`, 390×574 — mismo ancho que mobile | (ver nota en Fase 8) |
| `Data Table` | Tabla real, 839 de ancho, alto 175–566 según contenido | **Lista de filas apiladas, NO tabla.** Cada fila: avatar circular con iniciales + nombre + línea secundaria + badge de estado a la derecha. Sin headers de columna |

**Anatomía de la fila mobile** (confirmada en la captura de "Renovar membresía"):

```
┌──────────────────────────────────────────────┐
│ (AN)  Ana Beltrán              [ Vencida ]   │
│       Membresía: 5 días                       │
└──────────────────────────────────────────────┘
```

Avatar = iniciales sobre círculo gris. Badge: verde "Activo" / rojo "Vencida". El `getInitials` de [src/lib/format-person.ts](../../src/lib/format-person.ts) ya resuelve las iniciales — reusar, no reescribir.

**Consecuencia para la Fase 5:** `DataTable` necesita dos renders, no uno responsive por CSS. En desktop filas `<tr>`; en mobile una lista de filas con avatar+badge. Conviene modelarlo como un componente que recibe, además de las columnas, un render de fila mobile.

**Forma más barata de responder:** exportar esos frames a PNG en `docs/v2/figma/{node-id}.png` y commitearlos. Se leen desde el repo, quedan versionados y **elimina la dependencia de la cuota del MCP** (ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #10). Un screenshot pegado en la sesión, o una descripción de dos líneas, también sirven.

### 3. Protocolo de trabajo con el Figma (obligatorio por fase)

> ⚠️ **Esta sección asumía que se podía racionar la cuota del MCP por fase. No se puede** — son **6 llamadas por mes**, no por sesión (ver [sección 1](#1-figma--índice-de-nodos)). El protocolo real hoy es: **Ema pasa capturas**, y el paso 1 de abajo se cumple leyéndolas en vez de abriendo nodos. Así se resolvieron las fases 5, 6b, 7 y 8. El resto del orden sigue vigente tal cual.

**Al arrancar cada fase, en este orden:**

1. **Cubrir las pantallas del flow — desktop y mobile** (columna "Node ID" de las tablas de arriba, para pedirlas por nombre), en orden de flow. No barrer el archivo entero: sólo las de *esta* fase. Toda fase tiene ambas referencias salvo las excepciones listadas en [2.2](#22-diferencias-mobile--desktop-que-cambian-el-alcance).
2. **Volcar los hallazgos en la sección de la fase de este documento** — microcopy exacto, estados, variantes, comportamiento de los dropdowns, todo lo que el árbol de nodos no dice. Es lo que convierte una fase "inferida" en una fase "verificada".
3. **Marcar en la tabla de estado** que el diseño de la fase está verificado.
4. **Recién ahí implementar.**

**Si la cuota corta a mitad:** anotar en la sección de la fase qué nodos quedaron sin ver, y no implementarlos a ciegas. Mejor una fase parcial y honesta que una pantalla inventada.

**Alternativa recomendada a racionar cuota:** exportar los frames a PNG una sola vez desde Figma a `docs/v2/figma/{flow}/{node-id}.png` y commitearlos. Cualquier sesión futura los lee del repo sin gastar cuota, quedan versionados junto al plan, y el plan deja de depender de que el archivo de Figma no se mueva. Ver [Decisiones abiertas](#decisiones-abiertas--riesgos) #10.

### 4. Schema de base de datos

Snapshot en [src/lib/supabase/shemema.txt](../../src/lib/supabase/shemema.txt) (nota: el archivo tiene un typo en el nombre — `shemema`). Tablas actuales:

`assistance` · `customers` · `customer_membership` · `customer_groups` · `customer_group_members` · `types_memberships` · `membership_payments` · `discount_rules` · `expenses` · `profile` · `user_roles` · `user_feature_flags`

RPCs en uso desde el código: `get_membership_stats`, `get_top_customers_current_month`, `upsert_customer_membership_with_payment`, `upsert_customer_with_membership`.

El análisis de qué falta está en [Brechas de base de datos](#brechas-de-base-de-datos).

---

## Estrategia general

1. **Coexistencia paralela en el mismo repo.** V1 en `/[lang]/[tenant]/*`, v2 en `/[lang]/[tenant]/v2/*`. Hereda middleware, i18n, tenant, theming y auth. El flag `v2_access` decide quién ve v2.
2. **Componentes co-located por dominio.** Componentes compartidos entre dominios → `src/components/v2/`. Domain-specific → `src/[domain]/components/v2/`. La lógica de `src/[domain]/api/{client,server}.ts`, hooks, types y `src/lib/*` se comparte sin duplicar.
3. **Rollout por flow completo, no por pantalla suelta.** Cada fase entrega un flow del Figma end-to-end (entrada → estados intermedios → confirmación → feedback). Media pantalla no se mergea.
4. **Reuso agresivo de la lógica v1.** Antes de escribir cualquier función nueva de datos: buscar en `src/[domain]/api/server.ts` y `src/lib/*`. Si existe una versión v1, se reusa; si hay que cambiarla, se cambia en el lugar canónico (no se duplica en `v2/`).
5. **i18n obligatorio desde el día 1.** Todo string visible pasa por `useTranslations()` (client) o `const { t } = await api.fetch(lang, tenant)` (server). Namespace `v2.*` en `es.json` / `en.json`. Overrides tenant-específicos en `dictionaries/tenant/{tenant}.json`.
6. **Fechas AR-aware, sin excepciones.** Cualquier fecha que llegue a un RPC o a la DB pasa por [src/lib/timezone.ts](../../src/lib/timezone.ts). Ver [Regla crítica de timezone](#regla-crítica-de-timezone).
7. **DB primero cuando hay brecha.** Si un flow necesita columnas o tablas nuevas, la migración se diseña, se discute y se aplica en dev **antes** de escribir la UI. No se construye UI contra un modelo que no existe.

### Regla crítica de timezone

El negocio opera en `America/Argentina/Buenos_Aires` (UTC-3); Vercel corre en UTC. Un string crudo del datepicker (`"YYYY-MM-DD"`) enviado a supabase-js se interpreta como midnight UTC y queda 3 horas antes del intent, desalineando el mes contable. Es un bug **silencioso**.

Helpers obligatorios:

| Necesidad | Helper |
|---|---|
| String del datepicker → timestamp | `parseAppTzDateString(iso).toISOString()` |
| "Hoy" como ISO date | `getTodayIsoDateInAppTz()` |
| Rango del mes actual | `getMonthRangeInAppTz()` |
| Rango del día actual | `getTodayRangeInAppTz()` |
| ¿Venció? | `isExpiredInAppTz(date)` |
| Días hasta una fecha | `daysUntilInAppTz(date)` |

**Cada fase de este plan tiene una fila "Riesgo timezone" — no se cierra la fase sin auditarla.** Contexto histórico: ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md), sección "Reincidencia 2026-07-29" (91 pagos históricos desalineados por no aplicar la regla en un call site nuevo).

---

## Inventario de componentes compartidos v2

Componentes que el Figma instancia repetidamente a lo largo de los 17 flows. La columna "Estado" refleja el código en `develop` + rama actual.

| Componente Figma | Aparece en | Estado en código | Archivo destino |
|---|---|---|---|
| `Sidebar` | Todas las pantallas | ✅ existe | [src/components/v2/AppSidebar.tsx](../../src/components/v2/AppSidebar.tsx) — **desalineado con el Figma**, ver Fase 4 |
| `Header` | Todas las pantallas | ✅ existe | [src/components/v2/Header.tsx](../../src/components/v2/Header.tsx) — falta campana de notificaciones |
| `Metric Card` | Home, Balance | ✅ existe | [src/components/v2/MetricCard.tsx](../../src/components/v2/MetricCard.tsx) |
| `Card` (resumen/agenda) | Home, Balance | ✅ existe (parcial) | `DailySummaryCard.tsx`, `WeeklyAttendanceCard.tsx` |
| `Input Search` | Home, Clientes, Ventas, Gastos | ✅ existe | `AttendanceSearchCard.tsx` — extraer a genérico en Fase 5 |
| `Input Search Group` | Flow asistencia (search + resultados) | ✅ existe | dentro de `AttendanceSearchCard.tsx` |
| `Buttons` | Todas | ✅ **átomo propio de v2** | [v2/ui/Button.tsx](../../src/components/v2/ui/Button.tsx) — el de shadcn lleva geometría y tokens de v1 |
| `Toast` | Flows 1, 2, 8, 10, 14, 15 | ✅ `sonner` | [src/components/ui/sonner.tsx](../../src/components/ui/sonner.tsx) |
| `Customer Detail Modal` | Flows 1, 5, 6, 7 | ✅ **construido** | [SidePanel.tsx](../../src/components/v2/SidePanel.tsx). Lo consumen `AssistanceModal` y [CustomerProfilePanel.tsx](../../src/customer/components/v2/CustomerProfilePanel.tsx) (Fase 6b) |
| **`Data Table`** | Flows 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17 | ✅ **construido** | [DataTable.tsx](../../src/components/v2/DataTable.tsx) — doble render; `mobileRow` es prop requerido. Su pie es [DataTablePagination.tsx](../../src/components/v2/DataTablePagination.tsx) (Fase 6b) |
| **`Dropdown`** (filtro / acciones de fila) | Flows 5, 6, 7, 11–17 | ✅ **construido** | [FilterDropdown.tsx](../../src/components/v2/FilterDropdown.tsx) + [FilterBar.tsx](../../src/components/v2/FilterBar.tsx) |
| **`Modal / Membership Form`** | Flows 2, 3, 7, 8, 10, 11, 12, 14 | ✅ **construido** | [SidePanel.tsx](../../src/components/v2/SidePanel.tsx) — mismo shell que el Detail Modal: la geometría es idéntica |
| **`Modal Dialog`** (confirmación) | Flows 3, 7, 13, 15 | ✅ **construido** | [ConfirmDialog.tsx](../../src/components/v2/ConfirmDialog.tsx) |
| **`Payment Receipt`** | Flows 3, 7 | ❌ no existe | `src/membership/components/v2/PaymentReceipt.tsx` — Fase 8 |
| `Tabs` | Flows 6, 9, 17 | ✅ **átomo propio de v2** | [v2/ui/Tabs.tsx](../../src/components/v2/ui/Tabs.tsx) — subrayado. El de shadcn es la variante *pill*, que no es lo que dibuja el Figma |
| `Customer List` | Flow 9 | ❌ no existe | `src/assistance/components/v2/CustomerList.tsx` — Fase 9 |
| `DateNavigation` | Flow 9 | ⚠️ existe v1 | [src/assistance/day-navigator.tsx](../../src/assistance/day-navigator.tsx) — portar |
| `Form Input` | Flow 17 | ✅ shadcn `Input` + `Label` | — |
| `Textarea` | Flows 2, 8, 14, 17 | ✅ **átomo propio de v2** (Fase 7) | [v2/ui/Textarea.tsx](../../src/components/v2/ui/Textarea.tsx) |
| `DatePicker` | Flows 2, 3, 7, 9, 14 | ✅ **átomo propio de v2** (Fase 7) | [v2/ui/DatePicker.tsx](../../src/components/v2/ui/DatePicker.tsx) — el `UncontrolledDatePicker` de v1 mide 50px y pinta el ícono en blanco, invisible sobre la paleta clara |
| `ImageUpload` | Flow 17 | ❌ no existe | `src/components/v2/ImageUpload.tsx` — Fase 14. Requiere Supabase Storage |

**Regla de extracción:** un componente pasa a `src/components/v2/` cuando lo consumen **dos o más dominios**. Hasta entonces vive en el dominio. Es la regla que ya cristalizó el ADR de fase 1 y sigue vigente.

---

## Brechas de base de datos

Comparación entre el schema actual y lo que exigen los 17 flows. **Ninguna de estas migraciones está aplicada.**

### A. Bloqueantes duros (no se puede construir la UI sin esto)

#### A1. Ventas / productos — no existe modelo (Fase 12)

Los flows 11–13 muestran una sección Ventas con KPIs de "Total cobrado / Efectivo / Transferencias", tabla de ventas, filtros por 3 dropdowns, venta a cliente y venta a no-cliente, y export. **No hay ninguna tabla que soporte esto.**

Propuesta a discutir antes de implementar:

```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  price real NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),   -- NULL = venta a no cliente
  buyer_name varchar,                                  -- sólo si customer_id IS NULL
  total_amount real NOT NULL CHECK (total_amount >= 0),
  payment_method varchar NOT NULL
    CHECK (payment_method IN ('PAYMENT_CASH','PAYMENT_TRANSFER')),
  sale_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_buyer_check CHECK (customer_id IS NOT NULL OR buyer_name IS NOT NULL)
);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price real NOT NULL CHECK (unit_price >= 0),  -- snapshot del precio al momento de la venta
  subtotal real NOT NULL CHECK (subtotal >= 0)
);
```

Preguntas abiertas antes de escribir esto: ¿hay control de stock? ¿se puede editar/anular una venta? ¿el precio del producto se versiona o alcanza el snapshot en `sale_items.unit_price`? → [Decisiones abiertas](#decisiones-abiertas--riesgos) #5.

#### A2. Configuración del negocio — no existe tabla (Fase 14)

El flow 17 (`2141:51590`) muestra un form "General Information" con 4 `Form Input` (probablemente nombre, dirección, teléfono, email) + `ImageUpload` para el logo. No hay dónde guardarlo.

```sql
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  address varchar,
  phone varchar,
  email varchar,
  logo_url varchar,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Decisión previa: ¿fila única, o `tenant_id` desde ya para no migrar dos veces cuando llegue el 2do tenant? → [Decisiones abiertas](#decisiones-abiertas--riesgos) #6.
El logo además necesita un bucket de Supabase Storage con su política de acceso.

### B. Brechas de columna (la tabla existe pero le falta algo)

| # | Tabla | Falta | Por qué | Fase |
|---|---|---|---|---|
| B1 | `expenses` | `payment_method` | Los flows 14–16 muestran KPIs "Efectivo / Transferencias" en Gastos y en Balance. Hoy `expenses` no distingue medio de pago, así que ese desglose **no se puede calcular**. | 11 |
| B2 | `expenses` | `deleted_at` (o hard delete confirmado) | El flow 15 es "Eliminar gastos creados". Hoy `deleteExpense` hace hard delete. Decidir si el rediseño quiere papelera o borrado definitivo. | 11 |
| ~~B3~~ | `membership_payments` | ~~`receipt_number`~~ | ✅ **Aplicada el 2026-09-21** (migración `20260921101140`). Formato `YYYY-NNNNN`, secuencia por año en `receipt_counters` + `next_receipt_number()`, año tomado de la **fecha del pago** y no de `now()`. Nullable sin backfill: los pagos históricos se reimprimen sin número. **El diseño del comprobante no lo pedía** — se agregó igual porque un comprobante que el cliente menciona en un reclamo tiene que ser buscable. La misma migración cerró el recargo explícito, que sí es una brecha nueva que el plan no tenía anotada. | ~~8~~ ✅ |
| ~~B4~~ | `assistance` | ~~UNIQUE `(customer_id, fecha-en-AR)`~~ | ✅ **Aplicada el 2026-09-17** (migración `20260917120100`, ADR [20260917120000](../architecture/decisions/20260917120000_integridad-de-escritura-pagos-y-asistencias.md)). Índice UNIQUE sobre el día calendario AR + limpieza de 28 duplicados + recomputo de `assistance_count`. El error `23505` se traduce a `assistance.alreadyRegisteredToday` en las dos UIs. | ~~3~~ ✅ |
| B5 | `customers` | `person_id` sin UNIQUE | Se pueden dar de alta dos clientes con el mismo DNI. Los flows 2 y 8 (alta de cliente) deberían detectarlo. | 7 |
| B6 | `types_memberships` | `active`, `description` | El flow 10 es un CRUD de planes de membresía. Sin `active` no se puede discontinuar un plan sin romper el histórico de pagos que lo referencian. | 10 |
| B7 | `discount_rules` | `valid_from`, `valid_to` | La sección Configuración → Promociones sugiere promos con vigencia. Hoy sólo hay `active` booleano. | 14 |
| B8 | `profile` | `email` | Configuración → Usuarios necesita mostrar/invitar por email. Hoy el email vive sólo en `auth.users`. | 14 |
| B9 | — | tabla de notificaciones | El header del Figma tiene campana con badge. No hay modelo. Puede resolverse como derivado (membresías por vencer) sin tabla. | 4 |
| ~~B10~~ | `customers` | ~~`birth_date`~~ | ✅ **Aplicada en la Fase 6b** (migración `20260916150000`). La pide el alta (Fase 7) y la **muestra** el tab Info del perfil, por eso se adelantó. | ~~7~~ 6b |
| ~~B11~~ | `customers` | ~~`notes`~~ | ✅ **Aplicada en la Fase 6b** (misma migración). Ídem: la escribe el alta, la muestra el perfil. | ~~7~~ 6b |
| ~~B12~~ | `customer_membership` | ~~`start_date`~~ | ✅ **Aplicada en la Fase 7** (migración `20260918120000`). Nullable, sin backfill. El fallback `start_date ?? last_payment_date` vive en `getMembershipPeriodStart()` ([src/membership/period.ts](../../src/membership/period.ts)). **La migración tocó los dos RPC, no sólo la tabla**: escribirlo sólo en el alta habría congelado el valor en la fecha de alta y la barra de progreso del perfil habría mostrado un dato peor que el fallback. | ~~7~~ ✅ |
| ~~B13~~ | `customer_membership` | ~~soportar **"Sin membresía"**~~ | ✅ **Resuelta en la Fase 7 sin migración.** Se sacó del select: toda alta crea membresía. Se descartó el tipo `NONE` en `types_memberships` porque un centinela contaminaría el CRUD de la Fase 10, los precios, accounting y el select de renovación. **El estado sigue existiendo** — 8 clientes en prod sin fila en `customer_membership`, que el listado sigue mostrando como "Sin membresía". | ~~7~~ ✅ |

### C. Defecto latente detectado en el schema actual → ✅ **cerrado del todo**

> ✅ **Residuo cerrado en la Fase 7 (2026-09-18).** El overload legacy de 10 parámetros tenía **un solo consumidor** — `_upsertCustomer` en [client.ts](../../src/customer/api/client.ts) — que se migró al de 14, el que valida con `MISSING_PAYMENT_METHOD`. El legacy quedó sin llamadores y lo borra la migración `20260918120100`, que **va después del release** porque el código hoy en producción todavía lo llama. Ver ADR [20260918112629](../architecture/decisions/20260918112629_v2-alta-de-cliente.md). El registro de cómo se llegó hasta acá queda abajo.

> **Cerrado en la columna** por la migración `20260917120000` — ADR [20260917120000](../architecture/decisions/20260917120000_integridad-de-escritura-pagos-y-asistencias.md). Se confirmó contra producción que el defecto era real, y **el arreglo obvio habría empeorado el bug**: sacar sólo el `DEFAULT` deja pasar `NULL`, porque un CHECK pasa cuando su expresión no es `FALSE` y `NULL = ANY(ARRAY[...])` devuelve `NULL`. Un pago sin método no rompe nada visible pero descuadra el desglose "Efectivo / Transferencias" de ingresos y del Balance. Se aplicó `DROP DEFAULT` **+ `SET NOT NULL`**, y `payment_method` pasó a requerido en `CreateMembershipPaymentData`. Descripción original abajo, como registro.
>
> ⚠️ **Residuo abierto — el mismo literal vive dentro del RPC.** Auditando el impacto del `NOT NULL` (2026-09-17) apareció que en prod **conviven dos overloads** de `upsert_customer_membership_with_payment`:
>
> - El **de 14 parámetros** (con descuentos) valida bien: si `p_payment_type` viene nulo o vacío corta con `MISSING_PAYMENT_METHOD` antes de insertar. Lo usa la renovación de membresía.
> - El **legacy de 10 parámetros** escribe `COALESCE(p_payment_type, 'efectivo')` en sus tres caminos, sin guarda. **Y es el que llama el alta de cliente** ([client.ts](../../src/customer/api/client.ts), paso 2), que pasa sólo los 10 params base.
>
> El `NOT NULL` **no cambia nada acá**: `COALESCE` nunca produce `NULL`, produce un método válido o `'efectivo'`, que ya violaba el CHECK antes y lo sigue violando. No hay regresión — pero el camino de falla sigue existiendo: **un alta con "pagó" tildado y forma de pago vacía falla**, hoy y después.
>
> Por qué no se arregló en la misma migración: tocar el RPC es "cambiar el comportamiento de una función que el código ya usa", que la taxonomía de [workflow.md](../../workflow.md) marca como peligrosa, y el alta es justamente la **Fase 7** — que además tiene que decidir si sigue usando el overload legacy o migra al de 14 params. Se resuelve ahí, con el flow de cobro que a esa fase ya le falta.
>
> Los dos overloads existen **igual en dev y en prod**, así que no es divergencia de entornos ni riesgo del release.

**`membership_payments.payment_method` tenía `DEFAULT 'efectivo'` pero el CHECK sólo admite `'PAYMENT_CASH'` / `'PAYMENT_TRANSFER'`.**

```sql
payment_method character varying DEFAULT 'efectivo'::character varying
  CHECK (payment_method::text = ANY (ARRAY['PAYMENT_CASH'::text, 'PAYMENT_TRANSFER'::text]))
```

Cualquier `INSERT` que **omita** `payment_method` toma el default `'efectivo'`, viola el CHECK y falla. [`createMembershipPayment`](../../src/accounting/api/server.ts) inserta `paymentData` con `payment_method` opcional (`CreateMembershipPaymentData.payment_method?: string`), así que el camino de falla existe hoy.

No se rompió todavía porque los call sites actuales siempre mandan el método. **Verificar en dev antes de tocar el flow de pagos (Fase 8)** y, si se confirma, arreglar el default en la misma migración. No es parte de la v2 pero se cruza con ella.

---

## Fases 0–2 (histórico)

Cerradas. El detalle de implementación vive en los ADRs linkeados en la tabla de estado. Lo que queda como **convención vigente** para todo lo que venga:

- **Theming scoped:** los tokens del Figma viven en `globals.css` bajo `[data-v2='true']` y sobreescriben las mismas CSS vars que emiten los tenants v1, así los primitives shadcn ya instalados funcionan sin cambios.
- **Layout AppShell:** NO usar `variant='inset'` de shadcn Sidebar. Layout custom: `<SidebarProvider>` → `<aside className='rounded-lg bg-primary-contrast border w-[255px]'>` inline en desktop / `<Sheet>` en mobile, + `<main>` con `pl-6 lg:pl-12`. `AppSidebar` es contenido puro, sin wrapper `<Sidebar>`.
- **Header, Sidebar y Main son cards individuales** (rounded-lg + border + `bg-primary-contrast`) sobre fondo blanco.
- **Padding externo del viewport** en `globals.css` sobre `[data-v2]`: `1rem 1.5rem` mobile, `2rem 3rem` desktop (≥1024).
- **`data-v2='true'` hay que propagarlo explícitamente a cualquier primitive que renderice via portal** (`Sheet`, `Dialog`, `Popover`, `DropdownMenu`). Radix monta fuera del wrapper `[data-v2]` y sin eso hereda la paleta del tenant v1.
- **…y ese portal necesita además un `!p-*` explícito.** `globals.css` aplica `[data-v2='true'] { padding: 2rem 3rem }` para el padding externo del viewport, así que el portal hereda 48px horizontales que se suman a su padding propio. Un `p-0` común pierde por especificidad: va con `!`. (Descubierto en la fase 5 tras repetir el error en tres primitivas.)

  Para no depender de la memoria, este comando lista cada portal con `data-v2` y marca los que no tienen el override:

  ```bash
  grep -rn "data-v2='true'" src --include=*.tsx | grep -v layout.tsx | while IFS=: read -r f l r; do
    sed -n "$((l>14?l-14:1)),$((l+3))p" "$f" | grep -qE '!p-[0-9]|!px-' \
      && echo "  ok   $f:$l" || echo "  FALTA $f:$l"
  done
  ```

  (Las menciones de `data-v2` dentro de comentarios dan falso positivo; verificar a mano las que marque.)
- **La escala de color del `@theme` NO lleva guion antes del número.** Es `primary300`, `primary400`, `primary` (= el 500), `primary600`… Escribir `bg-primary-500` **no genera ninguna utilidad**: el fondo queda transparente y ni el type-check ni el lint lo detectan — sólo se ve mirando la pantalla. Pasó en el `Stepper` de la fase 5, donde el círculo del paso activo quedaba invisible (texto casi blanco sobre fondo transparente). Ante la duda, verificar el bloque `@theme` de `globals.css` antes de inventar una clase.
- **Los botones de v2 salen de `@/components/v2/ui/Button`, no del `Button` de shadcn.** El de shadcn lleva la geometría de v1 (`rounded-[4px]`, `font-headline`) y apunta a los tokens del tenant viejo. Variantes: `contained` (acción primaria, `bg-foreground`), `outlined` (secundaria), `ghost`, `destructive`. Para envolver un `<Link>`, `asChild`. **No usar para afordances de ícono ni filas clickeables** — ésos no son botones visuales.
- **Cuidado con los wrappers de shadcn que aplican estilos propios.** `AlertDialogCancel` y `AlertDialogAction` hardcodean `buttonVariants()` de v1 en su `className`, así que pasarles un Button de v2 por `asChild` no alcanza: el wrapper lo pisa igual. En esos casos hay que usar el primitive de Radix directamente (`AlertDialogPrimitive.Cancel`). Verificar esto en cada primitive v2 que envuelva algo de `components/ui/`.
- **Antes de reusar cualquier primitive de `components/ui/` en v2, verificar su altura y su `rounded`.** Están customizados para v1 y arrastran su geometría: el `Input` mide ~56px (`text-base` + `py-4`) contra los 36px del Figma, y el `SelectTrigger` lo mismo. Ya hay tres casos (`Button`, `Input`, `Select`). Si no matchean, el átomo va a `v2/ui/`.
- **…y verificar también si hardcodea colores.** `SelectItem` y `SelectContent` de v1 fijan `text-white` directo, lo que en la paleta clara de v2 deja el item resaltado invisible. En cambio `DropdownMenuItem` usa tokens (`focus:bg-accent`) y funciona bien. El criterio no es "v1 malo": es **hardcodeo vs token**. Cuando hardcodea, se baja al primitive de Radix y se construye el átomo en `v2/ui/` — ya hay tres: [Button](../../src/components/v2/ui/Button.tsx), [Input](../../src/components/v2/ui/Input.tsx) y [Select](../../src/components/v2/ui/Select.tsx).
- **La `FilterBar` es una sola fila en desktop** — `[search flexible] [dropdowns] [acción primaria]` — y dos en mobile: search + acción icon-only arriba, dropdowns repartiéndose el ancho abajo. Se resuelve con un solo contenedor `flex-wrap` + utilidades `order`, no con dos contenedores. Aplica a Clientes, Ventas, Gastos y Configuración. (Verificado por captura en la fase 6.)
- **El trigger de un `FilterDropdown` sin filtro aplicado muestra el nombre del filtro** ("Estado", "Membresías"), no el label de la opción "todos". Ese label largo sólo se ve dentro de la lista.
- **Un `<input type='search'>` trae el botón de cancelar de WebKit**, que convive con el botón de limpiar propio y deja dos afordancias para la misma acción. El átomo [Input](../../src/components/v2/ui/Input.tsx) lo esconde con `[&::-webkit-search-cancel-button]:hidden`, y el `type='search'` se mantiene por la semántica. No sale en Firefox, así que es de los bugs que sólo se ven en el navegador correcto.
- **⚠️ Todo átomo con `w-full` en su base necesita ancho propio cuando comparte fila.** `Input` y `SelectTrigger` son `w-full` porque nacieron para ocupar el ancho de su campo en un formulario. Dentro de un contenedor `w-auto` eso significa "100% del contenedor": **dos hermanos al 100% se desbordan y pintan encima del elemento siguiente** — no se recortan ni empujan, se superponen, así que no se ve como un problema de layout sino como un componente roto. Pasó con los dos dropdowns tapando el botón "Nuevo cliente". El fix es un ancho explícito por breakpoint (`sm:w-44`), que `twMerge` deja convivir con el `w-full` de la base porque son modifiers distintos. Vale para las 4 secciones con `FilterBar` que quedan.
- **El header de un `DataTable` es una banda gris con esquinas redondeadas**, no una fila con borde inferior. Con `border-separate` el radius va en las celdas de los extremos: un `<tr>` no acepta `overflow: hidden`.
- **El avatar de iniciales va también en la tabla desktop**, no sólo en la fila mobile — está en la celda de nombre. Por eso `DataTableAvatar` es un export propio.
- **Los campos y botones de una misma fila miden 36px** (`h-9`). Es el valor del Figma: `Input Search` 622×36 junto a `Buttons` 177×36 en el home, `Search Bar` 306×36 junto a `New Client Button` 40×36 en Clientes. Los dropdowns de filtro, que van en su propia fila, miden 32px.
- **El radius de v2 es `rounded-lg`, no `rounded-xl`.** Bajo `[data-v2]`, `globals.css` define `--radius: 0.5rem` ("Figma radius-md"), y `rounded-lg` mapea a ese token. **`rounded-xl` es un literal de Tailwind de 12px** que ignora el token y queda 50% más redondo que el diseño. Había 16 usos en v2; se corrigieron todos. Es la misma clase de error que `bg-primary-500`: escribir una utilidad de Tailwind en vez del token del proyecto.
- **Las alturas de los átomos son explícitas (`h-8`/`h-9`), no derivadas del padding.** Dejarlas emerger de `py-*` hacía que dos elementos de la misma fila alinearan por casualidad — o no alinearan.
- **Los átomos van en `src/components/v2/ui/`**, los compuestos en `src/components/v2/`. Criterio: si compone otros componentes o tiene estado propio, es compuesto; si es una pieza terminal de presentación, es átomo.
- **Nada de `useIsMobile()` para decidir qué se monta.** Causa flash de hidratación. Gate por CSS (`hidden md:flex`) y dejar ambos montados.
- **Wrappers dentro del AppShell necesitan `flex-1 w-full min-w-0`**, si no colapsan al mínimo de sus children en pantallas anchas.
- **Y `min-h-0` en la columna vertical**, si no una página más alta que el viewport desborda el `h-dvh` del wrapper `[data-v2]` y se dibuja sobre el fondo del tenant v1. Es el gemelo vertical de la regla anterior. (Fase 5.)
- **Formatear fechas en el server y pasar strings al client.** `format(new Date(), ...)` dentro de un `'use client'` genera hydration mismatch y arrastra `date-fns/locale/es` al bundle.
- **Sub-componentes explícitos en vez de mega-render con ramas inline** (regla `patterns-explicit-variants`).
- **En Server Components la traducción sale de `getServerT()`**: `import { getServerT } from '@/lib/i18n/server'` → `const { t } = await getServerT()`. Devuelve también `lang` y `tenant`, resueltos una sola vez por request (está wrappeado en `React.cache`, así que llamarlo en el layout y en tres componentes del mismo request no repite el fetch).

  > **Corrección (2026-09-16).** Esta convención decía que `getServerT()` **no existe** y que había que usar `api.fetch(lang, tenant)` con `lang`/`tenant` threading por props. Era cierto hasta el PR [#50](https://github.com/EmaCrzz/actitud-bo/pull/50), que introdujo `getServerT()` justamente para eliminar ese threading (ADR [20260908111054](../architecture/decisions/20260908111054_centralizar-resolucion-de-lang-tenant-en-i18n.md)) — y el plan quedó contradiciendo al código que el propio plan había pedido. Tercer claim desactualizado encontrado al ejecutar una fase; ver la nota de la Fase 4.

---

## Fase 3 — Flow "Registrar asistencia"

**Estado:** ✅ mergeada en `develop` (PR [#49](https://github.com/EmaCrzz/actitud-bo/pull/49), 2026-08-19) · **con pendientes abajo**
**Figma:** desktop `2166:22896` (7 pantallas) · **mobile `2222:43033` (4 pantallas)**.

### Qué ya está hecho

Los 3 commits de `feat/v2-attendance-modal` están en `origin/develop`, no en `main` (main quedó en el release v0.11.0):

- `src/home/components/v2/AssistanceModal.tsx` (424 líneas) — modal de registro con datos del cliente, slots semanales según `SLOTS_BY_TYPE`, aviso de membresía vencida, confirmación optimista y `SuccessTick` animado.
- `src/components/SuccessTick.tsx` (352 líneas) — animación de éxito sin dependencias externas. ADR [20260819163000](../architecture/decisions/20260819163000_success-tick-animation.md).
- `AttendanceSearchCard.tsx` — search conectado con resultados y selección.
- Búsqueda de clientes insensible a acentos — migración `20260819170000_customer_search_unaccent.sql` + `src/lib/utils/text.ts`. ADR [20260819170000](../architecture/decisions/20260819170000_busqueda-de-clientes-insensible-a-acentos.md).
- Helpers nuevos: `buildWeekSlots` en `src/assistance/utils.ts`, `formatDayLabelInAppTz` / `formatTimeInAppTz` en `src/lib/format-date.ts`, `getInitials` en `src/lib/format-person.ts`.

### Qué falta para cerrar la fase

1. **Verificar contra el Figma real.** Ninguna de las 6 pantallas desktop más allá del home fue inspeccionada visualmente, ni ninguna de las 4 mobile. Nodos a abrir, en orden de prioridad:
   - Desktop: `2065:16139` (modal) → `2117:5939` (registro) → `2117:8258` (toast) → `2064:14532` + `2065:15004` (búsqueda y su loading).
   - Mobile: `2175:26167` (Customer Detail Modal full-screen) → `2175:25926` (búsqueda con resultados) → `2175:25752` (home scroll).
   - **El `AssistanceModal.tsx` actual usa `Sheet`.** El mobile del Figma es full-screen 390×844, así que probablemente esté bien — pero verificar `2175:26167` antes de darlo por cerrado.
2. **Estado de loading de la búsqueda** (`2065:15004`). Confirmar si es skeleton de filas o spinner, y si el input queda deshabilitado.
3. ~~**Duplicado de asistencia** (brecha B4).~~ ✅ **Resuelto el 2026-09-17** — ADR [20260917120000](../architecture/decisions/20260917120000_integridad-de-escritura-pagos-y-asistencias.md). Quedó con las tres capas que recomendaba este punto: la UI ya prevenía (`hasAssistanceToday` deshabilita el botón en el modal v2 y en la pantalla v1), el índice UNIQUE sobre el día calendario AR garantiza, y `isDuplicateAssistanceError` traduce el `23505` al copy `assistance.alreadyRegisteredToday` que ya existía.
4. **Toast de éxito** (`2117:8258`). Verificar copy, duración y si es global (`sonner`) o inline.
5. **Refresh del home post-registro.** Confirmar que "Asistencias de hoy", "Resumen del día" y "Asistencias semanal" se actualizan sin full reload.

### Datos y API

| Necesidad | Dónde está |
|---|---|
| Buscar cliente | `useCustomerSearch` + `searchAllCustomers` ([src/customer/api/server.ts](../../src/customer/api/server.ts)) |
| Datos del cliente para el modal | `fetchCustomerModalData` ([src/assistance/api/client.ts](../../src/assistance/api/client.ts)) |
| Crear asistencia | `createAssistance` ([src/assistance/api/client.ts](../../src/assistance/api/client.ts)) |
| Asistencias de la semana | `getAssistancesByWeek` ([src/assistance/api/server.ts](../../src/assistance/api/server.ts)) |
| Métricas del home | `getHomeMetrics`, `getDailySummary`, `getWeeklyAttendanceSummary` ([src/home/api/server.ts](../../src/home/api/server.ts)) |

**Riesgo timezone:** alto. `assistance_date` define a qué día contable pertenece el registro y alimenta las tres métricas del home. Auditar que `createAssistance`, `getAssistancesByWeek` y `buildWeekSlots` usen `getTodayRangeInAppTz` / `isSameDayInAppTz` y no comparaciones UTC.

**Definición de hecho:**
- [ ] Las 6 pantallas restantes verificadas contra el Figma
- [x] Duplicado de asistencia resuelto (UX + constraint) *(2026-09-17, fuera de la rama de la fase)*
- [ ] Loading de búsqueda implementado
- [ ] Home se refresca post-registro sin reload
- [ ] Auditoría de timezone escrita en el ADR
- [ ] `npm run type-check` y `npm run lint` OK
- [ ] Sin regresiones en `/home`, `/customer`, `/assistances` (v1)

**ADR:** ya existe ([20260819130435](../architecture/decisions/20260819130435_v2-attendance-modal.md)). Extenderlo con lo que salga de los puntos 1–5.

---

## Fase 4 — Navegación v2 real

**Estado:** ✅ completa — rama `feat/v2-navegacion-sidebar`. ADR [20260915132556](../architecture/decisions/20260915132556_v2-navegacion-real-y-rutas-stub.md).
**Figma:** instancia `Sidebar` presente en todas las pantallas. Desktop verificado visualmente en `2060:11534`; **mobile es un drawer de 260×844 sobre overlay** — ver `2174:24784` y `2201:58513`.

> **Pendiente de verificación visual** (la cuota del MCP se agotó antes de abrir los nodos mobile):
> - **Ancho del drawer mobile.** El árbol de nodos dice 260px; el `SheetContent` actual no se ajustó. Sin tocar, a propósito.
> - **Íconos de Gastos y Balance.** Se eligieron `Receipt` y `Wallet` por criterio propio. Labels y orden sí están verificados.
>
> Resolver ambos cuando se abra la próxima ventana de cuota, o al arrancar la Fase 5.

### Problema (resuelto)

El sidebar implementado **no coincidía con el del Figma**. Comparación:

| Figma (`2060:11534`, verificado) | [AppSidebar.tsx](../../src/components/v2/AppSidebar.tsx) actual |
|---|---|
| Inicio | `v2.sidebar.menu.home` ✅ |
| Clientes | `v2.sidebar.menu.customers` ✅ |
| **Asistencias** (3er lugar) | `v2.sidebar.menu.attendance` (5to lugar) ⚠️ orden |
| **Membresías** (4to) | `v2.sidebar.menu.memberships` (3ro) ⚠️ orden |
| Ventas | `v2.sidebar.menu.sales` ✅ |
| **Gastos** | `v2.sidebar.menu.cashRegister` (Caja) ❌ **no existe en el Figma** |
| **Balance** | `v2.sidebar.menu.reports` (Reportes) ❌ **no existe en el Figma** |
| Configuraciones → Negocio · Membresías · Promociones · Usuarios | idéntico ✅ |

Además, sólo "Inicio" tiene `href`. El resto son items muertos.

### Alcance

1. **Alinear los items** al Figma: renombrar `cashRegister` → `expenses` (Gastos) y `reports` → `balance` (Balance), reordenar, actualizar keys en `es.json` / `en.json`.
2. **Rutas stub** bajo `/v2/`: `home` (existe), `customers`, `attendance`, `memberships`, `sales`, `expenses`, `balance`, `settings/{business,memberships,promotions,users}`. Cada una un Server Component con `AppShell` + `EmptyState` "En construcción". Así el sidebar navega de verdad y cada fase siguiente sólo llena su página.
3. **Constantes de ruta v2** en `src/consts/routes.ts` (o `routes-v2.ts` si se prefiere no mezclar) — nada de strings sueltos.
4. **Active state por ruta** — ~~`isActive` hoy usa `pathname?.endsWith(item.href)`, que va a dar falsos positivos con rutas anidadas (`/v2/settings/memberships` vs `/v2/memberships`)~~.

   > **Corrección (2026-09-15, al implementar).** Ese claim era **falso**: `'/v2/settings/memberships'.endsWith('/v2/memberships')` da `false`, porque el sufijo real es `ings/memberships`. El defecto verdadero era el **opuesto** — un falso *negativo*: ninguna sub-ruta (`/v2/customers/123`) mantenía su ítem padre activo. Se implementó un helper `isRouteActive(pathname, href)` que cubre sub-rutas y sigue comparando por sufijo (el pathname puede venir prefijado con `/{lang}/{tenant}`).
5. **Header: campana de notificaciones.** Está en el Figma con badge. Sin tabla de notificaciones (brecha B9), la opción barata es derivarlo de membresías por vencer + vencidas (ya hay `getUpcomingExpirationsCount` y `getExpiredMembershipsCount` en [src/home/api/server.ts](../../src/home/api/server.ts)). Si no se define el contenido, dejar el ícono sin badge antes que inventar datos.

**Riesgo timezone:** bajo (salvo el badge de notificaciones, que si sale de expiraciones usa `isExpiredInAppTz` / `daysUntilInAppTz`).

**Definición de hecho:**
- [x] Sidebar alineado al Figma en items, orden y labels
- [x] Las 10 rutas stub nuevas responden y el active state es correcto (incluye sub-rutas)
- [x] Colapsado (64px) y mobile (Sheet) siguen funcionando con los items nuevos
- [x] Keys nuevas en `es.json` y `en.json` (`expenses`, `balance`, `underConstruction.*`)
- [x] Sin strings de ruta hardcodeados — todo sale de `ROUTES_V2`
- [x] `type-check` limpio · `lint` en 22 warnings / 0 errores (baseline de `develop`)
- [ ] Verificación visual del drawer mobile y de los íconos (ver nota arriba)

**Punto 5 (campana de notificaciones): NO se hizo.** Se difiere. El Figma la muestra con badge pero no hay modelo de datos (brecha B9), y derivarla de membresías por vencer es una decisión de producto, no de navegación. Mezclarla con el renombre de la taxonomía habría ensuciado el alcance. Queda como decisión abierta #9.

**ADR:** ✅ [20260915132556](../architecture/decisions/20260915132556_v2-navegacion-real-y-rutas-stub.md).

---

## Fase 5 — Primitivas transversales v2

**Estado:** ✅ completa — rama `feat/v2-primitivas`. ADR [20260916093140](../architecture/decisions/20260916093140_v2-primitivas-transversales.md).
**Sandbox de revisión:** `/v2/sandbox` (temporal — se borra cuando las primitivas estén consumidas por secciones reales).

Esta fase no entregó ninguna pantalla de usuario: entregó los componentes que las fases 6 a 14 instancian decenas de veces.

### Qué quedó construido

**Átomos** — `src/components/v2/ui/`. Existen porque los primitives de `components/ui/` están customizados para v1 y arrastran su geometría o hardcodean colores:

| Componente | Por qué no se reusó el de v1 |
|---|---|
| [Button](../../src/components/v2/ui/Button.tsx) | El de shadcn trae `rounded-[4px]` y `font-headline`, y sus variantes apuntan a tokens del tenant viejo. Variantes: `contained` · `outlined` · `ghost` · `destructive`. Tamaños `sm` (32px) · `md` (36px) · `icon`. `asChild` para envolver un `<Link>` |
| [Input](../../src/components/v2/ui/Input.tsx) | El de v1 mide ~56px (`text-base` + `py-4`); el Figma pide 36px |
| [Select](../../src/components/v2/ui/Select.tsx) | `SelectContent` tiene `text-white` en su base y `SelectItem` hardcodea `data-[highlighted]:text-white` — sobre la paleta clara de v2 el item resaltado quedaba invisible. Construido sobre los primitives de Radix |
| [StatusBadge](../../src/components/v2/ui/StatusBadge.tsx) | Nuevo. Los badges Activo/Vencida de todas las listas |

**Compuestos** — `src/components/v2/`:

| Componente | Notas |
|---|---|
| [DataTable](../../src/components/v2/DataTable.tsx) | **Dos renders, no uno responsive.** Tabla `<table>` en desktop; en mobile una lista de filas. `mobileRow` es prop **requerido** para que el compilador recuerde el mobile en cada sección. Incluye `DataTableMobileRow` con la forma estándar del Figma (avatar + nombre + subtítulo + badge) y skeletons |
| [SidePanel](../../src/components/v2/SidePanel.tsx) | **Absorbió a `FormModal` y `DetailModal`**: la geometría del Figma es idéntica para los dos (`x=800, 480×832` desktop, `390×844` full-screen mobile). Slot `pinned` para el `Stepper` o la ficha del cliente. Slot `avatar` para cuando el título es la identidad del cliente |
| [ConfirmDialog](../../src/components/v2/ConfirmDialog.tsx) | Centrado, 512 de ancho. Usa los primitives de Radix directo: los wrappers `AlertDialogCancel`/`Action` de shadcn hardcodean `buttonVariants()` de v1 |
| [FilterBar](../../src/components/v2/FilterBar.tsx) + [FilterDropdown](../../src/components/v2/FilterDropdown.tsx) | Se compone con children; la cantidad de dropdowns varía por sección |
| [Stepper](../../src/components/v2/Stepper.tsx) · [EmptyState](../../src/components/v2/EmptyState.tsx) · [PageHeader](../../src/components/v2/PageHeader.tsx) | Piezas menores |

**Fuera de `v2/`:** se agregó `min-h-0` a la columna del main del [AppShell](../../src/components/v2/AppShell.tsx) — sin eso, una página más alta que el viewport desbordaba sobre el fondo del tenant v1. Y se unificaron los botones del home v2, que tenían dos `contained` y dos `outlined` distintos entre sí.

### Definición de hecho

- [x] Primitivas construidas, con sandbox para verlas en aislamiento
- [x] Estados vacío / cargando / error resueltos en `DataTable` como slots (la primitiva no decide copy, así que no agrega keys de i18n)
- [x] `data-v2='true'` + su `!p-*` en todos los portales — [comando de auditoría](#fuentes-de-verdad) en las convenciones
- [x] `AssistanceModal` refactorizado sobre `SidePanel`
- [x] `type-check` limpio · `lint` en 22 warnings / 0 errores (baseline de `develop`)
- [ ] **Responsive verificado a 1440 / 768 / 375** — falta el paso por 375
- [ ] **Accesibilidad:** foco atrapado en modales, navegación por teclado en la tabla. Los `aria-label` están; el resto no se verificó

### Deuda que queda

- **`PrimitivesSandbox.tsx` no usa i18n.** Excepción consciente (es un harness de dev), documentada en el ADR.
- **Paginación de `DataTable`:** no se implementó. Ningún wireframe la muestra y agregarla después es aditivo. Sigue como [decisión abierta](#decisiones-abiertas--riesgos) #4.
- **Paleta:** todo en escala de grises. El rosa de marca entra en una pasada dedicada sobre las CSS vars de `[data-v2]`.

### Lo que esta fase dejó como convenciones

Seis problemas de estilo encontrados en revisión visual — ninguno detectable por `type-check` ni `lint`. Todos promovidos a reglas en la [lista de convenciones](#fases-02-histórico): el `!p-*` de los portales, el `min-h-0`, la escala de color sin guion (`primary`, no `primary-500`), el radius `rounded-lg` y no `rounded-xl`, los wrappers de shadcn que hardcodean estilos, y la diferencia entre primitives que usan tokens y los que hardcodean colores.

---

## Fase 6 — Sección Clientes + Modal perfil de cliente

**Estado:** ✅ **completa** — 6a (listado) y 6b (perfil del cliente + paginación). ADRs [20260916120738](../architecture/decisions/20260916120738_v2-listado-de-clientes.md) y [20260916161500](../architecture/decisions/20260916161500_v2-perfil-de-cliente-y-paginacion.md).
**Figma:** desktop `2167:22900` (3 pantallas) + `2167:22901` (5 pantallas) · **mobile `2222:43027` (7 pantallas: 2 de listado + 4 del Detail Modal + 1 con drawer)**.

> **Por qué se partió.** La cuota del MCP de Figma se agotó en la **primera** llamada de la sesión del 2026-09-16 (`2167:22900`), así que se implementó el listado con lo que daba el árbol de nodos. 6b quedó bloqueada hasta que Ema pasó las capturas del perfil, en la sesión siguiente del mismo día.
>
> **Moraleja operativa — versión endurecida.** 6a ya había aprendido que el árbol de nodos no alcanza para columnas ni microcopy. Las capturas de 6b mostraron que tampoco alcanza para **detectar controles enteros**: no aparecían ni el paginador ni tres de los cinco valores del filtro `Estado`. La regla pasa de *"pedir la captura antes de definir columnas"* a **"pedir la captura antes de definir la pantalla"**, y aplica a todas las fases con tabla que vienen (10, 11, 12, 14).
>
> **La cuota del MCP no se renueva en el día.** Se reintentó `2167:22900` en una segunda sesión del 2026-09-16 y devolvió el mismo rate limit. Reintentar mañana no es una estrategia — ver [decisión abierta #10](#decisiones-abiertas--riesgos).

### 6a — Qué quedó construido

Rama `feat/v2-clientes`, ADR [20260916120738](../architecture/decisions/20260916120738_v2-listado-de-clientes.md).

| Archivo | Qué es |
|---|---|
| [customers-query.ts](../../src/customer/api/customers-query.ts) | **Query canónico del listado.** Recibe el cliente de Supabase por parámetro: hasta ahora el listado estaba escrito **dos veces** (`searchAllCustomers` en `api/server.ts` y `_fetchCustomersPage` en `api/client.ts`, idénticos). Ahora las dos son wrappers |
| [filters.ts](../../src/customer/filters.ts) | Tipos, parseo y serialización de los filtros. Compartido entre el server component, la UI y el link del home |
| [CustomersSection.tsx](../../src/customer/components/v2/CustomersSection.tsx) | Search + filtros + sync de URL (~~scroll infinito~~ → paginación en 6b) |
| [CustomersTable.tsx](../../src/customer/components/v2/CustomersTable.tsx) | Columnas desktop, fila mobile del Figma y los cuatro estados (vacío / sin resultados / cargando / error) |
| [CustomerFilters.tsx](../../src/customer/components/v2/CustomerFilters.tsx) | Los dos dropdowns — `Estado` y `Membresías`, verificados |
| `MembershipTranslationWeekly` en [membership/consts.ts](../../src/membership/consts.ts) | Nombre del plan como lo escribe la tabla desktop: "5 días semanales". *(Este plan lo anotaba como `MembershipTranslationShort`, que no existía — corregido el 2026-09-16. `MembershipTranslationShort` sí existe ahora, pero lo creó 6b y es otra cosa: "5 días" pelado.)* |
| `v2.comingSoon.*` + [useComingSoonToast](../../src/components/v2/use-coming-soon-toast.ts) | El toast de "próximamente" estaba bajo `v2.home.quickActions.*`; se movió para que Clientes no consumiera copy de home |

Decisiones que vale tener a mano para las fases siguientes:

- **El estado del cliente se deriva de `customer_membership.expiration_date`**, no existe columna de activo/inactivo. `expiration_date` nulo cuenta como vencida — la misma regla en el badge y en el `WHERE`, a propósito.
- **Filtros server-side sin migración**, con joins embebidos de PostgREST: `SEARCH_CUSTOMER_WITH_MEMBERSHIP` usa `customer_membership!inner` porque **PostgREST sólo filtra por columnas de un recurso embebido si el join es inner**. El filtro "Vencida" va con `.or()` + `referencedTable` para incluir los nulos.
- **Sin paginador ni `count`**: scroll infinito reusando el patrón de la lista v1 (`useInfiniteQuery` + `useIntersectionObserver`). Coherente con la decisión abierta #4.
- **Los filtros viven en la URL** y se sincronizan con `window.history.replaceState`, no con `router.replace` — éste re-ejecutaría el server component por cada tecla del search.
- **"Sin membresía" se muestra pero no se filtra.** Es un badge neutral en la fila; como estado filtrable necesita RPC o la brecha B13 resuelta. Queda para la Fase 7.
- **"Nuevo cliente" hace toast de "próximamente"** — el alta es la Fase 7. El botón existe porque el Figma lo tiene en la barra de filtros.

### 6b — Qué quedó construido

Rama `feat/v2-perfil-cliente`, ADR [20260916161500](../architecture/decisions/20260916161500_v2-perfil-de-cliente-y-paginacion.md). Destrabada con capturas de Ema (la cuota del MCP seguía agotada).

| Archivo | Qué es |
|---|---|
| [CustomerProfilePanel.tsx](../../src/customer/components/v2/CustomerProfilePanel.tsx) | El panel: `SidePanel` + los 4 tabs + footer `Cancelar`/`Renovar` |
| `CustomerProfile{Membership,Payments,Assistances,Info}.tsx` | Un componente por tab |
| [customer-status.ts](../../src/customer/components/v2/customer-status.ts) | Tono y label de cada estado. Compartido por la fila del listado y la card del perfil, para que no digan cosas distintas |
| [DataTablePagination.tsx](../../src/components/v2/DataTablePagination.tsx) | **Paginador transversal.** Nace en `components/v2/` porque el Figma le pone el mismo pie a Membresías, Gastos, Ventas y Configuración |
| [v2/ui/Tabs.tsx](../../src/components/v2/ui/Tabs.tsx) | Átomo de tabs con **subrayado**. El de `components/ui/` es la variante pill de shadcn. Cuarto caso de la regla, tras `Button`, `Input` y `Select` |
| `getCustomerMembershipStatus` en [customer/utils.ts](../../src/customer/utils.ts) | Fuente única del estado derivado: replica los tres cortes del `WHERE` |
| `fetchCustomerAssistances` en [assistance/api/client.ts](../../src/assistance/api/client.ts) | **El único endpoint nuevo.** El dominio sabía consultar por fecha o por semana, nunca el historial de una persona |
| `MembershipTranslationShort` en [membership/consts.ts](../../src/membership/consts.ts) | "5 días" pelado, para la card y el historial de pagos |
| Migración `20260916150000` | `customers.birth_date` + `customers.notes` — brechas **B10 y B11**, que el tab Info muestra |

**Lo que las capturas corrigieron del plan:**

- **El listado tiene paginador.** `230 Total de clientes` + `‹ Anterior · 1 2 3 … · Siguiente ›`. 6a se había construido con scroll infinito justificando que *"el Figma no muestra paginador ni contador"*. **Cierra la [decisión abierta #4](#decisiones-abiertas--riesgos)**: las tablas del rediseño paginan.
- **El filtro `Estado` tiene 5 valores**, no 2: Activo · Por vencer · Vencido · Inactivos · De baja.
- **`2118:22594` no es un menú de acciones de fila** — es el filtro `Estado` desplegado. **No existe menú por fila**; el chevron abre el perfil directo. `CustomerRowActions.tsx` no se construyó porque no va.

**Decisiones que vale tener a mano:**

- **El scroll infinito no se perdió.** `fetchCustomersPageWith` sigue siendo page-based y devuelve `{ customers, total }`; el listado **v1** lo consume con `useInfiniteQuery`. Dos modos sobre el mismo query canónico.
- **Los tres estados son mutuamente excluyentes.** Una membresía que vence en 3 días es "Por vencer", no "Activa" — si se solaparan, filtrar "Activo" devolvería filas con badge amarillo. El umbral es `UPCOMING_EXPIRATION_WINDOW_DAYS` (7), que **se mudó de `home/consts.ts` a `membership/consts.ts`** al pasar a tener dos dominios consumidores.
- **`Inactivos` y `De baja` se listan deshabilitados** — ver [decisión abierta #13](#decisiones-abiertas--riesgos).
- **El badge "Pagada" es una etiqueta fija, no un estado.** `membership_payments` no tiene columna de situación: toda fila de esa tabla *es* un pago hecho.
- **El precio del panel es el de lista del plan** (`types_memberships.amount`), no el del último pago — ver la decisión de permisos abajo.
- **`Renovar` hace toast de "próximamente"**: es el flow de la Fase 8.
- **El listado se ordena por actividad real, no alfabéticamente.** Dos grupos, cada uno alfabético: arriba quienes asistieron en los últimos 30 días, debajo el resto. Ver abajo.

#### Orden del listado — "señal de vida" aplicada al directorio

El orden alfabético puro ponía arriba a clientes que no pisan el gimnasio hace años. Medido sobre dev (537 clientes): **223 (41%) nunca registraron una asistencia**, y de las primeras 20 filas alfabéticas **sólo 3 habían asistido en los últimos 30 días y 7 nunca**. Con el orden nuevo, 20 de 20.

- **El corte es por asistencia, no por estado de membresía**, a pedido explícito de Ema: ordenar por "activos" perdería de vista a quien viene pero todavía no pagó — que son justamente los que hay que cobrar (39 en dev con asistencia este mes y sin membresía vigente).
- **No es un criterio nuevo:** es el concepto de **"señal de vida"** que ya usaban `getBillingCycleProgress` ([incomes.ts](../../src/accounting/api/incomes.ts)) y `getExpiredMembershipsCount` ([home/api/server.ts](../../src/home/api/server.ts)) para excluir "churn silencioso" de los KPIs. Nunca se había aplicado al listado.
- **Ventana de 30 días rodantes**, no mes calendario: la definición canónica usa mes en curso, que sirve para un KPI mensual pero haría colapsar el listado a un solo grupo cada día 1°.
- **Dentro de cada grupo, alfabético.** El listado también es un directorio; la recencia pura lo haría impredecible para buscar a alguien.
- **Implementación** (migración `20260916183000`): `customers.last_assistance_date` denormalizada — **el trigger `trigger_increment_assistance` que ya mantenía `assistance_count` ahora setea también la fecha, en el mismo `UPDATE`, a costo cero** — más la vista `customers_listing`, que agrega el booleano `is_recently_active` (el corte depende de `now()`, así que no puede ser columna generada).
- ⚠️ **Es la primera vista del proyecto.** Dos cosas que cualquier vista futura tiene que repetir: **`security_invoker = true`** (sin él saltea la RLS de la tabla base y expone todas las filas), y **verificar que PostgREST pueda embeber** los recursos relacionados desde la vista antes de wirearla — se verificó contra la API real, incluido el `!inner`.
- **El orden cambia también en el listado v1**, porque comparten el query canónico. Decidido así para no tener dos órdenes sobre una función compartida; reversible con un parámetro.

> ⚠️ **Permisos del tab Pagos — decisión pendiente de Ema con el dato completo.** En la conversación se acordó que los pagos los viera todo el panel. Al implementar apareció que `membership_payments` es **admin-only a nivel RLS** desde `20260702120000_finances_admin_only_rls`, una restricción deliberada de defensa en profundidad del RBAC de finanzas. **No se tocó la RLS**: revertirla excede esta fase. El tab degrada honestamente — el rol se resuelve en el server y un no-admin ve "Sólo un administrador puede ver el historial de pagos" en vez de una lista vacía que mentiría. Si se quiere que todos los vean, es una migración de RLS y una decisión de seguridad propia.

**Pendiente de verificar:** los dos frames mobile (`2222:42619`, `2228:47961`). El paginador degrada por criterio propio a 358px — se ocultan los números y queda `Anterior/Siguiente` + "Página X de Y".

### Pantallas

**Listado** (`2118:22308`) — ✅ **verificado con captura el 2026-09-16.** Anatomía exacta:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🔍 Busca por nombre o apellido      ] [Estado ▾] [Membresías ▾] [+ Nuevo cliente] │
├────────────────────────────────────────────────────────────────────────┤
│ Nombre y Apellido  │ Membresía         │ Estado   │ Vencimiento │ Asistencias │  │  ← banda gris
│ (AN) Ana Beltrán   │ 5 días semanales  │ [Activa] │ 31/08/2026  │ 20          │ ›│
└────────────────────────────────────────────────────────────────────────┘
```

- **Los cuatro controles van en una sola fila** en desktop — search flexible, los dos dropdowns y la acción primaria. No es search+acción arriba y filtros abajo.
- **Los dropdowns se llaman `Estado` y `Membresías`**, y el trigger muestra **el nombre del filtro** mientras no hay nada aplicado (no "Todos los estados"). Confirma la inferencia del árbol de nodos sobre qué filtran.
- **Columnas: `Nombre y Apellido` · `Membresía` · `Estado` · `Vencimiento` · `Asistencias`**, todas alineadas a la izquierda, más una columna de chevron al final que abre el detail modal. **No hay columna de contacto ni DNI** — se habían inventado en la primera pasada de 6a y se sacaron.
- **El avatar de iniciales también está en desktop**, dentro de la celda de nombre. No es un tratamiento exclusivo de la fila mobile.
- **El header de la tabla es una banda gris con esquinas redondeadas**, no una fila con borde inferior.
- **El badge activo dice "Activa"**, no "Activo" (concuerda con "membresía"). Corrige lo que decía [2.4](#24-presentación-de-componentes-confirmada).
- **El plan se escribe "5 días semanales"** en la columna de la tabla, contra el "Membresía: 5 días" que muestra la fila mobile. Son dos strings distintos por viewport, ambos verificados por captura → dos records en `membership/consts.ts`.
- La acción primaria es `+ Nuevo cliente` (ícono `+`, no un ícono de persona) en el rosa de marca. El rosa entra en la pasada de paleta, según la decisión #2.

**Paginador** (mismo frame) — ✅ **verificado con captura el 2026-09-16.** Abajo a la izquierda `230 Total de clientes`; a la derecha `‹ Anterior · 1 [2] 3 … · Siguiente ›`. Lo que hace obsoleta la decisión abierta #4.

**Filtro `Estado` desplegado** (`2118:22594`) — ✅ **verificado.** Cinco opciones, cada una con un punto de color: **Activo** (verde) · **Por vencer** (amarillo) · **Vencido** (rojo) · **Inactivos** (azul) · **De baja** (negro). **Este nodo no es un menú de acciones de fila**, como decía este plan: no existe tal menú.

**Perfil del cliente** (`2118:22907` + las 5 de la sección 6) — ✅ **verificado con capturas el 2026-09-16.** `SidePanel` titulado **"Perfil del cliente"**, con avatar de iniciales + nombre debajo del header, **4 tabs** y footer fijo `Cancelar` + `Renovar` (con ícono de refresh):

| Tab | Contenido |
|---|---|
| **Membresía** | Card con "Membresía actual" + badge, el plan en grande ("5 días"), "Progreso del período" + "30 días restantes" + barra, y tres columnas al pie: `Precio` · `Vence` · `Asistencias` |
| **Pagos** | Lista de renovaciones. Cada fila: plan + fecha a la izquierda, monto + badge azul "Pagada" a la derecha. Al pie, "Último mes: 20" |
| **Asistencias** | Filas `Fecha: dd/mm/aaaa` + hora a la derecha. Al pie, "Total: 20" (izq) y "Último mes: 20" (der) |
| **Info** | Card "Datos personales" con `Nombre completo` · `DNI` · `Fecha de nacimiento` · `Teléfono`, y abajo "Observaciones" |

> **Dos observaciones de copy del diseño**, ambas implementadas distinto y a avisar al diseñador:
> - En el tab **Pagos** cada fila dice `Ultimo pago:` (sin tilde, y repetido en todas). Cada fila *es* un pago, así que "último" sólo aplica a la primera. Implementado como `Pago:`.
> - El pie del tab **Pagos** dice "Último mes: 20", que es un conteo de asistencias heredado del tab de al lado. No se implementó.

También es el destino del card "Clientes activos del mes" del home (`80` / `4 clientes con membresías vencidas`) — el link tiene que llegar acá con el filtro correspondiente ya aplicado.

### Qué existe hoy

| Necesidad | Dónde está |
|---|---|
| Buscar / listar clientes | `searchAllCustomers` ([src/customer/api/server.ts](../../src/customer/api/server.ts)) |
| Cliente + membresía | `searchCustomersById`, `getCustomerBasic`, `getCustomerMembership` |
| Membresías activas / pendientes | `getActiveMemberships`, `getPendingPaymentCustomers` ([src/membership/api/server.ts](../../src/membership/api/server.ts)) |
| Grupos familiares del cliente | `getGroupsByCustomer` ([src/group/api/server.ts](../../src/group/api/server.ts)) |
| UI v1 de referencia | `src/customer/list.tsx`, `list-with-tabs.tsx`, `info-resume.tsx`, `membership.tsx` |

### A construir

- ~~`src/app/[lang]/[tenant]/v2/customers/page.tsx`~~ ✅ 6a
- ~~`CustomersTable.tsx`, `CustomerFilters.tsx`~~ ✅ 6a · `CustomerRowActions.tsx` → 6b
- `src/customer/components/v2/CustomerDetailModal.tsx` + un componente por tab → **6b**
- ~~Listado paginado con filtros~~ ✅ 6a — se extrajo el query a [customers-query.ts](../../src/customer/api/customers-query.ts), compartido por server y client, porque **ya estaba duplicado** entre `api/server.ts` y `api/client.ts`.

**Brechas de DB:** ninguna bloqueante. El estado activo/vencida se deriva de `customer_membership.expiration_date`, como se anticipó.

**Riesgo timezone:** medio, y **auditado en 6a** (ver el ADR). El listado es read-only: no escribe ninguna fecha. El riesgo es de lectura — el corte activa/vencida usa `getTodayRangeInAppTz().start` y el badge `isExpiredInAppTz`, así que las últimas 3 horas del día AR no cambian de estado.

**Definición de hecho:**
- [x] Listado con filtros funcionando con data real *(6a)*
- [x] **Paginación numerada + contador de resultados** *(6b — el Figma sí la tiene)*
- [x] ~~Menú de fila con todas las acciones del Figma~~ → **no existe**: el nodo era el filtro `Estado` *(6b)*
- [x] Modal de perfil con todos sus tabs *(6b — Membresía · Pagos · Asistencias · Info)*
- [x] Link desde el card del home llega con el filtro aplicado *(6a)*
- [x] Estados vacío/cargando/error *(6a — más "sin resultados", que es distinto de "no hay clientes")*
- [x] Responsive: tabla → lista de filas en mobile *(6a, vía `DataTable`)*
- [x] Auditoría de timezone *(6a y 6b, documentadas en los ADRs)*
- [ ] **Verificación visual en mobile** — faltan los frames `2222:42619` y `2228:47961`; el paginador degrada por criterio propio

**ADR:** ✅ [20260916120738](../architecture/decisions/20260916120738_v2-listado-de-clientes.md) (6a) y [20260916161500](../architecture/decisions/20260916161500_v2-perfil-de-cliente-y-paginacion.md) (6b).

---

## Fase 7 — Alta de cliente

**Estado:** ✅ **completa** (2026-09-18). Rama `feat/v2-alta-cliente` · ADR [20260918112629](../architecture/decisions/20260918112629_v2-alta-de-cliente.md).
**Figma:** desktop `2166:22897` ("Desde el home", 7 pantallas) + `2167:22903` ("Desde Clientes", 4 pantallas) · **mobile `2222:43030` (3 pantallas)**. Los tres verificados con capturas del 2026-09-18.

### Qué quedó construido

Un solo panel, `CustomerFormPanel`, con **dos puntos de entrada**: "Nuevo cliente" de Acciones rápidas del home y el botón primario del listado de Clientes. El Figma lo dibuja dos veces pero es el mismo formulario — mismos dos pasos, mismos campos, mismo footer — y las capturas mobile confirman que tampoco recorta nada.

| Archivo | Qué es |
|---|---|
| [CustomerFormPanel.tsx](../../src/customer/components/v2/CustomerFormPanel.tsx) | Shell sobre `SidePanel` + `Stepper`, estado, submit, alerta de éxito |
| [CustomerFormPersonalStep.tsx](../../src/customer/components/v2/CustomerFormPersonalStep.tsx) | Paso 1 |
| [CustomerFormMembershipStep.tsx](../../src/customer/components/v2/CustomerFormMembershipStep.tsx) | Paso 2 — y donde están documentadas las divergencias contra el Figma |
| [CustomerFormField.tsx](../../src/customer/components/v2/CustomerFormField.tsx) | Label + control + error. Sube a `components/v2/` cuando lo pida un segundo dominio |
| [customer-form-state.ts](../../src/customer/components/v2/customer-form-state.ts) | Tipos del estado + prefill de fechas |
| [ui/DatePicker.tsx](../../src/components/v2/ui/DatePicker.tsx) · [ui/Textarea.tsx](../../src/components/v2/ui/Textarea.tsx) | Átomos v2 nuevos |
| [membership/charge-mode.ts](../../src/membership/charge-mode.ts) | `charge_mode` extraído de v1, ahora compartido |
| [membership/period.ts](../../src/membership/period.ts) | `getMembershipPeriodStart()` — el fallback de B12 |

### El hallazgo que destrabó la fase

El paso 2 rediseñado agrega **un solo campo**: "Modalidad de cobro", con el precio pegado al label (*"Mes completo - $20.000"*). Ese campo **ya existía en v1**: misma clave i18n (`membership.chargeMode` = "Modalidad de cobro", `membership.chargeModeFull` = "Mes completo"). No es el bloque "Condiciones y forma de pago" de la Fase 8 — no hay Promociones, ni Descuento, ni Recargo, ni tabla de Resumen.

Por eso la 7 fue antes que la 8, y por eso no quedó ningún componente compartido pendiente: lo compartible (`charge-mode.ts`) ya está extraído y v1 lo consume.

### Contenido del formulario (verificado)

Header: **"Nuevo cliente"** + *"Complete los datos para registrar un cliente."* Stepper de 2 pasos con check verde al completar el primero. Footer: `Cancelar` + `Siguiente` → `Guardar cliente`. Submit: el botón pasa a **"Un momento"** con spinner. Confirmación: **alerta verde inline dentro del panel**, no un toast global; el panel se cierra solo después y la vista de origen se refresca.

**Paso 1 — "Datos personales":** Nombre · Apellido · DNI + Fecha de nacimiento (fila de dos) · Contacto. **No pide email**, confirmado que no es un olvido del diseño.

**Paso 2 — "Membresía inicial":** Tipo de membresía · Modalidad de cobro · Fecha de inicio + Fecha de vencimiento · Forma de pago · Observaciones → Notas internas.

### Decisiones de negocio (cerradas con Ema el 2026-09-18)

- **Toda alta cobra.** El diseño eliminó el checkbox *"¿Abono la membresía?"* de v1 sin reemplazo, y se decidió que eso signifique lo que parece: el alta crea cliente + membresía + pago. Si no paga en el momento, se lo crea igual y se cobra por el flow de renovación.
- **VIP es la excepción, y no es negociable:** `membership_payments` tiene `CHECK (amount > 0)` y el plan VIP vale 0. Es **imposible** escribir un pago VIP y no hay ninguno en la historia de la base. Con VIP, "Modalidad de cobro" y "Forma de pago" desaparecen y no se llama al RPC de pago.
- **Prefill: inicio = hoy, vencimiento = fin de mes**, los dos editables. La captura (01/08 → 31/08 con hoy = 01/08) **no desambiguaba**: ese día "fin de mes" y "+30 días" coinciden. Lo definió Ema, y encaja con el ciclo día-de-mes fijo de `ACTITUD_BILLING_POLICY`.
- **No se registra la primera asistencia.** v1 lo ofrece; el diseño v2 no, y se decidió no agregarlo: es un flow propio ya construido (Fase 3) que desde `20260917120100` tiene el índice UNIQUE por día.
- **Sin descuentos.** El descuento de v1 es por grupo familiar y un cliente recién creado no tiene grupo.
- **VIP sólo para admins**, igual que v1.

### Divergencias deliberadas contra el Figma — avisar al diseñador

1. **"Sin membresía" no está en el select** (B13), aunque el diseño lo dibuja como default.
2. **"Modalidad de cobro" y "Forma de pago" desaparecen con VIP.**
3. **"Modalidad de cobro" desaparece con Diaria**, que tiene precio único.
4. **Diaria tampoco pide fechas.** En lugar de los dos datepickers muestra *"Pase válido sólo por hoy, 18/09/2026"*: el pase diario se cobra y vence el mismo día, así que ofrecerlas era una manera de equivocarse — con el prefill de fin de mes quedaba un pase de $7.000 habilitado todo el mes, y el validador no lo frena porque saltea los chequeos de rango justo cuando el tipo es diario.

Además, el Figma escribe **"Tipo de mebresia"** (sin `s` y sin tilde): implementado como "Tipo de membresía".

### Cambios de DB — con orden de deploy obligatorio

| Migración | Qué hace | Cuándo |
|---|---|---|
| `20260918120000_customer_membership_start_date` | `start_date` (B12) + `upsert_customer_with_membership` acepta `birth_date`/`notes`/`start_date` + el RPC de pago escribe `start_date` **y recupera la canonicalización de DAILY** | **Antes** del release. Aditiva |
| `20260918120100_drop_legacy_payment_rpc_overload` | Borra el overload de 10 params y con él la ambigüedad `PGRST203` que tenía rota el alta de v1 | **Antes** del release, junto con la A. No es destructiva: repara |

Las dos se aplicaron a producción el 2026-09-18, antes del release v0.12.0, y se verificó contra el PostgREST de prod que los payloads viejos (9 y 10 params) resuelven bien contra las firmas nuevas.

Tres cosas que no eran obvias y quedaron resueltas:

- **`birth_date` y `notes` no tenían camino de escritura.** Existen desde 6b para que el perfil las *muestre*, pero el RPC del alta no las aceptaba: **0 filas con cada una en prod**. Este form es su primer escritor.
- **B12 toca los dos RPC.** Escribir `start_date` sólo en el alta lo habría congelado en la fecha de alta, y como `getMembershipPeriodStart()` lo prefiere, la barra de progreso del perfil habría mostrado algo **peor** que el fallback.
- **Cuando hay cobro, la membresía la crea el paso 2.** Los dos RPC son transacciones separadas: antes, un fallo del paso 2 dejaba un cliente con membresía activa y sin pago — invisible, plata perdida. Ahora deja un cliente *sin membresía*: visible en el listado y arreglable.
- **El overload de 14 parámetros había perdido la canonicalización de DAILY** que el de 10 tiene desde `20260709000000`. Se cayó al crearlo en `20260722120000` (grupos y descuentos): `v_is_daily` sobrevivió, `v_effective_end_date` no. **Es un bug vivo en producción**, no una hipótesis: las 8 membresías DAILY creadas desde el 2026-07-29 vencen a las 00:00 AR y `get_membership_stats` —único consumidor que filtra con `> NOW()` en vez de por día calendario— no las cuenta en su propio día. La plata sí quedó registrada; lo que falta es el conteo de activas. Restaurada en la migración A. Sin backfill: son pases de un día vencidos hace semanas y las stats de meses pasados van por `created_at`.

### Auditoría de timezone

Tres datepickers, y **no los tres se tratan igual**:

| Campo | Columna | Tratamiento |
|---|---|---|
| Fecha de nacimiento | `customers.birth_date` (`date`) | **"YYYY-MM-DD" crudo** — es día calendario, no instante |
| Fecha de inicio | `start_date` + `last_payment_date` + `payment_date` (`timestamptz`) | `parseAppTzDateString` |
| Fecha de vencimiento | `expiration_date` (`timestamptz`) | `parseAppTzDateString` |

Verificado en dev con un alta completa en una transacción con ROLLBACK: las cuatro columnas `timestamptz` quedan en `03:00:00+00` = medianoche AR. El prefill también es AR-aware (`getTodayIsoDateInAppTz` + el nuevo `getEndOfMonthIsoDateInAppTz`), evaluado en cada apertura del panel para que una sesión abierta a las 23:59 del día 31 no arrastre un prefill atrasado.

### Lo que esta fase NO resolvió

- **B5 — DNI sin UNIQUE.** Sigue siendo PR propio con ADR propio. El pre-check de [client.ts](../../src/customer/api/client.ts) queda como está: es un check-then-act en dos round trips, sin nada que impida una carrera entre el `SELECT` y el `INSERT`. Bloqueado por **8 pares duplicados, 16 filas, idéntico en dev y prod** (medido 2026-09-17, sin cambios al 2026-09-18). Siete son la misma persona cargada dos veces; **el octavo no**: `40990184` son `Matias Manucci` y `Belena Manucci`, o sea un DNI mal tipeado. Varios pares tienen historial de los dos lados, así que unificar exige reasignar `assistance` y `membership_payments` antes de borrar.
- **Un no-admin puede crear un cliente VIP llamando al RPC directo.** El form lo filtra client-side; `upsert_customer_with_membership` no valida rol (el RPC de pago sí, pero un alta VIP no pasa por él). Agujero preexistente, no introducido acá.
- **`last_payment_date` sigue recibiendo la fecha de inicio** en altas sin cobro. La limpieza es migrar los lectores restantes a `getMembershipPeriodStart()`, empezando por [membership-form.tsx](../../src/customer/membership-form.tsx), que lo usa como `defaultValue` del datepicker de inicio.
- **Mobile sin verificar visualmente** con data real.

---

## Fase 8 — Registrar pago / renovar membresía + comprobante

**Estado:** 🟡 en curso — **diseño verificado, fundaciones entregadas, UI pendiente**
**Figma:** desktop `2166:22898` ("Desde el home", 10 pantallas — el flow más largo) + `2167:22902` ("Desde Cliente/Perfil", 7 pantallas) · **mobile `2222:43026` ("Renovar membresía desde acciones rápidas", 6 pantallas)**.

> ✅ **Las 10 vs 6 pantallas quedaron explicadas (capturas del 2026-09-21): es un flow con dos entradas, no dos flows.**
>
> Desde el **perfil del cliente** el cliente ya está fijado, así que el panel arranca directo en el stepper de 2 pasos — el CTA es el botón `Renovar` del footer del tab Membresía. Desde el **home** (y en todo mobile) hay dos pantallas previas de búsqueda: lista de filas con badge, y lista filtrada por query. Exactamente el mismo patrón de "un formulario con dos entradas" que resolvió la Fase 7.
>
> Confirmado también: el éxito es un `Modal Dialog` centrado (`Cancelar` + `Compartir`) y el `Payment Receipt` es una pieza aparte de 390 de ancho, con logo, encabezado "Comprobante de pago" y el pie *"Documento no válido como factura"*.

> ✅ **Orden contra la Fase 7 — resuelto (2026-09-18).** Esta fase estuvo marcada como "va antes que la 7" mientras el alta no modelaba el cobro. Al ver las capturas del paso 2 rediseñado quedó claro que **no** se parece a "Condiciones y forma de pago": el único campo que agrega es "Modalidad de cobro", que es el `charge_mode` que v1 ya tenía. Así que la 7 fue primero y no dejó nada a medias.
>
> **Lo que la 8 hereda ya construido:** `getChargeModeOptions()` / `getChargeAmount()` en [charge-mode.ts](../../src/membership/charge-mode.ts), `customer_membership.start_date` escrito por los dos RPC, `getMembershipPeriodStart()`, y los átomos `DatePicker` y `Textarea` de v2. El overload legacy del RPC de pago ya no tiene llamadores — esta fase trabaja sólo contra el de 14 parámetros.

> ✅ **Hueco resuelto (2026-09-15).** El `Payment Receipt` en mobile **sí existe**: es el `Modal Dialog` de éxito (`2183:43825`), no una pantalla aparte. Ver el detalle del flow abajo.
>
> ⚠️ Queda abierto: **mobile tiene 6 pantallas contra 10 de desktop.** Confirmar si es el mismo flow con menos pasos o dos flows distintos.

### Flow de renovación, paso a paso (confirmado en captura del 2026-09-15)

Header del panel: flecha atrás + **"Renovar membresía"**. Footer: `Cancelar` + `Siguiente` / `Confirmación`.

1. **Buscar cliente** — search "Busca por nombre o apellido" + lista de filas (avatar + nombre + `Membresía: 5 días` + badge `Activo`/`Vencida`). Con query escrita, la lista filtra y el badge se mantiene.
2. **Cliente fijado** — al elegirlo, la ficha queda anclada arriba del panel (avatar + nombre + badge) y debajo aparece el stepper de 2 pasos: **"Nueva membresía"** / **"Confirmar"**.
3. **Paso 1 — Nueva membresía:**
   - `Tipo de membresía` (select)
   - Sección **"Condiciones y forma de pago"**: `Promociones` (select) · `Descuento` + `Recargo` (dos selects lado a lado) · `Forma de pago` (select)
4. **Paso 2 — Confirmar:** tabla **"Resumen"** con las filas `Membresía de 5 días` · `Promoción activa` · `Descuento aplicado` · `Recargo por mora` · `Método de pago` · `Fecha`, y una fila **`Total`** destacada. Los valores vacíos se muestran como `-`.
5. **Éxito** — dialog centrado sobre el panel: check verde, **"Membresía renovada"**, una línea de resumen (`Ana Beltrán - 5 días $20.000` / `Método: Transferencia`) y botones `Cancelar` + **`Compartir`**. Ese dialog **es** el comprobante en mobile.

**Mapeo a la DB** — todo el resumen tiene respaldo salvo el número de comprobante:

| Fila del resumen | Origen |
|---|---|
| Membresía de N días | `types_memberships.amount` vía `getMembershipTypes` |
| Promoción activa | `discount_rules` con `applies_to = 'promo'` |
| Descuento aplicado | `membership_payments.discount_amount` + `discount_rule_id` |
| Recargo por mora | `types_memberships.amount_surcharge` vía `billing-policy.ts` |
| Método de pago | `membership_payments.payment_method` |
| Total | `membership_payments.amount` |
| *(número de comprobante)* | ✅ `membership_payments.receipt_number` — B3 cerrada el 2026-09-21 |

### El modelo de precio (cerrado el 2026-09-21)

La decisión #5 se resolvió, y al implementarla se descubrió que **la premisa de la pregunta era falsa**: `billing-policy.ts` no calculaba el recargo y el formulario de v1 nunca lo llamaba. Había tres reglas de día-del-mes conviviendo, dos de ellas en producción contradiciéndose. Detalle completo en el ADR [20260921101140](../architecture/decisions/20260921101140_politica-de-cobro-unica-recargo-explicito-y-comprobante.md); lo que el formulario de esta fase tiene que respetar:

| Pieza | Prefijada con | Editable |
|---|---|---|
| **Base** | precio del plan según la porción del mes (`PeriodMode`: completo / medio) | sí |
| **Recargo** | `0`. Si hay mora, se sugiere `amount_surcharge − amount` **con el motivo visible** | sí |
| **Descuento** | `suggested_amount` de la regla aplicable (grupo / promo) | sí |
| **Total** | `base + recargo − descuento` | **no — se deriva** |

- **La sugerencia sale de `getSuggestedCharge()`** ([src/membership/pricing.ts](../../src/membership/pricing.ts)), que devuelve `{ periodMode, base, surcharge, suggestsSurcharge, reason }`. El `reason` (`late_payment` / `mid_month_entry`) se muestra al operador: sugerir un número sin decir por qué es lo que hizo que la heurística de v1 pasara inadvertida dos meses.
- **`suggestsSurcharge` nunca bloquea nada.** Ni campo deshabilitado ni validación.
- **`hasAssistancesThisMonth` es obligatorio** para llamar a la función: es lo que distingue mora de ingreso a mitad de mes. Sin ese dato, a alguien que se suma el día 20 se le sugeriría recargo.
- **El corte del mes es el día 11** (`ACTITUD_BILLING_POLICY.gracePeriodEnd: 10`). Media membresía para ingresos nuevos, desde el 16.
- **El `date` que recibe `getSuggestedCharge()` es la fecha de cobro del datepicker, no `new Date()`** — si no, un pago retroactivo recibe la sugerencia de hoy.
- **El total no se tipea.** Cualquier monto es alcanzable editando las partes; lo que se vuelve imposible es un monto sin concepto, que es lo que descuadra el desglose de ingresos y Balance. El CHECK `amount = gross_amount + surcharge_amount - discount_amount` lo garantiza en la base.

### Defectos del diseño — estado al 2026-09-22

Revisados contra las capturas nuevas. Lo que se resolvió, y lo que sigue abierto para el diseñador.

**Corregidos en el Figma:**

- ~~**#2 — `Fecha: $10/08/2026`**~~ ✅ el `$` desapareció junto con la fila, reemplazada por `Periodo: Agosto`.
- ~~**#1 — `Método de pago: 10/08/2026`**~~ 🟡 **corregido en una de las dos pantallas del resumen**; la otra sigue mostrando la fecha.

**Siguen abiertos** (los cuatro se resolvieron eligiendo lo correcto en el código — ver las divergencias del ADR [20260922173000](../architecture/decisions/20260922173000_v2-panel-de-renovacion-de-membresia.md)):

3. **Paso 2 — los montos no cierran:** `Membresía $15.000` + `Modalidad de cobro: Mes completo - $20.000` + `Total $15.000`. → En el código, `Modalidad de cobro` lleva el precio base real y `base − descuento + recargo = Total` se verifica leyendo la tabla.
4. **El comprobante de la misma operación dice `Medio mes - $20.000`** donde el resumen decía `Mes completo`. → Los dos salen del mismo cálculo.
5. **`Tipo de membresía: Sin membresía` por defecto al renovar** a alguien con 5 días activos. → **Viene preseleccionado el plan vigente**, y "Sin membresía" no se ofrece; consistente con la Fase 7 (decisión #6).
6. **`Membresía` significa dos cosas distintas:** un monto ($15.000) en el resumen y el nombre del plan ("5 días") en el comprobante. → En los dos lados dice el nombre del plan.

**Nuevos:**

7. **El comprobante no lleva número de comprobante.** `receipt_number` (formato `YYYY-NNNNN`) existe desde la migración de esta fase y es justo lo que la columna resuelve. Se incluye igual.
8. **`Periodo: Agosto` no describe todo período posible.** Con los dos datepickers editables, 15/08 → 14/09 no es ningún mes. Se muestra el nombre del mes cuando el período es un mes calendario completo, y el rango cuando no.
9. **El comprobante muestra la fecha de cobro, que la DB no guarda como tal** — ver la sección de arriba: sale de `created_at`.

Y una observación de UX que no es defecto: la alerta amarilla *"Asistencia registrada a las 17:43"* del tab Membresía del perfil es información, no advertencia, y no es evidente por qué vive en ese tab.

### Qué se construyó (la UI)

Dos PRs, **ninguno con migraciones**.

**Panel de renovación** — PR [#62](https://github.com/EmaCrzz/actitud-bo/pull/62), ADR [20260922173000](../architecture/decisions/20260922173000_v2-panel-de-renovacion-de-membresia.md):

- `RenewMembershipPanel` + `RenewMembershipStep` + `RenewSummaryStep` + `AmountChoiceField`.
- `src/membership/renewal.ts` — período derivado, montos y etiqueta de período, todo puro.
- `src/group/discount.ts` — el descuento de grupo, compartido server/browser.
- `fetchRenewalContext()` — plan vigente, vencimiento, inicio del período y asistencias del mes.
- Átomos: `components/v2/FormField.tsx` (subido desde `customer/`) y `components/v2/ui/InputCurrency.tsx`.
- Entrada desde el perfil, y el fix del `DatePicker` que abría siempre en el mes de hoy (bug preexistente de la Fase 7).

**Comprobante + cobro desde el home** — ADR [20260923140000](../architecture/decisions/20260923140000_v2-comprobante-de-pago-y-cobro-desde-el-home.md):

- `PaymentReceipt.tsx` — 390px fijos, colores literales (`html-to-image` serializa estilos computados y las CSS vars de `[data-v2]` no resuelven fuera de su árbol), con `receipt_number`. **Se comparte como imagen, no PDF.**
- `RenewSuccessDialog.tsx` — el `Modal Dialog` del Figma con el check verde, y el comprobante a tamaño real antes de mandarlo.
- `RenewCustomerSearchStep.tsx` — sobre `fetchCustomersPage`, el query canónico del listado, para que la fila traiga plan y badge.
- `useShareImage` extendido: tamaño opcional y share nativo con fallback a descarga, **preservando los defaults del top de asistencias**.
- Acción rápida del home enganchada: el panel abre sin cliente y arranca en el buscador.

**Pendiente con el diseñador:** el wordmark "ACTITUD" y la marca de agua del isotipo **no existen como assets en el repo**. El comprobante usa la marca del sidebar (círculo + nombre del negocio) mientras tanto.

### El modelo de fechas, actualizado con las capturas del 2026-09-22

**El paso 1 ahora tiene los dos datepickers** — `Fecha de inicio` y `Fecha de vencimiento`, lado a lado entre "Modalidad de cobro" y el separador "Condiciones y forma de pago". El plan anterior asumía que no había ninguno.

La regla que implementa el panel:

- **Prefill derivado, campos editables.** Inicio = `max(hoy, vencimiento vigente + 1 día)`; fin = fin de ese mes. Renovar anticipado arranca solo en el período correcto, que es lo que la migración `20260922125530` habilitó del lado de la base.
- **El último día del mes propone el mes siguiente completo** (del 1 a fin de mes). "Hoy → fin de mes" dejaría inicio = fin, que `basicMembershipValidation` rechaza; y "hoy → fin del mes siguiente" excede su tope de un mes en los meses de 30 días. Verificado con un barrido de los 730 días de 2026 y 2028 contra el validador real: 0 fallos.
- **`getSuggestedCharge()` recibe el inicio del período, no `new Date()`.** Es lo que evita sugerirle mora a quien paga octubre el 28 de septiembre.

### Defecto nuevo del diseño (capturas del 2026-09-22)

El comprobante muestra `Fecha: 10/08/2026` sobre un período de agosto (01/08 → 31/08): o sea pide **la fecha de cobro**, distinta del inicio del período. Hoy el RPC escribe `payment_date = p_start_date` (issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59)), así que esa fecha no está en `payment_date` — **pero sí en `created_at`**, que es `NOT NULL DEFAULT now()`. El comprobante la va a leer de ahí: resuelve lo que el diseño pide sin migración, sin tocar el #59 y sin reimprimir distinto si se regenera después.

**Compartir el comprobante:** ya hay precedente funcionando en v1 — [share-image-button.tsx](../../src/assistance/share-image-button.tsx) + [use-share-image.ts](../../src/lib/hooks/use-share-image.ts). Reusar.

### Estructura del flow

`FormModal` multi-step (6 frames en el flow 3, 4 en el flow 7) → `Modal Dialog` de confirmación (`2118:17604` / `2118:27698`) → `Payment Receipt` (`2118:17883` / `2118:28076`) → vuelta al origen.

El `Payment Receipt` es un componente nuevo y probablemente el único del rediseño pensado para imprimirse o compartirse. Hay precedente: `src/assistance/share-image-button.tsx` y `src/lib/hooks/use-share-image.ts` ya resuelven compartir como imagen.

### Qué existe hoy

| Necesidad | Dónde está |
|---|---|
| Crear pago + actualizar membresía | RPC `upsert_customer_membership_with_payment` (idempotente, migración `20260707113341`) |
| Precios por tipo | `getMembershipTypes` ([src/membership/api/server.ts](../../src/membership/api/server.ts)) |
| Recargo / media membresía | [src/accounting/billing-policy.ts](../../src/accounting/billing-policy.ts) — `getCyclePhaseForDate`, `isWithinGracePeriod` |
| Descuento por grupo familiar | `getApplicableDiscountForCustomer` ([src/group/api/server.ts](../../src/group/api/server.ts)) |
| CRUD de pagos | `createMembershipPayment`, `updateMembershipPayment` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) |
| UI v1 de referencia | `src/customer/membership-form.tsx` |

### Reglas de negocio que el formulario debe respetar

Política de cobro de Actitud (ciclo día-de-mes fijo, hardcodeada en `ACTITUD_BILLING_POLICY`):
- Días **1–15**: monto normal (`types_memberships.amount`).
- Día **16 en adelante**: recargo (`amount_surcharge`) o media membresía (`middle_amount`) según corresponda.

El formulario tiene que **calcular y mostrar el monto sugerido** usando `getCyclePhaseForDate`, aplicar el descuento de grupo familiar si corresponde, y permitir override manual (`discount_rules.applies_to = 'manual'` + `discount_note`).

### Brechas de DB

- ~~**B3**~~ — ✅ `receipt_number` aplicado en `20260921101140`, con secuencia por año.
- ✅ **Recargo explícito** — `surcharge_amount` + `surcharge_note`, brecha que este plan no tenía anotada y apareció al responder la decisión #5. El RPC pasó de 14 a 16 parámetros (DROP + CREATE, un solo overload en `pg_proc`).
- ~~**Defecto C**~~ — ✅ cerrado del todo: la columna en `20260917120000`, el residuo del RPC legacy en la Fase 7. Esta fase trabaja sólo contra el overload vigente, que valida el método de pago.

**Riesgo timezone:** **el más alto de todo el plan.** `payment_date` determina el mes contable y, vía `getCyclePhaseForDate`, si se cobra recargo. Un desfase de 3 horas el día 15 a las 22hs cobra recargo de más. Este es exactamente el bug que ya pasó dos veces (ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md)). **Auditar cada call site nuevo, sin excepción.**

**Definición de hecho:**
- [x] Pago completo desde ambas entradas (Home y Perfil de cliente)
- [x] Monto sugerido correcto en días 1–10, 11–15 y 16+ *(lógica: `getSuggestedCharge`)*
- [x] Monto sugerido verificado **en pantalla** en los tres tramos *(recargo por mora y media membresía, validados por Ema el 2026-09-23)*
- [x] Descuento de grupo familiar aplicado *(preseleccionado; falta verlo con un grupo real en preview)*
- [x] Recargo sugerido con el motivo visible, editable y no obligatorio
- [x] `Payment Receipt` renderiza y se comparte como imagen
- [x] Idempotencia verificada: doble submit no crea dos pagos *(ejercitado contra Postgres local; el re-cobro pisa la fila y **no** consume número de comprobante nuevo)*
- [x] `receipt_number` en DB *(falta mostrarlo en el comprobante)*
- [x] ~~Defecto C verificado en dev~~ — cerrado en la Fase 7
- [x] **Auditoría de timezone documentada call-site por call-site en el ADR** *(la de las fundaciones; extenderla con los call sites de la UI)*

**ADR:** sí, obligatorio. Es el flow con más reglas de negocio y el de mayor riesgo.

---

## Fase 9 — Sección Asistencias

**Estado:** ⬜ pendiente · 🔵 diseño incompleto
**Figma:** desktop `2167:22904` (2 pantallas) · **mobile `2228:49268` (2 pantallas)**.

> ⚠️ **Divergencia de navegación.** Desktop tiene `Tabs` + `DateNavigation` opcional; **mobile no tiene Tabs** y muestra `DateNavigation` siempre (`2228:48632`, `2228:48923`). Decidir si los tabs desaparecen también en desktop (más simple, un solo modelo mental) o si la divergencia es intencional. Definirlo **antes** de construir, no después.

`Tabs` + `Summary Section Container` con `Customer List`. La segunda pantalla (`2118:28933`) reemplaza el título por un `DateNavigation`, así que los tabs son probablemente **"Hoy" / "Historial"**, y el historial trae navegación por fecha.

La anotación `2118:29353` ("Ver estados del historial") confirma que **los estados de la lista no están diseñados**.

Es también el destino del card "Asistencias de hoy" del home.

### Qué existe hoy

`getTotalAssistancesToday`, `getAssistancesByDate`, `getTodayAssistances`, `getAssistancesByWeek`, `getTopCustomersThisMonthRPC` ([src/assistance/api/server.ts](../../src/assistance/api/server.ts)). UI v1: `assistances-list.tsx`, `day-navigator.tsx`, `top-monthly-assintant.tsx`, `counter.tsx`.

Prácticamente toda la lógica existe. Esta fase es mayormente portar UI.

### A construir

- `src/app/[lang]/[tenant]/v2/attendance/page.tsx`
- `src/assistance/components/v2/AttendanceTabs.tsx`, `CustomerList.tsx`, `DateNavigation.tsx`

**Brechas de DB:** ninguna (salvo B4, que se resuelve en Fase 3).

**Riesgo timezone:** alto. Todo el módulo pivotea sobre "qué día es hoy en AR". `getAssistancesByDate` recibe un `Date` — verificar que el caller lo construya con `parseAppTzDateString` y no con `new Date(string)`.

**Definición de hecho:**
- [ ] Tabs Hoy/Historial con navegación por fecha
- [ ] Lista con estados vacío/cargando/error (definidos por nosotros, documentados acá)
- [ ] Link desde el card del home funciona
- [ ] Auditoría de timezone

**ADR:** probablemente no si es sólo port de UI. Sí si aparecen endpoints nuevos o cambia el shape de respuesta.

---

## Fase 10 — Sección Membresías (planes y precios)

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22905` (4 pantallas) · **mobile `2265:69683` (3 pantallas)**.

> Mobile resuelve el "crear plan" con un **CTA sticky al fondo** (`Container` 389×85 con botón de 341×36 en `2246:49888`), no con el botón del `PageHeader` como desktop.

`PageHeader` (greeting + fecha + botón) + `DataTable` de planes + `FormModal` para crear/editar + Toast. Es un CRUD sobre `types_memberships`, no sobre las membresías de clientes.

### Qué existe hoy

`getMembershipTypes`, `updateMembershipPrices` ([src/membership/api/server.ts](../../src/membership/api/server.ts)). UI v1: `src/membership/components/amounts.tsx`, `amount-form.tsx`, `active-types.tsx`. Ruta v1: `/stats/membership/edit/[type]`.

Los 5 tipos están hardcodeados en [src/membership/consts.ts](../../src/membership/consts.ts) (`MembershipTypeArray`) con traducciones por key. **Si el Figma permite crear planes nuevos desde la UI, esa constante deja de ser la fuente de verdad** — hay conflicto entre "tipos hardcodeados con i18n" y "CRUD dinámico". → [Decisiones abiertas](#decisiones-abiertas--riesgos) #7.

**Brechas de DB:** B6 — `types_memberships` no tiene `active` ni `description`. Sin `active` no se puede discontinuar un plan sin romper el histórico de `membership_payments` que lo referencia por FK.

**Riesgo timezone:** bajo. `last_update` es informativo.

**Definición de hecho:**
- [ ] Listado de planes con precios (normal / recargo / media)
- [ ] Crear y editar plan
- [ ] Discontinuar plan sin romper histórico
- [ ] Resuelto el conflicto tipos-hardcodeados vs CRUD dinámico
- [ ] Toast + refresh

**ADR:** sí — la decisión sobre tipos dinámicos vs hardcodeados tiene impacto en todo el dominio de membresías.

---

## Fase 11 — Sección Gastos

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22910` ("crear/editar", 6 pantallas) + `2167:22911` ("eliminar", 3 pantallas) · **mobile `2286:119425` (5 pantallas, crear/editar/eliminar juntos)**.

> Mobile nombra sus frames de forma explícita y útil: `Gastos/Vacio` (`2286:119862`), `Gastos/Nuevo Gasto`, `Gastos` (con data), `Gastos/Editar`, `Gastos/Eliminar`. **`Gastos/Vacio` es la única referencia canónica de empty state en todo el rediseño** — usarla como base para el `EmptyState` de la Fase 5.
>
> ⚠️ **Bug de copy en el diseño mobile:** los KPIs de Gastos dicen **"Total cobrado"** (`2286:119875`, `2329:29066`), copy heredado del componente de Ventas. Desktop dice "Total de gastos" (`2139:18310`), que es lo correcto. Implementar "Total de gastos" y avisar al diseñador.

Layout: `PageHeader` + fila de 3 KPIs (**Total de gastos / Efectivo / Transferencias**) + `FilterBar` (search + 3 dropdowns) + `DataTable`. Crear/editar por `FormModal`, eliminar por `ConfirmDialog` + Toast.

### Qué existe hoy

CRUD completo: `getExpenses`, `getExpenseById`, `createExpense`, `updateExpense`, `deleteExpense` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) + wrappers HTTP en `src/expenses/api/index.ts` y rutas `/api/accounting/expenses`. UI v1: `src/expenses/components/{list,form,expense-row}.tsx`. 8 categorías en [src/expenses/consts.ts](../../src/expenses/consts.ts) con mapa de migración desde nombres viejos en español.

`withCanonicalExpenseDate` en `src/accounting/api/server.ts` ya canonicaliza `expense_date` — ADR [20260729150049](../architecture/decisions/20260729150049_expenses-timezone-canonicalization.md). **Reusar, no reimplementar.**

### Brechas de DB — bloqueante suave

**B1: `expenses` no tiene `payment_method`.** Los KPIs "Efectivo / Transferencias" del Figma no se pueden calcular. Es una migración chica pero hay que decidir qué pasa con los gastos históricos:

```sql
ALTER TABLE public.expenses
  ADD COLUMN payment_method varchar
    CHECK (payment_method IN ('PAYMENT_CASH','PAYMENT_TRANSFER'));
```

Dejarla nullable evita backfill inventado; los KPIs muestran los históricos como "sin especificar". Alternativa: backfill a `PAYMENT_CASH` asumiendo que así se pagaba. **Decisión del negocio, no técnica.** → [Decisiones abiertas](#decisiones-abiertas--riesgos) #8.

**B2: borrado.** Hoy `deleteExpense` hace hard delete. El flow 15 tiene confirmación explícita, lo cual es consistente con hard delete. Si se quiere papelera, agregar `deleted_at` y filtrar en todos los reads.

**Riesgo timezone:** medio-alto. Los 3 KPIs son del mes en curso → `getMonthRangeInAppTz`. Los filtros de fecha → `parseAppTzDateString`. Ya hubo un incidente acá (ver el ADR linkeado arriba).

**Definición de hecho:**
- [ ] Migración `payment_method` aplicada en dev y decidido el tratamiento del histórico
- [ ] Los 3 KPIs cuadran con la suma de la tabla
- [ ] Crear, editar y eliminar con confirmación y toast
- [ ] Filtros (search + 3 dropdowns) funcionando
- [ ] Auditoría de timezone
- [ ] `/expenses` v1 sigue funcionando con la columna nueva

**ADR:** sí — migración de `payment_method` + tratamiento del histórico.

---

## Fase 12 — Sección Ventas

**Estado:** ⚠️ **bloqueada — no existe modelo de datos**
**Figma:** desktop `2167:22906` (a clientes, 5), `2167:22907` (a no clientes, 3), `2167:22908` (exportar, 2) · **mobile `2286:118422` (a clientes, 5), `2286:118789` (a no clientes, 2), `2286:118889` (exportar, 2)**.

> Mobile tiene **el estado vacío diseñado** (`2265:70904`, con los tres KPIs en $0) además del estado con data (`2277:96065`). Segunda referencia canónica de empty state junto con `Gastos/Vacio`.

Layout análogo a Gastos: `PageHeader` + 3 KPIs (Total cobrado / Efectivo / Transferencias) + `FilterBar` (search + 3 dropdowns) + `DataTable` + `FormModal` de venta. La sección 13 agrega export vía `ConfirmDialog`.

Dos modos de venta: **a cliente** (se elige de la base) y **a no cliente** (walk-in). El modelo tiene que soportar ambos.

**Esta fase no se puede empezar sin cerrar A1** ([Brechas de base de datos](#a1-ventas--productos--no-existe-modelo-fase-12)): `products`, `sales`, `sale_items`. Antes de escribir una línea de UI:

1. Definir el alcance con el negocio (¿stock? ¿anulación? ¿múltiples items por venta o uno solo?).
2. Escribir y revisar la migración.
3. Aplicar en dev, cargar datos de prueba.
4. Recién ahí construir el dominio `src/sales/` completo (`api/server.ts`, `api/client.ts`, `types.ts`, `consts.ts`, `components/v2/`).

**Export (sección 13):** decidir formato (CSV vs XLSX) y si se genera en cliente o server. CSV en cliente es lo más barato y no agrega dependencias.

**Riesgo timezone:** alto — `sale_date` define el día/mes contable, igual que `payment_date`.

**Definición de hecho:**
- [ ] Migración de `products` / `sales` / `sale_items` aplicada en dev
- [ ] Dominio `src/sales/` completo
- [ ] Venta a cliente y a no cliente
- [ ] 3 KPIs cuadran con la tabla
- [ ] Export funcionando
- [ ] Auditoría de timezone

**ADR:** sí, obligatorio y **antes de implementar** — es un modelo de datos nuevo.

---

## Fase 13 — Balance

**Estado:** ⬜ pendiente · depende de 11 y 12
**Figma:** desktop `2167:22912` (1 pantalla, `2141:50936`) · **mobile `2345:37294` (1 pantalla, `2329:30598` — 390×1071 con scroll)**.

> Mobile confirma la estructura: fecha + 2 `Dropdown` de filtro + **3 `Metric Card` apiladas** (106/106/92 — la tercera es más baja, probablemente el resultado neto) + 2 `Card` de detalle de alturas distintas (152 y 279).

`PageHeader` + 2 `Dropdown` de filtro (probablemente período y algo más) + **3 `Metric Card`** + 2 `Card` de detalle. Es el dashboard de ingresos vs egresos.

### Qué existe hoy

Bastante: `getMonthlyStats` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) ya devuelve `total_income`, `total_expenses`, `net_result`, `payments_count`, `expenses_count`. `src/accounting/api/incomes.ts` tiene desglose por método de pago y por tipo. Hooks: `useIncomesSummary`, `useMonthlyStats`, `useIncomesByType`, `useIncomesPending`. Dashboard v1 en `/incomes` (ADR [20260728141829](../architecture/decisions/20260728141829_incomes-dashboard-redesign.md)).

**Lo que falta:** `getMonthlyStats` no incluye ventas (no existen todavía). Una vez que exista `sales`, hay que sumarla al ingreso total.

**Riesgo timezone:** alto. Todo el módulo es agregación por mes contable → `getMonthRangeInAppTz` en cada consulta. Existe el ADR [20260729101233](../architecture/decisions/20260729101233_unificar-rango-mensual-en-timezone-ar.md) que unificó esto: **reusar ese helper, no escribir rangos a mano.**

**Definición de hecho:**
- [ ] Las 3 métricas + 2 cards con data real
- [ ] Ventas incluidas en el ingreso
- [ ] Filtros de período funcionando
- [ ] Los números cuadran con Gastos y Ventas por separado
- [ ] Auditoría de timezone

**ADR:** probablemente sí — cambia el cálculo de ingreso total al incorporar ventas.

---

## Fase 14 — Configuración

**Estado:** ⬜ pendiente
**Figma:** desktop `2167:22913` (3 pantallas) · **mobile `2345:37297` (3 pantallas, con nombres explícitos)**.

> ⚠️ **El mobile resuelve una de las dudas y abre otra.**
>
> **Resuelve:** los frames mobile están nombrados — `Configuración/Negocio` (`2333:33003`), `Configuración/Membresía` (`2333:37880`), `Configuración/Promociones` (`2333:38036`). Por posición y estructura, los dos `Data Table` sin nombre de desktop (`2151:58342`, `2151:68169`) son **Membresías y Promociones**. Ya no hace falta abrirlos para saber qué son.
>
> **Abre:** en mobile la navegación es con **`Tabs` dentro de la pantalla**, no con sub-items del sidebar. Y **son 3 tabs, no 4: falta Usuarios.** Hay que decidir si Usuarios se diseña, si se deja sólo en desktop, o si se difiere.
>
> Nota adicional: `Configuración/Promociones` tiene **CTA sticky al fondo** (`2345:37182`), igual que Membresías.

El sidebar tiene 4 sub-items pero sólo hay 3 pantallas diseñadas, en ambos viewports:

| Sub-item | Desktop | Mobile | Estado |
|---|---|---|---|
| Negocio | `2141:51590` | `2333:33003` | ✅ diseñada — form "General Information" (4 `Form Input` + `ImageUpload` de logo) |
| Membresías | `2151:58342` | `2333:37880` | ✅ diseñada — `Data Table`. **Se solapa con la Fase 10**, resolver abajo |
| Promociones | `2151:68169` | `2333:38036` | ✅ diseñada — `Data Table` + CTA sticky |
| Usuarios | ❌ | ❌ | 🔵 **sin diseñar en ningún viewport** |

**Solapamiento Membresías ↔ Fase 10.** Tanto la sección Membresías del sidebar (Fase 10) como Configuración → Membresías muestran un `Data Table` de planes. **Probablemente son la misma pantalla accesible desde dos lugares.** Confirmarlo al abrir los nodos: si lo son, se implementa una sola vez en la Fase 10 y Configuración sólo la linkea. Si difieren, documentar en qué.

### Brechas de DB

- **A2** — `business_settings` no existe. Bloqueante para "Negocio".
- **Storage** — el logo necesita bucket de Supabase Storage + política de acceso público de lectura.
- **B7** — `discount_rules` no tiene vigencia (`valid_from` / `valid_to`) para Promociones.
- **B8** — `profile` no tiene `email`; Usuarios lo necesita. Y `user_roles` existe con 4 roles (`admin`, `manager`, `employee`, `viewer`) pero no hay flow de invitación.

**Riesgo timezone:** bajo, salvo la vigencia de promociones (`valid_from`/`valid_to` → `parseAppTzDateString`).

**Definición de hecho:**
- [ ] Resuelto el solapamiento Membresías ↔ Fase 10 (una pantalla o dos)
- [ ] Decidido el patrón de navegación: sub-items de sidebar (desktop) vs `Tabs` in-page (mobile) — o unificar
- [ ] `business_settings` + bucket de Storage
- [ ] Form de Negocio con upload de logo funcionando
- [ ] Promociones sobre `discount_rules` + vigencia (B7)
- [ ] Usuarios: diseñar la pantalla, o documentar explícitamente por qué se difiere

**ADR:** sí — `business_settings`, Storage, y el modelo de promociones.

---

## Fase 15 — Promoción de v2 a default

**Estado:** ⬜ pendiente · fuera del alcance actual

Se planifica cuando 3–14 estén cerradas. A tener en cuenta desde ya:

- **Paridad funcional.** La v1 tiene cosas que el Figma no cubre: grupos familiares (`src/group/`), share de imagen de asistencias, stats de membresías. Auditar qué se porta, qué se descarta y qué se rediseña.
- **Manifest PWA.** `theme_color` y `background_color` están hardcodeados a la paleta v1.
- **Wireframes mobile.** El Figma es 100% desktop 1280×832. **No existe ni un solo wireframe mobile**, y la app hoy es mobile-first en producción. Es el riesgo más grande del rediseño → [Decisiones abiertas](#decisiones-abiertas--riesgos) #1.
- **Retiro del flag.** Qué pasa con `user_feature_flags` y las rutas `/v2/*` — ¿redirect permanente o rename?

---

## Decisiones abiertas / riesgos

Ordenadas por impacto. Las que bloquean una fase están marcadas.

1. **~~No hay diseño mobile~~ → RESUELTO (2026-09-15).** Los 12 flows mobile están indexados en [Figma — índice de nodos mobile](#2-figma--índice-de-nodos-mobile). Lo que **queda abierto** del tema mobile son tres huecos concretos, cada uno asignado a su fase:
   - **Configuración → Usuarios no tiene pantalla mobile** (el sidebar desktop tiene 4 sub-items, el mobile diseñó 3 tabs). → Fase 14.
   - **`Payment Receipt` no aparece en ningún flow mobile.** ¿No existe en mobile o falta diseñarlo? → Fase 8.
   - **Divergencia de navegación en Asistencias** (desktop con `Tabs`, mobile sin ellos) y en **Configuración** (sub-items de sidebar vs tabs in-page). Decidir si son intencionales. → Fases 9 y 14.

2. **~~Paleta~~ → RESUELTO (2026-09-15).** El rosa/magenta **es la marca de Actitud**, y los Figmas nuevos apuntan a más alta fidelidad. Ema: *"hoy no es necesario que pienses en ello de momento, podés mantener todo en escala de grises si querés"*. **Decisión: las primitivas de la Fase 5 se construyen con los tokens neutrales actuales**, y la paleta de marca se aplica después en una pasada dedicada sobre las CSS vars de `[data-v2]` — que es exactamente para lo que sirve el theming scoped de la Fase 1. Evita mezclar decisiones de color con decisiones de API de componentes.
3. **Estados de tabla y lista — parcialmente resueltos por el mobile.** En desktop hay tres anotaciones del diseñador pidiendo definirlos (`2118:22319`, `2118:22606`, `2118:29353`), pero **el mobile sí diseñó dos empty states**: `Gastos/Vacio` (`2286:119862`) y Ventas en $0 (`2265:70904`). Usar esos dos como referencia canónica y derivar el resto (cargando, error, sin resultados de filtro) en la Fase 5, documentándolos acá. Ya no hace falta pedir nada.

4. **~~Paginación de tablas sin definir~~ → RESUELTO (2026-09-16, Fase 6b).** El claim de que "ningún wireframe muestra paginador" era **falso**: la captura del listado de clientes tiene `230 Total de clientes` + paginador numerado. **Las tablas del rediseño paginan.** El componente es [DataTablePagination](../../src/components/v2/DataTablePagination.tsx), ya transversal en `components/v2/`; las fases 10–14 lo instancian en vez de decidir de nuevo. El scroll infinito sigue disponible sobre el mismo query — lo usa el listado v1 — para las secciones donde convenga.

5. **⚠️ Alcance de Ventas (bloquea Fase 12).** ¿Control de stock? ¿Se puede anular una venta? ¿Múltiples productos por venta o uno solo? ¿Quién carga el catálogo de productos? Sin esto no se puede diseñar el schema.

6. **`business_settings`: fila única o `tenant_id` desde ya (bloquea Fase 14).** Agregar `tenant_id` ahora cuesta poco; migrarlo después con datos cuesta bastante más.

7. **Tipos de membresía: hardcodeados vs CRUD (bloquea Fase 10).** Hoy los 5 tipos están en `MembershipTypeArray` con traducciones por key i18n. Si la sección Membresías permite crear planes nuevos, esa constante deja de ser la fuente de verdad y los nombres tienen que salir de la DB (perdiendo i18n por key). Decidir antes de construir.

8. **Histórico de gastos sin `payment_method` (bloquea Fase 11).** ¿Los gastos existentes se backfillean a "efectivo" o quedan como "sin especificar"? Decisión del negocio.

9. **Notificaciones del header.** Hay campana con badge en el diseño, no hay modelo de datos. Derivarla de membresías por vencer es barato y útil. Alternativa honesta: ícono sin badge hasta que se defina.

10. **Cuota del MCP de Figma.** El seat View limita fuerte las llamadas. Opciones: subir el seat, exportar los frames a PNG manualmente a `docs/v2/figma/`, o racionar la cuota por fase (lo que asume este plan). Si el proyecto va a durar meses, exportar los PNGs una vez es probablemente lo más barato.

11. **Multi-tenant runtime.** Cuándo migrar la DB a `tenant_id` + RLS. No bloquea la v2 de Actitud pero debería resolverse antes de onboardear un 2do tenant. Cruza con las decisiones #6 y #5 (tablas nuevas: ¿nacen con `tenant_id`?).

12. **Toggle de v2 en el perfil de usuario.** Hoy el flag se habilita por SQL directo. ¿Se hace UI de admin, o se deja así hasta el corte?

13. **⚠️ "Inactivos" y "De baja" no tienen modelo de datos (Fase 6b, ya entregada con ellos deshabilitados).** El filtro `Estado` del Figma tiene cinco valores; sólo tres se derivan de `customer_membership.expiration_date`. Falta definir:
    - ¿**"De baja"** es una acción explícita del operador (se fue del gimnasio)? Necesita columna de estado en `customers` — o `deleted_at`, según si se quiere soft delete.
    - ¿**"Inactivos"** es otra cosa, o el diseño duplicó el mismo concepto? Si es "tiene membresía pero no viene hace N días", es derivado de `assistance` y hay que fijar el N.

    Mientras tanto se listan apagados en el dropdown. Ocultarlos escondería la diferencia con el diseño; filtrar por una regla inventada devolvería resultados falsos con cara de correctos.

14. **Permisos del historial de pagos (Fase 6b).** El tab Pagos del perfil lee `membership_payments`, que es **admin-only a nivel RLS** por decisión deliberada (`20260702120000_finances_admin_only_rls`). Se acordó en conversación que lo viera todo el panel, pero eso requiere revertir una restricción de seguridad, no sólo sacar un guard de app. Entregado degradando honestamente para no-admin. **Decidir si se abre la RLS** — y si se abre, si es sólo lectura y sólo de los pagos del propio cliente consultado.

15. **~~El alta de cliente no modela el cobro~~ → RESUELTO (2026-09-17).** El paso 2 del Figma pedía `Forma de pago` sin monto, sin confirmación de cobro, sin descuento y sin primera asistencia — todo lo que v1 sí captura vía `upsert_customer_membership_with_payment` — así que el alta habría creado membresía **sin fila en `membership_payments`**: cliente activo, ingreso perdido, sin síntoma visible.

    **Cerrado en la Fase 7 (2026-09-18).** Las capturas nuevas mostraron que diseño agregó **un** campo, "Modalidad de cobro", que trae el monto. De los cinco datos de la checklist quedaron cubiertos dos (monto y forma de pago) y ausentes tres (confirmación de cobro, descuento, primera asistencia). Cada ausencia se decidió explícitamente en vez de construirla a medias: **toda alta cobra** (no hace falta confirmar), **sin descuentos** (no aplican a un cliente sin grupo), y **sin primera asistencia** (es un flow propio). Ver [Fase 7](#fase-7--alta-de-cliente).

    **Lo que deja como método:** el hueco no se vio mirando el Figma —seis frames coherentes— sino **comparando el diseño contra lo que el flow v1 ya escribía en la DB**. Para toda fase que reemplaza un flow existente, listar qué escribe v1 antes de dar el diseño por suficiente. El corolario apareció al cerrarlo: cuando el diseño no cubre un dato, la salida no es inventarlo ni omitirlo en silencio — es decidir qué significa su ausencia y escribirlo.

16. **Copy y gráficos del mobile de Home (Fase 2, cosmético).** Las capturas del 2026-09-17 mostraron dos divergencias que no son de la Fase 7: el empty state del `Resumen del día` dice *"Aun no hay actividad registrada por el momento."* (sin tilde en "Aún"), y las asistencias semanales se dibujan como **barras horizontales** en mobile contra las verticales del desktop. Avisar al diseñador y decidir si el mobile cambia de gráfico a propósito.

---

## Checklist de verificación estándar

Aplica a **toda** fase antes de pedir review. Está pensado para que el otro dev valide en el preview de Vercel sin correr SQL ni migraciones (dev y preview comparten DB).

### Local, antes de pushear
1. `npm run type-check` — sin errores nuevos.
2. `npm run lint` — sin errores nuevos.
3. `npm run dev` — arranca sin warnings nuevos en consola.
4. Responsive: 1440px → 768px → 375px sin overflow horizontal.
5. Auditoría de timezone: cada fecha nueva que llega a un RPC o a la DB pasa por un helper de `src/lib/timezone.ts`.

### En el preview
1. **User sin `v2_access`:** `/home` (v1) funciona; `/v2/*` redirige a `/home`.
2. **User con `v2_access`:** el flow nuevo funciona end-to-end con data real; `/home` (v1) sigue intacta.
3. **Sin regresiones en v1:** `/home`, `/customer`, `/expenses`, `/stats`, `/incomes`, `/assistances`.
4. **Golden path + al menos un edge case + un caso de error** del flow de la fase.
5. Tokens: colores, tipografía y spacing coinciden con el Figma (inspección visual + DevTools).

### Antes de mergear
- ADR creado y commiteado junto al feature (no en commit separado).
- Este plan actualizado: tabla de estado, sección de la fase, y entrada en Cambios registrados.

---

## Cambios registrados

> Log de decisiones o cambios de alcance. Formato: `YYYY-MM-DD — descripción — quién`.

- 2026-08-17 — Plan inicial creado y aprobado en sesión — Ema + Claude.
- 2026-08-17 — Fase 0 implementada (PR #43). Skipeada la sub-tarea "toggle en sidebar v1" (el `FooterNavigation` v1 no da lugar natural; se difiere al menú de user de v2). Habilitación del flag por SQL directo, sin UI de admin — Claude.
- 2026-08-17 — Fase 1 implementada en `feat/v2-design-system` (PR #44). Convenciones de theming scoped, AppShell y cards individuales — ver [Fases 0–2](#fases-02-histórico) — Ema + Claude.
- 2026-08-17 — Fase 1.5 en `feat/v2-sidebar-collapsible` (PR #45). Sin ADR nuevo. Modo colapsado 64px, popover a la derecha, `data-v2` en portales, gate CSS en vez de `useIsMobile()` — Ema + Claude.
- 2026-08-18 — Fase 1.6: fixes de i18n, composition y hidratación (PR #46). i18n obligatorio desde día 1, fechas formateadas en server, sub-componentes explícitos — Ema + Claude.
- 2026-08-19 — Fase 2 completa. PRs #47 y #48 mergeados en develop. Home v2 funcional con data real — Ema + Claude.
- 2026-08-19 — Fase 3: modal de asistencia, `SuccessTick` sin dependencias, búsqueda insensible a acentos. **PR #49 mergeado en `develop`** — Ema + Claude.
- 2026-09-15 — Corregido el estado de la Fase 3: figuraba 🟡 "en curso" por una comparación contra un `develop` local desactualizado. Los 3 commits están en `origin/develop` desde el 2026-08-19; la rama `feat/v2-attendance-modal` quedó integrada y puede borrarse. Los pendientes de la fase (verificación contra Figma, duplicado de asistencia, loading de búsqueda) siguen abiertos y se arrastran a la fase que los toque — Ema + Claude.
- 2026-09-10 — **Plan extendido a los 17 flows del Figma.** Se agregó: índice completo de nodos por flow, inventario de componentes compartidos, análisis de brechas de DB contra `shemema.txt`, y fases 3–15 con alcance, datos, riesgo de timezone y definición de hecho por fase. Hallazgos que cambian el alcance previsto:
  - **Ventas no tiene modelo de datos** (`products`/`sales`/`sale_items` no existen) → Fase 12 bloqueada hasta diseñar el schema.
  - **Configuración > Negocio no tiene tabla** ni bucket de Storage → Fase 14 bloqueada parcialmente.
  - **`expenses` no tiene `payment_method`**, así que los KPIs Efectivo/Transferencias del Figma no se pueden calcular → migración en Fase 11.
  - **El sidebar implementado no matchea el Figma**: "Caja" y "Reportes" no existen en el diseño; son "Gastos" y "Balance". Además el orden difiere → Fase 4.
  - **Defecto latente en el schema**: `membership_payments.payment_method` tiene `DEFAULT 'efectivo'` que viola su propio CHECK; cualquier insert que omita la columna falla.
  - **No hay ni un wireframe mobile** en las 73 pantallas, siendo que la app en producción es mobile-first.
  - **La paleta del Figma es rosa/magenta**, no los tokens neutral+green/yellow que implementó la Fase 1.
  - **Límite de cuota del MCP de Figma** (seat View): sólo se pudo inspeccionar visualmente 1 de 73 pantallas. El resto del plan se derivó del árbol de nodos. Cada fase debe verificar sus nodos antes de implementar.
  — Ema + Claude.
- 2026-09-15 — **Indexados los 12 flows mobile.** Ema pasó el nodo `2167:22916`: resultó ser una **segunda página del mismo archivo** ("Wireframes mobile"), no un archivo aparte — el listado de páginas de la API no la devolvía, pero responde bien por node ID directo. Se agregó el índice completo, las convenciones de layout mobile (2.1) y la tabla de divergencias mobile↔desktop (2.2). Cada fase ahora tiene sus dos referencias. Hallazgos que cambian decisiones ya tomadas:
  - **Los modales mobile son full-screen 390×844, no bottom sheets.** Corregido el supuesto de la Fase 5.
  - **El sidebar mobile es un drawer de 260px** (no 255 como desktop) sobre overlay.
  - **Dos empty states sí están diseñados** (`Gastos/Vacio`, Ventas en $0) → la decisión abierta #3 deja de requerir input del diseñador.
  - **Configuración se navega con `Tabs` in-page en mobile** y con sub-items de sidebar en desktop; y **Usuarios no está diseñado en ningún viewport**.
  - **Los nombres de los frames mobile resuelven las 2 tablas sin identificar de Configuración desktop**: son Membresías y Promociones. Aparece un solapamiento nuevo entre Configuración→Membresías y la Fase 10.
  - **Asistencias no tiene `Tabs` en mobile** pero sí en desktop — divergencia a resolver en la Fase 9.
  - **El `Payment Receipt` no existe en ningún flow mobile**, siendo que la app es mobile-first. Hueco real para la Fase 8.
  - **KPIs tienen dos tratamientos:** cards apiladas en Home/Balance, fila de 3 `Paragraph` compactos en Ventas/Gastos.
  - **Bug de copy en el diseño:** los KPIs de Gastos mobile dicen "Total cobrado" en vez de "Total de gastos".
  - Queda **una sola incógnita de diseño realmente bloqueante**: cómo degrada el `Data Table` en 358px. Verificar antes de la Fase 5.
  — Ema + Claude.
- 2026-09-10 — Agregado el **protocolo de trabajo con el Figma** (abrir el nodo-sección del flow → volcar hallazgos acá → marcar verificado → recién ahí implementar) y la tabla vacía de **flows mobile**, pendiente de que Ema pase el `fileKey` y los nodos-sección del archivo mobile. Reformulada la decisión abierta #1: los flows mobile existen, el problema es que no están indexados, no que no estén diseñados — Ema + Claude.
- 2026-09-15 — **Refactor de i18n previo a la Fase 4** (`refactor/i18n-server-t`, PR #50). Se eliminó el props threading de `lang`/`tenant` con `getServerT()`. Se hizo antes de la fase justamente porque ésta crea 10 pages nuevas, que con el patrón anterior habrían sumado 10 call sites más al refactor. ADR [20260908111054](../architecture/decisions/20260908111054_centralizar-resolucion-de-lang-tenant-en-i18n.md) — Ema + Claude.
- 2026-09-15 — **Fase 4 completa** (`feat/v2-navegacion-sidebar`). Sidebar alineado al Figma: "Caja"→**Gastos** y "Reportes"→**Balance** (no existían en el diseño), reordenado, y los 8 ítems + 4 sub-ítems navegando a 10 rutas stub nuevas con placeholder `UnderConstruction`. Rutas centralizadas en `ROUTES_V2`. Notas:
  - **Se corrigió un claim falso del propio plan**: el `endsWith` del active state no daba falsos positivos (`'/v2/settings/memberships'.endsWith('/v2/memberships')` es `false`); el defecto era un falso *negativo* con sub-rutas. Segunda vez que un documento del repo fija como hecho algo no verificado — conviene chequear los claims del plan al ejecutarlos.
  - **Campana de notificaciones diferida**: sin modelo de datos, y definir qué muestra es producto, no navegación.
  — Ema + Claude.
- 2026-09-15 — **Ema pasó capturas y se destrabaron las 3 validaciones que frenaban la Fase 5.** Resultados en [2.4](#24-presentación-de-componentes-confirmada):
  - **El `Data Table` en mobile no es una tabla**: es una lista de filas apiladas (avatar con iniciales + nombre + línea secundaria + badge de estado). Implica que el componente necesita **dos renders**, no uno responsive por CSS.
  - **`Modal / Membership Form` y `Customer Detail Modal` son panel lateral derecho 480×832 en desktop** (geometría del árbol: `x=800` en frame de 1280) y full-screen 390×844 en mobile. `Modal Dialog` centrado 512×alto-variable; `Payment Receipt` centrado 390×574.
  - **La paleta rosa es la marca**, pero se difiere: las primitivas se construyen en escala de grises y el color entra en una pasada aparte.
  - **Bonus — 4 brechas de DB nuevas** del form de alta de cliente: `customers.birth_date` (B10), `customers.notes` (B11), `customer_membership.start_date` (B12) y soporte de "Sin membresía" (B13).
  - **Bonus — se cerró un hueco de la Fase 8**: el `Payment Receipt` en mobile sí existe, es el dialog de éxito con botón Compartir. Y apareció una decisión de negocio nueva: el form deja elegir Descuento y Recargo a mano, mientras `billing-policy.ts` los calcula por día del mes.
  — Ema + Claude.
- 2026-09-16 — **Fase 5 completa** (`feat/v2-primitivas`). Construidas las primitivas que consumen las fases 6–14: `DataTable`, `SidePanel`, `ConfirmDialog`, `FilterBar` + `FilterDropdown`, `Stepper`, `StatusBadge`, `EmptyState`, `PageHeader`. Sandbox de revisión en `/v2/sandbox`. Decisiones y desvíos:
  - **`FormModal` y `DetailModal` colapsaron en un solo `SidePanel`.** El plan los preveía como dos componentes; la geometría del Figma los desmiente — ambos son `x=800, 480×832` en desktop y full-screen en mobile. Son el mismo contenedor con contenido distinto.
  - **`mobileRow` es un prop requerido de `DataTable`**, no opcional: convierte el hallazgo "en mobile no es una tabla" en algo que el compilador recuerda en cada sección futura.
  - **Sin TanStack Table ni el `table` de shadcn.** Tabla propia sobre `<table>` semántico: el uso real es render + filtros server-side.
  - **Sin paginación** por ahora — ningún wireframe la muestra y agregarla después es aditivo.
  - **Todo en escala de grises**, según lo acordado; la paleta de marca entra en una pasada aparte sobre las CSS vars de `[data-v2]`.
  - **`AssistanceModal` refactorizado sobre `SidePanel`** en vez de dejar dos implementaciones. Cambio visual menor: 520px → 480px, que es el valor del Figma.
  - **Excepción consciente:** `PrimitivesSandbox.tsx` no usa i18n. Es un harness de dev, no producto; traducirlo sumaría ~20 keys a borrar después. Documentado en el ADR.
  - **Dos bugs encontrados en la revisión visual de Ema**, ambos promovidos a convención porque aplican a todo lo que venga:
    - **Todo portal con `data-v2` necesita un `!p-*` explícito.** El `[data-v2='true'] { padding: 2rem 3rem }` de `globals.css` se hereda en el portal y se suma al padding propio; un `p-0` común pierde por especificidad. El `AppShell` ya lo hacía desde la fase 1.5 pero nunca se escribió por qué, así que el error se repitió en tres primitivas.
    - **`min-h-0` en la columna del main del `AppShell`.** Una página más alta que el viewport desbordaba el `h-dvh` del wrapper y se dibujaba sobre el fondo maroon del tenant v1. Es el gemelo vertical del `min-w-0` de la fase 1.5. Sin este fix, la fase 6 se topaba con el mismo bug apenas hubiera 20 filas.
    - **El círculo del paso activo del `Stepper` era invisible**: usaba `bg-primary-500`, que no existe (la escala del `@theme` va sin guion antes del número). Ni el type-check ni el lint detectan una clase de Tailwind inexistente — sólo se ve en pantalla.
    - **Los botones estaban mal en el sandbox — y el home tampoco era consistente consigo mismo**: convivían dos `contained` (`bg-sidebar-accent` gris medio y `bg-foreground` negro) y dos `outlined` con geometría distinta. Se creó el átomo [v2/ui/Button.tsx](../../src/components/v2/ui/Button.tsx) con `contained`/`outlined`/`ghost`/`destructive` y se unificó todo el home. **Cambio visual:** "Registrar asistencia" pasa de gris medio a negro.
    - **Estructura nueva:** `src/components/v2/ui/` para átomos (Button, StatusBadge), `src/components/v2/` para compuestos.
  — Ema + Claude.
- 2026-09-16 — **Fase 6 partida en 6a y 6b; 6a (listado de clientes) completa** (`feat/v2-clientes`). ADR [20260916120738](../architecture/decisions/20260916120738_v2-listado-de-clientes.md). La cuota del MCP de Figma se agotó en la **primera** llamada de la sesión, así que ninguno de los 9 frames de la fase se pudo verificar. Se entregó lo que no requería adivinar (el listado) y se documentó explícitamente lo que sí (el modal de perfil y el dropdown de acciones → 6b, con la lista de nodos a exportar). Hallazgos y desvíos:
  - **El query del listado estaba duplicado desde antes de la v2** — `searchAllCustomers` (server) y `_fetchCustomersPage` (client) eran la misma consulta escrita dos veces. Extraído a `customers-query.ts`, que recibe el cliente de Supabase por parámetro. Nadie lo había notado porque ninguna de las dos copias había cambiado nunca.
  - **Los filtros no necesitaron migración.** PostgREST filtra por columnas de un recurso embebido si el join es `!inner`; de ahí la segunda variante del select. Se descartó el RPC `search_customers_paginated` (más expresivo, resolvería "sin membresía" y daría `count`) porque cuesta migración y el Figma no muestra paginador ni contador.
  - **"Sin membresía" se muestra pero no se filtra** — decisión abierta #6 sin resolver, se arrastra a la Fase 7 junto con la brecha B13.
  - **Ema pasó la captura del listado desktop en la misma sesión y se corrigieron 6 cosas** (ver [Pantallas](#pantallas)): la barra de filtros va en **una sola fila**; los dropdowns se llaman `Estado`/`Membresías` y el trigger muestra el nombre del filtro; las columnas son `Nombre y Apellido · Membresía · Estado · Vencimiento · Asistencias` — **se habían inventado "Contacto" y el DNI bajo el nombre, y faltaba "Asistencias"**; el avatar de iniciales va también en desktop; el header de la tabla es una banda gris; el badge dice **"Activa"**; y el plan se escribe "5 días semanales" en la tabla contra "Membresía: 5 días" en la fila mobile. Cuatro de esas correcciones se promovieron a convención porque son de las primitivas, no de Clientes.
  - **El árbol de nodos no alcanza para definir columnas de tabla ni microcopy.** 3 de las 6 correcciones eran columnas. Para las fases con tabla que vienen (10, 11, 12, 14): pedir la captura **antes** de definir las columnas.
  - **Tercer claim desactualizado del plan**: la convención decía que `getServerT()` no existe, cuando lo introdujo el PR #50 y lo usa todo v2. Corregido.
  - **`.or()` sobre recurso embebido necesita `referencedTable`.** Se verificó la URL generada (`customer_membership.or=(...)`) inspeccionando `request.url` con un script descartable, sin pegarle a la DB — técnica útil para cualquier filtro PostgREST no trivial.
  — Ema + Claude.
- 2026-09-16 — **Arranque de la Fase 6b (`feat/v2-perfil-cliente`), sin código todavía.** Se reintentó la cuota del MCP de Figma y volvió el mismo rate limit del seat View: **la cuota no se renovó en el día**, así que 6b sigue bloqueada hasta que Ema pase las capturas de los 8 frames. Lo que sí se hizo:
  - **Relevado el inventario de API del modal de perfil** (ver [6b](#6b--qué-falta-y-qué-se-necesita-para-desbloquearlo)) para no re-explorar cuando lleguen las capturas. Dos hallazgos: `getMembershipPayments` llama a `requireAdmin()`, así que un tab de pagos tiene una decisión de permisos detrás; y **no existe ningún endpoint de historial de asistencias por cliente** — `fetchCustomerModalData` trae sólo la semana en curso. Es el único endpoint nuevo que anticipa la fase.
  - **Respondida a medias la decisión abierta #6** ("Sin membresía"). Ema: es un **estado inicial del cliente**, no un tipo del catálogo → se descarta agregar `NONE` a `types_memberships`. Falta cerrar si el alta deja al cliente sin fila en `customer_membership` o con `membership_type` nullable; se resuelve al arrancar la Fase 7.
  — Ema + Claude.
- 2026-09-16 — **Fase 6b completa** (`feat/v2-perfil-cliente`), y con eso la Fase 6 entera. ADR [20260916161500](../architecture/decisions/20260916161500_v2-perfil-de-cliente-y-paginacion.md). Ema pasó las 6 capturas del listado y del perfil, que destrabaron la fase y **corrigieron tres supuestos del plan**:
  - **El listado tiene paginador y contador de resultados.** 6a se había construido con scroll infinito justificando que el Figma no los mostraba. Sí los muestra. Se revirtió a paginación server-side con `count: 'exact'`, se extrajo `DataTablePagination` a `components/v2/` para las 10 tablas que vienen, y **se cerró la decisión abierta #4**. El scroll infinito no se perdió: el mismo query canónico lo sigue alimentando en el listado v1.
  - **El filtro `Estado` tiene 5 valores, no 2** — Activo · Por vencer · Vencido · Inactivos · De baja. Se implementaron los tres derivables de `expiration_date` (con los tres cortes mutuamente excluyentes, y "Por vencer" reusando la ventana de 7 días del home, que se mudó a `membership/consts.ts`). Los otros dos no tienen modelo → nueva decisión abierta #13, listados deshabilitados.
  - **`2118:22594` no es un menú de acciones de fila**, como decía este plan: es el filtro `Estado` desplegado. **No existe menú por fila** — el chevron abre el perfil. Un componente entero que no había que construir.
  - **Endurecida la moraleja de 6a:** el árbol de nodos tampoco alcanza para detectar *controles enteros*. Pasa de "pedir la captura antes de definir columnas" a **"antes de definir la pantalla"**.
  - **Cuarto y quinto claim desactualizado del plan:** `MembershipTranslationShort` figuraba como creado en 6a y no existía (era `MembershipTranslationWeekly`, con otro propósito); y la descripción de `2118:22594`. Ambos corregidos acá.
  - **Brechas B10 y B11 aplicadas** (`customers.birth_date`, `customers.notes`) — migración aditiva, sin backfill. El tab Info las muestra, así que se adelantaron desde la Fase 7. **B12 no**: quedaría NULL para todo el histórico y la barra de progreso necesita el fallback a `last_payment_date` igual.
  - **Un solo endpoint nuevo en toda la fase:** `fetchCustomerAssistances`. Los pagos ya tenían `/api/accounting/payments?customer_id=` y se reusó.
  - **Apareció una decisión de seguridad que no estaba sobre la mesa** (nueva #14): se había acordado que los pagos los viera todo el panel, pero `membership_payments` es admin-only **a nivel RLS** por una migración deliberada. No se tocó la RLS; el tab degrada con un mensaje explícito de permisos en vez de mostrar una lista vacía.
  - **La cuota del MCP de Figma no se renueva en el día** — se confirmó con un segundo intento.
  — Ema + Claude.
- 2026-09-16 — **Orden del listado de clientes por actividad real** (misma rama que 6b, migración `20260916183000`). Salió de mirar la pantalla terminada con data real: cumplía el Figma al pie de la letra y era casi inútil — **de las primeras 20 filas alfabéticas, sólo 3 habían asistido en el último mes y 7 nunca pisaron el gimnasio**; el 41% de la base nunca registró una asistencia. Dos grupos alfabéticos: actividad reciente arriba, resto abajo. Detalle en [Fase 6b](#6b--qué-quedó-construido). Lo que deja como aprendizaje transversal:
  - **El wireframe no puede mostrar este tipo de problema.** El Figma dibuja ocho filas de ejemplo, todas activas, así que el orden se ve perfecto en el diseño. **Mirar cada pantalla nueva con data real antes de cerrarla**, no sólo compararla contra el frame. Es el complemento de la moraleja de 6a, que era sobre lo que el Figma no dice; ésta es sobre lo que el Figma no puede decir.
  - **El dominio ya había nombrado el problema.** "Señal de vida" / "churn silencioso" estaba definido y comentado hacía meses en accounting y en el home. Antes de diseñar un criterio nuevo, buscar si el proyecto ya lo resolvió en otro lado.
  - **Primera vista del proyecto**, con dos requisitos que aplican a toda vista futura: `security_invoker = true` y verificar el embedding de PostgREST contra la API real antes de usarla.
  - **Denormalizar salió gratis** porque ya existía el trigger de `assistance_count`. Relevante para el tier gratuito de Supabase (la base está en 25 MB de 500): el patrón caro habría sido agregar `max(assistance_date)` en cada request.
  — Ema + Claude.
- 2026-09-17 — **Fase 7 bloqueada y sesión de destrabado previo.** No se escribió código. Lo que pasó:
  - **Se cerraron B5, B12 y B13** como decisiones (ver [Fase 7](#fase-7--alta-de-cliente)), y se midieron contra dev **y** prod los datos que condicionan B5 y B13: 8 DNIs duplicados / 16 filas (idéntico en ambos entornos, 0 clientes sin DNI) y 8 clientes sin fila de `customer_membership`.
  - **B5 salió del alcance de la Fase 7.** Uno de los 8 pares (`Matias`/`Belena Manucci`) **no es un duplicado sino un DNI mal tipeado entre dos personas distintas**, y varios pares tienen historial de asistencias y pagos de los dos lados. Unificar exige reasignar `assistance` y `membership_payments` con criterio caso por caso → PR y ADR propios.
  - **Las capturas de Ema cerraron el diseño**: 2 pasos en ambos viewports (no 5 vs 2), `SidePanel` en desktop y full-screen en mobile, sin email, submit en "Un momento", y confirmación como alerta verde **inline** en vez de toast global.
  - **Ema detectó el bloqueante**: el paso 2 no modela el cobro, que en v1 es parte del alta. Ver [decisión abierta #15](#decisiones-abiertas--riesgos). La fase se retoma cuando el diseño lo resuelva; **la 8 pasa a ir primero**.
  - **Lección operativa.** Las capturas completas no garantizan un diseño completo: seis frames se veían coherentes y aun así faltaba el concepto central del flow. Lo que lo delató no fue mirar el Figma sino **comparar contra lo que v1 ya hacía**. Para las fases que reemplazan un flow existente, listar qué escribe el flow v1 en la DB **antes** de dar el diseño por suficiente.
  — Ema + Claude.
- 2026-09-17 — **Cerrados el Defecto C y la brecha B4** (`fix/integridad-escrituras-db`). ADR [20260917120000](../architecture/decisions/20260917120000_integridad-de-escritura-pagos-y-asistencias.md). Se tomaron juntos por ser el mismo tipo de problema — la base aceptaba escrituras que el negocio considera imposibles — y porque ninguno depende del Figma, que es lo que tenía trabado al resto del plan.
  - **El arreglo obvio del Defecto C habría empeorado el bug.** Este plan lo anotaba como "arreglar el default que viola el CHECK", y la lectura literal produce el cambio equivocado: sacar sólo el `DEFAULT` deja pasar `NULL`, porque un CHECK pasa cuando su expresión no es `FALSE`. Habría convertido un 500 ruidoso en una fila con `NULL` en silencio. Fue `DROP DEFAULT` **+ `SET NOT NULL`**. **Antes de relajar una restricción, verificar qué escritura queda permitida, no sólo cuál deja de fallar.**
  - **La expresión idiomática de fecha-AR es la indexable y el atajo no.** `(assistance_date AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` se acepta en un índice porque `timezone(text, timestamptz)` es `IMMUTABLE`; `(assistance_date - interval '3 hours')::date` **no**, porque `timestamptz::date` es `STABLE`. Contraintuitivo y verificable en dos minutos contra `pg_proc` — **relevante para cualquier índice o columna generada futura que dependa del día argentino.**
  - **Apareció una deriva preexistente de `assistance_count`** que nadie estaba buscando: además de los 21 clientes afectados por la limpieza de duplicados, **12 en prod ya tenían el contador mal** (11 de más, 1 de menos). Los de más son borrados que el trigger `AFTER INSERT` nunca descontó. **Toda columna denormalizada mantenida por trigger deriva con el tiempo** — conviene recomputar cada vez que se la toca.
  - **B5 quedó fuera por lo mismo que B4 entró: medirla.** El conteo mostró que no era comparable — uno de los 8 pares son dos personas distintas con un DNI mal tipeado, y varios tienen historial de los dos lados.
  - **Nuevo: [`supabase/scripts/audit-integrity.sql`](../../supabase/scripts/audit-integrity.sql)**, de sólo lectura, corre contra cualquier entorno y reporta los cinco indicadores de integridad (pagos sin método, asistencias duplicadas, deriva de `assistance_count`, DNIs duplicados, clientes sin membresía). Nace de una observación de Ema: **una migración de datos tiene dos fechas** — cuándo se mide el entorno y cuándo se aplica a prod — y `db:push-prod` es **manual**, así que pueden separarlas semanas. Correrlo antes de cada push a prod y después para confirmar. Sirve igual para B5.
  - **Estas dos migraciones no dependen de la v2 y no deberían esperarla:** arreglan defectos de v1 que están en producción hoy. Como la v2 viaja apagada detrás de `v2_access`, pueden ir a prod en el próximo release normal.
  — Ema + Claude.
- 2026-09-17 — **Sincronización de prod y release v0.11.1.** ADR [20260917160000](../architecture/decisions/20260917160000_sincronizar-migraciones-de-prod-y-ensayo-transaccional.md). Prod estaba **4 migraciones atrás** y en esa brecha se había acumulado una incompatibilidad invisible.
  - **`develop` no era deployable.** El listado y la búsqueda de clientes de **v1** ya leían la vista `customers_listing` y la columna `customers.full_name_search`, que en prod no existían. Un release sin migraciones habría roto **la búsqueda para registrar asistencia** — el flujo más usado del gimnasio — y dejado el listado de clientes **vacío en silencio**, porque `searchAllCustomers` atrapa el error y degrada a lista vacía.
  - **Un gate de UI no es un gate de schema.** Era tentador razonar "nadie tiene `v2_access` en prod, la v2 no puede romper nada". El flag protege las pantallas; las migraciones y el código compartido son globales. De ahí salió la regla operativa #1 de [Por dónde seguir](#por-dónde-seguir).
  - **La falla más peligrosa era la que no fallaba.** El `catch` que degrada a lista vacía —pensado para que un fallo de Supabase no tire la página— habría convertido "falta una vista" en "no hay clientes", sin pantalla de error.
  - **Nuevo: [`scripts/rehearse-migrations.sh`](../../scripts/rehearse-migrations.sh).** DDL en Postgres es transaccional, así que las migraciones pendientes se corren contra el entorno real dentro de `BEGIN … ROLLBACK`: sentencias exactas, datos reales, cero persistencia. Pasa a ser paso obligatorio antes de `db:push-prod` y quedó documentado en [workflow.md](../workflow.md), que ahora describe un release de 5 pasos.
  - **El orden de deploy se clasifica, no se recuerda.** "Código primero" es correcto para migraciones que **rechazan lo que el código viejo escribe**; el default documentado del proyecto para migraciones **aditivas** es al revés. Aplicar la costumbre equivocada acá habría causado el corte.
  - **Diffear relaciones y columnas no alcanzaba:** faltaban las funciones. Se completó al comparar también `pg_proc`. **Un diff de schema que omite funciones, triggers o policies no es un diff de schema.**
  - **Resultado en prod:** 6 migraciones aplicadas, 28 asistencias duplicadas eliminadas, 12 contadores corregidos, `payment_method` obligatorio, v0.11.1 desplegado y validado. **0 usuarios con `v2_access`** — la tabla se creó vacía.
  — Ema + Claude.
- 2026-09-17 — **Fase 7 desbloqueada.** Diseño incorporó el bloque de cobro al paso 2 del alta, el mismo día en que se detectó el hueco. Queda pedir las capturas nuevas y verificarlas contra la checklist de cinco campos. **Cierra la decisión abierta #15** — Ema.
- 2026-09-18 — **Fase 7 completa** (`feat/v2-alta-cliente`). ADR [20260918112629](../architecture/decisions/20260918112629_v2-alta-de-cliente.md). Un panel con dos entradas, toda alta cobra salvo VIP, B12 y B13 cerradas, residuo del defecto C eliminado, `charge_mode` extraído a módulo compartido que v1 también consume.
  - **El paso 2 no era el bloque de cobro de la Fase 8.** El único campo que agregó el rediseño, "Modalidad de cobro", resultó ser el `charge_mode` que v1 ya tenía — misma clave i18n. Eso decidió el orden entre la 7 y la 8, que estuvo abierto tres semanas.
  - **Verificar antes de proponer encontró tres cosas que el plan daba por ciertas**: que `birth_date`/`notes` estaban listas (las columnas sí, el camino de escritura no — 0 filas escritas en prod), que B12 era sólo una columna (son dos RPC), y que `shemema.txt` estaba desactualizado justo sobre el defecto C.
  - **Una captura puede no responder la pregunta que parece responder.** El prefill mostraba 01/08 → 31/08, pero con hoy = 01/08 "fin de mes" y "+30 días" coinciden. La regla la tenía que decir una persona.
  - **Leer el RPC entero antes de tocarlo.** Escribir `start_date` sólo en el alta habría congelado el valor y empeorado la barra de progreso del perfil. Sólo se ve mirando las dos funciones juntas.
  - **Un overload nuevo puede perder lógica del viejo sin que nada falle.** El RPC de 14 params se escribió copiando el de 10 y agregando descuentos, y en el camino perdió la canonicalización de DAILY. No rompió nada visible porque el overload viejo siguió cubriendo el único flow que dependía de ella. **Cuando se duplica una función para extenderla, diffear la vieja contra la nueva antes de mergear.**
  - **Migrar un call site a "la versión buena" puede ser una regresión.** El de 14 valida mejor el método de pago pero escribía peor la expiración de DAILY. "Más nuevo" no es "superset": se verificó simulando un alta de cada tipo de plan y mirando qué quedaba en la base.
  - **La cuota del MCP de Figma es 6 llamadas por mes**, no ~5 por sesión. El protocolo de racionamiento por fase que documentaba este plan era inaplicable; se corrigió la sección 1 con el número real y cómo desbloquearlo.
  - **Deja dos migraciones con orden de deploy obligatorio** — ver la tabla de [Por dónde seguir](#por-dónde-seguir). — Ema + Claude.
- 2026-09-21 — **Fase 8 arrancada: diseño verificado + fundaciones de cobro** (`feat/politica-de-cobro-y-recargo`, sin UI). ADR [20260921101140](../architecture/decisions/20260921101140_politica-de-cobro-unica-recargo-explicito-y-comprobante.md). Ema pasó las capturas del flow de renovación (desktop desde perfil + mobile desde home) y respondió la decisión #5. Qué cambió el alcance:
  - **Las 10 vs 6 pantallas no eran dos flows:** es uno con dos entradas. Desde el perfil el cliente ya está fijado y el panel arranca en el stepper; desde el home hay dos pantallas de búsqueda antes. Mismo patrón que resolvió la Fase 7.
  - **La decisión #5 se respondió y la premisa de la pregunta era falsa.** Este plan afirmaba que `billing-policy.ts` calculaba el recargo por día del mes: no lo calculaba y el form de v1 nunca lo llamaba. **Sexto claim desactualizado** que aparece al ejecutar una fase.
  - **Había tres reglas de día-del-mes conviviendo, dos en producción contradiciéndose.** `ACTITUD_BILLING_POLICY` decía recargo desde el 16 —y con ese corte el dashboard de ingresos clasificaba los pagos y pintaba la barra del ciclo—; el form sugería desde el 11; el copy en pantalla decía "pasó el día 10". Un pago del día 13 salía "sin recargo" en el dashboard mientras el form ya sugería cobrarlo con recargo. Se unificó en el **día 11**, que es lo que decían dos de las tres. **Cuando una regla de negocio vive en más de un archivo, verificar que el número coincida antes de asumir cuál es la fuente de verdad.**
  - **Brecha de DB que este plan no tenía anotada:** el recargo no tenía dónde guardarse. Se cobraba eligiendo "mes con recargo", que escribe el precio total en `gross_amount` — una fila indistinguible de un plan más caro, y un comprobante que sólo se puede reconstruir recalculando contra los precios de hoy. Ahora son `surcharge_amount` + `surcharge_note`.
  - **Mora e ingreso a mitad de mes quedaron nombrados como cosas distintas.** La condición `hasAssistancesThisMonth` de v1 ya hacía la distinción y nadie la había escrito: quien paga tarde tiene recargo, quien se suma el día 20 tiene media membresía. Ahora es un `reason` explícito que la UI muestra.
  - **La precaución equivocada sobre floats casi sacó una garantía que ya existía.** Se iba a evitar el CHECK de igualdad "porque son columnas `real`", hasta ver que ese CHECK estaba desde `20260722120000` y nunca falló. Se extendió a `amount = gross + surcharge - discount`. **Antes de evitar una técnica por principio, mirar si el repo ya la usa y cómo le fue.**
  - **Un Postgres local desechable validó lo que leer el SQL no valida.** Cluster con el schema real (sin FK, sin la vista, con stub de `auth.uid()`) y siete escenarios ejercitados. El que importaba: el re-cobro idempotente **no consume un número de comprobante nuevo** porque `COALESCE` corta la evaluación de la función volátil.
  - **B3 cerrada aunque el diseño no la pedía:** el comprobante del Figma no tiene número. Se agregó igual, con secuencia por año y el año tomado de la fecha del pago, no de `now()`.
  - **v1 pasa a guardar el desglose igual que v2** sin cambiar su UI, vía un campo oculto. La alternativa —cada pantalla guardando a su manera— hacía que el desglose de ingresos dependiera de cuál de las dos cobró.
  - **Seis defectos nuevos del diseño** anotados en la sección de la fase, y un endpoint muerto descubierto de paso (`POST /api/accounting/payments` falla siempre por `gross_amount` NOT NULL).
  — Ema + Claude.
- 2026-09-22 — **Fundaciones de la Fase 8 desplegadas a producción — v0.13.0.** PR [#60](https://github.com/EmaCrzz/actitud-bo/pull/60) mergeado a `develop`, migración `20260921101140` aplicada a prod **antes** del release, y release por `./scripts/release.sh minor`. Auditoría de integridad antes y después: **idéntica**, no se movió ningún dato. En prod quedan 291 pagos con `surcharge_amount = 0` y sin comprobante (el histórico no se backfillea), 1 solo overload del RPC con 16 params, y el CHECK con recargo activo.
  - **Antes del release se cerró un hueco de cobertura.** Las pruebas de UI habían ejercitado renovación completa, renovación con recargo, alta v1, alta v2, VIP y diaria — pero **tres ramas del RPC que la migración tocó no se habían ejecutado nunca**: cambio de tipo con reintegro, cambio de tipo con cobro de diferencia, y pago con descuento. plpgsql resuelve nombres de forma perezosa, así que un error ahí no aparece al crear la función sino el día que un operador cambia a alguien de plan. Las cinco se probaron contra un Postgres desechable con el schema **previo** a la migración (sacado de `git show f515688^:…/shemema.txt`, que es el estado real de prod) y pasaron, incluido el desglose con descuento **y** recargo en la misma fila.
  - **Hallazgo que la Fase 8 tiene que resolver antes de emitir comprobantes de verdad:** el cambio de tipo de membresía **reescribe el pago original** —recalcula el monto según el plan nuevo y pone descuento y recargo en 0— conservando su `receipt_number`. Es comportamiento preexistente y documentado en el RPC, pero ahora esa fila lleva número de comprobante: un comprobante ya entregado al cliente puede dejar de coincidir con la fila que lo respalda. Hoy no afecta a nadie porque la UI que emite comprobantes todavía no existe. Decidir en la UI de la fase si un cambio de tipo **anula y reemite** o si directamente no debería tocar un pago ya comprobado.
  - **Un 405 no prueba que un endpoint esté apagado.** Verificando el gate del logger en el preview, pegar la URL en la barra del navegador devolvía 405 —el router de Next contestando "existe pero no con ese verbo", sin llegar a la guarda— que parece un gate roto y no lo era: el POST ya daba 404. Se agregó el handler de GET para que producción no anuncie la ruta, y quedó documentado el `curl` correcto en [dev-logging.md](../dev-logging.md). **Verificar un gate con el método equivocado no verifica nada.**
  - **El gate de un componente de dev tiene que estar en el import, no en el JSX.** `NODE_ENV === 'development' && <DevLogger />` con import estático evita que se monte pero **no que se bundlee**: el chunk del layout se llevaba el cuerpo entero, parche de `window.fetch` incluido. Con import dinámico detrás del ternario desaparece de todos los chunks. Verificado contra los 21 chunks que sirve producción, no sólo contra un build local.
  — Ema + Claude.
- 2026-09-22 — **Renovar por adelantado dejaba de registrar el cobro anterior. Arreglado y desplegado — v0.13.1.** PR [#61](https://github.com/EmaCrzz/actitud-bo/pull/61), ADR [20260922125530](../architecture/decisions/20260922125530_renovacion-anticipada-no-pisa-el-pago-anterior.md). Salió al planificar la UI de esta fase: un flow que emite comprobantes no se puede construir sobre un modelo donde un cobro sobrescribe a otro.
  - **El defecto, medido:** cobrar septiembre y después pagar octubre el 28/09 dejaba **una** fila de $20.000 fechada en octubre. Se cobraron $40.000 y la contabilidad registraba $20.000. El comprobante ya entregado quedaba apuntando a otra fila. Es de v1 y estaba en producción desde julio.
  - **Un proxy razonable puede ser exactamente incorrecto en el caso que no se pensó.** El criterio era "membresía vigente = mismo período", puesto en julio para frenar 9 filas duplicadas que inflaban los ingresos a $260.000. "Vigente" y "mismo período" coinciden en todos los casos que ese ADR tenía sobre la mesa, y dejan de coincidir en el único que no estaba.
  - **Leer por qué existe la regla cambió el arreglo.** La primera lectura fue "la idempotencia está mal, sacarla" — que habría reintroducido el bug de julio. El trabajo pasó de revertir a **afinar**: el criterio nuevo hace lo que aquel ADR quería decir.
  - **El riesgo estaba en dónde poner la condición, no en la condición.** Reescribir `v_can_update_current` era lo natural y habría roto el cambio de tipo sin pago, que usa esa misma variable y recibe `p_start_date = NULL`. El síntoma habría sido un cambio de plan que deja de reflejarse en el pago: silencioso y sólo visible en contabilidad.
  - **Medir el fallback antes de elegirlo.** El criterio depende de `start_date`, que el 90% de las filas activas no tiene (se agregó sin backfill). El `COALESCE` a `last_payment_date` cubre el 100% de las 96 membresías activas con pago vigente — pero una sola fila sin ninguno de los dos habría perdido la protección contra duplicados sin que nada fallara.
  - **No se reparó nada retroactivamente.** Hay una fila en prod con la firma de un pago pisado (creada el 07/08, hoy fechada el 07/09, $24.000), pero el `UPDATE` destruyó la evidencia del cobro original: no hay a qué volver.
  — Ema + Claude.
