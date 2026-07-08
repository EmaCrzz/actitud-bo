# Workflow de Desarrollo - Actitud BO

## 🚀 **Entornos Configurados**

### **Development (Preview)**
- **Rama:** `develop`
- **URL:** `actitud-bo-git-develop-*.vercel.app`
- **Supabase:** Proyecto de desarrollo separado
- **Rate Limiting:** Cache local (sin Redis)
- **Base de Datos:** Independiente de producción

### **Production**
- **Rama:** `main`
- **URL:** `actitud-bo.vercel.app`
- **Supabase:** Proyecto de producción
- **Rate Limiting:** Upstash Redis
- **Base de Datos:** Datos reales de producción

---

## 🔒 **Protección de `main`**

`main` es la rama de producción y está protegida en GitHub. **Nunca se mergea por PR manual** — el único camino válido es `./scripts/release.sh`, que garantiza bump de versión, tag y merge atómicos.

### Configuración vigente

- **Default branch del repo:** `develop` — todos los PRs nuevos apuntan por default a `develop`, no a `main`.
- **Branch protection en `main`:**
  - PR obligatorio antes de mergear
  - 1 approval requerido
  - Review de code owner requerida (definido en [`.github/CODEOWNERS`](../.github/CODEOWNERS))
  - Force push bloqueado
  - Deletion bloqueada
  - Conversation resolution requerida antes de mergear
  - Admin bypass habilitado (el owner puede saltearse las reglas para hotfix o rollback de emergencia)

### Reglas para devs

1. Toda rama de trabajo (`feat/*`, `fix/*`, `chore/*`, etc.) abre PR a `develop`.
2. **Nunca** abras un PR de `develop → main` a mano. Si GitHub te sugiere ese PR, ignorá el banner.
3. Cuando develop está listo para prod: correr `./scripts/release.sh [patch|minor|major]` desde local. El script hace merge + tag + push en un solo paso.
4. Si necesitás un hotfix urgente saltando el flujo normal, coordinalo con el owner — es el único con bypass.

---

## 📝 **Workflow Diario**

### **1. Desarrollar Nueva Feature**
```bash
# Asegurarte de estar en develop
git checkout develop
git pull origin develop

# Crear rama de feature (opcional)
git checkout -b feature/nueva-funcionalidad

# Hacer cambios en código...
# Si necesitas cambios en BD:
npm run db:new          # Crear nueva migración
npm run db:push-dev     # Aplicar a desarrollo

git add .
git commit -m "Add: nueva funcionalidad para X"
git push origin feature/nueva-funcionalidad
```

### **2. Probar en Development**
```bash
# Mergear a develop
git checkout develop
git merge feature/nueva-funcionalidad
git push origin develop

# ✅ Vercel despliega automáticamente a Preview
# ✅ URL: actitud-bo-git-develop-*.vercel.app
```

### **3. Deploy a Production**

**No se mergea a `main` manualmente.** El único camino a producción es el script de release, que hace bump de versión + merge + tag + push de forma atómica.

```bash
# 1. Si hay migraciones nuevas, aplicarlas a producción PRIMERO
npm run db:push-prod    # ⚠️ Con confirmación obligatoria

# 2. Correr el script de release desde develop
./scripts/release.sh patch   # o minor / major
```

El orden importa: migraciones **antes** que el deploy de código. Ver [Disciplina de Migrations](#-disciplina-de-migrations-expand-and-contract) para entender por qué (y qué migrations son seguras hacer así).

Detalles de cada paso: ver [Protección de `main`](#-protección-de-main) y [Script de Release Automatizado](#-script-de-release-automatizado).

---

## 🗄️ **Gestión de Base de Datos**

### **Setup Inicial (Una sola vez)**

#### **1. Configurar Supabase CLI**
```bash
# Login en Supabase CLI
supabase login
# Usar token de: https://supabase.com/dashboard/account/tokens
```

#### **2. Generar Migración Inicial desde Producción**
```bash
npm run db:init-prod
# Te pedirá el Project ID de producción
# Genera la migración inicial basada en tu esquema actual
```

#### **3. Aplicar Migración a Desarrollo**
```bash
npm run db:link-dev
# Te pedirá el Project ID de desarrollo
# Aplica todas las migraciones al proyecto de desarrollo
```

### **Comandos de Base de Datos**

```bash
# Gestión de migraciones
npm run db:new          # Crear nueva migración
npm run db:status       # Ver estado de migraciones
npm run db:push-dev     # Aplicar migraciones a desarrollo
npm run db:push-prod    # Aplicar migraciones a producción (con confirmación)
```

### **Setup del Session Pooler para `db:push-*`**

Desde 2024 Supabase deprecó la conexión directa por IPv4 al puerto 5432. El CLI intenta conectarse por IPv6, cosa que la mayoría de las redes (incluidos ISPs residenciales y GitHub Actions) no soportan, y `npm run db:push-dev` falla con `dial tcp [...]:5432: connect: no route to host`.

**Solución**: usar el **Session Pooler** de Supabase (IPv4-compatible, puerto 5432 vía Supavisor).

#### Configurar por primera vez (DEV)

1. Dashboard de Supabase (proyecto DEV) → **Project Settings → Database**
2. En el bloque **Connection string**, elegir la tab **Session pooler** (no "Direct connection" ni "Transaction pooler")
3. Copiar el string. Se ve así:
   ```
   postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
   ```
4. Si no tenés la password: **Reset database password** en la misma página, guardala en un password manager. Reemplazá `[YOUR-PASSWORD]` con la password real.
5. Agregarlo a `.env.local` (que ya está gitignored):
   ```
   SUPABASE_DB_URL_DEV=postgresql://postgres.PROJECT_REF:REAL_PASSWORD@...
   ```
6. Correr `npm run db:push-dev`. El script detecta la env var y usa el pooler automáticamente.

Si `SUPABASE_DB_URL_DEV` no está seteada, el script cae al flujo antiguo (pide project ID interactivo) y avisa que probablemente falle con IPv6.

#### Configurar PROD

Mismos pasos que DEV pero apuntando al proyecto de producción:

1. Dashboard PROD → botón **Connect** → tab **Session pooler** → copiar
2. Si hace falta, resetear la password (no rompe la app: usa el anon key)
3. Agregar a `.env.local`:
   ```
   SUPABASE_DB_URL_PROD=postgresql://postgres.PROJECT_REF_PROD:REAL_PASSWORD@...
   ```
4. Correr `npm run db:push-prod` (te va a pedir confirmar con "yes" antes de tocar prod)

### **Estructura de la carpeta `supabase/`**

```
supabase/
├── migrations/   ← versionadas, se aplican con db:push-dev / db:push-prod
└── scripts/      ← manuales, se pegan en SQL Editor cuando hace falta
    ├── grant-admin.sql  ← asigna rol admin a un email (editar el email dentro)
    └── seed-dev.sql     ← seed solo para entornos de desarrollo
```

**Regla simple:**
- Cambios de schema o policies → archivo nuevo en `migrations/`
- Operaciones puntuales o específicas de entorno (asignar admin, seed, fixes ad-hoc) → archivo en `scripts/`, no van al CLI

### **Workflow de Migraciones**

#### **Para Desarrollo:**
1. **Crear migración:** `npm run db:new nombre-migracion`
2. **Editar archivo:** `supabase/migrations/XXXXXX_nombre-migracion.sql` — escribir SQL idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`) para que aplicar la misma migration dos veces no rompa
3. **Aplicar a desarrollo:** `npm run db:push-dev`
4. **Probar en preview:** Hacer commit y push a develop

#### **Para Producción:**
1. **Verificar en desarrollo:** Todo funciona correctamente
2. **Aplicar a producción:** `npm run db:push-prod`
3. **Confirmar cuando pregunte:** Escribir "yes" para confirmar
4. **Correr scripts manuales si la migration los requiere** (ej. después del setup de RBAC, pegar `supabase/scripts/grant-admin.sql` en el SQL Editor de PROD con tu email para asignarte rol admin)
5. **Hacer release:** Continuar con proceso normal de release

---

## 🧬 **Disciplina de Migrations (Expand-and-Contract)**

**Regla base:** una migration nunca debe hacer imposible que el código anterior siga funcionando. Si esa regla se cumple, un rollback de código es un botón (Escenario A/B). Si se rompe, entrás en Escenario C — restore de DB con downtime.

### Migrations seguras (aditivas)

Estas son 100% forward-compatible. Se pueden aplicar a prod antes del deploy de código sin riesgo:

- ✅ Crear tabla nueva
- ✅ Agregar columna **nullable** (o con default)
- ✅ Agregar índice
- ✅ Crear función RPC nueva
- ✅ Crear policy de RLS **nueva** sobre tabla existente
- ✅ Agregar constraint que **ya se cumple** en todos los datos actuales

### Migrations peligrosas (rompen rollback)

Cualquiera de estas hace que el código viejo no pueda funcionar contra el schema nuevo:

- ⚠️ Dropear columna, tabla, o función
- ⚠️ Renombrar columna, tabla, o función
- ⚠️ Cambiar tipo de columna (ej: `text → int`)
- ⚠️ Agregar columna **`NOT NULL` sin default** a tabla con datos
- ⚠️ Cambiar el comportamiento de una función RPC que el código ya usa
- ⚠️ Endurecer una policy de RLS de forma que bloquee accesos actuales

Si necesitás hacer una de estas, **hay que partirla en pasos** para que en todo momento haya un schema compatible con el código viejo Y el nuevo.

### Patrón expand-and-contract

Ejemplo: querés renombrar la columna `customers.phone` a `customers.phone_number`.

**Release N (expand):**
1. Migration aditiva: agregar `phone_number` nullable
2. Deploy código que **lee de `phone`** y **escribe en las dos** columnas
3. Script de backfill: `UPDATE customers SET phone_number = phone WHERE phone_number IS NULL`

**Release N+1 (switch):**
1. Deploy código que **lee de `phone_number`** y **escribe en las dos**
2. En este punto ya podés rollback a N sin problema — ambas columnas tienen los datos

**Release N+2 (contract):**
1. Deploy código que **solo usa `phone_number`**
2. Después de 1-2 semanas confirmando que anda bien: migration que dropea `phone`

Cada release intermedio es rollbackeable con Vercel Instant Rollback. Nunca necesitás "des-migrar".

Es más lento, sí. Pero un rollback de código en Vercel es 30 segundos vs un PITR de Supabase que puede ser 30 minutos de downtime. La lentitud del proceso te compra la velocidad del rollback.

### Checklist para PRs con migrations

Antes de mergear, respondé:

- [ ] ¿La migration es 100% aditiva (tabla nueva, columna nullable, índice, función nueva, policy nueva)?
- [ ] Si no lo es: ¿está partida en pasos expand → switch → contract con al menos un release intermedio?
- [ ] Si es una función RPC modificada: ¿el código actual sigue funcionando con la firma/comportamiento nuevo?
- [ ] Si cambia RLS: ¿el código anterior no depende de acceso que ahora está bloqueado?
- [ ] ¿Escribí el SQL de forma idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`)?

Si alguna respuesta es "no sé": **no mergear** hasta discutirlo. Es mejor demorar el release que romper prod sin salida de un botón.

---

### **Proyectos Separados**

#### **Development Project**
- **Propósito:** Testing y desarrollo seguro
- **Datos:** Datos de prueba, no críticos
- **Migraciones:** Se aplican primero aquí

#### **Production Project**
- **Propósito:** Aplicación en vivo
- **Datos:** Datos reales de usuarios
- **Migraciones:** Se aplican después de testing

### **Beneficios del Setup**
✅ **Desarrollo seguro** - No afectas datos de producción
✅ **Testing real** - Pruebas con estructura real de BD
✅ **Historial claro** - Todas las migraciones versionadas
✅ **Deploy con confirmación** - `db:push-prod` pide "yes" antes de aplicar

> ⚠️ **Sobre rollback de migraciones:** el CLI de Supabase **no genera** down migrations automáticas. Si necesitás revertir una migración en prod, hay que escribir SQL de reversa a mano (o usar PITR si el cambio es destructivo). Por eso la disciplina de migrations aditivas es clave — ver [Disciplina de Migrations](#-disciplina-de-migrations-expand-and-contract) y [Rollback de Emergencia](#-rollback-de-emergencia).

---

## 🏷️ **Versionado Semántico**

Seguimos el estándar [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

### **Tipos de Release:**
- **PATCH (v1.0.1)** → Bug fixes, correcciones menores
- **MINOR (v1.1.0)** → Nuevas features, funcionalidades
- **MAJOR (v2.0.0)** → Breaking changes, cambios incompatibles

### **Ejemplos de Cada Tipo:**
```bash
# PATCH - Solo correcciones
v1.0.1 - Fix login validation error
v1.0.2 - Fix responsive design on mobile

# MINOR - Nuevas features compatibles  
v1.1.0 - Add rate limiting system
v1.2.0 - Add customer export functionality

# MAJOR - Breaking changes
v2.0.0 - New authentication system (breaking)
v3.0.0 - Database schema migration (breaking)
```

### **¿Cuándo usar cada tipo?**

#### **PATCH (Bug fixes):**
- Corriges un error sin añadir funcionalidad
- El usuario puede actualizar sin cambios en su uso
- Ejemplos: validación rota, CSS mal aplicado, typo

#### **MINOR (Features):**
- Añades nueva funcionalidad
- Todo lo anterior sigue funcionando igual
- Ejemplos: nuevo endpoint, nueva página, mejora UX

#### **MAJOR (Breaking):**
- Cambias cómo funciona algo existente
- El usuario podría necesitar cambios
- Ejemplos: cambio de API, nuevo flujo de auth, migración DB

---

## 📋 **Script de Release Automatizado**

### **¿Qué Hace el Script?**
1. **Verificaciones de seguridad:**
   - Estás en la rama `develop`
   - No hay cambios sin commitear
   - Desarrolla está actualizada con origin

2. **Calcula la nueva versión:**
   - Lee el último tag (ej: `v1.2.3`)
   - Incrementa según el tipo: `patch` → `v1.2.4`, `minor` → `v1.3.0`

3. **Proceso de release:**
   - Cambia a `main` y mergea `develop`
   - Crea el tag con mensaje automático
   - Push a producción con tags
   - Vuelve a `develop`

4. **Genera changelog automático:**
   - Lista los últimos commits
   - Filtra por tipos: Add, Fix, Update

### **Cómo Usar el Script:**

```bash
# Hacer el script ejecutable (solo la primera vez)
chmod +x scripts/release.sh

# Bug fix (v1.0.0 → v1.0.1)  
./scripts/release.sh patch

# Nueva feature (v1.0.0 → v1.1.0)
./scripts/release.sh minor

# Breaking change (v1.0.0 → v2.0.0)
./scripts/release.sh major
```

### **Ejemplo de Uso Completo:**

```bash
# 1. Terminas de desarrollar una feature en develop
git checkout develop
git add .
git commit -m "Add: nueva funcionalidad de reportes"
git push origin develop

# 2. Ejecutas el script de release
./scripts/release.sh minor

# El script automáticamente:
# ✅ Verifica que estás en develop
# ✅ Cambia a main y mergea develop  
# ✅ Crea tag v1.3.0 (si el anterior era v1.2.5)
# ✅ Push a producción
# ✅ Vuelve a develop
```

### **Ventajas del Script:**
✅ **Cero errores humanos** (olvidar tag, push, etc.)  
✅ **Cálculo automático** de versiones  
✅ **Changelog automático** en el tag  
✅ **Verificaciones de seguridad**  
✅ **Proceso consistente** siempre igual  

### **Desventajas:**
❌ Un archivo más que mantener  
❌ Menos control manual del proceso  

---

## ✅ **Checklist Pre-Production**

Antes de hacer merge a `main`:

### **Funcionalidad**
- [ ] Feature funciona correctamente en Preview
- [ ] Rate limiting probado
- [ ] No hay errores en console del browser
- [ ] Responsive design verificado

### **Base de Datos**
- [ ] Migraciones aplicadas y probadas en desarrollo
- [ ] `npm run db:status` muestra migraciones actualizadas
- [ ] Datos de prueba funcionan correctamente
- [ ] No hay datos sensibles en desarrollo
- [ ] Esquema de BD compatible con producción

### **Código**
- [ ] Linting pasando: `npm run lint`
- [ ] Type checking pasando: `npm run type-check`
- [ ] Build exitoso: `npm run build`

---

## 🚨 **Rollback de Emergencia**

Si prod está roto, **primero estabilizás el tráfico, después limpiás git**. Esta sección está pensada para leer bajo presión — seguí el escenario que corresponda.

Identificá primero qué tipo de release rompió:

- **¿Solo código, sin migraciones?** → Escenario A
- **¿Código + migraciones aditivas** (columnas nullable nuevas, tablas nuevas, funciones nuevas)? → Escenario B
- **¿Código + migraciones destructivas** (drops, renames, cambios de tipo, NOT NULL sin default)? → Escenario C

> Si no estás seguro, mirá los últimos archivos en [`supabase/migrations/`](../supabase/migrations/) que entraron con el release problemático. Si contienen `DROP`, `ALTER ... TYPE`, `ALTER ... RENAME`, o `NOT NULL` sin default → tratalo como destructiva (Escenario C).

---

### Escenario A — Solo código

**Tiempo estimado: ~30 segundos.**

1. Vercel Dashboard → proyecto `actitud-bo` → **Deployments**
2. Encontrar el último deployment sano (el anterior al roto, marcado como "Production")
3. Click en el menú "..." del deployment sano → **Promote to Production**
4. Confirmar. Vercel cambia el alias de producción al deployment viejo. Esto es instantáneo.
5. Verificar en https://actitud-bo.vercel.app que anda.

**Después de estabilizar (no urgente):**
- Crear una rama `fix/rollback-<motivo>` desde el commit que rompió, revertirlo, y seguir el flujo normal de PR + release. Nunca dejes `main` con un commit malo aunque el tráfico esté yendo al deployment viejo.

---

### Escenario B — Código + migraciones aditivas

**Tiempo estimado: ~30 segundos.**

Las migraciones aditivas son forward-compatible: el código viejo no las usa, así que no le molestan. El schema se queda "adelantado" pero funcional.

1. Igual que Escenario A: Vercel → Promote deployment anterior a producción.
2. **NO tocar la DB.** El schema queda con la migration aplicada, el código viejo la ignora.
3. Verificar que anda.

**Después de estabilizar:**
- Igual que Escenario A: revertir el commit malo. La migration puede quedarse aplicada en prod — la próxima vez que quieras usarla (con código corregido), ya está lista.

---

### Escenario C — Código + migraciones destructivas

**Tiempo estimado: minutos a decenas de minutos. Downtime real.**

Este es el escenario doloroso. El deployment viejo espera el schema viejo, pero el schema ya cambió (o se rompió). Vercel rollback solo no alcanza — hay que restaurar la DB.

> **La forma de nunca vivir este escenario es no hacer migraciones destructivas en un solo release.** Ver [Disciplina de Migrations](#-disciplina-de-migrations-expand-and-contract). Si igual llegaste acá, seguí los pasos.

1. **Poner la app en modo mantenimiento si podés** (redirect a página estática desde Vercel, o mensaje en app). Los clientes no deberían estar escribiendo datos mientras restaurás.
2. **Vercel** → Promote deployment anterior (para dejar de servir el código nuevo lo antes posible).
3. **Supabase Dashboard** → proyecto de PROD → **Database → Backups** (o **Point in Time Recovery** si está activado).
   - Si tenés PITR: seleccionar timestamp **anterior** al `db:push-prod` de la migration rota. La restore lleva varios minutos.
   - Si NO tenés PITR: usar el último backup diario. Vas a perder los datos escritos entre el backup y ahora — anotá qué datos son (si podés) para reingresarlos manualmente.
4. Esperar a que la restore termine (Supabase te avisa cuando la DB está lista).
5. Verificar que la app anda con el deployment viejo + DB restaurada.
6. Sacar el modo mantenimiento.

**Después de estabilizar:**
- Retrospectiva obligatoria: por qué entró una migration destructiva sin partirla, y cómo evitar el próximo caso. Documentarlo en un ADR.
- La rama con el fix debe re-hacer el cambio destructivo con expand-and-contract (ver disciplina de migrations).

---

### ❌ Qué NO hacer nunca

- **`git push --force` a `main`**: está bloqueado por branch protection y contradice el protocolo. Si necesitás "borrar" un commit en `main`, se hace con `git revert` (crea un commit nuevo que deshace el malo).
- **`git reset --hard` sobre `main`** localmente y push: mismo problema que arriba.
- **Correr `db:push-prod` con SQL de reversa "improvisado" bajo presión**: escribir SQL destructivo con la app caída es la receta para el segundo desastre. Usar PITR o backup.
- **Rollback silencioso**: siempre avisar al otro dev / dejar registro en un ADR o en el commit de revert. Que nadie descubra por accidente que prod está en una versión distinta a la que dice el tag más reciente.

---

## 📊 **URLs de Monitoreo**

- **Production:** https://actitud-bo.vercel.app
- **Preview:** https://actitud-bo-git-develop-*.vercel.app  
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Upstash Dashboard:** https://upstash.com/console