import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ROUTES_V2 } from '@/consts/routes'
import { getServerT } from '@/lib/i18n/server'
import { getCurrentMonthKeyInAppTz } from '@/lib/month-key'
import { getBalance, getEarliestBalanceMonth } from '@/balance/api/server'
import { resolveBalanceMonth } from '@/balance/month-param'
import BalanceSection from '@/balance/components/v2/BalanceSection'
import type { BalanceSummary } from '@/balance/summary'

interface V2BalancePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Balance (Fase 13). El mes viaja en `?month=YYYY-MM`; sin él, el mes AR en
 * curso. Ver `resolveBalanceMonth` para cómo se acota.
 */
export default async function V2BalancePage({ searchParams }: V2BalancePageProps) {
  const params = await searchParams
  const { t, lang } = await getServerT()
  const currentMonth = getCurrentMonthKeyInAppTz()

  let earliestMonth: string | null = null
  let summary: BalanceSummary | null = null
  let month = currentMonth

  try {
    earliestMonth = await getEarliestBalanceMonth()
    month = resolveBalanceMonth(params, earliestMonth)
    summary = await getBalance(month)
  } catch {
    // Se degrada a cartel de error en vez de romper la ruta. Un balance a
    // medias —ingresos sin egresos— sería peor que ninguno: se leería como un
    // mes excelente.
    summary = null
  }

  return (
    // `shrink-0`: Balance scrollea **entero** dentro del AppShell, no tiene una
    // tabla con scroll propio como Ventas y Gastos. Sin esto el card —hijo
    // flex— se achicaba al alto disponible y las cards de abajo se salían del
    // borde (medido a 1280×800: borde en 768px, contenido hasta 998px). Lo
    // reportó Ema; es el mismo tipo de bug que el ADR 20260918164500.
    <div className='flex min-h-full shrink-0 flex-col rounded-lg border p-2.5 lg:p-5'>
      {/* Sólo mobile, igual que Ventas y Gastos. */}
      <div className='mb-4 flex items-center gap-3 md:hidden'>
        <Link
          aria-label={t('common.back')}
          className='hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg'
          href={ROUTES_V2.V2_HOME}
        >
          <ArrowLeft className='size-5' />
        </Link>
        <h1 className='text-base font-semibold'>{t('v2.balance.title')}</h1>
      </div>

      <BalanceSection
        basePath={ROUTES_V2.V2_BALANCE}
        currentMonth={currentMonth}
        earliestMonth={earliestMonth}
        lang={lang}
        month={month}
        summary={summary}
      />
    </div>
  )
}
