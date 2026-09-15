# Sistema de Internacionalización (i18n) con Type Safety

## ✨ Características
- 🔒 **Type Safety Completo**: Autocompletado e intellisense para todas las keys
- 🏢 **Multi-tenant**: Overrides específicos por tenant
- 🌍 **Multi-idioma**: Soporte para múltiples idiomas
- 📝 **Dot Notation**: Navegación anidada intuitiva
- 🔄 **SSR/CSR**: Funciona en Server y Client Components
- 📦 **Interpolación**: Parámetros dinámicos con type safety

## Estructura
```
src/lib/i18n/
├── dictionaries/
│   ├── es.json              # Traducciones base en español
│   ├── en.json              # Traducciones base en inglés
│   └── tenant/
│       ├── actitud.json     # Override específico para Actitud
│       ├── wellrise.json    # Override específico para WellRise
│       └── core.json        # Override específico para Core
├── api.ts                   # Carga y mergea diccionarios (React.cache)
├── server.ts                # getServerT() — SERVER ONLY
├── locale.ts                # getIntlLocale() — isomorfo
├── context.tsx              # I18nClientProvider + useTranslations()
├── server-provider.tsx      # Puente server → client del diccionario
├── types.ts                 # LANGUAGES, Language, TranslationKey
└── index.ts                 # (comentado — multi-idioma en runtime no está activo)
```

> `lang` y `tenant` **no se pasan por props**. Son constantes de build: el rewrite
> de `next.config.ts` deriva los segmentos `[lang]/[tenant]` de las env vars
> `APP_LANGUAGE` / `TENANT`. `getServerT()` las lee directamente.

## Uso en Client Components

```tsx
import { useTranslations } from '@/lib/i18n/context'

function MyComponent() {
  const { t } = useTranslations()

  return (
    <div>
      <h1>{t('customer.title')}</h1>
      <p>{t('customer.welcome', { name: 'Emanuel' })}</p>
    </div>
  )
}
```

El diccionario lo inyecta `I18nServerProvider` desde el layout raíz; no hace
falta pasarle nada al hook.

## Uso en Server Components

```tsx
import { getServerT } from '@/lib/i18n/server'

export default async function ServerComponent() {
  const { t } = await getServerT()

  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <p>{t('customer.welcome', { name: 'Usuario' })}</p>
    </div>
  )
}
```

`getServerT()` devuelve `{ t, dictionary, lang, tenant }`. No lleva caché
propia: `api.fetch` ya está envuelto en `React.cache()`, así que llamarla
varias veces dentro del mismo request no duplica trabajo.

**Nunca importar `server.ts` desde un `'use client'`**: lee env vars que no son
`NEXT_PUBLIC_*` y el bundler las inlinearía como `''` sin error visible.

## Formatear con Intl

```tsx
import { getIntlLocale } from '@/lib/i18n/locale'

const { lang } = await getServerT()
const locale = getIntlLocale(lang) // 'es' → 'es-AR', 'en' → 'en-US'
```

`locale.ts` es isomorfo a propósito: lo consumen server components y también
los pocos client components que reciben `lang` por prop para formatear.
Es la única fuente de verdad del mapeo idioma → locale — nada de
`lang === 'en' ? 'en-US' : 'es-AR'` suelto.

## Ejemplos de Traducciones

### Traducción Simple
```tsx
t('buttons.continue') // → "Continuar"
t('common.loading')   // → "Cargando..."
```

### Traducción con Parámetros
```tsx
t('customer.welcome', { name: 'Emanuel' })
// → "¡Hola Emanuel! Bienvenido a Actitud"

t('forms.validation.minLength', { min: 8 })
// → "Mínimo 8 caracteres"

t('membership.expiresIn', { days: 15 })
// → "Vence en 15 días"
```

### Traducciones Específicas por Tenant
```tsx
// En el tenant "actitud"
t('auth.welcomeMessage') // → "Bienvenido a Actitud Gym"

// En el tenant "wellrise"
t('auth.welcomeMessage') // → "Welcome to WellRise Health & Wellness"

// En el tenant "core"
t('auth.welcomeMessage') // → "Bienvenido a Core Fitness"
```

## Dot Notation
El sistema soporta navegación anidada con notación de punto:

```tsx
t('forms.validation.required')    // → "Este campo es requerido"
t('customer.status.active')       // → "Activo"
t('membership.types.monthly')     // → "Mensual"
t('auth.permissions.admin')       // → "Administrador"
```

## 🔒 Type Safety

### Autocompletado Inteligente
```tsx
const { t } = useTranslations() // o await getServerT() en server

// Al escribir t(' aparecerá intellisense con todas las keys disponibles:
t('buttons.continue')           // ✅ Válido
t('customer.status.active')     // ✅ Válido  
t('forms.validation.required')  // ✅ Válido

// Estas mostrarán errores de TypeScript:
t('invalid.key')                // ❌ Error de tipo
t('customer.nonexistent')       // ❌ Error de tipo
```

### Tipos Inferidos Automáticamente
Los tipos se generan automáticamente desde `es.json`:
- **Sin compilación**: Los tipos se infieren en tiempo real
- **Sincronización automática**: Al cambiar traducciones, los tipos se actualizan
- **Intellisense completo**: Autocompletado para todas las keys anidadas

### Keys Tipadas Disponibles
Algunos ejemplos de keys que tendrás disponibles con intellisense:

```typescript
// Navegación
'navigation.home'
'navigation.dashboard' 
'navigation.customers'

// Botones
'buttons.continue'
'buttons.submit'
'buttons.login'

// Formularios
'forms.validation.required'
'forms.labels.email'
'forms.placeholders.search'

// Customer
'customer.title'
'customer.status.active'
'customer.welcome' // Acepta parámetro {name}

// Y muchas más...
```

## Fallbacks
- Si no se encuentra una traducción, retorna la clave
- Si no se encuentra una traducción de tenant, usa la base
- Si no se puede cargar un idioma, usa español por defecto
- Los parámetros faltantes se muestran como `{param}`

## 🎯 Beneficios del Type Safety
1. **Detección temprana de errores**: TypeScript detecta keys inexistentes
2. **Refactoring seguro**: Cambios de estructura se reflejan en tipos
3. **Desarrollo más rápido**: Intellisense acelera el desarrollo
4. **Menos bugs en producción**: Imposible usar keys que no existen