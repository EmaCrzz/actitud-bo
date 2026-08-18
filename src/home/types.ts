// Data que consume el dashboard del home v2. Se agrega desde queries
// individuales al server; se pasa a los componentes como una sola prop.
export interface HomeMetrics {
  // Asistencias registradas hoy (rango día AR).
  todayCount: number
  // Diferencia vs. asistencias del mismo día 7 días atrás. null cuando no hay
  // referencia previa (ej. la app tiene menos de una semana con datos).
  deltaVsLastWeek: number | null
  // Clientes con membresía vigente hoy (expiration_date >= inicio día AR).
  activeCount: number
  // Membresías que vencen en los próximos N días (ver UPCOMING_EXPIRATION_WINDOW_DAYS).
  upcomingExpirationsCount: number
  // Membresías cuya expiration_date ya pasó.
  expiredCount: number
}
