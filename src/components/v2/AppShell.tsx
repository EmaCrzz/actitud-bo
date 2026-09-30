'use client'

import { useState } from 'react'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n/context'
import AppSidebar from './AppSidebar'
import Header from './Header'

export interface AppShellUser {
  name: string
  email: string
  avatarUrl: string | null
  avatarFallback: string
  roleLabel?: string
}

interface AppShellProps {
  user: AppShellUser
  todayLabel: string
  children: React.ReactNode
}

// Layout: una sola superficie blanca (bg-background) con padding externo. Sin
// cards individuales para sidebar/main; ambos comparten el bg y están
// separados por un divider vertical (border-r en el aside).
//
// Padding externo se aplica en globals.css sobre [data-v2='true'] (viewport
// wrapper del layout v2). Ver ADR 20260817114952.
export default function AppShell({ user, todayLabel, children }: AppShellProps) {
  return (
    <SidebarProvider className='flex h-full w-full'>
      <AppShellInner todayLabel={todayLabel} user={user}>
        {children}
      </AppShellInner>
    </SidebarProvider>
  )
}

// Switch desktop/mobile por CSS (hidden md:flex) — no JS. useIsMobile() sólo
// se resuelve post-mount y causaba flash de layout desktop al recargar en
// mobile antes de la hidratación.
function AppShellInner({ user, todayLabel, children }: AppShellProps) {
  const { t } = useTranslations()
  const { state } = useSidebar()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = state === 'collapsed'

  return (
    <div className='flex h-full w-full min-w-0'>
      <aside
        className={cn(
          'hidden md:flex h-full rounded-lg bg-primary-contrast border transition-[width] duration-200',
          collapsed ? 'md:w-16' : 'md:w-[255px]'
        )}
      >
        <AppSidebar user={user} />
      </aside>

      {/* Main
       *
       * `min-h-0` en los dos niveles no es opcional: un flex item tiene
       * `min-height: auto`, así que no puede encogerse por debajo de su
       * contenido. Sin esto, una página larga (un listado de clientes, sin ir
       * más lejos) empuja el main más allá del `h-dvh` del wrapper `[data-v2]`
       * y el sobrante se dibuja sobre el fondo del tenant v1.
       *
       * Es el gemelo vertical del `flex-1 w-full min-w-0` que documentó el ADR
       * de la fase 1.5 para el ancho. */}
      {/* **Esta columna es EL contenedor de scroll de la v2**, y el header va
       * adentro.
       *
       * Estaba en el `<main>`, con el header como hermano de afuera. El
       * problema: nuestro scrollbar mide 8px y no es overlay
       * (`::-webkit-scrollbar { width: 8px }` en globals.css), así que se comía
       * 8px del ancho del `main` y **el card de contenido quedaba 8px más
       * angosto que el header**, desalineado, en toda página que scrollea. Lo
       * reportó Ema en mobile, pero pasa en las siete pantallas.
       *
       * Con el scroll acá, el scrollbar descuenta ancho de los dos por igual y
       * quedan alineados. Compensarlo con un padding fijo de 8px no servía: con
       * scrollbars overlay (macOS por default) el ancho reservado es 0 y el
       * padding habría *creado* la desalineación.
       *
       * `min-h-0` no es opcional: un flex item tiene `min-height: auto`, así
       * que sin esto una página larga empuja la columna más allá del `h-dvh`
       * del wrapper `[data-v2]` y el sobrante se dibuja sobre el fondo del
       * tenant v1. Es el gemelo vertical del `flex-1 w-full min-w-0` que
       * documentó el ADR de la fase 1.5 para el ancho.
       *
       * `overscroll-contain` evita que el scroll encadene al body al llegar a
       * los extremos (pull-to-refresh accidental en mobile). */}
      <div className='flex flex-1 flex-col min-h-0 min-w-0 overflow-y-auto overscroll-contain pl-0 md:pl-6 lg:pl-12'>
        {/* El header ahora scrollea con el contenido, así que se ancla: es
         * donde vive el hamburger que abre el menú en mobile, y perderlo al
         * bajar dejaría al operador sin navegación hasta volver arriba.
         * `bg-background` y el padding inferior tapan el contenido que pasa por
         * debajo, incluido el hueco entre el header y el card. */}
        <div className='sticky top-0 z-20 shrink-0 bg-background pb-4 lg:pb-6'>
          <Header todayLabel={todayLabel} user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        </div>
        {/* `md:min-h-0` y no `min-h-0`: en mobile el `min-height: auto` por
         * default es lo que hace que `main` crezca con su contenido, y por lo
         * tanto que la columna tenga algo que scrollear. En desktop sí se
         * encoge, porque ahí la altura es fija y el scroll es interno del card
         * (las páginas usan `md:h-full`). Misma convención que las secciones.
         *
         * Las páginas sólo tienen que usar `min-h-full` en su contenedor raíz
         * para que el borde del card crezca con el contenido. */}
        <main className='flex flex-1 flex-col md:min-h-0'>{children}</main>
      </div>

      {/* Mobile drawer — siempre montado; Radix Portal no renderiza DOM cuando
       * open=false. data-v2='true' propaga los tokens de v2 al portal (el Sheet
       * se monta en <body>, fuera del wrapper data-v2 del layout).
       * showCloseButton=false porque el hamburger del propio sidebar ya cierra
       * el drawer via onCloseMobile. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          className='w-72 bg-sidebar !p-0'
          data-v2='true'
          showCloseButton={false}
          side='left'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>{t('v2.sidebar.menuTitle')}</SheetTitle>
          </SheetHeader>
          <AppSidebar user={user} onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
