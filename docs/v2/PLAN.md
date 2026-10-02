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
| 9 | Sección Asistencias | ✅ completa | Rama `feat/v2-asistencias`. ADR [20260926171200](../architecture/decisions/20260926171200_v2-seccion-asistencias.md). **Desktop con tabs, mobile sin ellos** — la divergencia es deliberada y está en el Figma. Sin migraciones. Primera fase que entrega con specs e2e. |
| 10 | Sección Membresías (planes y precios) | ✅ completa | Rama `feat/v2-membresias`. ADR [20260928112705](../architecture/decisions/20260928112705_v2-seccion-membresias-y-catalogo-de-planes.md). **Catálogo híbrido**: se crean planes y los 5 originales conservan su comportamiento especial. Vive en `/v2/settings/memberships`; se borró el stub de `/v2/memberships`. **Lleva migración aditiva** `20260928110544` (B6 cerrada). |
| 10b | Grupos de clientes (familiares) | ❌ **cancelada (2026-10-02)** | El grupo familiar pasa a ser **una promoción que se elige al cobrar**. Rama `feat/v2-descuento-por-promocion`, ADR [20261002120000](../architecture/decisions/20261002120000_grupo-familiar-como-promocion.md). El catálogo de promociones lo absorbe la Fase 14. Lo que sigue es el relevamiento original: **No estaba en el plan original**; capturas del 2026-09-29. El panel ya existe en v1 casi 1:1; lo nuevo es la tabla del listado. Relevada contra prod y **pausada a pedido de Ema** para revisarla con calma. Decidido: el descuento sólo se muestra, y eliminar pasa a baja lógica. Abierto: las columnas derivadas → [decisión #17](#decisiones-abiertas--riesgos). |
| 11 | Sección Gastos (crear/editar/eliminar) | ✅ completa · **en prod (v0.17.0)** | Rama `feat/v2-gastos`. ADR [20260930121500](../architecture/decisions/20260930121500_v2-seccion-gastos-y-medio-de-pago.md). **Lleva migración aditiva** `20260929104500` (B1 cerrada): `payment_method` **nullable, sin backfill** — decisión #8 resuelta midiendo prod (29 gastos) . De paso se arregló un bug que bloqueaba el **alta de cliente el último día de cada mes**. |
| 12 | Sección Ventas (cuotas + productos) | ✅ completa · **en prod (v0.18.0)** | Rama `feat/v2-ventas`. ADR [20261001100524](../architecture/decisions/20261001100524_v2-seccion-ventas.md). **Ventas es todo lo cobrado**: cuotas de `membership_payments` + productos de la tabla nueva `sales`, unidas al leer. Sin catálogo, sin stock, un producto por venta. **Lleva migración aditiva** `20261001100524` (A1 cerrada). Capturas versionadas en [figma/ventas/](figma/ventas/). |
| 13 | Balance | ✅ completa · **en prod (v0.19.0)** | Rama `feat/v2-balance`. ADR [20261001154047](../architecture/decisions/20261001154047_v2-balance.md). **Navegador de mes** en vez de rango; ingresos contra egresos en la evolución; desgloses de los dos lados que suman exactamente su total. **Cuadra con Ventas y Gastos por construcción** (spec e2e). Sin migraciones. Capturas en [figma/balance/](figma/balance/). |
| 14 | Configuración (Negocio / Membresías / Promociones / Usuarios) | ⬜ pendiente | Requiere tabla de settings del negocio. |
| 15 | Promoción de v2 a default + retiro de v1 | ⬜ pendiente | Fuera del alcance actual; se planifica cuando 3–14 estén cerradas. |

---

## Por dónde seguir

> Última actualización: **2026-10-02**. Esta sección es el arranque de cualquier sesión nueva: decí en qué estado quedó todo y cuál es el siguiente movimiento, sin tener que leer el documento entero.

**La promoción viajó a producción como v0.20.0 el 2026-10-02** (PR [#77](https://github.com/EmaCrzz/actitud-bo/pull/77)). Sin migraciones; prod sigue con 0 usuarios con `v2_access`, así que no cambia nada para quien usa v1.

**La Fase 10b se canceló el 2026-10-02: el grupo familiar es una promoción, no una entidad.** Rama `feat/v2-descuento-por-promocion`, ADR [20261002120000](../architecture/decisions/20261002120000_grupo-familiar-como-promocion.md). Medido prod, **no hay titular: hay un orden de pago**. El primero de la familia paga completo y los que pagan después tienen el descuento (31 de 34), casi siempre a minutos del primero. La sugerencia automática por grupo contradecía esa regla en ~45% de los cobros, y quien cobraba la corregía a mano. En v2 el panel de renovación ahora ofrece las reglas activas en el select **Promociones** del Figma, que arranca vacío, con nota opcional y excluyente con el descuento manual. **Sin migración**, y v1 queda como estaba.

**La Fase 12 (Ventas) se cerró el 2026-10-01** — rama `feat/v2-ventas`, ADR [20261001100524](../architecture/decisions/20261001100524_v2-seccion-ventas.md). La [decisión #5](#decisiones-abiertas--riesgos) la respondió Ema (sin stock, sin catálogo, editar y borrar como Gastos) y **las capturas cambiaron el alcance**: el panel "Nueva venta" ofrece `Membresía` al lado de `Producto`, así que **Ventas es todo lo que se cobra**. Las cuotas siguen en `membership_payments`, los productos van a `sales`, y la sección las une al leer — cada peso vive en una sola tabla. Ver [Fase 12](#fase-12--sección-ventas).

**La Fase 12 viajó a producción como v0.18.0 el 2026-10-01** (PR [#73](https://github.com/EmaCrzz/actitud-bo/pull/73)). La migración `20261001100524` se aplicó antes del release con el procedimiento completo, y la auditoría de integridad dio **idéntica antes y después**. Prod sigue con **0 usuarios con `v2_access`** —la tabla `user_feature_flags` está vacía—, así que la sección nueva viaja apagada.

**La Fase 13 (Balance) se cerró el 2026-10-01** — rama `feat/v2-balance`, ADR [20261001154047](../architecture/decisions/20261001154047_v2-balance.md). Ema la sentía vacía; medido prod, no le faltaban bloques sino que **le sobraban los que repetían Ventas**. Quedó como ingresos **contra** egresos: resultado del mes, evolución de los dos lados, ingresos por concepto (planes + productos), egresos por categoría, método de pago y descuentos/recargos. Navegador de mes en vez de los dos datepickers del diseño. **Sin migraciones.** Ver [Fase 13](#fase-13--balance).

**La Fase 13 viajó a producción como v0.19.0 el 2026-10-02** (PRs [#74](https://github.com/EmaCrzz/actitud-bo/pull/74) y [#75](https://github.com/EmaCrzz/actitud-bo/pull/75)). **Sin migraciones**: la última en prod sigue siendo `20261001100524`. Lo único que ve un operador de v1 es que **el balance de v1 (`getMonthlyStats`) ahora suma `sales`**; no debería cambiar ningún número, porque `sales` sólo se escribe desde v2 y nadie lo tiene habilitado (0 filas al migrar, no re-medido).

**El movimiento siguiente:** la [Fase 14](#fase-14--configuración), que ahora también es la casa del descuento familiar: el ABM de Promociones sobre `discount_rules`. Necesita `business_settings` y bucket de Storage para Negocio. ~~O la Fase 10b~~ → cancelada. Quedó **en espera hasta la Fase 15**, por decisión de Ema: el ciclo de cobro y la lista de pendientes de `/incomes` de v1, que no tienen lugar en v2 todavía.

---

**Las fases 0–13 están cerradas (la 10b, cancelada el 2026-10-02). Quedan dos: 14 Configuración y 15 promoción de v2.** De las pantallas de v2, **tres siguen siendo `UnderConstruction`** — las de `settings` (`business`, `promotions`, `users`); medido el 2026-10-01 con un grep sobre `v2/`.

**La Fase 10 se cerró el 2026-09-28** — rama `feat/v2-membresias`, ADR [20260928112705](../architecture/decisions/20260928112705_v2-seccion-membresias-y-catalogo-de-planes.md). La [decisión #7](#decisiones-abiertas--riesgos) terminó en **catálogo híbrido: se crean planes, y los 5 originales conservan su comportamiento especial**. Ver [Fase 10](#fase-10--sección-membresías-planes-y-precios).

> ⚠️ **Lleva migración aditiva `20260928110544`, que va a prod ANTES del release.** Agrega `name`, `weekly_quota` y `active`; y de paso cierra dos cosas que estaban mal desde antes: el INSERT en `types_memberships` estaba abierto a cualquier `authenticated`, y la FK de `customer_membership.membership_type` tenía **`ON DELETE CASCADE`** — borrar un plan borraba la membresía de todos sus clientes.

**Apareció una fase que no estaba en el plan: la [10b, Grupos de clientes](#fase-10b--grupos-de-clientes-familiares).** Ema aportó 3 capturas el 2026-09-29 y pidió volver a ella antes de la Fase 13. **Está relevada a fondo y pausada a pedido suyo** —*"esto está demasiado amañado, luego lo reviso con más atención"*— así que al retomar **no hay que medir nada de nuevo**: la sección tiene el inventario de v1, los números de prod y los hallazgos. Lo único que falta es responder la [decisión #17](#decisiones-abiertas--riesgos) (qué muestran las columnas `Tipo de plan` / `Vencimiento` / `Estado` cuando los integrantes no coinciden) y confirmar el entrypoint de creación, que no aparece en ninguna captura.

**La Fase 11 viajó a producción como v0.17.0 el 2026-09-30.** La migración se aplicó antes del release siguiendo el procedimiento completo, y la auditoría de integridad dio **idéntica antes y después**. Prod sigue con **0 usuarios con `v2_access`**, así que toda la UI de v2 —incluida la sección nueva y el cambio del AppShell— viaja apagada.

**La Fase 11 (Gastos) se cerró el 2026-09-30** — rama `feat/v2-gastos`, ADR [20260930121500](../architecture/decisions/20260930121500_v2-seccion-gastos-y-medio-de-pago.md). La [decisión #8](#decisiones-abiertas--riesgos) se resolvió midiendo prod: son **29 gastos**, así que quedan como "sin especificar" y la columna es nullable. Ver [Fase 11](#fase-11--sección-gastos).

> ⚠️ **Lleva migración aditiva `20260929104500`, que va a prod ANTES del release.**

~~**El movimiento siguiente es la Fase 12 (Ventas), y sigue bloqueada** por la decisión #5.~~ → ✅ destrabada y cerrada el 2026-10-01, ver arriba.

---

**Dónde estamos: la Fase 8 está cerrada y desplegada.** Las fundaciones (modelo de precio, recargo explícito, número de comprobante) viajaron en **v0.13.0/v0.13.1**; el panel de renovación en el PR [#62](https://github.com/EmaCrzz/actitud-bo/pull/62); el comprobante compartible y el cobro desde el home en el [#63](https://github.com/EmaCrzz/actitud-bo/pull/63). **Ninguno de los dos PRs de UI llevó migraciones.** Ver [Fase 8](#fase-8--registrar-pago--renovar-membresía--comprobante).

**El issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59) se cerró el 2026-09-25** (PR [#64](https://github.com/EmaCrzz/actitud-bo/pull/64)). `membership_payments` tiene ahora dos fechas: `payment_date` (cuándo entró la plata, la fecha contable) y `period_start` (qué período cubre la cuota). Se aplicó el criterio de caja. Los totales de prod se movieron —junio 2026 quedó en $0 y sus $78.000 pasaron a julio— y el detalle con la medición antes/después está en el ADR [20260925103921](../architecture/decisions/20260925103921_payment-date-criterio-de-caja.md). Es reversible: el valor viejo quedó guardado en `period_start`.

**La Fase 9 (Asistencias) se cerró el 2026-09-26** — rama `feat/v2-asistencias`, ADR [20260926171200](../architecture/decisions/20260926171200_v2-seccion-asistencias.md), sin migraciones. La pregunta de los tabs se respondió mirando las capturas: **desktop lleva `Registro diario` / `Historial` y mobile no lleva ninguno**, y la divergencia es deliberada. Ver [Fase 9](#fase-9--sección-asistencias).

**Desde el 2026-09-26 el repo tiene suite e2e con Playwright** (PRs [#65](https://github.com/EmaCrzz/actitud-bo/pull/65), [#66](https://github.com/EmaCrzz/actitud-bo/pull/66), [#67](https://github.com/EmaCrzz/actitud-bo/pull/67); ADR [20260926131436](../architecture/decisions/20260926131436_suite-e2e-playwright-para-v2.md)). **Toda fase nueva suma su spec** — la 9 fue la primera. Lo que la suite cambia para este plan: la línea "Riesgo timezone" de cada fase deja de auditarse sólo leyendo código y pasa a tener verificación ejecutable contra la DB (`e2e/support/db.ts` + `toAppTzIsoDate`), que es la única forma de detectar el bug que no se ve en pantalla.

**Y desde el 2026-09-26 también tiene unit tests con Vitest** (PR [#69](https://github.com/EmaCrzz/actitud-bo/pull/69), ADR [20260926164830](../architecture/decisions/20260926164830_unit-tests-para-la-logica-de-negocio.md)). **60 tests en 60ms** sobre la política de cobro, la sugerencia de precio y los helpers de timezone — la lógica donde vive el riesgo real y que no tenía una sola verificación. Corren con `npm run test`, sin DB, sin secrets y sin dejar residuo, así que son lo primero que debería ir a CI si alguna vez se monta. **La división de trabajo entre las dos suites:** Vitest fija las reglas de negocio (que el día 11 cobre recargo), Playwright verifica que la pantalla las ejecute y que la fecha aterrice bien en la DB.

**Lo que cambió el diseño el 2026-09-22:** el paso 1 ahora tiene los **dos datepickers** (inicio y vencimiento), que antes no estaban. El panel los muestra con prefill derivado — inicio = día siguiente al vencimiento vigente, o hoy si ya venció — y con eso la renovación anticipada arranca sola en el período correcto.

**Estado de entornos — todo desplegado, `main` y `develop` emparejados.** Producción corre **v0.19.0** (release del 2026-10-02), que llevó la Fase 13. El historial de releases está en [Cambios registrados](#cambios-registrados). Prod sigue con **0 usuarios con `v2_access`**, así que toda la UI de v2 viaja apagada.

**Migraciones: al día.** La última aplicada en prod es `20261001100524` (Fase 12), y dev está emparejado. Se aplicó **antes** del release, con ensayo transaccional previo y auditoría de integridad antes y después: **idéntica**, no se movió ningún dato.

**Lo que un operador de v1 ve de estas dos versiones: nada nuevo.** De la v0.15.0, refactors que preservan comportamiento en `/assistances`. De la v0.16.0, los ~20 call sites de etiquetas de membresía migrados al resolver —misma variante de copy en todos— más tres arreglos que no cambian nada visible hasta que alguien cree un plan: la FK que pasó de `CASCADE` a `RESTRICT`, el INSERT admin-only y el trigger de `last_update`. **Cubierto por el smoke de v1** que la fase agregó.

> **Al abrir `/incomes` desde el release v0.14.0, junio 2026 muestra $0.** Es la reatribución del #59, no una pérdida: los 4 pagos de junio se habían cargado en julio y ahora se cuentan ahí. Sus cuotas siguen existiendo en `period_start`. Está en el ADR, pero conviene tenerlo a mano porque es lo primero que llama la atención en el dashboard.

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

**Pendiente con el diseñador:** el copy *"Aun"* sin tilde y las barras horizontales del home mobile ([decisión #18](#decisiones-abiertas--riesgos)), las **tres divergencias deliberadas** que introdujo la Fase 7 contra el Figma (no existe "Sin membresía" en el select; "Modalidad de cobro" y "Forma de pago" desaparecen con VIP; "Modalidad de cobro" desaparece con Diaria), y los **seis defectos de las capturas de renovación** del 2026-09-21 — incluido que el ícono de Compartir dice PDF y se va a implementar como imagen. Lista completa en [Fase 8](#defectos-del-diseño-detectados-en-las-capturas-del-2026-09-21).

**Follow-ups anotados el 2026-10-02** (Ema, al probar la promoción del PR [#77](https://github.com/EmaCrzz/actitud-bo/pull/77)). El 1 se resolvió en la rama `fix/v2-ver-perfil-desde-asistencia` (PR [#78](https://github.com/EmaCrzz/actitud-bo/pull/78)) y el 2 en `feat/v2-aviso-medio-mes`; el resto no está empezado:

1. ~~**"Ver perfil" del modal de asistencia del home lleva a v1.**~~ → ✅ **resuelto** (`fix/v2-ver-perfil-desde-asistencia`). "Ver perfil" ahora **reemplaza** el modal por el perfil de v2 sin salir del home, y "Renovar" desde el perfil abre la renovación ahí mismo. Es el patrón de Clientes, y el camino que ya pedía el aviso de membresía vencida ("entrá al perfil del cliente"). Al revisar el flow entero apareció un segundo defecto, que se arregló en el mismo PR: **si fallaba la lectura de datos, el modal mostraba "Sin membresía"** de alguien que la tiene, o dejaba el skeleton girando para siempre. Ahora muestra el error y deja registrar igual. Queda un cosmético: el mes de la sección "Asistencia" se formatea con `'es-AR'` fijo en vez del i18n.
2. ✅ **Resuelto** (`feat/v2-aviso-medio-mes`): `isHalfMonthOutsidePolicy` en [pricing.ts](../../src/membership/pricing.ts) más el componente `HalfMonthWarning`, en la renovación **y en el alta**, que tenía el mismo problema. Informa y no bloquea. ~~**Medio mes elegido antes del 16: avisar, no corregir.**~~ Hoy se puede elegir "Medio mes" con inicio el 02/10, y el período queda hasta el 31/10 a mitad de precio. En prod pasó una vez desde julio (inicio 10/09, 1 de 4 pagos a precio de medio mes, sobre 303 cuotas); no se sabe si fue excepción pactada o error. Propuesta: un aviso que no bloquea cuando la modalidad contradice la política ("cubre hasta el 31/10 a mitad de precio"), con el umbral sacado de `halfMonthStart` en [billing-policy.ts](../../src/accounting/billing-policy.ts). No recortar fechas automáticamente: la app estaría adivinando si quiso decir "del 2 al 15" o un precio especial. Mismo criterio de "sugerir sin imponer" del 2026-09-21.
3. **VIP ignora el precio que tenga cargado.** Desde la Fase 10 los planes son configurables, pero "VIP no se cobra" sigue atado a la clave literal (`MEMBERSHIP_TYPE_VIP` aparece en ~57 lugares de `src/`): si alguien le carga un precio al VIP, el formulario lo ignora. Es la ramificación que la [decisión #7](#decisiones-abiertas--riesgos) dejó "deliberadamente sin resolver": mover "si se cobra" a una columna (`is_chargeable`) o derivarlo del precio, y que el SQL del RPC la lea en vez de comparar la clave. Fase propia, con migración.
4. **Medio mes como concepto opcional, no de fábrica.** La mayoría de los gimnasios cobra el mes entero; la media membresía es una regla de Actitud. La app debería poder **no proponer** el concepto si el negocio no lo configuró. Lo que ya existe: `getPeriodModeOptions` sólo ofrece "Medio mes" si el plan tiene `middle_amount`, y `halfMonthStart` está en la política con nombre semántico. Lo que falta:
   - **Bug latente, mismo origen:** el formulario de planes guarda `middle_amount` tal cual, y un campo vacío queda en **0**, no en NULL ([PlanFormPanel.tsx](../../src/membership/components/v2/PlanFormPanel.tsx), decisión deliberada por el VIP). `getPeriodModeOptions` filtra `!== null`, así que **un plan nuevo sin precio de medio mes ofrecería "Medio mes - $0"**. Hoy no hay planes creados desde la UI en prod (0 filas con `name`), así que no afectó a nadie.
   - Un interruptor a nivel negocio ("¿cobrás media membresía?") que apague a la vez la modalidad, la sugerencia de `getSuggestedCharge` y el campo del formulario de planes. Su lugar natural es `business_settings` de la [Fase 14](#fase-14--configuración), y se cruza con el ítem 3: los dos son "comportamiento que hoy está atado a Actitud y debería ser configuración".

**Deuda conocida que quedó anotada, no resuelta:**

- **B5 (DNI sin UNIQUE)** sigue abierta y sigue necesitando PR propio: 8 pares duplicados en prod que requieren criterio caso por caso — uno son dos personas distintas con un DNI mal tipeado.
- **Un no-admin puede crear un cliente VIP llamando al RPC directo.** El form lo filtra client-side, pero `upsert_customer_with_membership` no valida el rol (el RPC de pago sí, y un alta VIP no pasa por él). Ver "Consideraciones de seguridad" del ADR de la Fase 7.
- **⚠️ El cambio de tipo de membresía reescribe un pago ya comprobado.** Recalcula el monto según el plan nuevo y pone descuento y recargo en 0, conservando el `receipt_number`. Es comportamiento deliberado del ADR [20260707114541](../architecture/decisions/20260707114541_prevent-duplicate-membership-payments-and-type-changes.md), pero ahora esa fila lleva número de comprobante: **un comprobante entregado al cliente puede dejar de coincidir con la fila que lo respalda**. Hoy no afecta a nadie porque la UI que los emite todavía no existe. Decidir en la UI de la Fase 8 si un cambio de tipo **anula y reemite** o si directamente no debería tocar un pago ya comprobado. *(El caso hermano —renovar por adelantado— se cerró el 2026-09-22, ver ADR [20260922125530](../architecture/decisions/20260922125530_renovacion-anticipada-no-pisa-el-pago-anterior.md).)*
- ~~**`membership_payments.payment_date` recibe el inicio del período**~~ — issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59). ✅ **Cerrado el 2026-09-25** (migración `20260925103921`, ADR [20260925103921](../architecture/decisions/20260925103921_payment-date-criterio-de-caja.md)). La tabla tiene ahora dos fechas: `payment_date` = cuándo entró la plata (la contable) y `period_start` = qué período cubre la cuota. Se aplicó **criterio de caja**: todo lo que suma plata agrupa por `payment_date`; las dos preguntas de cobranza —el ciclo del mes y la lista de pendientes— agrupan por `period_start`. El backfill salió de `created_at`, que guardaba el momento real del cobro desde siempre, y es reversible porque el valor viejo quedó en `period_start`. **Efecto en prod:** junio 2026 pasó de $78.000 a $0 (sus 4 pagos se cargaron en julio), julio +$37.000, agosto +$41.000. De yapa se corrigieron dos conteos de la fase grace/recargo que venían mal: la renovación anticipada y el alta de mitad de mes.
- **`POST /api/accounting/payments` está roto y nadie lo nota**, hallazgo del 2026-09-21. `CreateMembershipPaymentData` no incluye `gross_amount` —`NOT NULL` sin default desde la migración de descuentos (`20260722120000`)— ni `period_start`, que desde `20260925103921` es `NOT NULL` por el mismo motivo. Son **dos** columnas faltantes, así que el insert falla siempre. No lo alcanza ninguna UI: el `createMembershipPayment` de [accounting/api/client.ts](../../src/accounting/api/client.ts) no tiene llamadores. Es un endpoint muerto que parece vivo — o se completa el tipo con el desglose (`gross_amount`, `discount_amount`, `surcharge_amount`, `period_start`) o se borra. **No se tocó ni en la Fase 8 ni en el #59** para no mezclarlo con cambios de precio y de fechas.
- **`last_payment_date` todavía recibe la fecha de inicio** en las altas sin cobro. Con `start_date` ya escrito, la limpieza es migrar los lectores restantes a `getMembershipPeriodStart()` — entre ellos [membership-form.tsx](../../src/customer/membership-form.tsx), que lo usa como `defaultValue` del datepicker de inicio.

---

## Contexto

Actitud BO es hoy una PWA mobile-first sin diseño desktop. El rediseño completo vive en Figma y ya cubre **17 flows** en wireframes desktop de 1280×832. La v1 debe seguir disponible en producción todo el tiempo; la v2 se construye bajo `/[lang]/[tenant]/v2/*`, gateada por el feature flag `v2_access` por usuario.

**Qué introduce la v2:**

- **Layout desktop + mobile responsive.** Desktop: sidebar navegable de 255px (colapsable a 64px) + header + main como cards individuales. Mobile: shell con Sheet drawer.
- **Design system consolidado** — tokens tipo shadcn scopeados bajo `[data-v2='true']`, compatibles con el theming CSS-vars actual.
- **Cobertura funcional mayor que la v1** — la v1 no tiene Ventas, Balance ni Configuración de negocio. La v2 los introduce, y algunos requieren modelo de datos nuevo.

**Multitenant:** la app es tenant-configurable en build (env `TENANT`, temas y fuentes por tenant en [src/lib/themes/](../../src/lib/themes/)). La v2 hereda esto tal cual. Migrar la DB a multi-tenant en runtime (RLS por `tenant_id`) es una tarea aparte que no bloquea este plan.

**No hacemos ahora:** RLS por tenant en DB, i18n adicional (queda `es` como único idioma). ~~Tests automatizados~~ → hay Playwright y Vitest desde el 2026-09-26.

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
| **Asistencias** | Tabs `Registro diario` / `Historial`; el navegador de día vive **dentro del card** en Historial (`2118:28921`, `2118:28933`) | **Sin Tabs.** Navegador de día siempre presente y **fuera** del card (`2228:48632`) | ✅ Fase 9 cerrada: **divergencia deliberada**, se construyó así |
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

#### A1. Ventas / productos — ✅ **cerrada** (Fase 12, 2026-10-01)

Se cerró con **una** tabla, no tres: sin stock, sin catálogo y con un producto por venta, `products` y `sale_items` no hacen falta. La tabla `sales` guarda sólo los productos; las cuotas siguen en `membership_payments` y la sección Ventas une las dos al leer. Migración `20261001100524`, ADR [20261001100524](../architecture/decisions/20261001100524_v2-seccion-ventas.md).

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
| Fecha de inicio | `start_date` + `last_payment_date` + `period_start` (`timestamptz`) | `parseAppTzDateString` |
| Fecha de vencimiento | `expiration_date` (`timestamptz`) | `parseAppTzDateString` |

> **Corregido el 2026-09-25 (issue #59).** La fila del medio decía `payment_date` en vez de `period_start`, y era precisamente el defecto: el datepicker de inicio escribía en la columna de la fecha de cobro. Hoy `payment_date` **no sale de ningún datepicker** — lo escribe el RPC con `now()`, así que no se canonicaliza ni se alinea a medianoche AR: es un instante, no un día.

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

El comprobante muestra `Fecha: 10/08/2026` sobre un período de agosto (01/08 → 31/08): o sea pide **la fecha de cobro**, distinta del inicio del período. Cuando se construyó la Fase 8 el RPC escribía `payment_date = p_start_date` (issue [#59](https://github.com/EmaCrzz/actitud-bo/issues/59)), así que esa fecha no estaba en `payment_date` — pero sí en `created_at`. El comprobante terminó usando **el día de emisión** (`getTodayIsoDateInAppTz()`), que para un cobro recién registrado es lo mismo, porque `membership_payments` es admin-only por RLS y el operador no puede leer la fila que acaba de crear.

> **Desde el 2026-09-25** el #59 está cerrado y `payment_date` ya es la fecha de cobro, así que la pantalla que reimprima un comprobante viejo —el tab Pagos del perfil, que es admin-only— puede leerla directo de la columna. El comprobante recién emitido se queda como está: no necesita una consulta que la RLS le negaría.

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

**Riesgo timezone:** **el más alto de todo el plan.** `payment_date` determina el mes contable y `period_start`, vía `getCyclePhaseForPayment`, si el pago entró en mora. Un desfase de 3 horas el día 10 a las 22hs clasifica un pago puntual como atrasado. Este es exactamente el bug que ya pasó dos veces (ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md)). **Auditar cada call site nuevo, sin excepción.**

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

**Estado:** ✅ completa — ADR [20260926171200](../architecture/decisions/20260926171200_v2-seccion-asistencias.md)
**Figma:** desktop `2167:22904` (2 pantallas) · **mobile `2228:49268` (2 pantallas)**. Verificado con capturas que pasó Ema el 2026-09-26.

> ✅ **La "divergencia de navegación" quedó resuelta: es deliberada.** Desktop tiene tabs **`Registro diario` / `Historial`**; mobile no tiene ninguno y muestra el navegador de día siempre. Se construyó así.
>
> La pregunta del plan estaba **mal planteada**: decía "los tabs son probablemente Hoy/Historial" a partir del árbol de nodos, que lista el `Tabs` pero no dice qué dice. Las capturas mostraron los nombres reales y que la segunda pantalla desktop no reemplaza el título por el navegador — lo mete **dentro del card**, a la izquierda del contador.
>
> Tercera vez que una inferencia del árbol de nodos resulta falsa (antes: el "dropdown de acciones de fila" de la 6b y la premisa de la decisión #5). **El árbol dice qué instancias hay, no qué hacen.**

### Cómo quedó

**Desktop** — tabs arriba del card. *Registro diario*: header `Asistencias del día` + el contador suelto a la derecha, sin navegador. *Historial*: el navegador de día ocupa el lugar del título, con el contador a la derecha.

**Mobile** — sin tabs: `← Asistencias`, el navegador de día full-width siempre visible, y el card con `Total de asistencias: N` inline (no hay título de card al lado que le dé contexto al número).

**La fila** — avatar con iniciales + nombre + plan de membresía + **la hora donde el resto de las listas del rediseño lleva un badge de estado**. Es lo que dibuja el diseño y tiene sentido: en la lista de un día puntual se consulta a qué hora entró alguien. Se pierde el ranking numerado de v1, que era el índice del array.

### Lo que la maqueta tenía de relleno

Conviene dejarlo escrito para que nadie lo lea como requisito: el contador decía 12 y 20 sobre **las mismas 8 filas**; todas las filas decían `08:14`, lo que hacía que el orden se viera alfabético sin serlo; y "Hoy" y "Ayer" listaban a las mismas 8 personas. El orden quedó por **hora descendente**, como v1 — en el mostrador lo útil es quién entró recién.

También: el sidebar de las dos capturas desktop marca **`Inicio`** activo, no `Asistencias`, aunque el ítem exista. Se implementó marcando `Asistencias`. Anotado para el diseñador.

### Decisiones que el diseño no cubría

- **El tab Historial tope en ayer.** La maqueta abre en "Ayer" y no dice qué pasa si se navega hacia adelante; llegar a hoy mostraría la misma lista que *Registro diario* con el tab equivocado subrayado.
- **El tab se deriva de la URL, no es estado local.** `/v2/attendance` = *Registro diario*; `?date=YYYY-MM-DD` = *Historial*. `?date=` apuntando a hoy **redirige** a la ruta pelada, conservando `q` y `page`. Mismo criterio que el ADR [20260727141418](../architecture/decisions/20260727141418_tab-en-url-para-listado-clientes-y-grupos.md).
- **Búsqueda (`?q=`) y página (`?page=`) también van en la URL**, con `history.replaceState` — igual que el listado de clientes. La vista es compartible y sobrevive a F5 y al botón atrás, y el filtrado sigue siendo client-side: la URL refleja el estado, no dispara consulta.
- **Estados vacío / cargando / error definidos acá** — la anotación `2118:29353` ("Ver estados del historial") lo anticipaba. El vacío tiene copy distinto para hoy ("todavía no vino nadie") y para un día pasado ("ese día no se registró ninguna asistencia").
- **Sin asistencias no se muestra el contador.** El diseño lo dibuja siempre, pero su maqueta nunca tiene la lista vacía: un `0` con énfasis de métrica al lado de "Sin asistencias registradas" repite el dato. En desktop desaparece sólo el número; en mobile, la banda entera (el total era su único contenido).
- **El contador lleva label visible** (`Total 12` / `Resultados 3`), divergiendo del Figma, que dibuja el número suelto. Esa maqueta tenía un solo valor posible; con el buscador el número alterna entre el total del día y los resultados, y sin label no se sabe cuál se está leyendo. El énfasis tipográfico del número se conserva.
- **Paginación de 10 y buscador por nombre**, ninguno de los dos en el Figma — pedidos por Ema durante la implementación. El diseño dibuja la lista entera sin controles, lo que funciona con las 8 filas de la maqueta y no con un sábado real. **El buscador aparece sólo si el día tuvo asistencias**, y la condición mira el total del día y no los resultados: así una búsqueda sin coincidencias no hace desaparecer el campo con el que se escribió. **Todo el filtrado es client-side** — la página ya trae el día entero, así que buscar y paginar no vuelven al server.
- **La ventana sigue en 14 días hacia atrás**, igual que v1.

### Qué se construyó

- `AttendanceSection.tsx` (tabs + orquestación), `AttendanceList.tsx`, `DateNavigation.tsx` en `src/assistance/components/v2/`.
- [src/assistance/date-range.ts](../../src/assistance/date-range.ts) — validación del `?date=` **compartida con la pantalla de v1**, que la tenía como función local. Rechaza formato inválido, días inexistentes (`2026-02-31`), futuro y fuera de ventana.
- `getAssistancesByDateResult` en [api/server.ts](../../src/assistance/api/server.ts) — informa si la consulta falló. `getAssistancesByDate` quedó como wrapper que descarta el error, que es lo que v1 ya hacía. **Un solo query, no dos copias.**
- El `select` extendido con `customer_membership (membership_type)`: la línea secundaria de la fila no se estaba trayendo.
- El `href` del card "Asistencias de hoy" del home, que **no lo tenía** — sólo lo tenía el de clientes.

**Brechas de DB:** ninguna. Sin migraciones.

**Riesgo timezone:** era el alto de la fase y está auditado call-site por call-site en el ADR. El punto crítico es `parseAppTzDateString(selectedDate)` en la page: `new Date(iso)` lo leería como medianoche UTC, que en AR son las 21hs del día anterior. **No se escribe ninguna fecha: la sección es de sólo lectura.**

**Definición de hecho:**
- [x] Tabs Registro diario / Historial con navegación por fecha *(desktop; mobile sin tabs, deliberado)*
- [x] Lista con estados vacío/cargando/error, definidos y documentados acá
- [x] Link desde el card del home funciona
- [x] Auditoría de timezone documentada en el ADR
- [x] **Specs e2e** — la asistencia aparece en el día correcto (verificado contra la DB), el contador coincide, el tope del Historial, el 404 de fecha imposible y el redirect canónico

**ADR:** sí. El plan decía "probablemente no si es sólo port de UI", pero aparecieron tres decisiones de diseño que el Figma no resolvía.

---

## Fase 10 — Sección Membresías (planes y precios)

**Estado:** ✅ completa — ADR [20260928112705](../architecture/decisions/20260928112705_v2-seccion-membresias-y-catalogo-de-planes.md)
**Figma:** desktop `2167:22905` (4 pantallas) · **mobile `2265:69683` (3 pantallas)**. Verificado con capturas que pasó Ema el 2026-09-28.

> ✅ **La decisión #7 se cerró en catálogo híbrido: se crean planes, y los 5 originales conservan su comportamiento especial.**
>
> **La pregunta se respondió dos veces y la segunda invirtió la primera.** El primer cierre, sin las capturas, concluyó "la fase no crea planes" a partir de un inventario del código: la clave del tipo gobierna el cupo semanal, si el plan se cobra, si tiene modalidades y tres ramas del RPC escritas en SQL. Las capturas mostraron `Nueva membresía`, dos planes que no existen en el catálogo (`Plan familiar 5 días`, `Plan familiar 3 días`) y —lo decisivo— **el campo "Frecuencia de días" ya en el formulario**, que es la columna `weekly_quota` que el primer cierre proponía como fase previa.
>
> Con eso el argumento se da vuelta: las cuatro ramificaciones son excepciones de **VIP y Diaria**, dos planes que ya existen y de los que nadie va a crear más. Un plan nuevo es ordinario y cae en la rama por defecto en todos lados.
>
> **Cuarta vez en este plan que una inferencia sin la captura resulta falsa** — antes: el "dropdown de acciones de fila" de la 6b, la premisa de la decisión #5 y los tabs de la 9. La diferencia es que acá no fue leer mal el árbol de nodos: fue **razonar sobre el alcance de una pantalla sin haberla visto**. El inventario igual sirvió: sus cuatro hallazgos definieron la forma del catálogo híbrido.

### Cómo quedó

**Ruta: `/v2/settings/memberships`.** Había stub en esa ruta *y* en `/v2/memberships`, con ítem de primer nivel en el sidebar. Las capturas la ponen bajo Configuraciones y su sidebar no dibuja `Membresías` en el primer nivel, así que se borró el stub duplicado, el ítem y la constante `V2_MEMBERSHIPS`.

**Desktop** — card con título, resumen `N planes activos — N inactivos`, botón `Nueva membresía` a la derecha, y tabla de 5 columnas: Membresía / Precios / Frecuencia / Total clientes / Estado, con chevron por fila. Paginador de 10 al pie.

**El VIP se muestra como `Sin costo`, y eso salió de medir la DB.** Está cargado con `amount = 0`, no con NULL — así que la primera versión, que comparaba contra NULL, le habría puesto `$ 0`. Por el mismo motivo los precios se guardan tal cual se tipean: convertir 0 → NULL lo habría sacado del listado de precios de v1, que filtra por `amount IS NOT NULL`.

**Mobile** — sin tabla: filas con nombre, badge de estado, cantidad de clientes y precio, y el botón `Nueva membresía` como CTA al pie (`2246:49888`).

**Los dos paneles son uno solo.** Crear y editar difieren en un campo: al crear se pide el nombre, al editar se muestra fijo como encabezado del card. Dos componentes que difieren en un campo divergen apenas alguien toque uno.

### Decisiones que el diseño no cubría

- **El campo Estado se agregó al formulario**, que el Figma no dibuja aunque la tabla muestre la columna. Criterio de Ema: asumir que el diseñador lo va a sumar. Sin él un plan se podría crear pero nunca discontinuar.
- **El nombre de los 5 planes originales no se puede editar.** Su etiqueta vive en el diccionario i18n, no en la fila: renombrarlos desde la UI los cambiaría en un idioma y los dejaría intactos en el otro.
- **Discontinuar es `active = false`; no hay botón de eliminar.** Un plan inactivo desaparece de los selects de alta y renovación y se sigue mostrando en los clientes que ya lo tienen. La sección es la única pantalla que lista inactivos, porque es donde se reactivan.
- **Un precio en 0 se guarda como NULL** y la tabla lo muestra como `Sin costo`. Es lo que hace que el VIP no se cobre; un 0 literal sería un plan que se cobra a cero.
- **La clave del plan se deriva del nombre** (`Plan familiar 5 días` → `PLAN_FAMILIAR_5_DIAS`). El form pide un nombre porque lo usa el dueño del gimnasio. Dos nombres pueden colapsar en la misma clave: lo frena el `UNIQUE` que `type` ya tenía, y el error llega como frase, no como código de Postgres.

### Defectos del diseño — avisar al diseñador

- **Dos campos "Precio base" en el panel de editar**: uno full-width arriba ($18.000) y otro abajo ($9.000). En `Nueva membresía` ese lugar lo ocupa el nombre del plan, así que probablemente sea eso.
- **Concordancia de número**: `1 Plan inactivos` y `1 días/ semana`. Implementado con singular propio.
- **`Ultima actualización`** sin tilde.
- **Los conteos no cierran**: dice `7 activos — 1 inactivo` pero la tabla muestra 7 filas todas activas y el pie dice `7 planes`. **Nunca se ve cómo se ve un plan inactivo.**
- **El paginador dibuja 3 páginas para 7 planes**, con la página 2 activa. Relleno.
- **Los precios del formulario son incoherentes**: medio mes ($21.000) sale más caro que el precio base ($9.000), y el recargo es igual al base.
- **El sidebar de las capturas tiene 3 sub-ítems de Configuraciones** (Negocio, Membresías, Promociones) y no dibuja `Usuarios`. No se tocó — cruza con la [decisión #1](#decisiones-abiertas--riesgos) y se resuelve en la Fase 14.

### Qué se construyó

- [src/membership/catalog.ts](../../src/membership/catalog.ts) — `isCatalogMembershipType`, `getMembershipLabel`, `getWeeklySlots`, `membershipTypeKeyFromName`. **Evita abrir `MembershipTypes` a `string`, que son 79 usos en 26 archivos**, la mitad en v1.
- `MembershipPlansSection.tsx` y `PlanFormPanel.tsx` en `src/membership/components/v2/`.
- `getMembershipPlans` (con el conteo de clientes por plan), `createMembershipPlan`, `updateMembershipPlan`, y `includeUnpriced` / `includeInactive` en `getMembershipTypes`.
- `MEMBERSHIP_TYPE_COLUMNS` en consts: la lista de columnas estaba repetida en cuatro queries.
- **Tres call sites que duplicaban la lógica de fallback, unificados.** `formatMembershipLabel` y `AssistanceModal` lo tenían escrito a mano de dos formas distintas; **`CustomerCounter` no lo tenía** — un mapa duplicado de `SLOTS_BY_TYPE` que devolvía `undefined` y renderizaba **cero casilleros de asistencia sin ningún error**.

**Brechas de DB:** B6 cerrada. Migración **aditiva** `20260928110544` — `name`, `weekly_quota`, `active`, backfill del cupo, trigger de `last_update`. Va a prod **antes** del release.

**Dos defectos preexistentes que se arreglaron de paso:**

- **El INSERT en `types_memberships` queda admin-only, y el punto de partida difería entre entornos.** En **dev** no había ninguna policy de INSERT (verificado: el bloque que las dropea no emitió NOTICE), y sin policy RLS deniega — o sea que ahí la migración *habilita* la creación. En **prod** el comentario de `20260630180001` dice que existía una abierta a cualquier `authenticated`, en cuyo caso la migración *cierra* un hueco. **Confirmar prod antes del `db:push-prod`.**
- **`customer_membership.membership_type` tenía `ON DELETE CASCADE`.** Borrar un plan **borraba la membresía de todos sus clientes** — la policy de DELETE existe y es admin-only, así que un admin lo podía hacer desde la API. Pasa a `RESTRICT`. `ON DELETE CASCADE` en una FK a tabla de catálogo es casi siempre un copy/paste de la FK de al lado.

**`last_update` mostraba la fecha de creación, no la del último cambio.** Es `DEFAULT now()`, que sólo dispara en el INSERT, y `updateMembershipPrices` nunca la escribía — así que tanto la tabla de v1 como el panel del rediseño la rotulaban mal. Se arregla con trigger y no pidiéndole a cada caller que la escriba.

**Riesgo timezone:** bajo, y sin fechas nuevas. `last_update` lo escribe el trigger con `now()` del server, que es un instante y no una fecha de calendario.

**Definición de hecho:**
- [x] Listado de planes con precios (normal / recargo / media), frecuencia, clientes y estado
- [x] Crear y editar plan
- [x] Discontinuar y reactivar sin romper el histórico
- [x] Un plan discontinuado desaparece de los selects de alta y renovación, y sigue en los clientes que ya lo tienen
- [x] Resuelto el conflicto tipos-hardcodeados vs CRUD dinámico
- [x] Confirmación + refresh
- [x] **24 unit tests** de los resolvers, validados por mutación, y **5 specs e2e** con verificación contra la DB

## Fase 10b — Grupos de clientes (familiares)

**Estado:** ❌ **cancelada el 2026-10-02** · ADR [20261002120000](../architecture/decisions/20261002120000_grupo-familiar-como-promocion.md) · **no estaba en el plan original**

> **Por qué se canceló.** Al retomarla quedaron dos preguntas sin respuesta: quién es el titular, y qué pasa con el grupo cuando un integrante vence y no vuelve. Medido prod el 2026-10-02, **la regla real no usa titular**: en cada grupo y mes, el primero en pagar paga completo (3 descuentos de 28) y los siguientes tienen el descuento (31 de 34), y 25 de esos 34 pagaron a menos de diez minutos del primero. Quien paga solo nunca lo tuvo (0 de 5). La sugerencia por grupo de v1/v2 contradecía eso en ~30 de 67 cobranzas. Se compararon tres modelos —grupos como entidad, planes paralelos "familiares" y descuento con motivo al cobrar— y se eligió el tercero: **el grupo familiar es una promoción del catálogo**, que quien cobra elige en el select Promociones del panel de renovación. Así no hace falta titular, ni derivar columnas (la #17), ni baja lógica (B15), ni B14. Detalle y números en el ADR.
>
> Lo que sigue es el relevamiento del 2026-09-29, que queda como historia.
**Figma:** sin nodos — 3 capturas aportadas por Ema el 2026-09-29 (listado con tab `Grupos`, panel de grupo, diálogo de eliminación). Mobile: *"el mismo patrón que en el resto de la app"*.

> **Por qué existe esta fase.** Grupos familiares figuraba en la [Fase 15](#fase-15--promoción-de-v2-a-default) como deuda de paridad a auditar recién al final. Las capturas la adelantan: el rediseño le da al grupo una **fila de tabla con plan, estado y vencimiento**, que es más de lo que el grupo sabe de sí mismo hoy. Ema pidió volver acá **antes de la Fase 13**, y el motivo es correcto: el grupo es el único habilitador del descuento, y el descuento es la diferencia entre bruto y neto que Balance va a tener que reportar.
>
> **Relevada el 2026-09-29 y pausada ahí mismo**, a pedido de Ema: *"esto está demasiado amañado, luego lo reviso con más atención"*. Lo que sigue es el relevamiento completo para que al retomar no haya que volver a medir nada.

### Lo que ya existe en v1 (y es más de lo que parece)

El dominio está completo desde julio de 2026 (migración `20260722120000`): `customer_groups`, `customer_group_members` con baja lógica vía `left_at`, `discount_rules`, y cuatro columnas en `membership_payments` (`gross_amount`, `discount_amount`, `discount_rule_id`, `discount_note`) con un CHECK que obliga `amount = gross - discount`.

**El panel de la captura 2 ya está construido**: [detail.tsx](../../src/group/components/detail.tsx) es campo por campo lo mismo —nombre con guardado on-blur, buscador de clientes, lista de miembros, kebab con `Ir al perfil` / `Eliminar del grupo`, botón de eliminar con confirmación— y las claves de i18n existen con esos textos exactos (`groups.goToProfile`, `groups.removeFromGroup`, `groups.deleteGroup`). **Es un port al `SidePanel` de v2, no una construcción.**

| Elemento del Figma | Estado en v1 |
|---|---|
| Tab `Clientes` / `Grupos` | Existe en v1 ([list-with-tabs.tsx](../../src/customer/list-with-tabs.tsx)); **`CustomersSection` de v2 no tiene tabs** |
| Nombre, integrantes, agregar/quitar miembro, ir al perfil, eliminar grupo | ✅ completo |
| **Tipo de plan / Vencimiento / Estado** (columnas) | ❌ **no existen a nivel grupo** — ver decisión [#17](#decisiones-abiertas--riesgos) |
| **Crear grupo** | Existe en v1; **no aparece en ninguna captura** |

### Medición contra producción (2026-09-29)

**13 grupos activos**, todos `type = 'family'`; 12 con 2 integrantes y uno con 3. **39 pagos con descuento, $78.000, el 100% por regla y cero ad-hoc**, entre el 2026-07-06 y el 2026-09-15. La única regla activa es `2do integrante grupo familiar`, fixed $2.000.

**Los nombres reales son `Aldo - Nelva`, `Miño - Flores`, `Ramirez-Arellano`** — los dos nombres de pila, nunca "Familia X". El placeholder `Ej: Familia Martínez` de la maqueta no describe cómo se usa.

**3 de 13 grupos no son homogéneos**, que es lo que vuelve no trivial a la fila de la tabla:

| Grupo | Qué difiere |
|---|---|
| Maria Elena - Francisco | **Plan**: Francisco en 2 días, Maria Elena en 3 días |
| Nenina - Milagros | **Vencimiento**: Mili al 31/08 (vencida hace un mes), Nenina al 30/09 |
| Sebastian - Conrado | **Vencimiento**: Conrado al 03/10, Sebastián al 30/09 |

> Un cuarto grupo (Ramirez-Arellano) aparece como divergente si se leen las fechas en UTC y deja de serlo al leerlas en hora argentina: el registro de Brian guarda `2026-07-31 00:00 UTC`, que en AR son las 21:00 del **30**. Es la firma del bug del ADR [20260709153000](../architecture/decisions/20260709153000_representacion-canonica-de-fechas-ar.md), no una diferencia real. **Cualquier derivación de "el vencimiento del grupo" tiene que comparar en hora AR o va a inventar divergencias.**

**De paso, el estado del bug de canonicalización en `customer_membership.expiration_date`** (medido porque hizo falta para lo de arriba): 163 filas con la firma del bug, todas tocadas hasta 2026-07; **cero en agosto, y en septiembre 96 correctas contra 1**. Esa 1 es la membresía VIP de Ema, que conserva un vencimiento de julio nunca reescrito (el camino VIP no genera pago) y sólo se le tocó `renewal_date`. **El arreglo aguanta**; el histórico sigue desplazado, que es lo que el ADR ya daba por asumido.

### Hallazgos que no vienen del diseño

**1. La regla se llama "2do integrante" pero el código se la ofrece a todos.** [`resolveApplicableDiscount`](../../src/group/discount.ts) devuelve descuento para *cualquier* miembro de un grupo con ≥2 activos; no distingue primero de segundo. Lo que sostiene la regla es la disciplina del operador: mes a mes se registran **N−1 descuentos por grupo**, y Miño - Flores, con 3 integrantes, recibe 2 los tres meses. La excepción es **Sebastian - Conrado en 2026-09, donde lo recibieron los dos** — decisión o resbalón, el sistema no puede distinguirlos porque nunca supo cuál era el segundo.

**2. Eliminar un grupo destruye la justificación de sus descuentos.** De los 39 pagos con descuento, **6 pertenecen a clientes que hoy no están en ningún grupo y 5 nunca tuvieron fila** en `customer_group_members`. Sólo hay una forma mecánica de llegar a eso: el grupo se borró y el `ON DELETE CASCADE` se llevó las filas de miembros. La ironía es que la migración eligió baja lógica en `removeMember` justamente para preservar auditoría, y `deleteGroup` la borra igual. Lo agrava que **el pago nunca guarda qué grupo lo originó**, sólo `discount_rule_id`: una vez borrado el grupo, el vínculo es irrecuperable. (Mateo Kahl, que salió por la vía blanda, sí conserva su rastro.)

**3. Ruido de maqueta, sin decisión de por medio.** El badge alterna "Activo"/"Activa" entre filas; el footer dice "6 grupos familiar"; el paginador muestra 3 páginas para 6 filas; y el CTA sigue diciendo **"Nuevo cliente"** en el tab Grupos, donde v1 tiene "Nuevo grupo familiar". Mismo caso que el campo Activo de la Fase 10: se corrige al implementar.

**4. El copy de eliminación empeora respecto de v1.** La maqueta dice *"¿Seguro que quieres eliminar este grupo **y sus miembros**?"*, que se lee como que borra a los clientes. El de v1 es explícito y correcto: *"El grupo {name} y sus vínculos serán eliminados. Los pagos con descuento familiar mantendrán su historial."* Conservar el de v1.

**5. Falta el entrypoint de creación.** Ninguna captura lo muestra; el panel que hay es de edición. Asumir que el CTA pasa a "Nuevo grupo" y abre el mismo panel vacío, que es el patrón que ya usa Membresías — **confirmar con Ema al retomar.**

### Decidido el 2026-09-29

- **El descuento no cambia de lógica: sólo se muestra.** El panel del grupo informa qué descuento habilita y a cuántos se les aplicó en el mes; el cobro sigue exactamente como está. Cero riesgo sobre la plata, y el operador sigue siendo el control. La opción de formalizar N−1 (titular + resto) queda registrada, no elegida.
- **Eliminar un grupo pasa a baja lógica.** El grupo se marca inactivo: desaparece del listado, deja de habilitar descuentos, y los vínculos sobreviven para auditoría. Mismo criterio que quitar un integrante, y el mismo que se le aplicó a los planes en la Fase 10. **Requiere migración aditiva** (`active` en `customer_groups`) y revisar los cuatro call sites de `deleteGroup`.

### Sin decidir

**Las columnas `Tipo de plan`, `Vencimiento` y `Estado` de la fila del grupo** → decisión [#17](#decisiones-abiertas--riesgos). Es lo que queda para la próxima sesión.

### Brechas de DB

- **B15 (nueva)** — `customer_groups` no tiene `active`; hoy la única baja es el `DELETE` con cascada. Bloquea lo decidido arriba.
- **B14 (nueva)** — `membership_payments` no registra **qué grupo** originó el descuento, sólo la regla. Es la causa de los 5 pagos hoy inauditables. Cerrarlo toca el RPC de cobro; se evaluó y **no se eligió** en esta pasada.

**Riesgo timezone: alto.** La columna `Vencimiento` compara fechas de varios integrantes entre sí, y leerlas en UTC ya produjo una divergencia falsa durante el propio relevamiento. Toda comparación va por `getAppTzDateParts`, como ya hacen [server.ts](../../src/group/api/server.ts) y [client.ts](../../src/group/api/client.ts).

**Definición de hecho:** (a completar al planificar)
- [ ] Resuelta la decisión #17 y confirmado el entrypoint de creación
- [ ] Tabs `Clientes` / `Grupos` en `CustomersSection`
- [ ] Listado con paginación + panel de grupo portado desde v1
- [ ] Baja lógica de grupo (migración B15) sin romper v1
- [ ] El descuento que habilita el grupo, visible en el panel
- [ ] v1 sigue funcionando: `src/group/` es código compartido → **correr el smoke de v1**
- [ ] Specs e2e + verificación contra la DB de las fechas derivadas

**ADR:** sí — la baja lógica, el criterio de derivación de las columnas, y la decisión explícita de no tocar la regla de descuento.

---

## Fase 11 — Sección Gastos

**Estado:** ✅ completa · rama `feat/v2-gastos` · ADR [20260930121500](../architecture/decisions/20260930121500_v2-seccion-gastos-y-medio-de-pago.md)
**Figma:** desktop `2167:22910` ("crear/editar", 6 pantallas) + `2167:22911` ("eliminar", 3 pantallas) · **mobile `2286:119425` (5 pantallas, crear/editar/eliminar juntos)** · **7 capturas aportadas por Ema el 2026-09-29**.

> ⚠️ **Lleva migración aditiva `20260929104500`, que va a prod ANTES del release.** Agrega `expenses.payment_method` **nullable, sin backfill**, con CHECK contra el mismo vocabulario de `membership_payments` (`PAYMENT_CASH` / `PAYMENT_TRANSFER`).
>
> **La barra de filtros no es la que este plan describía.** El plan decía "search + 3 dropdowns"; las capturas muestran **search + dos datepickers de rango + un dropdown `Método` + un botón `Exportar`**. No hay filtro por categoría —la categoría es columna—, y el export, que el plan atribuía sólo a Ventas, también está acá. Es el quinto caso de una inferencia sin captura que salió mal.

> Mobile nombra sus frames de forma explícita y útil: `Gastos/Vacio` (`2286:119862`), `Gastos/Nuevo Gasto`, `Gastos` (con data), `Gastos/Editar`, `Gastos/Eliminar`. **`Gastos/Vacio` es la única referencia canónica de empty state en todo el rediseño** — usarla como base para el `EmptyState` de la Fase 5.
>
> ⚠️ **Bug de copy en el diseño mobile:** los KPIs de Gastos dicen **"Total cobrado"** (`2286:119875`, `2329:29066`), copy heredado del componente de Ventas. Desktop dice "Total de gastos" (`2139:18310`), que es lo correcto. Implementar "Total de gastos" y avisar al diseñador.

Layout: `PageHeader` + fila de 3 KPIs (**Total de gastos / Efectivo / Transferencias**) + `FilterBar` (search + 3 dropdowns) + `DataTable`. Crear/editar por `FormModal`, eliminar por `ConfirmDialog` + Toast.

### Qué existe hoy

CRUD completo: `getExpenses`, `getExpenseById`, `createExpense`, `updateExpense`, `deleteExpense` ([src/accounting/api/server.ts](../../src/accounting/api/server.ts)) + wrappers HTTP en `src/expenses/api/index.ts` y rutas `/api/accounting/expenses`. UI v1: `src/expenses/components/{list,form,expense-row}.tsx`. 8 categorías en [src/expenses/consts.ts](../../src/expenses/consts.ts) con mapa de migración desde nombres viejos en español.

`withCanonicalExpenseDate` en `src/accounting/api/server.ts` ya canonicaliza `expense_date` — ADR [20260729150049](../architecture/decisions/20260729150049_expenses-timezone-canonicalization.md). **Reusar, no reimplementar.**

### Brechas de DB

**B1 — ✅ cerrada** por la migración `20260929104500`. El texto original queda abajo como contexto de la decisión.

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
- [x] Migración `payment_method` aplicada en dev y decidido el tratamiento del histórico (nullable, sin backfill)
- [x] Los 3 KPIs cuadran con la suma de la tabla — salen de las **mismas filas**, no de una query aparte
- [x] Crear, editar y eliminar con confirmación y feedback
- [x] Filtros funcionando: búsqueda, rango de fechas y método (más "Sin especificar", que el diseño no tiene)
- [x] Export a CSV respetando los filtros activos
- [x] Auditoría de timezone — rango y `expense_date` canonicalizados, verificado contra la DB por e2e
- [x] `/expenses` v1 sigue funcionando con la columna nueva (cubierto por el smoke de v1)
- [x] Orden por fecha en el header de la tabla (fuera del diseño, pedido de Ema)
- [x] **27 unit tests** (5 de `summarizeExpenses`, 14 de los filtros, 8 de `buildRenewalPeriod`) y **7 specs e2e**, todos validados por mutación

**ADR:** [20260930121500](../architecture/decisions/20260930121500_v2-seccion-gastos-y-medio-de-pago.md).

---

## Fase 12 — Sección Ventas

**Estado:** ✅ **completa** (2026-10-01) · rama `feat/v2-ventas` · ADR [20261001100524](../architecture/decisions/20261001100524_v2-seccion-ventas.md)
**Figma:** desktop `2167:22906` (a clientes, 5), `2167:22907` (a no clientes, 3), `2167:22908` (exportar, 2) · mobile `2286:118422`, `2286:118789`, `2286:118889`. **Verificado con 13 capturas que pasó Ema el 2026-10-01, versionadas en [figma/ventas/](figma/ventas/)** — la cuota del MCP se agotó en dos llamadas, como anticipaba la [decisión #10](#decisiones-abiertas--riesgos).

### El hallazgo que cambió la fase

**Ventas no es "productos": es todo lo que se cobra.** El panel "Nueva venta" ofrece `Membresía — Renovaciones o cambio de plan` al lado de `Producto`, y la tabla mezcla filas de cuota con filas de producto. La primera lectura —con una sola captura, la tabla tapada por el modal— tomó las filas de cuota por relleno copiado del listado de clientes; la captura del paso 2 mostró que eran reales.

**Cada peso vive en una sola tabla.** Las cuotas siguen en `membership_payments`; los productos van a `sales`; la sección las une al leer (`buildSalesLedger`). Copiar las cuotas a `sales` habría obligado a toda suma de ingresos —Balance, `/incomes`, el home— a acordarse de excluirlas.

### Decisiones de negocio (Ema, 2026-10-01)

- **Sin stock, sin catálogo**: el producto se tipea libre ("Remera Hombre Talle L"). El gimnasio vende suplementos, remeras y artículos sueltos sin inventario.
- **Un producto por venta** — deducido del diseño (un detalle, un precio, una fila).
- **Los productos se editan y borran como en Gastos.** Las **cuotas son de sólo lectura** en Ventas: se cobran por la renovación.
- **"Membresía" abre la renovación de la Fase 8** con el cliente ya resuelto.
- **"Datos de referencia" es opcional** en la venta sin cliente; sin el dato la fila dice "Sin cliente".
- **Admin-only**, como Gastos. Los 4 usuarios de prod son admin.
- **Export a CSV directo**, sin el modal Desde/Hasta/PDF del diseño.
- **El stepper es el de la renovación**: `Detalle de la venta` → `Confirmar`, con el buscador y la elección de concepto fuera de él.

### Qué se construyó

- **Migración `20261001100524`**: tabla `sales` con RLS admin-only, FK `NO ACTION` a `customers`, `payment_method NOT NULL`, `sale_date` sin default, CHECK de comprador único.
- **Dominio `src/sales/`**: `types`, `ledger` (la unión y el orden por día AR), `summary`, `filters`, `export`, `normalize` (validación + canonicalización de `sale_date`), `api/server` y `api/client`, rutas `/api/sales` y `/api/sales/[id]`.
- **UI**: `SalesSection` y `SaleFormPanel` con `SaleConceptStep` / `SaleDetailStep` / `SaleReviewStep`.
- **Extraído para no duplicar con Gastos**: `src/lib/date-range-params.ts`, `src/lib/csv.ts`, `components/v2/SectionKpi.tsx`, `DataTable.isRowClickable`, `RenewCustomerSearchStep.prompt`.
- **De paso**: `getExpenses` y `getMembershipPayments` tiran si la query falla. Antes devolvían `[]` y el cartel de error de Gastos no aparecía nunca.
- **Filtro de concepto (Membresías / Productos)**, pedido por Ema probando la fase. No mueve los KPIs, igual que el de método.
- **Desborde a 360px arreglado de raíz** (ver ADR, decisión 14): el `<body>` en grid sin columna explícita estiraba la app entera en **todas** las pantallas de v2, y los `truncate` de `Select`/`DatePicker` no truncaban. Ventas medida sin desbordes de 320 a 1440; v1 también, por el cambio del body.
- **Tests**: 29 unit tests (8 de 8 mutaciones detectadas) y `e2e/specs/sales.spec.ts`, verde contra el server local junto con la suite completa.

### Defectos del diseño — avisar al diseñador

1. Los encabezados de la tabla están **corridos una columna** ("Membresía" tiene el concepto, "Concepto" tiene el monto).
2. El resumen tiene **los valores cruzados**: "Método de pago" muestra la fecha y "Fecha" muestra `$10/08/2026`.
3. "Detalle de la venta" en el form vs "Motivo de la venta" en el resumen.
4. **En mobile el `+` va directo al buscador** y no hay forma de vender sin cliente → abre el mismo menú que desktop.
5. Paddings de la pantalla mobile de concepto/producto y la mezcla de ✕ con ← → resueltos por el `SidePanel`.
6. "Metodo" sin tilde en la captura del export.
7. El paso de detalle con cliente dice `Cancelar`; se usa `Atrás`, como la renovación.

### Deuda que ya estaba y quedó medida

**A 768px (tablet con sidebar abierto) se desbordan Gastos, Clientes y Membresías**: la tabla de desktop no entra en ~420px. No lo introdujo esta fase. La salida probable es que `DataTable` muestre la lista mobile hasta `lg` — decisión del primitivo, para todas las secciones a la vez.

### Lo que esta fase deja para la 13

~~`getMonthlyStats`, el dashboard `/incomes` de v1 y el "Resumen del día" del home **sólo suman `membership_payments`**.~~ → **Resuelto en la Fase 13**, y corregido: `getMonthlyStats` (el balance de v1) suma `sales` desde ahí. El "Resumen del día" del home **no** suma montos —cuenta pagos registrados—, así que no le faltaba nada; la nota original estaba mal. Y `/incomes` de v1 se dejó como está a propósito: es un tablero de cobranza de cuotas.

**Definición de hecho:**
- [x] Migración aplicada en dev (auditoría idéntica antes y después)
- [x] Dominio `src/sales/` completo
- [x] Venta a cliente y a no cliente
- [x] 3 KPIs cuadran con la tabla (salen de las mismas filas)
- [x] Export funcionando
- [x] Auditoría de timezone: `sale_date` se canonicaliza en `normalizeSaleInput` (unit test + verificación contra la DB en el e2e); el rango usa `toAppTzQueryBounds`; las fechas se muestran con `toAppTzIsoDate`

---

## Fase 13 — Balance

**Estado:** ✅ **completa** (2026-10-01) · rama `feat/v2-balance` · ADR [20261001154047](../architecture/decisions/20261001154047_v2-balance.md) · sin migraciones
**Figma:** desktop `2167:22912` (`2141:50936`) · mobile `2345:37294` (`2329:30598`). **Verificado con las capturas que pasó Ema el 2026-10-01**, versionadas en [figma/balance/](figma/balance/).

### El hallazgo

Ema la sentía vacía y no sabía qué sumarle que no estuviera ya en otras rutas. Medido prod, la pantalla **no tenía pocos bloques: tenía dos desgloses de ingresos que repiten Ventas y ninguno de egresos**. Lo que sólo puede mostrar Balance es el cruce. Septiembre 2026 dio $1,7M de resultado contra $390k de agosto, y lo explican los egresos (en septiembre el alquiler es el 69%).

### Decidido con Ema (2026-10-01)

- **Navegador de mes** (‹ Septiembre 2026 ›, `?month=YYYY-MM`) en vez de los dos datepickers: con rango libre, "resultado del mes" y "vs mes anterior" no están definidos.
- **Bloques:** resultado del mes · evolución de ingresos **contra** egresos (6 meses) · ingresos por concepto (planes + **Productos**, sin "Plan familiar") · **egresos por categoría** · ingresos por método de pago · **descuentos y recargos**.
- **Ciclo de cobro y pendientes** de `/incomes` v1: **en espera hasta la Fase 15**.
- El pago de prueba de 2025 en prod se deja como está.

### Qué se construyó

- `src/balance/`: `summary` (todo el cálculo, puro), `chart-scale`, `month-param`, `api/server` y los componentes (`BalanceSection`, `MonthNavigation`, `ResultCard`, `EvolutionChart`, `BreakdownCard`).
- **Una lectura de seis meses con las mismas funciones que Ventas y Gastos**, y todo calculado de esas filas: los números cuadran por construcción.
- `src/lib/month-key.ts` compartido (el de `/incomes` v1 pasó a usarlo); `formatCompactCurrency` y `formatMonthKey`.
- **Tokens de gráfico** `--color-chart-income` / `--color-chart-expense` en el scope v2, validados con el script de la skill de dataviz. Re-validar cuando llegue la paleta de marca.
- `getMonthlyStats` (balance de v1) suma `sales`.
- 28 unit tests (10 de 10 mutaciones detectadas) y `e2e/specs/balance.spec.ts`.
- **Ajustes después de la prueba de Ema**: "Por concepto" ordenado por plan (de más días a menos, productos al final); tabla de Evolución que se adapta al ancho de la card (container query); skeleton inmediato al cambiar de mes; el card de la página envuelve todo el contenido (`shrink-0`); tooltip y ajustes sin líneas partidas. Detalle en el ADR, decisiones 11–15.

### Defectos del diseño — avisar al diseñador

Porcentajes de método de pago invertidos · barras de "Por membresías" no proporcionales · "Por membresías" no suma los ingresos (faltan productos) · "Plan familiar" no es un plan · "Últimos 6 meses" con siete barras y sin eje · "Balance mensual" con rango libre · nombres distintos desktop/mobile · mobile sin Evolución y con filas que se salen del card. Detalle en el ADR.

**Definición de hecho:**
- [x] Las métricas y los desgloses con data real
- [x] Ventas incluidas en el ingreso (y en `getMonthlyStats` de v1)
- [x] Filtro de período funcionando (navegador de mes)
- [x] Los números cuadran con Gastos y Ventas por separado — **verificado por el e2e**
- [x] Auditoría de timezone: cada fila a su mes AR (`getMonthKeyOfInstant`), con test para la cuota de las 22:00 AR y el gasto viejo sin canonicalizar

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
- [ ] Promociones sobre `discount_rules` + vigencia (B7). **Absorbe el descuento familiar** (ex Fase 10b): la regla "2do integrante grupo familiar" es la primera promoción, y renombrarla a "Grupo familiar" se hace desde este ABM. El panel de renovación de v2 **ya lista las reglas activas** desde el 2026-10-02 (ADR 20261002120000), así que el ABM sólo tiene que crearlas y editarlas.
- [ ] Usuarios: diseñar la pantalla, o documentar explícitamente por qué se difiere

**ADR:** sí — `business_settings`, Storage, y el modelo de promociones.

---

## Fase 15 — Promoción de v2 a default

**Estado:** ⬜ pendiente · fuera del alcance actual

Se planifica cuando 3–14 estén cerradas. A tener en cuenta desde ya:

- **Paridad funcional.** La v1 tiene cosas que el Figma no cubre: ~~grupos familiares (`src/group/`)~~ → **no se portan**: el descuento familiar es una promoción desde el 2026-10-02 (ADR 20261002120000). Al retirar v1, `customer_groups` / `customer_group_members` quedan como historia de sólo lectura o se archivan, y `resolveApplicableDiscount` se borra con v1; share de imagen de asistencias; stats de membresías. Auditar qué se porta, qué se descarta y qué se rediseña.
- **Cobranza de `/incomes` (en espera desde la Fase 13, decisión de Ema 2026-10-01).** El dashboard de v1 tiene el **progreso del ciclo de cobro** (pagaron, con y sin recargo, pendientes) y la **lista de pendientes**. No entraron al Balance porque son de cobranza, no de balance, y v2 todavía no tiene dónde ponerlos. Si no se ubican antes de retirar v1, se pierden. Candidatos: el Home o una vista de Membresías. La lógica ya existe y funciona (`getBillingCycleProgress`, `getPendingCustomers` en `src/accounting/api/incomes.ts`).
- **Manifest PWA.** `theme_color` y `background_color` están hardcodeados a la paleta v1.
- **Wireframes mobile.** El Figma es 100% desktop 1280×832. **No existe ni un solo wireframe mobile**, y la app hoy es mobile-first en producción. Es el riesgo más grande del rediseño → [Decisiones abiertas](#decisiones-abiertas--riesgos) #1.
- **Retiro del flag.** Qué pasa con `user_feature_flags` y las rutas `/v2/*` — ¿redirect permanente o rename?

---

## Decisiones abiertas / riesgos

Ordenadas por impacto. Las que bloquean una fase están marcadas.

1. **~~No hay diseño mobile~~ → RESUELTO (2026-09-15).** Los 12 flows mobile están indexados en [Figma — índice de nodos mobile](#2-figma--índice-de-nodos-mobile). Lo que **queda abierto** del tema mobile son tres huecos concretos, cada uno asignado a su fase:
   - **Configuración → Usuarios no tiene pantalla mobile** (el sidebar desktop tiene 4 sub-items, el mobile diseñó 3 tabs). → Fase 14.
   - **`Payment Receipt` no aparece en ningún flow mobile.** ¿No existe en mobile o falta diseñarlo? → Fase 8.
   - ~~**Divergencia de navegación en Asistencias**~~ ✅ **resuelta 2026-09-26**: es intencional y se construyó así — desktop con tabs `Registro diario` / `Historial`, mobile con el navegador de día siempre visible y sin tabs. Ver [Fase 9](#fase-9--sección-asistencias). Sigue abierta la de **Configuración** (sub-items de sidebar vs tabs in-page) → Fase 14.

2. **~~Paleta~~ → RESUELTO (2026-09-15).** El rosa/magenta **es la marca de Actitud**, y los Figmas nuevos apuntan a más alta fidelidad. Ema: *"hoy no es necesario que pienses en ello de momento, podés mantener todo en escala de grises si querés"*. **Decisión: las primitivas de la Fase 5 se construyen con los tokens neutrales actuales**, y la paleta de marca se aplica después en una pasada dedicada sobre las CSS vars de `[data-v2]` — que es exactamente para lo que sirve el theming scoped de la Fase 1. Evita mezclar decisiones de color con decisiones de API de componentes.
3. **Estados de tabla y lista — parcialmente resueltos por el mobile.** En desktop hay tres anotaciones del diseñador pidiendo definirlos (`2118:22319`, `2118:22606`, `2118:29353`), pero **el mobile sí diseñó dos empty states**: `Gastos/Vacio` (`2286:119862`) y Ventas en $0 (`2265:70904`). Usar esos dos como referencia canónica y derivar el resto (cargando, error, sin resultados de filtro) en la Fase 5, documentándolos acá. Ya no hace falta pedir nada.

4. **~~Paginación de tablas sin definir~~ → RESUELTO (2026-09-16, Fase 6b).** El claim de que "ningún wireframe muestra paginador" era **falso**: la captura del listado de clientes tiene `230 Total de clientes` + paginador numerado. **Las tablas del rediseño paginan.** El componente es [DataTablePagination](../../src/components/v2/DataTablePagination.tsx), ya transversal en `components/v2/`; las fases 10–14 lo instancian en vez de decidir de nuevo. El scroll infinito sigue disponible sobre el mismo query — lo usa el listado v1 — para las secciones donde convenga.

5. **~~Alcance de Ventas~~ → RESUELTO (2026-10-01).** Sin stock, sin catálogo (el producto se tipea libre), un producto por venta (deducido del diseño) y los productos se editan y borran como en Gastos. **Las capturas agregaron lo que la pregunta no contemplaba**: Ventas incluye las cuotas de membresía, que se leen de `membership_payments` sin duplicarse. Ver [Fase 12](#fase-12--sección-ventas).

6. **`business_settings`: fila única o `tenant_id` desde ya (bloquea Fase 14).** Agregar `tenant_id` ahora cuesta poco; migrarlo después con datos cuesta bastante más.

7. **~~Tipos de membresía: hardcodeados vs CRUD~~ → RESUELTO (2026-09-28): catálogo híbrido.** Se pueden crear planes desde la UI, y los 5 originales conservan su comportamiento especial. Los planes nuevos son **ordinarios** —mensuales, cobrables, con modalidades de cobro y con el cupo que se les cargó— y su nombre sale de `types_memberships.name`; los 5 del catálogo dejan `name` en NULL y siguen resolviendo por key i18n, así que **no se pierde la i18n por key**, que era el costo que la pregunta original temía.

   **Se cerró dos veces, y la segunda invirtió la primera.** El primer cierre, hecho sin las capturas, concluyó "la fase no crea planes" a partir del inventario de abajo. Las capturas mostraron `Nueva membresía`, dos planes fuera del catálogo y **el campo "Frecuencia de días" ya en el formulario** — que es la columna `weekly_quota` que ese cierre proponía como fase previa. Con el cupo resuelto, las ramificaciones restantes son excepciones de VIP y Diaria, y un plan nuevo cae en la rama por defecto.

   **El inventario igual fue lo que definió la forma de la solución: la clave del tipo no es un nombre, es un contrato de comportamiento.** Cuatro lugares ramifican sobre el string literal, y ninguno se resuelve leyendo una fila de `types_memberships`:

   | Dónde | Qué decide la clave |
   |---|---|
   | [pricing.ts:99-100](../../src/membership/pricing.ts) | VIP no se cobra; Diaria va a precio único |
   | [charge-mode.ts:54, 141, 182](../../src/membership/charge-mode.ts) | VIP y Diaria no tienen modalidades ni recargo |
   | [customer-counter.tsx:30-32](../../src/assistance/customer-counter.tsx) + [customer.tsx:70](../../src/assistance/customer.tsx) | El cupo semanal (5 / 3 / 2) sale de un mapa por clave |
   | Las migraciones del RPC de alta (`IF p_membership_type = 'MEMBERSHIP_TYPE_VIP'`, `v_is_daily := ...`) | Vencimiento de la diaria, gate de admin del VIP, asistencia automática |

   **Cómo quedó cubierta cada una:** el cupo pasó a la columna `weekly_quota` que el diseño ya pedía; "si se cobra" se deriva del precio (sin precio = `Sin costo`, que es lo que la tabla muestra para el VIP); y las modalidades de cobro y las tres ramas del RPC **siguen atadas a las claves literales de VIP y Diaria**, que es correcto porque son excepciones de esos dos planes y no reglas generales. El RPC ya valida contra `types_memberships`, así que un tipo nuevo pasa solo y esas ramas no disparan.

   **Lo que queda deliberadamente sin resolver:** un plan nuevo no puede ser "como el VIP" ni "como la Diaria". Si el negocio alguna vez quiere un segundo plan sin cargo o un segundo pase de un día, eso sí requiere mover esas ramificaciones a columnas (`is_chargeable`, `has_charge_modes`) y que el SQL las lea. Es una fase propia, y hoy no hace falta.

8. **~~Histórico de gastos sin `payment_method`~~ → RESUELTO (2026-09-30): nullable, sin backfill.** Los gastos existentes quedan como **"sin especificar"** y se ven como tales.

    **La pregunta se achicó al medirla.** En producción hay **29 gastos**, entre el 2026-07-10 y el 2026-09-25: no es un histórico, es el arranque del módulo. Y adivinar salía caro justo donde más pesa — los tres alquileres suman **$1.200.000** y los tres sueldos **$399.000**, que son los montos que menos se pagan en efectivo. Un backfill habría metido ~$1,6M de datos inventados en el lado de egresos del balance.

    **El argumento que la cerró no estaba en la pregunta:** `expenses` tiene un escritor que no es la UI. El RPC `upsert_customer_membership_with_payment` inserta un gasto de categoría `REFUNDS` cuando un cambio de plan genera un reintegro, y no conoce el medio de pago. Con `NOT NULL DEFAULT 'PAYMENT_CASH'` **cada reintegro futuro quedaría etiquetado como efectivo sin que nadie lo decida**.

    Consecuencia asumida: `Efectivo + Transferencias` no suma `Total de gastos`. La pantalla muestra una línea con cuánta plata quedó sin clasificar, para que el descuadre se explique en vez de quedar mudo. Si Ema quiere clasificar los 29, se editan desde la UI nueva.

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

17. **~~Las columnas `Tipo de plan`, `Vencimiento` y `Estado` del listado de grupos~~ → OBSOLETA (2026-10-02).** La Fase 10b se canceló y v2 no tiene listado de grupos: ver ADR 20261002120000. Queda el análisis original como historia. El diseño le da a la fila del grupo tres valores únicos, pero los tres son datos **de cada integrante**, no del grupo. En prod **3 de 13 grupos no son homogéneos** (ver [Fase 10b](#fase-10b--grupos-de-clientes-familiares)), así que no es un borde raro: es el 23%.

    El caso que fija la importancia es **Nenina - Milagros**: Mili venció el 31/08 y Nenina el 30/09. Una fila que muestre un solo `Vencimiento: 30/09` y un solo badge `Activo` **oculta que una integrante lleva un mes vencida** — el mismo tipo de mentira silenciosa que las guardas defensivas que aparecieron en la Fase 10.

    Las tres opciones que se pusieron sobre la mesa el 2026-09-29, ninguna elegida:

    | Opción | Qué implica |
    |---|---|
    | **Mostrar la divergencia** | Coinciden → el valor; no coinciden → `Mixto` en plan, el vencimiento más próximo, y `Estado` toma el peor caso. Nenina - Milagros figuraría vencido, que es lo útil. Sin cambios de schema. |
    | **Peor caso sin etiquetar** | Misma derivación, sin la palabra `Mixto`. Tabla más prolija; el vencimiento y el estado quedan correctos, pero la diferencia de planes no se ve. |
    | **Fila expandible por integrante** | No se colapsa nada. Se aleja de la maqueta y es más trabajo de tabla. |

    Hay una cuarta, **plan a nivel de grupo en el schema** (el grupo tiene su plan y los integrantes lo heredan), que es lo que la maqueta sugiere leída literal. Es una fase de migración entera —cambia alta, renovación, cobro y vencimientos— y **no parece justificada** por 13 grupos de 2 personas que renuevan por separado. Queda anotada para descartarla explícitamente, no por olvido.

18. **Copy y gráficos del mobile de Home (Fase 2, cosmético).** Las capturas del 2026-09-17 mostraron dos divergencias que no son de la Fase 7: el empty state del `Resumen del día` dice *"Aun no hay actividad registrada por el momento."* (sin tilde en "Aún"), y las asistencias semanales se dibujan como **barras horizontales** en mobile contra las verticales del desktop. Avisar al diseñador y decidir si el mobile cambia de gráfico a propósito.

---

## Checklist de verificación estándar

Aplica a **toda** fase antes de pedir review. Está pensado para que el otro dev valide en el preview de Vercel sin correr SQL ni migraciones (dev y preview comparten DB).

### Local, antes de pushear
1. `npm run type-check` — sin errores nuevos.
2. `npm run lint` — sin errores nuevos.
3. **`npm run build` — obligatorio si la fase agrega una pantalla o un componente client.** Los dos pasos anteriores **no** detectan que un componente `'use client'` importe un valor de un módulo que toca `next/headers` o el cliente de Supabase del server: pasan limpios y el build revienta. Pasó en la Fase 9 — ver la lección del ADR [20260926171200](../architecture/decisions/20260926171200_v2-seccion-asistencias.md).
4. `npm run dev` — arranca sin warnings nuevos en consola.
5. `npm run test` — los unit tests en verde. Si la fase toca una regla de negocio (precio, recargo, fecha), **suma su test acá y se lo valida por mutación** antes de darlo por escrito.
6. `npm run test:e2e` — la suite en verde, incluidos los specs que agrega la fase.
7. Responsive: 1440px → 768px → 375px sin overflow horizontal.
8. Auditoría de timezone: cada fecha nueva que llega a un RPC o a la DB pasa por un helper de `src/lib/timezone.ts`.

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
- 2026-09-26 — **Fase 9 completa** (`feat/v2-asistencias`). ADR [20260926171200](../architecture/decisions/20260926171200_v2-seccion-asistencias.md). Sin migraciones, sin RPCs nuevos, v1 intacta.
  - **La pregunta que bloqueaba la fase estaba mal planteada.** El plan decía "definir si los tabs desaparecen también en desktop" y suponía que se llamaban Hoy/Historial, a partir del árbol de nodos. Las capturas mostraron que se llaman **`Registro diario` / `Historial`**, que la divergencia con mobile es deliberada, y que en Historial el navegador de día vive **dentro del card** en vez de reemplazar el título. **Tercera vez que una inferencia del árbol de nodos resulta falsa** — antes fueron el "dropdown de acciones de fila" de la 6b (era el filtro `Estado`) y la premisa de la decisión #5. El árbol dice qué instancias hay, no qué hacen.
  - **El tab se deriva de la URL en vez de ser estado local.** Un solo `?date=` gobierna el día visible y el tab activo, así que la combinación incoherente —Historial mostrando hoy— no existe. `?date=` apuntando a hoy redirige a la ruta pelada, para que no haya dos URLs con el mismo contenido.
  - **Se le puso tope al Historial en ayer**, que el diseño no resolvía: llegar a hoy mostraría la misma lista que el otro tab, con el tab equivocado subrayado.
  - **Un estado de error no se puede mostrar si la capa de datos ya lo tragó.** `getAssistancesByDate` devolvía `[]` ante cualquier fallo, así que un error de red o de RLS se veía igual que un día sin nadie. Se agregó `getAssistancesByDateResult`; la función vieja quedó como wrapper, y el query sigue siendo uno solo.
  - **"Cero brechas, es puro port de UI" no era del todo cierto.** No hacía falta migración, pero la línea secundaria de la fila —el plan de membresía— no se estaba trayendo en el `select`. Se detectó mirando la captura, no el código.
  - **La validación del `?date=` se extrajo a un módulo compartido con v1**, que la tenía como función local. Con dos copias, ampliar la ventana en una pantalla y no en la otra habría sido un bug invisible hasta que alguien comparara.
  - **Primera fase que entrega con specs e2e.** Seis casos, y el que justifica el resto verifica **contra la DB** que la asistencia recién registrada cayó en el día calendario argentino correcto — lo único que la pantalla no puede mostrar y el modo de fallo que ya apareció dos veces en este repo.
  - **Datos de relleno de la maqueta, anotados para que nadie los lea como requisitos:** el contador decía 12 y 20 sobre las mismas 8 filas, todas las filas decían `08:14` (lo que hacía ver un orden alfabético que no existe), y el sidebar marcaba `Inicio` activo en una pantalla de Asistencias.
  - **Paginación y buscador se agregaron sobre la marcha, fuera del Figma.** El diseño dibuja la lista entera sin controles — coherente con una maqueta de 8 filas, insuficiente para un día real. Reusaron `DataTablePagination` y `FilterBar.Search`, las dos primitivas de la Fase 5, sin tocarlas. **Quedan como precedente para las fases 10–15**: una lista larga del rediseño probablemente necesite los dos aunque su frame no los muestre.
  - **Búsqueda y página arrancaron como estado local y se corrigieron a la URL.** La justificación original —"meterlas en la URL cuesta un round-trip por tecla"— sólo vale para `router.replace`; `history.replaceState` la actualiza sin navegación, y **eso ya estaba resuelto y comentado en `CustomersSection`**, la sección más parecida del mismo rediseño. La lección para las fases que vienen: **cuando una decisión se aparta de lo que hace una pantalla equivalente, abrir esa pantalla antes de argumentar.** De paso se extrajeron `readParam` y `parsePageParam` a `lib/search-params.ts`, que eran privados de `customer/filters.ts`.
- **Dos defectos que sólo aparecieron mirando la pantalla con data real**, no leyendo el código: el `0` del contador sobre la lista vacía, y `capitalize` de Tailwind produciendo "Jueves, 24 **De** Septiembre" (capitaliza cada palabra; `Intl` ya devuelve el día bien y sólo hay que subir la primera letra). Refuerza la regla operativa #4: **mirar cada pantalla nueva con data real antes de cerrarla**. El `DayNavigator` de v1 arrastra el mismo defecto del `capitalize` y no se tocó — está en producción y es cosmético.
  - **`type-check` + `lint` en verde no prueban que la pantalla levante.** La primera versión dejó el tipo de fila y su normalizador en `api/server.ts`; los componentes client importaban el tipo con `import type` pero la función como valor, y eso arrastra `next/headers` al bundle. Los dos chequeos pasaron limpios y la ruta reventó al abrirla. **Se agregó `npm run build` al checklist local** para las fases que suman pantallas o componentes client.
  — Ema + Claude.
- 2026-09-26 — **Suite e2e con Playwright, en tres tandas** (PRs [#65](https://github.com/EmaCrzz/actitud-bo/pull/65), [#66](https://github.com/EmaCrzz/actitud-bo/pull/66), [#67](https://github.com/EmaCrzz/actitud-bo/pull/67)). ADRs [20260926131436](../architecture/decisions/20260926131436_suite-e2e-playwright-para-v2.md) (la suite), [20260926144952](../architecture/decisions/20260926144952_e2e-fechas-de-cobro-y-mes-contable.md) (fechas de cobro y mes contable) y [20260926150338](../architecture/decisions/20260926150338_e2e-limpieza-automatica-de-datos-de-test.md) (teardown automático). Cubre v2; v1 no.
  - **Los selectores van por clave de i18n, no por strings en español.** Los specs importan el mismo diccionario que la app, así que un cambio de copy mueve el selector solo y lo que rompe un test es que desaparezca la *clave*, que es justamente lo que debería romperlo.
  - **Lo que la UI no muestra se verifica contra la DB** (`e2e/support/db.ts` + `toAppTzIsoDate`). Es la única forma de detectar el bug de canonicalización de fechas: la pantalla se ve bien y sólo cambia un timestamp que nadie renderiza. Este es el caso que justifica la suite entera.
  - **Los datos de test son efímeros, con prefijo `[E2E]` y DNI en el rango `99.xxx.xxx`** — no asignado en Argentina. La suite corre contra la DB de dev, que es un backup de prod con gente real, así que el aislamiento no es una formalidad.
  - **Lo que cambia para este plan:** la línea "Riesgo timezone" de cada fase deja de auditarse sólo leyendo código y pasa a tener verificación ejecutable. Y **toda fase nueva suma su spec** — la 9 fue la primera.
  — Ema + Claude.
- 2026-09-26 — **Unit tests de la lógica de negocio con Vitest** (PR [#69](https://github.com/EmaCrzz/actitud-bo/pull/69)). ADR [20260926164830](../architecture/decisions/20260926164830_unit-tests-para-la-logica-de-negocio.md). 60 tests sobre `billing-policy`, `pricing` y `timezone`.
  - **El inventario cambió el plan que se venía siguiendo.** La lista de pendientes decía "cubrir el resto de las pantallas v2"; el conteo mostró que **9 de las 12 son `UnderConstruction`**. Media hora de inventario evitó escribir tests de placeholders — y dejó una nota incómoda sobre lo ya entregado: el smoke de "7 pantallas cargan sin errores" está recorriendo mayormente pantallas vacías. No es inútil (confirma layout, flag y routing) pero conviene saberlo al leer el número de tests en verde.
  - **La política de cobro se priorizó sobre más cobertura de UI**, y el motivo lo documenta el propio código: hubo **tres reglas de recargo conviviendo desincronizadas** —el dashboard contaba un pago del día 13 como "sin recargo" mientras el formulario ya sugería cobrarlo con recargo— y eso vivió en producción hasta que alguien lo notó de casualidad.
  - **Herramienta distinta porque la pregunta es distinta.** Verificar "el día 11 sugiere recargo" por e2e exigiría manipular el reloj del sistema o esperar al día 11; las funciones ya reciben la fecha por parámetro. **60 tests en 60ms contra 2.3 minutos de los 19 e2e**, y sin DB ni secrets, así que son lo primero que debería ir a CI si se monta.
  - **Los 60 pasaron al primer intento, lo que no prueba nada.** Un test escrito mirando la implementación tiende a confirmarla en vez de verificarla, así que se validó por mutación: volver `gracePeriodEnd` a 10→15 puso 7 en rojo, y reemplazar `parseAppTzDateString` por `new Date(iso)` —el bug histórico— otros 7. **Para un test de regresión, verlo fallar es parte de escribirlo.**
  — Ema + Claude.
- 2026-09-28 — **Plan emparejado con el repo** (`docs/emparejar-plan-v2`). Sin ADR: es sincronización de documentación, sin decisión de diseño nueva. Qué se corrigió:
  - Faltaban en el log las **tres tandas de e2e y los unit tests** — estaban mencionados en "Por dónde seguir" pero nunca registrados, así que los cuatro ADRs del 26/09 no tenían entrada.
  - **"Estado de entornos — todo desplegado y sin deuda" había quedado falso.** `develop` está adelante de `main` con la Fase 9, la suite e2e y los unit tests. Se separó en dos afirmaciones que envejecen distinto: las migraciones están al día (nada posterior a `20260925103921` toca el schema) y el código está pendiente de release.
  - **Se inventarió la [decisión #7](#decisiones-abiertas--riesgos) en vez de dejarla planteada como estaba.** El relevamiento mostró que la clave del tipo de membresía gobierna cupo semanal, si el plan se cobra, si tiene modalidades y tres ramas del RPC escritas en SQL — o sea que **no es una decisión sobre nombres, es sobre comportamiento**.
  — Ema + Claude.
- 2026-09-28 — **Decisión #7 cerrada: la Fase 10 edita precios y estado, y no crea planes.** El catálogo de tipos queda cerrado en código y `MembershipTypeArray` sigue siendo la fuente de verdad, así que la i18n por key se conserva. La Fase 10 queda desbloqueada — Ema.
  - **La pregunta original estaba mal encuadrada.** El plan la planteaba como un conflicto de *nombres*: "si se crean planes desde la UI, los nombres salen de la DB y se pierde la i18n por key". El inventario mostró que el nombre es lo de menos — la clave del tipo también decide el cupo semanal (5/3/2), si el plan se cobra (VIP no), si tiene modalidades de cobro (Diaria y VIP no) y tres ramas del RPC de alta comparando el string en SQL.
  - **Un plan creado desde un formulario habría fallado en silencio.** No habría reventado nada: existiría en `types_memberships`, aparecería en el select, y después no tendría cupo, ni modalidad, ni el RPC sabría qué hacer con él. El modo de fallo favorito de este repo — ver el alta rota de v1, que vivió dos meses.
  - **El costo aceptado, explícito:** agregar un plan nuevo sigue requiriendo un PR. Es honesto, porque agregar un plan *es* escribir su comportamiento. Si el negocio termina necesitando planes arbitrarios, el paso previo es mover esas cuatro ramificaciones a columnas (`weekly_quota`, `is_chargeable`, `has_charge_modes`) y que el RPC las lea — una fase propia **antes** de la 10, no un renglón adentro.
  — Ema + Claude.
- 2026-09-28 — **Release v0.15.0 a producción.** Llevó la Fase 9 (Asistencias), las tres tandas de e2e, los unit tests de Vitest y el emparejamiento de este plan. **Sin migraciones**, así que no hubo `db:push-prod` ni orden de deploy que respetar — la última migración en prod sigue siendo `20260925103921`, de la v0.14.0.
  - **Lo que un operador de v1 ve de este release: nada nuevo.** Los únicos archivos compartidos que cambiaron son refactors que preservan comportamiento — la validación del `?date=` de `/assistances` se extrajo a `assistance/date-range.ts` para compartirla con v2, y `getAssistancesByDate` quedó como wrapper de `getAssistancesByDateResult`. Todo lo demás es v2 (apagado, 0 usuarios con `v2_access`), tests o documentación.
  - **`public/sw.js` dejó de versionarse** y pasa a generarse en cada build. Verificado antes del release: el script `build` corre `generate-sw.js` explícitamente, así que Vercel lo regenera.
  - **Anotado, no resuelto: el release script esquiva la protección de `main`.** El push reportó `Bypassed rule violations for refs/heads/main: Changes must be made through a pull request`. Pasa porque la cuenta que releasea tiene permiso de bypass, y pasa en **todos** los releases, no sólo en este — la protección del ADR [20260706170431](../architecture/decisions/20260706170431_proteger-main-y-cambiar-default-branch.md) no cubre el camino del script. O el script abre un PR de release, o la excepción se documenta como deliberada.
  — Ema + Claude.
- 2026-09-28 — **Fase 10 completa** (`feat/v2-membresias`). ADR [20260928112705](../architecture/decisions/20260928112705_v2-seccion-membresias-y-catalogo-de-planes.md). **Con migración aditiva** `20260928110544`, que va a prod antes del release.
  - **La decisión #7 se cerró dos veces en el mismo día y la segunda invirtió la primera.** El primer cierre, sin las capturas, dijo "la fase no crea planes": el inventario del código mostró que la clave del tipo gobierna cupo semanal, cobrabilidad, modalidades y tres ramas del RPC en SQL. Las capturas mostraron `Nueva membresía`, dos planes que no existen en el catálogo, y **"Frecuencia de días" ya como campo del formulario** — la columna `weekly_quota` que ese cierre proponía como fase previa. Con el cupo resuelto, lo que queda son excepciones de VIP y Diaria, y un plan nuevo cae en la rama por defecto.
  - **Cuarta vez que una inferencia sin la captura resulta falsa** (antes: el dropdown de fila de la 6b, la premisa de la #5, los tabs de la 9). La diferencia: acá no fue leer mal el árbol de nodos, fue **razonar sobre el alcance de una pantalla sin haberla visto**. El inventario igual sirvió — sus cuatro hallazgos definieron la forma del catálogo híbrido. La conclusión estaba mal, el relevamiento no.
  - **Se evitó abrir `MembershipTypes` a `string`: eran 79 usos en 26 archivos**, la mitad en v1. En vez de eso, resolvers en `membership/catalog.ts` y la unión queda representando lo que realmente es, los 5 tipos con comportamiento especial. **El patrón ya existía dos veces en el repo** —`formatMembershipLabel` con cast, `AssistanceModal` con guard `in`— escrito distinto en cada lado.
  - **El call site que no había copiado el fallback era el que fallaba en silencio.** `CustomerCounter` duplicaba `SLOTS_BY_TYPE` inline sin guard: para un tipo desconocido devolvía `undefined`, y `Array.from({ length: undefined })` da `[]`. **Cero casilleros de asistencia en pantalla, sin error.** Mientras los tipos eran 5 y fijos no se podía disparar; desde que se crean desde la app, sí.
  - **Dos defectos preexistentes que aparecieron leyendo migraciones para escribir otra.** El INSERT en `types_memberships` estaba abierto a cualquier `authenticated` —el comentario de `20260630180001` lo dejaba anotado, y era teórico hasta que esta fase construyó la UI que lo alcanza—. Y `customer_membership.membership_type` tenía **`ON DELETE CASCADE`**: borrar un plan borraba la membresía de todos sus clientes, y la policy de DELETE admin-only existe, así que era alcanzable. **`ON DELETE CASCADE` en una FK a tabla de catálogo es casi siempre un copy/paste de la FK de al lado.**
  - **`last_update` venía mostrando la fecha de creación de la fila, no la del último cambio de precio**, y tanto v1 como el panel nuevo la rotulan "Última actualización". Es `DEFAULT now()`, que sólo dispara en el INSERT, y ningún caller la escribía. Se arregló con trigger en vez de pedirle a cada caller que la ponga: el que se olvide reintroduce el bug en silencio.
  - **Había dos rutas para la misma pantalla**, `/v2/memberships` (ítem de primer nivel) y `/v2/settings/memberships`, las dos con stub. Las capturas la ponen bajo Configuraciones y no dibujan el ítem de primer nivel. Se borró el stub duplicado, el ítem del sidebar y la constante.
  - **Siete defectos del diseño anotados** para el diseñador, incluidos dos campos "Precio base" en el mismo panel y un paginador de 3 páginas sobre 7 planes. Lista completa en [Fase 10](#fase-10--sección-membresías-planes-y-precios).
  - **La suite e2e encontró un bug que tiraba la app entera, porque los tests nuevos escriben datos que los viejos leen.** Cuatro specs de `payment-accounting` fallaron al correr la suite completa: el alta de cliente resolvía la etiqueta con `MembershipTranslation[type]`, que para los planes `[E2E]` recién creados da `undefined`, y `t(undefined)` revienta con `Cannot read properties of undefined (reading 'split')`. **Pantalla completa caída, no una fila rota.** El spec de membresías creó los planes y el spec de altas —escrito meses antes— los encontró; ninguna revisión de código lo iba a ver, porque cada call site leído por separado parece correcto.
  - **El alcance estaba subestimado por un factor de 7.** El plan decía "migrar los tres call sites que duplicaban la lógica"; eran **~20**, entre v1 y v2 — toda pantalla que muestre el plan de un cliente o de un pago. No abrir `MembershipTypes` a `string` sigue siendo la decisión correcta (eran 79 usos), pero **evitar el cambio de tipos no evitaba el cambio de runtime**, y eso era lo que había que contar.
  - **Dos guards defensivos preexistentes evitaban el crash cambiando el significado del dato.** `AttendanceList` mostraba **"Sin membresía" a un cliente que sí tiene una**, y `AssistanceModal` caía a 5 casilleros. Es peor que el crash: nadie abre un ticket por un cliente que figura sin membresía, lo asume mal cargado.
  - **Medir la DB desmintió tres supuestos ya escritos.** El VIP tiene `amount = 0` y no NULL, así que el filtro no lo excluía de v1 y la primera versión le habría puesto `$ 0` donde el diseño dice "Sin costo"; y en dev no había policy de INSERT, o sea que ahí la migración *habilita* en vez de *cerrar*. Los tres venían de leer código y migraciones; los tres se cayeron con una query.
  - **`router.refresh()` no alcanza cuando hay dos cachés.** Ema probó la fase y un plan recién creado no aparecía en el select de renovación hasta recargar: el `refresh()` revalidaba el server component de la sección, pero los selects de alta y renovación leen el catálogo con React Query y 5 minutos de `staleTime`. La key estaba como literal en cinco archivos —por eso agregar una pantalla que escribe no disparó ninguna alarma— y ahora vive en `hooks/use-membership-types-cache.ts` con su hook de invalidación.
  - **El primer spec de ese bug pasaba con y sin el arreglo.** Creaba el plan antes de abrir el alta, así que la caché estaba fría y el fetch traía el plan igual. **Calentar la caché antes de crear era la condición esencial**, y sólo se vio al validar por mutación. En un test contra caché, *cuándo* se puebla es parte del caso, no preparación.
  - **Dos specs míos eran falsos positivos por mirar el paso equivocado del formulario.** El select de membresía está en el paso 2 del alta y yo afirmaba sobre él en el paso 1, donde no existe: "el plan discontinuado no aparece" daba verdadero por el motivo equivocado. Ahora avanzan al paso 2, y el assert negativo va con uno positivo al lado.
  - **Se agregó el primer smoke de v1 de la suite.** La fase tocó ~20 archivos de v1 y hasta acá "v1 sigue funcionando" se verificaba a ojo. Cubre que sus seis pantallas carguen sin errores de consola y que un plan fuera del catálogo no las rompa; validado por mutación, donde falla en el assert del **tab**, o sea que la pantalla entera se cae. Pasa a ser el chequeo mínimo de cualquier PR que toque código compartido.
  - **Verificado contra prod antes del release** (sólo lectura): el ensayo transaccional de la migración aplica limpio con ROLLBACK, y la auditoría de integridad da la línea de base conocida — 8 DNIs duplicados (deuda B5) y 8 clientes sin membresía, todo lo demás en 0. De paso se corrigió una afirmación de este ADR: **prod tampoco tiene policy de INSERT** en `types_memberships`, así que la migración no cierra ningún agujero — **habilita** una función hoy denegada por RLS. La FK sí es `ON DELETE CASCADE` en prod (`confdeltype = 'c'`), así que ese riesgo era real.
  - **Un `test.skip` puede estar roto igual que el código que testea.** El guard del spec de asistencias contaba filas renderizadas para decidir si el día tuvo movimiento — y con un `?q=` que no matchea son cero también en un día con asistencias. Arreglado acá (mira si el buscador se renderizó); venía de la Fase 9.
  — Ema + Claude.
- 2026-09-28 — **Release v0.16.0 a producción: la Fase 10 completa.** PR [#71](https://github.com/EmaCrzz/actitud-bo/pull/71). **Con migración**, aplicada antes del release siguiendo el procedimiento completo.
  - **Orden respetado y verificado paso a paso:** ensayo transaccional contra los datos reales de prod (aplica limpio, ROLLBACK) → `db:push-prod` → verificación del schema resultante → auditoría de integridad → release. La auditoría dio **idéntica antes y después**: 0 pagos sin medio de pago, 0 asistencias duplicadas, 0 deriva del contador, 8 DNIs duplicados (deuda B5) y 8 clientes sin membresía. **No se movió ningún dato.**
  - **Estado del schema en prod, medido después de aplicar:** las tres columnas con el backfill correcto (5/5/3/2/1), la FK en `RESTRICT`, la policy de INSERT admin-only y el trigger de `last_update` activo.
  - **La corrección que dejó el pre-flight:** este plan y el ADR afirmaban que en prod podía haber una policy de INSERT abierta a cualquier `authenticated`, a partir del comentario de `20260630180001`. **Medido: no había ninguna.** Esa policy se eliminó después de julio, probablemente en `20260701160000`. O sea que la migración **no cerró ningún agujero** —nunca hubo exposición— sino que **habilitó** una función que RLS denegaba. Sin ella, crear un plan en prod fallaba.
  - **Lo que sí era un riesgo real y se arregló:** la FK de `customer_membership.membership_type` era `ON DELETE CASCADE` en prod, confirmado con `confdeltype = 'c'`. Borrar un plan borraba la membresía de todos sus clientes, y la policy de DELETE admin-only existe hace meses.
  - **Método que vale reusar:** las tres afirmaciones de seguridad de este ADR salieron de leer migraciones, y **dos de las tres se cayeron con una query**. Para cualquier claim sobre el estado de un entorno, medirlo antes de escribirlo — leer la migración que lo creó no alcanza, porque otra posterior pudo cambiarlo.
  — Ema + Claude.
- 2026-09-29 — **Relevada la [Fase 10b, Grupos de clientes](#fase-10b--grupos-de-clientes-familiares), y pausada.** Ema aportó 3 capturas de un flow que no estaba en el plan —figuraba como deuda de paridad a auditar recién en la Fase 15— y pidió volver a él antes de la Fase 13. Se relevó a fondo y se frenó ahí mismo a pedido suyo: *"esto está demasiado amañado, luego lo reviso con más atención"*. **Sin código; sólo este documento.**
  - **El panel del diseño ya está construido en v1, campo por campo**, con las claves de i18n existentes. Lo genuinamente nuevo es la tabla del listado, y es donde están todas las preguntas. La fase es bastante más chica de lo que la maqueta aparenta.
  - **Lo que decidió la forma del problema fue medir prod, no leer el Figma.** El diseño le da al grupo un plan, un estado y un vencimiento únicos; **3 de los 13 grupos reales no son homogéneos**, y en uno de ellos una integrante lleva un mes vencida mientras la otra está al día. Colapsar eso en una fila la vuelve una mentira silenciosa. Quedó como [decisión #17](#decisiones-abiertas--riesgos).
  - **Un cuarto grupo parecía divergente y no lo era: era el bug de timezone.** Leídas en UTC, las fechas de Ramirez-Arellano difieren; leídas en hora AR, coinciden. Levanté el número a cuatro y lo bajé a tres en el mismo relevamiento. **Corolario para la fase: toda comparación de vencimientos entre integrantes va en hora AR, o inventa divergencias.** De paso quedó medido que el arreglo del ADR de julio aguanta — 163 filas con la firma del bug hasta 2026-07, cero en agosto, y la única de septiembre es un valor de julio nunca reescrito.
  - **Dos hallazgos que el diseño no podía mostrar.** La regla se llama "2do integrante" pero el código la ofrece a **todos** los miembros del grupo: lo que la sostiene es la disciplina del operador, y ya hay un mes donde se aplicó a los dos. Y **eliminar un grupo borra la justificación de sus descuentos**: 5 pagos con descuento no tienen hoy ningún grupo al que atribuirse, porque el `ON DELETE CASCADE` se llevó las filas que lo probaban. Del segundo salió una decisión (baja lógica); del primero, la decisión explícita de **no** tocar la lógica de cobro y sólo mostrarla.
  - **Lo que deja como método:** es la segunda fase seguida —después de la 10— en la que una afirmación escrita a partir del código se cae al medirla contra producción. Acá fueron el conteo de grupos divergentes y la supuesta homogeneidad del modelo. **Para toda fase que reemplaza un flow existente, medir los datos reales antes de aceptar la premisa del diseño.**
  — Ema + Claude.
- 2026-09-30 — **Fase 11 (Gastos) completa.** Rama `feat/v2-gastos`, ADR [20260930121500](../architecture/decisions/20260930121500_v2-seccion-gastos-y-medio-de-pago.md). **Con migración aditiva** `20260929104500`, aplicada y verificada en dev.
  - **La decisión #8 se disolvió al medirla.** La pregunta era si backfillear los gastos históricos a efectivo. Son **29 gastos en tres meses** — no un histórico, el arranque del módulo. Y el backfill habría sido caro justo donde más pesa: $1,2M de alquileres y $399k de sueldos, los montos que menos se pagan en efectivo. El argumento que la cerró ni siquiera estaba en la pregunta: **`expenses` tiene un escritor que no es la UI** — el RPC de renovación inserta reintegros y no conoce el medio de pago, así que un `DEFAULT 'PAYMENT_CASH'` etiquetaría cada reintegro futuro sin que nadie lo decida. Nullable, y la pantalla muestra cuánta plata quedó sin clasificar en vez de dejar tres KPIs que no cierran.
  - **Quinta inferencia sin captura que sale mal.** Este plan describía la barra de filtros como "search + 3 dropdowns". Las capturas mostraron **search + dos datepickers de rango + un dropdown + un botón Exportar**, sin filtro por categoría, y con el export que el plan atribuía sólo a Ventas.
  - **Se encontró un bug que bloqueaba el alta de cliente un día de cada mes.** La suite falló en 8 specs sin relación con gastos. La causa: el 30/09 es el último día del mes, y el alta prellenaba "hoy → fin de mes" = las dos fechas iguales, que el validador rechaza. El panel de renovación ya lo resolvía con `buildRenewalPeriod`; el alta simplemente no usaba esa función. **La regla estaba documentada en su docblock desde la Fase 8 y no tenía un solo test** — se le escribieron 8.
  - **Cuatro correcciones salieron de la revisión de Ema, y dos afectaban también a Membresías.** (a) Los KPIs se calculaban sobre las filas visibles, así que filtrar por Efectivo hacía que "Total de gastos" mostrara el total en efectivo y afirmara que en el mes se gastó eso; ahora describen el período y la tabla la selección. (b) El chevron `›` del final de la fila era la **única zona muerta** de la fila, porque iba como `rowActions`, cuya celda frena la propagación para que un menú no dispare el click — **Membresías tenía el mismo defecto desde la Fase 10**. (c) Las últimas filas quedaban debajo del corte sin scroll: faltaba la ventana `flex-1 md:min-h-0 md:overflow-y-auto` que Clientes y Asistencias sí tienen — **también latente en Membresías**. (d) Se agregó orden por fecha, que el diseño no pide. `DataTable` gana `rowChevron` y `sort` por columna, transversales para la próxima tabla.
  - **Un bug propio que encontró su propio test:** `parseExpenseFilters` validaba las fechas de la URL sólo por forma. `2026-13-45` tiene la forma correcta, así que pasaba, ordenaba después del fin de mes, disparaba el swap de "rango invertido" y terminaba mandándole un mes 13 a Postgres. Ahora se valida que el día exista.
  - **Tres specs propios se mintieron antes de ser correctos, todos por lo mismo:** Radix marca con `aria-hidden` lo que queda de fondo y `getByRole` respeta el árbol de accesibilidad, así que **`toHaveCount(0)` sobre una fila da 0 al instante con cualquier modal abierto**. El assert pasaba antes de que el request terminara y la lectura contra la DB encontraba la fila viva. El borrado nunca estuvo roto — verificado aparte por curl contra la ruta real. Lección reusable: **en un test, "no lo encuentro" no significa "no está"**; para confirmar que una escritura ocurrió, esperar la respuesta HTTP, no un cambio de pantalla.
  — Ema + Claude.
- 2026-09-30 — **Release v0.17.0 a producción: la Fase 11 completa.** PR [#72](https://github.com/EmaCrzz/actitud-bo/pull/72). **Con migración**, aplicada antes del release.
  - **Orden respetado y medido:** línea de base de integridad → ensayo transaccional contra los datos reales de prod (aplica limpio, ROLLBACK) → `db:push-prod` → verificación del schema → auditoría → release. La auditoría dio **idéntica antes y después**: 0 pagos sin medio de pago, 0 asistencias duplicadas, 0 deriva del contador, 8 DNIs duplicados (deuda B5) y 8 clientes sin membresía.
  - **Estado del schema en prod, medido después de aplicar:** `payment_method` nullable sin default, el CHECK aceptando NULL y rechazando un valor fuera del vocabulario (probado con un INSERT real que abortó), el índice parcial creado, y **los 29 gastos existentes intactos** — 29 filas, $3.223.826, las 29 sin clasificar. No se movió ningún dato.
  - **Radio de impacto medido antes de desplegar, no asumido:** lo único que alcanza a un usuario de producción es la migración, porque los dos escritores de `expenses` —el form de v1 y el RPC de reintegros— no mandan la columna. El cambio a `getExpenses` es puramente aditivo: la ruta HTTP de v1 sólo manda `month` y `category`. Todo lo demás es v2, y prod tiene **0 usuarios con el flag**.
  - **Lo que quedó sin red automática:** el cambio del AppShell (el contenedor de scroll pasó al nivel que contiene al header, para que el scrollbar de 8px no dejara el card corrido). Afecta a las siete pantallas y **no tiene test**: el que se escribió comparaba las cajas del header y del card y **pasaba igual con el bug presente**, porque el Chromium de Playwright usa scrollbars overlay y ahí la desalineación no existe. Se descartó en vez de dejarlo en verde sin significado, y se verificó a ojo en el preview. **Un test que no puede fallar es peor que ninguno.**
  - **El release volvió a esquivar la protección de rama de `main`** (`Bypassed rule violations: Changes must be made through a pull request`). Es la tercera vez que queda registrado; sigue sin resolverse si el script abre un PR de release o si la excepción se documenta como deliberada.
  — Ema + Claude.

- **2026-10-01 — Fase 12 cerrada: Ventas = cuotas + productos.** Rama `feat/v2-ventas`, ADR [20261001100524](../architecture/decisions/20261001100524_v2-seccion-ventas.md).
  - **Decisión #5 resuelta por Ema** (sin stock, sin catálogo, editar/borrar como Gastos) y **alcance ampliado por las capturas**: el panel "Nueva venta" ofrece Membresía, así que la sección lista todo lo cobrado. Las cuotas no se copian a `sales`: cada peso vive en una sola tabla.
  - **Migración aditiva `20261001100524`** (tabla `sales`, RLS admin-only). Ensayada en dev y prod, aplicada en dev con auditoría idéntica. **Va a prod antes del release.**
  - **Medido en prod antes de decidir**: 108 cuotas en septiembre (la unión en memoria alcanza), 0 cuotas sin medio de pago, 4 de 4 usuarios admin, FK de `membership_payments.customer_id` en NO ACTION.
  - **Extraído de Gastos para no duplicarlo**: rango de fechas, CSV y KPI. Los 19 tests de Gastos pasaron sin cambios.
  - **Bug latente arreglado**: `getExpenses` devolvía `[]` ante un error y el cartel de error de Gastos no aparecía nunca.
  - **Cuota de Figma agotada en 2 llamadas**; las 13 capturas quedaron en `docs/v2/figma/ventas/`, que es la salida que proponía la decisión #10.
  - **Después de la prueba de Ema**: filtro de concepto, placeholder de "Datos de referencia", y el desborde a 360px, que resultó global — `grid-cols-[minmax(0,1fr)]` en el body y `min-w-0` en los `truncate` de `Select`/`DatePicker`. Queda medida la deuda de tablet (768px) en Gastos, Clientes y Membresías.
  — Ema + Claude.

- 2026-10-01 — **Release v0.18.0 a producción: la Fase 12 completa.** PR [#73](https://github.com/EmaCrzz/actitud-bo/pull/73). **Con migración**, aplicada antes del release.
  - **Orden respetado:** ensayo transaccional contra prod (una sola migración pendiente, aplica limpio, ROLLBACK) → línea de base de integridad → `db:push-prod` → verificación del schema → release → auditoría. La auditoría dio **idéntica antes y después**.
  - **Estado del schema en prod, medido después de aplicar:** `sales` con RLS activa y las 4 políticas admin-only, FK a `customers` en NO ACTION, los cuatro CHECK, 0 filas, y la migración registrada en `schema_migrations`. **El CHECK de comprador único se probó con un INSERT real** (cliente + `buyer_name`) que lo rechazó, dentro de una transacción con ROLLBACK.
  - **Deploy verificado:** estado de Vercel `success` sobre `da24be2`; prod responde 200 y `POST /api/sales` sin sesión devuelve 403.
  - **Lo que alcanza a un usuario de producción, que hoy es sólo v1:** el `grid-cols-[minmax(0,1fr)]` del `<body>` (v1 medida sin desbordes de 320 a 1440) y que `getExpenses` / `getMembershipPayments` ahora tiran ante un error de la DB en vez de devolver `[]`. Nada de Ventas: 0 usuarios con `v2_access`.
  - **Viajó también `66891ae`** (silenciar los 404 de devlog y del service worker en desarrollo), que estaba en la rama de Ventas. Es sólo de dev.
  - **El release volvió a esquivar la protección de rama de `main`** (`Bypassed rule violations`). Cuarta vez registrada; sigue sin resolverse.
  — Ema + Claude.

- **2026-10-01 — Fase 13 cerrada: Balance.** Rama `feat/v2-balance`, ADR [20261001154047](../architecture/decisions/20261001154047_v2-balance.md). Sin migraciones.
  - **Medido antes de diseñar**: tres meses de datos reales (julio–septiembre 2026), ningún gasto con medio de pago, y un resultado que varía 4× de un mes a otro por los egresos. Eso definió los bloques nuevos.
  - **Decidido con Ema**: navegador de mes, los bloques propuestos, y el ciclo de cobro / pendientes de v1 en espera hasta la Fase 15.
  - **Cuadre verificado de punta a punta**: el spec e2e compara Ingresos con el Total cobrado de Ventas y Egresos con el Total de gastos de Gastos para el mismo mes.
  - **Corregido en el plan**: el "Resumen del día" del home nunca sumó montos; la deuda que se le había anotado no existía.
  — Ema + Claude.

- 2026-10-02 — **Release v0.19.0 a producción: la Fase 13 completa.** PRs [#74](https://github.com/EmaCrzz/actitud-bo/pull/74) y [#75](https://github.com/EmaCrzz/actitud-bo/pull/75). **Sin migraciones.**
  - **`develop` no pasaba `type-check`** después del #74: un cast directo en `getEarliestBalanceMonth` (TS2352). No rompía el build porque `next.config` tiene `ignoreBuildErrors: true`, y justamente por eso pasó desapercibido. Se arregló en el #75 antes del release. Unit tests: 172 en verde.
  - **Deploy verificado:** estado de Vercel `success` sobre `f023e5c`; prod responde 200.
  - **Lo que alcanza a un usuario de producción, que hoy es sólo v1:** `getMonthlyStats` suma `sales`. Sin efecto visible mientras `sales` siga sin filas. 0 usuarios con `v2_access`.
  - **El release volvió a esquivar la protección de rama de `main`** (`Bypassed rule violations`). Quinta vez registrada.
  - **Higiene del plan:** el grupo de la Fase 10b pasó de B13 a **B15**, porque B13 ya era "Sin membresía" (cerrada en la Fase 7); se actualizaron "Estado de entornos", "Migraciones" y la nota de "No hacemos ahora" sobre tests.
  — Ema + Claude.

- 2026-10-02 — **Fase 10b cancelada: el grupo familiar pasa a ser una promoción.** Rama `feat/v2-descuento-por-promocion`, ADR [20261002120000](../architecture/decisions/20261002120000_grupo-familiar-como-promocion.md). Sin migración.
  - **Medido antes de decidir**: 13 grupos, 27 integrantes (~27% de los que pagaron en septiembre), $20k–32k de descuento por mes. **No hay titular: hay un orden de pago.** El primero paga completo, los demás tienen descuento, y quien viene solo no lo tiene.
  - **La sugerencia por grupo fallaba en ~45% de los cobros** y quien cobraba la corregía a mano. Era peor de lo que parecía, porque un olvido regalaba el descuento en silencio.
  - **Se compararon tres modelos** (grupos, planes "familiares", promoción al cobrar). Los planes paralelos se descartaron con números: duplicaban el costo del descuento y no podían expresar "el primero paga completo".
  - **v2**: el select Promociones del panel de renovación lista las reglas activas, arranca vacío, con nota opcional y excluyente con el descuento manual. Resumen y comprobante muestran la promo. **v1 sin cambios.**
  - **Cerrado**: la decisión #17 queda obsoleta; B14 y B15 dejan de hacer falta. **Movido**: el ABM de promociones y el rename de la regla, a la Fase 14.
  — Ema + Claude.

- 2026-10-02 — **Release v0.20.0 a producción: la promoción al renovar.** PR [#77](https://github.com/EmaCrzz/actitud-bo/pull/77). **Sin migraciones.** Deploy verificado (Vercel `success` sobre `ce26ed5`, prod responde 200). Sin efecto para v1: 0 usuarios con `v2_access`. El release volvió a esquivar la protección de rama de `main` (sexta vez).
- 2026-10-02 — **"Ver perfil" del modal de asistencia abre el perfil de v2** (`fix/v2-ver-perfil-desde-asistencia`). Antes navegaba a `/customer/{id}`, que es v1. Ahora reemplaza el modal por el panel de perfil sin salir del home, y desde ahí se renueva. De paso, el modal muestra un error en vez de "Sin membresía" falso cuando falla la lectura. Spec e2e nuevo en `attendance.spec.ts`, que da rojo con el link viejo. Sin ADR: aplica en el home el patrón que ya usaba Clientes — Ema + Claude.
- 2026-10-02 — **Aviso de medio mes fuera de la política** (`feat/v2-aviso-medio-mes`). Si se elige "Medio mes" con un período que arranca antes de `halfMonthStart` (16), aparece un aviso debajo de las fechas: *"cubre hasta el {fin} a mitad de precio"*. **No bloquea ni corrige fechas**, por la regla de "sugerir sin imponer". Va en la renovación y en el alta. Regla pura con 6 unit tests (4 de 4 mutaciones detectadas) y spec e2e para las dos pantallas. Sin ADR: aplica una regla de la política existente, sin decisión de diseño nueva — Ema + Claude.
