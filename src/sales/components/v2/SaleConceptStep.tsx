'use client'

import { CreditCard, Package } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/context'

interface Props {
  onChooseMembership: () => void
  onChooseProduct: () => void
}

/**
 * "¿Qué se vende?" — la bifurcación de una venta a cliente.
 *
 * **No es un paso del stepper.** Es el mismo lugar que ocupa el buscador en la
 * renovación: elige qué flujo sigue, no carga datos. Elegir Membresía no sigue
 * en este panel sino que abre la renovación de la Fase 8 con el cliente ya
 * resuelto, porque cobrar una cuota es eso — modalidad, recargo, descuento,
 * comprobante — y ya existe.
 */
export default function SaleConceptStep({ onChooseMembership, onChooseProduct }: Props) {
  const { t } = useTranslations()

  return (
    <div className='flex flex-col gap-3'>
      <ConceptOption
        description={t('v2.sales.form.conceptMembershipDescription')}
        icon={<CreditCard aria-hidden className='size-4' />}
        id='sale_concept_membership'
        title={t('v2.sales.form.conceptMembership')}
        onClick={onChooseMembership}
      />
      <ConceptOption
        description={t('v2.sales.form.conceptProductDescription')}
        icon={<Package aria-hidden className='size-4' />}
        id='sale_concept_product'
        title={t('v2.sales.form.conceptProduct')}
        onClick={onChooseProduct}
      />
    </div>
  )
}

function ConceptOption({
  id,
  icon,
  title,
  description,
  onClick,
}: {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      className='hover:bg-muted flex w-full items-center gap-4 rounded-lg border px-4 py-4 text-left transition-colors hover:cursor-pointer'
      id={id}
      type='button'
      onClick={onClick}
    >
      <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-md'>
        {icon}
      </span>
      <span className='flex min-w-0 flex-col'>
        <span className='text-sm font-medium'>{title}</span>
        <span className='text-muted-foreground text-xs'>{description}</span>
      </span>
    </button>
  )
}
