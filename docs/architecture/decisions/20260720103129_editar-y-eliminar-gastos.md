# Editar y eliminar gastos desde el listado

**Fecha:** 2026-07-20
**Autor:** federubents@gmail.com
**Rama:** feat/expenses-edit-delete

## Descripción

El rediseño del flujo de Gastos (PR #34) dejó la pantalla con alta (`+`) y
listado, pero sin forma de **editar** ni **eliminar** un gasto ya registrado.
Este cambio agrega esas dos acciones por fila, reutilizando lo que ya existía.

El backend estaba completo desde antes: `updateExpense`/`deleteExpense` en el
cliente (`src/expenses/api/index.ts`) y en el server (`src/accounting/api/server.ts`),
más las rutas HTTP `PUT`/`DELETE` en `/api/accounting/expenses/[id]`. Sólo faltaba
el cableado de UI. No se tocó la base de datos, ni RPCs, ni el flujo de creación.

## Decisiones

### Decisiones de negocio

- **Editar y eliminar viven en un menú por fila (kebab `⋯`)**, no como íconos
  sueltos. Una sola afordancia por fila mantiene la UI limpia y no pelea con el
  `truncate` de descripciones largas.
- **El borrado pide confirmación** con un `AlertDialog` (acción destructiva e
  irreversible). Se muestra la descripción del gasto en el diálogo para evitar
  borrar el equivocado.
- **Editar reutiliza el mismo formulario de alta** en una ruta dedicada, para que
  crear y editar se vean y se comporten igual.

### Decisiones técnicas

- **Editar = ruta dedicada `/expenses/edit/[id]`** (server component que trae el
  gasto con un nuevo `getExpenseById` y lo pasa al form), calcado del patrón de
  `customer/edit/[id]`. Se descartó editar en un `Dialog` por no tener precedente
  en la app y para no bifurcar el layout del form.
- **`ExpenseForm` pasa a aceptar un `expense` opcional**: con él prefillea los
  campos y, en submit, llama `updateExpense` en vez de `createExpense`. Sin la
  prop, se comporta exactamente como antes.
- **Kebab con `DropdownMenu`** y **confirmación con `AlertDialog`** (modelado en
  `src/assistance/cancel-dialog.tsx`), ambos ya presentes en la app. El diálogo
  se controla por estado desde el ítem del menú para evitar problemas de foco.
- **Fix en `InputCurrency`**: el input hidden que lee el `FormData` (`numericValue`)
  arrancaba vacío aunque se pasara `defaultValue`, por lo que un edit sin tocar el
  monto habría enviado vacío. Ahora se inicializa desde `value`/`defaultValue`.
  El flujo de alta no pasa `defaultValue`, así que su comportamiento no cambia.
- **Invalidación de queries** reutilizada: tras editar o eliminar se invalidan
  `['expenses']` y `['monthly-stats']`, igual que en el alta.
- **Fix del rewrite catch-all en `next.config.ts`**: el rewrite
  `'/:path*' → '/{lang}/{tenant}/:path*'` (formato array = `afterFiles`) corre
  antes de las rutas dinámicas del filesystem, por lo que capturaba las rutas API
  dinámicas (`/api/.../[id]`) y las reescribía a `/{lang}/{tenant}/api/...`
  (inexistente) → **404**. Las rutas API estáticas resolvían antes del rewrite,
  por eso el bug estaba latente. Se agregó una exclusión con negative lookahead
  (`'/:path((?!api/).*)'`) para que ninguna ruta bajo `/api` se reescriba. Todas
  las rutas API viven en la raíz (`src/app/api/*`), así que la exclusión es segura
  y además arregla las rutas `[id]` de payments (mismo bug).

## Consideraciones de seguridad

- **Autenticación / Autorización:** las tres operaciones (`getExpenseById`,
  `updateExpense`, `deleteExpense`) pasan por `requireAdmin()` en el server, igual
  que el resto del dominio de contabilidad. La UI no habilita nada que el backend
  no controle ya.
- **Exposición de datos:** ninguna nueva. `getExpenseById` devuelve un gasto que
  el admin ya podía ver en el listado.
- **Validación de input:** el form de edición usa la misma validación básica que
  el de alta (categoría, monto > 0, descripción). El id viaja por la URL de la
  ruta HTTP existente.
- **Infraestructura:** sin cambios. No se agregaron rutas HTTP nuevas (se reusa
  `PUT`/`DELETE` existentes) ni dependencias.

## Plan

### Pasos

1. Íconos `more-vertical` (kebab) y `trash` en `components/icons/`.
2. Constante de ruta `EXPENSES_EDIT` y `getExpenseById` en el server de accounting.
3. Fix de inicialización del hidden en `InputCurrency`.
4. `ExpenseForm` con modo edición (prop `expense`, prefill, `updateExpense`).
5. `ExpenseRow` (fila + kebab con Editar/Eliminar + `AlertDialog` de borrado) y
   `ExpensesList` pasa a renderizarlo.
6. Ruta `/expenses/edit/[id]`.
7. Claves i18n (es/en): edit, notFound, errors/success de update y delete, diálogo.
