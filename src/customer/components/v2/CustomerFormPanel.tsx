'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import SidePanel from '@/components/v2/SidePanel'
import Stepper from '@/components/v2/Stepper'
import Button from '@/components/v2/ui/Button'
import { usePermissions } from '@/auth/hooks/use-permissions'
import { checkCustomerPersonId, upsertCustomer } from '@/customer/api/client'
import { handleDatabaseError } from '@/customer/errors'
import { basicCustomerValidation, basicMembershipValidation } from '@/customer/utils'
import type { Customer } from '@/customer/types'
import { removeFormatPersonId } from '@/lib/format-person-id'
import { useTranslations } from '@/lib/i18n/context'
import { getChargeAmount, getConfiguredSurcharge } from '@/membership/charge-mode'
import { getMembershipTypes } from '@/membership/api/client'
import { MEMBERSHIP_TYPE_VIP } from '@/membership/consts'
import CustomerFormMembershipStep from './CustomerFormMembershipStep'
import CustomerFormPersonalStep from './CustomerFormPersonalStep'
import {
  buildInitialMembershipValues,
  resolveMembershipPeriod,
  EMPTY_PERSONAL_VALUES,
  type CustomerFormMembershipValues,
  type CustomerFormPersonalValues,
} from './customer-form-state'

/** Campos que se editan en el paso 1. Decide a qué paso vuelve un error del submit. */
const PERSONAL_FIELDS = ['first_name', 'last_name', 'person_id', 'birth_date', 'phone']

/** Cuánto queda visible la alerta de éxito antes de cerrar el panel. */
const SUCCESS_DISMISS_MS = 1600

interface CustomerFormPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Se llama tras un alta exitosa, para que la vista de origen se refresque.
   *
   * Recibe el cliente recién creado —tal como lo devuelve el RPC del paso 1—
   * para el punto de entrada del home, donde el alta es un desvío en medio de
   * "registrar asistencia" y conviene dejarlo seleccionado al volver. Es
   * opcional: si el RPC no lo devolvió, llega `undefined`.
   */
  onCreated?: (customer?: Customer) => void
}

/**
 * Alta de cliente (Fase 7) — un formulario, dos puntos de entrada.
 *
 * El Figma lo dibuja dos veces, como "Desde el home" y "Crear nuevo cliente
 * desde Clientes", pero es el mismo panel: mismos dos pasos, mismos campos,
 * mismo footer. La única diferencia es quién lo abre, así que acá es un
 * componente que reciben las dos secciones.
 *
 * TODA ALTA COBRA. El diseño eliminó el checkbox "¿Abono la membresía?" que
 * tiene v1, y la decisión (Ema, 2026-09-18) fue que eso signifique lo que
 * parece: se crea el cliente, se crea la membresía y se registra el pago, todo
 * junto. Si el cliente no paga en el momento, se lo da de alta igual y se cobra
 * después por el flow de renovación. La única excepción es VIP, que no puede
 * tener pago — ver `CustomerFormMembershipStep`.
 *
 * NO REGISTRA LA PRIMERA ASISTENCIA. v1 lo ofrece en el mismo paso; el diseño
 * v2 no, y se decidió no agregarlo: registrar asistencia es un flow propio que
 * ya existe (Fase 3) y que desde la migración 20260917120100 tiene un índice
 * UNIQUE por día que evita el duplicado que este atajo podía provocar.
 */
export default function CustomerFormPanel({
  open,
  onOpenChange,
  onCreated,
}: CustomerFormPanelProps) {
  const { t } = useTranslations()
  const { isAdmin } = usePermissions()

  const [step, setStep] = useState(0)
  const [personal, setPersonal] = useState<CustomerFormPersonalValues>(EMPTY_PERSONAL_VALUES)
  const [membership, setMembership] = useState<CustomerFormMembershipValues>(
    buildInitialMembershipValues
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: membershipTypes = [] } = useQuery({
    queryKey: ['membership-types', 'v2'],
    queryFn: async () => {
      const { data } = await getMembershipTypes()

      return data
    },
    // El catálogo son cinco filas que cambian con el CRUD de la Fase 10, no
    // durante un alta. Traerlo en cada apertura del panel sería un round trip
    // por cliente creado.
    staleTime: 5 * 60 * 1000,
  })

  // VIP sólo para admins, igual que el form de v1. Además de la regla de
  // negocio, cierra un agujero: el RPC de pago valida el rol antes de asignar
  // VIP, pero el del alta no — y un alta VIP no pasa por el RPC de pago, porque
  // no hay nada que cobrar.
  const availableTypes = useMemo(
    () => membershipTypes.filter((type) => isAdmin || type.type !== MEMBERSHIP_TYPE_VIP),
    [membershipTypes, isAdmin]
  )

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  // Volver a abrir el panel arranca en blanco, con las fechas recalculadas.
  // Se resetea al abrir y no al cerrar para que la animación de salida no
  // vacíe el contenido a mitad de camino.
  useEffect(() => {
    if (!open) return
    setStep(0)
    setPersonal(EMPTY_PERSONAL_VALUES)
    setMembership(buildInitialMembershipValues())
    setErrors({})
    setLoading(false)
    setSuccess(false)
  }, [open])

  const patchPersonal = useCallback((patch: Partial<CustomerFormPersonalValues>) => {
    setPersonal((prev) => ({ ...prev, ...patch }))
  }, [])

  const patchMembership = useCallback((patch: Partial<CustomerFormMembershipValues>) => {
    setMembership((prev) => ({ ...prev, ...patch }))
  }, [])

  const selectedType = useMemo(
    () => availableTypes.find((type) => type.type === membership.membership_type) ?? null,
    [availableTypes, membership.membership_type]
  )
  const isVip = membership.membership_type === MEMBERSHIP_TYPE_VIP

  /**
   * FormData del cliente. `upsertCustomer` y `checkCustomerPersonId` reciben
   * FormData porque es el contrato que ya usa v1 — reusarlo evita duplicar toda
   * la capa de validación y de mapeo a parámetros del RPC.
   *
   * El DNI se manda **sin formato**: la columna guarda los dígitos pelados y el
   * pre-check compara contra eso.
   */
  const buildCustomerFormData = useCallback(() => {
    const data = new FormData()

    data.set('first_name', personal.first_name.trim())
    data.set('last_name', personal.last_name.trim())
    data.set('person_id', removeFormatPersonId(personal.person_id))
    data.set('phone', personal.phone.trim())
    if (personal.birth_date) data.set('birth_date', personal.birth_date)

    return data
  }, [personal])

  const buildMembershipFormData = useCallback(() => {
    const data = new FormData()

    // El período sale de `resolveMembershipPeriod`, no del estado crudo: el pase
    // diario ignora los datepickers y siempre vence hoy.
    const { start_date: startDate, end_date: endDate } = resolveMembershipPeriod(membership)

    data.set('membership_type', membership.membership_type)
    data.set('start_date', startDate)
    data.set('end_date', endDate)
    data.set('notes', membership.notes.trim())

    // VIP no lleva pago: `amount > 0` es un CHECK de membership_payments y el
    // plan vale 0. Sin `payment`, el RPC de pago ni se llama y el paso 1 crea la
    // membresía por su cuenta.
    if (!isVip) {
      data.set('payment', 'on')
      data.set('payment_type', membership.payment_type)
      data.set('membership_amount', String(getChargeAmount(selectedType, membership.charge_mode)))
      // El recargo se manda aparte para que el pago quede con el desglose
      // separado (migración 20260921101140): `membership_amount` es el total y
      // el bruto se obtiene restándole esto. Sólo la modalidad "mes con
      // recargo" lleva recargo; las otras dos son 0.
      data.set(
        'surcharge_amount',
        String(membership.charge_mode === 'surcharge' ? getConfiguredSurcharge(selectedType) : 0)
      )
    }

    return data
  }, [membership, isVip, selectedType])

  const handleNext = useCallback(async () => {
    setErrors({})
    const customerData = buildCustomerFormData()
    const { valid, errors: validationErrors } = basicCustomerValidation(customerData)

    if (!valid) {
      setErrors(validationErrors)

      return
    }

    setLoading(true)
    const check = await checkCustomerPersonId({ formData: customerData })

    setLoading(false)

    if (!check.success) {
      // Sin `router`: `handleDatabaseError` le agrega al toast de DNI duplicado
      // una acción "Ver cliente" que navega a la ficha **de v1**. Desde un panel
      // de v2 eso sacaría al operador de la v2 a mitad de un alta. El toast
      // sigue nombrando al cliente que ya existe, que es el dato que importa.
      const fieldErrors = handleDatabaseError(check, undefined, t)

      if (fieldErrors) setErrors(fieldErrors)

      return
    }

    setStep(1)
  }, [buildCustomerFormData, t])

  const handleSubmit = useCallback(async () => {
    setErrors({})
    const membershipData = buildMembershipFormData()
    const { valid, errors: validationErrors } = basicMembershipValidation(membershipData)

    if (!valid) {
      setErrors(validationErrors)

      return
    }

    setLoading(true)
    const response = await upsertCustomer({
      formDataCustomer: buildCustomerFormData(),
      formDataMembership: membershipData,
    })

    if (!response.success) {
      setLoading(false)
      const fieldErrors = handleDatabaseError(response, undefined, t)

      if (fieldErrors) {
        setErrors(fieldErrors)
        // Un DNI duplicado detectado recién acá (alguien lo creó entre el
        // pre-check y el submit) no se puede corregir desde el paso 2.
        if (Object.keys(fieldErrors).some((field) => PERSONAL_FIELDS.includes(field))) {
          setStep(0)
        }
      }

      return
    }

    setLoading(false)
    setSuccess(true)
    onCreated?.(response.customer)

    // La confirmación es una alerta verde dentro del panel, no un toast global
    // (captura del 2026-09-17). Queda visible un momento y después el panel se
    // cierra solo: el flow del Figma termina de vuelta en la pantalla de origen,
    // ya actualizada.
    dismissTimer.current = setTimeout(() => onOpenChange(false), SUCCESS_DISMISS_MS)
  }, [buildCustomerFormData, buildMembershipFormData, onCreated, onOpenChange, t])

  const isLastStep = step === 1

  return (
    <SidePanel
      description={t('v2.customers.form.subtitle')}
      footer={
        <div className='flex items-center justify-between gap-3'>
          <Button
            disabled={loading || success}
            type='button'
            variant='outlined'
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            disabled={loading || success}
            type='button'
            onClick={isLastStep ? handleSubmit : handleNext}
          >
            {loading && <Loader2 aria-hidden className='size-4 animate-spin' />}
            {loading
              ? t('v2.customers.form.submitting')
              : isLastStep
                ? t('v2.customers.form.submit')
                : t('common.next')}
          </Button>
        </div>
      }
      open={open}
      pinned={
        <Stepper
          current={step}
          steps={[t('v2.customers.form.stepPersonal'), t('v2.customers.form.stepMembership')]}
        />
      }
      title={t('v2.customers.form.title')}
      onOpenChange={onOpenChange}
    >
      <div className='flex flex-col gap-4'>
        {step === 0 ? (
          <CustomerFormPersonalStep errors={errors} values={personal} onChange={patchPersonal} />
        ) : (
          <CustomerFormMembershipStep
            errors={errors}
            membershipTypes={availableTypes}
            values={membership}
            onChange={patchMembership}
          />
        )}

        {success && (
          <div
            className='border-feedback-success text-feedback-success flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium'
            role='status'
          >
            <CheckCircle2 aria-hidden className='size-5 shrink-0' />
            {t('v2.customers.form.successMessage')}
          </div>
        )}
      </div>
    </SidePanel>
  )
}
