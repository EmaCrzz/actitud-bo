# Unit tests para la lógica de negocio (Vitest)

**Fecha:** 2026-09-26
**Autor:** ema_villanueva@hotmail.com
**Rama:** chore/unit-tests-logica-de-negocio

## Descripción

Con la suite e2e ya montada, se hizo un inventario de qué quedaba sin cubrir. El resultado cambió el plan que veníamos siguiendo.

**Nueve de las doce pantallas v2 son `UnderConstruction`.** Sólo `home` y `customers` están implementadas, y sus flujos principales ya estaban cubiertos. Queda poco e2e valioso por sumar — y conviene anotar una consecuencia sobre lo ya entregado: el smoke de "7 pantallas cargan sin errores" del ADR `20260926131436` está verificando mayormente placeholders. No es inútil (confirma layout, feature flag y routing, y esas pantallas van a crecer) pero no cubre funcionalidad, y vale saberlo al leer el número de tests en verde.

Lo que sí estaba descubierto es la lógica de negocio: la política de cobro, la sugerencia de precio y los helpers de fecha. Todo sin un solo test, y es donde vive el riesgo real.

## Decisiones

### Decisiones de negocio

- **Se priorizó la política de cobro sobre más cobertura de UI.** El propio código documenta por qué: el docblock de `billing-policy.ts` cuenta que había **tres reglas conviviendo y desincronizadas** —el dashboard contaba un pago del día 13 como "sin recargo" mientras el formulario ya sugería cobrarlo con recargo. Ese desacuerdo vivió en producción hasta que alguien lo notó de casualidad. Ahora la regla está fijada en tests que fallan si alguien la mueve por arrastre.

### Decisiones técnicas

- **Vitest para lógica pura, no más e2e.** Es la herramienta correcta para esto y la diferencia es de orden de magnitud: verificar "el día 11 sugiere recargo" por e2e exigiría manipular el reloj del sistema o esperar al día 11 del mes. Las funciones ya reciben la fecha y la política por parámetro —`getCyclePhaseForDay(dayOfMonth, policy)`— o sea que estaban diseñadas para testearse directamente. **60 tests corren en 60ms**, contra 2.3 minutos de los 19 e2e.

  Además, y a diferencia de los e2e, estos tests **pueden ir a CI sin secrets, sin base de datos y sin dejar residuo**. Si en algún momento se monta el workflow, es lo primero que debería correr.

- **Vitest 3, no 5.** La 5 exige `@types/node` ^22 y el proyecto está en 20. Actualizar los tipos de Node por un runner de tests es mover una dependencia transversal por una razón lateral; la 3 funciona igual para este uso.

- **Tests junto al código (`src/**/*.test.ts`), no en una carpeta aparte.** Coherente con la estructura por dominio del repo, y hace que el test sea visible al abrir el módulo. Quedan cubiertos por `type-check` y por `lint`, que ya barren `src/`.

- **Sin `globals`.** Cada archivo importa `describe`/`it`/`expect` de vitest. Es una línea más por archivo a cambio de no necesitar tipos globales ni configuración extra de ESLint.

- **`environment: 'node'` y exclusión de `e2e/`.** No se testean componentes, así que jsdom sólo agregaría arranque. La exclusión evita que Vitest intente levantar los `.spec.ts` de Playwright y falle con errores confusos.

## Consideraciones de seguridad

No se identifican implicaciones de seguridad. Los tests son puros: no acceden a la base, no usan credenciales, no hacen red. `vitest` es devDependency y no entra al bundle de producción. No se modificó código de la app.

## Lecciones aprendidas

- **Los 60 tests pasaron al primer intento, lo que no prueba nada por sí solo.** Un test escrito mirando la implementación tiende a confirmarla en vez de verificarla. Se comprobó por mutación, como se hizo con los e2e de fechas:

  | Mutación | Resultado |
  |---|---|
  | `gracePeriodEnd: 10` → `15` (el valor viejo, ya corregido una vez) | 7 tests en rojo |
  | `parseAppTzDateString` → `new Date(iso)` (el bug histórico) | 7 tests en rojo |

  Ambas revertidas, `src/` verificado sin cambios. Vale como práctica general: para un test de regresión, verlo fallar es parte de escribirlo.

- **El inventario valía más que seguir el plan.** Se venía con una lista de pendientes que incluía "cubrir el resto de las pantallas v2", y el conteo mostró que casi todas son placeholders. Media hora de inventario evitó escribir tests de pantallas vacías.

## Plan

### Pasos

1. Instalar Vitest 3 y configurar `vitest.config.ts` con el alias `@/`.
2. `src/accounting/billing-policy.test.ts` — el corte 10/11, la media membresía del 16, renovación anticipada y alta de mitad de mes.
3. `src/membership/pricing.test.ts` — el cruce de mora y media membresía, VIP, diaria, precios mal cargados.
4. `src/lib/timezone.test.ts` — el desfase de las 21:00, cambio de mes y de año, bisiestos, vencimientos.
5. Validar por mutación y revertir.

### Estado

60 tests en verde, ~60ms. `npm test` los corre; `npm run test:watch` para desarrollo.

### Pendiente

Módulos de lógica pura que quedaron sin cubrir, en orden de valor:

- `src/membership/charge-mode.ts` — catálogo de precios por plan; comparte riesgo con `pricing.ts`.
- `src/customer/utils.ts` — validaciones del formulario de alta.
- `src/assistance/utils.ts` — armado de la semana de asistencias.
- `src/lib/format-date.ts` — formateo de fechas para la UI.

Y, del lado e2e: perfil del cliente y sus cuatro tabs, filtros y paginación del listado, edición de cliente, comprobante de pago.
