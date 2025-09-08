# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
```bash
npm run dev          # Start development server (includes SW generation)
npm run build        # Build for production (includes SW generation)
npm start           # Start production server
npm run prebuild    # Generate service worker manually
```

### Code Quality
```bash
npm run lint        # Check code with ESLint
npm run lint:fix    # Fix ESLint errors and format with Prettier
npm run type-check  # Run TypeScript type checking
npm run format      # Format code with Prettier
```

### Testing Environment
- No test framework is configured - check with maintainer before adding tests
- Manual testing is done on Preview environment: `actitud-bo-git-develop-*.vercel.app`

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS 4 with shadcn/ui components (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL + Auth + RPC functions)
- **PWA**: Service Worker auto-generation via custom script
- **Rate Limiting**: Upstash Redis (production) / Local cache (development)

### Code Organization Pattern
The codebase follows a **domain-driven structure** where each business domain has its own folder containing both client and server logic:

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Shared UI components
├── lib/                # Utilities and shared configuration
├── [domain]/           # Business domains (customer, auth, assistance, membership)
│   ├── api/
│   │   ├── client.ts   # Browser-side API calls
│   │   └── server.ts   # Server-side database operations
│   ├── components/     # Domain-specific components
│   ├── types.ts        # Domain type definitions
│   └── consts.ts       # Domain constants
```

### Domain Architecture
Each business domain follows a consistent pattern:
- **`/api/server.ts`**: Direct Supabase calls, server-side only
- **`/api/client.ts`**: Browser API calls with rate limiting and validation
- **`/types.ts`**: TypeScript interfaces and response types
- **`/consts.ts`**: Constants, enums, and static data
- **Components**: Domain-specific React components

### Key Domains
- **`customer/`**: Customer CRUD operations, search, and management
- **`auth/`**: Authentication, permissions, protected routes
- **`assistance/`**: Daily attendance tracking and weekly stats
- **`membership/`**: Membership types and expiration management

### Database Integration
- **Client**: Supabase browser client for real-time features
- **Server**: Supabase server client for secure operations
- **RPC Functions**: Custom Supabase functions for complex queries
- **Row Level Security (RLS)**: All tables protected with Supabase RLS
- **Types**: Database operations return typed responses with success/error handling

### Component Architecture
- **shadcn/ui**: Base component system with Radix UI primitives
- **Custom Icons**: SVG icons in `components/icons/`
- **Composite Components**: Business logic components in domain folders
- **Form Handling**: Multi-step forms with validation on client and server
- **Loading States**: Dedicated loading components for async operations

### PWA Implementation
- **Service Worker**: Auto-generated via `src/scripts/generate-sw.js` (runs on dev/build)
- **Manifest**: Dynamic manifest generation
- **Offline Support**: Basic caching strategy implemented
- **Installation Prompt**: Custom PWA install component

### Rate Limiting Strategy
- **Production**: Upstash Redis with per-endpoint limits
- **Development**: Local Map-based cache
- **Limits**: Login (5/min), Search (30/min), Customer creation (10/hr), Assistance (20/hr)
- **Fallback**: Graceful degradation when Redis unavailable

### Environment Configuration
- **Development**: `develop` branch → Preview deployment, local rate limiting
- **Production**: `main` branch → Production deployment, Redis rate limiting
- **Required Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Optional Variables**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Development Workflow

### Branch Strategy (from WORKFLOW.md)
- **Development**: Work on `develop` branch
- **Testing**: Automatic preview deployments on `develop` branch
- **Production**: Merge `develop` to `main` for production deployment
- **Versioning**: Semantic versioning with git tags (v1.2.0)

### Release Process
1. Develop features on `develop` branch
2. Test on Preview environment (`actitud-bo-git-develop-*.vercel.app`)
3. Use release script: `./scripts/release.sh [patch|minor|major]`
4. Automatic deployment to production (`actitud-bo.vercel.app`)

## Code Conventions

### File Naming
- **Components**: PascalCase (`CustomerForm.tsx`)
- **API files**: `client.ts` and `server.ts` in domain `/api/` folders
- **Types**: `types.ts` in each domain folder
- **Constants**: `consts.ts` in each domain folder

### Import Paths
- Use `@/` alias for src directory imports
- Separate client/server imports clearly
- Import types explicitly: `import type { Customer } from './types'`

### Error Handling
- All database operations return typed success/error responses
- Custom error types in `types/database-errors.ts`
- Form validation errors follow consistent structure
- Rate limiting errors handled gracefully with user feedback

### TypeScript Usage
- Strict mode enabled with `--noEmit` for type checking
- All props and API responses properly typed
- Database queries use typed responses
- Form data validation with TypeScript interfaces

### ESLint Configuration
- Based on Next.js and TypeScript recommended configs
- Custom rules for React hooks and prop sorting
- Prettier integration for formatting consistency
- Console warnings allowed in API routes, errors elsewhere

## Important Notes

### Service Worker Generation
The `generate-sw.js` script runs automatically on `dev` and `build` commands. It creates a minimal service worker for PWA functionality.

### Database Schema
Key tables: `customers`, `customer_membership`, `assistance`. All operations use Row Level Security and typed responses.

### Authentication
Supabase Auth with JWT tokens, middleware-protected routes, and permission-based access control.

### Rate Limiting Implementation
Designed to work with or without Redis - automatically falls back to local caching in development environments.