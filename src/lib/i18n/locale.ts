import { LANGUAGES, type Language } from './types'

// Mapeo canónico idioma → locale de Intl. Antes vivía duplicado como ternario
// en tres call sites (day-navigator, v2/layout, auth/header), con un cuarto
// lugar usando 'es-ES' hardcodeado. El negocio opera en Argentina: el español
// es es-AR, no es-ES.
const INTL_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  [LANGUAGES.ES]: 'es-AR',
  [LANGUAGES.EN]: 'en-US',
}

// Isomorfo a propósito: lo consumen tanto server components (vía getServerT)
// como client components que reciben `lang` por prop.
export function getIntlLocale(lang: Language): string {
  return INTL_LOCALE_BY_LANGUAGE[lang] ?? INTL_LOCALE_BY_LANGUAGE[LANGUAGES.ES]
}
