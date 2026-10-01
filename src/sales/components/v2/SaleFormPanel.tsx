'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, Loader2 } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import ConfirmDialog from '@/components/v2/ConfirmDialog'
import { DataTableAvatar } from '@/components/v2/DataTable'
import SidePanel from '@/components/v2/SidePanel'
import Stepper from '@/components/v2/Stepper'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from '@/customer/components/v2/customer-status'
import type { CustomerWithMembership } from '@/customer/types'
import { getCustomerMembershipStatus } from '@/customer/utils'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import { getTodayIsoDateInAppTz, toAppTzIsoDate } from '@/lib/timezone'
import { getMembershipLabel } from '@/membership/catalog'
import RenewCustomerSearchStep from '@/membership/components/v2/RenewCustomerSearchStep'
import type { RenewableCustomer } from '@/membership/components/v2/RenewMembershipPanel'
import { createSale, deleteSale, updateSale } from '@/sales/api/client'
import type { Sale, SaleInput } from '@/sales/types'
import SaleConceptStep from './SaleConceptStep'
import SaleDetailStep, { type SaleFormErrors, type SaleFormValues } from './SaleDetailStep'
import SaleReviewStep from './SaleReviewStep'

/** Cuánto queda el cartel de éxito antes de cerrar el panel. Mismo valor que Gastos. */
const SUCCESS_DISMISS_MS = 1200

/** Con qué se abre el panel. Lo decide el menú "Nueva venta" o el click en una fila. */
export type SalePanelMode =
  | { kind: 'with-customer' }
  | { kind: 'without-customer' }
  | { kind: 'edit'; sale: Sale }

type Screen = 'search' | 'concept' | 'detail' | 'review'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SalePanelMode
  lang: 'es' | 'en'
  onSaved: () => void
  /** Eligió "Membresía": la cuota se cobra por la renovación de la Fase 8. */
  onChooseMembership: (customer: RenewableCustomer) => void
}

/**
 * Nueva venta / editar venta (Fase 12).
 *
 * **Un panel, tres entradas** —con cliente, sin cliente, edición— por el mismo
 * motivo que el alta de cliente y la renovación: son el mismo formulario y lo
 * que cambia es cómo se llega a él.
 *
 * **El stepper es el de la renovación** (pedido de Ema, 2026-10-01, con la
 * captura del panel de renovar como referencia): la ficha del cliente anclada
 * arriba y dos pasos, `Detalle de la venta` → `Confirmar`. El buscador y la
 * elección Membresía/Producto quedan **fuera** del stepper, igual que el
 * buscador de la renovación: no cargan datos de la venta, eligen cuál se hace.
 * Si se elige Membresía, la renovación abre con su propio stepper —`Nueva
 * membresía` → `Confirmar`—, así que el operador ve la misma forma de punta a
 * punta.
 */
export default function SaleFormPanel({
  open,
  onOpenChange,
  mode,
  lang,
  onSaved,
  onChooseMembership,
}: Props) {
  const { t } = useTranslations()
  const isEdit = mode.kind === 'edit'

  const [screen, setScreen] = useState<Screen>(() => initialScreen(mode))
  const [customer, setCustomer] = useState<CustomerWithMembership | null>(null)
  const [values, setValues] = useState<SaleFormValues>(() => initialValues(mode))
  const [errors, setErrors] = useState<SaleFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<'created' | 'updated' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Se resetea al abrir, no al montar: el panel vive montado entre aperturas y
  // sin esto la segunda venta arrancaría con los datos de la primera.
  useEffect(() => {
    if (!open) return

    setScreen(initialScreen(mode))
    setCustomer(null)
    setValues(initialValues(mode))
    setErrors({})
    setSubmitError(null)
    setSuccess(null)
    setConfirmDelete(false)
  }, [open, mode])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => onOpenChange(false), SUCCESS_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [success, onOpenChange])

  const patch = useCallback((next: Partial<SaleFormValues>) => {
    setValues((previous) => ({ ...previous, ...next }))
  }, [])

  /**
   * De quién es la venta. Con cliente —elegido recién o en la venta que se
   * edita— el nombre sale de su ficha y el formulario no pide "Datos de
   * referencia": guardarlos también rompería `sales_single_buyer_check`.
   */
  const editedSale = isEdit ? mode.sale : null
  const customerId = customer?.id ?? editedSale?.customer_id ?? null
  const customerName = customer
    ? fullName(customer)
    : editedSale?.customer
      ? fullName(editedSale.customer)
      : null

  const validate = useCallback((): boolean => {
    const next: SaleFormErrors = {}

    if (!values.description.trim()) next.description = t('v2.sales.errors.descriptionRequired')
    if (!(values.amount > 0)) next.amount = t('v2.sales.errors.amountRequired')
    if (!values.date) next.date = t('v2.sales.errors.dateRequired')
    // A diferencia de Gastos, acá sí es obligatoria: los KPIs Efectivo y
    // Transferencias tienen que sumar el total cobrado, y la columna es NOT NULL.
    if (!values.paymentMethod) next.paymentMethod = t('v2.sales.errors.methodRequired')

    setErrors(next)

    return Object.keys(next).length === 0
  }, [values, t])

  // Se valida al pasar al resumen, no al confirmar: los campos viven en el paso
  // 1, y descubrir un error recién en "Confirmar venta" obliga a volver atrás.
  // Mismo criterio que la renovación.
  const handleNext = useCallback(() => {
    if (validate()) setScreen('review')
  }, [validate])

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      setScreen('detail')

      return
    }

    setLoading(true)
    setSubmitError(null)

    const payload: SaleInput = {
      customer_id: customerId,
      buyer_name: customerId ? null : values.buyerName.trim() || null,
      description: values.description.trim(),
      amount: values.amount,
      payment_method: values.paymentMethod,
      // Viaja crudo: el server lo canonicaliza a medianoche AR. Ver `normalizeSaleInput`.
      sale_date: values.date,
    }

    const result = editedSale ? await updateSale(editedSale.id, payload) : await createSale(payload)

    setLoading(false)

    if (!result.success) {
      setSubmitError(t('v2.sales.errors.saveFailed'))

      return
    }

    setSuccess(editedSale ? 'updated' : 'created')
    onSaved()
  }, [customerId, editedSale, onSaved, t, validate, values])

  const handleDelete = useCallback(async () => {
    if (!editedSale) return

    setConfirmDelete(false)
    setLoading(true)
    setSubmitError(null)

    const result = await deleteSale(editedSale.id)

    setLoading(false)

    if (!result.success) {
      setSubmitError(t('v2.sales.errors.deleteFailed'))

      return
    }

    onSaved()
    onOpenChange(false)
  }, [editedSale, onOpenChange, onSaved, t])

  const handleBack = useCallback(() => {
    if (screen === 'review') return setScreen('detail')
    // Con cliente recién elegido, el detalle vuelve a la elección de concepto,
    // y ésta al buscador. Volver al buscador descarta al cliente: seguir con el
    // formulario de otra persona es exactamente el error que hay que evitar.
    if (screen === 'detail' && mode.kind === 'with-customer') return setScreen('concept')
    if (screen === 'concept') {
      setCustomer(null)

      return setScreen('search')
    }
    onOpenChange(false)
  }, [mode.kind, onOpenChange, screen])

  const isFormScreen = screen === 'detail' || screen === 'review'
  const busy = loading || success != null

  const footer =
    screen === 'search' ? undefined : (
      <div className='flex items-center justify-between gap-3'>
        {/* En la edición, el detalle cambia `Cancelar` por `Eliminar` — mismo
            criterio que el panel de Gastos. */}
        {isEdit && screen === 'detail' ? (
          <Button
            className='text-feedback-error'
            disabled={busy}
            type='button'
            variant='outlined'
            onClick={() => setConfirmDelete(true)}
          >
            {t('v2.sales.form.delete')}
          </Button>
        ) : (
          <Button disabled={busy} type='button' variant='outlined' onClick={handleBack}>
            {screen === 'review' || screen === 'concept' || mode.kind === 'with-customer'
              ? t('common.back')
              : t('common.cancel')}
          </Button>
        )}

        {isFormScreen && (
          <Button
            disabled={busy}
            type='button'
            onClick={screen === 'review' ? handleSubmit : handleNext}
          >
            {loading && <Loader2 aria-hidden className='size-4 animate-spin' />}
            {loading
              ? t('v2.sales.form.submitting')
              : screen === 'detail'
                ? t('common.next')
                : isEdit
                  ? t('v2.sales.form.submitEdit')
                  : t('v2.sales.form.submit')}
          </Button>
        )}
      </div>
    )

  const pinned =
    screen === 'search' ? undefined : (
      <div className='flex flex-col gap-4'>
        {customerName && <BuyerCard customer={customer} name={customerName} />}
        {isFormScreen && (
          <Stepper
            current={screen === 'detail' ? 0 : 1}
            steps={[t('v2.sales.form.stepDetail'), t('v2.sales.form.stepConfirm')]}
          />
        )}
      </div>
    )

  return (
    <>
      <SidePanel
        footer={footer}
        open={open}
        pinned={pinned}
        title={t(isEdit ? 'v2.sales.form.editTitle' : 'v2.sales.form.createTitle')}
        onOpenChange={onOpenChange}
      >
        {screen === 'search' ? (
          <RenewCustomerSearchStep
            prompt={t('v2.sales.form.searchPrompt')}
            onSelect={(picked) => {
              setCustomer(picked)
              setScreen('concept')
            }}
          />
        ) : screen === 'concept' ? (
          <SaleConceptStep
            onChooseMembership={() => customer && onChooseMembership(customer)}
            onChooseProduct={() => setScreen('detail')}
          />
        ) : screen === 'detail' ? (
          <SaleDetailStep
            errors={errors}
            values={values}
            withBuyerName={!customerId}
            onChange={patch}
          />
        ) : (
          <SaleReviewStep customerName={customerName} lang={lang} values={values} />
        )}

        {submitError && <p className='text-feedback-error mt-4 text-sm'>{submitError}</p>}

        {success && (
          <div className='text-feedback-success border-feedback-success/40 bg-feedback-success/10 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm'>
            <CircleCheck aria-hidden className='size-4 shrink-0' />
            {t(`v2.sales.success.${success}`)}
          </div>
        )}
      </SidePanel>

      <ConfirmDialog
        destructive
        description={t('v2.sales.delete.description')}
        isPending={loading}
        open={confirmDelete}
        title={t('v2.sales.delete.title')}
        onConfirm={handleDelete}
        onOpenChange={setConfirmDelete}
      />
    </>
  )
}

/**
 * La ficha del comprador, anclada arriba del panel (capturas 4 y 5).
 *
 * Con el cliente recién elegido en el buscador se muestran su plan y su estado,
 * igual que en la renovación. En la edición sólo está el nombre: la venta trae
 * el cliente, no su membresía, y traerla para un adorno no vale el fetch.
 */
function BuyerCard({ name, customer }: { name: string; customer: CustomerWithMembership | null }) {
  const { t } = useTranslations()
  const status = customer ? getCustomerMembershipStatus(customer) : null

  return (
    <div className='flex items-center gap-3'>
      <DataTableAvatar initials={getInitials(name)} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-sm font-semibold'>{name}</span>
        {customer && (
          <span className='text-muted-foreground truncate text-xs'>
            {customer.membership_type
              ? t('v2.membership.renew.currentPlan', {
                  plan: getMembershipLabel(customer.membership_type, t),
                })
              : t('v2.customers.row.noMembership')}
          </span>
        )}
      </div>
      {status && (
        <StatusBadge tone={CUSTOMER_STATUS_TONE[status]}>{t(CUSTOMER_STATUS_LABEL[status])}</StatusBadge>
      )}
    </div>
  )
}

function initialScreen(mode: SalePanelMode): Screen {
  return mode.kind === 'with-customer' ? 'search' : 'detail'
}

function initialValues(mode: SalePanelMode): SaleFormValues {
  if (mode.kind === 'edit') {
    const { sale } = mode

    return {
      buyerName: sale.buyer_name ?? '',
      description: sale.description,
      amount: sale.amount,
      // `sale_date` es medianoche AR (03:00Z): cortar el ISO daría el día UTC.
      date: toAppTzIsoDate(sale.sale_date),
      paymentMethod: sale.payment_method,
    }
  }

  return {
    buyerName: '',
    description: '',
    amount: 0,
    // Nunca `new Date().toISOString().slice(0, 10)`: en AR después de las 21:00
    // eso devuelve el día siguiente.
    date: getTodayIsoDateInAppTz(),
    paymentMethod: '',
  }
}

function fullName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`.trim()
}
