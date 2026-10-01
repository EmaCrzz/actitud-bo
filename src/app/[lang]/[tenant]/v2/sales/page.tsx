import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ROUTES_V2 } from '@/consts/routes'
import { getServerT } from '@/lib/i18n/server'
import { getSalesLedger } from '@/sales/api/server'
import SalesSection from '@/sales/components/v2/SalesSection'
import { parseSaleFilters, parseSalePage } from '@/sales/filters'
import type { SalesLedgerEntry } from '@/sales/types'

interface V2SalesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Sección Ventas (Fase 12): todo lo cobrado en el período, cuotas y productos.
 *
 * Misma forma que Gastos: los filtros viven en la URL, el rango se resuelve
 * acá —es lo que acota la consulta— y el default es el mes AR en curso.
 */
export default async function V2SalesPage({ searchParams }: V2SalesPageProps) {
  const params = await searchParams
  const { t, lang } = await getServerT()
  const filters = parseSaleFilters(params)
  const page = parseSalePage(params)

  let entries: SalesLedgerEntry[] = []
  let failed = false

  try {
    // **Sólo el rango.** El método y la búsqueda los aplica la sección en
    // memoria, para que los KPIs describan el período completo.
    entries = await getSalesLedger({ from: filters.from, to: filters.to })
  } catch {
    // Si cualquiera de las dos lecturas falla —cuotas o productos— se muestra
    // el error, no un total cobrado a medias con cara de completo.
    failed = true
  }

  return (
    <div className='flex min-h-full flex-col rounded-lg border p-2.5 md:h-full lg:p-5'>
      {/* Sólo mobile, igual que Gastos: en desktop el sidebar ya ubica al operador. */}
      <div className='mb-4 flex items-center gap-3 md:hidden'>
        <Link
          aria-label={t('common.back')}
          className='hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg'
          href={ROUTES_V2.V2_HOME}
        >
          <ArrowLeft className='size-5' />
        </Link>
        <h1 className='text-base font-semibold'>{t('v2.sales.title')}</h1>
      </div>

      <SalesSection entries={entries} failed={failed} filters={filters} lang={lang} page={page} />
    </div>
  )
}
