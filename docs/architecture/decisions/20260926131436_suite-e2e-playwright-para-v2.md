# Suite e2e con Playwright para las pantallas v2

**Fecha:** 2026-09-26
**Autor:** ema_villanueva@hotmail.com
**Rama:** chore/e2e-playwright-v2

## Descripción

El proyecto no tenía framework de tests. La verificación funcional de cada cambio dependía de que Ema —único dev— recorriera a mano un checklist en localhost antes de aprobar un PR, y de que la capa de QA humana repitiera parte de ese recorrido en el preview.

Eso tiene dos costos. El primero es el tiempo del único dev, que es el recurso más escaso del proyecto. El segundo es más silencioso: las regresiones en pantallas que *no* se tocaron no las ve nadie, porque el checklist cubre el cambio, no el resto de la app.

Esta entrega monta la infraestructura de tests end-to-end y cubre los flujos críticos de v2. El objetivo explícito no es reemplazar a QA humano: es que la verificación de "¿esto sigue funcionando?" deje de consumir tiempo de dev, para que QA humano se dedique a lo que sólo una persona puede evaluar — si el comportamiento es *correcto para el negocio*.

## Decisiones

### Decisiones de negocio

- **Alcance inicial: sólo v2.** Es la superficie en desarrollo activo, así que es donde los tests pagan hoy. v1 está en producción y casi no se toca; cubrirla es deseable pero no urgente, y duplicaría el trabajo inicial.
- **La suite verifica funcionamiento, no criterio.** Que el recargo del día 11 sea el correcto o que una pantalla se entienda lo sigue evaluando QA humano. Los tests cubren "el flujo completa y persiste", que es lo mecánico y repetitivo.
- **Correr primero en local, CI después.** Se prefirió validar que el ciclo sirve antes de invertir en resolver credenciales y base de datos en CI. El `playwright.config.ts` ya contempla `process.env.CI` para cuando se dé ese paso.

### Decisiones técnicas

- **Playwright sobre la extensión de Chrome de Claude.** La pregunta que originó el trabajo era si esa extensión servía para esto. No: está pensada para asistencia interactiva sobre el browser del usuario, no produce artefactos reproducibles y no corre headless ni en CI. Playwright sí, y además da trazas y video en los fallos.

- **Tests contra la DB de dev, con prefijo `[E2E]` y DNI en rango reservado.** Se evaluó Supabase local (`supabase start`), que daría aislamiento real. Se descartó para el arranque porque obliga a garantizar que las 34 migraciones corran limpias desde cero y a mantener un seed. La DB de dev es un backup de producción y se puede restaurar, lo que hace tolerable el desorden.

  La mitigación importa: todo registro creado lleva `[E2E]` en el nombre, y los DNI se emiten en el rango `99.xxx.xxx`, **no asignado en Argentina**. Sin eso, un DNI aleatorio podría colisionar con el de una persona real del backup — lo que además de ensuciar datos haría fallar el test por un "DNI duplicado" que no tiene nada que ver con lo que se estaba probando.

  **Si el residuo de tests llega a molestar en el preview, la salida es migrar a Supabase local.** Queda escrito acá para que sea una decisión y no un redescubrimiento.

- **Bloquear el service worker desde Playwright (`serviceWorkers: 'block'`), no con una env var en `generate-sw.js`.** El plan original era lo segundo. Lo primero es mejor por una razón concreta: funciona igual cuando la suite reusa un `npm run dev` que ya estaba levantado, que es el caso normal en local. Además evita tocar código de producción.

- **Login único con `storageState`.** El endpoint de login tiene rate limit de 5/minuto. Loguear por spec agota la cuota al sexto test y produce 429 que se leen como bugs de auth. `auth.setup.ts` loguea una vez y serializa la sesión; los specs arrancan autenticados.

- **Verificar `v2_access` en el setup en vez de seedearlo.** Crear el flag requeriría la `service_role` key, que no está en el entorno local. Pero el modo de fallo real no es "el flag nunca existió", sino "un restore del backup de prod vació `user_feature_flags`" — algo que ya pasó antes y deja toda la suite v2 fallando con redirects que parecen rutas rotas. El setup lo detecta y falla con un mensaje que nombra la causa y el arreglo.

- **Selectores por diccionario i18n, no por strings en español.** Los specs importan el mismo diccionario que la app (`es.json` + overrides del tenant) y resuelven las claves. Un cambio de copy mueve el selector solo; lo que rompe un test es que desaparezca la *clave*, que es exactamente la señal deseada. Para esto se exportó `deepMerge` de `src/lib/i18n/api.ts` — único cambio en código de producción de toda la entrega.

- **`workers: 1`.** Los tests escriben en una base compartida con el preview y el alta de clientes tiene rate limit de 10/hora. En paralelo, dos altas compiten por esa cuota y los fallos se vuelven indistinguibles de bugs reales.

- **Clientes efímeros por corrida, también en el spec de asistencia.** La migración `20260917120100` agregó un UNIQUE de asistencia por día. Un spec que registre asistencia sobre un cliente fijo pasa la primera corrida del día y falla las siguientes. Creando un cliente nuevo cada vez, es repetible.

## Consideraciones de seguridad

- **Autenticación / Autorización:** la suite usa credenciales de un usuario real de la base de desarrollo, leídas de `.env.local` (gitignored). No se agregan usuarios ni se modifican permisos. El spec `auth-guard` verifica que las rutas v2 sigan exigiendo sesión.
- **Exposición de datos:** `e2e/.auth/admin.json` contiene un JWT de Supabase válido y está explícitamente gitignoreado. El script de limpieza muestra sólo el host de la conexión, nunca la URL completa, que lleva la contraseña embebida. Las credenciales se documentan en `.env.example` únicamente como placeholders.
- **Validación de input:** no se introduce manejo de input no confiable. Los datos de test son generados por la propia suite.
- **Dependencias:** se agregan `@playwright/test` y `dotenv` como devDependencies. Ninguna entra al bundle de producción.
- **Infraestructura:** `scripts/e2e-clean.sh` ejecuta DELETE sobre la base de desarrollo. Por eso exige confirmación escrita, acota el borrado al prefijo `[E2E]` y corre dentro de una transacción. No tiene acceso a producción.

## Lecciones aprendidas

- **En v2 toda alta cobra.** No es evidente desde afuera: el alta de un cliente crea cliente + membresía + pago, así que cada corrida del spec de alta inyecta plata en la contabilidad del mes que QA mira en el preview. Es el argumento más fuerte a favor de migrar a una base aislada si la suite crece.

- **El modo estricto de Playwright fue el 80% de los fallos al poner la suite en verde, siempre por la misma causa: los selectores por texto matchean por substring.** Vale tenerlo presente al escribir specs nuevos, porque el síntoma nunca apunta al problema real — el test falla con "no lo encuentro" o "encontré dos", no con "tu selector es ambiguo". Los cuatro casos:

  - `getByLabel('Contraseña')` matchea el input **y** el botón "Mostrar contraseña".
  - `getByRole('link', {name: 'Clientes'})` matchea el ítem del menú **y** la card "Clientes activos del mes".
  - `getByText('Nuevo cliente')` matchea el botón que abre el panel **y** el título del panel abierto.
  - `getByText('Asistencia')` matchea nueve elementos del home.

  Reglas que salieron de eso, ya aplicadas en `e2e/support/`: campos de formulario por `id`; títulos de panel por `getByRole('heading')`; ítems de menú con el helper `sidebarLink`, que fuerza `exact: true`.

- **El listado de clientes existe dos veces en el DOM**: la tabla de desktop y las cards de mobile, con el switch por CSS. Cualquier aserción sobre una fila necesita `.first()` o un scope explícito.

- **`/api/devlog` responde 404 por diseño** cuando no hay `DEV_LOG_FILE` seteado, y el DevLogger del cliente lo llama en cada request que parchea. Sin excepción explícita, toda pantalla que dispare un RPC acumulaba decenas de 404 y la aserción de "cero errores de consola" era inservible. De paso: el fixture ahora registra los fallos de red **con su URL**, porque un "404" pelado en consola no permite distinguir un asset opcional de un RPC roto.

- `react-hooks/rules-of-hooks` da un falso positivo sobre los fixtures de Playwright: toma el callback `use` por el hook `use` de React. Resuelto con un override acotado a `e2e/`.

- El rewrite de `next.config.ts` hace que la ruta pública de login sea `/auth/login`, aunque `consts/routes.ts` exporte `LOGIN = '/login'`. La constante no se usa para navegar.

## Plan

### Pasos

1. Instalar `@playwright/test` + `dotenv` y el browser de Chromium.
2. `playwright.config.ts`: baseURL en el puerto 3001, timezone AR, SW bloqueado, `reuseExistingServer` para colgarse del dev server que Ema ya tiene levantado.
3. Helpers en `e2e/support/`: carga de env con errores accionables, traductor sobre el diccionario real, generador de datos efímeros, fixture de errores de consola, flujos reutilizables.
4. `auth.setup.ts`: login único, verificación de `v2_access`, `storageState` serializado.
5. Specs: smoke de las 7 pantallas v2, guard de autenticación, alta de cliente, registro de asistencia.
6. `scripts/e2e-clean.sh` + SQL para borrar los residuos con confirmación.
7. Verificar `type-check` y `lint` (extendido a `e2e/`) contra el baseline de `develop`.

### Estado

Suite en verde: 15 tests en ~1.4 minutos, verificada en dos corridas consecutivas para confirmar que es repetible — que es lo que prueba que los clientes efímeros esquivan de verdad el UNIQUE de asistencia por día.

### Pendiente

- Specs de cobro de membresía y balance del mes, con foco en que las fechas caigan en el mes contable correcto (ver ADR `20260709153000_representacion-canonica-de-fechas-ar.md`).
- Specs de permisos con el usuario no-admin, cuando se cargue.
- GitHub Action corriendo la suite contra el preview en cada PR.
