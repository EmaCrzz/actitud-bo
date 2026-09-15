import { Construction } from 'lucide-react'
import { getServerT } from '@/lib/i18n/server'
import type { TranslationKey } from '@/lib/i18n/types'

// Placeholder de las secciones v2 que todavía no se implementaron. Existe para
// que el sidebar navegue de verdad desde la fase 4 y cada fase siguiente sólo
// tenga que reemplazar el contenido de su page.
//
// TEMPORAL: se borra cuando la última sección tenga su pantalla real. Si esto
// sigue acá con todas las fases cerradas, es que algo quedó sin hacer.
export default async function UnderConstruction({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = await getServerT()

  return (
    <div className='h-full p-2.5 lg:p-5 rounded-xl border flex flex-col gap-3 lg:gap-6'>
      <h1 className='text-lg font-semibold'>{t(titleKey)}</h1>
      <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center'>
        <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
          <Construction aria-hidden className='size-6 text-muted-foreground' />
        </div>
        <p className='text-sm font-medium'>{t('v2.underConstruction.title')}</p>
        <p className='max-w-sm text-sm text-muted-foreground'>
          {t('v2.underConstruction.description')}
        </p>
      </div>
    </div>
  )
}
