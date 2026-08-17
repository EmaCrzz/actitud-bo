import MetricCard from '@/components/v2/MetricCard'

export default function V2HomePage() {
  return (
    <div className='flex flex-col gap-6'>
      {/* Dummy MetricCards para verificar el shell v2. Se conectan a data
          real en Fase 2. */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <MetricCard
          subtitle='Sin asistencias registradas'
          subtitleTone='muted'
          title='Asistencias de hoy'
          value='—'
        />
        <MetricCard
          subtitle='10 clientes con membresía vencida'
          subtitleTone='warning'
          title='Clientes activos del mes'
          value='89'
        />
      </div>

      <div className='rounded-md border border-border bg-card p-6'>
        <h2 className='text-lg font-semibold'>V2 shell — placeholder</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          Este placeholder valida el AppShell responsive (sidebar desktop / hamburger mobile).
          Data real y componentes finales llegan en Fase 2.
        </p>
      </div>
    </div>
  )
}
