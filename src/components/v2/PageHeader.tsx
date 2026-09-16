import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  /** Fecha o bajada. En el Figma es el "Greetings Container": título + fecha. */
  subtitle?: string
  /** Acción primaria a la derecha (desktop) / debajo (mobile). */
  action?: ReactNode
}

// Encabezado de sección: el `Greetings Container` del Figma, presente en
// Membresías, Ventas, Gastos, Balance y Configuración.
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-lg font-semibold'>{title}</h1>
        {subtitle && <p className='text-sm text-muted-foreground'>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
