'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Button from '@/components/v2/ui/Button'
import DataTable, { type DataTableColumn } from '@/components/v2/DataTable'
import DataTablePagination from '@/components/v2/DataTablePagination'
import EmptyState from '@/components/v2/EmptyState'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import { useTranslations } from '@/lib/i18n/context'
import { formatCurrency } from '@/lib/format-currency'
import { getMembershipLabel } from '@/membership/catalog'
import { useInvalidateMembershipTypes } from '@/membership/hooks/use-membership-types-cache'
import PlanFormPanel from './PlanFormPanel'
import type { MembershipPlan } from '@/membership/types'

const PAGE_SIZE = 10

interface MembershipPlansSectionProps {
  plans: MembershipPlan[]
  failed: boolean
  lang: 'es' | 'en'
}

export default function MembershipPlansSection({
  plans,
  failed,
  lang,
}: MembershipPlansSectionProps) {
  const { t } = useTranslations()
  const router = useRouter()

  const [page, setPage] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  // `null` = crear. El panel distingue por esto, no por un flag aparte.
  const [editing, setEditing] = useState<MembershipPlan | null>(null)

  const activeCount = plans.filter((plan) => plan.active).length
  const inactiveCount = plans.length - activeCount

  const pageRows = useMemo(
    () => plans.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [plans, page]
  )

  const openCreate = useCallback(() => {
    setEditing(null)
    setPanelOpen(true)
  }, [])

  const openEdit = useCallback((plan: MembershipPlan) => {
    setEditing(plan)
    setPanelOpen(true)
  }, [])

  // Dos invalidaciones, porque hay dos cachés y `refresh()` sólo toca una.
  //
  // `router.refresh()` revalida el server component que trajo esta tabla. Pero
  // los selects de **alta y renovación** leen el catálogo con React Query
  // desde el browser, con 5 minutos de `staleTime`: sin invalidar esa caché, un
  // plan recién creado no aparece ahí hasta recargar la página. Encontrado
  // probando la fase, no leyendo el código.
  const invalidateMembershipTypes = useInvalidateMembershipTypes()
  const handleSaved = useCallback(() => {
    invalidateMembershipTypes()
    router.refresh()
  }, [invalidateMembershipTypes, router])

  const planName = useCallback(
    (plan: MembershipPlan) => getMembershipLabel(plan.type, t, { name: plan.name }),
    [t]
  )

  // `!plan.amount` cubre NULL **y 0**, y el 0 es el que importa: el VIP está
  // cargado con `amount = 0`, no con NULL. Comparar sólo contra NULL le habría
  // puesto "$ 0" donde el Figma dice "Sin costo".
  const priceLabel = useCallback(
    (plan: MembershipPlan) =>
      plan.amount ? formatCurrency(plan.amount, { lang }) : t('v2.membership.plans.free'),
    [lang, t]
  )

  const frequencyLabel = useCallback(
    (plan: MembershipPlan) => {
      if (plan.weekly_quota == null) return '—'

      // Singular aparte: la maqueta dice "1 días/ semana" para el pase diario,
      // que es un bug de copy del diseño. Anotado para el diseñador.
      return plan.weekly_quota === 1
        ? t('v2.membership.plans.frequencyOne')
        : t('v2.membership.plans.frequency', { count: plan.weekly_quota })
    },
    [t]
  )

  const statusBadge = useCallback(
    (plan: MembershipPlan) => (
      <StatusBadge tone={plan.active ? 'success' : 'neutral'}>
        {t(
          plan.active ? 'v2.membership.plans.status.active' : 'v2.membership.plans.status.inactive'
        )}
      </StatusBadge>
    ),
    [t]
  )

  const columns: DataTableColumn<MembershipPlan>[] = useMemo(
    () => [
      {
        id: 'plan',
        header: t('v2.membership.plans.columns.plan'),
        cell: (plan) => planName(plan),
      },
      {
        id: 'prices',
        header: t('v2.membership.plans.columns.prices'),
        cell: (plan) => priceLabel(plan),
      },
      {
        id: 'frequency',
        header: t('v2.membership.plans.columns.frequency'),
        cell: (plan) => <span className='text-muted-foreground'>{frequencyLabel(plan)}</span>,
      },
      {
        id: 'customers',
        header: t('v2.membership.plans.columns.customers'),
        cell: (plan) => <span className='text-muted-foreground'>{plan.customer_count}</span>,
      },
      {
        id: 'status',
        header: t('v2.membership.plans.columns.status'),
        cell: (plan) => statusBadge(plan),
      },
    ],
    [frequencyLabel, planName, priceLabel, statusBadge, t]
  )

  return (
    <>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold'>{t('v2.membership.plans.title')}</h2>
          <p className='text-muted-foreground text-sm'>
            {activeCount === 1
              ? t('v2.membership.plans.summary.activeOne')
              : t('v2.membership.plans.summary.active', { count: activeCount })}
            {' — '}
            {inactiveCount === 1
              ? t('v2.membership.plans.summary.inactiveOne')
              : t('v2.membership.plans.summary.inactive', { count: inactiveCount })}
          </p>
        </div>

        {/* Desktop: el botón vive en el header del card. En mobile el diseño lo
            baja a un CTA sticky al pie, que es el bloque de más abajo. */}
        <Button className='hidden md:inline-flex' type='button' onClick={openCreate}>
          <Plus aria-hidden className='size-4' />
          {t('v2.membership.plans.new')}
        </Button>
      </div>

      {/* Desktop: ventana de scroll propia, con el header y el paginador fijos.
          Mobile: sin `min-h-0` ni `overflow`, así la lista empuja el card y
          scrollea el `<main>` del AppShell de una sola vez. Faltaba: con más
          de una pantalla de planes las últimas filas quedaban debajo del corte
          y no había forma de llegar a ellas. Lo encontró Ema en Gastos, que
          tenía el mismo defecto. */}
      <div className='flex-1 md:min-h-0 md:overflow-y-auto'>
        <DataTable
          rowChevron
          columns={columns}
          empty={
            <EmptyState
              description={t('v2.membership.plans.empty.description')}
              title={t('v2.membership.plans.empty.title')}
            />
          }
          error={
            failed ? (
              <EmptyState
                description={t('v2.membership.plans.error.description')}
                title={t('v2.membership.plans.error.title')}
              />
            ) : undefined
          }
          getRowId={(plan) => plan.id}
          mobileRow={(plan) => (
            <button
              className='hover:bg-muted/50 flex w-full items-center gap-3 px-1 py-3 text-left'
              type='button'
              onClick={() => openEdit(plan)}
            >
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>{planName(plan)}</span>
                <span className='mt-1 flex items-center gap-2'>
                  {statusBadge(plan)}
                  <span className='text-muted-foreground text-xs'>
                    {plan.customer_count === 1
                      ? t('v2.membership.plans.customerCountOne')
                      : t('v2.membership.plans.customerCount', { count: plan.customer_count })}
                  </span>
                </span>
              </span>
              <span className='text-sm'>{priceLabel(plan)}</span>
              <ChevronRight aria-hidden className='text-muted-foreground size-4 shrink-0' />
            </button>
          )}
          rows={pageRows}
          onRowClick={openEdit}
        />
      </div>

      {plans.length > 0 && (
        <DataTablePagination
          className='mt-4'
          page={page}
          pageSize={PAGE_SIZE}
          summary={
            plans.length === 1
              ? t('v2.membership.plans.totalOne')
              : t('v2.membership.plans.total', { count: plans.length })
          }
          total={plans.length}
          onPageChange={setPage}
        />
      )}

      {/* CTA sticky de mobile (`2246:49888` del Figma). En desktop el botón ya
          está en el header del card. */}
      <div className='mt-4 md:hidden'>
        <Button className='w-full' type='button' onClick={openCreate}>
          <Plus aria-hidden className='size-4' />
          {t('v2.membership.plans.new')}
        </Button>
      </div>

      <PlanFormPanel
        open={panelOpen}
        plan={editing}
        onOpenChange={setPanelOpen}
        onSaved={handleSaved}
      />
    </>
  )
}
