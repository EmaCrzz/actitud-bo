import { describe, it, expect } from 'vitest'
import { buildRenewalPeriod } from './renewal'
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
