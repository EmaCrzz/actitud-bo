import { describe, it, expect } from 'vitest'
import {
  ACTITUD_BILLING_POLICY,
  getCyclePhaseForDay,
  getCyclePhaseForDate,
  getCyclePhaseForPayment,
  isWithinGracePeriod,
  qualifiesForHalfMonth,
} from './billing-policy'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'

/**
 * Política de cobro: el corte entre pagar sin recargo, con recargo, y la media
 * membresía de quien entra a mitad de mes.
 *
 * Es la regla de negocio central del gimnasio y estuvo desincronizada: el
 * docblock de `billing-policy.ts` documenta que el dashboard contaba un pago
 * del día 13 como "sin recargo" mientras el formulario ya sugería cobrarlo con
 * recargo. Tres reglas conviviendo, ninguna al tanto de las otras.
 *
 * Estos tests fijan la regla en un solo lugar verificable. Se apoyan en que las
 * funciones aceptan la fecha y la política por parámetro: cubrir los 31 días
 * del mes por e2e exigiría manipular el reloj del sistema o esperar al día 11.
 */

/** Instante en hora argentina, para no depender de la TZ de quien corre los tests. */
function arDate(year: number, month: number, day: number, hour = 12): Date {
  return utcInstantAtAppTzWallClock(year, month, day, hour)
}

describe('getCyclePhaseForDay', () => {
  it('los días 1 al 10 están dentro de la gracia', () => {
    for (let day = 1; day <= 10; day++) {
      expect(getCyclePhaseForDay(day), `día ${day}`).toBe('grace')
    }
  })

  it('del 11 en adelante hay recargo', () => {
    for (let day = 11; day <= 31; day++) {
      expect(getCyclePhaseForDay(day), `día ${day}`).toBe('surcharge')
    }
  })

  it('el corte está en el 10/11, no en el 15/16', () => {
    // Regresión explícita: la constante decía 15 y se corrigió el 2026-09-21
    // porque el formulario y el copy ya usaban el 10. Si alguien la vuelve a
    // mover, que sea a propósito y no por arrastre.
    expect(ACTITUD_BILLING_POLICY.gracePeriodEnd).toBe(10)
    expect(ACTITUD_BILLING_POLICY.surchargeStart).toBe(11)
    expect(getCyclePhaseForDay(10)).toBe('grace')
    expect(getCyclePhaseForDay(11)).toBe('surcharge')
  })

  it('respeta una política distinta a la de Actitud', () => {
    // La política es un parámetro para que el segundo tenant no obligue a
    // tocar a los consumidores.
    const policy = { gracePeriodEnd: 5, surchargeStart: 6, halfMonthStart: 20 }

    expect(getCyclePhaseForDay(5, policy)).toBe('grace')
    expect(getCyclePhaseForDay(6, policy)).toBe('surcharge')
  })
})

describe('getCyclePhaseForDate', () => {
  it('resuelve el día en hora argentina, no en UTC', () => {
    // 2026-03-11 a las 01:00 UTC es todavía el día 10 a las 22:00 en Argentina.
    // Leído en UTC daría "surcharge"; en hora del negocio es gracia.
    const justAfterMidnightUtc = new Date('2026-03-11T01:00:00.000Z')

    expect(getCyclePhaseForDate(justAfterMidnightUtc)).toBe('grace')
  })

  it('el día 11 a la mañana en Argentina ya es recargo', () => {
    expect(getCyclePhaseForDate(arDate(2026, 3, 11, 9))).toBe('surcharge')
  })
})

describe('isWithinGracePeriod', () => {
  it('es verdadero en la primera parte del mes y falso después', () => {
    expect(isWithinGracePeriod(arDate(2026, 5, 1))).toBe(true)
    expect(isWithinGracePeriod(arDate(2026, 5, 10))).toBe(true)
    expect(isWithinGracePeriod(arDate(2026, 5, 11))).toBe(false)
    expect(isWithinGracePeriod(arDate(2026, 5, 28))).toBe(false)
  })
})

describe('qualifiesForHalfMonth', () => {
  it('aplica del 16 en adelante', () => {
    expect(qualifiesForHalfMonth(arDate(2026, 5, 15))).toBe(false)
    expect(qualifiesForHalfMonth(arDate(2026, 5, 16))).toBe(true)
    expect(qualifiesForHalfMonth(arDate(2026, 5, 31))).toBe(true)
  })

  it('es un eje distinto de la mora', () => {
    // El día 16 cae en fase de recargo y a la vez habilita media membresía.
    // Que las dos cosas sean ciertas al mismo tiempo es correcto: una habla de
    // deuda y la otra de cuánto mes se usa. Quien las combina es
    // getSuggestedCharge, según si el cliente ya venía asistiendo.
    const day16 = arDate(2026, 5, 16)

    expect(getCyclePhaseForDate(day16)).toBe('surcharge')
    expect(qualifiesForHalfMonth(day16)).toBe(true)
  })
})

describe('getCyclePhaseForPayment', () => {
  it('pagar dentro de la gracia del propio período no tiene recargo', () => {
    const periodStart = arDate(2026, 5, 1)

    expect(getCyclePhaseForPayment(periodStart, arDate(2026, 5, 1))).toBe('grace')
    expect(getCyclePhaseForPayment(periodStart, arDate(2026, 5, 10, 23))).toBe('grace')
  })

  it('pagar pasada la gracia del período tiene recargo', () => {
    const periodStart = arDate(2026, 5, 1)

    expect(getCyclePhaseForPayment(periodStart, arDate(2026, 5, 11, 0))).toBe('surcharge')
    expect(getCyclePhaseForPayment(periodStart, arDate(2026, 5, 20))).toBe('surcharge')
  })

  it('la renovación anticipada no es mora', () => {
    // Pagar octubre el 28 de septiembre da "día 28", que la versión simple
    // clasificaría como mora. Se pagó doce días ANTES de que venciera la
    // gracia de octubre. Habilitado por la migración 20260922125530.
    const octubre = arDate(2026, 10, 1)
    const pagadoEn28DeSeptiembre = arDate(2026, 9, 28)

    expect(getCyclePhaseForPayment(octubre, pagadoEn28DeSeptiembre)).toBe('grace')
  })

  it('nadie está en mora antes de que su período empiece', () => {
    // Alta del día 15 que paga el mismo día 15: no debe nada de antes, está
    // estrenando. El código viejo miraba el día del mes del inicio del período
    // y contaba como morosa cada alta del 11 en adelante.
    const periodoDesdeEl15 = arDate(2026, 5, 15)

    expect(getCyclePhaseForPayment(periodoDesdeEl15, arDate(2026, 5, 15, 18))).toBe('grace')
  })

  it('un alta de mitad de mes que paga al día siguiente sí está en mora', () => {
    // El límite del caso anterior: la tolerancia llega hasta el final del día
    // en que arranca el período, no más.
    const periodoDesdeEl15 = arDate(2026, 5, 15)

    expect(getCyclePhaseForPayment(periodoDesdeEl15, arDate(2026, 5, 16, 10))).toBe('surcharge')
  })

  it('el límite de la gracia incluye todo el día 10', () => {
    const periodStart = arDate(2026, 5, 1)
    // 10 de mayo 23:59 AR — todavía gracia.
    const lastGraceMoment = utcInstantAtAppTzWallClock(2026, 5, 10, 23, 59, 59)
    // 11 de mayo 00:00 AR — ya recargo.
    const firstSurchargeMoment = utcInstantAtAppTzWallClock(2026, 5, 11, 0, 0, 0)

    expect(getCyclePhaseForPayment(periodStart, lastGraceMoment)).toBe('grace')
    expect(getCyclePhaseForPayment(periodStart, firstSurchargeMoment)).toBe('surcharge')
  })
})
