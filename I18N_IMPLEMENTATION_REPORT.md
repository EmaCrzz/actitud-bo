# Sistema de Internacionalización (i18n) con Type Safety Completo

## Tabla de Contenido
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Type Safety: El Corazón del Sistema](#type-safety-el-corazón-del-sistema)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Flujo de Carga de Traducciones](#flujo-de-carga-de-traducciones)
6. [Sistema Multi-Tenant](#sistema-multi-tenant)
7. [Implementación Paso a Paso](#implementación-paso-a-paso)
8. [Casos de Uso](#casos-de-uso)
9. [Ventajas y Limitaciones](#ventajas-y-limitaciones)
10. [Escalando a Aplicaciones Enterprise](#escalando-a-aplicaciones-enterprise)
    - [Desafíos Reales](#desafíos-reales)
    - [Arquitectura Scoped Translator](#arquitectura-scoped-translator)
    - [Refactorización DRY del JSON](#refactorización-dry-del-json)
    - [Herramientas de Auditoría](#herramientas-de-auditoría)
    - [Plan de Migración](#plan-de-migración)

---

## Resumen Ejecutivo

Este módulo i18n es un sistema de internacionalización **construido desde cero** para Next.js 15 con App Router, diseñado con un enfoque radical en **Type Safety**. A diferencia de librerías como `react-i18next` o `next-intl`, este sistema genera automáticamente los tipos TypeScript desde los archivos JSON de traducción, proporcionando **autocompletado completo** y **validación en tiempo de compilación** sin necesidad de configuración manual.

### Características Clave
- ✅ **Type Safety Total**: Autocompletado e IntelliSense para todas las claves de traducción
- ✅ **Zero Config Types**: Los tipos se infieren automáticamente del JSON base
- ✅ **Multi-Tenant**: Sistema de overrides específicos por tenant
- ✅ **SSR/CSR Compatible**: Funciona tanto en Server como Client Components
- ✅ **Dot Notation**: Navegación intuitiva en estructuras anidadas (`customer.status.active`)
- ✅ **Interpolación Tipada**: Parámetros dinámicos con validación de tipos
- ✅ **Deep Merge**: Combinación inteligente de traducciones base + tenant
- ✅ **React.cache**: Deduplicación automática de llamadas en el servidor

---

## Arquitectura General

### Diagrama de Flujo
```
┌─────────────────────────────────────────────────────────┐
│                    Request Inicial                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          I18nServerProvider (RSC)                        │
│  • Recibe: lang + tenant desde URL params               │
│  • Carga: Diccionario base + tenant overrides           │
│  • Cache: React.cache para deduplicación                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          I18nClientProvider (Context)                    │
│  • Recibe: Diccionario completo pre-cargado             │
│  • Crea: Función createTranslator(dictionary)           │
│  • Expone: Hook useTranslations() para componentes      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│          Componentes Cliente                             │
│  const { t } = useTranslations()                        │
│  t('customer.status.active') // → "Activo"              │
│  t('customer.welcome', { name: 'Juan' })                │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Datos
1. **URL**: `/es/actitud/dashboard` → Extrae `lang` y `tenant`
2. **Server Provider**: Carga `es.json` + `tenant/actitud.json`
3. **Deep Merge**: Combina ambos diccionarios (tenant override base)
4. **Context**: Pasa el diccionario final al cliente
5. **Hook**: Componentes acceden vía `useTranslations()`

---

## Type Safety: El Corazón del Sistema

### 1. Generación Automática de Tipos

El sistema utiliza **tipos utilitarios avanzados de TypeScript** para inferir todas las claves posibles desde el archivo `es.json`:

```typescript
// src/lib/i18n/types.ts

// Tipo utilitario para generar notación de punto desde objetos anidados
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

// Control de profundidad para evitar recursión infinita
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]]

// Recorre recursivamente el objeto generando todas las rutas posibles
type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
          : never
      }[keyof T]
    : ''

// Importa el tipo del diccionario español (fuente de verdad)
type TranslationDictionary = typeof import('./dictionaries/es.json')

// Genera TODAS las claves tipadas posibles
export type TranslationKey = Paths<TranslationDictionary>
```

### 2. ¿Cómo Funciona la Inferencia?

Dado este JSON:
```json
{
  "customer": {
    "title": "Cliente",
    "status": {
      "active": "Activo",
      "inactive": "Inactivo"
    }
  }
}
```

El tipo `Paths<>` genera:
```typescript
type TranslationKey =
  | "customer"
  | "customer.title"
  | "customer.status"
  | "customer.status.active"
  | "customer.status.inactive"
```

### 3. Validación en Tiempo de Compilación

```typescript
// ✅ Válido - TypeScript reconoce la clave
t('customer.status.active') // IntelliSense muestra: "active" | "inactive"

// ❌ Error de compilación - clave inexistente
t('customer.status.pending')
// Error: Argument of type '"customer.status.pending"' is not assignable to parameter of type 'TranslationKey'
```

### 4. Interpolación con Type Safety

```typescript
// Parámetros también están tipados
export type TranslationParams = Record<string, string | number>

// Función de traducción con tipos
function t(key: TranslationKey, params?: TranslationParams): string {
  let translation = getNestedValue(dictionary, key)

  // Reemplaza {param} con valores
  return translation.replace(/\{(\w+)\}/g, (_, param) => {
    return String(params[param] ?? `{${param}}`)
  })
}

// Uso
t('customer.welcome', { name: 'Juan' }) // ✅ Tipado
t('customer.welcome', { invalid: 123 })  // ⚠️ No causa error pero muestra {invalid}
```

---

## Estructura de Archivos

```
src/lib/i18n/
├── dictionaries/
│   ├── es.json                    # ← FUENTE DE VERDAD para tipos
│   ├── en.json                    # Traducción inglés (misma estructura)
│   └── tenant/
│       ├── actitud.json           # Overrides específicos de Actitud
│       ├── wellrise.json          # Overrides específicos de WellRise
│       └── core.json              # Overrides específicos de Core
│
├── types.ts                       # Tipos: Language, TranslationKey, TranslationParams
├── api.ts                         # Lógica de carga + deep merge + createTranslator
├── context.tsx                    # React Context + useTranslations hook
├── server-provider.tsx            # Server Component que carga y pasa datos
├── server.ts                      # (Comentado) Funciones para Server Components directos
├── index.ts                       # (Comentado) Funciones legacy
└── examples.md                    # Documentación de uso
```

### Responsabilidades de Cada Archivo

#### `types.ts` - Definiciones de Tipos
```typescript
// Define idiomas soportados
export const LANGUAGES = {
  ES: 'es',
  EN: 'en',
} as const

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES]

// Genera tipos de claves desde es.json
export type TranslationKey = Paths<typeof import('./dictionaries/es.json')>

// Tipo para parámetros de interpolación
export type TranslationParams = Record<string, string | number>
```

#### `api.ts` - Core Logic
```typescript
import { cache } from 'react'
import type { Language, TranslationKey, TranslationParams } from './types'
import { TenantsType } from '../tenants'

// ✨ React.cache para deduplicación de llamadas en el mismo request
const fetchTranslations = cache(async (lang: Language, tenant: TenantsType) => {
  try {
    // 1. Carga diccionario base
    const baseDictionary = await import(`./dictionaries/${lang}.json`)
      .then(module => module.default)

    // 2. Intenta cargar overrides del tenant
    let tenantOverrides = {}
    try {
      tenantOverrides = await import(`./dictionaries/tenant/${tenant}.json`)
        .then(module => module.default)
    } catch (error) {
      console.warn(`No tenant overrides found for ${tenant}`)
    }

    // 3. Deep merge: tenant overrides base
    const mergedDictionary = deepMerge(baseDictionary, tenantOverrides)

    return {
      dictionary: mergedDictionary,
      t: createTranslator(mergedDictionary)
    }
  } catch (error) {
    console.error('Failed to fetch dictionary:', error)
    throw new Error('Failed to fetch dictionary')
  }
})

// Deep merge recursivo
function deepMerge(base: Record<string, any>, override: Record<string, any>) {
  const result = { ...base }

  for (const key in override) {
    if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }

  return result
}

// Crea función de traducción
export function createTranslator(dictionary: Record<string, any>) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    // Navega por dot notation
    const keys = key.split('.')
    let translation: any = dictionary

    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k]
      } else {
        console.warn(`Translation not found for key: ${key}`)
        return key // Fallback: retorna la clave
      }
    }

    if (typeof translation !== 'string') {
      console.warn(`Translation for key "${key}" is not a string`)
      return key
    }

    // Sin params, retorna directamente
    if (!params) return translation

    // Reemplaza {param} con valores
    return translation.replace(/\{(\w+)\}/g, (_, param: string) => {
      return String(params[param] ?? `{${param}}`)
    })
  }
}

export default { fetch: fetchTranslations }
```

#### `server-provider.tsx` - Server Component
```typescript
import api from './api'
import { Language } from './types'
import { I18nClientProvider } from './context'
import { TenantsType } from '../tenants'

export async function I18nServerProvider({
  children,
  lang,
  tenant,
}: {
  children: React.ReactNode
  lang: Language
  tenant: TenantsType
}) {
  // Carga traducciones en el servidor
  const { dictionary } = await api.fetch(lang, tenant)

  // Pasa el diccionario al Context de cliente
  return <I18nClientProvider dictionary={dictionary}>{children}</I18nClientProvider>
}
```

#### `context.tsx` - Client Context
```typescript
'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { TranslationKey, TranslationParams } from './types'
import { createTranslator } from './api'

interface i18nClientContextType {
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const i18nClientContext = createContext<i18nClientContextType | null>(null)

export function I18nClientProvider({
  children,
  dictionary
}: {
  children: ReactNode
  dictionary: Record<string, string>
}) {
  return (
    <i18nClientContext.Provider value={{ t: createTranslator(dictionary) }}>
      {children}
    </i18nClientContext.Provider>
  )
}

export function useTranslations(): i18nClientContextType {
  const context = useContext(i18nClientContext)

  if (!context) {
    throw new Error('useTranslations must be used within a I18nClientProvider')
  }

  return context
}
```

---

## Flujo de Carga de Traducciones

### 1. Inicialización en el Layout Root

```tsx
// src/app/[lang]/[tenant]/layout.tsx

import { I18nServerProvider } from '@/lib/i18n/server-provider'
import { type Language } from '@/lib/i18n/types'

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  // 1. Extrae parámetros dinámicos de la URL
  const { tenant, lang } = await params

  return (
    <html lang={lang}>
      <body>
        {/* 2. Proveedor carga traducciones y envuelve la app */}
        <I18nServerProvider lang={lang} tenant={tenant}>
          {children}
        </I18nServerProvider>
      </body>
    </html>
  )
}
```

### 2. Carga en el Servidor (fetchTranslations)

```typescript
// Flujo interno de api.fetch()

async function fetchTranslations(lang: 'es', tenant: 'actitud') {
  // Paso 1: Cargar diccionario base
  const baseDictionary = await import('./dictionaries/es.json')
  // {
  //   "customer": { "title": "Cliente", "welcome": "¡Hola {name}!" },
  //   "auth": { "welcomeMessage": "Bienvenido a la aplicación" }
  // }

  // Paso 2: Cargar overrides del tenant
  const tenantOverrides = await import('./dictionaries/tenant/actitud.json')
  // {
  //   "auth": { "welcomeMessage": "Bienvenido a Actitud Gym" },
  //   "customer": { "welcome": "¡Hola {name}! Bienvenido a Actitud" }
  // }

  // Paso 3: Deep merge (tenant sobrescribe base)
  const merged = deepMerge(baseDictionary, tenantOverrides)
  // {
  //   "customer": {
  //     "title": "Cliente",                                  // de base
  //     "welcome": "¡Hola {name}! Bienvenido a Actitud"     // de tenant ✓
  //   },
  //   "auth": {
  //     "welcomeMessage": "Bienvenido a Actitud Gym"        // de tenant ✓
  //   }
  // }

  return {
    dictionary: merged,
    t: createTranslator(merged)
  }
}
```

### 3. Propagación al Cliente

```tsx
// I18nServerProvider ejecuta fetch y pasa resultado

<I18nClientProvider dictionary={mergedDictionary}>
  {children}
</I18nClientProvider>
```

### 4. Consumo en Componentes

```tsx
'use client'

import { useTranslations } from '@/lib/i18n/context'

export default function CustomerCard() {
  const { t } = useTranslations()

  return (
    <div>
      <h2>{t('customer.title')}</h2>
      <p>{t('customer.welcome', { name: 'Juan' })}</p>
      {/* Resultado: "¡Hola Juan! Bienvenido a Actitud" */}
    </div>
  )
}
```

---

## Sistema Multi-Tenant

### Concepto

El sistema permite que múltiples "tenants" (Actitud, WellRise, Core) compartan la misma base de código pero con textos personalizados.

### Estructura de Archivos

```json
// dictionaries/es.json - BASE COMÚN
{
  "auth": {
    "welcomeMessage": "Bienvenido a la aplicación"
  },
  "customer": {
    "welcome": "¡Hola {name}!"
  }
}

// dictionaries/tenant/actitud.json - OVERRIDE ESPECÍFICO
{
  "auth": {
    "welcomeMessage": "Bienvenido a Actitud Gym"
  },
  "customer": {
    "welcome": "¡Hola {name}! Bienvenido a Actitud"
  }
}

// dictionaries/tenant/wellrise.json - OVERRIDE ESPECÍFICO
{
  "auth": {
    "welcomeMessage": "Welcome to WellRise Health & Wellness"
  },
  "customer": {
    "welcome": "Hey {name}! Welcome to WellRise"
  }
}
```

### Lógica de Deep Merge

```typescript
function deepMerge(base, override) {
  const result = { ...base }

  for (const key in override) {
    if (typeof override[key] === 'object') {
      // Recursivo: mergea objetos anidados
      result[key] = deepMerge(result[key] || {}, override[key])
    } else {
      // Sobrescribe valores primitivos
      result[key] = override[key]
    }
  }

  return result
}

// Ejemplo
deepMerge(
  { a: 1, b: { c: 2, d: 3 } },
  { b: { c: 99 }, e: 5 }
)
// Resultado: { a: 1, b: { c: 99, d: 3 }, e: 5 }
```

### Prioridad de Traducciones

1. **Tenant Override** (más específico)
2. **Base Dictionary** (fallback)
3. **Key como string** (fallback de emergencia)

```typescript
// Tenant: actitud
t('auth.welcomeMessage')
// 1. Busca en tenant/actitud.json → ✓ Encuentra
// Retorna: "Bienvenido a Actitud Gym"

t('customer.title')
// 1. Busca en tenant/actitud.json → ✗ No existe
// 2. Busca en es.json → ✓ Encuentra
// Retorna: "Cliente"

t('nonexistent.key')
// 1. Busca en tenant/actitud.json → ✗ No existe
// 2. Busca en es.json → ✗ No existe
// 3. Fallback
// Retorna: "nonexistent.key" (la clave misma)
```

---

## Implementación Paso a Paso

### Paso 1: Crear Estructura Base

```bash
mkdir -p src/lib/i18n/dictionaries/tenant
touch src/lib/i18n/{types.ts,api.ts,context.tsx,server-provider.tsx}
```

### Paso 2: Definir Tipos Base

```typescript
// src/lib/i18n/types.ts

export const LANGUAGES = {
  ES: 'es',
  EN: 'en',
} as const

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES]

// Tipos utilitarios para generar paths
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]]

type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
          : never
      }[keyof T]
    : ''

// ⚡ CLAVE: Importa tipo desde el JSON base
type TranslationDictionary = typeof import('./dictionaries/es.json')

// Genera todas las claves posibles
export type TranslationKey = Paths<TranslationDictionary>

export type TranslationParams = Record<string, string | number>
```

### Paso 3: Crear Diccionarios JSON

```json
// src/lib/i18n/dictionaries/es.json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    "save": "Guardar",
    "cancel": "Cancelar"
  },
  "customer": {
    "title": "Cliente",
    "titlePlural": "Clientes",
    "welcome": "¡Hola {name}!",
    "status": {
      "active": "Activo",
      "inactive": "Inactivo"
    }
  },
  "auth": {
    "login": "Iniciar Sesión",
    "welcomeMessage": "Bienvenido a la aplicación"
  }
}
```

```json
// src/lib/i18n/dictionaries/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "save": "Save",
    "cancel": "Cancel"
  },
  "customer": {
    "title": "Customer",
    "titlePlural": "Customers",
    "welcome": "Hello {name}!",
    "status": {
      "active": "Active",
      "inactive": "Inactive"
    }
  },
  "auth": {
    "login": "Login",
    "welcomeMessage": "Welcome to the application"
  }
}
```

```json
// src/lib/i18n/dictionaries/tenant/actitud.json
{
  "auth": {
    "welcomeMessage": "Bienvenido a Actitud Gym"
  },
  "customer": {
    "welcome": "¡Hola {name}! Bienvenido a Actitud"
  }
}
```

### Paso 4: Implementar API de Carga

```typescript
// src/lib/i18n/api.ts

import { cache } from 'react'
import type { Language, TranslationKey, TranslationParams } from './types'
import { TenantsType } from '../tenants'

const fetchTranslations = cache(async (lang: Language, tenant: TenantsType) => {
  // Cargar base
  const baseDictionary = await import(`./dictionaries/${lang}.json`)
    .then(module => module.default)

  // Cargar tenant (opcional)
  let tenantOverrides = {}
  try {
    tenantOverrides = await import(`./dictionaries/tenant/${tenant}.json`)
      .then(module => module.default)
  } catch (error) {
    console.warn(`No tenant overrides for ${tenant}`)
  }

  // Merge
  const mergedDictionary = deepMerge(baseDictionary, tenantOverrides)

  return {
    dictionary: mergedDictionary,
    t: createTranslator(mergedDictionary)
  }
})

function deepMerge(base: Record<string, any>, override: Record<string, any>) {
  const result = { ...base }

  for (const key in override) {
    if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }

  return result
}

export function createTranslator(dictionary: Record<string, any>) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    const keys = key.split('.')
    let translation: any = dictionary

    for (const k of keys) {
      if (translation?.[k]) {
        translation = translation[k]
      } else {
        console.warn(`Translation not found: ${key}`)
        return key
      }
    }

    if (typeof translation !== 'string') {
      return key
    }

    if (!params) return translation

    return translation.replace(/\{(\w+)\}/g, (_, param) => {
      return String(params[param] ?? `{${param}}`)
    })
  }
}

export default { fetch: fetchTranslations }
```

### Paso 5: Crear Context de Cliente

```typescript
// src/lib/i18n/context.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { TranslationKey, TranslationParams } from './types'
import { createTranslator } from './api'

interface i18nClientContextType {
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const i18nClientContext = createContext<i18nClientContextType | null>(null)

export function I18nClientProvider({
  children,
  dictionary
}: {
  children: ReactNode
  dictionary: Record<string, string>
}) {
  return (
    <i18nClientContext.Provider value={{ t: createTranslator(dictionary) }}>
      {children}
    </i18nClientContext.Provider>
  )
}

export function useTranslations(): i18nClientContextType {
  const context = useContext(i18nClientContext)

  if (!context) {
    throw new Error('useTranslations must be used within I18nClientProvider')
  }

  return context
}
```

### Paso 6: Crear Server Provider

```typescript
// src/lib/i18n/server-provider.tsx

import api from './api'
import { Language } from './types'
import { I18nClientProvider } from './context'
import { TenantsType } from '../tenants'

export async function I18nServerProvider({
  children,
  lang,
  tenant,
}: {
  children: React.ReactNode
  lang: Language
  tenant: TenantsType
}) {
  const { dictionary } = await api.fetch(lang, tenant)

  return <I18nClientProvider dictionary={dictionary}>{children}</I18nClientProvider>
}
```

### Paso 7: Integrar en Layout Root

```tsx
// src/app/[lang]/[tenant]/layout.tsx

import { I18nServerProvider } from '@/lib/i18n/server-provider'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { tenant, lang } = await params

  return (
    <html lang={lang}>
      <body>
        <I18nServerProvider lang={lang} tenant={tenant}>
          {children}
        </I18nServerProvider>
      </body>
    </html>
  )
}
```

### Paso 8: Usar en Componentes

```tsx
// src/components/customer-card.tsx
'use client'

import { useTranslations } from '@/lib/i18n/context'

export default function CustomerCard({ name }: { name: string }) {
  const { t } = useTranslations()

  return (
    <div>
      <h2>{t('customer.title')}</h2>
      <p>{t('customer.welcome', { name })}</p>
      <span>{t('customer.status.active')}</span>
    </div>
  )
}
```

---

## Casos de Uso

### Uso 1: Traducción Simple

```tsx
const { t } = useTranslations()

<button>{t('common.save')}</button>
// Resultado: "Guardar"
```

### Uso 2: Traducción con Parámetros

```tsx
const { t } = useTranslations()
const userName = "María"

<h1>{t('customer.welcome', { name: userName })}</h1>
// Resultado: "¡Hola María!"
// Con tenant actitud: "¡Hola María! Bienvenido a Actitud"
```

### Uso 3: Navegación Anidada

```tsx
const { t } = useTranslations()

<Badge>{t('customer.status.active')}</Badge>
// Resultado: "Activo"
```

### Uso 4: Textos Específicos por Tenant

```tsx
// URL: /es/actitud/dashboard
const { t } = useTranslations()
<h1>{t('auth.welcomeMessage')}</h1>
// Resultado: "Bienvenido a Actitud Gym"

// URL: /es/wellrise/dashboard
<h1>{t('auth.welcomeMessage')}</h1>
// Resultado: "Welcome to WellRise Health & Wellness"
```

### Uso 5: Formularios de Validación

```tsx
const { t } = useTranslations()

const schema = z.object({
  email: z.string().email(t('forms.validation.email')),
  password: z.string().min(8, t('forms.validation.minLength', { min: 8 }))
})
```

### Uso 6: Listas Dinámicas

```tsx
const { t } = useTranslations()

const statuses = ['active', 'inactive', 'pending'] as const

return (
  <ul>
    {statuses.map(status => (
      <li key={status}>
        {t(`customer.status.${status}` as TranslationKey)}
      </li>
    ))}
  </ul>
)
```

---

## Ventajas y Limitaciones

### ✅ Ventajas

1. **Type Safety Total**
   - Autocompletado en el IDE
   - Errores de compilación para claves inexistentes
   - Refactoring seguro

2. **Zero Configuration**
   - No requiere scripts de generación de tipos
   - Los tipos se infieren automáticamente del JSON
   - Sincronización instantánea entre JSON y tipos

3. **Performance Optimizado**
   - `React.cache` deduplica llamadas en el servidor
   - Diccionario pre-cargado en el cliente (no lazy loading)
   - Sin overhead de librerías externas

4. **Multi-Tenant Flexible**
   - Overrides selectivos por tenant
   - Deep merge inteligente
   - Fallback automático a traducciones base

5. **SSR/CSR Compatible**
   - Funciona en Server Components (carga en servidor)
   - Funciona en Client Components (vía Context)
   - Hidratación sin problemas

6. **Mantenibilidad**
   - Código simple y entendible
   - Sin dependencias externas de i18n
   - Fácil de extender

### ⚠️ Limitaciones

1. **JSON como Fuente de Verdad**
   - Cambios en `es.json` requieren reiniciar el servidor de desarrollo para actualizar tipos
   - No soporta traducciones dinámicas cargadas desde base de datos

2. **Sin Pluralización Automática**
   - Debe implementarse manualmente:
   ```json
   {
     "items": {
       "one": "{count} item",
       "other": "{count} items"
     }
   }
   ```
   ```tsx
   t(`items.${count === 1 ? 'one' : 'other'}`, { count })
   ```

3. **Sin Formateo de Fechas/Números**
   - Debe usarse `Intl` directamente:
   ```tsx
   new Intl.DateTimeFormat(lang).format(date)
   new Intl.NumberFormat(lang).format(number)
   ```

4. **Sin Cambio Dinámico de Idioma**
   - El idioma se determina por URL
   - Cambiar idioma requiere navegación: `router.push('/en/...')`

5. **Profundidad Máxima de Anidación**
   - Limitada a 10 niveles (configurable en `Prev` type)
   - Rara vez es un problema en la práctica

6. **Sin Namespaces Separados**
   - Todas las traducciones en un solo JSON
   - Puede volverse grande en apps muy complejas
   - Solución: Dividir en módulos con prefijos (`customer.*`, `auth.*`)

---

## Comparación con Otras Soluciones

### vs react-i18next

| Característica | Este Sistema | react-i18next |
|----------------|--------------|---------------|
| Type Safety | ✅ Completo (inferido) | ⚠️ Parcial (requiere scripts) |
| Tamaño Bundle | ✅ ~2KB | ❌ ~30KB |
| Setup | ✅ Simple | ⚠️ Complejo |
| SSR Next.js 15 | ✅ Nativo | ⚠️ Requiere adaptadores |
| Pluralización | ❌ Manual | ✅ Automática |
| Cambio de idioma | ⚠️ Vía URL | ✅ Dinámico |

### vs next-intl

| Característica | Este Sistema | next-intl |
|----------------|--------------|-----------|
| Type Safety | ✅ Inferido | ✅ Via generics |
| Multi-Tenant | ✅ Nativo | ⚠️ Custom |
| Curva Aprendizaje | ✅ Baja | ⚠️ Media |
| Flexibilidad | ✅ Alta | ⚠️ Opinionado |
| Documentación | ⚠️ Custom | ✅ Extensa |

---

## Recomendaciones para Implementación

### 1. Organización del JSON

```json
{
  "common": {},      // Textos compartidos (botones, etc)
  "navigation": {},  // Menús y navegación
  "forms": {         // Formularios y validaciones
    "validation": {},
    "labels": {},
    "placeholders": {}
  },
  "domains": {       // Por dominio de negocio
    "customer": {},
    "auth": {},
    "payments": {}
  }
}
```

### 2. Naming Conventions

- **Keys**: camelCase (`firstName`, `totalAmount`)
- **Nested**: Reflejar jerarquía lógica (`forms.validation.required`)
- **Parámetros**: CamelCase en llaves (`{userName}`, `{totalPrice}`)

### 3. Tenant Overrides

- Solo overridear lo necesario
- Mantener estructura idéntica a base
- Documentar qué se overridea y por qué

### 4. Testing

```typescript
// Validar que todas las claves existen
import esJSON from './dictionaries/es.json'
import enJSON from './dictionaries/en.json'

describe('i18n integrity', () => {
  it('should have same keys in es and en', () => {
    expect(Object.keys(esJSON)).toEqual(Object.keys(enJSON))
  })
})
```

### 5. CI/CD

```yaml
# .github/workflows/i18n-check.yml
- name: Check i18n keys
  run: |
    npm run type-check  # Valida que no hay claves rotas
```

---

## Conclusión

Este sistema de i18n representa un **equilibrio perfecto entre simplicidad y potencia**, diseñado específicamente para Next.js 15 con App Router. Su principal innovación es el **Type Safety automático** sin configuración, lo que elimina una fuente común de bugs y acelera el desarrollo.

Es ideal para:
- ✅ Aplicaciones con múltiples tenants
- ✅ Equipos que valoran Type Safety
- ✅ Proyectos que necesitan control total
- ✅ Apps que priorizan bundle size pequeño

No es ideal para:
- ❌ Apps que requieren cambio de idioma en tiempo real sin URL
- ❌ Proyectos con traducciones dinámicas desde DB
- ❌ Apps que necesitan pluralización compleja automática

**Licencia**: Este código es de dominio público y puede ser usado libremente en cualquier proyecto.

**Autor**: Implementación custom para actitud-bo

**Fecha**: 2026-03-30

---

## Escalando a Aplicaciones Enterprise

Esta sección aborda los desafíos reales que enfrentan aplicaciones grandes y multi-país, donde la duplicación de traducciones y la pérdida de Type Safety con claves dinámicas se convierten en problemas críticos de mantenibilidad.

---

## Desafíos Reales

### Caso de Estudio: Aplicación Multi-País con Formularios Dinámicos

Imagina una aplicación financiera que opera en Argentina y Chile, con múltiples formularios que comparten campos similares pero con nomenclaturas diferentes por país:

```json
{
  "intake": {
    "ar_personal_data": {
      "field_person_id": "CUIL/CUIT",
      "field_first_name": "Nombre(s)",
      "field_phone": "Teléfono móvil",
      "error_person_id": "El CUIL/CUIT es requerido",
      "error_first_name": "El nombre es requerido",
      "error_phone": "El teléfono móvil es requerido",
      "error_birth_date": "La fecha de nacimiento es requerida",
      "error_birth_date_format": "Formato de fecha inválido",
      "error_address_street": "La calle es requerida",
      "error_address_locality": "La localidad es requerida"
    },
    "ar_marital_status": {
      "field_spouse_first_name": "Nombre(s)",
      "field_spouse_phone": "Teléfono",
      "error_spouse_first_name": "El nombre del cónyuge es requerido",
      "error_spouse_phone": "El teléfono del cónyuge es requerido",
      "error_spouse_birth_date": "La fecha de nacimiento del cónyuge es requerida",
      "error_spouse_birth_date_format": "Formato de fecha inválido"
    },
    "cl_personal_data": {
      "field_person_id": "RUT",
      "field_first_name": "Nombre(s)",
      "field_phone": "Teléfono",
      "error_person_id": "El RUT es requerido",
      "error_first_name": "El nombre es requerido",
      "error_phone": "El teléfono es requerido",
      "error_birth_date": "La fecha de nacimiento es requerida",
      "error_birth_date_format": "Formato de fecha inválido",
      "error_address_street": "La calle es requerida",
      "error_address_locality": "La comuna es requerida"
    }
  }
}
```

### Problemas Identificados

#### 1. **Duplicación Masiva** (~60-80% de repetición)
```json
// Estos errores se repiten en TODAS las secciones:
"error_first_name": "El nombre es requerido"
"error_phone": "El teléfono es requerido"
"error_birth_date": "La fecha de nacimiento es requerida"
"error_birth_date_format": "Formato de fecha inválido"
"error_address_street": "La calle es requerida"
```

**Impacto:**
- 50+ secciones × 20 errores comunes = **1,000 claves duplicadas**
- Cambiar "es requerido" → "es obligatorio" requiere editar 1,000 líneas
- Alto riesgo de inconsistencias

#### 2. **Template Literals Dinámicos Rompen Type Safety**

```typescript
// Código típico en la aplicación
function handleApiError(sectionKey: string, field: string) {
  // ❌ Type Safety perdido: string genérico
  const errorKey = `intake.${sectionKey}.error_${field}`

  // ❌ TypeScript no puede validar esta clave
  return t(errorKey as TranslationKey) // Requiere type assertion peligrosa
}

// Uso
handleApiError('ar_personal_data', 'first_name')
// Si escribes mal: handleApiError('ar_personal_data', 'firs_name')
// ✗ No hay error de compilación, falla en runtime
```

#### 3. **Prefijos de País como Tipos del Backend**

```typescript
// Las secciones son tipos importantes que vienen del backend
type SectionKey =
  | 'ar_personal_data'
  | 'ar_marital_status'
  | 'ar_co_applicants'
  | 'cl_personal_data'
  | 'cl_marital_status'
  // ... 50+ secciones más

// Estos tipos se usan en toda la app
interface FormProps {
  sectionKey: SectionKey
  onSubmit: (data: unknown) => void
}
```

**Problema:** No podemos simplemente eliminar los prefijos `ar_` / `cl_` porque son parte de la API del backend.

#### 4. **Traducciones No Usadas (Código Muerto)**

En aplicaciones grandes con años de desarrollo:
- Formularios deprecados pero sus traducciones permanecen
- Refactors que cambiaron claves pero dejaron las antiguas
- **Imposible saber** qué traducciones están realmente en uso

**Estimación:** 20-30% de traducciones no usadas en apps maduras

#### 5. **Manejo de Errores de API con Fallback**

```typescript
// El backend puede retornar errores en dos formatos:
// 1. Código estructurado
{
  "fields_errors": {
    "first_name": { "code": "REQUIRED" },
    "email": { "code": "INVALID_FORMAT" }
  }
}

// 2. Mensaje directo
{
  "errors": {
    "first_name": "This field is required",
    "email": "Invalid email format"
  }
}

// ¿Cómo traducir con prioridad?
// 1. intake.ar_personal_data.error_first_name (específico)
// 2. errors.REQUIRED (genérico por código)
// 3. Mensaje del backend (fallback)
```

---

## Arquitectura Scoped Translator

La solución propuesta mantiene **Type Safety donde importa** (claves estáticas globales) mientras permite **flexibilidad** para casos dinámicos (errores de formulario) con un sistema de fallback que reduce duplicación ~70-80%.

### Concepto: Fallback en Cascada

```
┌────────────────────────────────────────────────────┐
│  t('error_first_name')                             │
└──────────────┬─────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────┐
│ 1. Buscar en sección específica:                   │
│    intake.ar_personal_data.error_first_name        │
│    ✓ Si existe → retornar (override específico)    │
└──────────────┬─────────────────────────────────────┘
               │ No encontrado
               ▼
┌────────────────────────────────────────────────────┐
│ 2. Buscar en errores del país:                     │
│    intake.errors.ar.error_first_name               │
│    ✓ Si existe → retornar (específico de país)     │
└──────────────┬─────────────────────────────────────┘
               │ No encontrado
               ▼
┌────────────────────────────────────────────────────┐
│ 3. Buscar en errores comunes:                      │
│    intake.errors.common.error_first_name           │
│    ✓ Si existe → retornar (DRY - compartido)       │
└──────────────┬─────────────────────────────────────┘
               │ No encontrado
               ▼
┌────────────────────────────────────────────────────┐
│ 4. Fallback: retornar la clave                     │
│    "error_first_name"                              │
└────────────────────────────────────────────────────┘
```

### Implementación Completa

#### Archivo: `src/lib/i18n/scoped-translator.ts`

```typescript
import type { TranslationKey, TranslationParams } from './types'

/**
 * Tipos de secciones que vienen del backend
 * Mantener sincronizado con el backend
 */
export type SectionKey =
  | 'ar_personal_data'
  | 'ar_marital_status'
  | 'ar_co_applicants'
  | 'ar_employment_data'
  | 'ar_documentation'
  | 'cl_personal_data'
  | 'cl_marital_status'
  | 'cl_employment_data'
  // ... agregar todas las secciones del backend

/**
 * Extrae el código de país de una sectionKey
 * @example getCountryCode('ar_personal_data') → 'ar'
 * @example getCountryCode('cl_marital_status') → 'cl'
 */
export function getCountryCode(sectionKey: SectionKey): 'ar' | 'cl' | 'unknown' {
  if (sectionKey.startsWith('ar_')) return 'ar'
  if (sectionKey.startsWith('cl_')) return 'cl'

  console.warn(`Unknown country prefix in section: ${sectionKey}`)
  return 'unknown'
}

/**
 * Opciones de configuración para el traductor con scope
 */
export interface ScopedTranslatorOptions {
  /**
   * Namespace base para buscar traducciones
   * @default 'intake'
   */
  namespace?: string

  /**
   * Si se debe hacer log de las búsquedas fallidas
   * @default true en desarrollo, false en producción
   */
  logMisses?: boolean
}

/**
 * Crea un traductor con scope de sección que:
 * - Mantiene Type Safety para el traductor global
 * - Permite claves dinámicas con fallback automático
 * - Reduce duplicación mediante errores comunes compartidos
 *
 * @param t - Función de traducción global con Type Safety
 * @param sectionKey - Sección actual (ej: 'ar_personal_data')
 * @param options - Opciones de configuración
 *
 * @example
 * const { t: tScoped, tError } = createScopedTranslator(t, 'ar_personal_data')
 *
 * // Busca automáticamente en:
 * // 1. intake.ar_personal_data.error_first_name
 * // 2. intake.errors.ar.error_first_name
 * // 3. intake.errors.common.error_first_name
 * tError('first_name') // → "El nombre es requerido"
 */
export function createScopedTranslator(
  t: (key: TranslationKey, params?: TranslationParams) => string,
  sectionKey: SectionKey,
  options: ScopedTranslatorOptions = {}
) {
  const {
    namespace = 'intake',
    logMisses = process.env.NODE_ENV === 'development'
  } = options

  const countryCode = getCountryCode(sectionKey)

  /**
   * Intenta obtener una traducción, retorna null si no existe
   */
  function tryTranslate(key: string, params?: TranslationParams): string | null {
    const translation = t(key as TranslationKey, params)

    // Si t() retorna la clave misma, significa que no encontró traducción
    return translation !== key ? translation : null
  }

  /**
   * Traduce con fallback en cascada:
   * 1. Sección específica
   * 2. Error específico de país
   * 3. Error común compartido
   * 4. Retorna la clave como fallback
   *
   * @param key - Clave a traducir (sin prefijo de sección)
   * @param params - Parámetros de interpolación
   */
  function tScoped(key: string, params?: TranslationParams): string {
    // Intento 1: Traducción específica de sección
    const sectionSpecificKey = `${namespace}.${sectionKey}.${key}`
    const sectionTranslation = tryTranslate(sectionSpecificKey, params)

    if (sectionTranslation) {
      return sectionTranslation
    }

    // Intento 2: Error específico de país
    if (countryCode !== 'unknown') {
      const countryErrorKey = `${namespace}.errors.${countryCode}.${key}`
      const countryTranslation = tryTranslate(countryErrorKey, params)

      if (countryTranslation) {
        return countryTranslation
      }
    }

    // Intento 3: Error común genérico (DRY)
    const commonErrorKey = `${namespace}.errors.common.${key}`
    const commonTranslation = tryTranslate(commonErrorKey, params)

    if (commonTranslation) {
      return commonTranslation
    }

    // Fallback final: retorna la clave
    if (logMisses) {
      console.warn(
        `[i18n] No translation found for key: "${key}" in section: "${sectionKey}"\n` +
        `  Tried:\n` +
        `    1. ${sectionSpecificKey}\n` +
        `    2. ${namespace}.errors.${countryCode}.${key}\n` +
        `    3. ${commonErrorKey}`
      )
    }

    return key
  }

  /**
   * Helper para errores de campo: error_{field}
   *
   * @example
   * tError('first_name')
   * // Busca: error_first_name
   */
  function tError(field: string, params?: TranslationParams): string {
    return tScoped(`error_${field}`, params)
  }

  /**
   * Helper para labels de campo: field_{field}
   *
   * @example
   * tField('first_name')
   * // Busca: field_first_name → "Nombre(s)"
   */
  function tField(field: string, params?: TranslationParams): string {
    return tScoped(`field_${field}`, params)
  }

  /**
   * Helper para opciones de campo: {field}_{option}
   *
   * @example
   * tOption('marital_status', 'single')
   * // Busca: marital_status_single → "Soltero/a"
   */
  function tOption(field: string, option: string, params?: TranslationParams): string {
    return tScoped(`${field}_${option}`, params)
  }

  return {
    /**
     * Traducción con scope y fallback automático
     * Uso: t('form_title') o t('error_first_name')
     */
    t: tScoped,

    /**
     * Atajo para errores: tError('first_name') → busca 'error_first_name'
     */
    tError,

    /**
     * Atajo para labels de campos: tField('first_name') → busca 'field_first_name'
     */
    tField,

    /**
     * Atajo para opciones: tOption('status', 'active') → busca 'status_active'
     */
    tOption,

    /**
     * Acceso al traductor global original (con Type Safety completo)
     */
    tGlobal: t,

    /**
     * Información de contexto
     */
    context: {
      sectionKey,
      countryCode,
      namespace
    }
  }
}

/**
 * Tipo de retorno de createScopedTranslator
 * Útil para tipar en hooks custom
 */
export type ScopedTranslator = ReturnType<typeof createScopedTranslator>
```

### Uso en Componentes de Formulario

```typescript
// components/sections/PersonalDataForm.tsx
'use client'

import { useTranslations } from '@/lib/i18n/context'
import { createScopedTranslator, type SectionKey } from '@/lib/i18n/scoped-translator'
import { useState } from 'react'

interface PersonalDataFormProps {
  sectionKey: SectionKey // 'ar_personal_data' | 'cl_personal_data'
}

export function PersonalDataForm({ sectionKey }: PersonalDataFormProps) {
  const { t: tGlobal } = useTranslations()

  // ✅ Crea traductor con scope y fallback automático
  const { t, tError, tField, tGlobal: tg } = createScopedTranslator(tGlobal, sectionKey)

  const [errors, setErrors] = useState<Record<string, string>>({})

  return (
    <form>
      {/* ✅ Type Safety completo con traductor global */}
      <h1>{t('form_title')}</h1>
      <p>{tg('common.loading')}</p>

      {/* ✅ Campo con label dinámico */}
      <div>
        <label htmlFor="first_name">{tField('first_name')}</label>
        {/*
          Busca en orden:
          1. intake.ar_personal_data.field_first_name
          2. intake.errors.ar.field_first_name
          3. intake.errors.common.field_first_name
        */}

        <input id="first_name" name="first_name" />

        {/* ✅ Error dinámico con fallback */}
        {errors.first_name && (
          <span className="error">
            {tError('first_name')}
          </span>
        )}
        {/*
          Busca 'error_first_name' en:
          1. intake.ar_personal_data.error_first_name (override de sección)
          2. intake.errors.ar.error_first_name (específico de país)
          3. intake.errors.common.error_first_name ✓ (ENCONTRADO - DRY!)

          Resultado: "El nombre es requerido"
        */}
      </div>

      {/* ✅ Campo específico de país */}
      <div>
        <label htmlFor="person_id">{tField('person_id')}</label>
        {/*
          AR: Busca field_person_id → "CUIL/CUIT" (de errors.ar)
          CL: Busca field_person_id → "RUT" (de errors.cl)
        */}

        <input id="person_id" name="person_id" />

        {errors.person_id && (
          <span className="error">{tError('person_id')}</span>
        )}
        {/*
          AR: "El CUIL/CUIT es requerido" (de errors.ar)
          CL: "El RUT es requerido" (de errors.cl)
        */}
      </div>

      {/* Botones con textos globales */}
      <button type="submit">{tGlobal('common.save')}</button>
      <button type="button">{tGlobal('common.cancel')}</button>
    </form>
  )
}
```

### Hook Custom para Formularios

```typescript
// hooks/useSectionForm.ts

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n/context'
import { createScopedTranslator, type SectionKey } from '@/lib/i18n/scoped-translator'

/**
 * Hook para manejar formularios con traducciones scoped
 * y manejo automático de errores de API
 *
 * @example
 * const { tError, tField, handleApiError, fieldErrors } = useSectionForm('ar_personal_data')
 */
export function useSectionForm<T extends Record<string, unknown>>(
  sectionKey: SectionKey
) {
  const { t: tGlobal } = useTranslations()
  const scopedTranslator = createScopedTranslator(tGlobal, sectionKey)

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Maneja errores de API con fallback automático
   * Soporta dos formatos:
   * - fields_errors: { field: { code: "ERROR_CODE" } }
   * - errors: { field: "human message" }
   */
  function handleApiError(error: {
    fields_errors?: Record<string, { code: string } | unknown>
    errors?: Record<string, string>
  }) {
    const translated: Partial<Record<keyof T, string>> = {}

    if (error.fields_errors) {
      for (const [field, detail] of Object.entries(error.fields_errors)) {
        // Extrae el código de error
        const code = typeof detail === 'object' && detail !== null && 'code' in detail
          ? String((detail as { code: string }).code)
          : String(detail)

        // Intenta traducir el código específico
        const codeTranslation = scopedTranslator.t(`error_${field}_${code.toLowerCase()}`)

        if (codeTranslation !== `error_${field}_${code.toLowerCase()}`) {
          // Encontró traducción específica para el código
          translated[field as keyof T] = codeTranslation
        } else {
          // Fallback: traducción genérica del campo
          translated[field as keyof T] = scopedTranslator.tError(field)
        }
      }
    } else if (error.errors) {
      for (const [field, message] of Object.entries(error.errors)) {
        // Intenta traducción, si no existe usa mensaje del backend
        const translation = scopedTranslator.tError(field)

        translated[field as keyof T] = translation !== `error_${field}`
          ? translation
          : message // Fallback al mensaje del backend
      }
    }

    if (Object.keys(translated).length > 0) {
      setFieldErrors(translated)
    }
  }

  /**
   * Limpia errores de campos específicos
   */
  function clearFieldErrors(...fields: (keyof T)[]) {
    setFieldErrors(prev => {
      const next = { ...prev }
      fields.forEach(field => delete next[field])
      return next
    })
  }

  /**
   * Limpia todos los errores
   */
  function clearAllErrors() {
    setFieldErrors({})
  }

  return {
    // Traducciones
    ...scopedTranslator,

    // Estado de errores
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,

    // Manejo de errores
    handleApiError,
    clearFieldErrors,
    clearAllErrors,

    // Estado de envío
    isSubmitting,
    setIsSubmitting
  }
}
```

### Ejemplo de Uso del Hook

```typescript
// components/sections/PersonalDataForm.tsx
'use client'

import { useSectionForm } from '@/hooks/useSectionForm'
import type { SectionKey } from '@/lib/i18n/scoped-translator'

interface PersonalDataFormProps {
  sectionKey: SectionKey
  onSubmit: (data: FormData) => Promise<void>
}

export function PersonalDataForm({ sectionKey, onSubmit }: PersonalDataFormProps) {
  const {
    t,
    tError,
    tField,
    tGlobal,
    fieldErrors,
    handleApiError,
    clearFieldErrors,
    isSubmitting,
    setIsSubmitting
  } = useSectionForm(sectionKey)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      await onSubmit(formData)
    } catch (error) {
      // ✅ Manejo automático de errores con traducción
      if (error && typeof error === 'object' && ('fields_errors' in error || 'errors' in error)) {
        handleApiError(error as any)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{t('form_title')}</h1>

      <div>
        <label htmlFor="first_name">
          {tField('first_name')}
        </label>
        <input
          id="first_name"
          name="first_name"
          onChange={() => clearFieldErrors('first_name')}
          aria-invalid={!!fieldErrors.first_name}
          aria-describedby={fieldErrors.first_name ? 'first_name-error' : undefined}
        />
        {fieldErrors.first_name && (
          <span id="first_name-error" className="error">
            {fieldErrors.first_name}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="person_id">
          {tField('person_id')}
        </label>
        <input
          id="person_id"
          name="person_id"
          onChange={() => clearFieldErrors('person_id')}
          aria-invalid={!!fieldErrors.person_id}
        />
        {fieldErrors.person_id && (
          <span className="error">{fieldErrors.person_id}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? tGlobal('common.loading') : tGlobal('common.save')}
      </button>
    </form>
  )
}
```

---

## Refactorización DRY del JSON

### Estructura Anterior (Con Duplicación)

```json
// ANTES: ~3,500 líneas con ~70% duplicación
{
  "intake": {
    "ar_personal_data": {
      "form_title": "Revisá tus datos personales",
      "field_person_id": "CUIL/CUIT",
      "field_first_name": "Nombre(s)",
      "field_phone": "Teléfono móvil",
      "error_person_id": "El CUIL/CUIT es requerido",
      "error_first_name": "El nombre es requerido",      // ← DUPLICADO
      "error_phone": "El teléfono es requerido",         // ← DUPLICADO
      "error_birth_date": "La fecha de nacimiento es requerida",  // ← DUPLICADO
      "error_birth_date_format": "Formato de fecha inválido",     // ← DUPLICADO
      "error_address_street": "La calle es requerida"    // ← DUPLICADO
    },
    "ar_marital_status": {
      "form_title": "Indicanos tu estado civil",
      "error_first_name": "El nombre es requerido",      // ← DUPLICADO
      "error_phone": "El teléfono es requerido",         // ← DUPLICADO
      "error_birth_date": "La fecha de nacimiento es requerida",  // ← DUPLICADO
      "error_birth_date_format": "Formato de fecha inválido"      // ← DUPLICADO
    },
    "cl_personal_data": {
      "form_title": "Revisa tus datos personales",
      "field_person_id": "RUT",
      "field_first_name": "Nombre(s)",
      "field_phone": "Teléfono",
      "error_person_id": "El RUT es requerido",
      "error_first_name": "El nombre es requerido",      // ← DUPLICADO
      "error_phone": "El teléfono es requerido",         // ← DUPLICADO
      "error_birth_date": "La fecha de nacimiento es requerida",  // ← DUPLICADO
      "error_birth_date_format": "Formato de fecha inválido",     // ← DUPLICADO
      "error_address_street": "La calle es requerida"    // ← DUPLICADO
    }
    // ... 50+ secciones más con los mismos errores repetidos
  }
}
```

**Problemas:**
- `error_first_name` aparece 50 veces
- `error_phone` aparece 45 veces
- `error_birth_date` aparece 48 veces
- Cambiar un texto requiere buscar/reemplazar en 50 lugares
- Riesgo alto de inconsistencias

### Estructura Nueva (DRY - Don't Repeat Yourself)

```json
// DESPUÉS: ~1,200 líneas con ~15% duplicación
{
  "intake": {
    // ✅ ERRORES COMUNES COMPARTIDOS (DRY)
    "errors": {
      "common": {
        // Errores que son iguales en todos los países y secciones
        "error_first_name": "El nombre es requerido",
        "error_last_name": "El apellido es requerido",
        "error_phone": "El teléfono es requerido",
        "error_email": "El correo electrónico es requerido",
        "error_email_format": "Formato de correo electrónico inválido",
        "error_birth_date": "La fecha de nacimiento es requerida",
        "error_birth_date_format": "Formato de fecha inválido",
        "error_birth_date_future": "La fecha de nacimiento no puede ser posterior al día de hoy",
        "error_birth_date_underage": "Debe ser mayor de 18 años",
        "error_address_street": "La calle es requerida",
        "error_address_postal_code": "El código postal es requerido",
        "field_first_name": "Nombre(s)",
        "field_phone": "Teléfono",
        "field_email": "Correo electrónico",
        "field_birth_date": "Fecha de nacimiento"
      },

      // ✅ ERRORES ESPECÍFICOS DE ARGENTINA
      "ar": {
        "field_person_id": "CUIL/CUIT",
        "error_person_id": "El CUIL/CUIT es requerido",
        "error_person_id_format": "El formato del CUIL/CUIT debe ser XX-XXXXXXXX-X",
        "field_father_surname": "Apellido(s)",
        "error_father_surname": "El apellido es requerido",
        "error_address_state": "La provincia es requerida",
        "error_address_locality": "La localidad es requerida"
      },

      // ✅ ERRORES ESPECÍFICOS DE CHILE
      "cl": {
        "field_person_id": "RUT",
        "error_person_id": "El RUT es requerido",
        "error_person_id_format": "El formato del RUT es inválido",
        "field_father_surname": "Apellido Paterno",
        "field_mother_surname": "Apellido Materno",
        "error_father_surname": "El apellido paterno es requerido",
        "error_mother_surname": "El apellido materno es requerido",
        "error_address_state": "La región es requerida",
        "error_address_locality": "La comuna es requerida"
      }
    },

    // ✅ SECCIONES CON SOLO LO ESPECÍFICO
    "ar_personal_data": {
      "form_title": "Revisá tus datos personales",
      "field_phone": "Teléfono móvil",  // Override específico
      // Solo override si el error tiene contexto específico
      "error_birth_date_underage": "El solicitante debe ser mayor de 18 años"
    },

    "ar_marital_status": {
      "form_title": "Indicanos tu estado civil",
      "option_single": "Soltero/a",
      "option_married": "Casado/a",
      // Errores comunes se heredan automáticamente
      "error_birth_date_underage": "El cónyuge debe ser mayor de 18 años"
    },

    "cl_personal_data": {
      "form_title": "Revisa tus datos personales",
      // Hereda todos los errores de errors.cl y errors.common
      "field_phone": "Teléfono"  // Override si es diferente
    },

    "cl_marital_status": {
      "form_title": "Indica tu estado civil",
      "option_single": "Soltero/a",
      "option_married": "Casado/a"
      // Hereda errors.cl + errors.common
    }
  }
}
```

### Comparativa: Antes vs Después

| Métrica | Antes (Duplicado) | Después (DRY) | Mejora |
|---------|-------------------|---------------|--------|
| **Líneas totales** | ~3,500 | ~1,200 | -66% |
| **Claves duplicadas** | ~2,400 | ~350 | -85% |
| **Mantenibilidad** | Cambiar 50 lugares | Cambiar 1 lugar | +5000% |
| **Inconsistencias** | Alto riesgo | Casi nulo | ✅ |
| **Legibilidad** | Difícil | Fácil | ✅ |

### Estrategia de Extracción

#### 1. **Identificar Candidatos para `errors.common`**

Criterios:
- Aparece en 3+ secciones
- Texto idéntico en todas las ocurrencias
- No depende del contexto de la sección

```bash
# Script para encontrar duplicados
grep -r "error_first_name" dictionaries/ | wc -l
# Resultado: 50 ocurrencias → Candidato perfecto
```

#### 2. **Identificar Candidatos para `errors.{country}`**

Criterios:
- Aparece en todas las secciones de un país
- Varía entre países
- Relacionado con legislación o nomenclatura local

Ejemplos:
- `error_person_id`: "CUIL/CUIT" (AR) vs "RUT" (CL)
- `error_address_state`: "provincia" (AR) vs "región" (CL)

#### 3. **Mantener en Sección Específica**

Criterios:
- Aparece solo en 1-2 secciones
- Contexto muy específico
- Mensaje personalizado

Ejemplo:
```json
{
  "ar_co_applicants": {
    // ✅ Específico de esta sección
    "error_at_least_one_co_applicant": "Debe agregar al menos un codeudor",
    "error_complete_current_co_applicant": "Por favor completá todos los campos del codeudor actual"
  }
}
```

### Ejemplo de Migración Real

#### Paso 1: Análisis de Sección

```json
// ANTES: ar_personal_data (original)
{
  "ar_personal_data": {
    "form_title": "Revisá tus datos personales",
    "field_person_id": "CUIL/CUIT",                     // → errors.ar
    "field_first_name": "Nombre(s)",                    // → errors.common
    "field_phone": "Teléfono móvil",                    // → Mantener (override)
    "error_person_id": "El CUIL/CUIT es requerido",     // → errors.ar
    "error_first_name": "El nombre es requerido",       // → errors.common
    "error_phone": "El teléfono móvil es requerido",    // → errors.common (base)
    "error_birth_date": "La fecha de nacimiento es requerida",     // → errors.common
    "error_birth_date_format": "Formato de fecha inválido",        // → errors.common
    "error_birth_date_underage": "El solicitante debe ser mayor de 18 años"  // → Mantener (contexto)
  }
}
```

#### Paso 2: Extracción a Layers

```json
// DESPUÉS: Distribuido en 3 capas
{
  "intake": {
    "errors": {
      "common": {
        "field_first_name": "Nombre(s)",
        "field_phone": "Teléfono",
        "error_first_name": "El nombre es requerido",
        "error_phone": "El teléfono es requerido",
        "error_birth_date": "La fecha de nacimiento es requerida",
        "error_birth_date_format": "Formato de fecha inválido",
        "error_birth_date_underage": "Debe ser mayor de 18 años"  // Genérico
      },
      "ar": {
        "field_person_id": "CUIL/CUIT",
        "error_person_id": "El CUIL/CUIT es requerido"
      }
    },
    "ar_personal_data": {
      "form_title": "Revisá tus datos personales",
      "field_phone": "Teléfono móvil",  // Override específico
      "error_birth_date_underage": "El solicitante debe ser mayor de 18 años"  // Override con contexto
    }
  }
}
```

#### Paso 3: Verificar Fallback

```typescript
// Código que usa la nueva estructura
const { tField, tError } = createScopedTranslator(t, 'ar_personal_data')

tField('person_id')
// 1. intake.ar_personal_data.field_person_id → ✗ No existe
// 2. intake.errors.ar.field_person_id → ✓ "CUIL/CUIT"

tField('phone')
// 1. intake.ar_personal_data.field_phone → ✓ "Teléfono móvil" (override)

tError('first_name')
// 1. intake.ar_personal_data.error_first_name → ✗ No existe
// 2. intake.errors.ar.error_first_name → ✗ No existe
// 3. intake.errors.common.error_first_name → ✓ "El nombre es requerido"

tError('birth_date_underage')
// 1. intake.ar_personal_data.error_birth_date_underage → ✓ "El solicitante debe ser mayor de 18 años" (override)
```

### Reglas de Oro para DRY

1. **Common primero**: Si es idéntico en todos lados → `errors.common`
2. **País después**: Si varía por país → `errors.{country}`
3. **Sección al final**: Solo overrides específicos con contexto
4. **Documenta overrides**: Comentar por qué un override es necesario

```json
{
  "ar_personal_data": {
    "field_phone": "Teléfono móvil",  // Override: AR usa "móvil", CL usa solo "Teléfono"
    "error_birth_date_underage": "El solicitante debe ser mayor de 18 años"  // Override: contexto "solicitante" vs genérico
  }
}
```

---

## Herramientas de Auditoría

### 1. Script: Detectar Traducciones No Usadas

```typescript
// scripts/check-unused-translations.ts

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

/**
 * Encuentra todas las llamadas a t(), tError(), tField() en el código
 */
async function findUsedKeys(): Promise<Set<string>> {
  const usedKeys = new Set<string>()

  // Busca todos los archivos TypeScript/TSX
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  })

  for (const file of files) {
    const content = readFileSync(file, 'utf-8')

    // Regex para detectar:
    // - t('key')
    // - t("key")
    // - tError('field')
    // - tField('field')
    // - tOption('field', 'option')
    const patterns = [
      /\bt\(['"]([^'"]+)['"]\)/g,
      /\btError\(['"]([^'"]+)['"]\)/g,
      /\btField\(['"]([^'"]+)['"]\)/g,
      /\btOption\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g
    ]

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern)

      for (const match of matches) {
        if (match[1]) {
          usedKeys.add(match[1])

          // Para tError/tField, agregar también con prefijo
          if (pattern.source.includes('tError')) {
            usedKeys.add(`error_${match[1]}`)
          } else if (pattern.source.includes('tField')) {
            usedKeys.add(`field_${match[1]}`)
          } else if (pattern.source.includes('tOption') && match[2]) {
            usedKeys.add(`${match[1]}_${match[2]}`)
          }
        }
      }
    }
  }

  return usedKeys
}

/**
 * Obtiene todas las claves del JSON de traducciones recursivamente
 */
function getAllKeysRecursive(
  obj: Record<string, any>,
  prefix = ''
): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeysRecursive(value, fullKey))
    } else if (typeof value === 'string') {
      keys.push(fullKey)
    }
  }

  return keys
}

/**
 * Compara traducciones definidas vs usadas
 */
async function findUnusedTranslations() {
  console.log('🔍 Buscando claves usadas en el código...\n')

  const usedKeys = await findUsedKeys()
  console.log(`✅ Encontradas ${usedKeys.size} claves únicas en uso\n`)

  console.log('📖 Leyendo archivo de traducciones...\n')

  const translationsPath = 'src/lib/i18n/dictionaries/es.json'
  const translations = JSON.parse(readFileSync(translationsPath, 'utf-8'))

  const allKeys = getAllKeysRecursive(translations)
  console.log(`📚 Encontradas ${allKeys.length} claves en el diccionario\n`)

  // Encuentra claves no usadas
  const unusedKeys = allKeys.filter(key => {
    // Considera tanto la clave completa como sin prefijo de namespace
    const withoutNamespace = key.replace(/^[^.]+\./, '')
    return !usedKeys.has(key) && !usedKeys.has(withoutNamespace)
  })

  if (unusedKeys.length === 0) {
    console.log('✅ ¡Todas las traducciones están en uso!')
    return
  }

  console.log(`⚠️  Encontradas ${unusedKeys.length} traducciones potencialmente no usadas:\n`)

  // Agrupa por sección
  const bySection: Record<string, string[]> = {}

  for (const key of unusedKeys) {
    const section = key.split('.')[1] || 'root'
    if (!bySection[section]) {
      bySection[section] = []
    }
    bySection[section].push(key)
  }

  // Imprime agrupado
  for (const [section, keys] of Object.entries(bySection)) {
    console.log(`\n📦 ${section} (${keys.length}):`)
    keys.slice(0, 10).forEach(k => console.log(`  - ${k}`))
    if (keys.length > 10) {
      console.log(`  ... y ${keys.length - 10} más`)
    }
  }

  // Estadísticas
  const unusedPercentage = ((unusedKeys.length / allKeys.length) * 100).toFixed(1)
  console.log(`\n📊 Estadísticas:`)
  console.log(`  - Total claves: ${allKeys.length}`)
  console.log(`  - Claves usadas: ${allKeys.length - unusedKeys.length}`)
  console.log(`  - Claves no usadas: ${unusedKeys.length} (${unusedPercentage}%)`)

  // Guardar reporte
  const report = {
    date: new Date().toISOString(),
    totalKeys: allKeys.length,
    usedKeys: allKeys.length - unusedKeys.length,
    unusedKeys: unusedKeys.length,
    unusedPercentage: parseFloat(unusedPercentage),
    unused: bySection
  }

  writeFileSync(
    'i18n-unused-report.json',
    JSON.stringify(report, null, 2)
  )

  console.log(`\n💾 Reporte guardado en: i18n-unused-report.json`)
}

// Ejecutar
findUnusedTranslations().catch(console.error)
```

**Uso:**
```bash
npx tsx scripts/check-unused-translations.ts
```

**Output Ejemplo:**
```
🔍 Buscando claves usadas en el código...

✅ Encontradas 1,247 claves únicas en uso

📖 Leyendo archivo de traducciones...

📚 Encontradas 1,856 claves en el diccionario

⚠️  Encontradas 609 traducciones potencialmente no usadas:

📦 ar_employment_data (87):
  - intake.ar_employment_data.legacy_field_old
  - intake.ar_employment_data.deprecated_message
  ... y 85 más

📦 errors (12):
  - intake.errors.common.error_legacy_validation
  ... y 11 más

📊 Estadísticas:
  - Total claves: 1,856
  - Claves usadas: 1,247
  - Claves no usadas: 609 (32.8%)

💾 Reporte guardado en: i18n-unused-report.json
```

### 2. Script: Detectar Duplicaciones

```typescript
// scripts/find-duplicate-translations.ts

import { readFileSync } from 'fs'

/**
 * Encuentra traducciones duplicadas en el JSON
 */
function findDuplicateTranslations() {
  console.log('🔍 Buscando traducciones duplicadas...\n')

  const translationsPath = 'src/lib/i18n/dictionaries/es.json'
  const translations = JSON.parse(readFileSync(translationsPath, 'utf-8'))

  // Mapa: texto → [claves que tienen ese texto]
  const textToKeys: Map<string, string[]> = new Map()

  function scanObject(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === 'string') {
        const existing = textToKeys.get(value) || []
        existing.push(fullKey)
        textToKeys.set(value, existing)
      } else if (typeof value === 'object' && value !== null) {
        scanObject(value, fullKey)
      }
    }
  }

  scanObject(translations)

  // Filtra solo los que aparecen más de una vez
  const duplicates: Array<{ text: string; keys: string[]; count: number }> = []

  for (const [text, keys] of textToKeys.entries()) {
    if (keys.length > 1) {
      duplicates.push({ text, keys, count: keys.length })
    }
  }

  // Ordena por cantidad de duplicados
  duplicates.sort((a, b) => b.count - a.count)

  if (duplicates.length === 0) {
    console.log('✅ No se encontraron duplicados')
    return
  }

  console.log(`⚠️  Encontrados ${duplicates.length} textos duplicados\n`)

  // Top 20 duplicados
  console.log('🏆 Top 20 duplicados:\n')

  duplicates.slice(0, 20).forEach((dup, index) => {
    console.log(`${index + 1}. "${dup.text}" (${dup.count} veces):`)
    dup.keys.forEach(key => console.log(`   - ${key}`))
    console.log()
  })

  // Estadísticas
  const totalDuplicatedKeys = duplicates.reduce((sum, d) => sum + d.count, 0)
  const totalKeys = Array.from(textToKeys.values()).reduce((sum, keys) => sum + keys.length, 0)
  const duplicationRate = ((totalDuplicatedKeys / totalKeys) * 100).toFixed(1)

  console.log(`📊 Estadísticas:`)
  console.log(`  - Total textos únicos: ${textToKeys.size}`)
  console.log(`  - Textos duplicados: ${duplicates.length}`)
  console.log(`  - Total claves afectadas: ${totalDuplicatedKeys} de ${totalKeys} (${duplicationRate}%)`)

  // Candidatos para errors.common
  console.log(`\n💡 Candidatos para errors.common (aparecen 5+ veces):\n`)

  const candidates = duplicates.filter(d => d.count >= 5 && d.keys[0].includes('error_'))

  candidates.forEach(dup => {
    const baseKey = dup.keys[0].split('.').pop()
    console.log(`  "${baseKey}": "${dup.text}",  // ${dup.count} ocurrencias`)
  })
}

// Ejecutar
findDuplicateTranslations()
```

**Output Ejemplo:**
```
🔍 Buscando traducciones duplicadas...

⚠️  Encontrados 187 textos duplicados

🏆 Top 20 duplicados:

1. "El nombre es requerido" (52 veces):
   - intake.ar_personal_data.error_first_name
   - intake.ar_marital_status.error_first_name
   - intake.cl_personal_data.error_first_name
   ...

2. "El teléfono es requerido" (48 veces):
   - intake.ar_personal_data.error_phone
   - intake.ar_employment_data.error_phone
   ...

📊 Estadísticas:
  - Total textos únicos: 1,342
  - Textos duplicados: 187
  - Total claves afectadas: 2,156 de 3,498 (61.6%)

💡 Candidatos para errors.common (aparecen 5+ veces):

  "error_first_name": "El nombre es requerido",  // 52 ocurrencias
  "error_phone": "El teléfono es requerido",  // 48 ocurrencias
  "error_birth_date": "La fecha de nacimiento es requerida",  // 45 ocurrencias
  "error_email": "El correo electrónico es requerido",  // 38 ocurrencias
  ...
```

### 3. Pre-commit Hook para Validación

```bash
# .husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validando traducciones..."

# Verifica type-check (valida TranslationKey types)
npm run type-check

if [ $? -ne 0 ]; then
  echo "❌ Type check falló. Hay claves de traducción inválidas."
  exit 1
fi

echo "✅ Traducciones validadas"
```

### 4. GitHub Action para Auditoría Continua

```yaml
# .github/workflows/i18n-audit.yml

name: I18n Audit

on:
  pull_request:
    paths:
      - 'src/lib/i18n/dictionaries/**'
      - 'src/**/*.ts'
      - 'src/**/*.tsx'

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Find unused translations
        run: npx tsx scripts/check-unused-translations.ts

      - name: Find duplicates
        run: npx tsx scripts/find-duplicate-translations.ts

      - name: Comment PR with results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const report = JSON.parse(fs.readFileSync('i18n-unused-report.json', 'utf8'))

            const body = `
            ## 🌐 I18n Audit Report

            **Unused Translations:** ${report.unusedKeys} (${report.unusedPercentage}%)

            ${report.unusedKeys > 50 ? '⚠️ Consider cleaning up unused keys' : '✅ Looking good!'}

            <details>
            <summary>View Details</summary>

            \`\`\`json
            ${JSON.stringify(report, null, 2)}
            \`\`\`
            </details>
            `

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body
            })
```

---

## Plan de Migración

### Fase 1: Preparación (Semana 1)

#### 1.1 Auditoría Inicial
```bash
# Ejecutar scripts de auditoría
npm run i18n:audit
npm run i18n:duplicates

# Revisar reportes
cat i18n-unused-report.json
cat i18n-duplicates-report.json
```

**Entregables:**
- Reporte de traducciones no usadas
- Reporte de duplicaciones
- Lista de candidatos para `errors.common`
- Lista de candidatos para `errors.{country}`

#### 1.2 Implementar Scoped Translator

```typescript
// 1. Crear archivo src/lib/i18n/scoped-translator.ts
// (Usar código de la sección "Arquitectura Scoped Translator")

// 2. Crear hook src/hooks/useSectionForm.ts
// (Usar código de la sección "Hook Custom para Formularios")

// 3. Agregar tests
// tests/scoped-translator.test.ts
```

#### 1.3 Crear Nueva Estructura JSON

```json
// src/lib/i18n/dictionaries/es-new.json
{
  "intake": {
    "errors": {
      "common": {
        // Extraer del reporte de duplicados (top 50)
      },
      "ar": {
        // Errores específicos de Argentina
      },
      "cl": {
        // Errores específicos de Chile
      }
    },
    // Secciones existentes (sin cambios por ahora)
    "ar_personal_data": { ...existing },
    "cl_personal_data": { ...existing }
  }
}
```

### Fase 2: Migración Gradual (Semanas 2-4)

#### 2.1 Migrar Por Dominio

**Prioridad de migración:**
1. Secciones más duplicadas (mayor ROI)
2. Secciones más usadas (mayor impacto)
3. Secciones nuevas (menos riesgo)

```typescript
// Ejemplo: Migrar ar_personal_data

// ANTES
{
  "ar_personal_data": {
    "field_first_name": "Nombre(s)",
    "error_first_name": "El nombre es requerido",
    "error_phone": "El teléfono es requerido"
    // ... 50 más
  }
}

// DESPUÉS
{
  "errors": {
    "common": {
      "field_first_name": "Nombre(s)",
      "error_first_name": "El nombre es requerido",
      "error_phone": "El teléfono es requerido"
    }
  },
  "ar_personal_data": {
    // Solo overrides específicos
    "form_title": "Revisá tus datos personales"
  }
}
```

#### 2.2 Migrar Componentes

```typescript
// ANTES
function PersonalDataForm({ sectionKey }: Props) {
  const { t } = useTranslations()

  return (
    <div>
      <label>{t(`intake.${sectionKey}.field_first_name` as TranslationKey)}</label>
      // ❌ Type assertion peligrosa
    </div>
  )
}

// DESPUÉS
function PersonalDataForm({ sectionKey }: Props) {
  const { tField, tError } = useSectionForm(sectionKey)

  return (
    <div>
      <label>{tField('first_name')}</label>
      // ✅ Type safe, con fallback automático
    </div>
  )
}
```

#### 2.3 Testing Paralelo

```typescript
// Ejecutar ambas versiones en paralelo durante la migración
const { t: tOld } = useTranslations()
const { tField: tNew } = useSectionForm(sectionKey)

// Validar que retornan lo mismo
const oldValue = tOld(`intake.${sectionKey}.field_first_name` as TranslationKey)
const newValue = tNew('first_name')

if (oldValue !== newValue && process.env.NODE_ENV === 'development') {
  console.warn(`Translation mismatch: ${oldValue} !== ${newValue}`)
}
```

### Fase 3: Validación (Semana 5)

#### 3.1 Tests End-to-End

```typescript
// tests/e2e/forms.spec.ts

describe('Forms with new i18n system', () => {
  test('ar_personal_data shows correct translations', async ({ page }) => {
    await page.goto('/intake/ar_personal_data')

    // Verifica labels
    await expect(page.locator('label[for="first_name"]')).toHaveText('Nombre(s)')
    await expect(page.locator('label[for="person_id"]')).toHaveText('CUIL/CUIT')

    // Verifica errores
    await page.click('button[type="submit"]')
    await expect(page.locator('#first_name-error')).toHaveText('El nombre es requerido')
  })

  test('cl_personal_data shows correct translations', async ({ page }) => {
    await page.goto('/intake/cl_personal_data')

    // Verifica labels
    await expect(page.locator('label[for="person_id"]')).toHaveText('RUT')

    // Verifica errores
    await page.click('button[type="submit"]')
    await expect(page.locator('#first_name-error')).toHaveText('El nombre es requerido')
  })
})
```

#### 3.2 Auditoría Post-Migración

```bash
# Ejecutar nuevamente los scripts
npm run i18n:audit
npm run i18n:duplicates

# Comparar con reportes iniciales
# Esperado: -70% duplicación, -30% claves no usadas
```

### Fase 4: Limpieza (Semana 6)

#### 4.1 Eliminar Traducciones No Usadas

```typescript
// Script automático para limpiar
// scripts/cleanup-unused-translations.ts

import { readFileSync, writeFileSync } from 'fs'

const report = JSON.parse(readFileSync('i18n-unused-report.json', 'utf-8'))
const translations = JSON.parse(readFileSync('src/lib/i18n/dictionaries/es.json', 'utf-8'))

// Eliminar claves no usadas
function removeUnused(obj: any, unusedKeys: Set<string>, prefix = ''): any {
  const result: any = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null) {
      const nested = removeUnused(value, unusedKeys, fullKey)
      if (Object.keys(nested).length > 0) {
        result[key] = nested
      }
    } else if (!unusedKeys.has(fullKey)) {
      result[key] = value
    }
  }

  return result
}

const unusedSet = new Set(Object.values(report.unused).flat())
const cleaned = removeUnused(translations, unusedSet)

writeFileSync('src/lib/i18n/dictionaries/es-cleaned.json', JSON.stringify(cleaned, null, 2))

console.log(`✅ Eliminadas ${unusedSet.size} claves no usadas`)
```

#### 4.2 Documentación Final

```markdown
# I18N Migration Complete ✅

## Resultados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Líneas de código | 3,500 | 1,200 | -66% |
| Claves duplicadas | 2,400 | 350 | -85% |
| Claves no usadas | 609 | 87 | -86% |
| Type Safety | Parcial | Completo | ✅ |

## Nuevas Convenciones

1. Usar `useSectionForm()` para todos los formularios
2. Agregar nuevas traducciones en `errors.common` si aplican a 3+ secciones
3. Usar `errors.{country}` para textos específicos de país
4. Solo usar overrides de sección para contexto muy específico
5. Ejecutar `npm run i18n:audit` antes de cada PR

## Recursos

- [Scoped Translator API](docs/i18n-scoped-translator.md)
- [useSectionForm Hook](docs/use-section-form.md)
- [Migration Guide](docs/i18n-migration.md)
```

### Checklist de Migración

```markdown
## Pre-Migración
- [ ] Auditoría inicial ejecutada
- [ ] Reportes de duplicados generados
- [ ] Scoped Translator implementado
- [ ] Hook useSectionForm creado
- [ ] Tests unitarios para scoped translator

## Por Cada Sección
- [ ] Identificar candidatos para errors.common
- [ ] Identificar candidatos para errors.{country}
- [ ] Mover traducciones a nuevas capas
- [ ] Actualizar componentes para usar useSectionForm
- [ ] Testing paralelo (old vs new)
- [ ] Tests E2E actualizados

## Post-Migración
- [ ] Auditoría post-migración ejecutada
- [ ] Eliminar traducciones no usadas
- [ ] Actualizar documentación
- [ ] Training del equipo
- [ ] Agregar pre-commit hooks
- [ ] Configurar GitHub Actions
```

---

## Conclusión de la Sección Enterprise

Este sistema de i18n enterprise representa una **evolución pragmática** del sistema base, diseñado específicamente para aplicaciones grandes con múltiples países y cientos de formularios.

### Logros Clave

1. **Reducción de Duplicación**: 85% menos claves duplicadas
2. **Type Safety Híbrido**: Completo para claves estáticas, flexible para dinámicas
3. **Mantenibilidad**: Cambiar un texto en 1 lugar en vez de 50
4. **Auditoría Automatizada**: Scripts y CI/CD para detectar problemas
5. **Migración Gradual**: Plan paso a paso sin big bang

### Cuándo Usar Esta Arquitectura

✅ **Ideal para:**
- Aplicaciones multi-país (2+ países)
- 20+ formularios con campos similares
- Equipos grandes (5+ desarrolladores)
- Apps maduras con años de desarrollo
- Alto volumen de traducciones (1,000+ claves)

❌ **Sobredimensionada para:**
- Apps pequeñas (< 500 traducciones)
- Proyectos single-country
- Equipos pequeños (1-2 devs)
- Prototipado rápido

### Comparación: Sistema Base vs Enterprise

| Característica | Sistema Base | Sistema Enterprise |
|----------------|--------------|-------------------|
| **Type Safety** | Completo estático | Híbrido (estático + dinámico) |
| **Duplicación** | Posible | Minimizada (DRY) |
| **Claves dinámicas** | Type assertion | Scoped translator |
| **Fallback** | Un nivel | Tres niveles (cascada) |
| **Auditoría** | Manual | Automatizada |
| **Complejidad** | Baja | Media |
| **Setup inicial** | 1 hora | 1 semana |
| **ROI** | Inmediato | Mediano/largo plazo |

### Próximos Pasos

Con este documento tienes todo lo necesario para:

1. **Evaluar** si el sistema enterprise es apropiado para tu proyecto
2. **Implementar** el scoped translator desde cero
3. **Refactorizar** JSON existente eliminando duplicación
4. **Auditar** traducciones no usadas y duplicadas
5. **Migrar** gradualmente sin romper la aplicación
6. **Mantener** el sistema a largo plazo con herramientas automatizadas

### Recursos Adicionales

- [Sistema Base](/#resumen-ejecutivo): Para proyectos nuevos o pequeños
- [Scoped Translator](#arquitectura-scoped-translator): Solución para claves dinámicas
- [Refactorización DRY](#refactorización-dry-del-json): Eliminar duplicación
- [Herramientas](#herramientas-de-auditoría): Scripts de auditoría
- [Plan de Migración](#plan-de-migración): Guía paso a paso

---

**Última actualización**: 2026-03-30
**Versión**: 2.0 (incluye sección Enterprise)
**Autor**: Emanuel Villanueva & Claude
**Licencia**: Dominio público - Libre uso en cualquier proyecto
