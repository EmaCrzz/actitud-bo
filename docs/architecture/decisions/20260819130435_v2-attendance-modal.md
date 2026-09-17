# ADR: Modal de registrar asistencia — v2 Home

**Fecha:** 2026-08-19  
**Estado:** Aceptado  
**Rama:** feat/v2-attendance-modal

---

## Contexto

El home v2 tiene un search bar para encontrar clientes. El diseño del Figma define un flujo de dos pasos:

1. El usuario busca y selecciona un cliente → el botón "Registrar asistencia" se habilita.
2. Al clickar el botón se abre un panel lateral (Sheet) con info del cliente: membresía activa y asistencias de la semana, más un CTA de confirmación.

La v1 resuelve esto con una navegación completa a `/register/assistance/[id]`, que carga una página aparte con tabs. En v2 el flow es in-place para no interrumpir el contexto del home.

---

## Decisiones técnicas

### 1. Fetch de datos del modal en cliente (browser Supabase)

El search ya devuelve `membership_type` pero **no** `expiration_date` ni las asistencias de la semana. Al abrir el modal se necesitan esos dos campos extra.

**Opción elegida:** `fetchCustomerModalData(id)` en `assistance/api/client.ts`, que llama al browser Supabase client directamente (igual que `searchCustomer`) con dos queries en paralelo: `customer_membership` (type + expiration_date) y `assistance` del rango lunes→domingo AR.

**No se usó:** un API Route ni una Server Action. La llamada es idéntica en patrón a todas las del dominio `api/client.ts`, y el dato no es más sensible que el que ya circula en el search. Agregar una capa HTTP extra no agrega nada.

**Sin rate limiting:** `fetchCustomerModalData` no se expone a `withRateLimit` porque es una llamada one-shot por click, no un input de alta frecuencia. El endpoint de `createAssistance` sí tiene rate limiting.

### 2. Estado de selección en `AttendanceSearchCard`

`selectedCustomer: Customer | null` vive en el card. Al seleccionar un resultado del dropdown:
- Se setea `selectedCustomer` y se limpia el query (dropdown desaparece).
- Se muestra un chip con el nombre + botón X para limpiar la selección.
- El CTA "Registrar asistencia" pasa de `disabled` a activo.

Al cerrar el modal, `selectedCustomer` se resetea a null para dejar el card limpio.

### 3. Sheet lateral (`side='right'`)

Se reutiliza el `Sheet` de shadcn (ya instalado desde fase 1.5). `SheetContent` recibe `data-v2='true'` para heredar los tokens v2 (el portal de Radix monta fuera del wrapper `[data-v2]` — misma solución que el sidebar mobile, documentada en fase 1.5).

El `SheetTitle` cumple el requisito de accesibilidad (dialog necesita título). El botón de cierre custom (✕) reemplaza el `showCloseButton` del primitivo para controlar el estilo.

### 4. Slots de asistencia semanal

Los slots son **contadores de consumo, no días de la semana**: el slot N lo ocupa la N-ésima asistencia de la semana (lunes→domingo AR), sin importar en qué día caiga. `buildWeekSlots(count, assistances)` en `src/assistance/utils.ts` ordena las asistencias de la semana ascendente, deduplica por día calendario AR y las asigna en orden; los slots restantes quedan vacíos (`—`).

**Descartado — mapeo slot N → día N de la semana** (DIA 1 = Lunes, DIA 2 = Martes, …), que fue la primera implementación de este PR. Esconde asistencias, no solo las desordena:

- Un cliente de 3 días que va **mié/jue/vie** tendría slots Lun/Mar/Mié: su visita del miércoles aparece en el slot 3 (cuando es la primera del ciclo) y **jue y vie no se renderizan en ninguna fila** — el modal reporta 1 de 3 usados cuando usó 3.
- Cualquier asistencia de sábado o domingo se pierde igual: el fetch las trae (el rango es Lun→Dom) pero no existe slot para ellas.

La membresía habilita *una cantidad de días por semana*, no *días específicos de la semana*, así que el contador es el modelo fiel al negocio. Como efecto colateral el helper ya no necesita construir fechas: no depende de `getWeekRangeInAppTz` / `shiftIsoDateInAppTz`, y cada fila formatea su etiqueta desde la `assistance_date` real.

La cantidad de slots depende del tipo de membresía (`SLOTS_BY_TYPE`): VIP y 5 días → 5, 3 días → 3, 2 días → 2, diario → 1. Sin membresía o tipo desconocido → default 5.

**Exceso de cuota:** si hay más asistencias que slots (registros manuales, cliente que vino más veces de las que paga), se devuelven filas extra marcadas `overQuota` con el número de día en `text-destructive` en vez de descartarlas — el exceso es exactamente el dato que el staff necesita ver.

### 5. Formateo de hora en timezone AR (cliente)

La `assistance_date` llega como ISO UTC. Para mostrar "17:43" se usa `Intl.DateTimeFormat` con `timeZone: APP_TIMEZONE` — sin `date-fns-tz` ni librerías extra. Compatible con todos los browsers modernos.

El nombre del día ("Lunes 02") también se formatea con `Intl.DateTimeFormat` (locale `es-AR`, `weekday: 'long'` + `day: '2-digit'`), evitando agregar strings adicionales al diccionario i18n.

### 6. Confirmación y refresh

Al confirmar la asistencia: `createAssistance` (ya existente en `assistance/api/client.ts` con rate limiting) → toast de éxito → modal se cierra → `router.refresh()` para revalidar los Server Components del home (daily summary count, weekly attendance).

`router.push(HOME)` de v1 no aplica: en v2 el home es la página actual.

### 7. "Crear nuevo cliente" en el dropdown

El dropdown siempre muestra la opción "+ Crear nuevo cliente" al pie, independientemente de si hay resultados. Enlaza a la ruta v1 `/customer/new` (no existe aún ruta v2 para nuevo cliente). Es un `<Link>` estático, no un estado del modal.

### 8. Área de avisos entre la lista y el CTA

Cuando el fetch inicial devuelve una asistencia de hoy, el espacio libre entre la lista de días y el CTA muestra un aviso centrado con la hora del registro. El CTA ya estaba deshabilitado en ese caso pero sin explicar por qué; el aviso cierra ese hueco.

**La condición se deriva de `modalData.weeklyAssistances`, no del merge optimista `allAssistances`.** Es la distinción que da sentido al aviso: es "cuando volviste a buscar al cliente ya estaba registrado", no "acabás de registrarlo". Si saliera del merge optimista, aparecería de golpe junto a la animación del check, pisando el feedback de la confirmación que se acaba de hacer. Como `confirmedAt` se resetea al reabrir el modal (efecto sobre `[open, customer]`) y el refetch trae la asistencia recién creada, la segunda visita al mismo cliente sí muestra el aviso.

#### Ya registró asistencia hoy

El ícono es un `SuccessTick` con `playing={false}` (estado final estático) por la misma razón que los slots: mezclar familias de íconos en el mismo panel se nota.

El texto reusa `assistance.alreadyRegisteredToday`, que ya existía para el alert equivalente de v1 (`assistance-alert-today.tsx`) — de paso se le corrigieron los acentos faltantes. La hora va en una key nueva, `v2.home.attendanceModal.registeredAtTime`.

#### Membresía vencida

Segundo aviso, con `AlertContainedIcon` en `--color-feedback-warning`: título "Membresía vencida" e instrucción de entrar al perfil del cliente para renovarla — el botón "Ver perfil" del footer ya está ahí abajo, así que el aviso no necesita su propio link.

**El aviso informa, no bloquea:** el CTA sigue habilitado y la asistencia se registra igual. La política del negocio es que una membresía vencida es una anomalía a resolver, no una razón para negarle la entrada al cliente en el mostrador.

Se muestra solo cuando `membership != null && isExpiredInAppTz(expiration_date)`. Vencida ≠ sin membresía: al cliente sin ninguna membresía el badge ya le dice "Sin membresía" y no hay nada que renovar, así que no le corresponde este aviso.

#### Los dos avisos conviven

Vencida y ya-registrado son hechos independientes y ninguno reemplaza al otro, así que `NoticeArea` puede renderizar los dos apilados. La vencida va primero porque es la única que pide una acción del staff. Con ambos avisos el body scrollea si no entra (`flex-1 shrink-0` sobre el área, dentro de un contenedor `overflow-y-auto`).

**Deuda saldada de paso:** `en.json` no tenía el bloque `v2.home.attendanceModal` ni `attendanceSearch.createNewCustomer` — se agregaron para dejar los diccionarios en paridad.

---

## Archivos creados / modificados

| Acción | Archivo |
|--------|---------|
| modificado | `src/assistance/api/client.ts` — `fetchCustomerModalData` + `CustomerModalData` |
| creado | `src/assistance/utils.ts` — `buildWeekSlots` (slots como contadores de consumo) |
| creado | `src/home/components/v2/AssistanceModal.tsx` |
| modificado | `src/home/components/v2/AttendanceSearchCard.tsx` |
| modificado | `src/lib/i18n/dictionaries/es.json` — keys `v2.home.attendanceModal.*` + `createNewCustomer` |
| modificado | `src/lib/i18n/dictionaries/en.json` — bloque `v2.home.attendanceModal` faltante + `createNewCustomer` |

---

## Consecuencias

- **Reutilización:** `createAssistance`, `useCustomerSearch`, `isSameDayInAppTz`, `isExpiredInAppTz`, y todos los helpers de timezone se reusan sin modificación.
- **Sin migración de DB:** el schema de `assistance` y `customer_membership` cubre exactamente lo que el modal necesita.
- **Deuda pendiente:** el botón "Registrar pago" de Quick Actions y el flujo de "Nuevo cliente" siguen siendo placeholders — se resuelven en próximos PRs.
