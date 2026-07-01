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
```bash
# Cuando esté todo probado
git checkout main
git merge develop

# Si hay migraciones, aplicar a producción:
npm run db:push-prod    # ⚠️ Con confirmación obligatoria

# Crear tag de versión
git tag -a v1.2.0 -m "Release v1.2.0: Descripción de cambios"
git push origin main --tags

# ✅ Vercel despliega automáticamente a Production
# ✅ URL: actitud-bo.vercel.app
```

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
✅ **Rollback fácil** - Cada migración es reversible
✅ **Historial claro** - Todas las migraciones versionadas
✅ **Deploy seguro** - Confirmación obligatoria para producción

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

## 🆚 **Comparación: Manual vs Script**

### **Proceso Manual:**
```bash
# Más control, más pasos
git checkout develop
git pull origin develop
git checkout main  
git pull origin main
git merge develop --no-ff
git tag v1.3.0 -m "Release v1.3.0: Add reports"
git push origin main --tags
git checkout develop
```

### **Con Script:**
```bash
# Un comando, cero errores
./scripts/release.sh minor
```

### **Recomendación:**
- **Empieza manual** para entender el proceso
- **Usa el script** cuando hagas releases frecuentes
- **El script es opcional**, tu workflow manual ya funciona perfecto

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

Si algo falla en producción:

```bash
# Opción 1: Revert último commit
git checkout main
git revert HEAD
git push origin main

# Opción 2: Volver a tag anterior
git checkout main  
git reset --hard v1.1.0
git push origin main --force
```

---

## 📊 **URLs de Monitoreo**

- **Production:** https://actitud-bo.vercel.app
- **Preview:** https://actitud-bo-git-develop-*.vercel.app  
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Upstash Dashboard:** https://upstash.com/console