# Plan de Migración a Monorepo

## Contexto

El proyecto actual `actitud-bo` es una aplicación Next.js única para back office del gimnasio. El plan es expandir a un monorepo que incluya:

- **Back Office**: Aplicación actual (gestión administrativa)
- **Customer App**: Nueva aplicación para clientes del gimnasio (estado financiero, rutinas, etc.)
- **Librería Compartida**: Componentes UI, tipos y utilidades reutilizables

## Justificación

- **2 aplicaciones relacionadas** que compartirán lógica de negocio
- **Componentes UI reutilizables** para mantener consistencia visual
- **Tipos TypeScript compartidos** (Customer, Membership, etc.)
- **Evolución coordinada** de ambas aplicaciones

## Estructura Objetivo

```
gym-monorepo/
├── apps/
│   ├── backoffice/          # App actual (actitud-bo)
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.js
│   └── customer-app/        # Nueva app para clientes
│       ├── src/
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── ui/                  # Componentes compartidos
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/               # Tipos TypeScript compartidos
│   │   ├── src/
│   │   │   ├── customer.ts
│   │   │   ├── membership.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── utils/               # Utilidades compartidas
│       ├── src/
│       │   ├── date.ts
│       │   ├── validation.ts
│       │   └── index.ts
│       └── package.json
├── package.json             # Root workspace
├── turbo.json              # Config Turborepo
└── tsconfig.json           # Config TypeScript base
```

## Stack Tecnológico

- **Monorepo Tool**: Turborepo (by Vercel)
- **Package Manager**: npm workspaces
- **Apps**: Next.js 15 + TypeScript
- **UI Library**: Radix UI + Tailwind CSS
- **Backend**: Supabase (compartido)

## Pasos de Migración

### 1. Preparación del Monorepo

```bash
# 1. Crear nueva estructura
mkdir gym-monorepo
cd gym-monorepo

# 2. Inicializar package.json root
npm init -y

# 3. Configurar workspaces
# Editar package.json para incluir workspaces
```

### 2. Configuración Base

```json
// package.json (root)
{
  "name": "gym-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5",
    "@types/node": "^20"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

### 3. Migración del Back Office

```bash
# 1. Crear directorio apps
mkdir -p apps/backoffice

# 2. Mover código actual
cp -r actitud-bo/* apps/backoffice/

# 3. Actualizar package.json del backoffice
# Cambiar name a "@gym/backoffice"
# Agregar dependencias a packages compartidos
```

### 4. Creación de Packages Compartidos

#### packages/ui/package.json
```json
{
  "name": "@gym/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "react": "^19.0.0",
    "@radix-ui/react-button": "latest",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1"
  }
}
```

#### packages/types/package.json
```json
{
  "name": "@gym/types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### 5. Extracción de Componentes

**Componentes a extraer del backoffice actual:**

- `components/ui/button.tsx` → `packages/ui/src/components/Button.tsx`
- `components/ui/input.tsx` → `packages/ui/src/components/Input.tsx`
- `components/ui/dialog.tsx` → `packages/ui/src/components/Dialog.tsx`
- `components/icons/*` → `packages/ui/src/icons/`

**Tipos a extraer:**

- `customer/types.ts` → `packages/types/src/customer.ts`
- `auth/types.ts` → `packages/types/src/auth.ts`
- `membership/types.ts` → `packages/types/src/membership.ts`

### 6. Creación de Customer App

```bash
# 1. Crear nueva app Next.js
cd apps/
npx create-next-app@latest customer-app --typescript --tailwind --app

# 2. Configurar dependencias compartidas
# Agregar "@gym/ui", "@gym/types", "@gym/utils" a package.json
```

### 7. Configuración de Vercel

#### Opción A: Proyectos Separados (Recomendado)

**Proyecto 1: gym-backoffice**
```
Root Directory: apps/backoffice
Build Command: cd ../.. && npx turbo build --filter=backoffice
Output Directory: apps/backoffice/.next
```

**Proyecto 2: gym-customer-app**
```
Root Directory: apps/customer-app
Build Command: cd ../.. && npx turbo build --filter=customer-app
Output Directory: apps/customer-app/.next
```

#### Opción B: Mono-proyecto con Routing
```
Root Directory: .
Build Command: npx turbo build
Configure path-based routing en vercel.json
```

## Consideraciones Técnicas

### Dependencias Compartidas

- **Supabase**: Mismo proyecto, diferentes permisos RLS
- **Tailwind CSS**: Configuración compartida en packages/ui
- **TypeScript**: Configuración base en root, extensiones en apps

### Scripts de Desarrollo

```json
// package.json (root)
{
  "scripts": {
    "dev": "turbo dev",
    "dev:backoffice": "turbo dev --filter=backoffice",
    "dev:customer": "turbo dev --filter=customer-app",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "clean": "turbo clean"
  }
}
```

### Variables de Entorno

```bash
# apps/backoffice/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
UPSTASH_REDIS_REST_URL=...

# apps/customer-app/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Sin Redis (diferente rate limiting)
```

## Beneficios Esperados

1. **Reutilización de código**: Componentes y tipos compartidos
2. **Consistencia visual**: Sistema de diseño unificado
3. **Builds optimizados**: Cache inteligente con Turborepo
4. **Desarrollo coordinado**: Cambios atómicos en múltiples apps
5. **Deploy independiente**: Cada app se despliega por separado

## Próximos Pasos

1. **Validar estructura** con prueba de concepto
2. **Extraer componentes más comunes** del backoffice actual
3. **Definir customer app requirements** (funcionalidades específicas)
4. **Configurar CI/CD** para builds paralelos
5. **Migración gradual** manteniendo backoffice funcional

## Referencias

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Vercel Monorepo Guide](https://vercel.com/docs/concepts/git/monorepos)
- [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)