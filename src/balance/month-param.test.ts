import { describe, it, expect } from 'vitest'
import { resolveBalanceMonth } from './month-param'
import { utcInstantAtAppTzWallClock } from '@/lib/timezone'

// 1/10/2026 00:30 AR: en UTC ya es 1/10, pero el borde es el que importa.
const now = utcInstantAtAppTzWallClock(2026, 10, 1, 0, 30)

describe('resolveBalanceMonth', () => {
  it('sin param, el mes AR en curso', () => {
    expect(resolveBalanceMonth({}, '2026-07', now)).toBe('2026-10')
  })

  it('respeta un mes válido dentro del rango', () => {
    expect(resolveBalanceMonth({ month: '2026-08' }, '2026-07', now)).toBe('2026-08')
  })

  it('un mes futuro cae al en curso: mostraría ceros con cara de mes sin actividad', () => {
    expect(resolveBalanceMonth({ month: '2026-12' }, '2026-07', now)).toBe('2026-10')
  })

  it('un mes anterior al primer movimiento cae a ese primer mes', () => {
    expect(resolveBalanceMonth({ month: '2024-01' }, '2026-07', now)).toBe('2026-07')
  })

  it('un valor inválido no rompe la página', () => {
    expect(resolveBalanceMonth({ month: '2026-13' }, '2026-07', now)).toBe('2026-10')
    expect(resolveBalanceMonth({ month: 'septiembre' }, null, now)).toBe('2026-10')
  })
})
