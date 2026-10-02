import { describe, it, expect } from 'vitest'
import {
  AMOUNT_CHOICE_CUSTOM,
  AMOUNT_CHOICE_NONE,
  buildRenewalPeriod,
  resolveRenewalAmounts,
  type RenewalFormValues,
} from './renewal'
import { MEMBERSHIP_TYPE_3_DAYS, MEMBERSHIP_TYPE_VIP } from './consts'
import type { SuggestedCharge } from './pricing'
import type { MembershipType } from './types'
import { DISCOUNT_TYPE_FIXED, DISCOUNT_TYPE_PERCENT } from '@/group/consts'
import type { DiscountRule } from '@/group/types'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'

/**
 * Período que la app propone al cobrar: desde cuándo y hasta cuándo.
 *
 * La función tenía la regla escrita en su docblock desde la Fase 8 y **ningún
 * test**. El 2026-09-30 —último día del mes— el alta de cliente quedó
 * bloqueada porque prellenaba las fechas por su cuenta en vez de usar esta
 * función, y ahí se vio que el caso que el comentario describía no estaba
 * verificado en ningún lado. Ahora sostiene dos flows (alta y renovación), así
 * que la regla se fija acá.
 *
 * `now` es inyectable justamente para esto: el comportamiento cambia según el
 * día del mes y esperar al 30 para probarlo no es una opción.
 */
function arNow(year: number, month: number, day: number): Date {
  return utcInstantAtAppTzWallClock(year, month, day, 12)
}

describe('buildRenewalPeriod · cliente sin vencimiento previo (alta)', () => {
  it('propone de hoy a fin del mes en curso', () => {
    expect(buildRenewalPeriod(null, arNow(2026, 9, 15))).toEqual({
      start_date: '2026-09-15',
      end_date: '2026-09-30',
    })
  })

  it('el último día del mes propone el mes siguiente completo, no un período de un día', () => {
    // El caso que bloqueaba el alta: con inicio = fin,
    // `basicMembershipValidation` rechaza el formulario y no hay forma de
    // guardar sin corregir las fechas a mano.
    expect(buildRenewalPeriod(null, arNow(2026, 9, 30))).toEqual({
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    })
  })

  it('funciona en un mes de 31 días', () => {
    expect(buildRenewalPeriod(null, arNow(2026, 10, 31))).toEqual({
      start_date: '2026-11-01',
      end_date: '2026-11-30',
    })
  })

  it('febrero sale del calendario, no de una suma de 30 días', () => {
    expect(buildRenewalPeriod(null, arNow(2026, 1, 31))).toEqual({
      start_date: '2026-02-01',
      end_date: '2026-02-28',
    })
  })

  it('un año bisiesto da 29 de febrero', () => {
    expect(buildRenewalPeriod(null, arNow(2028, 1, 31))).toEqual({
      start_date: '2028-02-01',
      end_date: '2028-02-29',
    })
  })
})

describe('buildRenewalPeriod · cliente con membresía vigente', () => {
  it('arranca el día después del vencimiento, sin pisar lo ya pago', () => {
    // Vence el 30/09 y renueva el 15/09: el período nuevo no puede empezar hoy
    // o el cliente perdería los 15 días que ya pagó.
    const expiration = arNow(2026, 9, 30).toISOString()

    expect(buildRenewalPeriod(expiration, arNow(2026, 9, 15))).toEqual({
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    })
  })

  it('un vencimiento ya pasado arranca hoy, no en el pasado', () => {
    const expiration = arNow(2026, 7, 31).toISOString()

    expect(buildRenewalPeriod(expiration, arNow(2026, 9, 15))).toEqual({
      start_date: '2026-09-15',
      end_date: '2026-09-30',
    })
  })

  it('el vencimiento se lee en hora AR, no en UTC', () => {
    // Una membresía canonicalizada vence a las 03:00 UTC del 30/09, que es
    // medianoche AR del 30. Leído en UTC el día sigue siendo el 30, pero con un
    // timestamp de las 00:30 UTC el día AR es el 29 y el período arrancaría un
    // día antes. Este caso fija que se lee en AR.
    const expiration = '2026-10-01T02:00:00.000Z' // 30/09 23:00 AR

    expect(buildRenewalPeriod(expiration, arNow(2026, 9, 15)).start_date).toBe('2026-10-01')
  })
})

/**
 * Promociones y descuento manual en la renovación de v2 (2026-10-02).
 *
 * El grupo familiar dejó de ser una sugerencia por cliente y pasó a ser una
 * promoción que quien cobra elige. Lo que estos tests fijan es la plata: qué
 * monto se descuenta, contra qué bruto, y qué regla queda registrada — el
 * `discount_rule_id` es lo que el Balance usa para atribuir cada peso.
 */
const PLAN_3_DIAS: MembershipType = {
  id: 'plan-3',
  type: MEMBERSHIP_TYPE_3_DAYS,
  amount: 24000,
  amount_surcharge: 28800,
  middle_amount: 12000,
  last_update: null,
  name: null,
  weekly_quota: 3,
  active: true,
}

const GRUPO_FAMILIAR: DiscountRule = {
  id: 'rule-family',
  name: '2do integrante grupo familiar',
  type: DISCOUNT_TYPE_FIXED,
  value: 2000,
  applies_to: 'group_member',
  active: true,
  created_at: '2026-07-29T00:00:00Z',
  updated_at: '2026-07-29T00:00:00Z',
}

const SIN_SUGERENCIA: SuggestedCharge = {
  periodMode: 'full',
  base: 24000,
  surcharge: 0,
  suggestsSurcharge: false,
  reason: null,
}

function formValues(overrides: Partial<RenewalFormValues> = {}): RenewalFormValues {
  return {
    membership_type: MEMBERSHIP_TYPE_3_DAYS,
    period_mode: 'full',
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    promotion_id: '',
    discount_choice: AMOUNT_CHOICE_NONE,
    discount_custom_amount: 0,
    discount_note: '',
    surcharge_choice: AMOUNT_CHOICE_NONE,
    surcharge_custom_amount: 0,
    surcharge_note: '',
    payment_type: 'PAYMENT_CASH',
    ...overrides,
  }
}

function amountsFor(values: RenewalFormValues, promotion: DiscountRule | null) {
  return resolveRenewalAmounts({
    values,
    membership: PLAN_3_DIAS,
    suggestion: SIN_SUGERENCIA,
    promotion,
  })
}

describe('resolveRenewalAmounts · promociones', () => {
  it('sin promoción ni descuento cobra el plan entero y no registra regla', () => {
    expect(amountsFor(formValues(), null)).toEqual({
      base: 24000,
      surcharge: 0,
      discount: 0,
      discount_rule_id: null,
      total: 24000,
    })
  })

  it('una promoción fija descuenta su valor y deja su regla en el pago', () => {
    const amounts = amountsFor(formValues({ promotion_id: GRUPO_FAMILIAR.id }), GRUPO_FAMILIAR)

    expect(amounts.discount).toBe(2000)
    expect(amounts.discount_rule_id).toBe(GRUPO_FAMILIAR.id)
    expect(amounts.total).toBe(22000)
  })

  it('una promoción porcentual se calcula sobre el bruto de la modalidad elegida', () => {
    // Media membresía: 10% de 12.000, no de los 24.000 del plan completo. Es
    // el caso que haría divergir el label del select y el total si el monto
    // se calculara una sola vez al abrir el panel.
    const diezPorCiento: DiscountRule = {
      ...GRUPO_FAMILIAR,
      id: 'rule-10',
      type: DISCOUNT_TYPE_PERCENT,
      value: 10,
    }
    const amounts = amountsFor(
      formValues({ promotion_id: diezPorCiento.id, period_mode: 'half' }),
      diezPorCiento
    )

    expect(amounts.base).toBe(12000)
    expect(amounts.discount).toBe(1200)
    expect(amounts.total).toBe(10800)
  })

  it('el descuento manual no lleva regla: el RPC le exige el motivo', () => {
    const amounts = amountsFor(
      formValues({
        discount_choice: AMOUNT_CHOICE_CUSTOM,
        discount_custom_amount: 3000,
        discount_note: 'Cortesía',
      }),
      null
    )

    expect(amounts.discount).toBe(3000)
    expect(amounts.discount_rule_id).toBeNull()
  })

  it('con promoción y monto manual a la vez gana la promoción, sin sumarlos', () => {
    // La pantalla no deja llegar a este estado. Si llegara, sumar los dos
    // registraría bajo la regla de la promo un monto que no es el suyo, y el
    // Balance le atribuiría plata que no salió de ella.
    const amounts = amountsFor(
      formValues({
        promotion_id: GRUPO_FAMILIAR.id,
        discount_choice: AMOUNT_CHOICE_CUSTOM,
        discount_custom_amount: 5000,
      }),
      GRUPO_FAMILIAR
    )

    expect(amounts.discount).toBe(2000)
    expect(amounts.discount_rule_id).toBe(GRUPO_FAMILIAR.id)
  })

  it('una promoción sobre un VIP no genera pago', () => {
    const vip: MembershipType = { ...PLAN_3_DIAS, type: MEMBERSHIP_TYPE_VIP, amount: 0 }
    const amounts = resolveRenewalAmounts({
      values: formValues({ membership_type: MEMBERSHIP_TYPE_VIP, promotion_id: GRUPO_FAMILIAR.id }),
      membership: vip,
      suggestion: SIN_SUGERENCIA,
      promotion: GRUPO_FAMILIAR,
    })

    expect(amounts).toEqual({
      base: 0,
      surcharge: 0,
      discount: 0,
      discount_rule_id: null,
      total: 0,
    })
  })
})
