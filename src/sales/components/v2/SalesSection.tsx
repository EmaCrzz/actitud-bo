'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, CircleDollarSign, Download, Plus, UserSearch } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Button from '@/components/v2/ui/Button'
import DataTable, { DataTableAvatar, type DataTableColumn } from '@/components/v2/DataTable'
import DataTablePagination from '@/components/v2/DataTablePagination'
import DatePicker from '@/components/v2/ui/DatePicker'
import EmptyState from '@/components/v2/EmptyState'
import SectionKpi from '@/components/v2/SectionKpi'
import FilterBar from '@/components/v2/FilterBar'
import FilterDropdown from '@/components/v2/FilterDropdown'
import { useTranslations } from '@/lib/i18n/context'
import { formatCalendarDate } from '@/lib/format-date'
import { formatCurrency } from '@/lib/format-currency'
import { getInitials } from '@/lib/format-person'
import { toAppTzIsoDate } from '@/lib/timezone'
import { getMembershipLabel } from '@/membership/catalog'
import { PaymentTypeArray, PaymentsTranslation, type PaymentType } from '@/membership/consts'
import RenewMembershipPanel, {
  type RenewableCustomer,
} from '@/membership/components/v2/RenewMembershipPanel'
import { compareLedgerEntries } from '@/sales/ledger'
import { downloadSalesCsv } from '@/sales/export'
import { matchesSaleFilters, saleFiltersToQueryString, type SaleListFilters } from '@/sales/filters'
import { summarizeSalesLedger } from '@/sales/summary'
import {
  SALE_KIND_MEMBERSHIP,
  SALE_KIND_PRODUCT,
  type ProductLedgerEntry,
  type SaleKind,
  type SalesLedgerEntry,
} from '@/sales/types'
import SaleFormPanel, { type SalePanelMode } from './SaleFormPanel'

const PAGE_SIZE = 10

type SortDirection = 'asc' | 'desc'

interface SalesSectionProps {
  /** **Todo** lo cobrado en el rango —cuotas y productos—, sin filtrar por método ni texto. */
  entries: SalesLedgerEntry[]
  filters: SaleListFilters
  page: number
  failed: boolean
  lang: 'es' | 'en'
}

const isProduct = (entry: SalesLedgerEntry): entry is ProductLedgerEntry =>
  entry.kind === SALE_KIND_PRODUCT

/**
 * Sección Ventas (Fase 12): **todo lo que se cobra**, cuotas y productos.
 *
 * Misma arquitectura que Gastos: el rango se resuelve en el server y define de
 * qué período habla la pantalla; el método y la búsqueda se aplican en memoria
 * y sólo eligen qué subconjunto se lista. Los KPIs describen el período.
 *
 * **Las filas de cuota son de sólo lectura.** Una cuota se cobra por la
 * renovación —que calcula modalidad, recargo y descuento y emite comprobante—,
 * y editar acá un pago con comprobante emitido es la deuda que el plan ya tiene
 * anotada. Sólo las ventas de producto abren el panel.
 */
export default function SalesSection({
  entries,
  filters,
  page: initialPage,
  failed,
  lang,
}: SalesSectionProps) {
  const { t } = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(filters.query)
  const [method, setMethod] = useState<PaymentType | null>(filters.method)
  const [kind, setKind] = useState<SaleKind | null>(filters.kind)
  const [page, setPage] = useState(initialPage)
  const [sort, setSort] = useState<SortDirection>('desc')

  // El modo vive en estado —no se arma en cada render— porque el panel se
  // resetea cuando cambia: un objeto nuevo por render lo resetearía siempre.
  const [panelMode, setPanelMode] = useState<SalePanelMode>({ kind: 'without-customer' })
  const [panelOpen, setPanelOpen] = useState(false)
  const [renewCustomer, setRenewCustomer] = useState<RenewableCustomer | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)

  const rangeSummary = useMemo(() => summarizeSalesLedger(entries), [entries])

  const visible = useMemo(() => {
    const filtered = entries.filter((entry) =>
      matchesSaleFilters(entry, { query: search, method, kind })
    )

    // Copia antes de ordenar: `sort` muta, y mutar el array de props rompe la
    // memoización de `rangeSummary`.
    return [...filtered].sort((a, b) => compareLedgerEntries(a, b, sort))
  }, [entries, kind, method, search, sort])

  const pageRows = useMemo(
    () => visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [visible, page]
  )
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))

  // Un filtro que achica la lista puede dejar la página actual fuera de rango.
  useEffect(() => {
    if (page > totalPages - 1) setPage(0)
  }, [page, totalPages])

  // Los filtros en la URL, sin volver al server. Mismo patrón que Gastos.
  useEffect(() => {
    const qs = saleFiltersToQueryString({ ...filters, query: search, method, kind }, page)
    const next = `${window.location.pathname}?${qs}`

    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', next)
    }
  }, [filters, kind, method, page, search])

  /** Sólo el rango vuelve al server: es lo único que cambia qué filas existen. */
  const applyRange = useCallback(
    (patch: { from?: string; to?: string }) => {
      const qs = saleFiltersToQueryString(
        { ...filters, ...patch, query: search, method, kind },
        0
      )

      setPage(0)
      startTransition(() => router.push(`?${qs}`, { scroll: false }))
    },
    [filters, kind, method, router, search]
  )

  const openPanel = useCallback((mode: SalePanelMode) => {
    setPanelMode(mode)
    setPanelOpen(true)
  }, [])

  const openEdit = useCallback(
    (entry: SalesLedgerEntry) => {
      if (isProduct(entry)) openPanel({ kind: 'edit', sale: entry.sale })
    },
    [openPanel]
  )

  /**
   * "Membresía" en el panel de venta: se cierra ese panel y se abre la
   * renovación con el cliente ya resuelto. No se reimplementa el cobro de una
   * cuota acá — la renovación ya sabe hacerlo, con comprobante incluido.
   */
  const handleChooseMembership = useCallback((customer: RenewableCustomer) => {
    setPanelOpen(false)
    setRenewCustomer(customer)
    setRenewOpen(true)
  }, [])

  // El listado lo trae un server component, así que alcanza con revalidarlo.
  const refresh = useCallback(() => router.refresh(), [router])

  const methodOptions = useMemo(
    () =>
      PaymentTypeArray.map((paymentType) => ({
        value: paymentType,
        label: t(PaymentsTranslation[paymentType]),
      })),
    [t]
  )

  const kindOptions = useMemo(
    () => [
      { value: SALE_KIND_MEMBERSHIP, label: t('v2.sales.filters.kindMembership') },
      { value: SALE_KIND_PRODUCT, label: t('v2.sales.filters.kindProduct') },
    ],
    [t]
  )

  const buyerLabel = useCallback(
    (entry: SalesLedgerEntry) => entry.buyerName ?? t('v2.sales.noBuyer'),
    [t]
  )

  /**
   * Qué se cobró. El diseño la dibuja bajo el encabezado "Membresía" y pone el
   * monto bajo "Concepto" — los encabezados están corridos una columna. Acá
   * cada uno dice lo que contiene.
   */
  const conceptLabel = useCallback(
    (entry: SalesLedgerEntry) =>
      entry.kind === SALE_KIND_MEMBERSHIP
        ? t('v2.sales.concept.membership', {
            plan: getMembershipLabel(entry.membershipType, t, { name: entry.planName }),
          })
        : t('v2.sales.concept.product', { description: entry.description }),
    [t]
  )

  const methodLabel = useCallback(
    (entry: SalesLedgerEntry) =>
      // Un valor fuera del vocabulario se muestra crudo en vez de caer en
      // `t(undefined)`, que revienta el render entero (Fase 10).
      entry.paymentMethod in PaymentsTranslation
        ? t(PaymentsTranslation[entry.paymentMethod as PaymentType])
        : entry.paymentMethod,
    [t]
  )

  // Día AR, no el ISO cortado: una cuota cobrada después de las 21:00 AR tiene
  // fecha UTC del día siguiente.
  const dateLabel = useCallback(
    (entry: SalesLedgerEntry) => formatCalendarDate(toAppTzIsoDate(entry.date)),
    []
  )

  const columns: DataTableColumn<SalesLedgerEntry>[] = useMemo(
    () => [
      {
        id: 'buyer',
        header: t('v2.sales.columns.buyer'),
        // Desde `xl`, en una línea. Como Concepto absorbe el espacio libre, las
        // demás columnas quedan en su mínimo, y el mínimo de un nombre es
        // partirlo en dos aunque sobre lugar (lo reportó Ema). Debajo de `xl`
        // sí se parte: a 1024 con el sidebar abierto ese ancho es el que
        // necesita el concepto para leerse.
        className: 'xl:whitespace-nowrap',
        cell: (entry) => (
          <span className='flex items-center gap-3'>
            {/* Debajo de `xl` el avatar se oculta: con el sidebar abierto el card
                de 1024 deja ~580px para seis columnas, y sus 52px eran los que
                le faltaban al concepto para leerse. */}
            <DataTableAvatar
              className='hidden xl:flex'
              initials={entry.buyerName ? getInitials(entry.buyerName) : '–'}
            />
            <span className={entry.buyerName ? undefined : 'text-muted-foreground'}>
              {buyerLabel(entry)}
            </span>
          </span>
        ),
      },
      {
        id: 'concept',
        header: t('v2.sales.columns.concept'),
        // `w-full max-w-0`: la columna se queda con el espacio libre y es la que
        // cede cuando falta. Con el `max-w-[28ch]` de antes el truncate fijaba
        // un mínimo, y la tabla no bajaba de 772px — a 1024 con el sidebar
        // abierto se salía del card (medido el 2026-10-01). El detalle de un
        // producto es texto libre y puede ser largo: es el que tiene que cortar.
        className: 'w-full max-w-0',
        cell: (entry) => (
          <span
            className='block truncate'
            title={
              entry.kind === SALE_KIND_MEMBERSHIP ? t('v2.sales.readOnlyRow') : conceptLabel(entry)
            }
          >
            {conceptLabel(entry)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: t('v2.sales.columns.amount'),
        className: 'whitespace-nowrap',
        cell: (entry) => (
          <>
            {formatCurrency(entry.amount, { lang })}
            {/* Debajo de `xl` la columna Método se oculta y el método va acá,
                como en la fila mobile. Ver la columna `method`. */}
            <span className='text-muted-foreground block text-xs xl:hidden'>
              {methodLabel(entry)}
            </span>
          </>
        ),
      },
      {
        id: 'date',
        header: t('v2.sales.columns.date'),
        className: 'whitespace-nowrap',
        cell: (entry) => <span className='text-muted-foreground'>{dateLabel(entry)}</span>,
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
        header: t('v2.sales.columns.method'),
        // Sólo desde `xl`. A 1024 con el sidebar abierto el card deja ~580px
        // para seis columnas: la tabla quedaba en su ancho mínimo y el concepto
        // cortado en "Producto: …". El método pasa a la celda del monto.
        className: 'hidden whitespace-nowrap xl:table-cell',
        cell: (entry) => <span className='text-muted-foreground'>{methodLabel(entry)}</span>,
      },
    ],
    [buyerLabel, conceptLabel, dateLabel, lang, methodLabel, sort, t]
  )

  const isFiltered = Boolean(search.trim() || method || kind)

  const handleExport = useCallback(
    () =>
      downloadSalesCsv(visible, {
        filename: `${t('v2.sales.exportFilename')}-${filters.from}_${filters.to}.csv`,
        headers: {
          date: t('v2.sales.columns.date'),
          buyer: t('v2.sales.columns.buyer'),
          concept: t('v2.sales.columns.concept'),
          amount: t('v2.sales.columns.amount'),
          method: t('v2.sales.columns.method'),
        },
        buyerLabel,
        conceptLabel,
        methodLabel,
        dateLabel,
      }),
    [buyerLabel, conceptLabel, dateLabel, filters.from, filters.to, methodLabel, t, visible]
  )

  const exportButton = (
    <Button
      aria-label={t('v2.sales.export')}
      disabled={visible.length === 0}
      type='button'
      variant='outlined'
      onClick={handleExport}
    >
      <Download aria-hidden className='size-4' />
      <span className='hidden md:inline'>{t('v2.sales.export')}</span>
    </Button>
  )

  return (
    <div className='flex flex-1 flex-col md:min-h-0'>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold'>{t('v2.sales.title')}</h2>
          <p className='text-muted-foreground text-sm'>
            {rangeSummary.count === 0
              ? t('v2.sales.summaryEmpty')
              : rangeSummary.count === 1
                ? t('v2.sales.summaryOne')
                : t('v2.sales.summary', { count: rangeSummary.count })}
          </p>
        </div>

        {/* Desktop: "Nueva venta ▾" en el header del card (captura 2). */}
        <NewSaleMenu
          trigger={
            <Button className='hidden md:inline-flex' type='button'>
              {t('v2.sales.new')}
              <ChevronDown aria-hidden className='size-4' />
            </Button>
          }
          onSelect={openPanel}
        />
      </div>

      {/* Mobile pone los filtros arriba de los KPIs y desktop al revés — mismo
          `order` que Gastos, que tiene la misma disposición en las capturas. */}
      <div className='flex flex-col'>
        <div className='order-2 border-y py-4 md:order-1'>
          <div className='flex items-start justify-between gap-4'>
            <dl className='grid flex-1 grid-cols-3 gap-2 md:gap-4'>
              <SectionKpi label={t('v2.sales.kpi.total')} value={formatCurrency(rangeSummary.total, { lang })} />
              <SectionKpi label={t('v2.sales.kpi.cash')} value={formatCurrency(rangeSummary.cash, { lang })} />
              <SectionKpi
                label={t('v2.sales.kpi.transfer')}
                value={formatCurrency(rangeSummary.transfer, { lang })}
              />
            </dl>

            <div className='md:hidden'>{exportButton}</div>
          </div>
        </div>

        <FilterBar
          action={
            <>
              {/* Mobile: el `+` abre **el mismo menú** que desktop. En las
                  capturas mobile el `+` va directo al buscador de clientes, y
                  no hay forma de vender sin cliente. */}
              <NewSaleMenu
                trigger={
                  <Button aria-label={t('v2.sales.new')} className='md:hidden' size='icon' type='button'>
                    <Plus aria-hidden className='size-4' />
                  </Button>
                }
                onSelect={openPanel}
              />
              <span className='hidden md:inline-flex'>{exportButton}</span>
            </>
          }
          className='order-1 py-4 md:order-2'
          inlineFrom='never'
          search={
            <FilterBar.Search
              placeholder={t('v2.sales.filters.search')}
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
            />
          }
        >
          {/* Cuatro filtros no entran en la fila del search a ningún ancho útil
              (ver `inlineFrom` en `FilterBar`), así que van en fila propia y se
              agrupan:
              - debajo de `lg`: fechas en una fila, selects en otra (pedido de
                Ema, 2026-10-01, para mobile);
              - desde `lg`: los dos grupos lado a lado, cuatro controles de igual
                ancho en una fila. */}
          <div className='flex min-w-0 basis-full gap-2 lg:basis-0 lg:flex-1'>
            <DatePicker
              key={`from-${filters.from}`}
              ariaLabel={t('v2.sales.filters.from')}
              className='min-w-0 flex-1'
              defaultValue={filters.from}
              id='sale_filter_from'
              name='sale_filter_from'
              onValueChange={(from) => applyRange({ from })}
            />
            <DatePicker
              key={`to-${filters.to}`}
              ariaLabel={t('v2.sales.filters.to')}
              className='min-w-0 flex-1'
              defaultValue={filters.to}
              id='sale_filter_to'
              name='sale_filter_to'
              onValueChange={(to) => applyRange({ to })}
            />
          </div>
          <div className='flex min-w-0 basis-full gap-2 lg:basis-0 lg:flex-1'>
            <FilterDropdown
              allLabel={t('v2.sales.filters.methodAll')}
              className='sm:w-auto sm:flex-1'
              label={t('v2.sales.filters.method')}
              options={methodOptions}
              value={method ?? 'all'}
              onChange={(value) => {
                setMethod(value === 'all' ? null : (value as PaymentType))
                setPage(0)
              }}
            />
            <FilterDropdown
              allLabel={t('v2.sales.filters.kindAll')}
              className='sm:w-auto sm:flex-1'
              label={t('v2.sales.filters.kind')}
              options={kindOptions}
              value={kind ?? 'all'}
              onChange={(value) => {
                setKind(value === 'all' ? null : (value as SaleKind))
                setPage(0)
              }}
            />
          </div>
        </FilterBar>
      </div>

      <div className='mt-4 flex-1 md:min-h-0 md:overflow-y-auto'>
        <DataTable
          rowChevron
          columns={columns}
          empty={
            isFiltered ? (
              <EmptyState
                description={t('v2.sales.emptyFiltered.description')}
                title={t('v2.sales.emptyFiltered.title')}
              />
            ) : (
              <EmptyState
                description={t('v2.sales.empty.description')}
                title={t('v2.sales.empty.title')}
              />
            )
          }
          error={
            failed ? (
              <EmptyState
                description={t('v2.sales.error.description')}
                title={t('v2.sales.error.title')}
              />
            ) : undefined
          }
          getRowId={(entry) => entry.key}
          isLoading={isPending}
          isRowClickable={isProduct}
          mobileRow={(entry) => (
            <MobileRow
              amount={formatCurrency(entry.amount, { lang })}
              date={dateLabel(entry)}
              detail={`${conceptLabel(entry)} · ${methodLabel(entry)}`}
              name={buyerLabel(entry)}
              onClick={isProduct(entry) ? () => openEdit(entry) : undefined}
            />
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
          summary={t('v2.sales.pagination', { page: page + 1, total: totalPages })}
          total={visible.length}
          onPageChange={setPage}
        />
      )}

      <SaleFormPanel
        lang={lang}
        mode={panelMode}
        open={panelOpen}
        onChooseMembership={handleChooseMembership}
        onOpenChange={setPanelOpen}
        onSaved={refresh}
      />

      <RenewMembershipPanel
        customer={renewCustomer}
        open={renewOpen}
        onOpenChange={setRenewOpen}
        onRenewed={refresh}
      />
    </div>
  )
}

/** "Nueva venta ▾": Buscar cliente / Continuar sin cliente (captura 2). */
function NewSaleMenu({
  trigger,
  onSelect,
}: {
  trigger: React.ReactNode
  onSelect: (mode: SalePanelMode) => void
}) {
  const { t } = useTranslations()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='!p-1' data-v2='true'>
        <DropdownMenuItem onSelect={() => onSelect({ kind: 'with-customer' })}>
          <UserSearch aria-hidden className='size-4' />
          {t('v2.sales.menu.withCustomer')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect({ kind: 'without-customer' })}>
          <CircleDollarSign aria-hidden className='size-4' />
          {t('v2.sales.menu.withoutCustomer')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * La fila mobile (captura 10): nombre arriba, "concepto · método" abajo, monto
 * y fecha a la derecha. Sin `onClick` es una cuota: no se renderiza como botón,
 * para no prometer un panel que no se abre.
 */
function MobileRow({
  name,
  detail,
  amount,
  date,
  onClick,
}: {
  name: string
  detail: string
  amount: string
  date: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-medium'>{name}</span>
        <span className='text-muted-foreground mt-0.5 block truncate text-xs'>{detail}</span>
      </span>
      <span className='shrink-0 text-right'>
        <span className='block text-sm font-medium'>{amount}</span>
        <span className='text-muted-foreground mt-0.5 block text-xs'>{date}</span>
      </span>
    </>
  )
  const className = 'flex w-full items-start justify-between gap-3 px-1 py-3 text-left'

  return onClick ? (
    <button className={`${className} hover:bg-muted/50`} type='button' onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
