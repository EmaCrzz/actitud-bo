'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import { getMembershipPayments } from '@/accounting/api/client'
import { formatCurrency } from '@/lib/format-currency'
import { formatDate } from '@/lib/format-date'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslationShort, type MembershipTypes } from '@/membership/consts'

interface CustomerProfilePaymentsProps {
  customerId: string
  /**
   * El usuario puede leer finanzas. Se resuelve en el server y baja como prop.
   *
   * `membership_payments` es **admin-only a nivel RLS** desde la migración
   * 20260702120000 (defensa en profundidad del RBAC de finanzas). Para un
   * no-admin la consulta no falla: devuelve 0 filas. Sin este flag el tab diría
   * "todavía no hay pagos" a alguien que sí tiene pagos, que es peor que decirle
   * que no los puede ver.
   */
  canReadPayments: boolean
}

/**
 * Tab "Pagos" del Perfil del cliente: historial de renovaciones.
 *
 * Reusa el endpoint que ya existía (`/api/accounting/payments?customer_id=`), no
 * agrega uno nuevo.
 */
export default function CustomerProfilePayments({
  customerId,
  canReadPayments,
}: CustomerProfilePaymentsProps) {
  const { t } = useTranslations()

  const { data, isPending, isError } = useQuery({
    queryKey: ['customer', 'v2', 'payments', customerId],
    queryFn: () => getMembershipPayments({ customer_id: customerId }),
    enabled: canReadPayments,
  })

  if (!canReadPayments) {
    return <TabMessage>{t('v2.customers.profile.payments.forbidden')}</TabMessage>
  }
  if (isPending) return <PaymentsSkeleton />
  if (isError || !data?.success) {
    return <TabMessage>{t('v2.customers.profile.payments.error')}</TabMessage>
  }

  const payments = data.data ?? []

  if (payments.length === 0) {
    return <TabMessage>{t('v2.customers.profile.payments.empty')}</TabMessage>
  }

  return (
    <ul className='flex flex-col'>
      {payments.map((payment) => (
        <li
          key={payment.id}
          className='flex items-start justify-between gap-3 border-b py-3 last:border-b-0'
        >
          <div className='flex min-w-0 flex-col gap-0.5'>
            <span className='truncate text-sm font-medium'>
              {t(MembershipTranslationShort[payment.membership_type as MembershipTypes])}
            </span>
            <span className='text-sm text-muted-foreground'>
              {t('v2.customers.profile.payments.date')} {formatDate(payment.payment_date)}
            </span>
          </div>
          <div className='flex shrink-0 flex-col items-end gap-1'>
            <span className='text-sm font-medium'>{formatCurrency(payment.amount)}</span>
            {/* Etiqueta fija, no estado: `membership_payments` no tiene columna
                de situación — toda fila de esa tabla *es* un pago realizado. */}
            <StatusBadge tone='neutral'>{t('v2.customers.profile.payments.paid')}</StatusBadge>
          </div>
        </li>
      ))}
    </ul>
  )
}

// Sub-componentes

function TabMessage({ children }: { children: React.ReactNode }) {
  return <p className='py-2 text-sm text-muted-foreground'>{children}</p>
}

function PaymentsSkeleton() {
  return (
    <div aria-busy className='flex flex-col gap-4'>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className='flex items-center justify-between gap-3'>
          <div className='flex flex-1 flex-col gap-1.5'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-3 w-32' />
          </div>
          <Skeleton className='h-5 w-20' />
        </div>
      ))}
    </div>
  )
}
