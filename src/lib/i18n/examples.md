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
├── api.ts                   # API para cargar traducciones
├── hooks.ts                 # Hooks para componentes cliente
├── server.ts                # Utilidades para server components
├── types.ts                 # Tipos básicos
└── index.ts                 # Exportaciones principales
```

## Uso en Client Components

```tsx
import { useTranslation, useT } from '@/lib/i18n/hooks'

// Ejemplo completo con cambio de idioma
function MyComponent() {
  const { t, language, changeLanguage, isLoading } = useTranslation()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>{t('customer.title')}</h1>
      <p>{t('customer.welcome', { name: 'Emanuel' })}</p>
      <button onClick={() => changeLanguage('en')}>
        {t('buttons.changeLanguage')}
      </button>
    </div>
  )
}

// Ejemplo simple solo con función t
function SimpleComponent() {
  const t = useT()
  
  return (
    <button>{t('buttons.continue')}</button>
  )
}
```

## Uso en Server Components

```tsx
import { getServerT } from '@/lib/i18n/server'

// En un Server Component
export default async function ServerComponent() {
  const t = await getServerT('es')
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <p>{t('customer.welcome', { name: 'Usuario' })}</p>
    </div>
  )
}

// En una API Route
import { getServerTranslations } from '@/lib/i18n/server'

export async function GET(request: Request) {
  const { t } = await getServerTranslations('es')
  
  return Response.json({
    message: t('messages.actionCompleted')
  })
}
```

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
const t = useT()

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