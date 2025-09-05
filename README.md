# Actitud BO - Backoffice de Gestión

Sistema de gestión integral para gimnasios y centros deportivos, desarrollado como Progressive Web App (PWA) para la administración de clientes, membresías y asistencias.

## 🌟 Características Principales

### 🏋️ Gestión de Clientes
- Registro y edición completa de datos personales (nombre, apellido, DNI, teléfono, email)
- Búsqueda inteligente con autocompletado
- Validación de DNI para evitar duplicados
- Contador automático de asistencias

### 💳 Sistema de Membresías
- Gestión de diferentes tipos de membresía
- Control de fechas de vencimiento
- Renovación y modificación de membresías
- Estado de pago y fechas de último pago

### 📊 Control de Asistencias
- Registro diario de asistencias
- Validación para evitar registros duplicados
- Estadísticas de asistencias mensuales
- Dashboard con métricas en tiempo real

### 📱 Progressive Web App (PWA)
- Instalable en dispositivos móviles
- Funcionamiento offline básico
- Notificaciones push
- Optimizado para móviles y tablets

## 🛠 Stack Tecnológico

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - Lenguaje tipado
- **Tailwind CSS 4** - Framework de estilos
- **Radix UI** - Componentes primitivos accesibles
- **shadcn/ui** - Sistema de componentes
- **Sonner** - Notificaciones toast

### Backend y Base de Datos
- **Supabase** - Backend como servicio
  - PostgreSQL como base de datos
  - Autenticación integrada
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Funciones RPC personalizadas

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **Prettier** - Formateo de código
- **TypeScript** - Verificación de tipos

## 📋 Notas del Proyecto
- **Fecha de inicio:** 16/06/2024
- **Colaboradores:**
  - [Emanuel Villanueva](https://github.com/EmaCrzz)
  - [Federico Villanueva](https://github.com/Federicovilla09)
- **Diseños:** [Figma](https://www.figma.com/design/rNNGaLm6Frb796gArQn2cg/Registro-de-asistencias-%7C-App-Movil--Desarrollo-?node-id=771-12702&m=dev)

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** 18+ y npm/yarn
- **Cuenta de Supabase** para la base de datos
- **Git** para control de versiones

### Variables de Entorno
Crear un archivo `.env.local` con las siguientes variables:
```bash
# Supabase Configuration (Obligatorio)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Rate Limiting con Upstash Redis (Opcional)
# Si no se configuran, se usará cache local para desarrollo
UPSTASH_REDIS_REST_URL=tu_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=tu_upstash_redis_token
```

#### 📚 Configuración de Rate Limiting

**Opción 1: Producción con Upstash (Recomendado)**
1. Crear cuenta en [Upstash](https://upstash.com)
2. Crear una nueva base de datos Redis
3. Copiar la URL y TOKEN a las variables de entorno
4. **Costo**: Gratuito hasta 10,000 requests/mes

**Opción 2: Desarrollo Local (Automático)**
- Sin configurar las variables de Upstash
- Se usará cache en memoria (Map de JavaScript)
- Funciona solo en entorno local
- Se reinicia con cada deploy

### Configuración del Entorno de Desarrollo

1. **Clonar el repositorio:**
```bash
git clone <repository-url>
cd actitud-bo
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar Supabase:**
   - Crear proyecto en [Supabase](https://supabase.com)
   - Configurar las tablas necesarias (customers, customer_membership, assistances)
   - Configurar RLS (Row Level Security)
   - Añadir las funciones RPC necesarias

4. **Ejecutar en modo desarrollo:**
```bash
npm run dev
```

5. **Comandos disponibles:**
```bash
npm run build          # Construir para producción
npm run start          # Ejecutar en producción
npm run lint           # Verificar código con ESLint
npm run lint:fix       # Corregir errores de ESLint y formatear
npm run type-check     # Verificar tipos de TypeScript
```

## 🏗 Arquitectura del Proyecto

### Estructura de Carpetas
```
src/
├── app/                 # App Router de Next.js
│   ├── auth/           # Páginas de autenticación
│   ├── customer/       # Páginas de gestión de clientes
│   └── register/       # Páginas de registro de asistencias
├── components/         # Componentes reutilizables
│   ├── ui/            # Componentes de interfaz base
│   └── icons/         # Iconos personalizados
├── lib/               # Utilidades y configuración
├── auth/              # Lógica de autenticación
├── customer/          # Lógica de gestión de clientes
├── assistance/        # Lógica de asistencias
├── membership/        # Lógica de membresías
└── types/             # Definiciones de tipos TypeScript
```

### Patrones de Desarrollo
- **Separación Cliente/Servidor:** APIs separadas en carpetas `client.ts` y `server.ts`
- **Hooks Personalizados:** Para lógica reutilizable (useAuth, usePermissions)
- **Componentes Compuestos:** Uso de Radix UI para accesibilidad
- **Validaciones Duales:** Tanto en cliente como en servidor
- **Tipos Estrictos:** TypeScript con interfaces bien definidas

## 🔒 Seguridad

- **Autenticación:** Supabase Auth con JWT
- **Autorización:** Row Level Security (RLS) en Supabase
- **Rate Limiting:** Protección contra abuso de APIs
  - Login: 5 intentos por minuto
  - Búsqueda: 30 requests por minuto  
  - Creación de clientes: 10 por hora
  - Registro de asistencias: 20 por hora
- **Validación:** Validaciones en cliente y servidor
- **Middleware:** Protección de rutas sensibles
- **Sanitización:** Validación de datos de entrada

## 🚧 Estado del Proyecto

### ✅ Funcionalidades Completadas
- Sistema de autenticación completo
- Gestión CRUD de clientes
- Sistema de membresías
- Registro de asistencias diarias
- Dashboard con estadísticas básicas
- PWA funcional con manifest y SW
- **Rate limiting** implementado en todas las APIs críticas
- Manejo de errores de rate limiting en componentes

### 🔄 En Desarrollo
- Optimización de rendimiento
- Funcionalidad offline completa
- Sistema de notificaciones push
- Dashboard avanzado con analytics

# TODO List - [Actitud BO]

## 🚀 Próximas Tareas (High Priority)
- [X] Implementar eslint y prettier
- [X] Configurar entorno de desarrollo
- [X] Definir arquitectura del proyecto
- [X] Crear mockups/wireframes básicos
- [X] Configurar base de datos
- [X] Implementar autenticación de usuarios

## 🔧 Desarrollo (In Progress)
- [ ] La sumatoria de membresias separada por tipos esta mal
- [ ] Verificar proteccion de todas las rutas de la app 🔝 🚩
- [ ] Implementar delete de asistencia del dia
- [ ] Implementar mensaje de error cuando algun dato del login esta mal
- [ ] Componentizar el btn de volver atras con el texto y la ruta
- [ ] Implementar page 404 cuando vamos a un cliente con un id no valido
- [ ] Implementar ordenamiento de cliente con prioridad de los que tienen membresia activa
- [ ] Implementar inifinte scroll desde el listado de clientes
- [ ] Implementar delete de cliente
- [ ] Implementar rol admin
- [ ] Verificar porque la fuente no se ve en mobiles
- [X] Implementar agregar pase adicional si la semana esta completa
- [X] Crear formulario multi step para crear cliente
- [X] Loading del perfil del cliente con los nuevo bloques
- [X] Loading para page editar membresia
- [X] Implementar manejo de errores con mas ayuda en crar cliente
- [X] Mostrar en el listado de asistencias del dia la hs en la que se registro
- [X] Implementar registar primera asistencia al momento de crear cliente
- [X] Implementar pantalla asistencias del dia
- [X] Implementar cierre de sesion
- [X] Validar e informar alta de asistencia del dia si ya fue creada
- [X] Implementar constantes para las rutas
- [X] Implementar assistance count en cliente (trigger)
- [X] Luego de registrar la asistencia voler al home
- [X] Extender modelo de usuario para tener nombre y apellido
- [X] Implementar upsert Cliente
- [X] Implementar crear cliente desde la busqueda en la home
- [X] Implementar crear cliente desde el listado de clientes
- [X] Implementar pantalla de estadisticas en progreso

## 📱 PWA (In Progress)
- [ ] Crear manifest
- [ ] Crear SW
- [ ] Crear notificaciones

## 🎨 Frontend
- [X] Estilar correctamente el input y select para mostrar el error o helpertext sin saltos en la pantalla
- [ ] Estilar toast
- [ ] Estilar Button outlined, ver estilos de renovar/modificar membresía
- [ ] Estilar Button ghost, ver estilos de registarar pase diario
- [ ] Añadir animaciones/transiciones

## 📊 Performance
- [X] Optimizar tiempo de carga
- [X] Implementar lazy loading en home
- [X] Implementar lazy loading en listado de clientes
- [X] Implementar lazy loading en detalle de cliente
- [X] Implementar pantallas de carga

## 🐛 Bugs & Issues
- [ ] Mostrar - en lugar de 0 en el home si no hay asistencias
- [X] BTN crear cliente desalineado
- [X] Buscar un cliente que no existe, limpiar el input, queda el menu desplegado con el mensaje de que no se encontraron clientes

## 💡 Ideas Futuras (Backlog)
- [ ] Crear dashboard de analytics
- [ ] Añadir funcionalidad offline

