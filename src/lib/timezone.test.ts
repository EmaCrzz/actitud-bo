import { describe, it, expect } from 'vitest'
import {
  APP_TIMEZONE,
  getAppTzDateParts,
  utcInstantAtAppTzWallClock,
  getTodayIsoDateInAppTz,
  getEndOfMonthIsoDateInAppTz,
  parseAppTzDateString,
  shiftIsoDateInAppTz,
  getEndOfDayInAppTz,
  isExpiredInAppTz,
  isSameDayInAppTz,
  daysUntilInAppTz,
  getMonthRangeInAppTz,
} from './timezone'

/**
 * Helpers de fecha en hora argentina.
 *
 * Es el módulo con más historia de bugs del proyecto: el ADR 20260709153000
 * documenta 91 pagos desalineados por saltearlo, y reincidió una vez. Todas
 * las funciones aceptan el "ahora" por parámetro, así que los casos de borde
 * —21:00 AR, cambio de mes, fin de año, bisiesto— se cubren sin tocar el reloj
 * del sistema.
 *
 * El caso que aparece una y otra vez es el mismo: entre las 21:00 y la
 * medianoche AR, UTC ya está en el día siguiente. Todo lo que use `toISOString`
 * o `new Date("YYYY-MM-DD")` se corre un día.
 */

describe('la zona del negocio', () => {
  it('es Argentina', () => {
    expect(APP_TIMEZONE).toBe('America/Argentina/Buenos_Aires')
  })
})

describe('getTodayIsoDateInAppTz', () => {
  it('a las 21:00 AR devuelve el día argentino, no el día UTC', () => {
    // 2026-05-11T00:30:00Z es 2026-05-10 21:30 en Argentina.
    // `toISOString().slice(0,10)` daría "2026-05-11" — un día en el futuro.
    const lateNight = new Date('2026-05-11T00:30:00.000Z')

    expect(getTodayIsoDateInAppTz(lateNight)).toBe('2026-05-10')
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-05-11')
  })

  it('a media mañana coincide con la fecha UTC', () => {
    expect(getTodayIsoDateInAppTz(new Date('2026-05-10T14:00:00.000Z'))).toBe('2026-05-10')
  })

  it('el desfase puede cambiar el mes contable', () => {
    // 1 de junio 00:30 UTC es todavía 31 de mayo en Argentina. Tomar el día
    // UTC movería el ingreso a un mes que no corresponde.
    const turnOfMonth = new Date('2026-06-01T00:30:00.000Z')

    expect(getTodayIsoDateInAppTz(turnOfMonth)).toBe('2026-05-31')
  })
})

describe('parseAppTzDateString', () => {
  it('interpreta el string como medianoche argentina, no UTC', () => {
    const parsed = parseAppTzDateString('2026-05-10')

    // Medianoche en AR (UTC-3) es 03:00 UTC del mismo día.
    expect(parsed.toISOString()).toBe('2026-05-10T03:00:00.000Z')
    expect(getAppTzDateParts(parsed)).toEqual({ year: 2026, month: 5, day: 10 })
  })

  it('el ida y vuelta preserva el día calendario', () => {
    // La propiedad que importa: parsear y volver a formatear no mueve el día.
    // Es exactamente lo que se rompe cuando alguien manda el string crudo.
    for (const iso of ['2026-01-01', '2026-05-10', '2026-12-31', '2024-02-29']) {
      expect(getTodayIsoDateInAppTz(parseAppTzDateString(iso)), iso).toBe(iso)
    }
  })

  it('contrasta con `new Date(iso)`, que es el bug histórico', () => {
    // `new Date("2026-05-10")` es medianoche UTC = 2026-05-09 21:00 en AR.
    const naive = new Date('2026-05-10')

    expect(getAppTzDateParts(naive).day).toBe(9)
    expect(getAppTzDateParts(parseAppTzDateString('2026-05-10')).day).toBe(10)
  })
})

describe('utcInstantAtAppTzWallClock', () => {
  it('es robusto ante el cambio de año', () => {
    const instant = utcInstantAtAppTzWallClock(2026, 12, 31, 23, 0, 0)

    expect(getAppTzDateParts(instant)).toEqual({ year: 2026, month: 12, day: 31 })
  })

  it('normaliza un mes 13 al enero siguiente', () => {
    // De esto depende `getEndOfMonthIsoDateInAppTz`, que calcula el fin de mes
    // como "día 1 del mes siguiente menos un milisegundo".
    const instant = utcInstantAtAppTzWallClock(2026, 13, 1, 0, 0, 0)

    expect(getAppTzDateParts(instant)).toEqual({ year: 2027, month: 1, day: 1 })
  })
})

describe('getEndOfMonthIsoDateInAppTz', () => {
  it('resuelve meses de 30 y 31 días', () => {
    expect(getEndOfMonthIsoDateInAppTz(parseAppTzDateString('2026-04-15'))).toBe('2026-04-30')
    expect(getEndOfMonthIsoDateInAppTz(parseAppTzDateString('2026-05-15'))).toBe('2026-05-31')
  })

  it('resuelve febrero bisiesto y no bisiesto', () => {
    expect(getEndOfMonthIsoDateInAppTz(parseAppTzDateString('2024-02-10'))).toBe('2024-02-29')
    expect(getEndOfMonthIsoDateInAppTz(parseAppTzDateString('2026-02-10'))).toBe('2026-02-28')
  })

  it('resuelve diciembre cruzando el año', () => {
    expect(getEndOfMonthIsoDateInAppTz(parseAppTzDateString('2026-12-05'))).toBe('2026-12-31')
  })
})

describe('shiftIsoDateInAppTz', () => {
  it('suma y resta días preservando el calendario', () => {
    expect(shiftIsoDateInAppTz('2026-05-10', 5)).toBe('2026-05-15')
    expect(shiftIsoDateInAppTz('2026-05-10', -5)).toBe('2026-05-05')
  })

  it('cruza el límite de mes y de año', () => {
    expect(shiftIsoDateInAppTz('2026-05-31', 1)).toBe('2026-06-01')
    expect(shiftIsoDateInAppTz('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftIsoDateInAppTz('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('cruza febrero bisiesto', () => {
    expect(shiftIsoDateInAppTz('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftIsoDateInAppTz('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('getEndOfDayInAppTz', () => {
  it('es el último milisegundo del día argentino', () => {
    const endOfDay = getEndOfDayInAppTz('2026-05-10')

    expect(getAppTzDateParts(endOfDay)).toEqual({ year: 2026, month: 5, day: 10 })
    // Un milisegundo después ya es el día siguiente en AR.
    expect(getAppTzDateParts(new Date(endOfDay.getTime() + 1)).day).toBe(11)
  })

  it('una membresía que vence hoy sigue vigente toda la jornada', () => {
    // El motivo de existir de la función: `expiration_date` tiene que seguir
    // siendo mayor que "ahora" durante todo el día del vencimiento.
    const expiration = getEndOfDayInAppTz('2026-05-10')
    const duranteLaTarde = utcInstantAtAppTzWallClock(2026, 5, 10, 20, 0, 0)

    expect(expiration > duranteLaTarde).toBe(true)
    expect(isExpiredInAppTz(expiration, duranteLaTarde)).toBe(false)
  })
})

describe('isExpiredInAppTz', () => {
  const hoy = utcInstantAtAppTzWallClock(2026, 5, 10, 12, 0, 0)

  it('el día del vencimiento todavía no está vencida', () => {
    expect(isExpiredInAppTz(parseAppTzDateString('2026-05-10'), hoy)).toBe(false)
  })

  it('el día siguiente sí', () => {
    expect(isExpiredInAppTz(parseAppTzDateString('2026-05-09'), hoy)).toBe(true)
  })

  it('una fecha futura no está vencida', () => {
    expect(isExpiredInAppTz(parseAppTzDateString('2026-06-01'), hoy)).toBe(false)
  })

  it('sin fecha se considera vencida', () => {
    // Sin membresía no hay vigencia que sostener.
    expect(isExpiredInAppTz(null, hoy)).toBe(true)
    expect(isExpiredInAppTz(undefined, hoy)).toBe(true)
  })

  it('compara por día calendario argentino y no por instante', () => {
    // Vencimiento a las 23:00 AR del día 10, evaluado a las 22:00 AR del 10:
    // el instante es menor pero el día es el mismo, así que no está vencida.
    const vence = utcInstantAtAppTzWallClock(2026, 5, 10, 1, 0, 0)
    const ahora = utcInstantAtAppTzWallClock(2026, 5, 10, 22, 0, 0)

    expect(isExpiredInAppTz(vence, ahora)).toBe(false)
  })
})

describe('isSameDayInAppTz', () => {
  it('dos instantes del mismo día argentino son el mismo día', () => {
    const manana = utcInstantAtAppTzWallClock(2026, 5, 10, 8, 0, 0)
    const noche = utcInstantAtAppTzWallClock(2026, 5, 10, 22, 0, 0)

    expect(isSameDayInAppTz(manana, noche)).toBe(true)
  })

  it('las 22:00 AR y las 02:00 UTC del día siguiente son el mismo día argentino', () => {
    const noche = new Date('2026-05-11T01:00:00.000Z') // 10/05 22:00 AR
    const tarde = new Date('2026-05-10T20:00:00.000Z') // 10/05 17:00 AR

    expect(isSameDayInAppTz(noche, tarde)).toBe(true)
  })
})

describe('daysUntilInAppTz', () => {
  const hoy = utcInstantAtAppTzWallClock(2026, 5, 10, 12, 0, 0)

  it('cuenta días calendario, no múltiplos de 24 horas', () => {
    expect(daysUntilInAppTz(parseAppTzDateString('2026-05-10'), hoy)).toBe(0)
    expect(daysUntilInAppTz(parseAppTzDateString('2026-05-11'), hoy)).toBe(1)
    expect(daysUntilInAppTz(parseAppTzDateString('2026-05-17'), hoy)).toBe(7)
  })

  it('devuelve negativo para fechas pasadas', () => {
    expect(daysUntilInAppTz(parseAppTzDateString('2026-05-08'), hoy)).toBe(-2)
  })

  it('cuenta correctamente cruzando el mes', () => {
    const finDeMes = utcInstantAtAppTzWallClock(2026, 5, 30, 12, 0, 0)

    expect(daysUntilInAppTz(parseAppTzDateString('2026-06-02'), finDeMes)).toBe(3)
  })
})

describe('getMonthRangeInAppTz', () => {
  it('cubre el mes completo del instante dado', () => {
    const { start, end } = getMonthRangeInAppTz(parseAppTzDateString('2026-05-15'))

    expect(getAppTzDateParts(start)).toEqual({ year: 2026, month: 5, day: 1 })
    // El fin del rango tiene que incluir el último día del mes.
    expect(getAppTzDateParts(new Date(end.getTime() - 1)).month).toBe(5)
  })

  it('un pago del día 1 a la mañana cae dentro del mes', () => {
    // El caso que el bug de canonicalización rompe: si el timestamp se corre
    // tres horas, el pago del día 1 queda fuera del rango de su propio mes.
    const { start, end } = getMonthRangeInAppTz(parseAppTzDateString('2026-05-15'))
    const pagoDelDia1 = utcInstantAtAppTzWallClock(2026, 5, 1, 9, 0, 0)

    expect(pagoDelDia1 >= start && pagoDelDia1 < end).toBe(true)
  })

  it('un pago del último día a la noche cae dentro del mes', () => {
    const { start, end } = getMonthRangeInAppTz(parseAppTzDateString('2026-05-15'))
    const pagoDelDia31 = utcInstantAtAppTzWallClock(2026, 5, 31, 21, 0, 0)

    expect(pagoDelDia31 >= start && pagoDelDia31 < end).toBe(true)
  })
})
