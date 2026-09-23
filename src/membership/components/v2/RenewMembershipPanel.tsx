'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTableAvatar } from '@/components/v2/DataTable'
import SidePanel from '@/components/v2/SidePanel'
import Stepper from '@/components/v2/Stepper'
import Button from '@/components/v2/ui/Button'
import StatusBadge from '@/components/v2/ui/StatusBadge'
import { usePermissions } from '@/auth/hooks/use-permissions'
import { upsertCustomerMembership } from '@/customer/api/client'
import { handleDatabaseError } from '@/customer/errors'
import { basicMembershipValidation } from '@/customer/utils'
import { CUSTOMER_STATUS_LABEL, CUSTOMER_STATUS_TONE } from '@/customer/components/v2/customer-status'
import { fetchApplicableDiscount } from '@/group/api/client'
import { computeDiscountAmount } from '@/group/discount'
import { getInitials } from '@/lib/format-person'
import { useTranslations } from '@/lib/i18n/context'
import {
  getAppTzDateParts,
  getTodayIsoDateInAppTz,
  isExpiredInAppTz,
  parseAppTzDateString,
} from '@/lib/timezone'
import {
  fetchRenewalContext,
  getMembershipTypes,
  type RenewalContext,
} from '@/membership/api/client'
import { getPeriodBaseAmount, getPeriodModeOptions } from '@/membership/charge-mode'
import {
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslationShort,
  type MembershipTypes,
  type PaymentType,
} from '@/membership/consts'
import { getSuggestedCharge } from '@/membership/pricing'
import type { MembershipType } from '@/membership/types'
import {
  AMOUNT_CHOICE_NONE,
  AMOUNT_CHOICE_SUGGESTED,
  buildRenewalPeriod,
  resolveRenewalAmounts,
  resolveRenewalPeriod,
  type RenewalFormValues,
} from '@/membership/renewal'
import { type PaymentReceiptData } from './PaymentReceipt'
import RenewCustomerSearchStep from './RenewCustomerSearchStep'
import RenewMembershipStep from './RenewMembershipStep'
import RenewSuccessDialog from './RenewSuccessDialog'
import RenewSummaryStep from './RenewSummaryStep'

export interface RenewableCustomer {
  id: string
  first_name: string
  last_name: string
}

interface RenewMembershipPanelProps {
  /**
   * Cliente ya resuelto — la entrada desde el perfil. `null` abre el panel en
   * el buscador, que es la entrada desde el home.
   */
  customer: RenewableCustomer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama tras una renovación exitosa, para que la vista de origen se refresque. */
  onRenewed?: () => void
}

/**
 * Renovación de membresía (Fase 8) — el panel de 2 pasos.
 *
 * El Figma dibuja el flow dos veces, "Desde el home" (10 pantallas) y "Desde
 * Cliente/Perfil" (7), pero es **un formulario con dos entradas**, igual que el
 * alta de la Fase 7: las tres pantallas de más son el buscador de cliente que
 * hace falta cuando no se viene de una ficha. Las dos viven acá: con `customer`
 * el panel arranca en el stepper, sin él arranca en el buscador y sigue igual.
 *
 * EL PRECIO SE PROPONE, NO SE IMPONE (Ema, 2026-09-21). `getSuggestedCharge()`
 * devuelve la porción del mes y el recargo que corresponden por política, y el
 * panel los deja preseleccionados **con el motivo a la vista**. Nada queda
 * deshabilitado ni validado contra la sugerencia: sugerir un número sin decir
 * por qué es lo que hizo que la heurística de recargo de v1 pasara inadvertida
 * dos meses.
 *
 * LA FECHA QUE MANDA ES EL INICIO DEL PERÍODO, no `new Date()`. Es lo que evita
 * el falso positivo más caro del flow: pagar octubre el 28 de septiembre cae en
 * la franja de recargo del calendario, y con `new Date()` se le sugeriría mora a
 * alguien que está pagando por adelantado.
 */
export default function RenewMembershipPanel({
  customer,
  open,
  onOpenChange,
  onRenewed,
}: RenewMembershipPanelProps) {
  const { t } = useTranslations()
  const { isAdmin } = usePermissions()

  const [step, setStep] = useState(0)
  /**
   * Cliente elegido en el buscador. Sólo se usa en la entrada desde el home:
   * cuando el panel recibe `customer`, este estado nunca se toca.
   */
  const [pickedCustomer, setPickedCustomer] = useState<RenewableCustomer | null>(null)
  const [values, setValues] = useState<RenewalFormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null)

  const { data: membershipTypes = [] } = useQuery({
    queryKey: ['membership-types', 'v2'],
    queryFn: async () => {
      const { data } = await getMembershipTypes()

      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  // El cliente sobre el que trabaja el panel, venga de donde venga.
  const activeCustomer = customer ?? pickedCustomer
  // Sin cliente todavía elegido, el panel está en el buscador.
  const isSearching = !activeCustomer

  const { data: context, isPending: isContextPending } = useQuery({
    queryKey: ['renewal-context', 'v2', activeCustomer?.id],
    queryFn: () => fetchRenewalContext(activeCustomer!.id),
    enabled: Boolean(open && activeCustomer?.id),
    // El contexto define el prefill del período y la sugerencia de recargo: se
    // relee en cada apertura porque entre una y otra pudo registrarse una
    // asistencia, que es justo lo que distingue mora de ingreso nuevo.
    staleTime: 0,
  })

  // VIP sólo para admins, igual que el alta: el RPC de pago valida el rol, pero
  // una renovación VIP no pasa por el camino de pago porque no hay qué cobrar.
  const availableTypes = useMemo(
    () => membershipTypes.filter((type) => isAdmin || type.type !== MEMBERSHIP_TYPE_VIP),
    [membershipTypes, isAdmin]
  )

  const selectedType = useMemo(
    () => availableTypes.find((type) => type.type === values?.membership_type) ?? null,
    [availableTypes, values?.membership_type]
  )

  // La regla de descuento se consulta **una vez por apertura**, con el bruto del
  // plan vigente. El monto se recalcula después en memoria con
  // `computeDiscountAmount()`: una regla `percent` da otro número por cada plan
  // y modalidad, y refetchear por eso sería un round trip por click para
  // rehacer una multiplicación.
  const { data: discountRule = null, isFetched: isDiscountFetched } = useQuery({
    queryKey: ['applicable-discount', 'v2', activeCustomer?.id],
    queryFn: () =>
      fetchApplicableDiscount(
        activeCustomer!.id,
        getPeriodBaseAmount(
          membershipTypes.find((type) => type.type === context?.membership_type) ?? null,
          'full'
        )
      ),
    enabled: Boolean(open && activeCustomer?.id && context && membershipTypes.length > 0),
    staleTime: 5 * 60 * 1000,
  })

  // Se arma recién cuando llegaron las tres consultas: el `DatePicker` de v2 es
  // no controlado y sólo lee su `defaultValue` al montar, así que un prefill que
  // llegue después no se vería. Y las sugerencias tienen que estar preelegidas
  // desde el primer render — si aparecieran más tarde, cambiarían la pantalla
  // bajo el operador mientras la está leyendo.
  useEffect(() => {
    if (!open || !context || membershipTypes.length === 0 || !isDiscountFetched) return
    setValues(
      (previous) =>
        previous ?? buildInitialValues(context, membershipTypes, discountRule !== null)
    )
  }, [open, context, membershipTypes, isDiscountFetched, discountRule])

  // Reabrir el panel arranca de cero. Se limpia al cerrar y no al abrir —al
  // revés que el alta— porque acá el estado inicial depende de un fetch: dejarlo
  // con los valores del cliente anterior mostraría datos de otra persona durante
  // el instante en que el contexto nuevo está en vuelo.
  useEffect(() => {
    if (open) return
    setStep(0)
    setPickedCustomer(null)
    setValues(null)
    setErrors({})
    setLoading(false)
    setReceipt(null)
  }, [open])

  const period = values ? resolveRenewalPeriod(values) : { start_date: '', end_date: '' }

  // La sugerencia se calcula contra el INICIO DEL PERÍODO. Ver el docblock del
  // componente: con `new Date()`, un pago adelantado recibiría sugerencia de mora.
  const suggestion = useMemo(
    () =>
      getSuggestedCharge({
        membership: selectedType,
        // `parseAppTzDateString` y no `new Date(iso)`: el segundo parsea como
        // medianoche UTC, que en AR es el día anterior — y el día del mes es
        // justamente lo que decide si corresponde recargo.
        date: period.start_date ? parseAppTzDateString(period.start_date) : new Date(),
        hasAssistancesThisMonth: context?.has_assistances_this_month ?? false,
      }),
    [selectedType, period.start_date, context?.has_assistances_this_month]
  )

  /**
   * La regla de descuento con su monto recalculado contra el bruto vigente.
   *
   * `fetchApplicableDiscount` la trajo con el bruto del plan que el cliente
   * tenía al abrir el panel; si el operador cambió de plan o de modalidad, el
   * `suggested_amount` de una regla `percent` ya no corresponde.
   */
  const applicableDiscount = useMemo(() => {
    if (!discountRule) return null

    const base = getPeriodBaseAmount(selectedType, values?.period_mode ?? 'full')

    return {
      ...discountRule,
      suggested_amount: computeDiscountAmount(discountRule.rule, base),
    }
  }, [discountRule, selectedType, values?.period_mode])

  const amounts = useMemo(
    () =>
      values
        ? resolveRenewalAmounts({ values, membership: selectedType, suggestion, applicableDiscount })
        : { base: 0, surcharge: 0, discount: 0, discount_rule_id: null, total: 0 },
    [values, selectedType, suggestion, applicableDiscount]
  )

  /**
   * ¿Este submit va a pisar un pago que ya tiene comprobante emitido?
   *
   * El RPC hace UPDATE del pago vigente —conservándole el `receipt_number`—
   * cuando el `start_date` que llega cae el mismo día calendario AR que el
   * inicio del período vigente. Si además cambió el tipo de plan, esa fila
   * queda con otro monto y otros conceptos bajo el mismo número: un comprobante
   * ya entregado deja de coincidir con lo que lo respalda.
   *
   * Se avisa y se deja continuar (decisión de Ema, 2026-09-22). Anular y
   * reemitir sería lo correcto contablemente, pero requiere modelar el pago
   * anulado en la DB — migración y ADR propios.
   */
  const warnsTypeChange = useMemo(() => {
    if (!values || !context?.membership_type || !context.period_start) return false
    if (values.membership_type === context.membership_type) return false

    return isSameAppTzDay(period.start_date, context.period_start)
  }, [values, context, period.start_date])

  /**
   * El período que el cliente ya tiene pago, en días calendario AR.
   *
   * Se muestra en el paso 1 porque sin él el operador elige fechas a ciegas:
   * ninguna otra pantalla dice cuándo arrancó el período vigente —el Perfil
   * muestra días restantes, no la fecha— y ese día es justamente el que decide
   * si este cobro entra como pago nuevo o pisa el anterior.
   */
  /**
   * Clave i18n de la modalidad elegida. La resuelven el resumen del paso 2 y el
   * comprobante, que tienen que decir lo mismo — en el Figma se contradicen
   * ("Mes completo" en uno, "Medio mes" en el otro para la misma operación).
   */
  const periodModeLabel = useMemo(
    () =>
      getPeriodModeOptions(selectedType).find((option) => option.mode === values?.period_mode)
        ?.labelKey ?? null,
    [selectedType, values?.period_mode]
  )

  const currentPeriod = useMemo(() => {
    if (!context?.period_start || !context.expiration_date) return null

    return {
      start: toAppTzIsoDate(context.period_start),
      end: toAppTzIsoDate(context.expiration_date),
    }
  }, [context?.period_start, context?.expiration_date])

  const patch = useCallback((next: Partial<RenewalFormValues>) => {
    setValues((previous) => (previous ? { ...previous, ...next } : previous))
  }, [])

  /**
   * FormData para `upsertCustomerMembership`, que es el mismo cliente que usa el
   * form de v1. Reusarlo evita duplicar el mapeo a los 16 parámetros del RPC y
   * la traducción de sus códigos de error.
   *
   * **`membership_amount` es bruto + recargo, SIN el descuento.**
   * `upsertCustomerMembership` deriva `gross = membership_amount − surcharge` y
   * después `net = gross + surcharge − descuento`; mandarle el total ya neteado
   * restaría el descuento dos veces y la fila quedaría cobrando de menos. El
   * contrato es el mismo que usa el form de v1 — ver el comentario de
   * `membership_amount` en [src/customer/api/client.ts].
   */
  const buildFormData = useCallback(() => {
    if (!values) return new FormData()

    const data = new FormData()
    const { start_date: startDate, end_date: endDate } = resolveRenewalPeriod(values)
    const isVip = values.membership_type === MEMBERSHIP_TYPE_VIP

    data.set('membership_type', values.membership_type)
    data.set('start_date', startDate)
    data.set('end_date', endDate)

    if (!isVip) {
      data.set('payment', 'on')
      data.set('payment_type', values.payment_type)
      data.set('membership_amount', String(amounts.base + amounts.surcharge))
      data.set('surcharge_amount', String(amounts.surcharge))
      data.set('discount_amount', String(amounts.discount))
      if (amounts.discount_rule_id) data.set('discount_rule_id', amounts.discount_rule_id)
      if (values.discount_note.trim()) data.set('discount_note', values.discount_note.trim())
      if (values.surcharge_note.trim()) data.set('surcharge_note', values.surcharge_note.trim())
    }

    return data
  }, [values, amounts])

  const validate = useCallback(
    (formData: FormData) => {
      const { errors: fieldErrors } = basicMembershipValidation(formData)
      const isVip = values?.membership_type === MEMBERSHIP_TYPE_VIP

      // `basicMembershipValidation` ya cubre tipo, forma de pago, rango de
      // fechas y la nota obligatoria del descuento ad-hoc. Lo único que no puede
      // ver es el total, porque lo arma este panel a partir de las tres partes.
      //
      // `membership_payments` tiene `CHECK (amount > 0)`: un total en 0 lo
      // rechaza la base con un 23514 que la UI no sabe explicar.
      if (!isVip && amounts.total <= 0) {
        fieldErrors.discount_amount = t('v2.membership.renew.errors.totalNotPositive')
      }

      return fieldErrors
    },
    [amounts.total, values?.membership_type, t]
  )

  // Se valida al pasar al resumen, no al confirmar: los campos viven en el paso
  // 1, y descubrir un error recién al apretar "Confirmar pago" obliga a volver
  // atrás para entender qué falta.
  const handleNext = useCallback(() => {
    setErrors({})
    const fieldErrors = validate(buildFormData())

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)

      return
    }

    setStep(1)
  }, [buildFormData, validate])

  const handleSubmit = useCallback(async () => {
    if (!activeCustomer || !values) return
    setErrors({})

    const formData = buildFormData()
    const fieldErrors = validate(formData)

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      setStep(0)

      return
    }

    setLoading(true)
    const response = await upsertCustomerMembership({ customerId: activeCustomer.id, formData })

    setLoading(false)

    if (!response.success) {
      const mapped = handleDatabaseError(response, undefined, t)

      if (mapped) {
        setErrors(mapped)
        setStep(0)
      }

      return
    }

    // El comprobante se arma con lo que ya tenemos en pantalla más el número
    // que devuelve el RPC. Nada de releer `membership_payments`: es admin-only
    // por RLS y el comprobante tiene que salir igual para un operador sin
    // permisos de finanzas.
    setReceipt({
      customerName: `${activeCustomer.first_name} ${activeCustomer.last_name}`.trim(),
      membershipType: values.membership_type as MembershipTypes,
      periodModeLabel: periodModeLabel ? t(periodModeLabel) : null,
      base: amounts.base,
      discount: amounts.discount,
      surcharge: amounts.surcharge,
      total: amounts.total,
      paymentMethod: values.payment_type,
      // Día de emisión en la TZ del negocio. Para un cobro recién registrado es
      // su `created_at`; ver el docblock de `PaymentReceipt`.
      issuedOn: getTodayIsoDateInAppTz(),
      receiptNumber: (response.data?.receipt_number as string | undefined) ?? null,
    })
    onRenewed?.()
  }, [activeCustomer, values, buildFormData, validate, amounts, periodModeLabel, onRenewed, t])

  const name = activeCustomer
    ? `${activeCustomer.first_name} ${activeCustomer.last_name}`.trim()
    : ''
  const isLastStep = step === 1
  const isReady = Boolean(values && !isContextPending)
  /** Entrando desde el home, el paso 1 puede volver a la busqueda. */
  const canGoBackToSearch = !customer && !!pickedCustomer

  const handleBack = useCallback(() => {
    if (isLastStep) {
      setStep(0)

      return
    }
    // Volver a la busqueda descarta el formulario a proposito: el prefill, la
    // sugerencia y el periodo se calcularon para el cliente anterior, y
    // arrastrarlos al siguiente cobraria con los numeros de otra persona.
    if (canGoBackToSearch) {
      setPickedCustomer(null)
      setValues(null)
      setErrors({})

      return
    }
    onOpenChange(false)
  }, [isLastStep, canGoBackToSearch, onOpenChange])

  return (
    <>
      <SidePanel
        // El buscador no tiene footer: la accion es elegir una fila, y un
        // "Siguiente" deshabilitado al pie solo agrega un boton muerto.
        footer={
          isSearching ? undefined : (
            <div className='flex items-center justify-between gap-3'>
              <Button
                disabled={loading}
                type='button'
                variant='outlined'
                onClick={handleBack}
              >
                {isLastStep || canGoBackToSearch ? t('common.back') : t('common.cancel')}
              </Button>
              <Button
                disabled={loading || !isReady}
                type='button'
                onClick={isLastStep ? handleSubmit : handleNext}
              >
                {loading && <Loader2 aria-hidden className='size-4 animate-spin' />}
                {loading
                  ? t('v2.membership.renew.submitting')
                  : isLastStep
                    ? t('v2.membership.renew.submit')
                    : t('common.next')}
              </Button>
            </div>
          )
        }
        open={open}
        pinned={
          isSearching ? undefined : (
            <div className='flex flex-col gap-4'>
              {activeCustomer && <CustomerCard context={context} name={name} />}
              <Stepper
                current={step}
                steps={[t('v2.membership.renew.stepNew'), t('v2.membership.renew.stepConfirm')]}
              />
            </div>
          )
        }
        title={t('v2.membership.renew.title')}
        onOpenChange={onOpenChange}
      >
        {isSearching ? (
          <RenewCustomerSearchStep onSelect={setPickedCustomer} />
        ) : !isReady || !values ? (
          <StepSkeleton />
        ) : step === 0 ? (
          <RenewMembershipStep
            applicableDiscount={applicableDiscount}
            currentPeriod={currentPeriod}
            errors={errors}
            membershipTypes={availableTypes}
            selectedType={selectedType}
            suggestion={suggestion}
            values={values}
            warnsTypeChange={warnsTypeChange}
            onChange={patch}
          />
        ) : (
          <RenewSummaryStep
            amounts={amounts}
            period={period}
            selectedType={selectedType}
            values={values}
            warnsTypeChange={warnsTypeChange}
          />
        )}
      </SidePanel>

      {/* El éxito es un `Modal Dialog` centrado sobre el panel, no un toast:
          el Figma lo dibuja con el resumen de la operación porque es desde ahí
          que se comparte el comprobante. Cerrarlo cierra también el panel — el
          flow del diseño vuelve a la pantalla de origen, ya actualizada. */}
      <RenewSuccessDialog receipt={receipt} onClose={() => onOpenChange(false)} />
    </>
  )
}

// Sub-componentes

function CustomerCard({
  name,
  context,
}: {
  name: string
  context: { membership_type: MembershipTypes | null; expiration_date: string | null } | undefined
}) {
  const { t } = useTranslations()
  const status = resolveStatus(context)

  return (
    <div className='flex items-center gap-3'>
      <DataTableAvatar initials={getInitials(name)} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-sm font-semibold'>{name}</span>
        <span className='text-muted-foreground truncate text-xs'>
          {context?.membership_type
            ? t('v2.membership.renew.currentPlan', {
                plan: t(MembershipTranslationShort[context.membership_type]),
              })
            : t('v2.customers.status.none')}
        </span>
      </div>
      <StatusBadge tone={CUSTOMER_STATUS_TONE[status]}>{t(CUSTOMER_STATUS_LABEL[status])}</StatusBadge>
    </div>
  )
}

function StepSkeleton() {
  return (
    <div aria-busy className='flex flex-col gap-4'>
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </div>
  )
}

// Helpers

/**
 * Estado inicial del formulario, **con las sugerencias ya aplicadas**.
 *
 * "Sugerir" acá significa preseleccionar, no sólo ofrecer: la regla de producto
 * (Ema, 2026-09-21) es *"sugerir el monto pero no ser una regla 100%
 * obligatoria"*. Los tres campos que la política puede proponer —modalidad de
 * cobro, recargo y descuento— arrancan en la opción sugerida con su motivo a la
 * vista, y el operador puede bajarlos a "sin" o a un monto libre sin que nada se
 * lo impida.
 */
function buildInitialValues(
  context: RenewalContext,
  membershipTypes: MembershipType[],
  hasDiscountRule: boolean
): RenewalFormValues {
  const period = buildRenewalPeriod(context.expiration_date)
  const currentType = membershipTypes.find((type) => type.type === context.membership_type) ?? null

  // Misma fecha que usa el panel para la sugerencia en vivo: el inicio del
  // período, no `new Date()`. Ver el docblock del componente.
  const suggestion = getSuggestedCharge({
    membership: currentType,
    date: parseAppTzDateString(period.start_date),
    hasAssistancesThisMonth: context.has_assistances_this_month,
  })

  return {
    // Preseleccionado con el plan vigente. El Figma muestra "Sin membresía" como
    // default al renovar a alguien con 5 días activos (defecto #5 de las
    // capturas del 2026-09-22), que es exactamente lo contrario de lo que el
    // operador necesita.
    membership_type: context.membership_type ?? '',
    period_mode: suggestion.periodMode,
    start_date: period.start_date,
    end_date: period.end_date,
    discount_choice: hasDiscountRule ? AMOUNT_CHOICE_SUGGESTED : AMOUNT_CHOICE_NONE,
    discount_custom_amount: 0,
    discount_note: '',
    surcharge_choice: suggestion.suggestsSurcharge ? AMOUNT_CHOICE_SUGGESTED : AMOUNT_CHOICE_NONE,
    surcharge_custom_amount: 0,
    // El motivo viaja a `membership_payments.surcharge_note` para que la fila
    // diga por qué se cobró, no sólo cuánto.
    surcharge_note: suggestion.reason ?? '',
    payment_type: (context.last_payment_method as PaymentType | null) ?? '',
  }
}

/** Mismo criterio de estado que el listado y el Perfil, sobre el contexto ligero. */
function resolveStatus(
  context: { membership_type: MembershipTypes | null; expiration_date: string | null } | undefined
): 'active' | 'expired' | 'none' {
  if (!context?.membership_type) return 'none'
  if (!context.expiration_date) return 'active'

  return isExpiredInAppTz(context.expiration_date) ? 'expired' : 'active'
}

/** Día calendario AR de un timestamptz, como "YYYY-MM-DD". */
function toAppTzIsoDate(timestamp: string): string {
  const parts = getAppTzDateParts(new Date(timestamp))

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

/**
 * ¿Dos fechas caen el mismo día calendario AR?
 *
 * Es el mismo criterio con el que el RPC decide si pisa el pago vigente
 * (`v_same_period`, comparación `AT TIME ZONE` a `::date`). `startIso` es un
 * "YYYY-MM-DD" del datepicker y `timestamp` un timestamptz de la DB, así que el
 * segundo hay que bajarlo a día AR antes de comparar.
 */
function isSameAppTzDay(startIso: string, timestamp: string): boolean {
  if (!startIso) return false

  return toAppTzIsoDate(timestamp) === startIso
}
