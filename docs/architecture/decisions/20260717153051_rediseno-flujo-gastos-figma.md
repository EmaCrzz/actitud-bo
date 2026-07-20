# Rediseño del flujo de Gastos según Figma

**Fecha:** 2026-07-17
**Autor:** emanuel@getlenk.com
**Rama:** feat/expenses-screen-redesign

## Descripción

Rediseño visual del flujo de Gastos (lista + alta) para alinearlo con las
propuestas de Figma. El trabajo es **exclusivamente de UI/front**: no se tocó
la base de datos, ni migraciones, ni la capa de API/servidor. Se trabaja con
las columnas existentes de la tabla `expenses` (`description`, `amount`,
`category`, `expense_date`, `notes`).

Frames de referencia (Figma "Registro de asistencias | Diseño"):
- Lista con datos (`4777-19788`)
- Lista vacía (`4777-19779`)
- Nuevo gasto (`4777-19771`)

## Decisiones

### Decisiones de negocio

- **La descripción sigue siendo el identificador visible del gasto.** El frame
  mostraba la categoría como título de fila, pero dentro de un mismo mes puede
  haber varios gastos de la misma categoría (dos "Servicios", etc.). Se resolvió
  con la anatomía: **título = `description`**, subtítulo = `categoría · fecha`.
  Es un ajuste menor respecto del frame, coherente con el propio copy del form
  ("indica qué fue y cuánto costó").
- **Se unifica a un solo campo de texto en el alta manual: "Descripción".** El
  form dejó de exponer `notes`. La columna `notes` **no se elimina**: la siguen
  escribiendo los flujos automáticos (reintegros por downgrade, vencimientos)
  como contexto interno. Simplemente no se expone ni se envía desde el alta
  manual.
- **El form vuelve a pedir categoría y fecha.** Un WIP previo
  (`wip-expenses-screen-figma`, ahora descartado) las había eliminado
  hardcodeando `OTHER` + hoy. Los frames nuevos las reincorporan como campos
  explícitos, y esa es la dirección vigente.
- **Se retira la categoría "Suministros" (`SUPPLIES`)** del listado seleccionable
  por no usarse en la operación. Se elimina de la lista canónica, del mapa de
  colores y de las traducciones; los aliases legacy en español dejan de mapear a
  `SUPPLIES`. Filas históricas con ese valor (si las hubiera) caen a `OTHER` vía
  `normalizeCategoryValue` — es normalización de display, sin tocar la base.
- **Se corrige un bug de UX del estado vacío:** antes el botón `+` para crear el
  primer gasto vivía dentro de una card que solo se renderizaba cuando había
  gastos, dejando el estado vacío sin forma de cargar el primero. Ahora la card
  "Resumen de gastos" y su `+` están siempre visibles, con el mensaje
  "No hay egresos registrados" adentro.

### Decisiones técnicas

- **Cero cambios de base de datos.** No se crean migraciones, no se modifica
  `src/accounting/api/server.ts` ni los tipos de `CreateExpenseData`. Sacar
  `notes` del alta manual es solo dejar de incluir la key en el payload de
  `createExpense`.
- **Total del mes como número grande centrado** (reemplaza la card sticky con
  label inline). Se sigue calculando client-side sumando los gastos del mes ya
  fetcheados por `useExpenses`; visible también en vacío (`$0`).
- **Categoría en la fila como texto plano** (no badge de color). Se respeta el
  frame; los helpers `normalizeCategoryValue` / `getCategoryTranslationKey` se
  conservan para traducir el valor. El mapa `EXPENSE_CATEGORY_COLORS` queda sin
  uso en la lista pero se deja en `consts.ts` por si se reinstauran los badges.
- **Reutilización del WIP descartado:** se rescataron claves i18n (`empty`,
  `descriptionPlaceholder`, `errors.loadError`) y el patrón de estado vacío
  dentro de la card, evitando reescribir esas piezas.
- **`Valor` + `Fecha` en un grid de 2 columnas**; botones `Confirmar` (default)
  y `Cancelar` (`variant='outline'`, `router.back()`) apilados full-width.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. El cambio es de presentación: no
altera autenticación/autorización (las RLS admin-only de `expenses` siguen
intactas), no expone datos nuevos, no agrega dependencias ni superficie de red.
La validación de input del form (categoría, monto > 0, descripción requerida) se
mantiene.

## Lecciones aprendidas

- El frame proponía la categoría como título de fila; se detectó que perdía la
  capacidad de distinguir gastos de la misma categoría en el mes y se ajustó la
  anatomía antes de implementar.
- Había un WIP parkeado (`wip-expenses-screen-figma`) con una dirección de
  diseño opuesta (form sin categoría ni fecha). Se revisó, se rescataron piezas
  útiles y se descartó el resto para no arrastrar decisiones viejas.

## Plan

### Pasos

1. Form `Nuevo gasto`: reordenar a Categoría → (Valor + Fecha) → Descripción,
   quitar `notes`, agregar subtítulo, placeholder de categoría/descripción y
   botón `Cancelar`.
2. Lista: total grande centrado, card "Resumen de gastos" siempre visible con
   `+`, estado vacío adentro, fila con `description` + `categoría · fecha` +
   monto.
3. Skeletons: alinear al nuevo layout (total + card de 3 filas).
4. Página: subtítulo bajo el header.
5. i18n (es/en): `subtitle`, `empty`, `form.descriptionPlaceholder`,
   `form.selectCategory`, `errors.loadError`.
6. Verificar `type-check` y `lint` sin errores nuevos.
