# Limpieza automática de los datos que deja la suite e2e

**Fecha:** 2026-09-26
**Autor:** ema_villanueva@hotmail.com
**Rama:** chore/e2e-teardown-automatico

## Descripción

La suite e2e crea clientes, membresías, pagos y asistencias en la base de desarrollo, que es la misma que ve el preview donde prueba QA. Hasta ahora la limpieza dependía de que alguien se acordara de correr `npm run test:e2e:clean`.

No funcionó: en dos sesiones de trabajo se acumularon 16 clientes con 23 pagos. Y los pagos no son inertes —entran en la contabilidad del mes— así que el balance que mira QA venía con ruido.

Esta entrega hace que la suite se limpie sola al terminar. Además de resolver la higiene, es prerrequisito para correr los tests en CI: automatizar las corridas sin automatizar la limpieza multiplicaría el problema en vez de resolverlo.

## Decisiones

### Decisiones de negocio

- **La limpieza es el comportamiento por defecto, no una opción.** Quien necesite inspeccionar los datos después de una corrida usa `E2E_SKIP_TEARDOWN=1`. Se eligió así porque el modo de fallo asimétrico es claro: olvidarse de limpiar ensucia una base compartida, mientras que olvidarse de saltear el teardown sólo obliga a volver a correr la suite.

### Decisiones técnicas

- **Proyecto de teardown de Playwright (`teardown: 'cleanup'`), no un `globalTeardown` suelto.** La diferencia que importa: corre **aunque haya tests en rojo**, que es exactamente cuando más basura queda —un fallo a mitad del flujo de alta deja un cliente recién creado sin que ningún test lo registre. Verificado con un spec que crea un cliente y falla a propósito: el teardown corrió igual y borró la fila.

- **El teardown invoca `scripts/e2e-clean.sh`, no reimplementa el borrado.** Mantener dos copias del criterio de limpieza es pedir que se desincronicen. El script pasó a aceptar `E2E_CLEAN_ASSUME_YES=1` para saltear la confirmación interactiva, que sigue vigente cuando se lo corre a mano.

- **Borra por conexión directa de Postgres y no con supabase-js.** Esto no fue una preferencia sino un hallazgo: de las cuatro tablas involucradas, **sólo `membership_payments` tiene política de `DELETE` bajo RLS**. Un borrado de `customers` como usuario admin desde supabase-js no falla — afecta cero filas y devuelve éxito. El teardown habría reportado "limpieza completada" dejando todo en su lugar, que es peor que no tenerlo.

  **Consecuencia para CI:** habrá que exponer `SUPABASE_DB_URL_DEV` como secret, y el runner necesita `psql`. Queda anotado para cuando se monte.

- **Un fallo de la limpieza no rompe la suite.** Se loguea un warning y se sigue. Si la limpieza fallara la corrida entera, un problema de conectividad con la base se leería como una regresión de la app, que es justo la clase de ruido que erosiona la confianza en los tests.

## Consideraciones de seguridad

- **Autenticación / Autorización:** sin cambios en la app. El script usa la conexión de desarrollo que ya existía en `.env.local`.
- **Exposición de datos:** el script sigue mostrando sólo el host de la conexión, nunca la URL completa, que lleva la contraseña embebida.
- **Validación de input:** el criterio de borrado es una constante del código (`first_name LIKE '[E2E]%'`), no entra por parámetro. No hay superficie de inyección.
- **Dependencias:** ninguna nueva.
- **Infraestructura:** el borrado automático es la única consideración real. Está acotado al prefijo, corre dentro de una transacción y apunta sólo a la base de desarrollo. No tiene acceso a producción.

## Lecciones aprendidas

- **Las políticas de RLS del proyecto están definidas por operación, y `DELETE` está cubierto en una sola tabla.** No es un problema —la app no borra clientes— pero vale saberlo antes de escribir cualquier herramienta que asuma que un usuario admin puede borrar lo que puede leer. El fallo sería silencioso.

- **Verificar el camino feliz no alcanza para un teardown.** Que limpie cuando todo pasa es lo fácil; el caso que justifica la funcionalidad es el de los tests en rojo. Se comprobó explícitamente en vez de asumirlo.

## Plan

### Pasos

1. `scripts/e2e-clean.sh` acepta `E2E_CLEAN_ASSUME_YES=1` para uso no interactivo.
2. `e2e/global.teardown.ts` invoca el script, resume las filas borradas y degrada a warning ante un error.
3. `playwright.config.ts`: proyecto `cleanup` encadenado al `setup` vía `teardown`.
4. Verificar en los dos escenarios: suite en verde y suite en rojo.

### Estado

20 proyectos/tests en verde (~2.3 min), teardown incluido. Base verificada en cero después de cada corrida, con y sin tests fallando.

### Pendiente

- GitHub Action en cada PR. Con la limpieza automática resuelta, el bloqueante que queda es exponer las credenciales y `SUPABASE_DB_URL_DEV` como secrets.
- Specs de permisos con el usuario no-admin, cuando se cargue.
