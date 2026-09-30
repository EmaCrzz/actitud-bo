'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Plus } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import DataTable, { type DataTableColumn } from '@/components/v2/DataTable'
import DataTablePagination from '@/components/v2/DataTablePagination'
import DatePicker from '@/components/v2/ui/DatePicker'
import EmptyState from '@/components/v2/EmptyState'
import FilterBar from '@/components/v2/FilterBar'
import FilterDropdown from '@/components/v2/FilterDropdown'
import { useTranslations } from '@/lib/i18n/context'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { toAppTzIsoDate } from '@/lib/timezone'
import { PaymentTypeArray, PaymentsTranslation, type PaymentType } from '@/membership/consts'
import { getCategoryTranslationKey, normalizeCategoryValue } from '@/expenses/utils'
import { summarizeExpenses } from '@/expenses/summary'
import { downloadExpensesCsv } from '@/expenses/export'
import {
  PAYMENT_METHOD_UNSPECIFIED,
  expenseFiltersToQueryString,
  matchesExpenseFilters,
  type ExpenseListFilters,
  type ExpensePaymentFilter,
} from '@/expenses/filters'
import ExpenseFormPanel from './ExpenseFormPanel'
import type { Expense } from '@/accounting/types'

const PAGE_SIZE = 10

type SortDirection = 'asc' | 'desc'

interface ExpensesSectionProps {
  /** **Todos** los gastos del rango de fechas, sin filtrar por método ni texto. */
  expenses: Expense[]
  filters: ExpenseListFilters
  page: number
  failed: boolean
  lang: 'es' | 'en'
}

/**
 * Sección Gastos (Fase 11).
 *
 * **El rango de fechas se resuelve en el server; el método y la búsqueda, en
 * memoria.** No es una inconsistencia: el rango es lo que acota la consulta y
 * define de qué período habla la pantalla, mientras que los otros dos sólo
 * eligen qué subconjunto de ese período se lista. Filtrarlos acá evita un round
 * trip por tecla y —lo que importa de verdad— permite que los KPIs describan el
 * período completo mientras la tabla muestra el subconjunto. Ver `rangeSummary`.
 *
 * Los tres filtros igual viajan en la URL para que la vista sea compartible.
 */
export default function ExpensesSection({
  expenses,
  filters,
  page: initialPage,
  failed,
  lang,
}: ExpensesSectionProps) {
  const { t } = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(filters.query)
  const [method, setMethod] = useState<ExpensePaymentFilter | null>(filters.method)
  const [page, setPage] = useState(initialPage)
  const [sort, setSort] = useState<SortDirection>('desc')
  const [panelOpen, setPanelOpen] = useState(false)
  // `null` = crear. El panel distingue por esto, no por un flag aparte.
  const [editing, setEditing] = useState<Expense | null>(null)

  /**
   * Los KPIs describen **el período**, no la selección.
   *
   * Se calculan sobre todos los gastos del rango, ignorando el método y la
   * búsqueda. Antes se calculaban sobre las filas visibles y el resultado era
   * incoherente: filtrando por Efectivo, "Total de gastos" pasaba a mostrar el
   * total en efectivo —o sea, el mismo número que el KPI de al lado— y decía
   * que en el mes se gastó eso, que es falso. Lo reportó Ema probando la fase.
   *
   * Que los KPIs no cuadren con la tabla cuando hay un filtro de método activo
   * es justamente lo correcto: son dos preguntas distintas.
   */
  const rangeSummary = useMemo(() => summarizeExpenses(expenses), [expenses])

  const visible = useMemo(() => {
    const filtered = expenses.filter((expense) =>
      matchesExpenseFilters(expense, { query: search, method })
    )

    // Copia antes de ordenar: `sort` muta, y mutar el array de props rompe la
    // memoización de `rangeSummary`, que depende de la misma referencia.
    return [...filtered].sort((a, b) => {
      const diff = a.expense_date.localeCompare(b.expense_date)

      return sort === 'asc' ? diff : -diff
    })
  }, [expenses, method, search, sort])

  const pageRows = useMemo(
    () => visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [visible, page]
  )
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))

  // Un filtro que achica la lista puede dejar la página actual fuera de rango,
  // y entonces la tabla se ve vacía teniendo resultados.
  useEffect(() => {
    if (page > totalPages - 1) setPage(0)
  }, [page, totalPages])

  /**
   * La URL refleja los filtros para que la vista sea compartible.
   *
   * `history.replaceState` y no `router.replace`: el método, la búsqueda y la
   * página se resuelven en el cliente, así que una navegación volvería a
   * ejecutar el server component para traer exactamente las mismas filas.
   * Mismo patrón que el listado de clientes.
   */
  useEffect(() => {
    const qs = expenseFiltersToQueryString({ ...filters, query: search, method }, page)
    const next = `${window.location.pathname}?${qs}`

    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', next)
    }
  }, [filters, method, page, search])

  /** Sólo el rango vuelve al server: es lo único que cambia qué filas existen. */
  const applyRange = useCallback(
    (patch: { from?: string; to?: string }) => {
      const qs = expenseFiltersToQueryString({ ...filters, ...patch, query: search, method }, 0)

      setPage(0)
      startTransition(() => router.push(`?${qs}`, { scroll: false }))
    },
    [filters, method, router, search]
  )

  const openCreate = useCallback(() => {
    setEditing(null)
    setPanelOpen(true)
  }, [])

  const openEdit = useCallback((expense: Expense) => {
    setEditing(expense)
    setPanelOpen(true)
  }, [])

  // El listado lo trae un server component, así que alcanza con revalidarlo.
  // No hay caché de React Query detrás de los gastos — a diferencia de los
  // planes de la Fase 10, que además alimentan los selects de alta y
  // renovación y por eso necesitaban una invalidación explícita.
  const handleSaved = useCallback(() => router.refresh(), [router])

  const methodOptions = useMemo(
    () => [
      ...PaymentTypeArray.map((paymentType) => ({
        value: paymentType,
        label: t(PaymentsTranslation[paymentType]),
      })),
      {
        value: PAYMENT_METHOD_UNSPECIFIED,
        label: t('v2.expenses.filters.methodUnspecified'),
      },
    ],
    [t]
  )

  const categoryLabel = useCallback(
    (expense: Expense) => t(getCategoryTranslationKey(normalizeCategoryValue(expense.category))),
    [t]
  )

  const methodLabel = useCallback(
    (expense: Expense) => {
      const paymentMethod = expense.payment_method

      if (!paymentMethod) return t('v2.expenses.unspecifiedMethod')

      // Un valor fuera del CHECK no debería existir, pero si existe se muestra
      // crudo en vez de caer en `t(undefined)`, que revienta el render entero.
      // Es exactamente el crash que la Fase 10 encontró con las membresías.
      return paymentMethod in PaymentsTranslation
        ? t(PaymentsTranslation[paymentMethod as PaymentType])
        : paymentMethod
    },
    [t]
  )

  // `expense_date` se guarda canonicalizado a medianoche AR, o sea 03:00 UTC.
  // Cortar el ISO a 10 caracteres daría el día UTC, que para un valor no
  // canonicalizado sería el día anterior.
  const dateLabel = useCallback(
    (expense: Expense) => formatCalendarDate(toAppTzIsoDate(expense.expense_date)),
    []
  )

  const columns: DataTableColumn<Expense>[] = useMemo(
    () => [
      { id: 'category', header: t('v2.expenses.columns.category'), cell: categoryLabel },
      {
        id: 'amount',
        header: t('v2.expenses.columns.amount'),
        cell: (expense) => formatCurrency(expense.amount, { lang }),
      },
      {
        id: 'description',
        header: t('v2.expenses.columns.description'),
        cell: (expense) => (
          <span className='text-muted-foreground block max-w-[28ch] truncate'>
            {expense.description}
          </span>
        ),
      },
      {
        id: 'date',
        header: t('v2.expenses.columns.date'),
        cell: (expense) => <span className='text-muted-foreground'>{dateLabel(expense)}</span>,
        // El diseño no lo pide; lo pidió Ema. Es la única columna donde el
        // orden significa algo para quien revisa gastos del mes.
        sort: {
          direction: sort,
          onToggle: () => {
            setSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))
            setPage(0)
          },
        },
      },
      {
        id: 'method',
        header: t('v2.expenses.columns.method'),
        cell: (expense) => <span className='text-muted-foreground'>{methodLabel(expense)}</span>,
      },
    ],
    [categoryLabel, dateLabel, lang, methodLabel, sort, t]
  )

  const isFiltered = Boolean(search.trim() || method)
  const emptyState = isFiltered ? (
    <EmptyState
      description={t('v2.expenses.emptyFiltered.description')}
      title={t('v2.expenses.emptyFiltered.title')}
    />
  ) : (
    <EmptyState
      description={t('v2.expenses.empty.description')}
      title={t('v2.expenses.empty.title')}
    />
  )

  // Exporta lo que se está viendo, filtros incluidos — no el rango entero.
  const handleExport = useCallback(
    () =>
      downloadExpensesCsv(visible, {
        filename: `${t('v2.expenses.exportFilename')}-${filters.from}_${filters.to}.csv`,
        headers: {
          category: t('v2.expenses.columns.category'),
          amount: t('v2.expenses.columns.amount'),
          description: t('v2.expenses.columns.description'),
          date: t('v2.expenses.columns.date'),
          method: t('v2.expenses.columns.method'),
        },
        categoryLabel,
        methodLabel,
        dateLabel,
      }),
    [categoryLabel, dateLabel, filters.from, filters.to, methodLabel, t, visible]
  )

  const exportButton = (
    <Button
      aria-label={t('v2.expenses.export')}
      disabled={visible.length === 0}
      type='button'
      variant='outlined'
      onClick={handleExport}
    >
      <Download aria-hidden className='size-4' />
      <span className='hidden md:inline'>{t('v2.expenses.export')}</span>
    </Button>
  )

  return (
    // `md:min-h-0` y no `min-h-0`: en mobile el default `min-height: auto` es
    // lo que impide que esta columna se encoja por debajo de su contenido. En
    // desktop sí se encoge, porque ahí el scroll es interno (ver el wrapper de
    // la tabla más abajo).
    <div className='flex flex-1 flex-col md:min-h-0'>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold'>{t('v2.expenses.title')}</h2>
          <p className='text-muted-foreground text-sm'>
            {rangeSummary.count === 0
              ? t('v2.expenses.summaryEmpty')
              : rangeSummary.count === 1
                ? t('v2.expenses.summaryOne')
                : t('v2.expenses.summary', { count: rangeSummary.count })}
          </p>
        </div>

        {/* Desktop: el CTA vive en el header del card. En mobile las capturas
            lo comprimen a un botón de ícono al lado del buscador. */}
        <Button className='hidden md:inline-flex' type='button' onClick={openCreate}>
          <Plus aria-hidden className='size-4' />
          {t('v2.expenses.new')}
        </Button>
      </div>

      {/* Mobile pone los filtros arriba de los KPIs y desktop al revés: en las
          capturas de escritorio los tres números van pegados al header, y en
          mobile la primera fila es el buscador. Se resuelve con `order` sobre
          un solo contenedor en vez de duplicar los dos bloques. */}
      <div className='flex flex-col'>
        <div className='order-2 border-y py-4 md:order-1'>
          <div className='flex items-start justify-between gap-4'>
            <dl className='grid flex-1 grid-cols-3 gap-2 md:gap-4'>
              <Kpi
                label={t('v2.expenses.kpi.total')}
                value={formatCurrency(rangeSummary.total, { lang })}
              />
              <Kpi
                label={t('v2.expenses.kpi.cash')}
                value={formatCurrency(rangeSummary.cash, { lang })}
              />
              <Kpi
                label={t('v2.expenses.kpi.transfer')}
                value={formatCurrency(rangeSummary.transfer, { lang })}
              />
            </dl>

            {/* En mobile el export es un ícono en la fila de los KPIs; en
                desktop vive en la barra de filtros. */}
            <div className='md:hidden'>{exportButton}</div>
          </div>

          {/* Sin esta línea los tres números no cierran y no hay forma de
              saber por qué. Aparece sólo cuando hay plata sin clasificar. */}
          {rangeSummary.unspecified > 0 && (
            <p className='text-muted-foreground mt-2 text-xs'>
              {t('v2.expenses.kpi.unspecified', {
                amount: formatCurrency(rangeSummary.unspecified, { lang }),
              })}
            </p>
          )}
        </div>

        <FilterBar
          action={
            <>
              <Button
                aria-label={t('v2.expenses.new')}
                className='md:hidden'
                size='icon'
                type='button'
                onClick={openCreate}
              >
                <Plus aria-hidden className='size-4' />
              </Button>
              <span className='hidden md:inline-flex'>{exportButton}</span>
            </>
          }
          className='order-1 py-4 md:order-2'
          search={
            <FilterBar.Search
              placeholder={t('v2.expenses.filters.search')}
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
            />
          }
        >
          <DatePicker
            key={`from-${filters.from}`}
            ariaLabel={t('v2.expenses.filters.from')}
            // Mismo patrón que `FilterDropdown`: en mobile los tres controles
            // se reparten la fila, en desktop toman su ancho. Sin esto el
            // `w-full` del datepicker empujaba al dropdown Método fuera de la
            // pantalla.
            className='min-w-0 flex-1 sm:w-36 sm:flex-none'
            defaultValue={filters.from}
            id='expense_filter_from'
            name='expense_filter_from'
            onValueChange={(from) => applyRange({ from })}
          />
          <DatePicker
            key={`to-${filters.to}`}
            ariaLabel={t('v2.expenses.filters.to')}
            // Mismo patrón que `FilterDropdown`: en mobile los tres controles
            // se reparten la fila, en desktop toman su ancho. Sin esto el
            // `w-full` del datepicker empujaba al dropdown Método fuera de la
            // pantalla.
            className='min-w-0 flex-1 sm:w-36 sm:flex-none'
            defaultValue={filters.to}
            id='expense_filter_to'
            name='expense_filter_to'
            onValueChange={(to) => applyRange({ to })}
          />
          <FilterDropdown
            allLabel={t('v2.expenses.filters.methodAll')}
            label={t('v2.expenses.filters.method')}
            options={methodOptions}
            value={method ?? 'all'}
            onChange={(value) => {
              setMethod(value === 'all' ? null : (value as ExpensePaymentFilter))
              setPage(0)
            }}
          />
        </FilterBar>
      </div>

      {/* Desktop: ventana de scroll propia, con los filtros y el paginador
          fijos. Mobile: sin `min-h-0` ni `overflow`, así la lista empuja el
          card y scrollea el `<main>` del AppShell de una sola vez. Sin esto
          las últimas filas quedaban debajo del corte, sin forma de llegar. */}
      <div className='mt-4 flex-1 md:min-h-0 md:overflow-y-auto'>
        <DataTable
          rowChevron
          columns={columns}
          empty={emptyState}
          error={
            failed ? (
              <EmptyState
                description={t('v2.expenses.error.description')}
                title={t('v2.expenses.error.title')}
              />
            ) : undefined
          }
          getRowId={(expense) => expense.id}
          isLoading={isPending}
          mobileRow={(expense) => (
            <button
              className='hover:bg-muted/50 flex w-full items-start justify-between gap-3 px-1 py-3 text-left'
              type='button'
              onClick={() => openEdit(expense)}
            >
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>{expense.description}</span>
                <span className='text-muted-foreground mt-0.5 block truncate text-xs'>
                  {categoryLabel(expense)} · {methodLabel(expense)}
                </span>
              </span>
              <span className='shrink-0 text-right'>
                <span className='block text-sm font-medium'>
                  {formatCurrency(expense.amount, { lang })}
                </span>
                <span className='text-muted-foreground mt-0.5 block text-xs'>
                  {dateLabel(expense)}
                </span>
              </span>
            </button>
          )}
          rows={pageRows}
          onRowClick={openEdit}
        />
      </div>

      {visible.length > 0 && (
        <DataTablePagination
          className='mt-4'
          page={page}
          pageSize={PAGE_SIZE}
          summary={t('v2.expenses.pagination', { page: page + 1, total: totalPages })}
          total={visible.length}
          onPageChange={setPage}
        />
      )}

      <ExpenseFormPanel
        expense={editing}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}

/**
 * Un KPI del encabezado.
 *
 * **La tipografía de mobile es la mitad que la de desktop, y los labels
 * envuelven en vez de truncarse.** Los montos reales del gimnasio son de 6 y 7
 * cifras —"$ 3.253.827"— y a `text-2xl` en tres columnas no entraban: el
 * número salía cortado como "$ 3.253…" y los labels como "Total de ga…". Un
 * KPI ilegible no informa nada. La maqueta se ve bien porque usa importes de
 * 7 caracteres a 389px de ancho; con los datos de verdad no alcanza.
 *
 * `tabular-nums` alinea los dígitos entre las tres columnas, que si no bailan.
 */
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0'>
      <dt className='text-muted-foreground text-[11px] leading-tight md:text-sm'>{label}</dt>
      <dd className='mt-1 text-base font-semibold tabular-nums tracking-tight md:text-3xl'>
        {value}
      </dd>
    </div>
  )
}
