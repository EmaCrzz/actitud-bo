'use client'

import FormField from '@/components/v2/FormField'
import InputCurrency from '@/components/v2/ui/InputCurrency'
import Input from '@/components/v2/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/v2/ui/Select'
import { useTranslations } from '@/lib/i18n/context'
import { AMOUNT_CHOICE_CUSTOM, type AmountChoice } from '@/membership/renewal'

export interface AmountChoiceOption {
  value: AmountChoice
  label: string
  /** Por qué la política propone esto. Se muestra bajo el select. */
  hint?: string
}

interface AmountChoiceFieldProps {
  id: string
  label: string
  options: AmountChoiceOption[]
  value: AmountChoice
  /** Monto del caso `custom`. Los otros dos los deriva `resolveRenewalAmounts`. */
  customAmount: number
  note: string
  /** El RPC exige nota para un descuento ad-hoc; el recargo no. */
  requireNote?: boolean
  amountError?: string
  noteError?: string
  onChange: (patch: { choice?: AmountChoice; customAmount?: number; note?: string }) => void
}

/**
 * Descuento y Recargo del paso 1 — un select con la sugerencia preseleccionada
 * y una salida a monto libre.
 *
 * El Figma los dibuja como selects (`Selecciona...`), y la regla de producto
 * (Ema, 2026-09-21) es que la sugerencia se proponga sin ser obligatoria. La
 * opción `Otro monto…` reconcilia las dos cosas: las opciones con concepto son
 * las que se ofrecen primero, y el monto libre existe pero hay que ir a
 * buscarlo.
 *
 * Que el monto libre no sea el default no es una preferencia estética. El
 * desglose de Ingresos y Balance se apoya en que cada peso tenga un concepto
 * detrás (`discount_rule_id`, `surcharge_note`); un campo de monto vacío por
 * default invita a cargar plata sin decir de qué es.
 *
 * El `hint` se muestra siempre que la opción elegida lo traiga: sugerir un
 * número sin decir por qué es lo que hizo que la heurística de recargo de v1
 * pasara inadvertida dos meses (ver el ADR 20260921101140).
 */
export default function AmountChoiceField({
  id,
  label,
  options,
  value,
  customAmount,
  note,
  requireNote = false,
  amountError,
  noteError,
  onChange,
}: AmountChoiceFieldProps) {
  const { t } = useTranslations()

  const selected = options.find((option) => option.value === value)
  const isCustom = value === AMOUNT_CHOICE_CUSTOM

  return (
    <div className='flex flex-col gap-2'>
      <FormField
        error={amountError}
        hint={isCustom ? undefined : selected?.hint}
        htmlFor={id}
        label={label}
      >
        <Select value={value} onValueChange={(next) => onChange({ choice: next as AmountChoice })}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={t('v2.membership.renew.selectPlaceholderShort')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {isCustom && (
        <>
          <InputCurrency
            id={`${id}_amount`}
            invalid={!!amountError}
            placeholder={t('v2.membership.renew.amountPlaceholder')}
            value={customAmount}
            onValueChange={(amount) => onChange({ customAmount: amount })}
          />
          <FormField
            error={noteError}
            htmlFor={`${id}_note`}
            label={
              requireNote
                ? t('v2.membership.renew.noteLabel')
                : t('v2.membership.renew.noteLabelOptional')
            }
          >
            <Input
              id={`${id}_note`}
              placeholder={t('v2.membership.renew.notePlaceholder')}
              value={note}
              onChange={(event) => onChange({ note: event.target.value })}
            />
          </FormField>
        </>
      )}
    </div>
  )
}
