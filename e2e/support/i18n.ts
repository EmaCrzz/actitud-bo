import { createTranslator, deepMerge } from '@/lib/i18n/api'
import type { TranslationKey, TranslationParams } from '@/lib/i18n/types'
import esDictionary from '@/lib/i18n/dictionaries/es.json'
import actitudDictionary from '@/lib/i18n/dictionaries/tenant/actitud.json'

/**
 * Traductor para los specs, con el mismo diccionario que ve la app.
 *
 * La alternativa era hardcodear los textos en español en cada selector, y eso
 * convierte cualquier ajuste de copy en una suite roja. Acá un cambio de copy
 * mueve el selector solo; lo que rompe el test es que desaparezca la *clave*,
 * que es exactamente la señal que queremos.
 *
 * Replica el merge de `fetchTranslations` (base + overrides del tenant) sin
 * pasar por él, porque ese está envuelto en `React.cache` y es async.
 */
const dictionary = deepMerge(
  esDictionary as Record<string, unknown>,
  actitudDictionary as Record<string, unknown>
)

export const t = createTranslator(dictionary) as (
  key: TranslationKey,
  params?: TranslationParams
) => string
