'use client'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { UncontrolledDatePicker } from '@/components/uncontrolled-date-picker'
import { CustomerComplete } from '@/customer/types'
import { CheckedState } from '@radix-ui/react-checkbox'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { upsertCustomerMembership } from '@/customer/api/client'
import { toast } from 'sonner'
import { DatabaseResult } from '@/types/database-errors'
import { handleDatabaseError } from './errors'
import { CUSTOMER } from '@/consts/routes'
import { InfoIcon } from 'lucide-react'
import { TooltipTrigger, Tooltip, TooltipContent } from '@/components/ui/tooltip'
import AssistanceToday from '@/assistance/assistance-alert-today'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n/context'
import { getAppTzDateParts, getTodayIsoDateInAppTz, isSameDayInAppTz } from '@/lib/timezone'
import { useQuery } from '@tanstack/react-query'
import { getMembershipTypes } from '@/membership/api/client'
import { useInvalidateStatsAfterMembership } from '@/customer/hooks/use-customer-stats'
import { HybridSelect } from '@/components/ui/select-hybrid'
import {
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
  MembershipTranslation,
  PaymentTypeArray,
  PaymentsTranslation,
} from '@/membership/consts'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from 'usehooks-ts'
import { InputCurrency } from '@/components/ui/input-currency'
import MoneyIcon from '@/components/icons/money'
import { usePermissions } from '@/auth/hooks/use-permissions'

// Los tres precios de `types_memberships` son conceptos de cobro mutuamente
// excluyentes: no existe "medio mes con recargo".
type ChargeMode = 'full' | 'half' | 'surcharge'

interface Props {
  pathBack?: string
  customer?: CustomerComplete
  multiStepForm?: boolean
  errors?: Record<string, string>
  defaultValues?: FormData
  callbackSubmitMultiStep?: (formData: FormData) => Promise<void>
}

export default function MembershipForm({
  customer,
  pathBack,
  multiStepForm,
  errors: errorProps,
  callbackSubmitMultiStep,
}: Props) {
  const router = useRouter()
  const { t } = useTranslations()
  const { isAdmin } = usePermissions()
  const { data: memberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ['membership-types'],
    queryFn: () => getMembershipTypes(),
    select: (response) => response.data,
  })
  const invalidateStats = useInvalidateStatsAfterMembership()
  const isLargerThan430 = useMediaQuery('(min-width: 430px)', {
    defaultValue: false,
    initializeWithValue: false,
  })
  const [loading, setLoading] = useState(false)
  const [innerErrors, setInnerErrors] = useState<DatabaseResult['data']>()
  const [selectedType, setSelectedType] = useState<string | undefined>(
    customer?.customer_membership?.membership_type
  )
  const membershipSelected = useMemo(
    () => memberships.find((m) => m.type === selectedType),
    [memberships, selectedType]
  )

  const membershipOptions = memberships
    .filter(
      (membership) =>
        isAdmin ||
        membership.type !== MEMBERSHIP_TYPE_VIP ||
        membership.type === customer?.customer_membership?.membership_type
    )
    .map((membership) => ({
      value: membership.type,
      label: t(MembershipTranslation[membership.type as keyof typeof MembershipTranslation]),
    }))

  const paymentTypeOptions = PaymentTypeArray.map((paymentType) => ({
    value: paymentType,
    label: t(PaymentsTranslation[paymentType]),
  }))

  const handleMembershipChange = (value: string) => {
    setSelectedType(value)
  }

  const isVIPMembership = membershipSelected?.type === MEMBERSHIP_TYPE_VIP
  const isDailyMembership = membershipSelected?.type === MEMBERSHIP_TYPE_DAILY

  const currentMembershipType = customer?.customer_membership?.membership_type
  const currentMembership = useMemo(
    () => memberships.find((m) => m.type === currentMembershipType),
    [memberships, currentMembershipType]
  )

  const isCurrentActive = useMemo(() => {
    const expiration = customer?.customer_membership?.expiration_date

    if (!expiration) return false
    const nowParts = getAppTzDateParts()
    const expParts = getAppTzDateParts(new Date(expiration))
    const nowKey = nowParts.year * 10000 + nowParts.month * 100 + nowParts.day
    const expKey = expParts.year * 10000 + expParts.month * 100 + expParts.day

    return expKey >= nowKey
  }, [customer?.customer_membership?.expiration_date])

  const isTypeChangeIntraActive =
    isCurrentActive &&
    !!currentMembershipType &&
    !!selectedType &&
    selectedType !== currentMembershipType &&
    currentMembershipType !== MEMBERSHIP_TYPE_VIP &&
    !isVIPMembership &&
    !isDailyMembership

  const suggestedAdjustment = useMemo(() => {
    if (!isTypeChangeIntraActive) return 0
    const paidAmount = currentMembership?.amount ?? 0
    const newAmount = membershipSelected?.amount ?? 0

    return paidAmount - newAmount
  }, [isTypeChangeIntraActive, currentMembership?.amount, membershipSelected?.amount])

  const adjustmentAction: 'refund' | 'charge_diff' | null =
    !isTypeChangeIntraActive || suggestedAdjustment === 0
      ? null
      : suggestedAdjustment > 0
        ? 'refund'
        : 'charge_diff'

  const todayIsoDate = useMemo(() => getTodayIsoDateInAppTz(), [])
  const [registerAdjustment, setRegisterAdjustment] = useState<CheckedState>(false)
  const [adjustmentValue, setAdjustmentValue] = useState<string>(() =>
    Math.abs(suggestedAdjustment).toString()
  )

  // Sincronizar el valor editable cuando cambia el sugerido (el operador
  // cambia el select de tipo y arranca un cálculo nuevo).
  useEffect(() => {
    setAdjustmentValue(Math.abs(suggestedAdjustment).toString())
  }, [suggestedAdjustment])

  // Verificar si el cliente tiene asistencias en el mes actual
  // Usar dependencias primitivas más estables
  const hasAssistancesThisMonth = useMemo(() => {
    if (!customer?.assistance || customer.assistance.length === 0) return false

    const { year: currentYear, month: currentMonth } = getAppTzDateParts()

    return customer.assistance.some((assistance) => {
      const { year, month } = getAppTzDateParts(new Date(assistance.assistance_date))

      return year === currentYear && month === currentMonth
    })
  }, [customer?.id, customer?.assistance?.length])

  // El concepto de cobro lo elige el operador; la fecha sugiere, no decide.
  // Un cliente puede querer una quincena a principio de mes, o deber un mes
  // completo con recargo pasado el día 15.
  const [chargeMode, setChargeMode] = useState<ChargeMode>('full')

  // Cada tipo tiene su propio set de precios: el concepto elegido para el
  // anterior no aplica al nuevo.
  useEffect(() => {
    setChargeMode('full')
  }, [selectedType])

  const chargeModeOptions = useMemo(() => {
    if (!membershipSelected || isVIPMembership || isDailyMembership) return []

    const options: { mode: ChargeMode; label: string; amount: number }[] = []

    if (membershipSelected.amount !== null) {
      options.push({
        mode: 'full',
        label: t('membership.chargeModeFull'),
        amount: membershipSelected.amount,
      })
    }

    if (membershipSelected.middle_amount !== null) {
      options.push({
        mode: 'half',
        label: t('membership.chargeModeHalf'),
        amount: membershipSelected.middle_amount,
      })
    }

    if (membershipSelected.amount_surcharge !== null) {
      options.push({
        mode: 'surcharge',
        label: t('membership.chargeModeSurcharge'),
        amount: membershipSelected.amount_surcharge,
      })
    }

    return options
  }, [membershipSelected, isVIPMembership, isDailyMembership, t])

  // Fuente única del monto: el input visible y el hidden leen de acá, así no
  // pueden divergir.
  const chargeAmount = useMemo(() => {
    if (!membershipSelected) return 0

    const {
      amount,
      middle_amount: middleAmount,
      amount_surcharge: amountSurcharge,
    } = membershipSelected

    if (chargeMode === 'half' && middleAmount !== null) return middleAmount
    if (chargeMode === 'surcharge' && amountSurcharge !== null) return amountSurcharge

    return amount ?? 0
  }, [membershipSelected, chargeMode])

  const displayAmount = chargeAmount ? chargeAmount.toString() : ''

  // Señal para el operador, sin forzar la selección: el cliente ya vino este
  // mes y venció el plazo de pago.
  const suggestsSurcharge = useMemo(() => {
    if (isVIPMembership || isDailyMembership) return false
    if (!membershipSelected || membershipSelected.amount_surcharge === null) return false
    const { day: dayOfMonth } = getAppTzDateParts()

    return hasAssistancesThisMonth && dayOfMonth > 10
  }, [hasAssistancesThisMonth, isVIPMembership, isDailyMembership, membershipSelected])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInnerErrors(undefined)
    // Handle form submission logic here
    const formData = new FormData(event.currentTarget)

    if (multiStepForm) {
      callbackSubmitMultiStep?.(formData)

      return
    }

    setLoading(true)
    const response = await upsertCustomerMembership({
      customerId: customer?.id || '',
      formData,
    })

    setLoading(false)

    if (!response.success) {
      const errors = handleDatabaseError(response, router, t)

      if (errors) {
        setInnerErrors(errors)
      }

      return
    } else {
      toast.success(response.message)
      // Invalidar el caché para reflejar los cambios inmediatamente
      await invalidateStats.mutateAsync()
      router.push(pathBack || `${CUSTOMER}/${customer?.id}`)
    }
  }

  // Default del checkbox "Pagar cuota":
  // - Daily → siempre tildado y bloqueado (un pase diario es por definición un cobro).
  // - Membresía vigente → destildado (el operador probablemente entra a
  //   consultar o corregir un dato, no a re-cobrar).
  // - Sin membresía o expirada → tildado (renovación por default).
  const [payment, setPayment] = useState<CheckedState>(!isCurrentActive)

  // Al cambiar de tipo, resincronizar el checkbox: daily fuerza true; el resto
  // vuelve al default según vigencia.
  useEffect(() => {
    if (isDailyMembership) {
      setPayment(true)
    } else {
      setPayment(!isCurrentActive)
    }
  }, [isDailyMembership, isCurrentActive])

  // El select de método de pago también debe habilitarse cuando el operador
  // registra la diferencia de un upgrade (charge_diff), aunque no marque
  // "Pagar cuota": esa diferencia se cobra con algún método y debe quedar
  // registrada — el RPC exige payment_method en ese INSERT.
  const requiresPaymentType =
    payment === true || (registerAdjustment === true && adjustmentAction === 'charge_diff')

  const handleChangeCheckBox = (checked: CheckedState) => {
    setPayment(checked)
  }

  const errors = useMemo(() => {
    if (errorProps) {
      return errorProps
    }

    return innerErrors || {}
  }, [errorProps, innerErrors])

  const now = new Date()
  const hasAssistanceToday = customer?.assistance.some((assistance) =>
    isSameDayInAppTz(assistance.assistance_date, now)
  )

  return (
    <>
      {!multiStepForm && (
        <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
          <div className='flex gap-4 items-center'>
            <Button className='size-6 rounded-full' variant='ghost' onClick={() => router.back()}>
              <ArrowLeftIcon className='size-6' />
            </Button>
            <h5 className='font-bold text-sm font-headline'>{t('membership.management')}</h5>
          </div>
        </header>
      )}
      <form id='form-membership' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12'>
          <h3 className='text-sm sm:text-md mb-4'>{t('membership.selectType')}</h3>
          <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
            <div className='grid gap-y-2 col-span-2'>
              <Label className='font-light' htmlFor='assistance'>
                {t('membership.membershipTypeShort')}
              </Label>
              {isLoadingMemberships ? (
                <Skeleton className='h-[54px] w-full' />
              ) : (
                <HybridSelect
                  className='font-light'
                  defaultValue={customer?.customer_membership?.membership_type || ''}
                  helperText={errors?.membership_type}
                  isDisabled={loading}
                  isInvalid={!!errors?.membership_type}
                  name='membership_type'
                  options={membershipOptions}
                  placeholder={
                    isLargerThan430
                      ? t('membership.selectMembershipType')
                      : t('membership.membershipTypeShort')
                  }
                  onValueChange={handleMembershipChange}
                />
              )}
            </div>

            {!isVIPMembership && (
              <div className='grid gap-y-2 col-span-2'>
                <div className='flex items-center gap-3'>
                  <Checkbox
                    checked={payment}
                    className='size-6'
                    disabled={loading || isDailyMembership}
                    id='payment'
                    // Un checkbox disabled no se serializa en el FormData; para
                    // Daily suplimos el name con un hidden abajo, así que
                    // acá quitamos el name para que no colisionen.
                    name={isDailyMembership ? undefined : 'payment'}
                    onCheckedChange={handleChangeCheckBox}
                  />
                  {isDailyMembership && <input name='payment' type='hidden' value='on' />}
                  <Label
                    className={cn('text-xs text-white', isDailyMembership && 'text-white/70')}
                    htmlFor='payment'
                  >
                    {t('membership.payMembership')}
                  </Label>
                  {isDailyMembership && (
                    <Tooltip data-side='left'>
                      <TooltipTrigger asChild>
                        <InfoIcon className='size-4 text-white/60' />
                      </TooltipTrigger>
                      <TooltipContent side='top'>
                        <p className='w-[200px]'>{t('membership.dailyAlwaysPaidTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}
            {chargeModeOptions.length > 1 && (
              <div className='grid gap-y-2 col-span-2' role='radiogroup'>
                <Label className='font-light'>{t('membership.chargeMode')}</Label>
                {chargeModeOptions.map((option) => (
                  <label
                    key={option.mode}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer',
                      chargeMode === option.mode
                        ? 'border-primary bg-primary/10'
                        : 'border-input-border hover:bg-input-hover-background'
                    )}
                    htmlFor={`charge_mode_${option.mode}`}
                  >
                    <span className='flex items-center gap-3'>
                      <input
                        checked={chargeMode === option.mode}
                        className='size-4 accent-primary'
                        disabled={loading}
                        id={`charge_mode_${option.mode}`}
                        name='charge_mode'
                        type='radio'
                        value={option.mode}
                        onChange={() => setChargeMode(option.mode)}
                      />
                      <span className='text-xs text-white'>{option.label}</span>
                    </span>
                    <span className='text-xs font-semibold text-white'>
                      ${option.amount.toLocaleString('es-AR')}
                    </span>
                  </label>
                ))}
                {suggestsSurcharge && chargeMode !== 'surcharge' && (
                  <small className='text-xs text-white/70 flex items-start gap-2'>
                    <InfoIcon className='size-4 shrink-0 mt-0.5' />
                    {t('membership.surchargeHint')}
                  </small>
                )}
              </div>
            )}
            {isTypeChangeIntraActive && adjustmentAction && (
              <div className='col-span-2 grid gap-y-3 border border-destructive/60 rounded-md p-3 bg-destructive/10'>
                <div className='flex items-start gap-2'>
                  <InfoIcon className='size-5 text-destructive shrink-0 mt-0.5' />
                  <div className='grid gap-y-1'>
                    <span className='text-sm font-semibold text-white'>
                      {adjustmentAction === 'refund'
                        ? 'Reintegro sugerido'
                        : 'Cobro adicional sugerido'}
                    </span>
                    <span className='text-xs text-white/80'>
                      El cliente pasa de{' '}
                      {t(
                        MembershipTranslation[
                          currentMembershipType as keyof typeof MembershipTranslation
                        ]
                      )}{' '}
                      a{' '}
                      {t(MembershipTranslation[selectedType as keyof typeof MembershipTranslation])}
                      . Diferencia calculada:{' '}
                      <strong>${Math.abs(suggestedAdjustment).toLocaleString('es-AR')}</strong>.
                    </span>
                  </div>
                </div>
                <InputCurrency
                  className='w-full font-light'
                  componentRight={<MoneyIcon className='text-[#8F878A]' height={24} width={24} />}
                  helperText={
                    adjustmentAction === 'refund'
                      ? 'Se registrará como gasto con categoría "Reintegros"'
                      : 'Se registrará como nuevo pago con nota de diferencia'
                  }
                  id='adjustment_amount_display'
                  isDisabled={loading || !registerAdjustment}
                  minValue={0}
                  value={adjustmentValue}
                  onValueChange={(val) => setAdjustmentValue(val ?? '')}
                />
                <input name='adjustment_amount' type='hidden' value={adjustmentValue} />
                <div className='flex items-center gap-3'>
                  <Checkbox
                    checked={registerAdjustment}
                    className='size-6'
                    disabled={loading}
                    id='register_adjustment'
                    onCheckedChange={setRegisterAdjustment}
                  />
                  <Label
                    className='text-xs text-white cursor-pointer'
                    htmlFor='register_adjustment'
                  >
                    {adjustmentAction === 'refund'
                      ? 'Registrar reintegro en gastos'
                      : 'Registrar cobro adicional como nuevo pago'}
                  </Label>
                </div>
                {registerAdjustment && (
                  <input name='type_change_action' type='hidden' value={adjustmentAction} />
                )}
              </div>
            )}
            {!isVIPMembership && (
              <div className='grid gap-y-2 col-span-2'>
                <InputCurrency
                  key={membershipSelected?.type || 'no-membership'}
                  isDisabled
                  className='w-full font-light'
                  componentRight={<MoneyIcon className='text-[#8F878A]' height={24} width={24} />}
                  id={'membership_amount_display'}
                  minValue={0}
                  value={displayAmount}
                />
                {/* Hidden input to send the amount value in FormData */}
                <input name='membership_amount' type='hidden' value={chargeAmount} />
              </div>
            )}
            {!isVIPMembership && (
              <div className='grid gap-y-2 col-span-2'>
                <Label className='font-light' htmlFor='payment_type'>
                  {t('payments.title')}
                </Label>
                <HybridSelect
                  className='font-light'
                  defaultValue={customer?.last_payment_method || ''}
                  helperText={errors?.payment_type}
                  isDisabled={!requiresPaymentType || loading}
                  isInvalid={!!errors?.payment_type}
                  name='payment_type'
                  options={paymentTypeOptions}
                  placeholder={
                    isLargerThan430
                      ? t('payments.selectPaymentType')
                      : t('payments.paymentTypeShort')
                  }
                />
              </div>
            )}
            {!isVIPMembership && !isDailyMembership && (
              <>
                <UncontrolledDatePicker
                  className='w-full col-span-2 sm:col-span-1'
                  dateFormat='short'
                  defaultValue={customer?.customer_membership?.last_payment_date || ''}
                  helperText={errors?.start_date}
                  isDisabled={payment !== true || loading}
                  isInvalid={!!errors?.start_date}
                  label={t('membership.startDateLabel')}
                  name='start_date'
                />
                <UncontrolledDatePicker
                  className='w-full col-span-2 sm:col-span-1'
                  dateFormat='short'
                  defaultValue={customer?.customer_membership?.expiration_date || ''}
                  helperText={errors?.end_date}
                  isDisabled={payment !== true || loading}
                  isInvalid={!!errors?.end_date}
                  label={t('membership.endDateLabel')}
                  name='end_date'
                />
              </>
            )}
            {isDailyMembership && (
              <>
                <input name='start_date' type='hidden' value={todayIsoDate} />
                <input name='end_date' type='hidden' value={todayIsoDate} />
              </>
            )}
            {(() => {
              const requiresPayment = !isVIPMembership
              const assistanceDisabled =
                hasAssistanceToday || loading || (requiresPayment && !payment)

              return (
                <>
                  <div className='flex items-center gap-3 col-span-2'>
                    <Checkbox
                      className='size-6'
                      disabled={assistanceDisabled}
                      id='first_assistance'
                      name='first_assistance'
                    />
                    <span className='flex items-center gap-2'>
                      <Label
                        className={cn('text-xs text-white', assistanceDisabled && 'text-white/30')}
                        htmlFor='first_assistance'
                      >
                        {t('membership.registerFirstAssistance')}
                      </Label>
                      {requiresPayment && !payment && (
                        <Tooltip data-side='left'>
                          <TooltipTrigger asChild>
                            <InfoIcon className='size-4 text-destructive' />
                          </TooltipTrigger>
                          <TooltipContent side='top'>
                            <p className='w-[180px]'>{t('membership.paymentRequiredTooltip')}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </div>
                  {errors?.first_assistance && (
                    <small className='text-xs text-destructive flex items-center gap-2 col-span-2'>
                      <InfoIcon className='size-6 text-destructive' />
                      {errors.first_assistance}
                    </small>
                  )}
                </>
              )
            })()}
          </div>
          <AssistanceToday assistance={customer?.assistance} />
        </section>
      </form>
      {!multiStepForm && (
        <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
          <Button className='w-full h-14' form='form-membership' loading={loading} type='submit'>
            {t('membership.confirm')}
          </Button>
        </footer>
      )}
    </>
  )
}
