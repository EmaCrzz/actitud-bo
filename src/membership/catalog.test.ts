import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WEEKLY_SLOTS,
  getMembershipLabel,
  getMembershipTwoLineLabel,
  getWeeklySlots,
  isCatalogMembershipType,
  membershipTypeKeyFromName,
} from './catalog'
import {
  MEMBERSHIP_TYPE_2_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
} from './consts'
import type { TranslationKey } from '@/lib/i18n/types'

/**
 * Resolución de nombre y cupo para planes del catálogo y planes creados desde
 * la UI (Fase 10).
 *
 * El caso que justifica el archivo es el del fallback silencioso: el mapa de
 * cupo semanal que vivía duplicado en `CustomerCounter` devolvía `undefined`
 * para un tipo desconocido, y `Array.from({ length: undefined })` da `[]`. La
 * pantalla renderizaba **cero casilleros de asistencia sin ningún error**.
 * Desde que los planes se crean desde la app, "tipo desconocido" dejó de ser
 * hipotético.
 *
 * `t` se stubea devolviendo la key: lo que hay que verificar es **cuál** key
 * se eligió, no cómo la traduce el diccionario.
 */
const t = (key: TranslationKey) => key as string

describe('isCatalogMembershipType', () => {
  it.each([
    MEMBERSHIP_TYPE_5_DAYS,
    MEMBERSHIP_TYPE_3_DAYS,
    MEMBERSHIP_TYPE_2_DAYS,
    MEMBERSHIP_TYPE_DAILY,
    MEMBERSHIP_TYPE_VIP,
  ])('reconoce %s como tipo del catálogo', (type) => {
    expect(isCatalogMembershipType(type)).toBe(true)
  })

  it('no reconoce un plan creado desde la UI', () => {
    expect(isCatalogMembershipType('PLAN_FAMILIAR_5_DIAS')).toBe(false)
  })

  it('no se deja engañar por un prefijo parecido', () => {
    expect(isCatalogMembershipType('MEMBERSHIP_TYPE_5_DAYS_PREMIUM')).toBe(false)
  })
})

describe('getMembershipLabel', () => {
  it('los del catálogo resuelven por key i18n, ignorando cualquier name', () => {
    expect(getMembershipLabel(MEMBERSHIP_TYPE_5_DAYS, t, { name: 'Pisado' })).toBe(
      'membership.typesShort.5_days'
    )
  })

  it('cada variante elige su mapa', () => {
    expect(getMembershipLabel(MEMBERSHIP_TYPE_5_DAYS, t, { variant: 'full' })).toBe(
      'membership.types.5_days'
    )
    expect(getMembershipLabel(MEMBERSHIP_TYPE_5_DAYS, t, { variant: 'weekly' })).toBe(
      'membership.typesWeekly.5_days'
    )
    expect(getMembershipLabel(MEMBERSHIP_TYPE_5_DAYS, t, { variant: 'short' })).toBe(
      'membership.typesShort.5_days'
    )
  })

  it('la variante por defecto es la corta', () => {
    expect(getMembershipLabel(MEMBERSHIP_TYPE_3_DAYS, t)).toBe(
      getMembershipLabel(MEMBERSHIP_TYPE_3_DAYS, t, { variant: 'short' })
    )
  })

  it('un plan creado desde la UI usa su name', () => {
    expect(
      getMembershipLabel('PLAN_FAMILIAR_5_DIAS', t, { name: 'Plan familiar 5 días' })
    ).toBe('Plan familiar 5 días')
  })

  it('un name con espacios de más se recorta', () => {
    expect(getMembershipLabel('PLAN_X', t, { name: '  Plan X  ' })).toBe('Plan X')
  })

  it('sin key y sin name, humaniza la clave en vez de mostrarla cruda', () => {
    // La mayoría de los call sites tienen el `membership_type` del cliente
    // pero no hicieron el join para traerse el `name`. Mostrar
    // `PLAN_FAMILIAR_5_DIAS` en la tabla de clientes sería honesto pero
    // inservible.
    expect(getMembershipLabel('PLAN_FAMILIAR_5_DIAS', t)).toBe('Plan familiar 5 dias')
    expect(getMembershipLabel('PLAN_FAMILIAR_5_DIAS', t, { name: '   ' })).toBe(
      'Plan familiar 5 dias'
    )
  })

  it('el name real gana sobre la clave humanizada, porque conserva los acentos', () => {
    expect(
      getMembershipLabel('PLAN_FAMILIAR_5_DIAS', t, { name: 'Plan familiar 5 días' })
    ).toBe('Plan familiar 5 días')
  })

  it('nunca devuelve undefined — es lo que tiraba la pantalla al pasárselo a t()', () => {
    for (const type of ['', '___', 'x', 'PLAN_NUEVO']) {
      expect(typeof getMembershipLabel(type, t)).toBe('string')
    }
  })
})

describe('getMembershipTwoLineLabel', () => {
  it('los del catálogo se parten en dos líneas traducidas', () => {
    expect(getMembershipTwoLineLabel(MEMBERSHIP_TYPE_3_DAYS, t)).toEqual({
      one: 'membership.types.twoLines.3_days.line1',
      two: 'membership.types.twoLines.3_days.line2',
    })
  })

  it('un plan creado desde la UI va entero en la primera línea', () => {
    // Su nombre es una frase libre: no hay dónde cortarlo. Los call sites
    // concatenan las dos con un espacio, así que un `two` vacío no se ve.
    expect(getMembershipTwoLineLabel('PLAN_FAMILIAR_5_DIAS', t, 'Plan familiar 5 días')).toEqual(
      { one: 'Plan familiar 5 días', two: '' }
    )
  })
})

describe('getWeeklySlots', () => {
  it('la columna de la DB gana sobre el mapa hardcodeado', () => {
    // Si alguien le carga 3 al plan de 5 días, manda la DB: es el dato que el
    // operador editó, y el mapa es sólo el fallback del histórico.
    expect(getWeeklySlots(MEMBERSHIP_TYPE_5_DAYS, 3)).toBe(3)
  })

  it('sin columna, los del catálogo caen al mapa', () => {
    expect(getWeeklySlots(MEMBERSHIP_TYPE_5_DAYS)).toBe(5)
    expect(getWeeklySlots(MEMBERSHIP_TYPE_3_DAYS)).toBe(3)
    expect(getWeeklySlots(MEMBERSHIP_TYPE_2_DAYS)).toBe(2)
    expect(getWeeklySlots(MEMBERSHIP_TYPE_DAILY)).toBe(1)
    expect(getWeeklySlots(MEMBERSHIP_TYPE_VIP)).toBe(5)
  })

  it('un plan nuevo sin cupo devuelve null, no un número inventado', () => {
    expect(getWeeklySlots('PLAN_FAMILIAR_5_DIAS')).toBeNull()
    expect(getWeeklySlots('PLAN_FAMILIAR_5_DIAS', null)).toBeNull()
  })

  it('un cupo de 0 se respeta en vez de tratarse como ausente', () => {
    // `0` es falsy: con `||` en vez de `??` esto habría caído al fallback y un
    // plan sin días habilitados se vería como uno de 5.
    expect(getWeeklySlots(MEMBERSHIP_TYPE_5_DAYS, 0)).toBe(0)
  })

  it('el fallback de presentación es un valor nombrado, no un 5 suelto', () => {
    expect(getWeeklySlots('PLAN_DESCONOCIDO') ?? DEFAULT_WEEKLY_SLOTS).toBe(5)
  })
})

describe('membershipTypeKeyFromName', () => {
  it('deriva la clave del ejemplo de la maqueta', () => {
    expect(membershipTypeKeyFromName('Plan familiar 5 días')).toBe('PLAN_FAMILIAR_5_DIAS')
  })

  it('saca acentos y eñes', () => {
    expect(membershipTypeKeyFromName('Mañana ágil')).toBe('MANANA_AGIL')
  })

  it('colapsa puntuación y espacios repetidos en un solo separador', () => {
    expect(membershipTypeKeyFromName('Plan  ·  Full-Time / 2026')).toBe('PLAN_FULL_TIME_2026')
  })

  it('no deja guiones bajos colgando en los extremos', () => {
    expect(membershipTypeKeyFromName('  ¡Plan!  ')).toBe('PLAN')
  })

  it('dos nombres que sólo difieren en formato colapsan en la misma clave', () => {
    // Es deliberado y está cubierto por el UNIQUE de `type`: el segundo alta
    // falla con DUPLICATE_NAME en vez de crear un plan gemelo.
    expect(membershipTypeKeyFromName('Plan Familiar')).toBe(
      membershipTypeKeyFromName('plan  familiar')
    )
  })

  it('un nombre sin caracteres alfanuméricos no produce clave', () => {
    // El caller lo trata como error de validación en vez de insertar `type: ''`,
    // que chocaría con el DEFAULT '' de la columna.
    expect(membershipTypeKeyFromName('¿¡...!?')).toBe('')
  })
})
