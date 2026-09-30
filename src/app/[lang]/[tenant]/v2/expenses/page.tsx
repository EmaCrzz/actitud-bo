import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ROUTES_V2 } from '@/consts/routes'
import { getServerT } from '@/lib/i18n/server'
import { getExpenses } from '@/accounting/api/server'
import ExpensesSection from '@/expenses/components/v2/ExpensesSection'
import { parseExpenseFilters, parseExpensePage } from '@/expenses/filters'
import type { Expense } from '@/accounting/types'

interface V2ExpensesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Sección Gastos (Fase 11).
 *
 * Los filtros y la página viven en la URL, igual que en Clientes: el rango de
 * fechas es lo que acota la query y tiene que resolverse acá. El default es el
 * mes en curso — ver `getDefaultExpenseRange`.
 */
export default async function V2ExpensesPage({ searchParams }: V2ExpensesPageProps) {
  const params = await searchParams
  const { t, lang } = await getServerT()
  const filters = parseExpenseFilters(params)
  const page = parseExpensePage(params)

  let expenses: Expense[] = []
  let failed = false

  try {
    // **Sólo el rango.** El método y la búsqueda los aplica la sección en
    // memoria, para que los tres KPIs puedan describir el período completo
    // mientras la tabla muestra el subconjunto filtrado. Ver `ExpensesSection`.
    expenses = await getExpenses({ from: filters.from, to: filters.to })
  } catch {
    // `getExpenses` tira si la lectura falla. Se degrada a lista vacía con
    // cartel de error en vez de romper la ruta entera: el resto del AppShell
    // sigue navegable.
    failed = true
  }

  return (
    <div className='flex min-h-full flex-col rounded-lg border p-2.5 md:h-full lg:p-5'>
      {/* Sólo mobile, igual que Asistencias y Membresías: en desktop el
          sidebar ya ubica al operador. */}
      <div className='mb-4 flex items-center gap-3 md:hidden'>
        <Link
          aria-label={t('common.back')}
          className='hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg'
          href={ROUTES_V2.V2_HOME}
        >
          <ArrowLeft className='size-5' />
        </Link>
        <h1 className='text-base font-semibold'>{t('v2.expenses.title')}</h1>
      </div>

      <ExpensesSection
        expenses={expenses}
        failed={failed}
        filters={filters}
        lang={lang}
        page={page}
      />
    </div>
  )
}
