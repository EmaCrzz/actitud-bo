'use client'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { UncontrolledDatePicker } from '@/components/uncontrolled-date-picker'
import { CustomerComplete } from '@/customer/types'
import { CheckedState } from '@radix-ui/react-checkbox'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { upsertCustomerMembership } from '@/customer/api/client'
import { toast } from 'sonner'
import { DatabaseResult } from '@/types/database-errors'
import { handleDatabaseError } from './errors'
import { CUSTOMER } from '@/consts/routes'
import { InfoIcon, SquareMinusIcon } from 'lucide-react'
import { TooltipTrigger, Tooltip, TooltipContent } from '@/components/ui/tooltip'
import AssistanceToday from '@/assistance/assistance-alert-today'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n/context'
import type { MembershipType } from '@/membership/types'
import { useMemberships } from '@/membership/membership-context'
import { useInvalidateCustomerStats } from '@/customer/hooks/use-customer-stats'
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
  const today = new Date()
  const router = useRouter()
  const { t } = useTranslations()
  const { memberships, isLoading: isLoadingMemberships } = useMemberships()
  const invalidateStats = useInvalidateCustomerStats()
  const isLargerThan430 = useMediaQuery('(min-width: 430px)')
  const [loading, setLoading] = useState(false)
  const [innerErrors, setInnerErrors] = useState<DatabaseResult['data']>()
  const [membershipSelected, setMembershipSelected] = useState<MembershipType | undefined>(() => {
    if (!customer?.customer_membership?.membership_type) return undefined

    return memberships.find((m) => m.type === customer.customer_membership?.membership_type)
  })

  const membershipOptions = memberships.map((membership) => ({
    value: membership.type,
    label: t(MembershipTranslation[membership.type as keyof typeof MembershipTranslation]),
  }))

  const paymentTypeOptions = PaymentTypeArray.map((paymentType) => ({
    value: paymentType,
    label: t(PaymentsTranslation[paymentType]),
  }))

  const handleMembershipChange = (value: string) => {
    const selected = memberships.find((m) => m.type === value)

    setMembershipSelected(selected)
  }

  const isVIPMembership = membershipSelected?.type === MEMBERSHIP_TYPE_VIP

  // Verificar si el cliente tiene asistencias en el mes actual
  const hasAssistancesThisMonth = useMemo(() => {
    if (!customer?.assistance || customer.assistance.length === 0) return false

    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    return customer.assistance.some((assistance) => {
      const assistanceDate = new Date(assistance.assistance_date)

      return (
        assistanceDate.getMonth() === currentMonth && assistanceDate.getFullYear() === currentYear
      )
    })
  }, [customer?.assistance])

  // Determinar si se aplica el precio medio (después de la mitad del mes)
  const shouldApplyMiddleAmount = useMemo(() => {
    // Verificar si la renovación fue después del día 15
    // Usar renewal_date si existe, caso contrario usar la fecha actual
    const renewalDate = customer?.customer_membership?.renewal_date
      ? new Date(customer.customer_membership.renewal_date)
      : new Date()

    const dayOfMonth = renewalDate.getDate()

    // Si renovó después del día 15, aplica precio medio independientemente de asistencias
    return dayOfMonth >= 15
  }, [customer?.customer_membership?.renewal_date])

  // Determinar si se sugiere aplicar recargo
  const shouldSuggestSurcharge = useMemo(() => {
    if (shouldApplyMiddleAmount) return false
    if (membershipSelected?.type === MEMBERSHIP_TYPE_VIP) return false
    if (membershipSelected?.type === MEMBERSHIP_TYPE_DAILY) return false
    const today = new Date()
    const dayOfMonth = today.getDate()

    // Condiciones para recargo:
    // 1. Tiene asistencias este mes
    // 2. Fecha actual > 10 (pasó el período de pago)
    return hasAssistancesThisMonth && dayOfMonth > 10
  }, [hasAssistancesThisMonth, membershipSelected?.type])

  // Estado para controlar si se aplica el recargo (inicializado con la sugerencia)
  const [applySurcharge, setApplySurcharge] = useState(shouldSuggestSurcharge)

  // Calcular el monto a mostrar según la fecha
  const displayAmount = useMemo(() => {
    if (!membershipSelected?.amount) return ''

    if (shouldApplyMiddleAmount && membershipSelected.middle_amount !== null) {
      return membershipSelected.middle_amount.toString()
    }

    if (applySurcharge && membershipSelected.amount_surcharge !== null) {
      return membershipSelected.amount_surcharge.toString()
    }

    return membershipSelected.amount.toString()
  }, [membershipSelected, applySurcharge, shouldApplyMiddleAmount])

  // Calcular el monto real a enviar (para el input hidden)
  const actualAmount = useMemo(() => {
    if (!membershipSelected?.amount) return 0

    // Prioridad: Recargo > Precio Medio > Precio Normal
    if (applySurcharge && membershipSelected.amount_surcharge !== null) {
      return membershipSelected.amount_surcharge
    }

    if (shouldApplyMiddleAmount && membershipSelected.middle_amount !== null) {
      return membershipSelected.middle_amount
    }

    return membershipSelected.amount
  }, [membershipSelected, applySurcharge, shouldApplyMiddleAmount])

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

  const [payment, setPayment] = useState<CheckedState>(() => {
    if (!customer?.customer_membership?.last_payment_date) return false
    const lastPaymentDate = new Date(customer.customer_membership.last_payment_date)

    if (lastPaymentDate.toDateString() > today.toDateString()) {
      return false
    }

    return true
  })

  const handleChangeCheckBox = (checked: CheckedState) => {
    setPayment(checked)
  }

  const errors = useMemo(() => {
    if (errorProps) {
      return errorProps
    }

    return innerErrors || {}
  }, [errorProps, innerErrors])

  const hasAssistanceToday = customer?.assistance.some(
    (assistance) => new Date(assistance.assistance_date).toDateString() === today.toDateString()
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

            <div className='grid gap-y-2 col-span-2'>
              <div className='flex items-center gap-3'>
                {isVIPMembership && <SquareMinusIcon className='size-6 text-primary400' />}
                {!isVIPMembership && (
                  <Checkbox
                    checked={payment}
                    className='size-6'
                    disabled={loading}
                    id='payment'
                    name='payment'
                    onCheckedChange={handleChangeCheckBox}
                  />
                )}
                <Label
                  className={cn('text-xs text-white', isVIPMembership && 'text-white/40')}
                  htmlFor='payment'
                >
                  {t('membership.payMembership')}
                </Label>
              </div>
            </div>
            {shouldSuggestSurcharge && (
              <div className='grid gap-y-2 col-span-2'>
                <div className='flex items-center gap-3'>
                  <Switch
                    checked={applySurcharge}
                    disabled={loading}
                    id='apply_surcharge'
                    onCheckedChange={setApplySurcharge}
                  />
                  <Label className='text-xs text-white cursor-pointer' htmlFor='apply_surcharge'>
                    {t('membership.aplySurcharge')}
                  </Label>
                </div>
              </div>
            )}
            {!isVIPMembership && (
              <div className='grid gap-y-2 col-span-2'>
                <InputCurrency
                  key={membershipSelected?.type || 'no-membership'}
                  isDisabled
                  className='w-full font-light'
                  componentRight={<MoneyIcon className='text-[#8F878A]' height={24} width={24} />}
                  helperText={
                    applySurcharge && membershipSelected?.amount_surcharge !== null
                      ? t('membership.surchargeApplied')
                      : shouldApplyMiddleAmount && membershipSelected?.middle_amount !== null
                        ? t('membership.middlePriceApplied')
                        : undefined
                  }
                  id={'membership_amount_display'}
                  minValue={0}
                  value={displayAmount}
                />
                {/* Hidden input to send the amount value in FormData */}
                <input name='membership_amount' type='hidden' value={actualAmount} />
              </div>
            )}
            {!isVIPMembership && (
              <div className='grid gap-y-2 col-span-2'>
                <Label className='font-light' htmlFor='payment_type'>
                  {t('payments.title')}
                </Label>
                <HybridSelect
                  className='font-light'
                  helperText={errors?.payment_type}
                  isDisabled={payment !== true || loading}
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
            {!isVIPMembership && (
              <>
                <div className='flex items-center gap-3 col-span-2'>
                  <Checkbox
                    className='size-6'
                    disabled={!payment || hasAssistanceToday || loading}
                    id='first_assistance'
                    name='first_assistance'
                  />
                  <span className='flex items-center gap-2'>
                    <Label
                      className={cn(
                        'text-xs text-white',
                        (!payment || hasAssistanceToday || loading) && 'text-white/30'
                      )}
                      htmlFor='first_assistance'
                    >
                      {t('membership.registerFirstAssistance')}
                    </Label>
                    {!payment && (
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
            )}
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
