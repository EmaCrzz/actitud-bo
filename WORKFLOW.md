# Workflow de Desarrollo - Actitud BO

## 🚀 **Entornos Configurados**

### **Development (Preview)**
- **Rama:** `develop`
- **URL:** `actitud-bo-git-develop-*.vercel.app` 
- **Supabase:** Proyecto de desarrollo
- **Rate Limiting:** Cache local (sin Redis)

### **Production**  
- **Rama:** `main`
- **URL:** `actitud-bo.vercel.app`
- **Supabase:** Proyecto de producción  
- **Rate Limiting:** Upstash Redis

---

## 📝 **Workflow Diario**

### **1. Desarrollar Nueva Feature**
```bash
# Asegurarte de estar en develop
git checkout develop
git pull origin develop

# Crear rama de feature (opcional)
git checkout -b feature/nueva-funcionalidad

# Hacer cambios...
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

# Crear tag de versión
git tag -a v1.2.0 -m "Release v1.2.0: Descripción de cambios"
git push origin main --tags

# ✅ Vercel despliega automáticamente a Production
# ✅ URL: actitud-bo.vercel.app
```

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

- [ ] Feature funciona correctamente en Preview
- [ ] Rate limiting probado
- [ ] No hay errores en console del browser
- [ ] Responsive design verificado
- [ ] Base de datos de desarrollo sin datos sensibles

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