# Rediseño de /incomes — de listado de clientes a dashboard financiero

**Fecha:** 2026-07-28
**Autor:** ema_villanueva@hotmail.com
**Rama:** feat/incomes-dashboard

## Descripción

La pantalla `/incomes` se resolvía reutilizando el componente `CustomerActives`: una lista de socios con su último pago colgado en un accordion. Bajo el rótulo "Ingresos" el usuario veía nombres de clientes, no plata. Los números concretos (total del mes, breakdown, tendencia) estaban en `/stats/accounting` o escondidos dentro del accordion. La sensación era la de un directorio de socios, no la de un panel de ingresos.

El rediseño convierte la pantalla en un dashboard financiero mobile-first pensado para responder de un vistazo: cuánto entró, cómo va el ciclo de cobros de este mes, de dónde vienen los ingresos, y qué actividad hubo. Todo derivado de datos ya existentes (`membership_payments`, `customer_membership`, `types_memberships`, `discount_rules`), sin nuevas migraciones.

## Decisiones

### Decisiones de negocio

- **Sin proyectado / "lo que debería entrar si todos renuevan".** Se descartó por débil (asume comportamiento uniforme) a favor de una métrica más concreta: **progreso del ciclo de cobro del mes en curso**. Motivación: la operativa real de Actitud cobra membresías del 1 al 10 con recargo del 11 en adelante, entonces "cuántos de los que deben pagar este mes ya cumplieron" es información accionable todos los días del mes, no una proyección teórica.
- **Ingresos es solo lectura.** El alta de pagos ocurre en el perfil del socio (flujo existente), no acá. Este PR ni siquiera incluye editar/borrar desde el feed — el feed es puramente informativo.
- **"Vencidos" desaparece como bloque protagonista.** Bajo la operativa de Actitud (cobro fijo 1-10 + recargo día 11+ + media membresía para altas del 15+), no deberían llegar socios al final del mes sin pagar. Vencidos pasa a ser una anomalía dentro del bloque "Cobros del mes" (los pendientes que quedan avanzado el mes), no una sección propia. La ex-sección "Próximos vencimientos" se elimina — bajo esta política, prácticamente todos vencen fin de mes, no aporta.
- **"Ver todos los pagos" no existe como link.** Sería redundante con la vista de clientes activos ya accesible desde su menú.
- **VIP y DAILY se excluyen del ciclo de cobros.** VIP no cobra periódicamente. DAILY es un pase de un día que no genera deuda cuando no se renueva — el pase se consumió, se pagó, no hay ciclo mensual asociado. Los pases DAILY siguen apareciendo en el resto del dashboard (Hero, breakdown por tipo, medio de pago, feed) porque son ingresos válidos; solo salen del bloque "Cobros del mes" para no aparecer como pendientes falsos.
- **Asistencia en el mes como "señal de vida" en el denominador.** Además de tipo renovable + expiración en el mes, un socio solo cuenta si tiene al menos una asistencia registrada en el mes consultado. Motivación: sin este filtro, un socio que dejó de venir (churn silencioso) sigue apareciendo como pendiente porque su `expiration_date` cae dentro del mes por la lógica de "fecha de pago + N días". Validado con datos reales: al aplicar el filtro, la lista de 27 pendientes (bajo criterios anteriores) bajó a 7 pendientes accionables — todos con actividad real en el mes. Los 20 filtrados son bajas silenciosas que no representan deuda cobrable. Este mismo patrón ya se usaba en `getPendingPaymentCustomers` (asistencia como señal de vida), acá se replica con la misma semántica pero mediante una función compartida `filterByAssistanceInRange`.
- **Denominador del ciclo:** socios cuyo `customer_membership` cumple `expiration_date >= startOfMonth`, `membership_type` no en `[VIP, DAILY]`, y con al menos una asistencia registrada en el rango del mes consultado.
- **Comparativa fija de 6 meses.** Suficiente para percibir tendencia estacional del gym. Scroll horizontal con más historia queda como iteración futura.
- **Feed de últimos pagos: 5 items fijos, sin acciones.** Simple y predecible. Interacciones (drill-down, edición) quedan para PRs futuros.

### Decisiones técnicas

- **Un endpoint bundled `GET /api/accounting/incomes-summary?month=YYYY-MM`.** Devuelve todos los datos que la pantalla necesita en una sola llamada. Evita 6–7 waterfalls y coordina un único skeleton. Trade-off: si una sub-consulta es lenta, ralentiza toda la pantalla. Con el volumen actual (≈500 clientes, ≈50 pagos/mes) el costo es despreciable.
- **Módulo `src/accounting/billing-policy.ts`** con la política de cobro de Actitud hardcodeada, pero expuesta a través de funciones semánticas (`getCyclePhase`, `isWithinGracePeriod`) para facilitar la migración a config por tenant cuando aparezca el segundo cliente. Los consumidores no dependen del valor 10 sino del concepto "fin de la ventana de gracia".
- **Sin librería de charts.** El comparativo de 6 meses se resuelve con `div`s con `width%`. Se evita agregar Recharts/Tremor para 6 valores.
- **Nuevas funciones en `src/accounting/api/server.ts`** en vez de extender `getMonthlyStats`. Motivo: `getMonthlyStats` se usa desde `/stats/accounting` con una semántica distinta (un mes solo, sin breakdown). Extenderla acoplaría dos consumidores con necesidades diferentes.
- **Los cálculos de agregación viven en TypeScript**, no en RPCs de Supabase, para PR1. Si la performance lo pide, se puede promover a RPC después (el patrón ya existe con `get_membership_stats`).
- **Página convertida a client component.** Necesita `useMonthNavigation` (query params) y state para el mes seleccionado. La barrera de admin se mantiene en el `layout.tsx` (server component con `requireAdminOrRedirect`).
- **Componentes nuevos aislados en `src/accounting/components/incomes/`.** No se tocan los componentes existentes de `/stats/accounting` — el nuevo dashboard vive paralelo.

### Drill-down desde el dashboard

- **CTA "ver pendientes" desde el bloque Cobros del mes.** El contador "N pendientes" no es un dato ciego: se conoce cliente + tipo + expiración. Convertirlo en botón que abre modal con la lista permite al operador tomar acción (contactar). Sin esto, el dashboard obligaría a ir a otra pantalla o consultar la DB para actuar sobre los pendientes.
- **Cada fila de "Por tipo de membresía" es clickeable.** Abre modal con los pagos del mes de ese tipo, agrupados por cliente, con badge `xN` para clientes que compraron más de un pase. Motivación principal: detectar power-users de DAILY (varios pases en el mismo mes) — información útil para decidir si conviene que se suscriban a una membresía renovable.
- **Modales lazy (`enabled: isOpen` en react-query).** Los detalles no se pre-cargan con el summary bundled. Si el operador nunca abre el modal, no paga por esos datos. Trade-off: hay latencia al abrir; se mitiga con skeleton dentro del modal.
- **Dialog centrado (shadcn) en lugar de bottom sheet.** El componente `Sheet`/`Drawer` no está instalado; agregarlo por dos modales inflaba dependencias. El `Dialog` existente con `max-h-[85vh]` y scroll interno se comporta razonablemente en mobile. Se puede migrar a Sheet en el futuro si el patrón se generaliza.
- **Endpoints separados** (`/incomes-pending`, `/incomes-by-type`) en vez de un endpoint monolítico. Cada drill-down tiene semántica y filtros propios; separarlos evita un endpoint gigante y facilita cachear de forma independiente en react-query.

### Decisiones descartadas

- **Bottom sheet con detalle + editar/borrar al tap de un pago.** Descartado tras revisar que el patrón existente en `/expenses` es dropdown + página de edición + AlertDialog (no bottom sheet). Editar/borrar pagos desde el feed queda fuera de PR1 porque requiere crear una página de edición de pagos que hoy no existe.
- **Ventana rolling de 30 días para "vencidos".** Se discutió como solución al problema de rollover mensual, pero bajo la política de Actitud "vencidos" deja de ser el foco del panel, así que la ventana rolling deja de ser necesaria.
- **Bloque "Requiere atención" con vencidos + próximos vencimientos.** Reemplazado por "Cobros del mes" que es informativo todos los días, no solo cuando hay anomalías.

## Consideraciones de seguridad

- **Autenticación / Autorización:** el endpoint nuevo `/api/accounting/incomes-summary` requiere rol admin (llama a `requireAdmin`). El `layout.tsx` de `/incomes` ya redirige no-admins vía `requireAdminOrRedirect`.
- **Exposición de datos:** el resumen incluye nombres de socios en `recent_payments`. Ya expuestos por endpoints admin existentes; sin cambio de superficie.
- **Validación de input:** el único input es `month` (formato `YYYY-MM`). Se valida con el mismo patrón que `/api/accounting/stats`.
- **Dependencias:** no se agregan librerías nuevas.
- **Infraestructura:** sin cambios de esquema DB, sin migraciones.

## Plan

### Fase 1 — Setup

1. Crear rama `feat/incomes-dashboard` desde `develop`.
2. Crear este ADR con el Plan.

### Fase 2 — Data layer

3. Crear `src/accounting/billing-policy.ts` con la política hardcodeada y funciones semánticas.
4. Extender `src/accounting/types.ts` con los tipos del summary bundled (`IncomesSummary` y sus sub-tipos).
5. Extender `src/accounting/api/server.ts` con:
   - `getIncomesCobrado(month)` — total, count, promedio, delta vs mes anterior.
   - `getBillingCycleProgress(month)` — denominador, paid, paid con recargo, pending.
   - `getPaymentBreakdownByType(month)` — group by membership_type.
   - `getPaymentBreakdownByMethod(month)` — group by payment_method con %.
   - `getMonthlyDiscounts(month)` — total, count, y agrupado por regla.
   - `getRecentPayments(limit)` — últimos N pagos con datos del cliente.
   - `getLast6MonthsIncome()` — array de {month, total} para el comparativo.
   - `getIncomesSummary(month)` — función paraguas que orquesta las anteriores.
6. Crear `src/app/api/accounting/incomes-summary/route.ts` con GET.
7. Extender `src/accounting/api/client.ts` con `getIncomesSummary(month)`.
8. Crear `src/accounting/hooks/useIncomesSummary.ts` con `useQuery`.

### Fase 3 — UI

9. Crear componentes en `src/accounting/components/incomes/`:
   - `skeletons.tsx` — skeletons coordinados.
   - `hero-cobrado.tsx` — total del mes + delta.
   - `billing-cycle-progress.tsx` — progreso + fase (grace/surcharge).
   - `by-membership-type.tsx` — breakdown con barras.
   - `payment-method-card.tsx` — %s por método.
   - `discounts-card.tsx` — total descontado + reglas.
   - `recent-payments-feed.tsx` — 5 últimos pagos read-only.
   - `monthly-comparative.tsx` — barras de 6 meses.
10. Extender `src/lib/i18n/dictionaries/es.json` y `en.json` con las keys nuevas bajo `accounting.income.dashboard.*`.

### Fase 4 — Integración

11. Reescribir `src/app/[lang]/[tenant]/incomes/page.tsx` como client component que compone los bloques.

### Fase 5 — Verificación

12. `npm run type-check` y `npm run lint` — ambos deben pasar.
13. Reportar cambios + checklist manual para preview.

## Lecciones aprendidas

- **Validar los números del dashboard contra la DB antes de mergear.** La primera versión mostraba "23 pendientes" a fin de mes bajo una política de cobro 1-10, cifra que sonaba alta. Correr queries reales reveló dos problemas: (a) los pases DAILY estaban inflando el denominador, y (b) hay un desync de datos históricos donde `customer_membership.last_payment_date` está seteado pero no existe fila correspondiente en `membership_payments`. El primero se arregló acá; el segundo queda como ticket aparte porque requiere investigación de origen (¿flujo viejo de renovación?, ¿migración incompleta?) y probablemente backfill.

- **Excluir DAILY del ciclo aclara la semántica.** DAILY es fundamentalmente distinto: es un pago único que consume una entrada, no genera compromiso futuro. Un cliente DAILY que no vuelve no es un "deudor". Trataruos DAILY como membresía renovable produce "pendientes fantasma".

- **Un solo criterio de exclusión centralizado** (`CYCLE_EXCLUDED_MEMBERSHIP_TYPES`) previene divergencia entre denominador y numerador. Si en el futuro aparece otro tipo no-renovable, se agrega al array y ambos filtros lo respetan por construcción.

- **"Vencido" y "churn silencioso" son fenómenos distintos.** El descubrimiento de que 20 de 27 "pendientes" no habían venido en el mes reveló que estábamos mezclando dos conceptos: (a) socios que le deben plata al gym y siguen viniendo — accionables por el operador; (b) socios cuya membresía sigue vigente por fecha pero que dejaron de venir — bajas silenciosas, no cobrables. El fix separa ambos: el bloque "Cobros del mes" solo muestra el grupo (a). Cuando aparezca la necesidad de gestionar (b), será un dashboard/pantalla propio (retención / posibles bajas), no una métrica del panel de ingresos.

- **La lógica actual de `expiration_date` (fecha de pago + N días) no matchea la política real (cobro 1-10 del mes calendario).** Un socio que paga el 3 de junio queda con expiration = 3 de julio, no 30 de junio. Bajo la política del gym, cubrió junio y punto. Alinear `expiration_date` al fin de mes de cobertura es un cambio de fondo que requiere ADR propio + migración/backfill; queda como ticket separado. Mientras tanto, el filtro de asistencia mitiga el síntoma en el dashboard.

- **El modelo temporal real es aniversario pero se "corrige" a mes calendario en la práctica.** Debate posterior clarificó: técnicamente es aniversario puro (cliente que entra el 12 vence el 12 del mes siguiente), pero al renovar tarde el staff manualmente setea la nueva expiración a fin de mes para resincronizar. Con el tiempo esto acerca la operativa real al modelo calendario. La ventana de recargo se activa por día del mes calendario (no por aniversario personal), lo cual es coherente con "cobrar según el reloj, no según la ficha del cliente".
- **Valores de la policy corregidos**: gracePeriodEnd pasó de 10 → **15**, surchargeStart pasó de 11 → **16**. En la primera pasada asumí "cobro 1-10" pero la operativa real es "cobro 1-15, recargo del 16". Cambio trivial gracias a que los valores están centralizados en `ACTITUD_BILLING_POLICY` y los consumidores acceden por nombre semántico (validación del patrón "hardcodear con nombres semánticos").
- **Denominator estricto por aniversario queda como ticket aparte.** Hoy el denominator usa `expiration_date >= startOfMonth` (activos y futuros). Bajo un modelo aniversario estricto debería ser `expiration_date IN [startOfMonth, endOfMonth]` (solo los que cumplen aniversario en el mes consultado). El filtro de asistencia enmascara el problema hoy, pero el criterio semánticamente correcto requiere una iteración adicional.
