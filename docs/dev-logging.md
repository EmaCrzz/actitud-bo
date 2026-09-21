# Sesión de prueba instrumentada

Cómo correr una sesión donde una persona prueba en el navegador y un agente (o
el otro dev) mira los datos en paralelo. Sirve para encontrar lo que la UI no
muestra: un payload mal armado, un orden inesperado, una query que degrada en
silencio.

## Arrancar

```bash
DEV_LOG_FILE=/tmp/devlog.jsonl npm run dev
```

Sin esa variable **toda la instrumentación es no-op**, así que las llamadas
pueden quedar en el código. Nunca se activa con `NODE_ENV=production`.

Después, sobre el archivo:

```bash
tail -f /tmp/devlog.jsonl                              # en vivo
python3 -c "import json;[print(json.loads(l)) for l in open('/tmp/devlog.jsonl')]"
```

## Las dos mitades, y por qué hacen falta las dos

| Pieza | Qué ve | Cuándo importa |
|---|---|---|
| [src/components/dev/DevLogger.tsx](../src/components/dev/DevLogger.tsx) | Parchea `window.fetch`: cada request a PostgREST/RPC con **payload y respuesta**, más navegaciones, `console.error`, errores de window y promesas rechazadas | Todo lo que dispara el browser. **Los RPC de pago y de alta salen de acá**, directo a Supabase: el server de Next no los ve, así que sin esto son invisibles |
| [src/lib/dev/devlog.ts](../src/lib/dev/devlog.ts) | `devlog('evento', payload)` desde código de servidor | Server components y server actions. Las pantallas v2 renderizan en el server: sus consultas no pasan por `window.fetch` y se ven como un hueco en el log |

El sumidero del lado del cliente es [src/app/api/devlog/route.ts](../src/app/api/devlog/route.ts),
que además replica cada entrada al stdout del dev server.

## Qué queda registrado y qué no

- Los payloads de `/auth/v1/` se omiten: llevan tokens.
- Los bodies se truncan (2.5 KB en el cliente, 4 KB en el server). Si necesitás
  una respuesta completa, subí el límite en el archivo correspondiente.
- No se registran headers, así que la anon key no viaja al log.
- Aun así: **el log tiene datos de clientes reales** (nombres, DNI, montos). Va
  a un archivo temporal fuera del repo y no se commitea.

## Un par de cosas aprendidas armándolo

- **Las carpetas que empiezan con `_` son privadas en el App Router.** La ruta
  vivía en `api/__devlog` y Next la excluía del árbol de rutas: devolvía el HTML
  de la app con 200, que parece un endpoint que funciona mal en vez de uno que
  no existe.
- **El rewrite de `next.config.ts` excluye `api/`**, así que las rutas de API
  van en `src/app/api/*` y no bajo `[lang]/[tenant]`.
- Conviene dejar el `devlog()` del server **cerca del `return`** de la función
  paraguas, no dentro de cada sub-consulta: con un solo call site se ve la forma
  final de lo que la página recibe.

## Ejemplo: el caso que lo justificó

Probando la Fase 8 (2026-09-21), Ema notó que los clientes nuevos no aparecían
en "Últimos pagos" de `/incomes`. El log del cliente mostró la respuesta real de
`/api/accounting/incomes-summary` y confirmó que el feed saltaba del 21 al 16 de
septiembre. De ahí salió el followup de `membership_payments.payment_date` —
ver "Deuda conocida" en [docs/v2/PLAN.md](v2/PLAN.md). A nivel UI no se veía
nada roto: la lista mostraba cinco pagos, todos correctos.
