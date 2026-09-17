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

// Actividad del día para el card "Resumen del día". Solo incluye tablas que
// existen en el schema actual; "Promoción activada" se difiere hasta que
// exista la tabla promotions.
export interface DailySummary {
  attendancesWithExpiredMembership: number
  paymentsRegistered: number
  newCustomers: number
  groupsCreated: number
}

// Un día de la semana con su count de asistencias. isoDate es "YYYY-MM-DD" en
// timezone AR. Siempre 5 elementos: Lun→Vie de la semana actual.
export interface WeeklyDay {
  isoDate: string
  count: number
}

export type WeeklyAttendance = WeeklyDay[]
