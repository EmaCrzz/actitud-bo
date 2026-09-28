import { describe, it, expect } from 'vitest'
import { getSuggestedCharge, computeChargeTotal } from './pricing'
import {
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
} from './consts'
import type { MembershipType } from './types'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'

/**
 * Sugerencia de cobro: qué precio proponer según cuándo se paga y si el
 * cliente ya venía asistiendo.
 *
 * Es donde se cruzan los dos ejes que `billing-policy` mantiene separados —la
 * mora y la media membresía— y donde un error se traduce directo en cobrarle
 * de más o de menos a una persona en el mostrador.
 */

function arDate(year: number, month: number, day: number, hour = 12): Date {
  return utcInstantAtAppTzWallClock(year, month, day, hour)
}

const PLAN_5_DIAS: MembershipType = {
  id: 'plan-5',
  type: MEMBERSHIP_TYPE_5_DAYS,
  amount: 20000,
  amount_surcharge: 23000, // recargo configurado: 3000
  middle_amount: 10000,
  last_update: null,
  name: null, // los del catálogo resuelven por key i18n
  weekly_quota: 5,
  active: true,
}

describe('getSuggestedCharge · casos sin cobro o con precio único', () => {
  it('VIP no se cobra', () => {
    const vip: MembershipType = { ...PLAN_5_DIAS, type: MEMBERSHIP_TYPE_VIP, amount: 20000 }
    const result = getSuggestedCharge({
      membership: vip,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: true,
    })

    expect(result.base).toBe(0)
    expect(result.surcharge).toBe(0)
    expect(result.reason).toBeNull()
  })

  it('la diaria se cobra a precio único, sin modalidades ni mora', () => {
    const daily: MembershipType = { ...PLAN_5_DIAS, type: MEMBERSHIP_TYPE_DAILY, amount: 5000 }
    // Día 25 y con asistencias: si la mora aplicara, acá se dispararía.
    const result = getSuggestedCharge({
      membership: daily,
      date: arDate(2026, 5, 25),
      hasAssistancesThisMonth: true,
    })

    expect(result.base).toBe(5000)
    expect(result.surcharge).toBe(0)
    expect(result.suggestsSurcharge).toBe(false)
  })

  it('sin plan no sugiere nada', () => {
    const result = getSuggestedCharge({
      membership: null,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: false,
    })

    expect(result.base).toBe(0)
    expect(result.reason).toBeNull()
  })
})

describe('getSuggestedCharge · mora', () => {
  it('quien ya venía y paga pasado el 10 recibe recargo', () => {
    const result = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date: arDate(2026, 5, 12),
      hasAssistancesThisMonth: true,
    })

    expect(result.reason).toBe('late_payment')
    expect(result.periodMode).toBe('full')
    expect(result.base).toBe(20000)
    expect(result.surcharge).toBe(3000)
    expect(result.suggestsSurcharge).toBe(true)
  })

  it('quien paga dentro de la gracia no recibe recargo', () => {
    const result = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date: arDate(2026, 5, 10),
      hasAssistancesThisMonth: true,
    })

    expect(result.reason).toBeNull()
    expect(result.surcharge).toBe(0)
    expect(result.base).toBe(20000)
  })

  it('no sugiere recargo si el plan no lo tiene configurado', () => {
    const sinRecargo: MembershipType = { ...PLAN_5_DIAS, amount_surcharge: null }
    const result = getSuggestedCharge({
      membership: sinRecargo,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: true,
    })

    expect(result.surcharge).toBe(0)
    expect(result.suggestsSurcharge).toBe(false)
  })

  it('un `amount_surcharge` menor al precio de lista no se convierte en descuento', () => {
    // Error de carga de precios: el recargo se clampea en 0, no pasa a negativo.
    const recargoMalCargado: MembershipType = { ...PLAN_5_DIAS, amount_surcharge: 15000 }
    const result = getSuggestedCharge({
      membership: recargoMalCargado,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: true,
    })

    expect(result.surcharge).toBe(0)
  })
})

describe('getSuggestedCharge · ingreso de mitad de mes', () => {
  it('quien entra del 16 en adelante paga media membresía, sin recargo', () => {
    const result = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: false,
    })

    expect(result.reason).toBe('mid_month_entry')
    expect(result.periodMode).toBe('half')
    expect(result.base).toBe(10000)
    expect(result.surcharge).toBe(0)
  })

  it('el día 15 todavía paga mes completo', () => {
    const result = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date: arDate(2026, 5, 15),
      hasAssistancesThisMonth: false,
    })

    expect(result.periodMode).toBe('full')
    expect(result.base).toBe(20000)
    expect(result.reason).toBeNull()
  })

  it('no ofrece media membresía si el plan no tiene ese precio cargado', () => {
    // Sin esta guarda devolvería `periodMode: 'half'` cobrando el mes entero,
    // que es peor que no ofrecerla: dice media y cobra completa.
    const sinMedia: MembershipType = { ...PLAN_5_DIAS, middle_amount: null }
    const result = getSuggestedCharge({
      membership: sinMedia,
      date: arDate(2026, 5, 20),
      hasAssistancesThisMonth: false,
    })

    expect(result.periodMode).toBe('full')
    expect(result.base).toBe(20000)
  })
})

describe('getSuggestedCharge · el cruce de los dos ejes', () => {
  it('el día 20 distingue al que ya venía del que recién entra', () => {
    // Misma fecha, resultados opuestos. Es la razón de ser de
    // `hasAssistancesThisMonth`: sin ese dato, al que recién entra se le
    // cobraría una mora que no debe.
    const date = arDate(2026, 5, 20)

    const yaVenia = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date,
      hasAssistancesThisMonth: true,
    })
    const recienEntra = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date,
      hasAssistancesThisMonth: false,
    })

    expect(yaVenia.reason).toBe('late_payment')
    expect(yaVenia.surcharge).toBe(3000)

    expect(recienEntra.reason).toBe('mid_month_entry')
    expect(recienEntra.surcharge).toBe(0)
    expect(recienEntra.base).toBeLessThan(yaVenia.base)
  })

  it('entre el 11 y el 15 quien recién entra paga completo sin recargo', () => {
    // Zona intermedia: ya pasó la gracia pero todavía no aplica media
    // membresía, y no hay mora porque no venía asistiendo.
    const result = getSuggestedCharge({
      membership: PLAN_5_DIAS,
      date: arDate(2026, 5, 13),
      hasAssistancesThisMonth: false,
    })

    expect(result.periodMode).toBe('full')
    expect(result.base).toBe(20000)
    expect(result.surcharge).toBe(0)
    expect(result.reason).toBeNull()
  })
})

describe('computeChargeTotal', () => {
  it('suma el recargo y resta el descuento', () => {
    expect(computeChargeTotal({ base: 20000, surcharge: 3000, discount: 5000 })).toBe(18000)
  })

  it('no devuelve negativos cuando el descuento excede la suma', () => {
    expect(computeChargeTotal({ base: 10000, surcharge: 0, discount: 99000 })).toBe(0)
  })

  it('el total cierra con sus partes, que es lo que exige el CHECK de la DB', () => {
    // `membership_payments` tiene el constraint
    // `amount = gross_amount + surcharge_amount - discount_amount`.
    const base = 20000
    const surcharge = 3000
    const discount = 2000

    expect(computeChargeTotal({ base, surcharge, discount })).toBe(base + surcharge - discount)
  })
})
