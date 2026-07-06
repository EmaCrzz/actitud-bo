# Registros de Decisiones Arquitectónicas (ADR)

Esta carpeta documenta el trabajo hecho en features y fixes. Los ADR son un registro histórico de qué cambió, por qué, y qué decisiones se tomaron en el camino.

## Información sensible — NUNCA incluir

Los ADR se commitean a git. **Nunca incluir:**

- Credenciales, API keys, secrets, tokens
- Connection strings o URLs de bases de datos
- Datos de clientes o PII
- URLs internas, IPs o detalles de infraestructura que no deberían ser públicos
- Cualquier información que sería un riesgo de seguridad si se expone

Cuando necesites referenciar cualquiera de esos, usá placeholders (`{DATABASE_URL}`, `{API_KEY}`) o descripciones genéricas ("la base de producción", "el proyecto de Supabase").

## Cuándo crear un ADR

- **SÍ** crear un documento cuando la tarea:
  - Se hace en una rama de trabajo (no directo en `develop`/`main`)
  - Implica una decisión de diseño con impacto futuro (cambio de patrón, elección de librería, cambio de flujo de datos, deprecación de una convención, refactor con tradeoffs)

- **NO** crear un documento cuando:
  - Se trabaja directo en `develop` o `main`
  - La tarea es trivial (typos, bumps de dependencias, formatting, renames locales)
  - El cambio no involucra ninguna decisión de diseño (bug fix mecánico y obvio)

## Cómo obtener el autor

```bash
git config user.email
```

## Convención de nombre de archivo

```
{timestamp}_{nombre-semantico}.md
```

- **timestamp**: formato `yyyyMMddHHmmss`
  ```bash
  date +%Y%m%d%H%M%S
  ```
- **nombre-semantico**: kebab-case describiendo la decisión (ejemplo: `unify-membership-price-cache`)

Ejemplo: `20260701123045_unify-membership-price-cache.md`

## Estructura del documento

Usá la plantilla en [TEMPLATE.md](./TEMPLATE.md).

## Flujo

1. Empezá en **modo plan** — discutir y acordar el approach.
2. Documentá el plan en el ADR **antes** de implementar.
3. Implementá la solución.
4. Actualizá las secciones Descripción y Decisiones con los resultados finales.
5. Commiteá el ADR junto con el feature/fix (no en un commit separado).
