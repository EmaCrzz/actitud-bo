import { getWeekRangeInAppTz } from '@/lib/timezone'

// Rango lunes→domingo (fin exclusivo el próximo lunes) en la timezone del negocio.
// El wrapper se mantiene por retro-compat con imports existentes.
export function getWeekRange(date = new Date()) {
  return getWeekRangeInAppTz(date)
}
