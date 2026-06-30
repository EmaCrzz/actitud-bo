import packageJson from '../../package.json'

// Versión de la aplicación desde package.json
export const APP_VERSION = packageJson.version

// Función para obtener información completa de la versión
export function getVersionInfo() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  // En producción, usar la versión del package.json
  // En desarrollo, agregar sufijo para distinguir
  const displayVersion = isProduction ? `v${APP_VERSION}` : `v${APP_VERSION}-dev`

  return {
    version: APP_VERSION,
    displayVersion,
    isProduction,
    isDevelopment,
    environment: isProduction ? 'production' : 'development',
    buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  }
}

// Hook para usar en componentes React
export function useVersion() {
  return getVersionInfo()
}
