import api from './api'
import { LANGUAGES, type Language } from './types'
import { TENANTS, type TenantsType } from '../tenants'

// SERVER ONLY. Lee env vars que no son NEXT_PUBLIC_*, así que nunca debe
// importarse desde un componente 'use client': el bundler las inlinearía como
// '' sin error visible. En client usar useTranslations() del I18nClientProvider.

// `lang` y `tenant` son constantes de build: next.config.ts reescribe todas
// las rutas no-API prefijándolas con APP_LANGUAGE/TENANT, así que los segmentos
// [lang]/[tenant] de la URL derivan de estas env vars y no al revés. Leerlas
// acá elimina un salto indirecto y, con él, los casts sin validar sobre input
// de URL que hacían las pages.
//
// Si algún día el tenant se deriva por request (del Host header), el cambio
// queda confinado a este archivo en vez de a los 12 componentes que antes
// recibían los valores por props.

const LANGUAGE_VALUES = Object.values(LANGUAGES) as Language[]
const TENANT_VALUES = Object.values(TENANTS) as TenantsType[]

function resolveLanguage(): Language {
  const value = process.env.APP_LANGUAGE

  // Fallback silencioso: un idioma inválido degrada a español, que es el
  // diccionario base. No vale tirar el render por esto.
  return LANGUAGE_VALUES.includes(value as Language) ? (value as Language) : LANGUAGES.ES
}

function resolveTenant(): TenantsType {
  const value = process.env.TENANT

  // El tenant sí falla ruidosamente: sin uno válido el theming, los overrides
  // de copy y el branding quedan en un estado incoherente, y un fallback
  // callado lo volvería difícil de diagnosticar en deploy.
  if (!TENANT_VALUES.includes(value as TenantsType)) {
    throw new Error(`TENANT inválido: "${value}". Valores admitidos: ${TENANT_VALUES.join(', ')}.`)
  }

  return value as TenantsType
}

// Resuelve el diccionario del deploy actual. Sin caché propia: api.fetch ya
// está envuelto en React.cache(), así que llamarla N veces dentro del mismo
// request no duplica trabajo.
//
// Devuelve `lang` además de `t` para los consumers que formatean con Intl
// (ver getIntlLocale en ./locale).
export async function getServerT() {
  const lang = resolveLanguage()
  const tenant = resolveTenant()
  const { t, dictionary } = await api.fetch(lang, tenant)

  return { t, dictionary, lang, tenant }
}
