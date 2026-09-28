'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, Loader2 } from 'lucide-react'
import Button from '@/components/v2/ui/Button'
import FormField from '@/components/v2/FormField'
import Input from '@/components/v2/ui/Input'
import InputCurrency from '@/components/v2/ui/InputCurrency'
import SidePanel from '@/components/v2/SidePanel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import { Switch } from '@/components/ui/switch'
import { useTranslations } from '@/lib/i18n/context'
import { formatCalendarDate } from '@/lib/format-date'
import { createMembershipPlan, updateMembershipPlan } from '@/membership/api/client'
import { getMembershipLabel, isCatalogMembershipType } from '@/membership/catalog'
import type { MembershipPlan } from '@/membership/types'

/** Frecuencias ofrecidas en el select. El CHECK de la DB acepta 1..7. */
const WEEKLY_QUOTA_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const SUCCESS_DISMISS_MS = 1600

interface PlanFormPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = crear. Un plan = editar. */
  plan: MembershipPlan | null
  onSaved: () => void
}

interface FormState {
  name: string
  amount: number
  middleAmount: number
  surcharge: number
  weeklyQuota: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  amount: 0,
  middleAmount: 0,
  surcharge: 0,
  weeklyQuota: '',
  active: true,
}

/**
 * Panel de crear/editar un plan.
 *
 * Es uno solo y no dos porque las capturas del 2026-09-28 dibujan el mismo
 * panel con dos diferencias: al crear se pide el nombre y al editar se muestra
 * fijo como encabezado del card. Dos componentes que difieren en un campo
 * divergen apenas alguien toque uno.
 *
 * **El campo Estado no está en el Figma** — la tabla muestra la columna pero
 * ninguno de los dos formularios la incluye. Se agrega asumiendo que el
 * diseñador lo va a sumar: sin él, un plan se podría crear pero nunca
 * discontinuar, que es media funcionalidad.
 */
export default function PlanFormPanel({ open, onOpenChange, plan, onSaved }: PlanFormPanelProps) {
  const { t } = useTranslations()
  const isEdit = plan !== null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // El panel se monta una vez y cambia de plan, así que el estado se resetea
  // cuando cambia la fila elegida y no en el montaje.
  useEffect(() => {
    if (!open) return

    setErrors({})
    setSubmitError(null)
    setSuccess(false)
    setForm(
      plan
        ? {
            name: plan.name ?? '',
            amount: plan.amount ?? 0,
            middleAmount: plan.middle_amount ?? 0,
            surcharge: plan.amount_surcharge ?? 0,
            weeklyQuota: plan.weekly_quota != null ? String(plan.weekly_quota) : '',
            active: plan.active,
          }
        : EMPTY_FORM
    )
  }, [open, plan])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => onOpenChange(false), SUCCESS_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [success, onOpenChange])

  // Los 5 del catálogo no tienen `name` en la DB: su etiqueta sale de la key
  // i18n y no se puede editar desde acá. Renombrarlos cambiaría el nombre en
  // un idioma y lo dejaría intacto en el otro.
  const nameIsEditable = !isEdit || (plan != null && !isCatalogMembershipType(plan.type))

  const headerName = useMemo(() => {
    if (!plan) return ''

    return getMembershipLabel(plan.type, t, { name: plan.name })
  }, [plan, t])

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (nameIsEditable && !form.name.trim()) next.name = t('v2.membership.plans.validation.nameRequired')
    if (!form.weeklyQuota) next.weeklyQuota = t('v2.membership.plans.validation.quotaRequired')
    if (form.amount < 0 || form.middleAmount < 0 || form.surcharge < 0) {
      next.amount = t('v2.membership.plans.validation.amountInvalid')
    }

    setErrors(next)

    return Object.keys(next).length === 0
  }, [form, nameIsEditable, t])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    setLoading(true)
    setSubmitError(null)

    // Los precios se guardan tal cual se tipean, **sin convertir 0 a NULL**.
    // Parecía más prolijo que "sin precio" fuera un NULL, pero el VIP está
    // cargado con `amount = 0` y el listado de precios de v1 filtra por
    // `amount IS NOT NULL`: convertirlo lo haría desaparecer de una pantalla
    // de v1 que hoy lo muestra. Un 0 y un NULL se renderizan los dos como
    // "Sin costo", así que la distinción no le sirve a nadie y sí puede
    // romper algo.
    const { error } = isEdit
      ? await updateMembershipPlan(plan.id, {
          ...(nameIsEditable ? { name: form.name.trim() } : {}),
          amount: form.amount,
          middle_amount: form.middleAmount,
          amount_surcharge: form.surcharge,
          weekly_quota: Number(form.weeklyQuota),
          active: form.active,
        })
      : await createMembershipPlan({
          name: form.name.trim(),
          amount: form.amount,
          middle_amount: form.middleAmount,
          amount_surcharge: form.surcharge,
          weekly_quota: Number(form.weeklyQuota),
        })

    setLoading(false)

    if (error) {
      setSubmitError(
        error.code === 'DUPLICATE_NAME'
          ? t('v2.membership.plans.create.duplicate')
          : t(isEdit ? 'v2.membership.plans.edit.error' : 'v2.membership.plans.create.error')
      )

      return
    }

    setSuccess(true)
    onSaved()
  }, [form, isEdit, nameIsEditable, onSaved, plan, t, validate])

  return (
    <SidePanel
      description={t(
        isEdit ? 'v2.membership.plans.edit.description' : 'v2.membership.plans.create.description'
      )}
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
          <Button disabled={loading || success} type='button' onClick={handleSubmit}>
            {loading && <Loader2 aria-hidden className='size-4 animate-spin' />}
            {t(
              isEdit ? 'v2.membership.plans.edit.submit' : 'v2.membership.plans.create.submit'
            )}
          </Button>
        </div>
      }
      open={open}
      title={t(isEdit ? 'v2.membership.plans.edit.title' : 'v2.membership.plans.create.title')}
      onOpenChange={onOpenChange}
    >
      <div className='rounded-lg border p-4'>
        <p className='mb-4 border-b pb-3 text-sm text-muted-foreground'>
          {isEdit
            ? t('v2.membership.plans.edit.sectionTitle', { name: headerName })
            : t('v2.membership.plans.create.sectionTitle')}
        </p>

        <div className='flex flex-col gap-4'>
          {nameIsEditable && (
            <FormField
              error={errors.name}
              htmlFor='plan_name'
              label={t('v2.membership.plans.fields.name')}
            >
              <Input
                id='plan_name'
                placeholder={t('v2.membership.plans.fields.namePlaceholder')}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </FormField>
          )}

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              error={errors.amount}
              htmlFor='plan_amount'
              label={t('v2.membership.plans.fields.amount')}
            >
              <InputCurrency
                id='plan_amount'
                invalid={Boolean(errors.amount)}
                value={form.amount}
                onValueChange={(amount) => setForm((prev) => ({ ...prev, amount }))}
              />
            </FormField>

            <FormField
              htmlFor='plan_middle_amount'
              label={t('v2.membership.plans.fields.middleAmount')}
            >
              <InputCurrency
                id='plan_middle_amount'
                value={form.middleAmount}
                onValueChange={(middleAmount) => setForm((prev) => ({ ...prev, middleAmount }))}
              />
            </FormField>

            <FormField htmlFor='plan_surcharge' label={t('v2.membership.plans.fields.surcharge')}>
              <InputCurrency
                id='plan_surcharge'
                value={form.surcharge}
                onValueChange={(surcharge) => setForm((prev) => ({ ...prev, surcharge }))}
              />
            </FormField>

            <FormField
              error={errors.weeklyQuota}
              htmlFor='plan_weekly_quota'
              label={t('v2.membership.plans.fields.weeklyQuota')}
            >
              <Select
                value={form.weeklyQuota}
                onValueChange={(weeklyQuota) => setForm((prev) => ({ ...prev, weeklyQuota }))}
              >
                <SelectTrigger id='plan_weekly_quota'>
                  <SelectValue
                    placeholder={t('v2.membership.plans.fields.weeklyQuotaPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {WEEKLY_QUOTA_OPTIONS.map((quota) => (
                    <SelectItem key={quota} value={String(quota)}>
                      {quota}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {isEdit && (
            <FormField
              hint={t('v2.membership.plans.fields.statusHint')}
              htmlFor='plan_active'
              label={t('v2.membership.plans.fields.status')}
            >
              <div className='flex items-center gap-2'>
                <Switch
                  checked={form.active}
                  id='plan_active'
                  onCheckedChange={(active) => setForm((prev) => ({ ...prev, active }))}
                />
                <span className='text-sm'>
                  {t(
                    form.active
                      ? 'v2.membership.plans.status.active'
                      : 'v2.membership.plans.status.inactive'
                  )}
                </span>
              </div>
            </FormField>
          )}

          {isEdit && (
            <p className='text-xs text-muted-foreground'>
              {plan.last_update
                ? t('v2.membership.plans.edit.lastUpdate', {
                    date: formatCalendarDate(plan.last_update),
                  })
                : t('v2.membership.plans.edit.lastUpdateNever')}
            </p>
          )}
        </div>
      </div>

      {submitError && <p className='text-feedback-error mt-4 text-sm'>{submitError}</p>}

      {success && (
        <div className='text-feedback-success border-feedback-success/40 bg-feedback-success/10 mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm'>
          <CircleCheck aria-hidden className='size-4 shrink-0' />
          {t(
            isEdit ? 'v2.membership.plans.edit.success' : 'v2.membership.plans.create.success'
          )}
        </div>
      )}
    </SidePanel>
  )
}
